import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
from app.models import models

sys.stdout.reconfigure(encoding='utf-8')

def clean_database():
    print("=== NETTOYAGE RIGOUREUX DES DONNÉES INVENTÉES ===")
    db = SessionLocal()
    try:
        # 1. Supprimer toutes les évaluations de vulnérabilité inventées
        deleted_assessments = db.query(models.VulnerabilityAssessment).delete()
        print(f"[OK] Supprimé {deleted_assessments} évaluations de vulnérabilité fictives.")

        # 2. Réinitialiser les notes académiques de tous les élèves à NULL
        updated_pupils = db.query(models.Pupil).update({models.Pupil.academic_score: None})
        print(f"[OK] Réinitialisé la note académique de {updated_pupils} élèves à NULL (non noté).")

        # 3. Supprimer tout relevé de notes fictif
        deleted_academics = db.query(models.AcademicRecord).delete()
        print(f"[OK] Supprimé {deleted_academics} relevés de notes.")

        # 4. Supprimer les absences fictives
        deleted_absences = db.query(models.Absence).delete()
        print(f"[OK] Supprimé {deleted_absences} absences fictives.")

        # 5. Supprimer les interventions fictives
        deleted_int_logs = db.query(models.InterventionLog).delete()
        deleted_interventions = db.query(models.Intervention).delete()
        print(f"[OK] Supprimé {deleted_interventions} interventions fictives.")

        # 6. Réinitialiser les statuts santé fictifs (pas de faux numéros CMU)
        updated_health = db.query(models.HealthRecord).update({
            models.HealthRecord.cmu_number: None,
            models.HealthRecord.cmu_status: None,
            models.HealthRecord.allergies: None,
            models.HealthRecord.chronic_conditions: None
        })
        print(f"[OK] Nettoyé les statuts de santé fictifs de {updated_health} élèves.")

        db.commit()

        # Audit final
        print("\n--- ÉTAT FINAL DE LA BASE DE DONNÉES ---")
        pupils_count = db.query(models.Pupil).count()
        schools_count = db.query(models.School).count()
        assessments_count = db.query(models.VulnerabilityAssessment).count()
        critical_count = db.query(models.VulnerabilityAssessment).filter(
            models.VulnerabilityAssessment.classification == models.VulnerabilityLevel.CRITICAL
        ).count()
        cards_count = db.query(models.Card).count()
        notes_count = db.query(models.Pupil).filter(models.Pupil.academic_score.isnot(None)).count()

        print(f"  * Total Élèves réels : {pupils_count}")
        print(f"  * Total Écoles réelles : {schools_count}")
        print(f"  * Évaluations FEV enregistrées : {assessments_count} (Cas critiques: {critical_count})")
        print(f"  * Élèves avec note inventée : {notes_count} (doit être 0)")
        print(f"  * Cartes scolaires actives : {cards_count}")

    finally:
        db.close()

if __name__ == '__main__':
    clean_database()
