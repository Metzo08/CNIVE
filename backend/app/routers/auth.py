from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from database import get_db
from app.models import models
from app.schemas import schemas
from app.utils import auth
from app.routers.audit import log_action
import uuid
import secrets
import base64
import hashlib
import time
from app.utils.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])


def generate_totp_secret():
    """Generate a base32 TOTP secret"""
    return base64.b32encode(secrets.token_bytes(10)).decode("utf-8").replace("=", "")


def verify_totp(secret: str, code: str) -> bool:
    """Verify TOTP code using pyotp (RFC 6238 standard)"""
    try:
        import pyotp

        totp = pyotp.TOTP(secret)
        # valid_window=1 accepte le code de la période précédente/suivante (30s) pour tolérer le délai réseau
        return totp.verify(code, valid_window=1)
    except Exception:
        return False


@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, request: Request, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        school_id=user.school_id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Audit log
    log_action(
        db,
        models.AuditActionType.SYSTEM,
        user_email=user.email,
        resource_type="user",
        resource_id=str(new_user.id),
        ip_address=request.client.host if request.client else None,
        metadata={"action": "register"},
    )

    return new_user


@router.post("/login")
@limiter.limit("10/minute")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    ip_address = request.client.host if request and request.client else None

    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        # Log failed login
        log_action(
            db,
            models.AuditActionType.LOGIN_FAILED,
            user_email=form_data.username,
            ip_address=ip_address,
            metadata={"reason": "invalid_credentials"},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if MFA is enabled
    if user.mfa_enabled:
        # Return a temporary token that requires MFA verification
        mfa_token = auth.create_access_token(
            data={"sub": user.email, "mfa_pending": True},
            expires_delta=timedelta(minutes=5),
        )
        return {
            "mfa_required": True,
            "mfa_token": mfa_token,
            "message": "Veuillez entrer votre code d'authentification",
        }

    # No MFA - issue regular token
    school_name = None
    if user.school_id:
        school_obj = (
            db.query(models.School).filter(models.School.id == user.school_id).first()
        )
        if school_obj:
            school_name = school_obj.name

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={
            "sub": user.email,
            "role": user.role.value if user.role else "USER",
            "first_name": user.first_name,
            "last_name": user.last_name,
            "school_id": str(user.school_id) if user.school_id else None,
            "school_name": school_name,
            "grade": getattr(user, "grade", None),
        },
        expires_delta=access_token_expires,
    )

    # Update last login
    user.last_login = time.strftime("%Y-%m-%d %H:%M:%S")
    db.commit()

    # Audit log
    log_action(
        db,
        models.AuditActionType.LOGIN,
        user_id=str(user.id),
        user_email=user.email,
        ip_address=ip_address,
        metadata={"mfa": False},
    )

    return {"access_token": access_token, "token_type": "bearer", "mfa_required": False}


@router.post("/mfa/verify")
def verify_mfa(
    mfa_token: str, code: str, request: Request = None, db: Session = Depends(get_db)
):
    """Verify MFA code and issue final access token"""
    try:
        payload = auth.decode_access_token(mfa_token)
        if not payload.get("mfa_pending"):
            raise HTTPException(status_code=400, detail="Token MFA invalide")

        email = payload.get("sub")
        user = db.query(models.User).filter(models.User.email == email).first()

        if not user or not user.mfa_secret:
            raise HTTPException(status_code=400, detail="Configuration MFA introuvable")

        # Verify TOTP code
        if not verify_totp(user.mfa_secret, code):
            log_action(
                db,
                models.AuditActionType.LOGIN_FAILED,
                user_id=str(user.id),
                user_email=email,
                ip_address=request.client.host if request and request.client else None,
                metadata={"reason": "invalid_mfa_code"},
            )
            raise HTTPException(status_code=401, detail="Code MFA invalide")

        # Issue full access token
        access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth.create_access_token(
            data={"sub": user.email, "role": user.role.value if user.role else "USER"},
            expires_delta=access_token_expires,
        )

        user.last_login = time.strftime("%Y-%m-%d %H:%M:%S")
        db.commit()

        # Audit log
        log_action(
            db,
            models.AuditActionType.MFA_VERIFIED,
            user_id=str(user.id),
            user_email=email,
            ip_address=request.client.host if request and request.client else None,
        )

        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/mfa/setup")
def setup_mfa(
    email: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Generate MFA secret and return setup info"""
    if current_user.email != email:
        raise HTTPException(status_code=403, detail="Action non autorisée")
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    if user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA déjà activé")

    # Generate new secret
    secret = generate_totp_secret()
    user.mfa_secret = secret
    db.commit()

    # Generate provisioning URI for QR code
    # Format: otpauth://totp/CNIVE:{email}?secret={secret}&issuer=CNIVE
    provisioning_uri = f"otpauth://totp/CNIVE:{email}?secret={secret}&issuer=CNIVE"

    return {
        "secret": secret,
        "provisioning_uri": provisioning_uri,
        "message": "Scannez ce QR code avec votre application Authenticator",
    }


@router.post("/mfa/enable")
def enable_mfa(
    email: str,
    code: str,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Enable MFA after verifying the first code"""
    if current_user.email != email:
        raise HTTPException(status_code=403, detail="Action non autorisée")
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    if not user.mfa_secret:
        raise HTTPException(status_code=400, detail="Veuillez d'abord configurer MFA")

    # Verify the code
    if not verify_totp(user.mfa_secret, code):
        raise HTTPException(status_code=401, detail="Code invalide")

    user.mfa_enabled = True
    db.commit()

    # Audit log
    log_action(
        db,
        models.AuditActionType.MFA_SETUP,
        user_id=str(user.id),
        user_email=email,
        ip_address=request.client.host if request and request.client else None,
        metadata={"action": "mfa_enabled"},
    )

    return {"success": True, "message": "Authentification à double facteur activée"}


@router.post("/mfa/disable")
def disable_mfa(
    email: str,
    password: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Disable MFA (requires password verification)"""
    if current_user.email != email:
        raise HTTPException(status_code=403, detail="Action non autorisée")
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    if not auth.verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")

    user.mfa_enabled = False
    user.mfa_secret = None
    db.commit()

    return {"success": True, "message": "MFA désactivé"}


@router.get("/mfa/status/{email}")
def get_mfa_status(
    email: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Check if MFA is enabled for a user"""
    if current_user.email != email:
        raise HTTPException(status_code=403, detail="Action non autorisée")
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    return {
        "email": email,
        "mfa_enabled": user.mfa_enabled,
        "mfa_configured": user.mfa_secret is not None,
    }
