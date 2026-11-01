from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from database import get_db
from app.models import models
from app.schemas import schemas
from app.utils import auth
from app.routers.audit import log_action
import uuid

router = APIRouter(prefix="/team", tags=["Team Management"])


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

from app.utils.auth import get_current_user, require_admin

# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────


@router.get("/")
def list_team_members(
    role: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
    request: Request = None,
):
    """List all team members. Admin only."""
    # Audit log
    log_action(
        db,
        models.AuditActionType.VIEW_TEAM,
        user_id=str(admin.id),
        user_email=admin.email,
        ip_address=request.client.host if request and request.client else None,
    )
    query = db.query(models.User)

    if role:
        try:
            role_enum = models.UserRole(role)
            query = query.filter(models.User.role == role_enum)
        except ValueError:
            pass  # Ignore invalid role filter

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (models.User.email.ilike(search_term))
            | (models.User.first_name.ilike(search_term))
            | (models.User.last_name.ilike(search_term))
        )

    total = query.count()
    members = (
        query.order_by(models.User.created_at.desc()).offset(skip).limit(limit).all()
    )

    return {
        "total": total,
        "members": [
            {
                "id": str(m.id),
                "email": m.email,
                "first_name": m.first_name,
                "last_name": m.last_name,
                "role": m.role.value if m.role else None,
                "school_id": str(m.school_id) if m.school_id else None,
                "is_active": m.is_active,
                "mfa_enabled": m.mfa_enabled,
                "last_login": m.last_login.isoformat() if m.last_login else None,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in members
        ],
    }


@router.get("/stats")
def team_stats(
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
    request: Request = None,
):
    """Get team statistics by role."""
    # Audit log
    log_action(
        db,
        models.AuditActionType.VIEW_TEAM,
        user_id=str(admin.id),
        user_email=admin.email,
        ip_address=request.client.host if request and request.client else None,
        metadata={"action": "view_stats"},
    )
    total = db.query(models.User).count()
    active = db.query(models.User).filter(models.User.is_active == True).count()
    inactive = total - active
    mfa_enabled = db.query(models.User).filter(models.User.mfa_enabled == True).count()

    # Count by role
    role_counts = {}
    for role in models.UserRole:
        count = db.query(models.User).filter(models.User.role == role).count()
        role_counts[role.value] = count

    return {
        "total": total,
        "active": active,
        "inactive": inactive,
        "mfa_enabled": mfa_enabled,
        "by_role": role_counts,
    }


@router.get("/{user_id}")
def get_team_member(
    user_id: uuid.UUID,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get a specific team member's details."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Membre non trouvé")

    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role.value if user.role else None,
        "school_id": str(user.school_id) if user.school_id else None,
        "is_active": user.is_active,
        "mfa_enabled": user.mfa_enabled,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.post("/")
def create_team_member(
    member_data: schemas.UserCreate,
    request: Request,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new team member. Admin defines the password."""
    # Check duplicate email
    existing = (
        db.query(models.User).filter(models.User.email == member_data.email).first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    hashed_password = auth.get_password_hash(member_data.password)
    new_user = models.User(
        email=member_data.email,
        hashed_password=hashed_password,
        first_name=member_data.first_name,
        last_name=member_data.last_name,
        role=member_data.role,
        school_id=member_data.school_id,
        is_active=member_data.is_active if member_data.is_active is not None else True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Audit log
    log_action(
        db,
        models.AuditActionType.CREATE_TEAM,
        user_id=str(admin.id),
        user_email=admin.email,
        resource_type="user",
        resource_id=str(new_user.id),
        ip_address=request.client.host if request.client else None,
        metadata={"action": "create_team_member", "new_role": member_data.role.value},
    )

    return {
        "id": str(new_user.id),
        "email": new_user.email,
        "first_name": new_user.first_name,
        "last_name": new_user.last_name,
        "role": new_user.role.value,
        "is_active": new_user.is_active,
        "message": "Membre créé avec succès",
    }


@router.put("/{user_id}")
def update_team_member(
    user_id: uuid.UUID,
    update_data: dict,
    request: Request,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a team member's role, school, or status."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Membre non trouvé")

    # Update allowed fields
    if "first_name" in update_data:
        user.first_name = update_data["first_name"]
    if "last_name" in update_data:
        user.last_name = update_data["last_name"]
    if "role" in update_data:
        try:
            user.role = models.UserRole(update_data["role"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Rôle invalide")
    if "school_id" in update_data:
        user.school_id = update_data["school_id"] if update_data["school_id"] else None
    if "is_active" in update_data:
        user.is_active = update_data["is_active"]
    if "password" in update_data and update_data["password"]:
        user.hashed_password = auth.get_password_hash(update_data["password"])

    db.commit()
    db.refresh(user)

    # Audit log
    log_action(
        db,
        models.AuditActionType.EDIT_TEAM,
        user_id=str(admin.id),
        user_email=admin.email,
        resource_type="user",
        resource_id=str(user.id),
        ip_address=request.client.host if request.client else None,
        metadata={"action": "update_team_member", "fields": list(update_data.keys())},
    )

    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role.value,
        "is_active": user.is_active,
        "message": "Membre mis à jour avec succès",
    }


@router.delete("/{user_id}")
def deactivate_team_member(
    user_id: uuid.UUID,
    request: Request,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Soft-delete: deactivate a team member."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Membre non trouvé")

    # Prevent self-deactivation
    if user.id == admin.id:
        raise HTTPException(
            status_code=400, detail="Vous ne pouvez pas désactiver votre propre compte"
        )

    user.is_active = False
    db.commit()

    # Audit log
    log_action(
        db,
        models.AuditActionType.DELETE_TEAM,
        user_id=str(admin.id),
        user_email=admin.email,
        resource_type="user",
        resource_id=str(user.id),
        ip_address=request.client.host if request.client else None,
        metadata={"action": "deactivate_team_member"},
    )

    return {"message": "Membre désactivé avec succès", "id": str(user.id)}
