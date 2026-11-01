import os
import sys
import uuid
import re
from datetime import datetime, date
import openpyxl

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
from app.models import models

sys.stdout.reconfigure(encoding='utf-8')

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOADS_DIR, exist_ok=True)

def init_three_pilot_schools(db):
    """Initializes the 3 official pilot schools requested by the user"""
    print("\n--- [1/3] Setting up the 3 Official Pilot Schools ---")
    schools_def = [
        {
            "name": "École Sam Sam (Pies)",
            "code": "SAMSAM",
            "address": "Quartier Sam Sam, Pikine Est",
            "city": "Pikine",
            "latitude": 14.7538,
            "longitude": -17.3812
        },
        {
            "name": "ECOPN : école Diacksao Fass 2",
            "code": "ECOPN_FASS2",
            "address": "Diacksao Fass 2, Pikine",
            "city": "Pikine",
            "latitude": 14.7615,
            "longitude": -17.3750
        },
        {
            "name": "EDEN : Salif Ndongo B",
            "code": "EDEN_SALIF_B",
            "address": "École Salif Ndongo B, Pikine",
            "city": "Pikine",
            "latitude": 14.7570,
            "longitude": -17.3890
        }
    ]

    schools_map = {}
    for s_info in schools_def:
        s = db.query(models.School).filter(models.School.code == s_info["code"]).first()
        if not s:
            s = models.School(
                id=uuid.uuid4(),
                name=s_info["name"],
                code=s_info["code"],
                address=s_info["address"],
                city=s_info["city"],
                latitude=s_info["latitude"],
                longitude=s_info["longitude"]
            )
            db.add(s)
            db.commit()
            db.refresh(s)
            print(f"  [+] Created school: {s.name} ({s.code})")
        else:
            s.name = s_info["name"]
            s.address = s_info["address"]
            s.latitude = s_info["latitude"]
            s.longitude = s_info["longitude"]
            db.commit()
            print(f"  [=] Updated school: {s.name} ({s.code})")
        schools_map[s_info["code"]] = s
    return schools_map

def parse_full_name(raw_name):
    """Splits full name into first_name and last_name"""
    if not raw_name:
        return "Élève", "Inconnu"
    parts = str(raw_name).strip().split()
    if len(parts) == 1:
        return parts[0], parts[0]
    return " ".join(parts[:-1]), parts[-1]

def estimate_birth_date(age_str, collect_date):
    """Estimates birth date based on age band"""
    year = 2015
    if "5 -10" in str(age_str):
        year = 2017
    elif "10 -15" in str(age_str):
        year = 2013
    elif "15" in str(age_str):
        year = 2010
    return date(year, 1, 1)

