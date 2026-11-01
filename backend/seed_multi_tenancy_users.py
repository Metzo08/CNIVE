from database import SessionLocal
from app.models import models
from app.utils.auth import get_password_hash

db = SessionLocal()

schools = {s.code: s for s in db.query(models.School).all()}
print("Écoles disponibles:", list(schools.keys()))

demo_users = [
    {
        "email": "directeur.samsam@education.sn",
        "first_name": "Directeur",
        "last_name": "Sam Sam",
        "role": models.UserRole.SCHOOL_DIRECTOR,
        "school_code": "SAMSAM",
        "grade": None,
    },
    {
        "email": "directeur.ecopn@education.sn",
        "first_name": "Directeur",
        "last_name": "Diacksao Fass 2",
        "role": models.UserRole.SCHOOL_DIRECTOR,
        "school_code": "ECOPN_FASS2",
        "grade": None,
    },
    {
        "email": "directeur.eden@education.sn",
        "first_name": "Directeur",
        "last_name": "Salif Ndongo B",
        "role": models.UserRole.SCHOOL_DIRECTOR,
        "school_code": "EDEN_SALIF_B",
        "grade": None,
    },
    {
        "email": "enseignant.ce2.samsam@education.sn",
        "first_name": "Enseignant",
        "last_name": "CE2 Sam Sam",
        "role": models.UserRole.TEACHER,
        "school_code": "SAMSAM",
        "grade": "CE2",
    },
    {
        "email": "enseignant.cm1.eden@education.sn",
        "first_name": "Enseignant",
        "last_name": "CM1 Salif Ndongo",
        "role": models.UserRole.TEACHER,
        "school_code": "EDEN_SALIF_B",
        "grade": "CM1",
    },
    {
        "email": "enseignant.cp.ecopn@education.sn",
        "first_name": "Enseignant",
        "last_name": "CP Fass 2",
        "role": models.UserRole.TEACHER,
        "school_code": "ECOPN_FASS2",
        "grade": "CP",
    },
]

password_hash = get_password_hash("Passer123!")

for udata in demo_users:
    school = schools.get(udata["school_code"])
    if not school:
        print(f"Ecole non trouvée pour code {udata['school_code']}")
        continue

    user = db.query(models.User).filter(models.User.email == udata["email"]).first()
    if not user:
        user = models.User(
            email=udata["email"],
            hashed_password=password_hash,
            first_name=udata["first_name"],
            last_name=udata["last_name"],
            role=udata["role"],
            school_id=school.id,
            grade=udata["grade"],
            is_active=True,
            mfa_enabled=False,
        )
        db.add(user)
        print(f"Créé: {user.email} -> Ecole: {school.name}, Classe: {udata['grade']}")
    else:
        user.school_id = school.id
        user.grade = udata["grade"]
        user.role = udata["role"]
        user.hashed_password = password_hash
        print(f"Mis à jour: {user.email} -> Ecole: {school.name}, Classe: {udata['grade']}")

db.commit()
print("Terminé avec succès !")
db.close()
