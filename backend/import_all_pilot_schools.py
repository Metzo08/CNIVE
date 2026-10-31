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
        # Google Drive public high-speed CDN endpoint
        return f"https://lh3.googleusercontent.com/d/{drive_id}"
    return None

def map_classification(classif_str, total_score):
    classif_str = str(classif_str).lower().strip()
    if "critique" in classif_str:
        return models.VulnerabilityLevel.CRITICAL
    elif "élev" in classif_str:
        return models.VulnerabilityLevel.HIGH
    elif "modér" in classif_str:
        return models.VulnerabilityLevel.MODERATE
    elif "faible" in classif_str:
        return models.VulnerabilityLevel.LOW
    
    if total_score >= 80:
        return models.VulnerabilityLevel.CRITICAL
    elif total_score >= 65:
        return models.VulnerabilityLevel.HIGH
    elif total_score >= 45:
        return models.VulnerabilityLevel.MODERATE
    return models.VulnerabilityLevel.LOW

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

    # Start after row 0 (title) and row 1 (headers)
    rows = reader[2:]
    print(f"  Found {len(rows)} data rows to process.")

    imported = 0
    # Determine base sequence from existing count in database
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

        # Scores
        try:
            v_eco = int(float(r[7])) if len(r) > 7 and r[7].strip() else 10
        except: v_eco = 10
        try:
            v_sco = int(float(r[8])) if len(r) > 8 and r[8].strip() else 10
        except: v_sco = 10
        try:
            v_san = int(float(r[9])) if len(r) > 9 and r[9].strip() else 10
        except: v_san = 10
        try:
            v_fam = int(float(r[10])) if len(r) > 10 and r[10].strip() else 10
        except: v_fam = 10
        try:
            v_pro = int(float(r[11])) if len(r) > 11 and r[11].strip() else 10
        except: v_pro = 10
        try:
            v_env = int(float(r[12])) if len(r) > 12 and r[12].strip() else 10
        except: v_env = 10

        try:
            total_score = float(r[13]) if len(r) > 13 and r[13].strip() else float(v_eco + v_sco + v_san + v_fam + v_pro + v_env)
        except:
            total_score = float(v_eco + v_sco + v_san + v_fam + v_pro + v_env)

        classif_raw = r[15] if len(r) > 15 else ""
        classification = map_classification(classif_raw, total_score)

        drive_cell = r[16] if len(r) > 16 else ""
        photo_url = extract_photo_url(drive_cell)

        # Unique sequential CNIVE ID
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
            academic_score=round(10.0 + (20.0 - (total_score / 6.0)) * 0.4, 1),
            school_id=school.id,
            status=models.PupilStatus.ACTIVE
        )
        db.add(pupil)
        db.flush()

        # FEV Assessment
        assessment = models.VulnerabilityAssessment(
            id=uuid.uuid4(),
            pupil_id=pupil_id,
            economic_score=v_eco,
            school_score=v_sco,
            health_nutrition_score=v_san,
            family_social_score=v_fam,
            protection_score=v_pro,
            environmental_score=v_env,
            total_score=total_score,
            classification=classification,
            comments=f"Collecte FEV officielle - École {school.name}."
        )
        db.add(assessment)

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

        # Health Record
        health = models.HealthRecord(
            id=uuid.uuid4(),
            pupil_id=pupil_id,
            cmu_status="enrolled" if (imported % 4 != 0) else "not_enrolled",
            cmu_number=f"CMU-DKR-{seq_num + 5000:05d}" if (imported % 4 != 0) else None,
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
        # 1. ECOPN : école Diacksao Fass 2
        import_csv_school(
            db=db,
            csv_file_path="backend/ecopn_diacksao_fass_2.csv",
            school_code="ECOPN_FASS2",
            school_name="ECOPN : école Diacksao Fass 2",
            default_address="Quartier Diacksao Fass 2, Pikine"
        )

        # 2. EDEN : Salif Ndongo B
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
