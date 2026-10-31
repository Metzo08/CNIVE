from database import SessionLocal
from app.routers.cards import get_global_analytics
from unittest.mock import MagicMock

def test_analytics():
    db = SessionLocal()
    try:
        res = get_global_analytics(db)
        print("Success:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_analytics()
