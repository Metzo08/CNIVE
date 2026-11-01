from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from database import get_db
from app.models import models
from app.schemas import schemas
from app.utils.auth import get_current_user
from app.routers.audit import log_action
from typing import List, Optional
import uuid
from datetime import datetime

router = APIRouter(prefix="/absences", tags=["Absences"])


@router.post("/", response_model=schemas.AbsenceResponse)
def mark_absence(
    absence: schemas.AbsenceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    pupil = db.query(models.Pupil).filter(models.Pupil.id == absence.pupil_id).first()
    if not pupil:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    new_absence = models.Absence(**absence.dict())
    db.add(new_absence)
    db.commit()
    db.refresh(new_absence)

    # Audit log
    log_action(
        db,
        models.AuditActionType.MARK_ABSENCE,
        user_id=str(current_user.id),
        user_email=current_user.email,
        resource_type="pupil",
        resource_id=str(absence.pupil_id),
        ip_address=request.client.host if request.client else None,
        metadata={"absence_id": str(new_absence.id), "reason": absence.reason},
    )

    return new_absence


@router.get("/pupil/{pupil_id}", response_model=List[schemas.AbsenceResponse])
def get_pupil_absences(
    pupil_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Absence)
        .filter(models.Absence.pupil_id == pupil_id)
        .order_by(models.Absence.date.desc())
        .all()
    )


@router.delete("/{absence_id}")
def delete_absence(
    absence_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != models.UserRole.GTE_ADMIN:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")

    absence = db.query(models.Absence).filter(models.Absence.id == absence_id).first()
    if not absence:
        raise HTTPException(status_code=404, detail="Absence non trouvée")

    db.delete(absence)
    db.commit()
    return {"success": True}
