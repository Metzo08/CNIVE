import uuid
import random
from datetime import datetime, timedelta
from database import SessionLocal
from app.models.models import Pupil, VulnerabilityAssessment, Card, CardScanLog, VulnerabilityLevel

# Real coordinates for Pikine and surrounding areas
ZONES = {
    "Pikine Nord": {"lat_min": 14.760, "lat_max": 14.770, "lon_min": -17.395, "lon_max": -17.385},
    "Pikine Ouest": {"lat_min": 14.750, "lat_max": 14.760, "lon_min": -17.405, "lon_max": -17.395},
    "Thiaroye": {"lat_min": 14.745, "lat_max": 14.765, "lon_min": -17.380, "lon_max": -17.360},
    "Keur Massar": {"lat_min": 14.770, "lat_max": 14.790, "lon_min": -17.320, "lon_max": -17.290},
    "Dalifort": {"lat_min": 14.725, "lat_max": 14.735, "lon_min": -17.435, "lon_max": -17.425},
    "Djidah Thiaroye Kao": {"lat_min": 14.765, "lat_max": 14.775, "lon_min": -17.385, "lon_max": -17.375},
    "Yeumbeul": {"lat_min": 14.775, "lat_max": 14.795, "lon_min": -17.370, "lon_max": -17.350},
    "Médina Gounass": {"lat_min": 14.755, "lat_max": 14.765, "lon_min": -17.380, "lon_max": -17.370}
}

FLOOD_PRONE_ZONES = ["Keur Massar", "Djidah Thiaroye Kao", "Yeumbeul", "Médina Gounass"]

def update_data():
    db = SessionLocal()
    try:
        # 1. Update Pupil Addresses to match zones
        print("Updating pupil addresses and environmental scores...")
        pupils = db.query(Pupil).all()
        for pupil in pupils:
            zone = random.choice(list(ZONES.keys()))
            pupil.address = f"Quartier {zone}, Maison {random.randint(1, 500)}"
            
            # 2. Update Vulnerability Assessments based on flood zones
            assessment = db.query(VulnerabilityAssessment).filter(VulnerabilityAssessment.pupil_id == pupil.id).order_by(VulnerabilityAssessment.created_at.desc()).first()
            if assessment:
                if zone in FLOOD_PRONE_ZONES:
                    # 30% chance of critical displacement due to floods
                    if random.random() < 0.3:
                        assessment.environmental_score = 20
                        assessment.total_score = max(assessment.total_score, 90) # Boost total score
                        assessment.classification = VulnerabilityLevel.CRITICAL
                        assessment.comments = "Situation d'urgence : Foyer abandonné/détruit suite aux inondations majeures."
                    else:
                        assessment.environmental_score = 15
                        if assessment.total_score < 76:
                            assessment.total_score += 10
                        if assessment.classification == VulnerabilityLevel.LOW:
                            assessment.classification = VulnerabilityLevel.MODERATE
                        assessment.comments = "Risque environnemental élevé : Zone fortement inondable affectant les conditions de vie."
                else:
                    # Normal environmental score for other areas
                    assessment.environmental_score = random.choice([5, 10])

        db.commit()

        # 3. Regenerate Card Scan Logs with accurate coordinates
        print("Regenerating Card Scan Logs with accurate map hotspots...")
        db.query(CardScanLog).delete()
        
        cards = db.query(Card).all()
        roles = ['GTE_ADMIN', 'HEALTH_WORKER', 'SOCIAL_WORKER', 'TEACHER']
        
        for _ in range(150):
            card = random.choice(cards)
            zone_name = random.choice(list(ZONES.keys()))
            bounds = ZONES[zone_name]
            lat = random.uniform(bounds["lat_min"], bounds["lat_max"])
            lon = random.uniform(bounds["lon_min"], bounds["lon_max"])
            
            log = CardScanLog(
                id=uuid.uuid4(),
                card_id=card.id,
                scanner_role=random.choice(roles),
                scan_type='qr',
                location_name=zone_name,
                location_lat=lat,
                location_lon=lon,
                timestamp=datetime.utcnow() - timedelta(hours=random.randint(0, 168))
            )
            db.add(log)
            
        db.commit()
        print("Data successfully updated!")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_data()
