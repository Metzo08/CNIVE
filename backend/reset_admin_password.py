"""
Script de reinitialisation rapide du mot de passe Administrateur CNIVE.
"""
import sys
from database import SessionLocal
from app.models.models import User, UserRole
from app.utils.auth import get_password_hash

def reset_password(email="admin@gte.sn", new_password="Pass123!"):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"[-] Utilisateur '{email}' introuvable dans la base.")
            print("[+] Creation de l'utilisateur admin...")
            user = User(
                email=email,
                hashed_password=get_password_hash(new_password),
                first_name="Amadou",
                last_name="Ndiaye",
                role=UserRole.GTE_ADMIN,
                is_active=True
            )
            db.add(user)
            db.commit()
            print(f"[OK] Compte administrateur '{email}' cree avec succes !")
        else:
            print(f"[INFO] Utilisateur trouve : {user.email} (Role: {user.role})")
            user.hashed_password = get_password_hash(new_password)
            user.is_active = True
            db.commit()
            print(f"[OK] Mot de passe reinitialise avec succes pour '{email}' !")

        print("\n==========================================")
        print("Identifiants de connexion :")
        print(f"Email        : {email}")
        print(f"Mot de passe : {new_password}")
        print("==========================================\n")
    except Exception as e:
        print(f"[-] Erreur : {e}")
    finally:
        db.close()

if __name__ == "__main__":
    pwd = sys.argv[1] if len(sys.argv) > 1 else "Pass123!"
    email = sys.argv[2] if len(sys.argv) > 2 else "admin@gte.sn"
    reset_password(email, pwd)
