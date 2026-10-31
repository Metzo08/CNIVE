from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import os
import uuid
import shutil
from pathlib import Path
from PIL import Image
import io

router = APIRouter(prefix="/uploads", tags=["Uploads"])

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
(UPLOAD_DIR / "photos").mkdir(exist_ok=True)
(UPLOAD_DIR / "documents").mkdir(exist_ok=True)

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB (allow larger uploads then compress)

def optimize_image(image_data: bytes, max_size=(1024, 1024), quality=80) -> bytes:
    """Optimize image: resize if needed and convert to WebP for maximum compression"""
    img = Image.open(io.BytesIO(image_data))
    
    # Convert RGBA to RGB if needed (WebP supports alpha but sometimes we want to flatten)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    
    # Resize while maintaining aspect ratio
    img.thumbnail(max_size, Image.LANCZOS)
    
    # Save to buffer
    output = io.BytesIO()
    img.save(output, format="WEBP", quality=quality, method=6) # method 6 is highest compression speed/quality ratio
    return output.getvalue()

@router.post("/photo/{pupil_id}")
async def upload_pupil_photo(pupil_id: str, file: UploadFile = File(...)):
    """Upload and optimize a photo for a pupil"""
    
    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Type de fichier non autorisé. Types acceptés: {', '.join(ALLOWED_IMAGE_TYPES)}"
        )
    
    # Read file content
    content = await file.read()
    
    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400, 
            detail=f"Fichier trop volumineux. Maximum avant compression: {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    try:
        # Optimize on the fly
        optimized_content = optimize_image(content)
        
        # Save as .webp
        filename = f"{pupil_id}_{uuid.uuid4().hex[:8]}.webp"
        filepath = UPLOAD_DIR / "photos" / filename
        
        with open(filepath, "wb") as f:
            f.write(optimized_content)
        
        # Return the URL
        photo_url = f"/uploads/photos/{filename}"
        
        return {
            "success": True,
            "photo_url": photo_url,
            "filename": filename,
            "original_size": len(content),
            "optimized_size": len(optimized_content),
            "ratio": f"{round((1 - len(optimized_content)/len(content)) * 100, 1)}%"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'optimisation: {str(e)}")

@router.post("/photo/user/{user_id}")
async def upload_user_photo(user_id: str, file: UploadFile = File(...)):
    """Upload and optimize a photo for a team member (user)"""
    
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Type de fichier non autorisé")
    
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux")
    
    try:
        optimized_content = optimize_image(content, max_size=(512, 512), quality=75) # Smaller for team members
        filename = f"user_{user_id}_{uuid.uuid4().hex[:8]}.webp"
        filepath = UPLOAD_DIR / "photos" / filename
        
        with open(filepath, "wb") as f:
            f.write(optimized_content)
        
        return {
            "success": True,
            "photo_url": f"/uploads/photos/{filename}",
            "filename": filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@router.get("/photos/{filename}")
async def get_photo(filename: str):
    """Serve a photo"""
    filepath = UPLOAD_DIR / "photos" / filename
    
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Photo non trouvée")
    
    return FileResponse(filepath)

@router.delete("/photo/{filename}")
async def delete_photo(filename: str):
    """Delete a photo"""
    filepath = UPLOAD_DIR / "photos" / filename
    
    if filepath.exists():
        os.remove(filepath)
        return {"success": True, "message": "Photo supprimée"}
    
    raise HTTPException(status_code=404, detail="Photo non trouvée")

@router.post("/document")
async def upload_document(file: UploadFile = File(...), document_type: str = "other"):
    """Upload a document (PDF, images)"""
    
    allowed_types = ALLOWED_IMAGE_TYPES + ["application/pdf"]
    
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Type de fichier non autorisé"
        )
    
    content = await file.read()
    
    if len(content) > 10 * 1024 * 1024:  # 10MB for documents
        raise HTTPException(status_code=400, detail="Fichier trop volumineux. Maximum: 10MB")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "pdf"
    filename = f"{document_type}_{uuid.uuid4().hex}.{ext}"
    filepath = UPLOAD_DIR / "documents" / filename
    
    with open(filepath, "wb") as f:
        f.write(content)
    
    return {
        "success": True,
        "document_url": f"/uploads/documents/{filename}",
        "filename": filename
    }

@router.get("/documents/{filename}")
async def get_document(filename: str):
    """Serve a document"""
    filepath = UPLOAD_DIR / "documents" / filename
    
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    return FileResponse(filepath)
