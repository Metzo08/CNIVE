from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from pydantic import BaseModel
from database import get_db
from app.models import models
from app.schemas import schemas
from app.utils.auth import get_current_user
from app.routers.audit import log_action
import uuid
from datetime import datetime, date, timedelta
import random

router = APIRouter(prefix="/health-records", tags=["Health Records"])


class HealthRecordCreate(BaseModel):
    pupil_id: str
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    cmu_status: str = "not_enrolled"
    cmu_number: Optional[str] = None
    health_facility: Optional[str] = None


class VaccinationCreate(BaseModel):
    pupil_id: str
    vaccine_name: str
    dose_number: int = 1
    administered_date: str
    next_due_date: Optional[str] = None
    administered_by: Optional[str] = None
    facility: Optional[str] = None


class ConsultationCreate(BaseModel):
    pupil_id: str
    consultation_date: str
    consultation_type: str
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    prescriptions: Optional[str] = None
    practitioner: Optional[str] = None
    facility: Optional[str] = None
    follow_up_date: Optional[str] = None


@router.get("/", response_model=List[schemas.HealthRecordResponse])
def get_health_records(
    response: Response,
    skip: int = 0,
    limit: int = 100,
    pupil_id: Optional[str] = None,
    cmu_status: Optional[str] = None,
    include_archived: bool = False,
    is_archived: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user),
    request: Request = None,
):
    query = db.query(models.HealthRecord).options(joinedload(models.HealthRecord.pupil))

    if is_archived is not None:
        query = query.filter(models.HealthRecord.is_archived == is_archived)
    elif not include_archived:
        query = query.filter(models.HealthRecord.is_archived == False)

    if pupil_id:
        query = query.filter(models.HealthRecord.pupil_id == pupil_id)
    if cmu_status:
        query = query.filter(models.HealthRecord.cmu_status == cmu_status)

    total = query.count()
    response.headers["X-Total-Count"] = str(total)

    records = query.offset(skip).limit(limit).all()

    # Ensure created_at is not None for the response model
    for r in records:
        if r.created_at is None:
            r.created_at = datetime.utcnow()

    # Audit log (only if user is authenticated)
    if current_user:
        log_action(
            db,
            models.AuditActionType.VIEW_HEALTH,
            user_id=str(current_user.id),
            user_email=current_user.email,
            resource_type="health_record",
            resource_id=pupil_id,
            ip_address=request.client.host if request and request.client else None,
        )

    return records


