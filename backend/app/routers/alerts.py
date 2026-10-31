from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from app.models import models
import uuid
from datetime import datetime
from enum import Enum

router = APIRouter(prefix="/alerts", tags=["Alerts"])

class AlertLevel(str, Enum):
    INFO = "info"
    WARNING = "warning" 
    URGENT = "urgent"
    CRITICAL = "critical"

class NotificationChannel(str, Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    SMS = "sms"

class AlertType(str, Enum):
    VULNERABILITY = "vulnerability"
    HEALTH = "health"
    ATTENDANCE = "attendance"
    INTERVENTION = "intervention"
    SYSTEM = "system"

class AlertCreate(BaseModel):
    pupil_id: Optional[str] = None
    school_id: Optional[str] = None
    alert_type: AlertType
    level: AlertLevel
    channel: NotificationChannel = NotificationChannel.IN_APP
    title: str
    message: str
    metadata: Optional[dict] = None

class AlertResponse(BaseModel):
    id: str
    pupil_id: Optional[str]
    school_id: Optional[str]
    alert_type: str
    level: str
    channel: str
    title: str
    message: str
    is_read: bool
    is_escalated: bool = False
    created_at: str

# In-memory storage for alerts with persistence of 'is_read' state
# Key pattern: {channel}:{type}:{pupil_id or entity_id}
alerts_registry: dict = {}

# Track whether initial sync has been done to avoid re-spamming notifications
_initial_sync_done = False
# Track which SMS/email keys have already been notified (survives across sync calls)
_notified_keys: set = set()


def send_simulated_notification(alert: dict, key: str):
    """Simulates sending a notification via Email or SMS to the correct stakeholder."""
    global _notified_keys
    if key in _notified_keys:
        return  # Already notified, skip
    _notified_keys.add(key)

    channel = alert.get("channel", "in_app")
    alert_type = alert.get("alert_type", "system")
    
    # Routing logic based on alert type
    destinataire = "Coordinateur GTE"
    if alert_type == "vulnerability":
        destinataire = "Travailleur Social de Secteur (Pikine)"
    elif alert_type == "health":
        destinataire = "Médecin Référent / PMI"
    elif alert_type == "intervention":
        destinataire = "Équipe d'Intervention Terrain"

    if channel == "email":
        print(f"📧 [SIMULATION EMAIL] To: {destinataire} | Subject: {alert['title']}")
        print(f"   └─ Message: {alert['message']}")
    elif channel == "sms":
        print(f"📱 [SIMULATION SMS] To: {destinataire} (+221 7X XXX XX XX) | {alert['title']}")


def sync_alerts_with_data(db: Session, notify: bool = True):
    """Synchronize alerts_registry with actual database.

    Args:
        notify: If True, fire simulated SMS/Email for new alerts.
                Set to False for lightweight polling (unread-count).
    """
    global _initial_sync_done, alerts_registry

    # Nettoyage automatique des alertes des élèves/entités supprimés
    try:
        existing_pupil_ids = {str(pid[0]) for pid in db.query(models.Pupil.id).all()}
        existing_interv_ids = {str(iid[0]) for iid in db.query(models.Intervention.id).all()}
        keys_to_purge = [
            k for k, a in list(alerts_registry.items())
            if (a.get("pupil_id") and str(a["pupil_id"]) not in existing_pupil_ids)
            or (a.get("alert_type") == "intervention" and len(k.split(":")) >= 3 and k.split(":")[2] not in existing_interv_ids)
        ]
        for k in keys_to_purge:
            del alerts_registry[k]
    except Exception as e:
        pass
    
    # 1. Check Critical Vulnerabilities
    criticals = db.query(models.VulnerabilityAssessment).filter(
        models.VulnerabilityAssessment.classification == models.VulnerabilityLevel.CRITICAL
    ).all()
    for v in criticals:
        # In-App Alert
        key_app = f"in_app:vulnerability:{v.pupil_id}"
        if key_app not in alerts_registry:
            pupil = db.query(models.Pupil).filter(models.Pupil.id == v.pupil_id).first()
            name = f"{pupil.first_name} {pupil.last_name}" if pupil else "Élève"
            alert = {
                "id": str(uuid.uuid4()),
                "pupil_id": str(v.pupil_id),
                "school_id": None,
                "alert_type": "vulnerability",
                "level": "critical",
                "channel": "in_app",
                "title": "🔴 Urgence: Cas critique détecté",
                "message": f"{name} a un score de vulnérabilité CRITIQUE ({int(v.total_score or 0)}/100). Une intervention immédiate est requise.",
                "is_read": False,
                "is_escalated": False,
                "created_at": v.created_at.isoformat() if v.created_at else datetime.utcnow().isoformat()
            }
            alerts_registry[key_app] = alert
            
            # Simulated SMS — only if this is a genuine new detection (not a server restart bulk-load)
            if notify and _initial_sync_done:
                key_sms = f"sms:vulnerability:{v.pupil_id}"
                if key_sms not in alerts_registry:
                    sms_alert = alert.copy()
                    sms_alert["id"] = str(uuid.uuid4())
                    sms_alert["channel"] = "sms"
                    alerts_registry[key_sms] = sms_alert
                    send_simulated_notification(sms_alert, key_sms)

    # 2. Check Health Enrollment (CMU)
    health_records = db.query(models.HealthRecord).filter(models.HealthRecord.cmu_status == "not_enrolled").all()
    for hr in health_records:
        key = f"in_app:health:{hr.pupil_id}"
        if key not in alerts_registry:
            pupil = db.query(models.Pupil).filter(models.Pupil.id == hr.pupil_id).first()
            name = f"{pupil.first_name} {pupil.last_name}" if pupil else "Élève"
            alerts_registry[key] = {
                "id": str(uuid.uuid4()),
                "pupil_id": str(hr.pupil_id),
                "school_id": None,
                "alert_type": "health",
                "level": "warning",
                "channel": "in_app",
                "title": "CMU non enrôlé",
                "message": f"{name}: Inscription CMU absente ou en retard.",
                "is_read": False,
                "is_escalated": False,
                "created_at": datetime.utcnow().isoformat()
            }

    # 3. Check Pending Urgent Interventions
    intervs = db.query(models.Intervention).filter(
        models.Intervention.status == models.InterventionStatus.PENDING,
        models.Intervention.priority.in_(["urgent", "high"])
    ).all()
    for i in intervs:
        key = f"in_app:intervention:{i.id}"
        if key not in alerts_registry:
            pupil = db.query(models.Pupil).filter(models.Pupil.id == i.pupil_id).first()
            p_name = f"{pupil.first_name} {pupil.last_name}" if pupil else ""
            alert = {
                "id": str(uuid.uuid4()),
                "pupil_id": str(i.pupil_id),
                "school_id": None,
                "alert_type": "intervention",
                "level": "urgent",
                "channel": "in_app",
                "title": "Intervention planifiée",
                "message": f"{i.title} prévue pour {p_name} (Priorité: {i.priority})",
                "is_read": False,
                "is_escalated": False,
                "created_at": i.created_at.isoformat() if i.created_at else datetime.utcnow().isoformat()
            }
            alerts_registry[key] = alert
            
            # Simulated Email — only for genuinely new interventions
            if notify and _initial_sync_done and i.priority == "urgent":
                key_email = f"email:intervention:{i.id}"
                if key_email not in alerts_registry:
                    email_alert = alert.copy()
                    email_alert["id"] = str(uuid.uuid4())
                    email_alert["channel"] = "email"
                    alerts_registry[key_email] = email_alert
                    send_simulated_notification(email_alert, key_email)
    
    # 4. Automated Escalation (48 hours) — only on full sync
    if notify:
        now = datetime.utcnow()
        for alert in alerts_registry.values():
            if not alert["is_read"] and not alert["is_escalated"]:
                try:
                    created_at = datetime.fromisoformat(alert["created_at"])
                    if (now - created_at).total_seconds() > 172800:  # 48 hours
                        alert["is_escalated"] = True
                        alert["title"] = f"⚖️ Escaladé: {alert['title']}"
                except Exception:
                    pass

    # Mark initial sync as done — subsequent new detections WILL trigger notifications
    if not _initial_sync_done:
        _initial_sync_done = True


@router.post("/", response_model=AlertResponse)
def create_alert(alert: AlertCreate, db: Session = Depends(get_db)):
    """Create a new alert/notification manually"""
    alert_id = str(uuid.uuid4())
    new_alert = {
        "id": alert_id,
        "pupil_id": alert.pupil_id,
        "school_id": alert.school_id,
        "alert_type": alert.alert_type.value,
        "level": alert.level.value,
        "channel": alert.channel.value,
        "title": alert.title,
        "message": alert.message,
        "is_read": False,
        "is_escalated": False,
        "created_at": datetime.utcnow().isoformat()
    }
    alerts_registry[f"{alert.channel.value}:manual:{alert_id}"] = new_alert
    return AlertResponse(**new_alert)


@router.get("/")
def get_alerts(unread_only: bool = False, channel: Optional[str] = None, level: Optional[str] = None, skip: int = 0, limit: int = 25, db: Session = Depends(get_db)):
    """Get alerts with pagination support and level filtering"""
    sync_alerts_with_data(db, notify=True)
    res = list(alerts_registry.values())
    
    if channel:
        res = [a for a in res if a["channel"] == channel]
    if unread_only:
        res = [a for a in res if not a["is_read"]]
    if level:
        res = [a for a in res if a["level"] == level]
        
    res.sort(key=lambda x: x["created_at"], reverse=True)
    
    total = len(res)
    paginated_alerts = res[skip : skip + limit]
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "alerts": paginated_alerts
    }


