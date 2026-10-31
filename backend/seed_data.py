import os
import sys
import uuid
import random
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import SessionLocal, engine, Base
from app.models.models import (
    User, School, Pupil, HealthRecord, VulnerabilityAssessment, 
    Card, Intervention, UserRole, PupilStatus, VulnerabilityLevel, 
    InterventionStatus, AuditLog, AuditActionType,
    Vaccination, Consultation, AcademicRecord,
    CardStatus, CardScanLog
)
import bcrypt

def get_hash(password: str):
    # Quick hash for seeding
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(4)).decode('utf-8')

# Données sénégalaises
FIRST_NAMES_M = ["Mamadou", "Ibrahima", "Ousmane", "Cheikh", "Abdoulaye", "Moussa", "Modou", "Papa", "Amadou", "Saliou", "Babacar", "Alioune", "Serigne", "Assane", "Oumar", "Lamine", "Idrissa", "Abdou", "Souleymane", "Youssou"]
FIRST_NAMES_F = ["Fatou", "Aminata", "Mariama", "Aïssatou", "Djeneba", "Khady", "Coumba", "Ndèye", "Awa", "Sokhna", "Ramatoulaye", "Binta", "Penda", "Adji", "Oumy", "Nafissatou", "Khoudia", "Seynabou", "Rokhy", "Maimouna"]
LAST_NAMES = ["Diallo", "Ndiaye", "Fall", "Sow", "Ba", "Diop", "Mbaye", "Gueye", "Sarr", "Faye", "Sy", "Kane", "Camara", "Traoré", "Touré", "Cissé", "Seck", "Mbow", "Badiane", "Diedhiou"]
QUARTIERS = ["Tally Boubess", "Medina Gounass", "Pikine Est", "Pikine Ouest", "Djiddah Thiaroye Kao", "Guinaw Rails", "Yeumbeul", "Thiaroye sur Mer", "Keur Massar", "Malika", "Diamaguène"]
QUARTIER_COORDINATES = {
    "Tally Boubess": (14.762, -17.401),
    "Medina Gounass": (14.767, -17.392),
    "Pikine Est": (14.758, -17.395),
    "Pikine Ouest": (14.755, -17.405),
    "Djiddah Thiaroye Kao": (14.763, -17.382),
    "Guinaw Rails": (14.748, -17.388),
    "Yeumbeul": (14.782, -17.362),
    "Thiaroye sur Mer": (14.739, -17.375),
    "Keur Massar": (14.785, -17.305),
    "Malika": (14.802, -17.325),
    "Diamaguène": (14.745, -17.345)
}
HEALTH_FACILITIES = ["Centre de Santé Pikine Nord", "Hôpital de Pikine", "Centre PMI Thiaroye", "Poste de Santé Dalifort", "Hôpital de Guédiawaye", "CS de Keur Massar"]
VACCINES = ["BCG", "VPO", "Pentavalent", "Pneumocoque", "Rota", "VPI", "RR", "VAA", "VHB"]
SUBJECTS = ["Mathématiques", "Français", "Éveil", "Calcul", "Dictée", "Lecture", "Sport", "Arabe"]

