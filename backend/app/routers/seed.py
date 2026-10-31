from fastapi import APIRouter

router = APIRouter(prefix="/seed", tags=["Seed Data"])

@router.post("/all")
def seed_all_data():
    """Obsolète. Utilisez le script racine seed_data.py"""
    return {"success": False, "message": "Ce point de terminaison est obsolète. Utilisez seed_data.py à la racine du projet."}
