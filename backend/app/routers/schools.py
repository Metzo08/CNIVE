from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from app.models import models
from pydantic import BaseModel
from app.utils.auth import get_current_user
from app.routers.audit import log_action
import uuid

router = APIRouter(prefix="/schools", tags=["Schools"])


class SchoolCreate(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    city: str = "Pikine"
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class SchoolResponse(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    address: Optional[str] = None
    city: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    pupil_count: int = 0
    avg_vulnerability: float = 0.0

    class Config:
        from_attributes = True


@router.post("/", response_model=SchoolResponse)
def create_school(
    school: SchoolCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    new_school = models.School(**school.model_dump())
    db.add(new_school)
    db.commit()
    db.refresh(new_school)

    # Audit log
    log_action(
        db,
        models.AuditActionType.SYSTEM,
        user_id=str(current_user.id),
        user_email=current_user.email,
        resource_type="school",
        resource_id=str(new_school.id),
        ip_address=request.client.host if request and request.client else None,
        metadata={"action": "create_school", "name": school.name},
    )

    return new_school


@router.get("/", response_model=List[SchoolResponse])
def get_schools(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.School)
    if current_user.role in [models.UserRole.SCHOOL_DIRECTOR, models.UserRole.TEACHER]:
        if current_user.school_id:
            query = query.filter(models.School.id == current_user.school_id)
        else:
            return []
    schools = query.all()
    results = []
    for school in schools:
        # Count pupils
        pupil_count = (
            db.query(models.Pupil).filter(models.Pupil.school_id == school.id).count()
        )

        # Calculate avg vulnerability
        assessments = (
            db.query(models.VulnerabilityAssessment)
            .join(
                models.Pupil, models.Pupil.id == models.VulnerabilityAssessment.pupil_id
            )
            .filter(models.Pupil.school_id == school.id)
            .all()
        )

        avg_v = (
            sum(a.total_score for a in assessments) / len(assessments)
            if assessments
            else 30
        )

        # Normalize to 0-100 scale for UI markers
        # New FEV range is 30 to 120. (avg_v - 30) / 90 * 100
        normalized_v = max(0, ((avg_v - 30) / 90) * 100)

        school_dict = {
            "id": school.id,
            "name": school.name,
            "code": school.code,
            "address": school.address,
            "city": school.city,
            "latitude": school.latitude,
            "longitude": school.longitude,
            "pupil_count": pupil_count,
            "avg_vulnerability": round(normalized_v, 1),
        }
        results.append(school_dict)
    return results


@router.get("/count")
def get_schools_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role in [models.UserRole.SCHOOL_DIRECTOR, models.UserRole.TEACHER]:
        return {"count": 1 if current_user.school_id else 0}
    count = db.query(models.School).count()
    return {"count": count}


# Seed initial pilot schools - GET method for easy browser access
@router.get("/seed/pilot-schools")
def seed_pilot_schools_get(db: Session = Depends(get_db)):
    return _seed_pilot_schools(db)


@router.post("/seed/pilot-schools")
def seed_pilot_schools_post(db: Session = Depends(get_db)):
    return _seed_pilot_schools(db)


@router.get("/{school_id}", response_model=SchoolResponse)
def get_school(school_id: uuid.UUID, db: Session = Depends(get_db)):
    school = db.query(models.School).filter(models.School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return school


def _seed_pilot_schools(db: Session):
    """Helper function to seed pilot schools"""
    pilot_schools = [
        {
            "name": "École Pilote Pikine Nord",
            "code": "EPPN",
            "city": "Pikine",
            "address": "Pikine Nord",
            "latitude": 14.7645,
            "longitude": -17.3960,
        },
        {
            "name": "École d'Excellence du Nord",
            "code": "EDEN",
            "city": "Pikine",
            "address": "Pikine Centre",
            "latitude": 14.7512,
            "longitude": -17.4023,
        },
        {
            "name": "Groupe Scolaire Les Ambassadeurs de Pikine",
            "code": "GSAP",
            "city": "Pikine",
            "address": "Pikine Est",
            "latitude": 14.7589,
            "longitude": -17.3890,
        },
    ]
    created = []
    for school_data in pilot_schools:
        existing = (
            db.query(models.School)
            .filter(models.School.code == school_data["code"])
            .first()
        )
        if not existing:
            new_school = models.School(**school_data)
            db.add(new_school)
            created.append(school_data["code"])
    db.commit()

    if created:
        # Audit log (using first created school or generic)
        log_action(
            db,
            models.AuditActionType.SYSTEM,
            user_email="system@cnive.sn",
            metadata={"action": "seed_schools", "count": len(created)},
        )
        return {
            "success": True,
            "message": f"✓ Écoles pilotes créées: {', '.join(created)}",
            "created": created,
        }
    else:
        schools = db.query(models.School).all()
        return {
            "success": True,
            "message": "Écoles pilotes déjà existantes",
            "schools": [s.name for s in schools],
        }
