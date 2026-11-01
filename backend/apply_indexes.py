"""
Script d'application des index de haute performance pour 100 000+ élèves.
Crée les index B-Tree et Trigram dans PostgreSQL.
"""
from database import engine
from sqlalchemy import text

INDEXES_SQL = [
    # Extension Trigram pour recherche floue instantanée (100k+ élèves)
    "CREATE EXTENSION IF NOT EXISTS pg_trgm;",

    # Écoles
    "CREATE INDEX IF NOT EXISTS idx_schools_code ON schools(code);",
    "CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(name);",
    
    # Utilisateurs
    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);",
    "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);",
    "CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);",
    
    # Élèves (100k+)
    "CREATE INDEX IF NOT EXISTS idx_pupils_cnive_id ON pupils(cnive_id);",
    "CREATE INDEX IF NOT EXISTS idx_pupils_status ON pupils(status);",
    "CREATE INDEX IF NOT EXISTS idx_pupils_school_id ON pupils(school_id);",
    "CREATE INDEX IF NOT EXISTS idx_pupils_created_at ON pupils(created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_pupils_name ON pupils(last_name, first_name);",
    "CREATE INDEX IF NOT EXISTS idx_pupils_school_status ON pupils(school_id, status);",
    "CREATE INDEX IF NOT EXISTS idx_pupils_fn_trgm ON pupils USING gin (first_name gin_trgm_ops);",
    "CREATE INDEX IF NOT EXISTS idx_pupils_ln_trgm ON pupils USING gin (last_name gin_trgm_ops);",
    "CREATE INDEX IF NOT EXISTS idx_pupils_cnive_trgm ON pupils USING gin (cnive_id gin_trgm_ops);",
    
    # Absences & Académique
    "CREATE INDEX IF NOT EXISTS idx_absences_pupil_date ON absences(pupil_id, date);",
    "CREATE INDEX IF NOT EXISTS idx_academic_pupil ON academic_records(pupil_id);",
    
    # Santé
    "CREATE INDEX IF NOT EXISTS idx_health_records_pupil ON health_records(pupil_id);",
    "CREATE INDEX IF NOT EXISTS idx_health_records_cmu ON health_records(cmu_status);",
    "CREATE INDEX IF NOT EXISTS idx_vaccinations_pupil ON vaccinations(pupil_id);",
    "CREATE INDEX IF NOT EXISTS idx_consultations_pupil ON consultations(pupil_id);",
    
    # Évaluations FEV
    "CREATE INDEX IF NOT EXISTS idx_assessments_pupil_created ON vulnerability_assessments(pupil_id, created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_assessments_classification ON vulnerability_assessments(classification);",
    
    # Interventions
    "CREATE INDEX IF NOT EXISTS idx_interventions_pupil_status ON interventions(pupil_id, status);",
    "CREATE INDEX IF NOT EXISTS idx_interventions_assigned ON interventions(assigned_to);",
    
    # Cartes & Scans
    "CREATE INDEX IF NOT EXISTS idx_cards_pupil ON cards(pupil_id);",
    "CREATE INDEX IF NOT EXISTS idx_cards_number ON cards(card_number);",
    "CREATE INDEX IF NOT EXISTS idx_card_scans_time ON card_scan_logs(timestamp DESC);",
    
    # Audit Logs
    "CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(timestamp DESC);",
    "CREATE INDEX IF NOT EXISTS idx_audit_action_time ON audit_logs(action, timestamp DESC);",
    "CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_email);"
]

def apply_indexes():
    print("Application des index de performance pour 100k+ élèves...")
    with engine.begin() as conn:
        for sql in INDEXES_SQL:
            try:
                conn.execute(text(sql))
                print(f"[OK] {sql.split()[2]}")
            except Exception as e:
                print(f"[!] Erreur: {e}")
    print("Tous les index ont été appliqués avec succès !")

if __name__ == "__main__":
    apply_indexes()
