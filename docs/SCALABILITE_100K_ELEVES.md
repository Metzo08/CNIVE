# CNIVE — Audit d'Architecture & Guide de Scalabilité pour 100 000+ Élèves

Ce document certifie et détaille la capacité de la plateforme CNIVE à héberger, traiter et sécuriser les données de **plus de 100 000 élèves** lors de sa mise en production nationale en République du Sénégal.

---

## 1. Dimensionnement et Volumétrie des Données

Pour une cohorte cible de **100 000 à 250 000 élèves** :

| Entité / Table | Estimation Lignes (100k élèves) | Poids Moyen / Ligne | Volume Disque Estimé |
|---|---|---|---|
| `pupils` (Élèves) | 100 000 | 850 octets | ~85 Mo |
| `vulnerability_assessments` (FEV) | 200 000 (2/an) | 1 200 octets | ~240 Mo |
| `health_records` (Santé / CMU) | 100 000 | 600 octets | ~60 Mo |
| `vaccinations` | 400 000 (4 vaccins/élève) | 250 octets | ~100 Mo |
| `consultations` | 150 000 | 450 octets | ~68 Mo |
| `absences` | 800 000 | 180 octets | ~144 Mo |
| `academic_records` (Notes) | 600 000 (6 matières/trimestre) | 160 octets | ~96 Mo |
| `cards` (Sen-E-Carte) | 100 000 | 320 octets | ~32 Mo |
| `card_scan_logs` (Scans QR/NFC) | 500 000 | 280 octets | ~140 Mo |
| `interventions` + `logs` | 80 000 | 650 octets | ~52 Mo |
| `audit_logs` (Traçabilité légale) | 2 000 000 | 350 octets | ~700 Mo |
| **Index B-Tree & Trigram** | — | — | ~650 Mo |
| **TOTAL BASE DE DONNÉES** | **~5 000 000 enregistrements** | — | **~2,4 Go** |

### Stockage des Photos d'Identité :
- Les photos étant compressées en WebP/JPEG haute densité à l'import côté frontend (~50 Ko par photo).
- 100 000 photos = **~5 Go** d'espace disque.

> **Verdict de Capacité** : PostgreSQL gère nativement des tables de plusieurs dizaines de millions de lignes et des volumes en téraoctets. Une base de 2,5 Go représentant 100 000 élèves est un volume **modeste et parfaitement soutenable** pour PostgreSQL 16/17, à condition d'appliquer les optimisations ci-dessous.

---

## 2. Optimisations Réalisées

### A. Indexation B-Tree & Trigram
Sans index, une recherche plein texte ou un filtre de statut sur 100 000 lignes engendre un `Sequential Scan` qui sature les I/O disque. Les index suivants ont été intégrés dans le code SQLAlchemy et appliqués dans PostgreSQL :
- `idx_pupils_cnive_id` (B-Tree unique) : résolution instantanée en $O(\log N)$ (< 1 ms).
- `idx_pupils_status` : filtrage immédiat des élèves actifs / transférés / décrochés.
- `idx_pupils_school_status` (Composite `school_id, status`) : accélère les synthèses par établissement scolaire.
- `idx_pupils_name` (Composite `last_name, first_name`) : tri alphabétique instantané.
- `idx_assessments_pupil_created` : récupération de la dernière évaluation sans parcourir l'historique complet.
- `idx_audit_action_time` : consultation du journal d'audit filtré par plage de dates.

### B. Suppression du Verrou de Concurrence sur les Identifiants CNIVE
- **Avant** : `count = db.query(models.Pupil).count()` puis `cnive_id = f"CNIVE-2026-{count+1}"`.
  *Risque critique* : En cas de saisies simultanées par plusieurs directeurs d'école, deux élèves recevaient le même ID (violation de contrainte d'unicité).
- **Après** : Implémentation d'une séquence PostgreSQL dédiée `cnive_id_seq` avec identifiants formatés sur 6 chiffres (`CNIVE-2026-000001` à `CNIVE-2026-999999`), sans collision ni verrou de table.

### C. Moteur IA : Éradication du Problème N+1 et Pagination
- **Avant** : Le point de terminaison `/ai/predict/batch` chargeait tous les élèves actifs en mémoire et effectuait 3 requêtes SQL par élève (soit 300 000 requêtes SQL pour 100k élèves = crash OOM immédiat).
- **Après** :
  - Pagination native (`limit`, `skip`).
  - Agrégation SQL des distributions globales en 1 seule requête (`GROUP BY classification`).
  - Recherche prédictive individuelle asynchrone côté frontend avec debounce, éliminant la liste déroulante statique qui figeait le navigateur.

---

## 3. Paramètres Recommandés pour PostgreSQL en Production

Pour un serveur de production (ex: VPS ou Dédié 8 vCPU, 16 Go RAM) :

```ini
# /etc/postgresql/17/main/postgresql.conf
shared_buffers = 4GB                  # 25% de la RAM pour le cache partagé
effective_cache_size = 12GB           # 75% de la RAM disponible
work_mem = 32MB                       # Mémoire pour tris complexes et jointures
maintenance_work_mem = 512MB          # Pour les réindexations et VACUUM
max_connections = 200                 # Connexions simultanées
checkpoint_completion_target = 0.9    # Étalement des écritures disque
wal_buffers = 16MB
default_statistics_target = 100       # Précision de l'optimiseur de requêtes
```

---

## 4. Architecture de Mise en Ligne Recommandée

```
                        [ Utilisateurs / Écoles / Agents ]
                                       │
                                    HTTPS (443)
                                       ▼
                       [ Reverse Proxy Nginx / Caddy ]
                         (SSL Let's Encrypt, Gzip/Brotli)
                        ┌──────────────┴──────────────┐
                        ▼                             ▼
               [ Frontend React ]            [ Backend FastAPI ]
              (Fichiers statiques)           (4 Workers Uvicorn)
                                                      │
                                             SQLAlchemy Pool (20-40)
                                                      ▼
                                            [ PostgreSQL 17 DB ]
                                            (Volume persistant SSD)
```

1. **Backend Uvicorn Multi-Workers** :
   Lancer le backend avec `uvicorn main:app --workers 4 --host 0.0.0.0 --port 8001` (1 worker par cœur CPU).
2. **Stockage Photos** :
   Conserver les photos compressées sous `uploads/pupils/` ou configurer un stockage objet compatible S3/MinIO.
3. **Sauvegardes Automatisées** :
   Exécuter le script `backend/backup_db.ps1` (ou tâche cron `pg_dump -Fc sen-e-carte > backup.dump`) quotidiennement avec rétention 30 jours.
