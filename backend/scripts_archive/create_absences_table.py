from database import engine
from app.models import models

def create_absences_table():
    models.Base.metadata.create_all(bind=engine, tables=[models.Absence.__table__])
    print("Successfully created absences table")

if __name__ == "__main__":
    create_absences_table()
