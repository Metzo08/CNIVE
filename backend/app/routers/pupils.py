from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func, text
from typing import List, Optional
from database import get_db
from app.models import models
from app.schemas import schemas
from app.utils.auth import get_current_user
from app.routers.audit import log_action
from app.utils.scoping import apply_pupil_scope, verify_pupil_access
import uuid

router = APIRouter(prefix="/pupils", tags=["Pupils"])


def generate_unique_cnive_id(db: Session, year: int = 2026) -> str:
    """
    Génère un identifiant CNIVE unique au format CNIVE-2026-XXXXXX.
    Supporte plus de 100 000 élèves sans risque de collision ni de saturation.
    """
    try:
        res = db.execute(text("SELECT nextval('cnive_id_seq')")).scalar()
        return f"CNIVE-{year}-{str(res).zfill(6)}"
    except Exception:
        db.rollback()
        count = db.query(models.Pupil).count()
        candidate = f"CNIVE-{year}-{str(count + 1).zfill(6)}"
        while db.query(models.Pupil).filter(models.Pupil.cnive_id == candidate).first():
            count += 1
            candidate = f"CNIVE-{year}-{str(count + 1).zfill(6)}"
        return candidate


@router.post("/", response_model=schemas.PupilResponse)
def create_pupil(
    pupil: schemas.PupilCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    pupil_data = pupil.dict()
    if current_user.role == models.UserRole.SCHOOL_DIRECTOR:
        if not current_user.school_id:
            raise HTTPException(
                status_code=403,
                detail="Aucun établissement scolaire n'est associé à votre compte directeur.",
            )
        pupil_data["school_id"] = current_user.school_id
    elif current_user.role == models.UserRole.TEACHER:
        if not current_user.school_id:
            raise HTTPException(
                status_code=403,
                detail="Aucun établissement scolaire n'est associé à votre compte enseignant.",
            )
        pupil_data["school_id"] = current_user.school_id
        if getattr(current_user, "grade", None):
            pupil_data["grade"] = current_user.grade

    cnive_id = generate_unique_cnive_id(db)
    new_pupil = models.Pupil(**pupil_data, cnive_id=cnive_id)
    db.add(new_pupil)
    db.commit()
    db.refresh(new_pupil)

    # Audit log
    log_action(
        db,
        models.AuditActionType.CREATE_PUPIL,
        user_id=str(current_user.id),
        user_email=current_user.email,
        resource_type="pupil",
        resource_id=str(new_pupil.id),
        ip_address=request.client.host if request and request.client else None,
    )

    return new_pupil


@router.get("/", response_model=List[schemas.PupilResponse])
def get_pupils(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None,
    school_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    # Audit log
    log_action(
        db,
        models.AuditActionType.VIEW_PUPIL,
        user_id=str(current_user.id),
        user_email=current_user.email,
        ip_address=request.client.host if request and request.client else None,
        metadata={"search": search, "status": status, "school_id": str(school_id) if school_id else None, "limit": limit},
    )

    query = db.query(models.Pupil).options(joinedload(models.Pupil.school))
    query = apply_pupil_scope(query, current_user)

    if school_id:
        query = query.filter(models.Pupil.school_id == school_id)

    if status:
        status_upper = status.upper()
        valid_pupil_statuses = [s.value for s in models.PupilStatus]

        if status_upper in valid_pupil_statuses:
            query = query.filter(models.Pupil.status == status_upper)
        else:
            latest_assessment_subquery = (
                db.query(
                    models.VulnerabilityAssessment.pupil_id,
                    func.max(models.VulnerabilityAssessment.created_at).label(
                        "max_date"
                    ),
                )
                .group_by(models.VulnerabilityAssessment.pupil_id)
                .subquery()
            )

            query = (
                query.join(
                    models.VulnerabilityAssessment,
                    models.Pupil.id == models.VulnerabilityAssessment.pupil_id,
                )
                .join(
                    latest_assessment_subquery,
                    (
                        models.VulnerabilityAssessment.pupil_id
                        == latest_assessment_subquery.c.pupil_id
                    )
                    & (
                        models.VulnerabilityAssessment.created_at
                        == latest_assessment_subquery.c.max_date
                    ),
                )
                .filter(models.VulnerabilityAssessment.classification == status_upper)
            )

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                models.Pupil.first_name.ilike(search_term),
                models.Pupil.last_name.ilike(search_term),
                models.Pupil.cnive_id.ilike(search_term),
            )
        )
    return (
        query.order_by(models.Pupil.created_at.desc()).offset(skip).limit(limit).all()
    )


@router.get("/count")
def get_pupils_count(
    status: Optional[str] = None,
    search: Optional[str] = None,
    school_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    query = db.query(models.Pupil)
    query = apply_pupil_scope(query, current_user)

    if school_id:
        query = query.filter(models.Pupil.school_id == school_id)

    if status:
        status_upper = status.upper()
        if status_upper in ["ACTIVE", "TRANSFERRED", "DROPOUT"]:
            query = query.filter(models.Pupil.status == status_upper)
        else:
            latest_assessment_subquery = (
                db.query(
                    models.VulnerabilityAssessment.pupil_id,
                    func.max(models.VulnerabilityAssessment.created_at).label(
                        "max_date"
                    ),
                )
                .group_by(models.VulnerabilityAssessment.pupil_id)
                .subquery()
            )

            query = (
                query.join(
                    models.VulnerabilityAssessment,
                    models.Pupil.id == models.VulnerabilityAssessment.pupil_id,
                )
                .join(
                    latest_assessment_subquery,
                    (
                        models.VulnerabilityAssessment.pupil_id
                        == latest_assessment_subquery.c.pupil_id
                    )
                    & (
                        models.VulnerabilityAssessment.created_at
                        == latest_assessment_subquery.c.max_date
                    ),
                )
                .filter(models.VulnerabilityAssessment.classification == status_upper)
            )

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                models.Pupil.first_name.ilike(search_term),
                models.Pupil.last_name.ilike(search_term),
                models.Pupil.cnive_id.ilike(search_term),
            )
        )

    count = query.count()
    return {"count": count}


