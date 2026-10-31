from database import engine
from sqlalchemy import text

def add_column():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE health_records ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"))
            print("Successfully added created_at to health_records")
        except Exception as e:
            print(f"Error adding column to health_records: {e}")
            
        try:
            conn.execute(text("ALTER TABLE vaccinations ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"))
            print("Successfully added created_at to vaccinations")
        except Exception as e:
            print(f"Error adding column to vaccinations: {e}")
            
        try:
            conn.execute(text("ALTER TABLE consultations ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"))
            print("Successfully added created_at to consultations")
        except Exception as e:
            print(f"Error adding column to consultations: {e}")

if __name__ == "__main__":
    add_column()
