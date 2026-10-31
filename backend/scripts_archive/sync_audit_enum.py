from sqlalchemy import create_engine, text
from database import engine
from app.models.models import AuditActionType

def sync_enum():
    print("Vérification des valeurs de l'énumération auditactiontype...")
    # Utiliser une connexion directe sans transaction active pour ALTER TYPE
    with engine.connect() as connection:
        # Récupérer les valeurs actuelles
        result = connection.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'auditactiontype'"))
        existing_values = [row[0] for row in result]
        
        required_values = [a.value for a in AuditActionType]
        missing_values = [v for v in required_values if v not in existing_values]
        
        if not missing_values:
            print("L'énumération est déjà à jour.")
            return

        print(f"Valeurs manquantes détectées : {missing_values}")
        
    # Ouvrir une nouvelle connexion en autocommit pour les modifications structurelles
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as connection:
        for value in missing_values:
            try:
                print(f"Ajout de {value}...")
                connection.execute(text(f"ALTER TYPE auditactiontype ADD VALUE '{value}'"))
            except Exception as e:
                # Si la valeur a été ajoutée entre temps par un autre processus
                if "already exists" in str(e).lower():
                    print(f"La valeur {value} existe déjà.")
                else:
                    print(f"Erreur lors de l'ajout de {value}: {e}")

if __name__ == "__main__":
    sync_enum()
