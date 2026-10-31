from database import engine, Base
from sqlalchemy import text
from app.models.models import (
    School, User, Pupil, HealthRecord, 
    VulnerabilityAssessment, Card, Intervention, 
    InterventionLog, Vaccination, Consultation
)

def init_db():
    with engine.connect() as conn:
        print("Dropping all tables with CASCADE...")
        # Force drop everything to clean up inconsistencies
        tables = [
            "intervention_logs", "interventions", "vulnerability_assessments",
            "health_records", "vaccinations", "consultations", "cards", 
            "card_scan_logs", "audit_logs", "pupils", "schools", "users",
            "maternity_records", "prenatal_visits", "academic_records"
        ]
        for table in tables:
            try:
                conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
                conn.commit()
            except Exception as e:
                print(f"Error dropping {table}: {e}")
        
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")

if __name__ == "__main__":
    init_db()
