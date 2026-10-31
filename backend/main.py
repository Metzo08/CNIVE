from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn
import os
import uuid
from datetime import datetime

from app.routers import auth, pupils, vulnerabilities, schools, cards, alerts, interventions, reports, ai, health, uploads, audit, team, absences
from database import engine, Base, get_db
from app.models import models
from app.utils.limiter import limiter

app = FastAPI(
    title="CNIVE API", 
    version="2.3.0", 
    description="Cartographie Numérique Intégrée des Vulnérabilités de l'Enfant - Sénégal",
    # Sécurité Production : Désactiver la documentation publique
    # Pour réactiver (développement), commenter les 3 lignes suivantes
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

# Rate limiter setup
app.state.limiter = limiter

# CORS Configuration
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
)

# Core routers
app.include_router(auth.router)
app.include_router(pupils.router)
app.include_router(schools.router)

# Vulnerability & Assessment
app.include_router(vulnerabilities.router)

# Cards & QR
app.include_router(cards.router)

# Health Records & Maternity (CDC F4.1, F4.2)
app.include_router(health.router)

# Alerts & Notifications (CDC F2.3)
app.include_router(alerts.router)

# Interventions (CDC F3.1-F3.3)
app.include_router(interventions.router)

# Reports & PDF (CDC F5.2)
app.include_router(reports.router)

# AI & Analytics (CDC F5.3)
app.include_router(ai.router)

# Audit Log (CDC Section 6.2)
app.include_router(audit.router)

# Team Management (CDC Section 6)
app.include_router(team.router)

# Absences
app.include_router(absences.router)

# File Uploads (Photos, Documents)
app.include_router(uploads.router)

# Direct QR Scan Handler (Bypasses router prefixes for shorter URLs)
@app.get("/q/{token}")
@limiter.limit("20/minute")
def handle_root_qr_scan(request: Request, token: str, db: Session = Depends(get_db)):
    """Direct root handler for QR scans from mobile phones"""
    card = db.query(models.Card).filter(models.Card.qr_token == token).first()
    if not card:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return RedirectResponse(url=f"{frontend_url}/404")
    
    # Capture User-Agent and client IP for richer tracking
    user_agent = request.headers.get("User-Agent", "")[:255]
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    
    # Log scan with device info
    scan_log = models.CardScanLog(
        id=uuid.uuid4(),
        card_id=card.id,
        scanner_role="guest",
        scan_type="qr_web_root",
        device_info=user_agent,
        location_name=f"IP: {client_ip}",
        timestamp=datetime.utcnow()
    )
    db.add(scan_log)
    db.commit()
    
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(url=f"{frontend_url}/scan/{card.pupil_id}")

@app.get("/")
async def root():
    return {
        "message": "Bienvenue sur l'API CNIVE",
        "version": "2.3.0",
        "status": "production-ready",
        "modules": [
            "auth", "pupils", "schools", "vulnerabilities", 
            "cards", "health", "alerts", "interventions", "reports", "ai", "absences"
        ],
        "endpoints": {
            "health": "/api/health",
            "docs": "/docs",
            "qr_scan": "/q/{token}"
        }
    }

@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    """Production health check — verifies DB connectivity and key metrics"""
    try:
        # Quick DB test
        pupils_count = db.query(models.Pupil).count()
        cards_count = db.query(models.Card).count()
        scans_count = db.query(models.CardScanLog).count()
        schools_count = db.query(models.School).count()
        return {
            "status": "healthy",
            "service": "CNIVE API",
            "version": "2.3.0",
            "database": "connected",
            "metrics": {
                "pupils": pupils_count,
                "cards": cards_count,
                "total_scans": scans_count,
                "schools": schools_count
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "degraded",
            "service": "CNIVE API",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
