import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from qrcode.image.styles.colormasks import SolidFillColorMask
from io import BytesIO
import base64
import os
from PIL import Image
import uuid
from datetime import datetime, timedelta

# QR Code base URL
QR_BASE_URL = os.getenv("QR_BASE_URL", "http://localhost:8001/q/")


def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))


def generate_qr_with_logo(
    data: str,
    logo_base64: str = None,
    qr_color: str = "#000000",
    bg_color: str = "#ffffff",
    size: int = 300,
) -> dict:
    """Generate a styled QR code with optional logo"""

    # Create QR code with high error correction for logo embedding
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)

    # Convert colors
    fg_rgb = hex_to_rgb(qr_color)
    bg_rgb = hex_to_rgb(bg_color)

    # Create styled image
    img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(),
        color_mask=SolidFillColorMask(back_color=bg_rgb, front_color=fg_rgb),
    )

    # Convert to PIL Image for manipulation
    qr_img = img.convert("RGBA")

    # Add logo if provided
    if logo_base64:
        try:
            # Decode base64 logo
            logo_data = logo_base64.split(",")[1] if "," in logo_base64 else logo_base64
            logo_bytes = base64.b64decode(logo_data)
            logo = Image.open(BytesIO(logo_bytes)).convert("RGBA")

            # Resize logo (max 30% of QR size)
            qr_width, qr_height = qr_img.size
            max_logo_size = int(qr_width * 0.3)
            logo.thumbnail((max_logo_size, max_logo_size), Image.Resampling.LANCZOS)

            # Calculate center position
            logo_pos = ((qr_width - logo.size[0]) // 2, (qr_height - logo.size[1]) // 2)

            # Create white background for logo
            bg = Image.new("RGBA", logo.size, (255, 255, 255, 255))
            qr_img.paste(bg, logo_pos)
            qr_img.paste(logo, logo_pos, logo)
        except Exception as e:
            print(f"Logo embedding failed: {e}")

    # Resize to requested size
    qr_img = qr_img.resize((size, size), Image.Resampling.LANCZOS)

    # Convert to base64
    buffer = BytesIO()
    qr_img.save(buffer, format="PNG", quality=95)
    img_base64 = base64.b64encode(buffer.getvalue()).decode()

    return {"image_base64": img_base64, "format": "png", "size": size}


def generate_qr_url(pupil_id: str, cnive_id: str) -> str:
    """Generate the URL that the QR code points to"""
    return f"{QR_BASE_URL}{cnive_id}"


def generate_tracking_qr(
    pupil_id: str,
    cnive_id: str,
    logo_base64: str = None,
    qr_color: str = "#000000",
    bg_color: str = "#ffffff",
) -> dict:
    """Generate a trackable QR code for a pupil"""

    # Generate unique tracking ID
    tracking_id = str(uuid.uuid4())[:8]

    # Create trackable URL
    qr_url = f"{QR_BASE_URL}{cnive_id}?t={tracking_id}"

    # Generate QR image
    qr_data = generate_qr_with_logo(
        data=qr_url, logo_base64=logo_base64, qr_color=qr_color, bg_color=bg_color
    )

    return {
        "qr_url": qr_url,
        "qr_image_base64": qr_data["image_base64"],
        "tracking_id": tracking_id,
        "cnive_id": cnive_id,
        "pupil_id": pupil_id,
    }


def generate_referral_qr(
    pupil_id: str, cnive_id: str, referral_type: str, validity_hours: int = 24
) -> dict:
    """Generate a temporary QR code for referrals with expiration"""

    # Create token
    token = str(uuid.uuid4())
    expiry = datetime.utcnow() + timedelta(hours=validity_hours)

    # Referral URL
    referral_url = f"{QR_BASE_URL}ref/{token}"

    # Generate QR
    qr_data = generate_qr_with_logo(
        data=referral_url, qr_color="#ef4444", bg_color="#ffffff"  # Red for urgency
    )

    return {
        "referral_url": referral_url,
        "qr_image_base64": qr_data["image_base64"],
        "token": token,
        "expires_at": expiry.isoformat(),
        "referral_type": referral_type,
    }


def generate_nfc_payload(pupil_id: str, cnive_id: str) -> dict:
    """Generate NFC NDEF payload for card encoding"""

    url = f"{QR_BASE_URL}{cnive_id}"

    # NDEF URI Record (Type: 'U')
    # Prefix 0x04 = https://
    uri_prefix = 0x04
    uri_without_prefix = url.replace("https://", "")

    return {
        "ndef_type": "URI",
        "uri": url,
        "payload_hex": uri_without_prefix.encode().hex(),
        "uri_prefix": uri_prefix,
    }
