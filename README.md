# CNIVE — Cartographie Numérique Intégrée des Vulnérabilités de l'Enfant

[![CNIVE Continuous Integration](https://github.com/Metzo08/CNIVE/actions/workflows/ci.yml/badge.svg)](https://github.com/Metzo08/CNIVE/actions/workflows/ci.yml)
![Version](https://img.shields.io/badge/version-2.5.0-emerald)
![License](https://img.shields.io/badge/license-Propriétaire%20MEN-blue)
![Zone Pilote](https://img.shields.io/badge/zone%20pilote-Pikine%2C%20S%C3%A9n%C3%A9gal-orange)

> **Plateforme Nationale de Protection de l'Enfance et de Prévention du Décrochage Scolaire**  
> **Ministère de l'Éducation Nationale — République du Sénégal**  
> En partenariat avec le **Groupe Thématique Éducation (GTE)** et la **Fondation Nous Cims**.

---

## 🏛️ Présentation Générale

La plateforme **CNIVE** (Cartographie Numérique Intégrée des Vulnérabilités de l'Enfant) est le dispositif numérique national sénégalais dédié à l'identification précoce, au suivi médico-social et à la remédiation pédagogique des élèves en situation de vulnérabilité.

Déployée initialement dans la **zone pilote de Pikine**, elle assure l'enrôlement continu, le suivi multidimensionnel et la coordination intersectorielle entre les établissements scolaires, les postes de santé, les travailleurs sociaux et les autorités académiques.

---

## 🚀 Écoles Pilotes & Données Terrain

La phase pilote couvre **1 478 élèves** répartis sur trois établissements de référence :

| Établissement Pilote | Code Système | Effectif Enrôlé | Pass Numérique Sen-E-Card |
| :--- | :---: | :---: | :---: |
| **École Sam Sam (Pies)** | `SAMSAM` | 402 élèves | 402 cartes actives |
| **ECOPN : École Diacksao Fass 2** | `ECOPN_FASS2` | 426 élèves | 426 cartes actives |
| **EDEN : Salif Ndongo B** | `EDEN_SALIF_B` | 650 élèves | 650 cartes actives |
| **TOTAL COHORTE PILOTE** | — | **1 478 élèves** | **1 478 cartes actives** |

*Chaque élève dispose d'un identifiant national unique (ex. `CNIVE-2026-000001`), d'un dossier biomédical et d'un QR code infalsifiable.*

---

## 🔑 Fonctionnalités Clés

### 1. FEV — Fiche d'Évaluation des Vulnérabilités
- Grille d'évaluation nationale reposant sur **6 dimensions fondamentales** :
  1. **Économique** (revenu du foyer, précarité, accès aux fournitures)
  2. **Scolaire** (retard académique, difficultés d'apprentissage, assiduité)
  3. **Santé & Nutrition** (accès aux soins, état nutritionnel, affections chroniques)
  4. **Familiale & Sociale** (situation parentale, monoparentalité, isolement)
  5. **Protection & Droits** (état civil, travail précoce, violences)
  6. **Environnementale** (zone inondable, distance domicile-école, salubrité)

### 2. Pass Digital Scolaire « Sen-E-Card »
- Carte physique et numérique pourvue d'un QR code dynamique.
- Consultation d'urgence sans authentification des informations vitales de l'enfant (allergies, contacts tuteurs d'urgence).
- Enregistrement sécurisé des scans avec horodatage et audit trail.

### 3. Moteur Décisionnel & IA Prédictive
- **CNIVE Multimodal Intelligence Engine v2.5** : détection anticipée du risque de décrochage scolaire.
- Corrélations automatiques entre absentéisme récurrent, score FEV et résultats académiques.
- Recommandations d'interventions ciblées pour les équipes de terrain.

### 4. Dossier Santé & Couverture Maladie Universelle (CMU-Élève)
- Suivi du statut d'enrôlement CMU et rattachement aux structures de santé de secteur (Postes de santé de Pikine).
- Carnet vaccinal digitalisé et historique des consultations médicales scolaires.

### 5. Cartographie Interactive des Vulnérabilités
- Visualisation spatiale des écoles, des postes de santé et des cas de vulnérabilité.
- Filtres thématiques par zone à risque et niveau de sévérité.

---

## 🏗️ Architecture Technique

```
CNIVE/
├── backend/                   # API REST FastAPI haute performance (Python 3.10+)
│   ├── app/
│   │   ├── models/            # Modèles de données relationnels SQLAlchemy
│   │   ├── routers/           # Endpoints REST (auth, élèves, cartes, FEV, santé, IA)
│   │   ├── schemas/           # Schémas de validation Pydantic v2
│   │   └── utils/             # Sécurité JWT, cryptographie Bcrypt, moteur QR
│   ├── database.py            # Pool de connexions PostgreSQL & Fallback SQLite
│   ├── main.py                # Point d'entrée de l'application FastAPI
│   └── requirements.txt       # Dépendances Python
│
├── frontend/                  # Application React moderne (Vite + TypeScript)
│   ├── src/
│   │   ├── components/        # Layout institutionnel, navigation & modales
│   │   ├── context/           # Gestionnaires d'état Auth & Thème (Clair/Sombre)
│   │   ├── pages/             # Vues métier (Tableau de bord, Liste, Profil, FEV, Cartes)
│   │   └── utils/             # Optimisation d'images, proxy cache & sécurité DOM
│   ├── package.json
│   └── vite.config.ts
│
└── .github/workflows/         # Intégration Continue (GitHub Actions CI)
    └── ci.yml                 # Lint Flake8, Formatage Black, Tests Pytest & Build Vite
```

### ⚡ Haute Disponibilité & Scalabilité (100 000+ Élèves)
- **Index B-Tree composites** : optimisés pour les jointures massives (`schools`, `pupils`, `cards`, `vulnerabilities`).
- **Index GIN Trigram (`pg_trgm`)** : recherches textuelles partielles (`ILIKE '%terme%'`) sur nom, prénom et matricule en **moins de 2 millisecondes** pour plus de 100 000 entrées.
- **Cache local non-bloquant des photos** : élimination totale des goulots d'étranglement réseau et des limitations de débit CDN.

---

## 🛠️ Installation & Démarrage Local

### Prérequis
- **Python 3.10+**
- **Node.js 18+** / **npm 9+**
- **PostgreSQL 14+** (ou SQLite intégré pour les tests)

### 1. Cloner le projet
```bash
git clone https://github.com/Metzo08/CNIVE.git
cd CNIVE
```

### 2. Démarrer le Backend
```bash
cd backend
python -m venv venv
# Windows :
.\venv\Scripts\activate
# Linux/macOS :
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Démarrer le Frontend
```bash
cd ../frontend
npm install
npm run dev
```
L'application est accessible sur `http://localhost:5173` (l'API tourne sur `http://localhost:8001`).

---

## 🧪 Tests & Intégration Continue

Le projet est validé automatiquement à chaque push par une suite CI complète :

```bash
# Backend : Linters & Tests
cd backend
flake8 app/ main.py --count --select=E9,F63,F7,F82 --show-source --statistics
black --check app/ main.py
pytest -v

# Frontend : Typage TypeScript & Compilation de production
cd ../frontend
npx tsc --noEmit
npm run build
```

---

## 🔒 Confidentialité & Protection des Données

Plateforme conçue en conformité avec les directives de la **Commission de Protection des Données Personnelles (CDP) du Sénégal** :
- Chiffrement fort des mots de passe avec sel cryptographique (Bcrypt).
- Tokens de session sécurisés (JWT HMAC-SHA256 avec rotation des clés).
- Traçabilité intégrale des accès via un journal d'audit (*Audit Logs*) non modifiable.

---

© 2026 **Ministère de l'Éducation Nationale — République du Sénégal**. Tous droits réservés.
