from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from database import get_db
from app.models import models
from app.utils.qr_service import generate_tracking_qr, generate_referral_qr
from app.utils.auth import get_current_user, decode_access_token
from app.utils.limiter import limiter
from sqlalchemy import func, desc
import uuid
import os
from datetime import datetime, timedelta

router = APIRouter(prefix="/cards", tags=["Cards"])

@router.get("/")
def list_cards(skip: int = 0, limit: int = 25, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """List all generated QR/NFC cards with pagination"""
    total = db.query(models.Card).count()
    cards = db.query(models.Card).offset(skip).limit(limit).all()
    
    base_url = os.getenv("QR_BASE_URL", "https://cnive.senecarte.sn/q/")
    
    results = []
    for card in cards:
        # Auto-migration: generate token if missing
        if not card.qr_token:
            card.qr_token = str(uuid.uuid4())[:8]
            db.commit()
            db.refresh(card)

        pupil = db.query(models.Pupil).filter(models.Pupil.id == card.pupil_id).first()
        results.append({
            "id": str(card.id),
            "pupil_id": str(card.pupil_id),
            "pupil_name": f"{pupil.first_name} {pupil.last_name}" if pupil else "Élève inconnu",
            "cnive_id": pupil.cnive_id if pupil else "N/A",
            "qr_url": f"{base_url}{card.qr_token}",
            "status": card.status.value if card.status else "PENDING",
            "created_at": card.created_at.isoformat() if card.created_at else None
        })
    return {"total": total, "cards": results}

class CardGenerateRequest(BaseModel):
    pupil_id: str
    logo: Optional[str] = None
    qr_color: Optional[str] = "#000000"
    bg_color: Optional[str] = "#ffffff"

class ReferralQRRequest(BaseModel):
    pupil_id: str
    referral_type: str  # health, social, education
    validity_hours: int = 24

class CardResponse(BaseModel):
    id: str
    pupil_id: str
    cnive_id: str
    pupil_name: str
    qr_url: str
    qr_image_base64: str
    status: str
    tracking_id: str = None

class ScanRequest(BaseModel):
    scanner_id: Optional[str] = None
    scanner_role: str = "guest"
    scan_type: str = "qr"
    lat: Optional[float] = None
    lon: Optional[float] = None
    location_name: Optional[str] = None
    device_info: Optional[str] = None

@router.post("/generate", response_model=CardResponse)
def generate_card(request: CardGenerateRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Generate a new QR/NFC card with optional logo"""
    
    # Find pupil
    pupil = db.query(models.Pupil).filter(models.Pupil.id == request.pupil_id).first()
    if not pupil:
        raise HTTPException(status_code=404, detail="Élève non trouvé")
    
    # Generate QR with tracking
    qr_data = generate_tracking_qr(
        pupil_id=str(pupil.id),
        cnive_id=pupil.cnive_id,
        logo_base64=request.logo,
        qr_color=request.qr_color,
        bg_color=request.bg_color
    )
    
    # Check if card exists
    existing_card = db.query(models.Card).filter(models.Card.pupil_id == pupil.id).first()
    
    if existing_card:
        # Update existing card
        existing_card.qr_token = qr_data["tracking_id"]
        existing_card.updated_at = datetime.utcnow()
        db.commit()
        card = existing_card
    else:
        # Create new card
        card = models.Card(
            id=uuid.uuid4(),
            pupil_id=pupil.id,
            qr_token=qr_data["tracking_id"],
            nfc_uid=str(uuid.uuid4())[:16].upper(),
            status="ACTIVE",
            created_at=datetime.utcnow()
        )
        db.add(card)
        db.commit()
        db.refresh(card)
    
    return CardResponse(
        id=str(card.id),
        pupil_id=str(pupil.id),
        cnive_id=pupil.cnive_id,
        pupil_name=f"{pupil.first_name} {pupil.last_name}",
        qr_url=qr_data["qr_url"],
        qr_image_base64=qr_data["qr_image_base64"],
        status=card.status,
        tracking_id=qr_data.get("tracking_id")
    )

@router.post("/referral-qr")
def generate_referral_qr_code(request: ReferralQRRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Generate a temporary QR code for urgent referrals"""
    
    pupil = db.query(models.Pupil).filter(models.Pupil.id == request.pupil_id).first()
    if not pupil:
        raise HTTPException(status_code=404, detail="Élève non trouvé")
    
    qr_data = generate_referral_qr(
        pupil_id=str(pupil.id),
        cnive_id=pupil.cnive_id,
        referral_type=request.referral_type,
        validity_hours=request.validity_hours
    )
    
    return {
        **qr_data,
        "pupil_name": f"{pupil.first_name} {pupil.last_name}"
    }

@router.get("/qr/{pupil_id}")
def get_pupil_qr(pupil_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Get existing QR code for a pupil"""
    
    pupil = db.query(models.Pupil).filter(models.Pupil.id == pupil_id).first()
    if not pupil:
        raise HTTPException(status_code=404, detail="Élève non trouvé")
    
    card = db.query(models.Card).filter(models.Card.pupil_id == pupil.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Aucune carte trouvée pour cet élève")
    
    # Regenerate QR image
    qr_data = generate_tracking_qr(str(pupil.id), pupil.cnive_id)
    
    return {
        "card_id": str(card.id),
        "pupil_name": f"{pupil.first_name} {pupil.last_name}",
        "cnive_id": pupil.cnive_id,
        "qr_url": card.qr_code_url,
        "qr_image_base64": qr_data["qr_image_base64"],
        "status": card.status
    }

@router.get("/stats")
def get_card_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Get card statistics"""
    
    total = db.query(models.Card).count()
    active = db.query(models.Card).filter(models.Card.status == models.CardStatus.ACTIVE).count()
    lost = db.query(models.Card).filter(models.Card.status == models.CardStatus.LOST).count()
    pending = db.query(models.Card).filter(models.Card.status == models.CardStatus.PENDING).count()
    
    return {
        "total_cards": total,
        "active": active,
        "lost": lost,
        "pending": pending,
        "deactivated": 0
    }

@router.post("/{card_id}/deactivate")
def deactivate_card(card_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Deactivate a card (lost/stolen)"""
    
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Carte non trouvée")
    
    card.status = "DEACTIVATED"
    card.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Carte désactivée avec succès", "card_id": card_id}

@router.post("/{card_id}/report-lost")
def report_lost_card(card_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Report a card as lost"""
    
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Carte non trouvée")
    
    card.status = "LOST"
    card.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Carte signalée comme perdue", "card_id": card_id}

# Track QR scans
@router.post("/scan/{tracking_id}")
def track_qr_scan(tracking_id: str, request: ScanRequest, db: Session = Depends(get_db)):
    """Track a QR code scan with rich metadata"""
    
    # Find card by tracking_id (qr_token)
    card = db.query(models.Card).filter(models.Card.qr_token == tracking_id).first()
    if not card:
        # Fallback for old/legacy scans
        return {"success": False, "message": "Card not found"}
        
    # Create scan log
    scan_log = models.CardScanLog(
        id=uuid.uuid4(),
        card_id=card.id,
        scanner_id=uuid.UUID(request.scanner_id) if request.scanner_id else None,
        scanner_role=request.scanner_role,
        scan_type=request.scan_type,
        location_lat=request.lat,
        location_lon=request.lon,
        location_name=request.location_name,
        device_info=request.device_info,
        timestamp=datetime.utcnow()
    )
    
    db.add(scan_log)
    db.commit()
    
    return {
        "success": True,
        "tracking_id": tracking_id,
        "timestamp": scan_log.timestamp.isoformat()
    }

@router.get("/q/{tracking_id}")
def handle_qr_scan(request: Request, tracking_id: str, db: Session = Depends(get_db)):
    """Handle GET request from a mobile phone scan and redirect to frontend"""
    card = db.query(models.Card).filter(models.Card.qr_token == tracking_id).first()
    if not card:
        return RedirectResponse(url=os.getenv("FRONTEND_URL", "http://localhost:5173") + "/404")
    
    # Capture User-Agent and client IP for richer tracking
    user_agent = request.headers.get("User-Agent", "")[:255]
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    
    # Log the scan as a 'guest' if it's just a browser scan
    scan_log = models.CardScanLog(
        id=uuid.uuid4(),
        card_id=card.id,
        scanner_role="guest",
        scan_type="qr_web",
        device_info=user_agent,
        location_name=f"IP: {client_ip}",
        timestamp=datetime.utcnow()
    )
    db.add(scan_log)
    db.commit()
    
    # Redirect to the frontend pupil profile/card view (Pass Digital)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(url=f"{frontend_url}/scan/{card.pupil_id}")


class PublicScanTrackingRequest(BaseModel):
    pupil_id: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    location_name: Optional[str] = None
    scanner_role: Optional[str] = "guest"
    device_info: Optional[str] = None


@router.post("/track-public-scan")
@limiter.limit("30/minute")
def track_public_scan(request: Request, body: PublicScanTrackingRequest, db: Session = Depends(get_db)):
    """Public endpoint: tracks a QR code scan with GPS coordinates from the mobile browser.
    Called automatically from PublicPupilProfile page after the user grants GPS permission.
    No authentication required (public emergency access).
    """
    try:
        pupil_id = uuid.UUID(body.pupil_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID élève invalide")
    
    pupil = db.query(models.Pupil).filter(models.Pupil.id == pupil_id).first()
    if not pupil:
        raise HTTPException(status_code=404, detail="Élève non trouvé")
    
    card = db.query(models.Card).filter(models.Card.pupil_id == pupil_id).first()
    if not card:
        # No card yet — still log as a generic event
        return {"success": False, "message": "Aucune carte trouvée pour cet élève"}
    
    # Capture user agent from request header if not provided
    device_info = body.device_info or request.headers.get("User-Agent", "")[:255]
    
    # Determine location name from coordinates if not provided
    location_name = body.location_name
    if not location_name and body.lat and body.lon:
        location_name = f"{body.lat:.4f}, {body.lon:.4f}"
    
    scan_log = models.CardScanLog(
        id=uuid.uuid4(),
        card_id=card.id,
        scanner_role=body.scanner_role or "guest",
        scan_type="qr_gps",
        location_lat=body.lat,
        location_lon=body.lon,
        location_name=location_name,
        device_info=device_info,
        timestamp=datetime.utcnow()
    )
    db.add(scan_log)
    db.commit()
    
    return {
        "success": True,
        "message": "Scan enregistré avec localisation GPS",
        "timestamp": scan_log.timestamp.isoformat(),
        "location": {"lat": body.lat, "lon": body.lon} if body.lat else None
    }

@router.get("/scan-data/{pupil_id}")
@limiter.limit("20/minute")
def get_scan_data(request: Request, pupil_id: uuid.UUID, db: Session = Depends(get_db)):
    """Endpoint public pour les urgences médicales via scan QR.
    
    Données exposées :
    - Sans authentification : données d'urgence minimales (nom masqué, groupe sanguin, allergies, école)
    - Avec token valide  : données complètes (nom complet, téléphone tuteur, dossier santé complet)
    
    ⚠️  NE JAMAIS exposer : vulnérabilité, adresse complète, n° national, conditions chroniques en public.
    """
    pupil = db.query(models.Pupil).filter(models.Pupil.id == pupil_id).first()
    if not pupil:
        raise HTTPException(status_code=404, detail="Élève non trouvé")
        
    health = db.query(models.HealthRecord).filter(models.HealthRecord.pupil_id == pupil_id).order_by(desc(models.HealthRecord.created_at)).first()
    school = db.query(models.School).filter(models.School.id == pupil.school_id).first()
    
    # Vérification optionnelle du token JWT
    is_authenticated = False
    authorization = request.headers.get("Authorization")
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            decode_access_token(token)
            is_authenticated = True
        except Exception:
            pass

    # ── Mode PUBLIC (scan d'urgence anonyme) ──────────────────────────────────
    # Expose le strict minimum pour les secouristes / personnels de santé
    if not is_authenticated:
        return {
            "access_level": "public_emergency",
            "pupil": {
                "id": str(pupil.id),
                "first_name": pupil.first_name,
                # Nom masqué : initiale seulement pour protéger la vie privée
                "last_name": f"{pupil.last_name[0]}." if pupil.last_name else "",
                "cnive_id": pupil.cnive_id,
                "gender": pupil.gender,
                # Date de naissance : âge seulement, pas la date exacte
                "age_years": ((__import__('datetime').date.today() - pupil.birth_date).days // 365) if pupil.birth_date else None,
                "school_name": school.name if school else "Non spécifié",
                # Téléphone tuteur : indispensable pour les urgences
                "tutor_phone": pupil.contact_parent1_phone or pupil.contact_parent2_phone or "Non renseigné",
            },
            # Santé : uniquement les informations vitales pour les premiers secours
            "health": {
                "blood_group": health.blood_group if health else "Inconnu",
                "allergies": health.allergies if health else "Aucune signalée",
                # chronic_conditions et cmu_status masqués en accès public
            } if health else None,
            # Vulnérabilité : JAMAIS exposée publiquement
            "vulnerability": None,
        }

    # ── Mode AUTHENTIFIÉ (personnel autorisé) ────────────────────────────────
    return {
        "access_level": "authenticated",
        "pupil": {
            "id": str(pupil.id),
            "first_name": pupil.first_name,
            "last_name": pupil.last_name,
            "cnive_id": pupil.cnive_id,
            "photo_url": pupil.photo_url,
            "gender": pupil.gender,
            "date_of_birth": pupil.birth_date.isoformat() if pupil.birth_date else None,
            "school_name": school.name if school else "Non spécifié",
            "tutor_phone": pupil.contact_parent1_phone or pupil.contact_parent2_phone or "Non renseigné",
            # Adresse uniquement pour le personnel authentifié
            "address": pupil.address,
        },
        "health": {
            "blood_group": health.blood_group if health else None,
            "allergies": health.allergies if health else None,
            "chronic_conditions": health.chronic_conditions if health else None,
            "cmu_status": health.cmu_status if health else None,
            "cmu_number": health.cmu_number if health else None,
        } if health else None,
        # Vulnérabilité : masquée même pour les utilisateurs authentifiés (endpoint /vulnerabilities dédié)
        "vulnerability": None,
    }


@router.get("/analytics/global")
def get_global_analytics(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Get global platform analytics for QR/NFC cards"""
    
    total_scans = db.query(models.CardScanLog).count()
    
    # Scans by role
    scans_by_role = db.query(
        models.CardScanLog.scanner_role, func.count(models.CardScanLog.id)
    ).group_by(models.CardScanLog.scanner_role).all()
    
    # Scans by day (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    scans_by_day = db.query(
        func.date(models.CardScanLog.timestamp).label('date'),
        func.count(models.CardScanLog.id).label('count')
    ).filter(models.CardScanLog.timestamp >= seven_days_ago).group_by('date').all()
    
    # Top scan locations
    top_locations = db.query(
        models.CardScanLog.location_name, func.count(models.CardScanLog.id)
    ).filter(models.CardScanLog.location_name != None).group_by(models.CardScanLog.location_name).all()

    # Device stats
    device_stats = db.query(
        models.CardScanLog.device_info, func.count(models.CardScanLog.id)
    ).group_by(models.CardScanLog.device_info).all()

    # Hourly stats
    hourly_stats = db.query(
        func.extract('hour', models.CardScanLog.timestamp).label('hour'),
        func.count(models.CardScanLog.id).label('count')
    ).group_by('hour').all()

    # Full logs for mapping
    map_logs = db.query(models.CardScanLog).order_by(desc(models.CardScanLog.timestamp)).limit(100).all()
    
    locations = []
    for log in map_logs:
        if log.location_lat and log.location_lon:
            card = db.query(models.Card).filter(models.Card.id == log.card_id).first()
            pupil = db.query(models.Pupil).filter(models.Pupil.id == card.pupil_id).first() if card else None
            locations.append({
                "lat": log.location_lat,
                "lon": log.location_lon,
                "pupil_name": f"{pupil.first_name} {pupil.last_name}" if pupil else "Inconnu",
                "role": log.scanner_role,
                "timestamp": log.timestamp.isoformat()
            })

    # Stats for retention
    total_cards = db.query(models.Card).count()
    active_cards = db.query(models.Card).filter(models.Card.status == "ACTIVE").count()

    return {
        "total_scans": total_scans,
        "total_cards": total_cards,
        "active_cards": active_cards,
        "scans_by_role": {role: count for role, count in scans_by_role},
        "scans_by_day": [{"date": str(d.date), "count": d.count} for d in scans_by_day],
        "top_locations": [{"name": loc[0], "count": loc[1]} for loc in top_locations],
        "device_stats": [{"device": d[0] if d[0] else "Inconnu", "count": d[1]} for d in device_stats],
        "hourly_stats": [{"hour": int(h[0]), "count": h[1]} for h in hourly_stats],
        "scan_locations": locations
    }

@router.get("/analytics/recent-scans")
def get_recent_scans(limit: int = 10, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Get the most recent global scans across the platform"""
    
    recent_logs = db.query(models.CardScanLog).order_by(desc(models.CardScanLog.timestamp)).limit(limit).all()
    
    results = []
    for log in recent_logs:
        card = db.query(models.Card).filter(models.Card.id == log.card_id).first()
        pupil = db.query(models.Pupil).filter(models.Pupil.id == card.pupil_id).first() if card else None
        
        results.append({
            "id": str(log.id),
            "timestamp": log.timestamp.isoformat(),
            "pupil_name": f"{pupil.first_name} {pupil.last_name}" if pupil else "Inconnu",
            "role": log.scanner_role,
            "location": log.location_name,
            "type": log.scan_type
        })
        
    return results

@router.get("/analytics/{pupil_id}")
def get_card_analytics(pupil_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Get scan analytics for a specific pupil's card"""
    
    card = db.query(models.Card).filter(models.Card.pupil_id == pupil_id).first()
    if not card:
        return {"total_scans": 0, "logs": []}
        
    logs = db.query(models.CardScanLog).filter(
        models.CardScanLog.card_id == card.id
    ).order_by(desc(models.CardScanLog.timestamp)).all()
    
    return {
        "total_scans": len(logs),
        "last_scan": logs[0].timestamp.isoformat() if logs else None,
        "logs": [
            {
                "timestamp": log.timestamp.isoformat(),
                "role": log.scanner_role,
                "location": log.location_name,
                "type": log.scan_type
            } for log in logs
        ]
    }

@router.get("/details/{card_id}")
def get_card_details(card_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Get full card details including QR image for printing"""
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Carte non trouvée")
        
    pupil = db.query(models.Pupil).filter(models.Pupil.id == card.pupil_id).first()
    school = db.query(models.School).filter(models.School.id == pupil.school_id).first() if pupil else None
    
    # Ensure card has a token (for old cards)
    if not card.qr_token:
        card.qr_token = str(uuid.uuid4())[:8]
        db.commit()
        db.refresh(card)
        
    # Generate QR with default colors
    from app.utils.qr_service import generate_qr_with_logo
    base_url = os.getenv("QR_BASE_URL", "http://localhost:8001/q/")
    qr_url = f"{base_url}{card.qr_token}"
    qr_data = generate_qr_with_logo(
        data=qr_url,
        qr_color="#000000",
        bg_color="#ffffff"
    )
    
    return {
        "id": str(card.id),
        "pupil_id": str(card.pupil_id),
        "pupil_name": f"{pupil.first_name} {pupil.last_name}" if pupil else "Élève inconnu",
        "cnive_id": pupil.cnive_id if pupil else "N/A",
        "photo_url": pupil.photo_url if pupil else None,
        "address": pupil.address if pupil else "Non renseignée",
        "tutor_phone": pupil.contact_parent1_phone or pupil.contact_parent2_phone or "Non renseigné",
        "school_name": school.name if school else "Non spécifiée",
        "qr_url": qr_url,
        "qr_image_base64": qr_data["image_base64"],
        "status": card.status.value if card.status else "ACTIVE",
        "created_at": card.created_at.isoformat() if card.created_at else None
    }