@router.get("/{pupil_id}", response_model=schemas.PupilResponse)
def get_pupil(
    pupil_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    pupil = db.query(models.Pupil).filter(models.Pupil.id == pupil_id).first()
    if not pupil:
        raise HTTPException(status_code=404, detail="Pupil not found")
    verify_pupil_access(pupil, current_user)

    # Audit log
    log_action(
        db,
        models.AuditActionType.VIEW_PUPIL,
        user_id=str(current_user.id),
        user_email=current_user.email,
        resource_type="pupil",
        resource_id=str(pupil_id),
        ip_address=request.client.host if request and request.client else None,
    )

    return pupil


@router.put("/{pupil_id}", response_model=schemas.PupilResponse)
def update_pupil(
    pupil_id: uuid.UUID,
    pupil_update: schemas.PupilCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    pupil = db.query(models.Pupil).filter(models.Pupil.id == pupil_id).first()
    if not pupil:
        raise HTTPException(status_code=404, detail="Pupil not found")
    verify_pupil_access(pupil, current_user)
    verify_pupil_access(pupil, current_user)

    for key, value in pupil_update.dict().items():
        if hasattr(pupil, key) and value is not None:
            setattr(pupil, key, value)

    db.commit()
    db.refresh(pupil)

    # Audit log
    log_action(
        db,
        models.AuditActionType.EDIT_PUPIL,
        user_id=str(current_user.id),
        user_email=current_user.email,
        resource_type="pupil",
        resource_id=str(pupil_id),
        ip_address=request.client.host if request and request.client else None,
    )

    return pupil


@router.patch("/{pupil_id}/photo")
def update_pupil_photo(
    pupil_id: uuid.UUID,
    photo_data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    pupil = db.query(models.Pupil).filter(models.Pupil.id == pupil_id).first()
    if not pupil:
        raise HTTPException(status_code=404, detail="Pupil not found")
    verify_pupil_access(pupil, current_user)
    verify_pupil_access(pupil, current_user)

    pupil.photo_url = photo_data.get("photo_url")
    db.commit()

    # Audit log
    log_action(
        db,
        models.AuditActionType.EDIT_PUPIL,
        user_id=str(current_user.id),
        user_email=current_user.email,
        resource_type="pupil",
        resource_id=str(pupil_id),
        ip_address=request.client.host if request and request.client else None,
        metadata={"action": "update_photo"},
    )

    return {"success": True, "photo_url": pupil.photo_url}


@router.post("/{pupil_id}/academic-records")
def add_academic_records(
    pupil_id: uuid.UUID,
    records: schemas.AcademicRecordList,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    pupil = db.query(models.Pupil).filter(models.Pupil.id == pupil_id).first()
    if not pupil:
        raise HTTPException(status_code=404, detail="Pupil not found")
    verify_pupil_access(pupil, current_user)
    verify_pupil_access(pupil, current_user)

    for r in records.records:
        new_record = models.AcademicRecord(
            pupil_id=pupil_id,
            subject=r.subject,
            score=r.score,
            base_score=r.base_score,
            term=r.term,
        )
        db.add(new_record)

    db.commit()
    return {"success": True}


@router.post("/{pupil_id}/anonymize")
def anonymize_pupil(
    pupil_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    """Archivage RGPD : Anonymise les PII de l'élève"""
    if current_user.role not in [
        models.UserRole.GTE_ADMIN,
        models.UserRole.SCHOOL_DIRECTOR,
    ]:
        raise HTTPException(
            status_code=403, detail="Non autorisé à anonymiser un élève"
        )

    pupil = db.query(models.Pupil).filter(models.Pupil.id == pupil_id).first()
    if not pupil:
        raise HTTPException(status_code=404, detail="Élève non trouvé")
    verify_pupil_access(pupil, current_user)

    pupil.first_name = "Anonyme"
    pupil.last_name = "Anonyme"
    pupil.national_id = f"ARCHIVED-{pupil_id[:8]}"
    pupil.address = "[ARCHIVÉ]"
    pupil.contact_parent1_name = "[ARCHIVÉ]"
    pupil.contact_parent1_phone = "[ARCHIVÉ]"
    pupil.contact_parent2_name = "[ARCHIVÉ]"
    pupil.contact_parent2_phone = "[ARCHIVÉ]"
    pupil.photo_url = None
    pupil.status = models.PupilStatus.DROPOUT

    db.commit()

    # Audit log
    log_action(
        db,
        models.AuditActionType.DELETE_PUPIL,
        user_id=str(current_user.id),
        user_email=current_user.email,
        resource_type="pupil",
        resource_id=pupil_id,
        ip_address=request.client.host if request and request.client else None,
        metadata={"action": "anonymize_rgpd"},
    )

    return {"success": True, "message": "Dossier élève anonymisé avec succès"}
