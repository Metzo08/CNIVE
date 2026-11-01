from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from app.models import models
import uuid
from datetime import datetime, timedelta
import json
from app.utils.auth import get_current_user, require_admin

router = APIRouter(prefix="/audit", tags=["Audit"])


class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str]
    user_email: Optional[str]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    metadata: Optional[str]
    timestamp: str


def log_action(
    db: Session,
    action: models.AuditActionType,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    metadata: Optional[dict] = None,
):
    """Helper function to create audit log entries"""
    log_entry = models.AuditLog(
        user_id=uuid.UUID(user_id) if user_id else None,
        user_email=user_email,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        extra_data=json.dumps(metadata) if metadata else None,
    )
    db.add(log_entry)
    db.commit()
    return log_entry


class PaginatedAuditLogs(BaseModel):
    total: int
    skip: int
    limit: int
    logs: List[AuditLogResponse]


@router.get("/", response_model=PaginatedAuditLogs)
def get_audit_logs(
    action: Optional[str] = None,
    user_email: Optional[str] = None,
    resource_type: Optional[str] = None,
    days: int = 30,
    skip: int = 0,
    limit: int = 25,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
    request: Request = None,
):
    """Get audit logs with filters and pagination (Admin only)"""
    # Audit log
    log_action(
        db,
        models.AuditActionType.VIEW_AUDIT_LOG,
        user_id=str(admin.id),
        user_email=admin.email,
        ip_address=request.client.host if request and request.client else None,
    )
    query = db.query(models.AuditLog)

    # Apply filters
    if action:
        try:
            action_enum = models.AuditActionType(action)
            query = query.filter(models.AuditLog.action == action_enum)
        except:
            pass

    if user_email:
        query = query.filter(models.AuditLog.user_email.ilike(f"%{user_email}%"))

    if resource_type:
        query = query.filter(models.AuditLog.resource_type == resource_type)

    # Time filter
    since = datetime.utcnow() - timedelta(days=days)
    query = query.filter(models.AuditLog.timestamp >= since)

    # Get total before pagination
    total = query.count()

    # Order and paginate
    logs_data = (
        query.order_by(desc(models.AuditLog.timestamp)).offset(skip).limit(limit).all()
    )

    formatted_logs = [
        AuditLogResponse(
            id=str(log.id),
            user_id=str(log.user_id) if log.user_id else None,
            user_email=log.user_email,
            action=log.action.value if log.action else "SYSTEM",
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            metadata=log.extra_data,
            timestamp=(
                log.timestamp.isoformat()
                if log.timestamp
                else datetime.utcnow().isoformat()
            ),
        )
        for log in logs_data
    ]

    return PaginatedAuditLogs(total=total, skip=skip, limit=limit, logs=formatted_logs)


@router.get("/user/{user_id}", response_model=List[AuditLogResponse])
def get_user_audit_logs(user_id: str, limit: int = 50, db: Session = Depends(get_db)):
    """Get audit logs for a specific user"""
    logs = (
        db.query(models.AuditLog)
        .filter(models.AuditLog.user_id == uuid.UUID(user_id))
        .order_by(desc(models.AuditLog.timestamp))
        .limit(limit)
        .all()
    )

    return [
        AuditLogResponse(
            id=str(log.id),
            user_id=str(log.user_id) if log.user_id else None,
            user_email=log.user_email,
            action=log.action.value if log.action else "SYSTEM",
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            metadata=log.extra_data,
            timestamp=(
                log.timestamp.isoformat()
                if log.timestamp
                else datetime.utcnow().isoformat()
            ),
        )
        for log in logs
    ]


@router.get("/stats")
def get_audit_stats(days: int = 7, db: Session = Depends(get_db)):
    """Get audit statistics for dashboard"""
    since = datetime.utcnow() - timedelta(days=days)
    logs = db.query(models.AuditLog).filter(models.AuditLog.timestamp >= since).all()

    # Count by action type
    action_counts = {}
    for log in logs:
        action = log.action.value if log.action else "SYSTEM"
        action_counts[action] = action_counts.get(action, 0) + 1

    # Group by day
    daily_counts = {}
    for log in logs:
        day = log.timestamp.strftime("%Y-%m-%d") if log.timestamp else "unknown"
        daily_counts[day] = daily_counts.get(day, 0) + 1

    return {
        "total_logs": len(logs),
        "period_days": days,
        "by_action": action_counts,
        "by_day": daily_counts,
        "logins": action_counts.get("LOGIN", 0),
        "failed_logins": action_counts.get("LOGIN_FAILED", 0),
        "data_access": action_counts.get("VIEW_PUPIL", 0)
        + action_counts.get("VIEW_HEALTH", 0),
        "modifications": action_counts.get("EDIT_PUPIL", 0)
        + action_counts.get("CREATE_PUPIL", 0),
    }


@router.get("/actions")
def get_available_actions():
    """Get list of auditable action types"""
    return {
        "actions": [
            {"id": a.value, "label": a.value.replace("_", " ").title()}
            for a in models.AuditActionType
        ]
    }
