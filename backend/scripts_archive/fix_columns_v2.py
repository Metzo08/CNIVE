from database import engine
from sqlalchemy import text

def add_column(table_name):
    with engine.connect() as conn:
        try:
            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"))
            conn.commit()
            print(f"Successfully added created_at to {table_name}")
        except Exception as e:
            print(f"Error adding column to {table_name}: {e}")

if __name__ == "__main__":
    add_column("health_records")
    add_column("vaccinations")
    add_column("consultations")
