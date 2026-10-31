from database import engine
from sqlalchemy import text

def main():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
        tables = [r[0] for r in res.fetchall()]
        print('Tables:', tables)
        for table in tables:
            col_res = conn.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='{table}'"))
            for col_name, col_type in col_res.fetchall():
                if 'char' in col_type or 'text' in col_type:
                    q = text(f"SELECT COUNT(*) FROM {table} WHERE CAST({col_name} AS TEXT) ILIKE '%mbour%' OR CAST({col_name} AS TEXT) ILIKE '%mboro%' OR CAST({col_name} AS TEXT) ILIKE '%thiès%' OR CAST({col_name} AS TEXT) ILIKE '%thies%'")
                    try:
                        cnt = conn.execute(q).scalar()
                        if cnt > 0:
                            print(f'Match in table {table}, column {col_name}: {cnt} rows')
                            sample = conn.execute(text(f"SELECT {col_name} FROM {table} WHERE CAST({col_name} AS TEXT) ILIKE '%mbour%' OR CAST({col_name} AS TEXT) ILIKE '%mboro%' OR CAST({col_name} AS TEXT) ILIKE '%thiès%' OR CAST({col_name} AS TEXT) ILIKE '%thies%' LIMIT 5")).fetchall()
                            print('  Sample:', sample)
                    except Exception as e:
                        print(f"Error checking {table}.{col_name}: {e}")

if __name__ == '__main__':
    main()
