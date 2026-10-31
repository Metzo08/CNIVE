from database import engine
from sqlalchemy import text

def update_card_scan_logs():
    with engine.connect() as conn:
        cols = [
            'location_name VARCHAR(255)',
            'location_lat FLOAT',
            'location_lon FLOAT',
            'device_info VARCHAR(255)',
            'scanner_id UUID REFERENCES users(id)'
        ]
        for col in cols:
            try:
                conn.execute(text(f"ALTER TABLE card_scan_logs ADD COLUMN IF NOT EXISTS {col}"))
                print(f"Added {col}")
            except Exception as e:
                print(f"Error adding {col}: {e}")
        conn.commit()

if __name__ == "__main__":
    update_card_scan_logs()