@router.get("/pupil/{pupil_id}")
def get_pupil_health_record(
    pupil_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get health record for a specific pupil"""
    record = (
        db.query(models.HealthRecord)
        .filter(models.HealthRecord.pupil_id == pupil_id)
        .first()
    )
    if not record:
        return None  # Return None instead of 404 to avoid frontend errors when no record exists yet
    return record


@router.delete("/{pupil_id}")
def delete_health_record(
    pupil_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    db_record = (
        db.query(models.HealthRecord)
        .filter(models.HealthRecord.pupil_id == pupil_id)
        .first()
    )
    if not db_record:
        raise HTTPException(status_code=404, detail="Dossier non trouvé")
    db.delete(db_record)
    db.commit()

    # Audit log
    log_action(
        db,
        models.AuditActionType.DELETE_PUPIL,
        user_id=str(current_user.id),
        user_email=current_user.email,
        resource_type="health_record",
        resource_id=pupil_id,
        ip_address=request.client.host if request and request.client else None,
        metadata={"action": "delete_health_record"},
    )

    return {"success": True}


@router.put("/{pupil_id}/archive")
def archive_health_record(
    pupil_id: str,
    archive: bool = True,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    db_record = (
        db.query(models.HealthRecord)
        .filter(models.HealthRecord.pupil_id == pupil_id)
        .first()
    )
    if not db_record:
        raise HTTPException(status_code=404, detail="Dossier non trouvé")
    db_record.is_archived = archive
    db.commit()

    # Audit log
    log_action(
        db,
        models.AuditActionType.EDIT_HEALTH,
        user_id=str(current_user.id),
        user_email=current_user.email,
        resource_type="health_record",
        resource_id=pupil_id,
        ip_address=request.client.host if request and request.client else None,
        metadata={"action": "archive" if archive else "unarchive"},
    )

    return {"success": True}


@router.post("/")
def create_health_record(
    record: HealthRecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    pupil = db.query(models.Pupil).filter(models.Pupil.id == record.pupil_id).first()
    if not pupil:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    db_record = (
        db.query(models.HealthRecord)
        .filter(models.HealthRecord.pupil_id == record.pupil_id)
        .first()
    )
    action_type = (
        models.AuditActionType.EDIT_HEALTH
        if db_record
        else models.AuditActionType.EDIT_HEALTH
    )

    if db_record:
        for key, value in record.dict().items():
            setattr(db_record, key, value)
    else:
        db_record = models.HealthRecord(**record.dict())
        db.add(db_record)

    db.commit()
    db.refresh(db_record)

    # Audit log
    log_action(
        db,
        action_type,
        user_id=str(current_user.id),
        user_email=current_user.email,
        resource_type="health_record",
        resource_id=record.pupil_id,
        ip_address=request.client.host if request and request.client else None,
    )

    return db_record


@router.get("/stats")
def get_health_stats(db: Session = Depends(get_db)):
    total_pupils = db.query(models.Pupil).count()
    cmu_enrolled = (
        db.query(models.HealthRecord)
        .filter(models.HealthRecord.cmu_status == "enrolled")
        .count()
    )
    cmu_pending = (
        db.query(models.HealthRecord)
        .filter(models.HealthRecord.cmu_status == "pending")
        .count()
    )

    vacc_count = db.query(models.Vaccination).count()

    first_day = date.today().replace(day=1)
    cons_count = (
        db.query(models.Consultation)
        .filter(models.Consultation.consultation_date >= first_day)
        .count()
    )

    return {
        "total_pupils": total_pupils,
        "with_health_records": db.query(models.HealthRecord).count(),
        "cmu_enrolled": cmu_enrolled,
        "cmu_pending": cmu_pending,
        "cmu_not_enrolled": total_pupils - cmu_enrolled - cmu_pending,
        "vaccinations_recorded": vacc_count,
        "consultations_this_month": cons_count,
    }


@router.get("/vaccinations", response_model=List[schemas.VaccinationResponse])
def get_vaccinations(
    response: Response,
    skip: int = 0,
    limit: int = 100,
    pupil_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Vaccination).options(joinedload(models.Vaccination.pupil))
    if pupil_id:
        query = query.filter(models.Vaccination.pupil_id == pupil_id)

    total = query.count()
    response.headers["X-Total-Count"] = str(total)

    records = (
        query.order_by(models.Vaccination.administered_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    for r in records:
        if r.created_at is None:
            r.created_at = datetime.utcnow()
    return records


@router.post("/vaccinations")
def create_vaccination(
    vaccination: VaccinationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    pupil = (
        db.query(models.Pupil).filter(models.Pupil.id == vaccination.pupil_id).first()
    )
    if not pupil:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    data = vaccination.dict()
    data["administered_date"] = date.fromisoformat(data["administered_date"])
    if data["next_due_date"]:
        data["next_due_date"] = date.fromisoformat(data["next_due_date"])

    new_vacc = models.Vaccination(**data)
    db.add(new_vacc)
    db.commit()
    db.refresh(new_vacc)

    log_action(
        db,
        models.AuditActionType.EDIT_HEALTH,
        user_id=str(current_user.id),
        user_email=current_user.email,
        resource_type="vaccination",
        resource_id=str(new_vacc.id),
        ip_address=request.client.host if request and request.client else None,
        metadata={"action": "add_vaccination", "vaccine": vaccination.vaccine_name},
    )
    return new_vacc


@router.put("/vaccinations/{vaccination_id}")
def update_vaccination(
    vaccination_id: str,
    vaccination: VaccinationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    db_vacc = (
        db.query(models.Vaccination)
        .filter(models.Vaccination.id == vaccination_id)
        .first()
    )
    if not db_vacc:
        raise HTTPException(status_code=404, detail="Vaccination non trouvée")

    data = vaccination.dict()
    data["administered_date"] = date.fromisoformat(data["administered_date"])
    if data["next_due_date"]:
        data["next_due_date"] = date.fromisoformat(data["next_due_date"])

    for key, value in data.items():
        setattr(db_vacc, key, value)

    db.commit()
    return {"success": True}


@router.delete("/vaccinations/{vaccination_id}")
def delete_vaccination(
    vaccination_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    db_vacc = (
        db.query(models.Vaccination)
        .filter(models.Vaccination.id == vaccination_id)
        .first()
    )
    if not db_vacc:
        raise HTTPException(status_code=404, detail="Vaccination non trouvée")
    db.delete(db_vacc)
    db.commit()
    return {"success": True}


@router.get("/consultations", response_model=List[schemas.ConsultationResponse])
def get_consultations(
    response: Response,
    skip: int = 0,
    limit: int = 100,
    pupil_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Consultation).options(joinedload(models.Consultation.pupil))
    if pupil_id:
        query = query.filter(models.Consultation.pupil_id == pupil_id)

    total = query.count()
    response.headers["X-Total-Count"] = str(total)

    records = (
        query.order_by(models.Consultation.consultation_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    for r in records:
        if r.created_at is None:
            r.created_at = datetime.utcnow()
    return records


@router.post("/consultations")
def create_consultation(
    consultation: ConsultationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    pupil = (
        db.query(models.Pupil).filter(models.Pupil.id == consultation.pupil_id).first()
    )
    if not pupil:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    data = consultation.dict()
    data["consultation_date"] = date.fromisoformat(data["consultation_date"])
    if data["follow_up_date"]:
        data["follow_up_date"] = date.fromisoformat(data["follow_up_date"])

    new_cons = models.Consultation(**data)
    db.add(new_cons)
    db.commit()
    db.refresh(new_cons)

    log_action(
        db,
        models.AuditActionType.EDIT_HEALTH,
        user_id=str(current_user.id),
        user_email=current_user.email,
        resource_type="consultation",
        resource_id=str(new_cons.id),
        ip_address=request.client.host if request and request.client else None,
        metadata={"action": "add_consultation"},
    )
    return new_cons


@router.put("/consultations/{consultation_id}")
def update_consultation(
    consultation_id: str,
    consultation: ConsultationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    db_cons = (
        db.query(models.Consultation)
        .filter(models.Consultation.id == consultation_id)
        .first()
    )
    if not db_cons:
        raise HTTPException(status_code=404, detail="Consultation non trouvée")

    data = consultation.dict()
    data["consultation_date"] = date.fromisoformat(data["consultation_date"])
    if data["follow_up_date"]:
        data["follow_up_date"] = date.fromisoformat(data["follow_up_date"])

    for key, value in data.items():
        setattr(db_cons, key, value)

    db.commit()
    return {"success": True}


@router.delete("/consultations/{consultation_id}")
def delete_consultation(
    consultation_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    db_cons = (
        db.query(models.Consultation)
        .filter(models.Consultation.id == consultation_id)
        .first()
    )
    if not db_cons:
        raise HTTPException(status_code=404, detail="Consultation non trouvée")
    db.delete(db_cons)
    db.commit()
    return {"success": True}
