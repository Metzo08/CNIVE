from database import engine
from sqlalchemy import text

def add_school_id_to_users():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN school_id UUID REFERENCES schools(id);"))
            print("Added school_id column to users table")
        except Exception as e:
            print(f"Error adding school_id: {e}")

if __name__ == "__main__":
    add_school_id_to_users()
