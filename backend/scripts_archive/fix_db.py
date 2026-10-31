from database import engine
from sqlalchemy import text

def fix_db():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE health_records DROP CONSTRAINT IF EXISTS health_records_pkey CASCADE;"))
            print("Dropped old PK")
        except Exception as e:
            print("Error dropping PK:", e)
            
        try:
            conn.execute(text("ALTER TABLE health_records ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();"))
            print("Added id column")
        except Exception as e:
            print("Error adding id:", e)

        try:
            conn.execute(text("ALTER TABLE health_records ADD UNIQUE(pupil_id);"))
            print("Added unique constraint on pupil_id")
        except Exception as e:
            print("Error adding unique:", e)

if __name__ == "__main__":
    fix_db()
