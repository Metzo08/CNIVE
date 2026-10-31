import os
import sys
import uuid
import re
import urllib.request
from datetime import datetime, date
import openpyxl
import pandas as pd

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
from app.models import models

sys.stdout.reconfigure(encoding='utf-8')

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')

def import_school_sheet(file_or_url: str, school_code: str, school_name: str):
    """
    Imports pupils from a Google Sheets CSV URL or a local Excel/CSV file into the specified school.
    """
    db = SessionLocal()
    try:
        school = db.query(models.School).filter(models.School.code == school_code).first()
        if not school:
            print(f"[!] School with code {school_code} not found. Creating it...")
            school = models.School(
                id=uuid.uuid4(),
                name=school_name,
                code=school_code,
                city="Pikine"
            )
            db.add(school)
            db.commit()
            db.refresh(school)

        # Load data
        if file_or_url.startswith("http"):
            # Attempt download
            temp_path = os.path.join(UPLOADS_DIR, f"temp_{school_code}.csv")
            try:
                urllib.request.urlretrieve(file_or_url, temp_path)
                df = pd.read_csv(temp_path)
            except Exception as e:
                print(f"[ERROR] Could not fetch Google Sheet ({e}). The Google Sheet might be private. Please share with 'Anyone with the link' or download as Excel.")
                return 0
        elif file_or_url.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_or_url)
        else:
            df = pd.read_csv(file_or_url)

        print(f"Loaded {len(df)} rows for {school.name}.")
        
        # Determine existing pupil count for CNIVE ID generation
        current_pupils_count = db.query(models.Pupil).count()
        imported = 0

        for idx, row in df.iterrows():
            # Check for name fields
            first_name = None
            last_name = None
            
            # Common patterns from Outil de Collecte / Code.gs
            if "Prénom et Nom de l’élève" in df.columns:
                full_name = str(row["Prénom et Nom de l’élève"]).strip()
                parts = full_name.split()
                first_name = " ".join(parts[:-1]) if len(parts) > 1 else full_name
                last_name = parts[-1] if len(parts) > 1 else full_name
            elif "Prénom" in df.columns and "Nom" in df.columns:
                first_name = str(row.get("Prénom", "")).strip()
                last_name = str(row.get("Nom", "")).strip()
            elif "PRENOM BENEFICIAIRE" in df.columns:
                first_name = str(row.get("PRENOM BENEFICIAIRE", "")).strip()
                last_name = str(row.get("NOM", "")).strip()
            else:
                # Fallback on column positions
                first_name = str(row.iloc[1]).strip()
                last_name = str(row.iloc[2]).strip()

            if not first_name or first_name.lower() in ["nan", "none", ""]:
                continue

            cnive_id = f"CNIVE-2026-{current_pupils_count + imported + 1:06d}"
            
            # Grade
            grade = "CI"
            for col in ["Classe", "Classe de l'élève", "Niveau", "grade"]:
                if col in df.columns and pd.notna(row.get(col)):
                    grade = str(row.get(col)).strip()
                    break

            # Gender
            gender = "M"
            for col in ["Sexe", "SEXE", "sexe", "Genre"]:
                if col in df.columns and pd.notna(row.get(col)):
                    val = str(row.get(col)).strip().upper()
                    gender = "F" if val.startswith("F") else "M"
                    break

            # Birth date
            birth_date = date(2015, 1, 1)

            # Photo URL
            photo_url = None
            for col in ["Photo", "Lien Photo", "Lien de la photo sur Google Drive", "photo_url"]:
                if col in df.columns and pd.notna(row.get(col)):
                    photo_url = str(row.get(col)).strip()
                    break

            pupil_id = uuid.uuid4()
            pupil = models.Pupil(
                id=pupil_id,
                cnive_id=cnive_id,
                first_name=first_name,
                last_name=last_name,
                birth_date=birth_date,
                gender=gender,
                grade=grade,
                address=f"Pikine, {school.name}",
                school_id=school.id,
                photo_url=photo_url,
                academic_score=13.0,
                status=models.PupilStatus.ACTIVE
            )
            db.add(pupil)
            db.flush()

            # Create assessment
            assessment = models.VulnerabilityAssessment(
                id=uuid.uuid4(),
                pupil_id=pupil_id,
                economic_score=10,
                school_score=10,
                health_nutrition_score=5,
                family_social_score=10,
                protection_score=5,
                environmental_score=10,
                total_score=50.0,
                classification=models.VulnerabilityLevel.MODERATE,
                comments=f"Enrôlement initial école pilote {school.name}."
            )
            db.add(assessment)

            # Create card
            card = models.Card(
                id=uuid.uuid4(),
                pupil_id=pupil_id,
                card_number=f"CARD-2026-{current_pupils_count + imported + 1:06d}",
                qr_token=f"TOKEN-{school_code}-{imported + 1:06d}",
                is_active=True,
                status=models.CardStatus.ACTIVE
            )
            db.add(card)

            imported += 1

        db.commit()
        print(f"[OK] Successfully imported {imported} pupils into {school.name}.")
        return imported
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python import_google_sheet.py <file_or_url> <school_code> [school_name]")
        print("Example: python import_google_sheet.py 'https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=...' ECOPN_FASS2 'ECOPN : école Diacksao Fass 2'")
    else:
        file_path = sys.argv[1]
        code = sys.argv[2]
        name = sys.argv[3] if len(sys.argv) > 3 else code
        import_school_sheet(file_path, code, name)
