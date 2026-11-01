import os
import sys
import uuid
import re
import csv
from datetime import datetime, date

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
from app.models import models

sys.stdout.reconfigure(encoding='utf-8')

def parse_date(date_str):
    if not date_str:
        return date(2015, 1, 1)
    date_str = str(date_str).strip()
    try:
        return datetime.strptime(date_str[:10], "%Y-%m-%d").date()
    except Exception:
        pass
    try:
        return datetime.strptime(date_str[:10], "%d/%m/%Y").date()
    except Exception:
        pass
    return date(2015, 1, 1)

def extract_photo_url(drive_cell):
    if not drive_cell:
        return None
    match = re.search(r'/d/([a-zA-Z0-9_-]{25,})', str(drive_cell))
    if match:
        drive_id = match.group(1)
        return f"https://lh3.googleusercontent.com/d/{drive_id}"
    return None

def import_csv_school(db, csv_file_path, school_code, school_name, default_address):
    print(f"\n=======================================================")
    print(f"  Importing School: {school_name} ({school_code})")
    print(f"=======================================================")

    school = db.query(models.School).filter(models.School.code == school_code).first()
    if not school:
        school = models.School(
            id=uuid.uuid4(),
            name=school_name,
            code=school_code,
            address=default_address,
            city="Pikine"
        )
        db.add(school)
        db.commit()
        db.refresh(school)
        print(f"  [+] Created school in database: {school.name}")
    else:
        print(f"  [=] School exists: {school.name}")

    if not os.path.exists(csv_file_path):
        print(f"  [ERR] File not found: {csv_file_path}")
        return 0

    with open(csv_file_path, 'r', encoding='utf-8', errors='ignore') as f:
        reader = list(csv.reader(f))

    if len(reader) < 3:
        print("  [ERR] CSV has insufficient rows.")
        return 0

    rows = reader[2:]
    print(f"  Found {len(rows)} data rows to process.")

    imported = 0
    existing_count = db.query(models.Pupil).count()

    for idx, r in enumerate(rows, start=1):
        if len(r) < 3:
            continue
        nom_val = r[1].strip()
        prenom_val = r[2].strip()
        if not nom_val and not prenom_val:
            continue

        gender_val = r[3].strip().upper() if len(r) > 3 else "F"
        gender = "F" if gender_val.startswith("F") else "M"
        birth_date = parse_date(r[4] if len(r) > 4 else None)
        grade = r[5].strip() if len(r) > 5 and r[5].strip() else "CI"
        phone = r[6].strip() if len(r) > 6 and r[6].strip() else None

        drive_cell = r[16] if len(r) > 16 else ""
        photo_url = extract_photo_url(drive_cell)

        seq_num = existing_count + imported + 1
        cnive_id = f"CNIVE-2026-{seq_num:06d}"

        pupil_id = uuid.uuid4()
        pupil = models.Pupil(
            id=pupil_id,
            cnive_id=cnive_id,
            first_name=prenom_val.title() if prenom_val else "Élève",
            last_name=nom_val.upper() if nom_val else "INCONNU",
            birth_date=birth_date,
            gender=gender,
            grade=grade,
            address=default_address,
            contact_parent1_phone=phone,
            photo_url=photo_url,
            academic_score=None, # Aucun élève n'a de note pour l'instant
            school_id=school.id,
            status=models.PupilStatus.ACTIVE
        )
        db.add(pupil)
        db.flush()

        # SenECard record
        card = models.Card(
            id=uuid.uuid4(),
            pupil_id=pupil_id,
            card_number=f"CARD-2026-{seq_num:06d}",
            qr_token=f"TOKEN-{school_code}-{seq_num:06d}",
            is_active=True,
            status=models.CardStatus.ACTIVE
        )
        db.add(card)

        # Health Record (aucun faux statut ni faux numéro inventé)
        health = models.HealthRecord(
            id=uuid.uuid4(),
            pupil_id=pupil_id,
            cmu_status=None,
            cmu_number=None,
            health_facility=f"Poste de Santé {school.city} / Pikine"
        )
        db.add(health)

        imported += 1
        if imported % 100 == 0:
            db.commit()
            print(f"  [+] Imported {imported} pupils...")

    db.commit()
    print(f"  [OK] Successfully imported {imported} pupils for {school.name}!")
    return imported

def main():
    db = SessionLocal()
    try:
        import_csv_school(
            db=db,
            csv_file_path="backend/ecopn_diacksao_fass_2.csv",
            school_code="ECOPN_FASS2",
            school_name="ECOPN : école Diacksao Fass 2",
            default_address="Quartier Diacksao Fass 2, Pikine"
        )

        import_csv_school(
            db=db,
            csv_file_path="backend/eden_salif_ndongo_b.csv",
            school_code="EDEN_SALIF_B",
            school_name="EDEN : Salif Ndongo B",
            default_address="École Salif Ndongo B, Pikine"
        )

        print("\n=======================================================")
        print("  FINAL STATE ACROSS ALL 3 PILOT SCHOOLS")
        print("=======================================================")
        total_all = db.query(models.Pupil).count()
        print(f"Total pupils in CNIVE platform: {total_all}")
        for s in db.query(models.School).all():
            cnt = db.query(models.Pupil).filter(models.Pupil.school_id == s.id).count()
            print(f"  * {s.name} ({s.code}): {cnt} pupils")

    finally:
        db.close()

if __name__ == '__main__':
    main()
