from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from app.models import models
from app.utils.auth import get_current_user
from app.routers.audit import log_action
import uuid
from datetime import datetime
from enum import Enum

router = APIRouter(prefix="/interventions", tags=["Interventions"])


class InterventionType(str, Enum):
    HEALTH = "health"
    SOCIAL = "social"
    EDUCATION = "education"
    PSYCHOLOGICAL = "psychological"
    ECONOMIC = "economic"
    MIXED = "mixed"


class InterventionStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FOLLOW_UP = "follow_up"


class InterventionPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class InterventionCreate(BaseModel):
    pupil_id: str
    intervention_type: InterventionType
    title: str
    description: str
    priority: InterventionPriority = InterventionPriority.MEDIUM
    scheduled_date: Optional[str] = None
    assigned_to: Optional[str] = None
    partner_organization: Optional[str] = None


class InterventionUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    completion_date: Optional[str] = None


class InterventionResponse(BaseModel):
    id: str
    pupil_id: str
    pupil_name: str
    intervention_type: str
    title: str
    description: str
    status: str
    priority: str
    scheduled_date: Optional[str]
    assigned_to: Optional[str]
    partner_organization: Optional[str]
    created_at: str
    updated_at: str


@router.post("/", response_model=InterventionResponse)
def create_intervention(
    intervention: InterventionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    """Create a new intervention for a pupil (CDC F3.1)"""

    pupil = (
        db.query(models.Pupil).filter(models.Pupil.id == intervention.pupil_id).first()
    )
    if not pupil:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    new_intervention = models.Intervention(
        id=uuid.uuid4(),
        pupil_id=pupil.id,
        title=intervention.title,
        type=intervention.intervention_type.value,
        description=intervention.description,
        status=models.InterventionStatus.PENDING,
        priority=intervention.priority.value,
        assigned_to=(
            uuid.UUID(intervention.assigned_to) if intervention.assigned_to else None
        ),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(new_intervention)
    db.commit()
    db.refresh(new_intervention)

    log_action(
        db,
        models.AuditActionType.CREATE_INTERVENTION,
        user_id=str(current_user.id),
        user_email=current_user.email,
        resource_type="intervention",
        resource_id=str(new_intervention.id),
        ip_address=request.client.host if request and request.client else None,
        metadata={"type": intervention.intervention_type.value},
    )

    responsible_name = "Non assigné"
    if new_intervention.assigned_to:
        user = (
            db.query(models.User)
            .filter(models.User.id == new_intervention.assigned_to)
            .first()
        )
        if user:
            responsible_name = f"{user.first_name} {user.last_name}"

    return InterventionResponse(
        id=str(new_intervention.id),
        pupil_id=str(pupil.id),
        pupil_name=f"{pupil.first_name} {pupil.last_name}",
        intervention_type=new_intervention.type,
        title=new_intervention.title,
        description=new_intervention.description,
        status="planned",
        priority=new_intervention.priority,
        scheduled_date=intervention.scheduled_date,
        assigned_to=responsible_name,
        partner_organization=None,
        created_at=new_intervention.created_at.isoformat(),
        updated_at=(
            new_intervention.updated_at.isoformat()
            if new_intervention.updated_at
            else ""
        ),
    )


@router.get("/", response_model=List[InterventionResponse])
def get_interventions(
    response: Response,
    skip: int = 0,
    limit: int = 100,
    status: Optional[InterventionStatus] = None,
    priority: Optional[InterventionPriority] = None,
    pupil_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    """Get all interventions with names instead of IDs"""
    log_action(
        db,
        models.AuditActionType.VIEW_INTERVENTION,
        user_id=str(current_user.id),
        user_email=current_user.email,
        ip_address=request.client.host if request and request.client else None,
    )

    query = db.query(models.Intervention)
    if status:
        status_map = {
            "planned": models.InterventionStatus.PENDING,
            "in_progress": models.InterventionStatus.IN_PROGRESS,
            "completed": models.InterventionStatus.COMPLETED,
            "cancelled": models.InterventionStatus.CANCELLED,
        }
        query = query.filter(
            models.Intervention.status
            == status_map.get(status.value, models.InterventionStatus.PENDING)
        )
    if pupil_id:
        query = query.filter(models.Intervention.pupil_id == pupil_id)

    total = query.count()
    response.headers["X-Total-Count"] = str(total)

    interventions = (
        query.order_by(models.Intervention.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    results = []
    for i in interventions:
        pupil = db.query(models.Pupil).filter(models.Pupil.id == i.pupil_id).first()
        responsible_name = "Non assigné"
        if i.assigned_to:
            user = db.query(models.User).filter(models.User.id == i.assigned_to).first()
            if user:
                responsible_name = f"{user.first_name} {user.last_name}"

        status_val = i.status.value if hasattr(i.status, "value") else str(i.status)
        status_display = {
            "PENDING": "planned",
            "IN_PROGRESS": "in_progress",
            "COMPLETED": "completed",
            "CANCELLED": "cancelled",
        }.get(status_val, "planned")

        results.append(
            InterventionResponse(
                id=str(i.id),
                pupil_id=str(i.pupil_id),
                pupil_name=(
                    f"{pupil.first_name} {pupil.last_name}" if pupil else "Inconnu"
                ),
                intervention_type=i.type or "mixed",
                title=i.title or f"Intervention {i.type}",
                description=i.description or "",
                status=status_display,
                priority=i.priority or "medium",
                scheduled_date=i.start_date.isoformat() if i.start_date else None,
                assigned_to=responsible_name,
                partner_organization=None,
                created_at=i.created_at.isoformat() if i.created_at else "",
                updated_at=i.updated_at.isoformat() if i.updated_at else "",
            )
        )
    return results


@router.get("/stats")
def get_intervention_stats(db: Session = Depends(get_db)):
    total = db.query(models.Intervention).count()
    pending = (
        db.query(models.Intervention)
        .filter(models.Intervention.status == models.InterventionStatus.PENDING)
        .count()
    )
    in_progress = (
        db.query(models.Intervention)
        .filter(models.Intervention.status == models.InterventionStatus.IN_PROGRESS)
        .count()
    )
    completed = (
        db.query(models.Intervention)
        .filter(models.Intervention.status == models.InterventionStatus.COMPLETED)
        .count()
    )
    urgent_count = (
        db.query(models.Intervention)
        .filter(models.Intervention.priority == "urgent")
        .count()
    )
    return {
        "total": total,
        "by_status": {
            "planned": pending,
            "in_progress": in_progress,
            "completed": completed,
        },
        "urgent_pending": urgent_count,
        "completion_rate": round((completed / total * 100) if total > 0 else 0, 1),
    }


@router.get("/{intervention_id}")
def get_intervention(intervention_id: str, db: Session = Depends(get_db)):
    intervention = (
        db.query(models.Intervention)
        .filter(models.Intervention.id == intervention_id)
        .first()
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    pupil = (
        db.query(models.Pupil).filter(models.Pupil.id == intervention.pupil_id).first()
    )
    responsible_name = "Non assigné"
    if intervention.assigned_to:
        user = (
            db.query(models.User)
            .filter(models.User.id == intervention.assigned_to)
            .first()
        )
        if user:
            responsible_name = f"{user.first_name} {user.last_name}"

    status_val = (
        intervention.status.value
        if hasattr(intervention.status, "value")
        else str(intervention.status)
    )
    return {
        "id": str(intervention.id),
        "pupil_id": str(intervention.pupil_id),
        "pupil_name": f"{pupil.first_name} {pupil.last_name}" if pupil else "Inconnu",
        "title": intervention.title,
        "description": intervention.description,
        "intervention_type": intervention.type or "mixed",
        "status": {
            "PENDING": "planned",
            "IN_PROGRESS": "in_progress",
            "COMPLETED": "completed",
        }.get(status_val, "planned"),
        "assigned_to": responsible_name,
        "created_at": (
            intervention.created_at.isoformat() if intervention.created_at else None
        ),
    }


@router.patch("/{intervention_id}")
def update_intervention(
    intervention_id: str,
    update: InterventionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    intervention = (
        db.query(models.Intervention)
        .filter(models.Intervention.id == intervention_id)
        .first()
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    if update.status:
        status_map = {
            "planned": models.InterventionStatus.PENDING,
            "in_progress": models.InterventionStatus.IN_PROGRESS,
            "completed": models.InterventionStatus.COMPLETED,
            "cancelled": models.InterventionStatus.CANCELLED,
        }
        new_status = status_map.get(update.status)
        if new_status:
            intervention.status = new_status
    if update.description:
        intervention.description = update.description
    intervention.updated_at = datetime.utcnow()
    db.commit()
    log_action(
        db,
        models.AuditActionType.EDIT_INTERVENTION,
        user_id=str(current_user.id),
        user_email=current_user.email,
        resource_type="intervention",
        resource_id=intervention_id,
        ip_address=request.client.host if request and request.client else None,
        metadata={"action": "update_status", "status": update.status},
    )
    return {"success": True, "message": "Intervention mise à jour"}


@router.delete("/{intervention_id}")
def delete_intervention(
    intervention_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    intervention = (
        db.query(models.Intervention)
        .filter(models.Intervention.id == intervention_id)
        .first()
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    db.query(models.InterventionLog).filter(
        models.InterventionLog.intervention_id == intervention_id
    ).delete()
    db.delete(intervention)
    db.commit()
    log_action(
        db,
        models.AuditActionType.EDIT_INTERVENTION,
        user_id=str(current_user.id),
        user_email=current_user.email,
        resource_type="intervention",
        resource_id=intervention_id,
        ip_address=request.client.host if request and request.client else None,
        metadata={"action": "delete"},
    )
    return {"success": True, "message": "Intervention supprimée"}


@router.post("/{intervention_id}/log")
def add_intervention_log(
    intervention_id: str, log_entry: dict, db: Session = Depends(get_db)
):
    intervention = (
        db.query(models.Intervention)
        .filter(models.Intervention.id == intervention_id)
        .first()
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    new_log = models.InterventionLog(
        id=uuid.uuid4(),
        intervention_id=intervention.id,
        action_type=log_entry.get("action", "note"),
        details=log_entry.get("notes", ""),
        timestamp=datetime.utcnow(),
    )
    db.add(new_log)
    db.commit()
    return {"success": True, "message": "Note ajoutée"}


@router.get("/{intervention_id}/logs")
def get_intervention_logs(intervention_id: str, db: Session = Depends(get_db)):
    logs = (
        db.query(models.InterventionLog)
        .filter(models.InterventionLog.intervention_id == intervention_id)
        .order_by(models.InterventionLog.timestamp.desc())
        .all()
    )
    return [
        {
            "id": str(log.id),
            "action_type": log.action_type,
            "details": log.details,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
        }
        for log in logs
    ]
