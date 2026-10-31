from database import SessionLocal
from app.models import models

db = SessionLocal()
schools = db.query(models.School).all()
for s in schools:
    count = db.query(models.Pupil).filter(models.Pupil.school_id == s.id).count()
    print(f"School: {s.name} ({s.code}) - Pupils: {count}")
db.close()
