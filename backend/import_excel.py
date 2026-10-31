import pandas as pd
import uuid
import os
from datetime import datetime, date
from database import SessionLocal
from app.models import models
import re

def parse_date(date_str):
    if pd.isna(date_str):
        return date(2000, 1, 1)
    if isinstance(date_str, (datetime, date)):
        return date_str
    
    match = re.search(r'(\d{2})[/-](\d{2})[/-](\d{4})', str(date_str))
    if match:
        day, month, year = match.groups()
        try:
            return date(int(year), int(month), int(day))
        except:
            pass
    return date(2000, 1, 1)

def import_excel_1():
    print("Importing LISTE BENEFS MSD DTK PIKINE 2026.xlsx...")
    file_path = r"C:\Users\hp\Downloads\LISTE BENEFS MSD DTK PIKINE 2026.xlsx"
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    df = pd.read_excel(file_path)
    db = SessionLocal()
    
    # Par défaut, on assigne à une des 3 écoles officielles (ex: Calasanz)
    target_school = db.query(models.School).filter(models.School.code == 'SAMSAM').first()
    if not target_school:
        print("Erreur: Écoles officielles non trouvées. Lancez d'abord seed_data.py")
        return

    count = 0
    for _, row in df.iterrows():
        if pd.isna(row.get("PRENOM BENEFICIAIRE")) and pd.isna(row.get("NOM")):
            continue

        birth_date = parse_date(row.get("DATE NAISSANCE"))
        
        cnive_id_val = str(row.get("CODE BENEFICIAIRE", "")).strip().upper()
        if not cnive_id_val or cnive_id_val == "NAN" or cnive_id_val == "NOUVEAU" or cnive_id_val == "ANCIEN":
            cnive_id = f"CNIVE-2026-IMP-{uuid.uuid4().hex[:8].upper()}"
        else:
            cnive_id = cnive_id_val
        
        existing = db.query(models.Pupil).filter(models.Pupil.cnive_id == cnive_id).first()
        if existing:
            continue

        pupil = models.Pupil(
            id=uuid.uuid4(),
            cnive_id=cnive_id,
            first_name=str(row.get("PRENOM BENEFICIAIRE", "Inconnu")),
            last_name=str(row.get("NOM", "Inconnu")),
            birth_date=birth_date,
            gender=str(row.get("SEXE", "M"))[0].upper() if not pd.isna(row.get("SEXE")) else "M",
            address=str(row.get("ADRESSSE", "Pikine")),
            school_id=target_school.id,
            contact_parent1_phone=str(row.get("CONTACT", "")),
            national_id=str(row.get("N° CIN", "")) if not pd.isna(row.get("N° CIN")) else None,
            status=models.PupilStatus.ACTIVE
        )
        db.add(pupil)
        count += 1
        
        if count % 10 == 0:
            db.commit()
            
    db.commit()
    print(f"Imported {count} beneficiaries into school {target_school.name}.")
    db.close()

def import_excel_2():
    print("Importing BASE CARTE MSD PIKINE_22012026.xlsx...")
    file_path = r"C:\Users\hp\Downloads\BASE CARTE MSD PIKINE_22012026.xlsx"
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    df = pd.read_excel(file_path)
    db = SessionLocal()
    
    target_school = db.query(models.School).filter(models.School.code == 'SAMSAM').first()

    count = 0
    for _, row in df.iterrows():
        if pd.isna(row.get("Prénom")) and pd.isna(row.get("Nom")):
            continue

        try:
            j = int(row.get('J', 1))
            m = int(row.get('M', 1))
            a = int(row.get('A', 2000))
            birth_date = date(a, m, j)
        except:
            birth_date = date(2000, 1, 1)
            
        cnive_id_val = str(row.get("Code Bénéficiaire", "")).strip().upper()
        if not cnive_id_val or cnive_id_val == "NAN" or cnive_id_val == "NOUVEAU" or cnive_id_val == "ANCIEN":
            cnive_id = f"CNIVE-2026-BASE-{uuid.uuid4().hex[:8].upper()}"
        else:
            cnive_id = cnive_id_val
        
        existing = db.query(models.Pupil).filter(models.Pupil.cnive_id == cnive_id).first()
        if existing:
            continue

        pupil = models.Pupil(
            id=uuid.uuid4(),
            cnive_id=cnive_id,
            first_name=str(row.get("Prénom", "Inconnu")),
            last_name=str(row.get("Nom", "Inconnu")),
            birth_date=birth_date,
            gender=str(row.get("Sexe", "M"))[0].upper() if not pd.isna(row.get("Sexe")) else "M",
            address=str(row.get("ADRESSE", "Pikine")),
            school_id=target_school.id,
            contact_parent1_phone=str(row.get("Telephone", "")),
            status=models.PupilStatus.ACTIVE
        )
        db.add(pupil)
        count += 1
        
        if count % 10 == 0:
            db.commit()
            
    db.commit()
    print(f"Imported {count} beneficiaries into school {target_school.name}.")
    db.close()

if __name__ == "__main__":
    import_excel_1()
    import_excel_2()