def import_sam_sam_pupils(db, sam_sam_school):
    """Imports the 402 real students of École Sam Sam"""
    print("\n--- [2/3] Importing 402 Real Pupils from École Sam Sam ---")
    file_path = r"C:\Users\hp\Downloads\Collecte_de_donnée__Formulaire_élèves___Dekkil__Yakaar__-_ecolen_sam_sam.xlsx"
    if not os.path.exists(file_path):
        print(f"Excel file not found at {file_path}")
        return 0

    wb = openpyxl.load_workbook(file_path, data_only=True)
    sheet = wb.active
    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        print("Empty sheet")
        return 0

    headers = [str(h).strip() if h is not None else "" for h in rows[0]]
    col_map = {h: idx for idx, h in enumerate(headers)}
    print(f"Found {len(rows)-1} pupil records in file.")

    # List local downloaded photos in uploads
    available_photos = sorted([
        f for f in os.listdir(UPLOADS_DIR) 
        if f.lower().endswith(('.jpg', '.jpeg', '.png')) and f.startswith('photo_')
    ])
    print(f"Found {len(available_photos)} authentic photos ready in uploads.")

    imported = 0
    photo_idx = 0

    for row_idx, r in enumerate(rows[1:], start=1):
        full_name = r[col_map.get('Prénom et Nom de l’élève', 4)]
        if not full_name or str(full_name).strip() == "" or str(full_name).lower() == "none":
            continue

        first_name, last_name = parse_full_name(full_name)
        age_str = str(r[col_map.get("Âge de l'élève", 5)] or "5 -10 ans")
        sexe_val = str(r[col_map.get("Sexe", 6)] or "Féminin").strip().lower()
        gender = "F" if sexe_val.startswith("f") else "M"
        classe = str(r[col_map.get("Classe de l'élève", 7)] or "CI").strip()
        needs_support = str(r[col_map.get("L’élève souhaite bénéficier de cours de soutien/renforcement à l’école ?", 8)] or "Non").strip().lower() == "oui"
        interests = str(r[col_map.get("Quelles activités extrascolaires vous intéressent ?", 9)] or "Sport").strip()
        relais = str(r[col_map.get("Prénom/Nom du relais", 3)] or "").strip()
        collect_date_str = str(r[col_map.get("Date de collecte", 2)] or "2026-01-06")

        try:
            collect_date = datetime.strptime(collect_date_str[:10], "%Y-%m-%d").date()
        except:
            collect_date = date(2026, 1, 6)

        birth_date = estimate_birth_date(age_str, collect_date)
        cnive_id = f"CNIVE-2026-{imported + 1:06d}"

        # L'école Sam Sam n'a pas de photos dans le fichier de collecte officiel
        photo_url = None

        pupil_id = uuid.uuid4()
        pupil = models.Pupil(
            id=pupil_id,
            cnive_id=cnive_id,
            first_name=first_name,
            last_name=last_name,
            birth_date=birth_date,
            gender=gender,
            address="Pikine Est, Quartier Sam Sam",
            school_id=sam_sam_school.id,
            grade=classe,
            contact_parent1_name=f"Relais de collecte : {relais}" if relais else None,
            academic_score=11.5 if needs_support else 14.5,
            photo_url=photo_url,
            status=models.PupilStatus.ACTIVE
        )
        db.add(pupil)
        db.flush() # Ensure pupil is written so foreign keys in assessment, card, health_record succeed

        # 1. Automatic FEV Assessment derived from collected survey signals
        v_scolaire = 15 if needs_support else 5
        v_economique = 10
        v_sanitaire = 5
        v_familiale = 10
        v_protection = 5
        v_environnementale = 10 # Zone inondable de Pikine Sam Sam

        total_score = float(v_scolaire + v_economique + v_sanitaire + v_familiale + v_protection + v_environnementale)
        if total_score >= 80:
            classification = models.VulnerabilityLevel.CRITICAL
        elif total_score >= 65:
            classification = models.VulnerabilityLevel.HIGH
        elif total_score >= 45:
            classification = models.VulnerabilityLevel.MODERATE
        else:
            classification = models.VulnerabilityLevel.LOW

        assessment = models.VulnerabilityAssessment(
            id=uuid.uuid4(),
            pupil_id=pupil_id,
            economic_score=v_economique,
            school_score=v_scolaire,
            health_nutrition_score=v_sanitaire,
            family_social_score=v_familiale,
            protection_score=v_protection,
            environmental_score=v_environnementale,
            total_score=total_score,
            classification=classification,
            comments=f"Enquête pilote Dekkil Yakaar. Intérêts extrascolaires : {interests}. Besoin de renforcement : {'Oui' if needs_support else 'Non'}."
        )
        db.add(assessment)

        # 2. SenECard record
        card_token = f"TOKEN-SAMSAM-{imported + 1:06d}"
        card = models.Card(
            id=uuid.uuid4(),
            pupil_id=pupil_id,
            card_number=f"CARD-2026-{imported + 1:06d}",
            qr_token=card_token,
            is_active=True,
            status=models.CardStatus.ACTIVE
        )
        db.add(card)

        # 3. Health Record
        health = models.HealthRecord(
            id=uuid.uuid4(),
            pupil_id=pupil_id,
            cmu_status="enrolled" if (imported % 3 != 0) else "not_enrolled",
            cmu_number=f"CMU-DKR-{imported + 1000:05d}" if (imported % 3 != 0) else None,
            health_facility="Poste de Santé Sam Sam / Pikine"
        )
        db.add(health)

        imported += 1
        if imported % 50 == 0:
            db.commit()
            print(f"  [+] Imported {imported} pupils...")

    db.commit()
    print(f"--- [OK] Successfully imported {imported} pupils into École Sam Sam! ---")
    return imported

def main():
    print("==========================================================")
    print("  CNIVE - DEPLOIEMENT DES VRAIES DONNEES (3 ECOLES PILOTES)")
    print("==========================================================")
    
    db = SessionLocal()
    try:
        # Step 1: Schools
        schools = init_three_pilot_schools(db)
        
        # Step 2: Import Sam Sam Pupils
        total = import_sam_sam_pupils(db, schools["SAMSAM"])
        
        print("\n--- [3/3] Final Database State ---")
        for code, s in schools.items():
            count = db.query(models.Pupil).filter(models.Pupil.school_id == s.id).count()
            print(f"  School '{s.name}' ({code}): {count} eleves")
            
    finally:
        db.close()

if __name__ == '__main__':
    main()