@router.get("/unread-count")
def get_unread_count(db: Session = Depends(get_db)):
    """Get count of unread alerts — lightweight, no simulated notifications"""
    sync_alerts_with_data(db, notify=False)
    unread = [a for a in alerts_registry.values() if not a["is_read"]]
    return {
        "count": len(unread),
        "critical": len([a for a in unread if a["level"] == "critical"]),
        "warning": len([a for a in unread if a["level"] == "warning"]),
        "info": len([a for a in unread if a["level"] == "info"]),
        "channels": {
            "in_app": len([a for a in unread if a["channel"] == "in_app"]),
            "email": len([a for a in unread if a["channel"] == "email"]),
            "sms": len([a for a in unread if a["channel"] == "sms"])
        }
    }


@router.post("/{alert_id}/read")
def mark_as_read(alert_id: str):
    """Mark an alert as read in registry"""
    for key, alert in alerts_registry.items():
        if alert["id"] == alert_id:
            alert["is_read"] = True
            return {"success": True}
    raise HTTPException(status_code=404, detail="Alerte non trouvée")


@router.post("/mark-all-read")
def mark_all_read(db: Session = Depends(get_db)):
    """Mark all current alerts as read"""
    sync_alerts_with_data(db, notify=False)
    for alert in alerts_registry.values():
        alert["is_read"] = True
    return {"success": True, "count": len(alerts_registry)}


