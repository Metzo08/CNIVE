from database import SessionLocal
from app.routers.pupils import get_pupils_count
from app.routers.vulnerabilities import get_vulnerability_stats
from app.routers.schools import get_schools_count
from app.routers.cards import get_card_stats
from app.routers.interventions import get_intervention_stats

def test_endpoints():
    db = SessionLocal()
    
    print("Testing /pupils/count...")
    try:
        print(get_pupils_count(db=db))
    except Exception as e:
        print("ERROR:", e)

    print("\nTesting /vulnerabilities/stats/overview...")
    try:
        print(get_vulnerability_stats(db=db))
    except Exception as e:
        print("ERROR:", e)

    print("\nTesting /schools/count...")
    try:
        print(get_schools_count(db=db))
    except Exception as e:
        print("ERROR:", e)

    print("\nTesting /cards/stats...")
    try:
        print(get_card_stats(db=db))
    except Exception as e:
        print("ERROR:", e)

    print("\nTesting /interventions/stats...")
    try:
        print(get_intervention_stats(db=db))
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    test_endpoints()
