import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

const resources = {
  fr: {
    translation: {
      "nav": {
        "dashboard": "Tableau de bord",
        "pupils": "Base des élèves",
        "assessment": "Évaluation",
        "ai_analysis": "Analyse IA",
        "interventions": "Interventions",
        "health": "Santé",
        "map": "Cartographie",
        "audit": "Audit",
        "team": "Équipe",
        "settings": "Paramètres",
        "logout": "Déconnexion",
        "online": "En ligne",
        "cards": "Cartes Sen-E-Carte",
        "reports": "Rapports",
        "archives": "Archives",
        "alerts": "Alertes"
      },
      "common": {
        "back": "Retour",
        "back_to_list": "Retour à la liste",
        "previous": "Précédent",
        "next": "Suivant",
        "save": "Enregistrer",
        "cancel": "Annuler",
        "loading": "Chargement...",
        "success": "Succès",
        "error": "Une erreur est survenue",
        "search": "Rechercher",
        "filter": "Filtrer",
        "all": "Tous",
        "edit": "Modifier",
        "delete": "Supprimer",
        "archive": "Archiver",
        "close": "Fermer",
        "confirm": "Confirmer",
        "total": "Total",
        "download": "Télécharger",
        "view": "Voir",
        "mfa": "MFA",
        "role": "Rôle",
        "status": "Statut",
        "optional": "(optionnel)",
        "confirm_question": "Êtes-vous sûr ?",
        "action_impossible": "Action impossible",
        "valid": "VALIDE",
        "invalid": "INVALIDE",
        "republic_senegal": "République du Sénégal",
        "school": "École",
        "tutor": "Tuteur",
        "health": "Santé",
        "print": "Imprimer",
        "actions": "Actions",
        "not_specified": "Non spécifié",
        "page": "Page",
        "intervention": "Intervention",
        "midwife": "Sage-femme",
        "health_center": "Centre de Santé",
        "of": "sur",
        "yes": "OUI",
        "no": "NON",
        "none": "Aucun(e)",
        "no_data": "Aucune donnée disponible",
        "confirm_delete": "Cette action est irréversible. Voulez-vous continuer ?",
        "assessed_on": "Évalué le",
        "view_all": "Voir tout"
      },
      "dashboard": {
        "title": "Répertoire académique",
        "subtitle": "Gérez les dossiers et suivez les progrès de {{count}} élèves en temps réel.",
        "vulnerability_analysis": "Analyse des vulnérabilités",
        "system_activity": "Activité du système",
        "no_data": "Aucune donnée disponible",
        "location": "Pikine, Sénégal",
        "cases": "cas",
        "stats": {
          "total_pupils": "Élèves inscrits",
          "vulnerable": "Cas critiques",
          "interventions": "Interventions",
          "schools": "Écoles actives"
        },
        "activity": {
          "critical_alert": "cas critiques détectés",
          "system_ok": "Système CNIVE opérationnel",
          "now": "Dernière connexion",
          "online": "En ligne"
        },
        "sections": {
          "vulnerability": "Analyse de vulnérabilité",
          "distribution": "Répartition par niveau de risque",
          "activity": "Activité récente du système"
        }
      },
      "vulnerability": {
        "title": "Vulnérabilité",
        "score_label": "Score de vulnérabilité",
        "critical": "Critique",
        "high": "Élevé",
        "moderate": "Modéré",
        "low": "Faible",
        "classification": "Classification",
        "last_update": "Dernière évaluation",
        "economic": "Économique",
        "school": "Scolaire",
        "health": "Santé & Nutrition",
        "social": "Familiale & Sociale",
        "protection": "Protection",
        "environmental": "Environnementale",
        "reference": "Référentiel de vulnérabilité",
        "empty": "Aucune évaluation enregistrée pour cet élève.",
        "levels": {
          "critical": "Critique",
          "high": "Élevé",
          "moderate": "Modéré",
          "low": "Faible"
        },
        "dimensions": {
            "economic": "Économique",
            "school": "Scolaire",
            "health_nutrition": "Santé / Nutrition",
            "family_social": "Familial / Social",
            "protection": "Protection de l'enfant",
            "environmental": "Environnement"
        },
        "assessment_title": "Évaluation multidimensionnelle",
        "assessment_subtitle": "Diagnostic de vulnérabilité basé sur les critères du CDC F2.1.",
        "forecast_score": "Score prévisionnel",
        "success_message": "Évaluation enregistrée avec succès. Redirection...",
        "select_beneficiary": "Sélection du bénéficiaire",
        "choose_pupil": "Choisir un élève",
        "tutor_present": "L'évaluation doit être réalisée avec le tuteur légal présent.",
        "observations": "Observations complémentaires",
        "observations_placeholder": "Précisez les conditions observées...",
        "save": "Valider l'évaluation",
        "saving": "Enregistrement...",
        "exploitation_grid": "Grille d’exploitation des vulnérabilités",
        "exploitation_grid_desc": "Visualisez en temps réel l'impact de chaque note sur le profil global de l'élève.",
        "mean_score": "Moyenne arithmétique",
        "mean_score_help": "Somme des 6 dimensions divisée par 6 (Note sur 20)",
        "dimension_label": "Dimension évaluée",
        "score_value": "Note",
        "observations_summary": "Synthèse des observations",
        "dimensions_title": "Critères de dimension",
        "error_select_pupil": "Veuillez sélectionner un élève",
        "error_server": "Erreur de connexion au serveur",
        "assess_now": "Évaluer maintenant",
        "criteria": {
          "poverty": "Précarité financière extrême",
          "child_labor": "Travail de l'enfant",
          "no_supplies": "Absence de fournitures scolaires",
          "food_insecurity": "Insécurité alimentaire",
          "precarious_housing": "Logement précaire",
          "absenteeism": "Absentéisme chronique (>20%)",
          "dropout_risk": "Décrochage scolaire ou haut risque",
          "academic_delay": "Retard scolaire important (>2 ans)",
          "learning_difficulties": "Difficultés d'apprentissage",
          "repeated_failure": "Redoublement répété (>2 fois)",
          "low_grades": "Résultats scolaires très faibles",
          "disability": "Handicap physique ou mental",
          "chronic_illness": "Maladie chronique",
          "malnutrition": "Malnutrition (IMC hors normes)",
          "no_cmu": "Absence de couverture CMU",
          "mental_health": "Problèmes de santé mentale",
          "no_medical_followup": "Absence de suivi médical régulier",
          "orphan": "Orphelin (un ou deux parents)",
          "single_parent": "Famille monoparentale en difficulté",
          "large_family": "Famille nombreuse (>8 enfants)",
          "placed_child": "Enfant placé ou en famille d'accueil",
          "domestic_violence": "Violence domestique avérée/suspectée",
          "parent_incarcerated": "Parent incarcéré, malade ou handicapé",
          "social_isolation": "Isolement social de la famille",
          "gbv": "Violences basées sur le genre (VBG)",
          "school_violence": "Violences scolaires",
          "bullying": "Harcèlement scolaire",
          "sexual_exploitation": "Exploitation sexuelle",
          "early_marriage": "Mariage d'enfants",
          "harmful_practices": "Pratiques néfastes (excision, etc.)",
          "conflict_with_law": "Enfant en conflit avec la loi"
        }
      },
      "dimensions": {
        "economic": "Économique",
        "school": "Scolaire",
        "health": "Sanitaire",
        "social": "Social",
        "violence": "Violence"
      },
      "pupils": {
        "cnive_id": "Identifiant CNIVE",
        "title": "Base des élèves",
        "subtitle": "{{count}} élèves enregistrés dans le système.",
        "add_new": "Nouvel élève",
        "search_placeholder": "Rechercher un élève par nom ou ID...",
        "search_empty": "Aucun élève ne correspond à vos critères.",
        "filter": "Filtrer",
        "last_assessment": "Dernière éval.",
        "not_found": "Élève introuvable",
        "civil_state": "État Civil",
        "schooling": "Scolarité",
        "tabs": {
            "info": "Informations",
            "vulnerability": "Vulnérabilité",
            "interventions": "Interventions",
            "absences": "Absences",
            "ai_analysis": "Analyse IA"
        },
        "form": {
            "first_name": "Prénom",
            "last_name": "Nom",
            "birth_date": "Date de naissance",
            "gender": "Genre",
            "school": "École",
            "grade": "Niveau scolaire / Classe",
            "suggested": "Suggéré selon l'âge",
            "academic_evaluation": "Évaluation Académique Détaillée",
            "add_subject": "Ajouter une matière",
            "subject": "Matière",
            "score": "Note",
            "out_of": "Sur (/)",
            "average_score": "Moyenne Générale Calculée (sur 20)",
            "academic_score": "Note Moyenne",
            "cnive_id": "Identifiant CNIVE",
            "address": "Adresse",
            "tutor_name": "Nom du tuteur",
            "tutor_phone": "Téléphone du tuteur",
            "photo_required": "Photo requise",
            "photo_title": "Photo de l'élève",
            "photo_desc": "Importez une photo d'identité claire. Le système optimisera automatiquement le poids de l'image.",
            "choose_photo": "Choisir une photo",
            "personal_info": "Informations académiques et personnelles",
            "select_school": "Sélectionner une école"
        }
      },
      "errors": {
          "loading_schools": "Erreur lors du chargement des écoles"
      },
      "status": {
        "active": "Actif",
        "inactive": "Inactif",
        "active_m": "Actif",
        "active_f": "Active",
        "inactive_m": "Inactif",
        "inactive_f": "Inactive",
        "transferred": "Transféré(e)",
        "dropout": "Décrochage"
      },
      "gender": {
        "female": "Fille",
        "male": "Garçon"
      },
      "interventions": {
        "title": "Gestion des interventions",
        "subtitle": "Suivi et coordination des actions prioritaires.",
        "list_title": "Liste des interventions",
        "add_new": "+ Nouvelle intervention",
        "close_form": "✕ Fermer",
        "total": "Total",
        "planned": "Planifiées",
        "in_progress": "En cours",
        "completed": "Terminées",
        "urgent": "Urgentes",
        "empty": "Aucune intervention trouvée.",
        "form_new": "📝 Nouvelle intervention",
        "form_edit": "✏️ Modifier l'intervention",
        "pupil": "Élève",
        "type": "Type",
        "priority": "Priorité",
        "description": "Description",
        "scheduled_date": "Date prévue",
        "assigned_to": "Responsable",
        "save": "Créer l'intervention",
        "save_changes": "Sauvegarder les modifications",
        "cancel": "Annuler",
        "form": {
          "title": "Titre",
          "title_placeholder": "Titre descriptif",
          "assigned_placeholder": "Nom de l'agent",
          "description_placeholder": "Détails de l'intervention..."
        },
        "detail": {
          "created_at": "Créée le",
          "not_assigned": "Non assigné",
          "no_description": "Aucune description fournie.",
          "history": "Historique et suivi",
          "note_placeholder": "Ajouter une note de suivi...",
          "publish": "Publier"
        },
        "actions": {
          "edit": "Modifier",
          "delete": "Supprimer",
          "confirm_delete_title": "Supprimer l'intervention ?",
          "confirm_delete_msg": "Cette action supprimera définitivement l'intervention."
        },
        "status": {
          "planned": "Planifiée",
          "in_progress": "En cours",
          "completed": "Terminée",
          "cancelled": "Annulée"
        },
        "priorities": {
          "low": "Basse",
          "medium": "Moyenne",
          "high": "Haute",
          "urgent": "Urgente"
        },
        "types": {
          "health": "Santé",
          "social": "Social",
          "education": "Éducation",
          "educational": "Éducatif",
          "psychological": "Soutien psychologique",
          "economic": "Économique",
          "financial": "Financier"
        },
        "logs": {
          "status_change": "Changement de statut",
          "note_added": "Note ajoutée",
          "created": "Création",
          "updated": "Modification",
          "deleted": "Suppression"
        }
      },
      "alerts": {
        "title": "Alertes et notifications",
        "subtitle": "Suivi des événements critiques et des interventions d'urgence.",
        "mark_all_read": "Tout marquer comme lu",
        "filters": {
          "title": "Filtres",
          "all": "Toutes les alertes",
          "unread": "Non lues uniquement",
          "critical": "Alertes critiques",
          "warning": "Avertissements"
        },
        "total_count": "{{count}} alertes au total",
        "empty": {
          "title": "Aucune alerte trouvée",
          "desc": "Vous êtes à jour dans vos notifications."
        },
        "levels": {
          "critical": "Critique",
          "urgent": "Urgent",
          "warning": "Avertissement",
          "info": "Info"
        },
        "escalated": "Escaladée",
        "messages": {
          "cmu_not_enrolled": "CMU non enrôlé",
          "cmu_not_enrolled_desc": "Inscription CMU absente ou en retard.",
          "critical_vulnerability": "Urgence: Cas critique détecté",
          "critical_vulnerability_desc": "{{name}} a un score de vulnérabilité CRITIQUE ({{score}}/100). Une intervention immédiate est requise."
        }
      },
      "archives": {
        "title": "Archives",
        "subtitle": "Gestion des dossiers de santé archivés",
        "search_placeholder": "Rechercher un dossier archivé...",
        "empty": "Aucun dossier archivé trouvé.",
        "last_modification": "Dernière modification",
        "restore": "Restaurer",
        "delete_permanent": "Supprimer définitivement",
        "confirm_archive": "Voulez-vous vraiment archiver ce dossier ?"
      },
      "absences": {
        "title": "Suivi des absences",
        "mark": "Noter une absence",
        "reason": "Motif",
        "date": "Date",
        "duration": "Durée (jours)",
        "justified": "Justifiée",
        "not_justified": "Non justifiée",
        "notes": "Notes / Observations",
        "success": "Absence enregistrée",
        "history": "Historique des absences",
        "empty": "Aucune absence enregistrée",
        "reasons": {
          "sickness": "Maladie",
          "family": "Raison familiale",
          "transport": "Problème de transport",
          "other": "Autre"
        }
      },
      "ai": {
        "title": "IA & analyse prédictive",
        "subtitle": "Système de détection précoce des risques • CNIVE Intelligence v1.0",
        "tabs": {
          "dashboard": "Tableau de bord",
          "predict": "Prédiction individuelle",
          "batch": "Analyse globale"
        },
        "stats": {
          "pupils": "Élèves analysés",
          "assessments": "Évaluations",
          "at_risk": "Cas à risque",
          "success": "Succès interventions"
        },
        "distribution": "Répartition des vulnérabilités",
        "dimension_scores": "Scores moyens par dimension",
        "loading": "Chargement des données analytiques...",
        "predict": {
          "title": "Prédiction IA",
          "config": "Configuration de l'analyse",
          "select": "Sélectionner un élève",
          "choose": "Choisir un bénéficiaire",
          "button": "Lancer l'intelligence artificielle",
          "running": "Analyse en cours...",
          "report": "Rapport d'analyse prédictive",
          "factors": "Facteurs déterminants",
          "recommendations": "Recommandations d'actions",
          "risk": "Risque",
          "score": "Score Risque",
          "ready": "Prêt pour l'analyse prédictive",
          "ready_desc": "Le moteur CNIVE évalue les 6 dimensions FEV de cet élève.",
          "level": "Niveau de risque",
          "plan": "Plan d'action préconisé",
          "factors_found": "Le moteur d'analyse CNIVE a identifié {{count}} facteur(s) de vulnérabilité nécessitant une attention particulière.",
          "stable_desc": "Aucune vulnérabilité majeure n'a été détectée. La situation de l'élève est stable.",
          "levels": {
            "CRITICAL": "CRITIQUE",
            "HIGH": "ÉLEVÉ",
            "MODERATE": "MODÉRÉ",
            "LOW": "FAIBLE",
            "UNKNOWN": "INCONNU"
          }
        },
        "batch": {
          "title": "Analyse globale par lot",
          "subtitle": "Évaluation simultanée de tous les bénéficiaires actifs.",
          "button": "Lancer l'analyse globale",
          "running": "Traitement en cours...",
          "stats": {
            "total": "Analyses totales",
            "high_risk": "Critiques / Haut",
            "moderate_risk": "Risque modéré",
            "stable": "Cas stables"
          },
          "ready": "Prêt pour l'analyse de masse",
          "ready_desc": "L'IA évaluera l'ensemble de la base de données"
        }
      },
      "map": {
        "title": "Cartographie stratégique",
        "subtitle": "Visualisation géolocalisée des infrastructures scolaires et indices de vulnérabilité.",
        "code": "Code",
        "beneficiaries": "bénéficiaires",
        "score": "Score",
        "all_schools": "Toutes les écoles",
        "critical_cases": "Cas critiques",
        "high_priority": "Priorité haute",
        "legend": "Légende des risques",
        "zone_stats": "Statistiques zone",
        "followed_schools": "Écoles suivies",
        "coverage": "Couverture",
        "add_school": "Ajouter une école",
        "school_name": "Nom de l'établissement",
        "address": "Adresse physique"
      },
      "health": {
        "title": "Santé numérique",
        "subtitle": "Suivi médical complet et enrôlement CMU des bénéficiaires.",
        "add_new": "+ Nouveau dossier",
        "new_record": "Nouveau dossier",
        "stats": {
          "cmu_enrolled": "Enrôlés CMU",
          "not_enrolled": "Non enrôlés",
          "pending": "En attente",
          "vaccinations": "Vaccins enregistrés"
        },
        "tabs": {
          "overview": "Vue d'ensemble",
          "vaccinations": "Vaccinations",
          "cmu": "Protection CMU",
          "consultations": "Consultations"
        },
        "blood_group": "Groupe sanguin",
        "allergies": "Allergies",
        "chronic_conditions": "Pathologies chroniques",
        "cmu_status": "Statut CMU",
        "cmu_number": "N° CMU",
        "facility": "Structure",
        "actions": {
          "edit": "Modifier",
          "delete": "Supprimer",
          "archive": "Archiver"
        },
        "status": {
          "enrolled": "Affilié",
          "pending": "En attente",
          "not_enrolled": "Non affilié"
        },
        "form": {
          "choose_pupil": "Choisir un élève...",
          "choose_facility": "Choisir une structure sanitaire...",
          "blood_group_unknown": "Inconnu",
          "medical_data": "Données médicales",
          "medical_details": "Détails médicaux",
          "archive_notice": "Archiver ce dossier (ne sera plus visible dans la liste active)",
          "allergies_placeholder": "Précisez les allergies...",
          "chronic_placeholder": "Diabète, Asthme, etc..."
        },
        "vaccination": {
          "new": "Nouvelle Vaccination",
          "edit": "Modifier la Vaccination",
          "dose": "Dose",
          "vaccine_name": "Nom du vaccin",
          "vaccine_placeholder": "ex: BCG, Polio, DTC...",
          "date": "Date d'administration",
          "facility_placeholder": "Nom de l'hôpital ou centre...",
          "dose_num": "Dose {{num}}"
        },
        "consultation": {
          "new": "Nouvelle Consultation",
          "edit": "Modifier la Consultation",
          "reason": "Motif de consultation",
          "reason_placeholder": "ex: Fièvre, Douleur abdominale...",
          "diagnosis": "Diagnostic",
          "diagnosis_placeholder": "Diagnostic...",
          "treatment": "Traitement prescrit",
          "treatment_placeholder": "Médicaments, repos...",
          "date": "Date de consultation"
        }
      },
      "audit": {
        "title": "Journal d'audit",
        "subtitle": "Traçabilité immuable et suivi des accès de sécurité (CDC Section 6.2).",
        "filter_placeholder": "Filtrer par action, email ou ressource...",
        "loading": "Chargement du journal...",
        "empty": "Aucun enregistrement trouvé.",
        "last_7_days": "7 derniers jours",
        "last_30_days": "30 derniers jours",
        "last_90_days": "90 derniers jours",
        "stats": {
          "total_events": "Événements totaux",
          "authorized_access": "Accès autorisés",
          "security_failures": "Échecs sécurité",
          "data_access": "Accès données"
        },
        "categories": {
            "critical": "Alerte critique",
            "access": "Accès",
            "modification": "Modification",
            "consultation": "Consultation",
            "system": "Système"
        },
        "actions": {
          "VIEW_AUDIT_LOG": "Consultation du journal",
          "VIEW_PUPIL": "Consultation élève",
          "CREATE_PUPIL": "Création élève",
          "EDIT_PUPIL": "Modification élève",
          "DELETE_PUPIL": "Suppression élève",
          "LOGIN": "Connexion",
          "LOGOUT": "Déconnexion",
          "LOGIN_FAILED": "Échec de connexion",
          "MFA_SETUP": "Configuration MFA",
          "MFA_VERIFIED": "Vérification MFA",
          "VIEW_VULNERABILITY": "Consultation vulnérabilité",
          "EDIT_VULNERABILITY": "Modification vulnérabilité",
          "VIEW_HEALTH": "Consultation dossier santé",
          "EDIT_HEALTH": "Modification dossier santé",
          "VIEW_INTERVENTION": "Consultation intervention",
          "CREATE_INTERVENTION": "Création intervention",
          "EDIT_INTERVENTION": "Modification intervention",
          "VIEW_TEAM": "Consultation équipe",
          "EDIT_TEAM": "Modification équipe",
          "CREATE_TEAM": "Création membre équipe",
          "DELETE_TEAM": "Suppression membre équipe",
          "GENERATE_REPORT": "Génération de rapport",
          "EXPORT_DATA": "Exportation de données",
          "CARD_SCAN": "Scan de carte QR/NFC",
          "REFERRAL": "Référencement partenaire",
          "VIEW_MAP": "Consultation de la carte",
          "SYSTEM": "Action système"
        }
      },
      "team": {
        "title": "Équipe & experts",
        "subtitle": "Gérez les membres de l'unité de coordination et leurs niveaux d'accès.",
        "add_new": "Nouveau membre",
        "roles": {
          "GTE_ADMIN": "Administrateur GTE",
          "HEALTH_WORKER": "Santé / CMU",
          "SOCIAL_WORKER": "Travailleur social",
          "TEACHER": "Enseignant / directeur",
          "GUEST": "Visiteur / Autre",
          "guest": "Visiteur / Autre"
        }
      },
      "settings": {
        "title": "Paramètres système",
        "profile": "Profil utilisateur",
        "notifications": "Notifications",
        "security": "Sécurité & MFA",
        "appearance": "Apparence",
        "language": "Langue de l'interface"
      },
      "cards": {
          "title": "Gestion des cartes Sen-E-Carte",
          "subtitle": "Production, personnalisation et analytique des accès biométriques QR/NFC.",
          "tabs": {
              "overview": "Vue d'ensemble",
              "generate": "Générer une carte",
              "history": "Historique"
          },
          "stats": {
              "total_scans": "Scans totaux",
              "active_cards": "Cartes actives",
              "usage_rate": "Taux d'usage",
              "scans_per_card": "Scans / Carte",
              "top_locations": "Localisations les plus actives",
              "scans_by_role": "Distribution par rôle"
          },

          "hotspots": "Hotspots de scan",
          "devices": "Terminaux & usages",
          "recent_scans": "Derniers scans",
          "config": {
              "title": "Configuration de la carte",
              "select_pupil": "Sélectionner le bénéficiaire",
              "qr_color": "Couleur QR",
              "bg_color": "Couleur fond",
              "generate_button": "Générer la Sen-E-Carte"
          },
          "preview": {
              "title": "Aperçu de production",
              "waiting": "En attente de configuration"
          }
      },
      "reports": {
          "title": "Centre de rapports",
          "subtitle": "Génération automatisée de rapports PDF professionnels et conformes CDC.",
          "step1": "1. Sélectionner le type de rapport",
          "step2": "2. Configurer et générer",
          "pdf_download": "Télécharger le rapport PDF",
          "specifications": "Spécifications CDC",
          "spec_desc": "Les rapports générés respectent la norme CNIVE F5.2 et incluent les métadonnées d'audit nécessaires à la traçabilité.",
          "format": "Format de sortie",
          "hq_pdf": "PDF Vectorisé (HQ)",
          "types": {
              "pupil_profile": "Profil complet",
              "pupil_profile_desc": "Informations personnelles et scolaires",
              "vulnerability": "Vulnérabilité",
              "vulnerability_desc": "Évaluation des 5 dimensions",
              "health_record": "Dossier santé",
              "health_record_desc": "Suivi médical et vaccinations",
              "school_summary": "Synthèse école",
              "school_summary_desc": "Statistiques globales par établissement"
          }
      },
      "roles": {
          "user": "Utilisateur",
          "admin": "Administrateur GTE",
          "expert": "Expert / Coordinateur"
      },
      "scan": {
        "certified": "CERTIFIÉ",
        "health_data": "Données Sanitaires",
        "blood_group": "Groupe",
        "gender": "Genre",
        "masculine": "Masc.",
        "feminine": "Fém.",
        "allergies": "Allergies & Vigilances",
        "no_allergies": "Aucune allergie signalée.",
        "education": "Scolarité & État Civil",
        "school": "Établissement",
        "grade": "Niveau",
        "birth": "Naissance",
        "emergency": "Contact d'Urgence",
        "tutor": "Tuteur",
        "vulnerability_details": "Détails de Vulnérabilité",
        "global_index": "Indice Global",
        "not_specified": "Non spécifié",
        "loading": "Chargement du Pass Digital...",
        "not_found": "Profil Introuvable",
        "not_found_desc": "Cette carte n'est pas reconnue par le système CNIVE.",
        "critical": "Urgence Critique",
        "high": "Vigilance Accrue",
        "stable": "Situation Stable"
      }
    }
  },
  es: {
    translation: {
      "nav": {
        "dashboard": "Panel de control",
        "pupils": "Base de alumnos",
        "assessment": "Evaluación",
        "ai_analysis": "Análisis IA",
        "interventions": "Intervenciones",
        "health": "Salud",
        "map": "Cartografía",
        "audit": "Auditoría",
        "team": "Equipo",
        "settings": "Ajustes",
        "logout": "Cerrar sesión",
        "online": "En línea",
        "cards": "Tarjetas Sen-E-Carte",
        "reports": "Informes",
        "archives": "Archivos",
        "alerts": "Alertas"
      },
      "common": {
        "back": "Volver",
        "back_to_list": "Volver a la lista",
        "previous": "Anterior",
        "next": "Siguiente",
        "save": "Guardar",
        "cancel": "Cancelar",
        "loading": "Cargando...",
        "success": "Éxito",
        "error": "Ha ocurrido un error",
        "search": "Buscar",
        "filter": "Filtrar",
        "all": "Todos",
        "edit": "Editar",
        "delete": "Eliminar",
        "archive": "Archivar",
        "close": "Cerrar",
        "confirm": "Confirmar",
        "total": "Total",
        "download": "Descargar",
        "view": "Ver",
        "mfa": "MFA",
        "role": "Rol",
        "status": "Estado",
        "optional": "(opcional)",
        "confirm_question": "¿Está seguro?",
        "action_impossible": "Acción imposible",
        "valid": "VÁLIDO",
        "invalid": "INVÁLIDO",
        "republic_senegal": "República de Senegal",
        "school": "Escuela",
        "tutor": "Tutor",
        "health": "Salud",
        "print": "Imprimir",
        "actions": "Acciones",
        "not_specified": "No especificado",
        "page": "Página",
        "intervention": "Intervención",
        "midwife": "Matrona",
        "health_center": "Centro de Salud",
        "of": "de",
        "yes": "SÍ",
        "no": "NO",
        "none": "Ninguno/a",
        "no_data": "No hay datos disponibles",
        "confirm_delete": "Esta acción es irreversible. ¿Desea continuar?",
        "assessed_on": "Evaluado el",
        "view_all": "Ver todo"
      },
      "dashboard": {
        "title": "Repertorio académico",
        "subtitle": "Gestione los expedientes y siga el progreso de {{count}} alumnos en tiempo real.",
        "vulnerability_analysis": "Análisis de vulnerabilidades",
        "system_activity": "Actividad del sistema",
        "no_data": "No hay datos disponibles",
        "location": "Pikine, Senegal",
        "cases": "casos",
        "stats": {
          "total_pupils": "Alumnos inscritos",
          "vulnerable": "Casos críticos",
          "interventions": "Intervenciones",
          "schools": "Escuelas activas"
        },
        "activity": {
          "critical_alert": "casos críticos detectados",
          "system_ok": "Sistema CNIVE operativo",
          "now": "Última conexión",
          "online": "En línea"
        },
        "sections": {
            "vulnerability": "Análisis de vulnerabilidad",
            "distribution": "Distribución por nivel de riesgo",
            "activity": "Actividad reciente del sistema"
        }
      },
      "vulnerability": {
        "title": "Vulnerabilidad",
        "score_label": "Puntaje de vulnerabilidad",
        "critical": "Crítico",
        "high": "Alto",
        "moderate": "Moderado",
        "low": "Bajo",
        "classification": "Clasificación",
        "last_update": "Última evaluación",
        "economic": "Económica",
        "school": "Escolar",
        "health": "Salud y Nutrición",
        "social": "Familiar y Social",
        "protection": "Protección",
        "environmental": "Ambiental",
        "reference": "Referencial de vulnerabilidad",
        "empty": "No hay evaluaciones registradas para este alumno.",
        "levels": {
          "critical": "Crítico",
          "high": "Alto",
          "moderate": "Moderado",
          "low": "Bajo"
        },
        "dimensions": {
            "economic": "Económica",
            "school": "Escolar",
            "health_nutrition": "Salud / Nutrición",
            "family_social": "Familiar / Social",
            "protection": "Protección infantil",
            "environmental": "Ambiente"
        },
        "assessment_title": "Evaluación multidimensional",
        "assessment_subtitle": "Diagnóstico de vulnerabilidad basado en los criterios del CDC F2.1.",
        "forecast_score": "Puntaje previsto",
        "success_message": "Evaluación registrada con éxito. Redirigiendo...",
        "select_beneficiary": "Selección del beneficiario",
        "choose_pupil": "Elegir un alumno",
        "tutor_present": "La evaluación debe realizarse con el tutor legal presente.",
        "observations": "Observaciones complementarias",
        "observations_placeholder": "Especifique las condiciones observadas...",
        "save": "Validar la evaluación",
        "saving": "Registrando...",
        "exploitation_grid": "Cuadrícula de explotación de vulnerabilidades",
        "exploitation_grid_desc": "Visualice en tiempo real el impacto de cada nota en el perfil global del alumno.",
        "mean_score": "Promedio aritmético",
        "mean_score_help": "Suma de las 6 dimensiones dividida por 6 (Nota sobre 20)",
        "dimension_label": "Dimensión evaluada",
        "score_value": "Nota",
        "observations_summary": "Resumen de observaciones",
        "dimensions_title": "Criterios de dimensión",
        "error_select_pupil": "Por favor, seleccione un alumno",
        "error_server": "Error de conexión al servidor",
        "assess_now": "Evaluar ahora",
        "criteria": {
          "poverty": "Precariedad financiera extrema",
          "child_labor": "Trabajo infantil",
          "no_supplies": "Falta de útiles escolares",
          "food_insecurity": "Inseguridad alimentaria",
          "precarious_housing": "Vivienda precaria",
          "absenteeism": "Absentismo crónico (>20%)",
          "dropout_risk": "Deserción escolar o alto riesgo",
          "academic_delay": "Retraso escolar importante (>2 ans)",
          "learning_difficulties": "Dificultades de aprendizaje",
          "repeated_failure": "Repetición repetida (>2 veces)",
          "low_grades": "Resultados escolares muy bajos",
          "disability": "Discapacidad física o mental",
          "chronic_illness": "Enfermedad crónica",
          "malnutrition": "Desnutrición (IMC fuera de norma)",
          "no_cmu": "Falta de cobertura CMU",
          "mental_health": "Problemas de salud mental",
          "no_medical_followup": "Falta de seguimiento médico regular",
          "orphan": "Huérfano (uno o ambos padres)",
          "single_parent": "Familia monoparental en dificultad",
          "large_family": "Familia numerosa (>8 hijos)",
          "placed_child": "Niño acogido o en familia de acogida",
          "domestic_violence": "Violencia doméstica comprobada/sospechada",
          "parent_incarcerated": "Padre encarcelado, enfermo o discapacitado",
          "social_isolation": "Aislamiento social de la familia",
          "gbv": "Violencia basada en el género (VBG)",
          "school_violence": "Violencia escolar",
          "bullying": "Acoso escolar",
          "sexual_exploitation": "Explotación sexual",
          "early_marriage": "Matrimonio precoz o riesgo",
          "harmful_practices": "Prácticas nocivas (escisión, etc.)",
          "conflict_with_law": "Niño en conflicto con la ley"
        }
      },
      "dimensions": {
        "economic": "Económica",
        "school": "Escolar",
        "health": "Sanitaria",
        "social": "Social",
        "violence": "Violencia"
      },
      "pupils": {
        "cnive_id": "Identificador CNIVE",
        "title": "Base de alumnos",
        "subtitle": "{{count}} alumnos registrados en el sistema.",
        "add_new": "Nuevo alumno",
        "search_placeholder": "Buscar un alumno por nombre o ID...",
        "search_empty": "Ningún alumno coincide con sus criterios.",
        "filter": "Filtrer",
        "last_assessment": "Última eval.",
        "not_found": "Alumno no encontrado",
        "civil_state": "Estado Civil",
        "schooling": "Escolaridad",
        "tabs": {
            "info": "Información",
            "vulnerability": "Vulnerabilidad",
            "interventions": "Intervenciones",
            "absences": "Ausencias",
            "ai_analysis": "Análisis IA"
        },
        "form": {
            "first_name": "Nombre",
            "last_name": "Apellido",
            "birth_date": "Fecha de nacimiento",
            "gender": "Género",
            "school": "Escuela",
            "grade": "Nivel escolar / Clase",
            "suggested": "Sugerido según la edad",
            "academic_evaluation": "Evaluación Académica Detallada",
            "add_subject": "Añadir materia",
            "subject": "Materia",
            "score": "Nota",
            "out_of": "Sobre (/)",
            "average_score": "Promedio General Calculado (sobre 20)",
            "academic_score": "Nota Media",
            "cnive_id": "Identificador CNIVE",
            "address": "Dirección",
            "tutor_name": "Nombre del tutor",
            "tutor_phone": "Teléfono del tutor",
            "photo_required": "Foto requerida",
            "photo_title": "Foto del alumno",
            "photo_desc": "Importe una foto de identidad clara. El sistema optimizará automáticamente el peso de la imagen.",
            "choose_photo": "Elegir una foto",
            "personal_info": "Información académica y personal",
            "select_school": "Seleccionar una escuela"
        }
      },
      "errors": {
          "loading_schools": "Error al cargar las escuelas"
      },
      "status": {
        "active": "Activo",
        "inactive": "Inactivo",
        "active_m": "Activo",
        "active_f": "Activa",
        "inactive_m": "Inactivo",
        "inactive_f": "Inactiva",
        "transferred": "Transferido/a",
        "dropout": "Deserción"
      },
      "gender": {
        "female": "Niña",
        "male": "Niño"
      },
      "interventions": {
        "title": "Gestión de intervenciones",
        "subtitle": "Seguimiento y coordinación de acciones prioritarias.",
        "list_title": "Lista de intervenciones",
        "add_new": "+ Nueva intervención",
        "close_form": "✕ Cerrar",
        "total": "Total",
        "planned": "Planificadas",
        "in_progress": "En curso",
        "completed": "Terminadas",
        "urgent": "Urgentes",
        "empty": "No se encontraron intervenciones.",
        "form_new": "📝 Nueva intervención",
        "form_edit": "✏️ Editar intervención",
        "pupil": "Alumno",
        "type": "Tipo",
        "priority": "Prioridad",
        "description": "Descripción",
        "scheduled_date": "Fecha prevista",
        "assigned_to": "Responsable",
        "save": "Crear intervención",
        "save_changes": "Guardar cambios",
        "cancel": "Cancelar",
        "form": {
          "title": "Título",
          "title_placeholder": "Título descriptivo",
          "assigned_placeholder": "Nombre del agente",
          "description_placeholder": "Detalles de la intervención..."
        },
        "detail": {
          "created_at": "Creada el",
          "not_assigned": "No asignado",
          "no_description": "No se proporcionó ninguna descripción.",
          "history": "Historial y seguimiento",
          "note_placeholder": "Añadir una nota de seguimiento...",
          "publish": "Publicar"
        },
        "actions": {
          "edit": "Editar",
          "delete": "Eliminar",
          "confirm_delete_title": "¿Eliminar la intervención?",
          "confirm_delete_msg": "Esta acción eliminará permanentemente la intervención."
        },
        "status": {
          "planned": "Planificada",
          "in_progress": "En curso",
          "completed": "Terminada",
          "cancelled": "Cancelada"
        },
        "priorities": {
          "low": "Baja",
          "medium": "Media",
          "high": "Alta",
          "urgent": "Urgente"
        },
        "types": {
          "health": "Salud",
          "social": "Social",
          "education": "Educación",
          "educational": "Educativa",
          "psychological": "Soporte psicológico",
          "economic": "Económica",
          "financial": "Financiera"
        },
        "logs": {
          "status_change": "Cambio de estado",
          "note_added": "Nota añadida",
          "created": "Creación",
          "updated": "Modificación",
          "deleted": "Eliminación"
        }
      },
      "alerts": {
        "title": "Alertes y notificaciones",
        "subtitle": "Seguimiento de eventos críticos e intervenciones de emergencia.",
        "mark_all_read": "Marcar todo como leído",
        "filters": {
          "title": "Filtros",
          "all": "Todas las alertas",
          "unread": "Solo no leídas",
          "critical": "Alertas críticas",
          "warning": "Advertencias"
        },
        "total_count": "{{count}} alertas en total",
        "empty": {
          "title": "No se encontraron alertas",
          "desc": "Estás al día con tus notificaciones."
        },
        "levels": {
          "critical": "Crítico",
          "urgent": "Urgente",
          "warning": "Advertencia",
          "info": "Info"
        },
        "escalated": "Escalada",
        "messages": {
          "cmu_not_enrolled": "CMU no inscrito",
          "cmu_not_enrolled_desc": "Inscripción CMU ausente o retrasada.",
          "critical_vulnerability": "Urgencia: Caso crítico detectado",
          "critical_vulnerability_desc": "{{name}} tiene un puntaje de vulnerabilidad CRÍTICO ({{score}}/100). Se requiere intervención inmediata."
        }
      },
      "archives": {
        "title": "Archivos",
        "subtitle": "Gestión de expedientes de salud archivados",
        "search_placeholder": "Buscar un expediente archivado...",
        "empty": "No se encontraron expedientes archivados.",
        "last_modification": "Última modificación",
        "restore": "Restaurar",
        "delete_permanent": "Eliminar permanentemente",
        "confirm_archive": "¿Estás seguro de que quieres archivar este expediente?"
      },
      "absences": {
        "title": "Seguimiento de ausencias",
        "mark": "Registrar una ausencia",
        "reason": "Motivo",
        "date": "Fecha",
        "duration": "Duración (días)",
        "justified": "Justificada",
        "not_justified": "No justificada",
        "notes": "Notas / Observaciones",
        "success": "Ausencia registrada",
        "history": "Historial de ausencias",
        "empty": "No hay ausencias registradas",
        "reasons": {
          "sickness": "Enfermedad",
          "family": "Motivo familiar",
          "transport": "Problema de transporte",
          "other": "Otro"
        }
      },
      "ai": {
        "title": "Análisis IA",
        "subtitle": "Sistema de detección precoz de riesgos • CNIVE Intelligence v1.0",
        "tabs": {
          "dashboard": "Panel de control",
          "predict": "Predicción individual",
          "batch": "Análisis global"
        },
        "stats": {
          "pupils": "Alumnos analizados",
          "assessments": "Evaluaciones",
          "at_risk": "Casos en riesgo",
          "success": "Éxito intervenciones"
        },
        "distribution": "Distribución de vulnerabilidades",
        "dimension_scores": "Puntuaciones medias por dimensión",
        "loading": "Cargando datos analíticos...",
        "predict": {
          "title": "Predicción IA",
          "config": "Configuración del análisis",
          "select": "Seleccionar un alumno",
          "choose": "Elegir un beneficiario",
          "button": "Iniciar inteligencia artificial",
          "running": "Análisis en curso...",
          "report": "Informe de análisis predictivo",
          "factors": "Factores determinantes",
          "recommendations": "Recomendaciones de acciones",
          "risk": "Riesgo",
          "score": "Puntuación",
          "ready": "Listo para el análisis predictivo",
          "ready_desc": "El motor CNIVE evalúa las 6 dimensiones FEV de este alumno.",
          "level": "Nivel de riesgo",
          "plan": "Plan de acción recomendado",
          "factors_found": "El motor de análisis CNIVE ha identificado {{count}} factor(es) de vulnerabilidad que requieren atención especial.",
          "stable_desc": "No se detectó ninguna vulnerabilidad mayor. La situación del alumno es estable.",
          "levels": {
            "CRITICAL": "CRÍTICO",
            "HIGH": "ALTO",
            "MODERATE": "MODERADO",
            "LOW": "BAJO",
            "UNKNOWN": "DESCONOCIDO"
          }
        },
        "batch": {
          "title": "Analyse globale par lot",
          "subtitle": "Evaluación simultánea de todos los beneficiarios activos.",
          "button": "Iniciar análisis global",
          "running": "Procesamiento en curso...",
          "stats": {
            "total": "Analyses totales",
            "high_risk": "Críticos / Alto",
            "moderate_risk": "Riesgo moderado",
            "stable": "Casos estables"
          },
          "ready": "Listo para el análisis masivo",
          "ready_desc": "La IA evaluará toda la base de datos"
        }
      },
      "map": {
        "title": "Cartografía estratégica",
        "subtitle": "Visualización geolocalizada de infraestructuras escolares e índices de vulnerabilidad.",
        "code": "Código",
        "beneficiaries": "beneficiarios",
        "score": "Puntaje",
        "all_schools": "Todas las escuelas",
        "critical_cases": "Casos críticos",
        "high_priority": "Prioridad alta",
        "legend": "Leyenda de riesgos",
        "zone_stats": "Estadísticas de zona",
        "followed_schools": "Escuelas seguidas",
        "coverage": "Cobertura",
        "add_school": "Agregar escuela",
        "school_name": "Nombre de la escuela",
        "address": "Dirección física"
      },
      "health": {
        "title": "Salud digital",
        "subtitle": "Seguimiento médico completo y afiliación CMU de los beneficiarios.",
        "add_new": "+ Nuevo expediente",
        "new_record": "Nuevo expediente",
        "stats": {
          "cmu_enrolled": "Afiliados CMU",
          "not_enrolled": "No afiliados",
          "pending": "En espera",
          "vaccinations": "Vacunas registradas"
        },
        "tabs": {
          "overview": "Vista general",
          "vaccinations": "Vacunaciones",
          "cmu": "Protección CMU",
          "consultations": "Consultas"
        },
        "blood_group": "Grupo sanguíneo",
        "allergies": "Alergias",
        "chronic_conditions": "Patologías crónicas",
        "cmu_status": "Estado CMU",
        "cmu_number": "N° CMU",
        "facility": "Estructura",
        "actions": {
          "edit": "Editar",
          "delete": "Eliminar",
          "archive": "Archivar"
        },
        "status": {
          "enrolled": "Afiliado",
          "pending": "En espera",
          "not_enrolled": "No afiliado"
        },
        "form": {
          "choose_pupil": "Elegir un alumno...",
          "choose_facility": "Elegir un centro de salud...",
          "blood_group_unknown": "Desconocido",
          "medical_data": "Datos médicos",
          "medical_details": "Detalles médicos",
          "archive_notice": "Archivar este expediente (ya no será visible en la lista activa)",
          "allergies_placeholder": "Especifique alergias...",
          "chronic_placeholder": "Diabetes, Asma, etc..."
        },
        "vaccination": {
          "new": "Nueva Vacunación",
          "edit": "Editar Vacunación",
          "dose": "Dosis",
          "vaccine_name": "Nombre de la vacuna",
          "vaccine_placeholder": "ej: BCG, Polio, DTC...",
          "date": "Fecha de administración",
          "facility_placeholder": "Nombre del hospital o centro...",
          "dose_num": "Dosis {{num}}"
        },
        "consultation": {
          "new": "Nueva Consulta",
          "edit": "Editar Consulta",
          "reason": "Motivo de consulta",
          "reason_placeholder": "ej: Fiebre, Dolor abdominal...",
          "diagnosis": "Diagnóstico",
          "diagnosis_placeholder": "Diagnóstico...",
          "treatment": "Tratamiento prescrito",
          "treatment_placeholder": "Medicamentos, repos...",
          "date": "Fecha de consulta"
        }
      },
      "audit": {
        "title": "Registro de auditoría",
        "subtitle": "Trazabilidad inmutable y seguimiento de accesos de seguridad (CDC Sección 6.2).",
        "filter_placeholder": "Filtrar por acción, email o recurso...",
        "loading": "Cargando el registro...",
        "empty": "No se encontraron registros.",
        "last_7_days": "Últimos 7 días",
        "last_30_days": "Últimos 30 días",
        "last_90_days": "Últimos 90 días",
        "stats": {
          "total_events": "Eventos totales",
          "authorized_access": "Accesos autorizados",
          "security_failures": "Fallos de seguridad",
          "data_access": "Acceso a datos"
        },
        "categories": {
            "critical": "Alerta crítica",
            "access": "Acceso",
            "modification": "Modificación",
            "consultation": "Consulta",
            "system": "Sistema"
        },
        "actions": {
          "VIEW_AUDIT_LOG": "Consulta del registro",
          "VIEW_PUPIL": "Consulta de alumno",
          "CREATE_PUPIL": "Creación de alumno",
          "EDIT_PUPIL": "Modificación de alumno",
          "DELETE_PUPIL": "Eliminación de alumno",
          "LOGIN": "Inicio de sesión",
          "LOGOUT": "Cierre de sesión",
          "LOGIN_FAILED": "Fallo de inicio de sesión",
          "MFA_SETUP": "Configuración MFA",
          "MFA_VERIFIED": "Verificación MFA",
          "VIEW_VULNERABILITY": "Consulta de vulnerabilidad",
          "EDIT_VULNERABILITY": "Modificación de vulnerabilidad",
          "VIEW_HEALTH": "Consulta de expediente de salud",
          "EDIT_HEALTH": "Modificación de expediente de salud",
          "VIEW_INTERVENTION": "Consulta de intervención",
          "CREATE_INTERVENTION": "Creación de intervención",
          "EDIT_INTERVENTION": "Modificación de intervención",
          "VIEW_TEAM": "Consulta de equipo",
          "EDIT_TEAM": "Modificación de equipo",
          "CREATE_TEAM": "Creación de miembro de equipo",
          "DELETE_TEAM": "Eliminación de miembro de equipo",
          "GENERATE_REPORT": "Generación de informe",
          "EXPORT_DATA": "Exportación de datos",
          "CARD_SCAN": "Escaneo de tarjeta QR/NFC",
          "REFERRAL": "Referencia a socio",
          "VIEW_MAP": "Consulta del mapa",
          "SYSTEM": "Acción del sistema"
        }
      },
      "team": {
        "title": "Equipo y expertos",
        "subtitle": "Gestione los miembros de la unidad de coordinación y sus niveles de acceso.",
        "add_new": "Nuevo miembro",
        "roles": {
          "GTE_ADMIN": "Administrador GTE",
          "HEALTH_WORKER": "Salud / CMU",
          "SOCIAL_WORKER": "Trabajador social",
          "TEACHER": "Profesor / director",
          "GUEST": "Visitante / Otro",
          "guest": "Visitante / Otro"
        }
      },
      "settings": {
        "title": "Configuración del sistema",
        "profile": "Perfil de usuario",
        "notifications": "Notificaciones",
        "security": "Seguridad y MFA",
        "appearance": "Apariencia",
        "language": "Idioma de la interfaz"
      },
      "cards": {
          "title": "Gestión de tarjetas Sen-E-Carte",
          "subtitle": "Producción, personalización y analítica de accesos biométricos QR/NFC.",
          "tabs": {
              "overview": "Vista general",
              "generate": "Generar tarjeta",
              "history": "Historial"
          },
          "stats": {
              "total_scans": "Escaneos totales",
              "active_cards": "Tarjetas activas",
              "usage_rate": "Tasa de uso",
              "scans_per_card": "Escaneos / Tarjeta",
              "top_locations": "Ubicaciones más activas",
              "scans_by_role": "Distribución por rol"
          },

          "hotspots": "Hotspots de escaneo",
          "devices": "Terminales y usos",
          "recent_scans": "Últimos escaneos",
          "config": {
              "title": "Configuración de la tarjeta",
              "select_pupil": "Seleccionar el beneficiario",
              "qr_color": "Color QR",
              "bg_color": "Color fondo",
              "generate_button": "Generar Sen-E-Carte"
          },
          "preview": {
              "title": "Vista previa de producción",
              "waiting": "Esperando configuración"
          }
      },
      "reports": {
          "title": "Centro de informes",
          "subtitle": "Generación automatizada de informes PDF profesionales y conformes a CDC.",
          "step1": "1. Seleccionar el tipo de informe",
          "step2": "2. Configurer y generar",
          "pdf_download": "Descargar informe PDF",
          "specifications": "Especificaciones CDC",
          "spec_desc": "Los informes generados cumplen con la norma CNIVE F5.2 e incluyen los metadatos de auditoría necesarios para la trazabilidad.",
          "format": "Formato de salida",
          "hq_pdf": "PDF Vectorizado (HQ)",
          "types": {
              "pupil_profile": "Perfil completo",
              "pupil_profile_desc": "Información personal y escolar",
              "vulnerability": "Vulnerabilidad",
              "vulnerability_desc": "Evaluación de las 5 dimensiones",
              "health_record": "Expediente de salud",
              "health_record_desc": "Seguimiento médico y vacunaciones",
              "school_summary": "Resumen escolar",
              "school_summary_desc": "Estadísticas globales por establecimiento"
          }
      },
      "roles": {
          "user": "Usuario",
          "admin": "Administrador GTE",
          "expert": "Experto / Coordinador"
      },
      "scan": {
        "certified": "CERTIFICADO",
        "health_data": "Datos de Salud",
        "blood_group": "Grupo",
        "gender": "Género",
        "masculine": "Masc.",
        "feminine": "Fem.",
        "allergies": "Alergias y Vigilancias",
        "no_allergies": "Sin alergias reportadas.",
        "education": "Escolaridad y Estado Civil",
        "school": "Escuela",
        "grade": "Nivel",
        "birth": "Nacimiento",
        "emergency": "Contacto de Emergencia",
        "tutor": "Tutor",
        "vulnerability_details": "Detalles de Vulnerabilidad",
        "global_index": "Índice Global",
        "not_specified": "No especificado",
        "loading": "Cargando Pase Digital...",
        "not_found": "Perfil no encontrado",
        "not_found_desc": "Esta tarjeta no es reconocida por el sistema CNIVE.",
        "critical": "Urgencia Crítica",
        "high": "Vigilancia Acentuada",
        "stable": "Situación Estable"
      }
    }
  },
  en: {
    translation: {
      "common": {
        "view_all": "View all"
      },
      "pupils": {
        "cnive_id": "CNIVE ID"
      }
    }
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false
    }
  })

export default i18n