@router.delete("/{alert_id}")
def delete_alert(alert_id: str):
    """Delete an alert from registry"""
    key_to_del = None
    for key, alert in alerts_registry.items():
        if alert["id"] == alert_id:
            key_to_del = key
            break
    if key_to_del:
        del alerts_registry[key_to_del]
        return {"success": True}
    return {"success": False}


# Automatic alert generation based on thresholds
@router.post("/generate-vulnerability-alerts")
def generate_vulnerability_alerts(db: Session = Depends(get_db)):
    """Scan for critical vulnerabilities and generate alerts"""
    
    critical_assessments = db.query(models.VulnerabilityAssessment).filter(
        models.VulnerabilityAssessment.classification == "CRITICAL"
    ).all()
    
    alerts_created = []
    for assessment in critical_assessments:
        pupil = db.query(models.Pupil).filter(models.Pupil.id == assessment.pupil_id).first()
        if pupil:
            alert = {
                "id": str(uuid.uuid4()),
                "pupil_id": str(pupil.id),
                "alert_type": "vulnerability",
                "level": "critical",
                "title": f"Alerte critique: {pupil.first_name} {pupil.last_name}",
                "message": f"Score de vulnérabilité: {assessment.total_score}/100 - Intervention urgente requise"
            }
            alerts_created.append(alert)
    
    return {
        "alerts_generated": len(alerts_created),
        "alerts": alerts_created
    }