def seed_data():
    db: Session = SessionLocal()
    
    print("Nettoyage complet de la base de données...")
    Base.metadata.drop_all(bind=engine)
    
    print("Recréation des tables...")
    Base.metadata.create_all(bind=engine)

    print("Démarrage du peuplement complet...")

    # 1. Écoles
    school_configs = [
        {"name": "Écoles Sam Sam", "code": "SAMSAM", "total": 400, "girls": 225},
        {"name": "ECOPN : école Diacksao Fass 2", "code": "ECOPN", "total": 623, "girls": 312},
        {"name": "EDEN : Salif Ndongo B", "code": "EDEN_SNB", "total": 1269, "girls": 601}
    ]
    
    schools = []
    pikine_quartiers = ["Pikine Ouest", "Pikine Est", "Medina Gounass", "Tally Boubess", "Guinaw Rails", "Djiddah Thiaroye Kao"]
    for config in school_configs:
        quartier = random.choice(pikine_quartiers)
        base_lat, base_lon = QUARTIER_COORDINATES[quartier]
        school = School(
            id=uuid.uuid4(),
            name=config["name"],
            code=config["code"],
            address=f"Quartier {quartier}, Pikine",
            city="Pikine",
            latitude=base_lat + random.uniform(-0.002, 0.002),
            longitude=base_lon + random.uniform(-0.002, 0.002)
        )
        db.add(school)
        school._total = config["total"]
        school._girls = config["girls"]
        schools.append(school)
    
    db.commit()

    # 2. Utilisateurs — mots de passe DIFFÉRENCIÉS par rôle (sécurité renforcée)
    # Chaque compte a un mot de passe unique. Changer IMMÉDIATEMENT après la 1ère connexion.
    admin_pass   = "Cnive@Admin2026!"      # GTE_ADMIN
    hw_pass      = "Cnive@Sante2026!"      # HEALTH_WORKER
    sw_pass      = "Cnive@Social2026!"     # SOCIAL_WORKER
    teacher_pass = "Cnive@Enseignant2026!" # TEACHER
    
    admin = User(
        id=uuid.uuid4(),
        email="admin@gte.sn",
        hashed_password=get_hash(admin_pass),
        first_name="Amadou",
        last_name="Ndiaye",
        role=UserRole.GTE_ADMIN,
        is_active=True
    )
    db.add(admin)

    hw = User(
        id=uuid.uuid4(),
        email="sante1@sante.sn",
        hashed_password=get_hash(hw_pass),
        first_name="Fatou",
        last_name="Sow",
        role=UserRole.HEALTH_WORKER,
        is_active=True
    )
    db.add(hw)

    sw = User(
        id=uuid.uuid4(),
        email="social1@social.sn",
        hashed_password=get_hash(sw_pass),
        first_name="Moussa",
        last_name="Faye",
        role=UserRole.SOCIAL_WORKER,
        is_active=True
    )
    db.add(sw)

    # Membres d'équipe supplémentaires
    for i in range(1, 4):
        role = random.choice([UserRole.TEACHER, UserRole.SOCIAL_WORKER])
        db.add(User(
            id=uuid.uuid4(),
            email=f"expert{i}@gte.sn",
            hashed_password=get_hash(teacher_pass),
            first_name=f"Expert{i}",
            last_name=random.choice(LAST_NAMES),
            role=role,
            is_active=True
        ))

    db.commit()
    print("✅ Utilisateurs et équipe créés.")
    print("=" * 55)
    print("  CREDENTIALS INITIAUX — À CHANGER APRÈS 1ÈRE CONNEXION")
    print("=" * 55)
    print(f"  👑 admin@gte.sn           → {admin_pass}")
    print(f"  🏥 sante1@sante.sn        → {hw_pass}")
    print(f"  🤝 social1@social.sn      → {sw_pass}")
    print(f"  📚 expert1-3@gte.sn       → {teacher_pass}")
    print("=" * 55)


    # 3. Élèves et données associées
    pupil_count = 0
    all_pupils = []
    
    for school in schools:
        total = school._total
        girls_total = school._girls
        print(f"Génération de {total} élèves pour {school.name}...")
        
        for g_idx in range(total):
            pupil_count += 1
            gender = "F" if g_idx < girls_total else "M"
            first_name = random.choice(FIRST_NAMES_F if gender == "F" else FIRST_NAMES_M)
            last_name = random.choice(LAST_NAMES)
            
            # Age distribution 6-15 years
            age = random.randint(6, 15)
            birth_date = date.today() - timedelta(days=age*365 + random.randint(0, 364))

            # Statut réaliste
            status = random.choices(
                [PupilStatus.ACTIVE, PupilStatus.TRANSFERRED, PupilStatus.DROPOUT],
                weights=[90, 5, 5]
            )[0]

            pupil = Pupil(
                id=uuid.uuid4(),
                cnive_id=f"CN-2026-{pupil_count:05d}",
                school_id=school.id,
                first_name=first_name,
                last_name=last_name,
                birth_date=birth_date,
                gender=gender,
                grade=random.choice(["CI", "CP", "CE1", "CE2", "CM1", "CM2"]),
                address=f"Quartier {random.choice(QUARTIERS)}, Pikine",
                contact_parent1_name=f"{random.choice(FIRST_NAMES_M)} {last_name}",
                contact_parent1_phone=f"77{random.randint(100, 999)}{random.randint(10, 99)}{random.randint(10, 99)}",
                status=status,
                academic_score=round(random.uniform(5, 19), 1),
                national_id=f"{random.randint(1, 2)}{random.randint(100, 999)}{birth_date.year}{random.randint(10000, 99999)}" if random.random() > 0.5 else None
            )
            db.add(pupil)
            db.flush()
            all_pupils.append(pupil)
            
            # Health Record
            cmu_status = random.choices(["enrolled", "pending", "not_enrolled"], weights=[55, 15, 30])[0]
            # Archiver quelques dossiers (5%) pour la page Archives
            is_archived = random.random() < 0.05
            
            health = HealthRecord(
                id=uuid.uuid4(),
                pupil_id=pupil.id,
                blood_group=random.choice(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
                allergies="Aucune" if random.random() > 0.2 else random.choice(["Arachides", "Poussière", "Pénicilline", "Lactose"]),
                chronic_conditions="Aucune" if random.random() > 0.15 else random.choice(["Asthme", "Drépanocytose", "Anémie", "Épilepsie"]),
                cmu_status=cmu_status,
                cmu_number=f"CMU-{random.randint(100000, 999999)}" if cmu_status == "enrolled" else None,
                health_facility=random.choice(HEALTH_FACILITIES),
                is_archived=is_archived
            )
            db.add(health)

            # Academic Records (3 terms)
            for term in ["Trimestre 1", "Trimestre 2", "Trimestre 3"]:
                if random.random() > 0.1: # Some missing data for realism
                    for sub in random.sample(SUBJECTS, 4):
                        db.add(AcademicRecord(
                            id=uuid.uuid4(),
                            pupil_id=pupil.id,
                            subject=sub,
                            score=round(random.uniform(7, 20), 1),
                            term=term
                        ))
            
            # FEV Evaluation (Vulnerability)
            risk_factor = random.random()
            if risk_factor > 0.96: # CRITICAL
                scores = [random.randint(16, 20) for _ in range(6)]
            elif risk_factor > 0.88: # HIGH
                scores = [random.randint(11, 15) for _ in range(6)]
            elif risk_factor > 0.70: # MODERATE
                scores = [random.randint(6, 10) for _ in range(6)]
            else: # LOW
                scores = [random.randint(1, 5) for _ in range(6)]
            
            total_fev = float(sum(scores))
            level = VulnerabilityLevel.LOW
            if total_fev > 105: level = VulnerabilityLevel.CRITICAL
            elif total_fev > 75: level = VulnerabilityLevel.HIGH
            elif total_fev > 45: level = VulnerabilityLevel.MODERATE
            
            assessment = VulnerabilityAssessment(
                id=uuid.uuid4(),
                pupil_id=pupil.id,
                assessor_id=sw.id,
                economic_score=scores[0],
                school_score=scores[1],
                health_nutrition_score=scores[2],
                family_social_score=scores[3],
                protection_score=scores[4],
                environmental_score=scores[5],
                total_score=total_fev,
                classification=level,
                comments=f"Évaluation réalisée le {date.today() - timedelta(days=random.randint(10, 100))}.",
                assessment_date=date.today() - timedelta(days=random.randint(10, 100))
            )
            db.add(assessment)

            # Interventions for HIGH/CRITICAL
            if level in [VulnerabilityLevel.HIGH, VulnerabilityLevel.CRITICAL]:
                for _ in range(random.randint(1, 3)):
                    db.add(Intervention(
                        id=uuid.uuid4(),
                        pupil_id=pupil.id,
                        title=random.choice(["Aide alimentaire", "Fournitures scolaires", "Suivi psychologique", "Appui financier CMU"]),
                        type=random.choice(["SOCIAL", "HEALTH", "EDUCATIONAL", "FINANCIAL"]),
                        description="Action prioritaire suite à évaluation FEV.",
                        status=random.choice([InterventionStatus.PENDING, InterventionStatus.IN_PROGRESS, InterventionStatus.COMPLETED]),
                        priority=random.choice(["high", "medium"]),
                        assigned_to=sw.id,
                        start_date=date.today() - timedelta(days=random.randint(1, 30))
                    ))

            # Vaccinations (80% have some)
            if random.random() > 0.2:
                for v_name in random.sample(VACCINES, random.randint(1, 5)):
                    db.add(Vaccination(
                        id=uuid.uuid4(),
                        pupil_id=pupil.id,
                        vaccine_name=v_name,
                        dose_number=1,
                        administered_date=date.today() - timedelta(days=random.randint(100, 1000)),
                        facility=random.choice(HEALTH_FACILITIES),
                        administered_by="Agent de santé"
                    ))

            # Consultations (30% have visits)
            if random.random() > 0.7:
                db.add(Consultation(
                    id=uuid.uuid4(),
                    pupil_id=pupil.id,
                    consultation_type=random.choice(["Générale", "Pédiatrie", "Urgence"]),
                    diagnosis=random.choice(["Fièvre", "Paludisme léger", "Toux", "Blessure mineure"]),
                    treatment="Repos et médicaments prescrits",
                    consultation_date=date.today() - timedelta(days=random.randint(1, 180)),
                    facility=random.choice(HEALTH_FACILITIES),
                    practitioner="Dr. " + random.choice(LAST_NAMES)
                ))

            # NFC Cards (some pupils have them)
            if random.random() > 0.5:
                card_id = uuid.uuid4()
                db.add(Card(
                    id=card_id,
                    pupil_id=pupil.id,
                    card_number=f"CARD-{pupil_count:05d}-{uuid.uuid4().hex[:4].upper()}",
                    qr_token=uuid.uuid4().hex,
                    is_active=True
                ))
                
                # Seed some scan logs for this card to populate the charts beautifully!
                if random.random() > 0.3:
                    for _ in range(random.randint(1, 4)):
                        # Pick a random coordinator/expert user
                        role = random.choice(["HEALTH_WORKER", "SOCIAL_WORKER", "GTE_ADMIN", "guest"])
                        scan_time = datetime.now() - timedelta(days=random.randint(0, 6), hours=random.randint(0, 23), minutes=random.randint(0, 59))
                        # Lat and Lon in Pikine / Dakar area matching the selected neighborhood
                        quartier = random.choice(QUARTIERS)
                        base_lat, base_lon = QUARTIER_COORDINATES[quartier]
                        lat = base_lat + random.uniform(-0.003, 0.003)
                        lon = base_lon + random.uniform(-0.003, 0.003)
                        db.add(CardScanLog(
                            id=uuid.uuid4(),
                            card_id=card_id,
                            scanner_role=role,
                            scan_type=random.choice(["qr", "nfc", "qr_web", "qr_gps"]),
                            location_name=quartier,
                            location_lat=lat,
                            location_lon=lon,
                            device_info=random.choice([
                                "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
                                "Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
                                "Mozilla/5.0 (Linux; Android 12; Redmi Note 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36"
                            ]),
                            timestamp=scan_time
                        ))

            if pupil_count % 100 == 0:
                db.commit()
                print(f"... {pupil_count} élèves traités")

    db.commit()

    # 5. Audit Logs
    print("Génération des logs d'audit diversifiés...")
    actions = [
        AuditActionType.LOGIN, AuditActionType.VIEW_PUPIL, 
        AuditActionType.EDIT_HEALTH, AuditActionType.GENERATE_REPORT,
        AuditActionType.CARD_SCAN, AuditActionType.EDIT_VULNERABILITY,
        AuditActionType.CREATE_INTERVENTION, AuditActionType.VIEW_TEAM,
        AuditActionType.VIEW_AUDIT_LOG
    ]
    for _ in range(300):
        user = random.choice([admin, hw, sw])
        db.add(AuditLog(
            id=uuid.uuid4(),
            action=random.choice(actions),
            user_id=user.id,
            user_email=user.email,
            resource_type=random.choice(["pupil", "health_record", "intervention", "vulnerability_assessment", "report", "team", "audit"]),
            ip_address=f"192.168.1.{random.randint(2, 254)}",
            timestamp=datetime.now() - timedelta(hours=random.randint(1, 1000))
        ))

    db.commit()
    print(f"Peuplement terminé avec succès !")
    print(f"Total élèves : {pupil_count}")
    print(f"Total écoles : {len(schools)}")
    
    db.close()

if __name__ == "__main__":
    try:
        seed_data()
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"FATAL ERROR: {e}")
