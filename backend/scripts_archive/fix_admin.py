from database import SessionLocal
from app.models.models import User
from app.utils.auth import verify_password, get_password_hash

def check_admin():
    db = SessionLocal()
    user = db.query(User).filter(User.email == "admin@gte.sn").first()
    if not user:
        print("Admin user NOT found!")
        return
    
    print(f"Admin user found: {user.email}")
    print(f"Role: {user.role}")
    
    password = "Pass123!"
    match = verify_password(password, user.hashed_password)
    print(f"Password '{password}' matches: {match}")
    
    if not match:
        print("Resetting password to 'Pass123!'...")
        user.hashed_password = get_password_hash(password)
        db.commit()
        print("Password reset successful.")
        
    db.close()

if __name__ == "__main__":
    check_admin()
