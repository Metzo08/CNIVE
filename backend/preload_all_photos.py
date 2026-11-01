import os
import re
import asyncio
import httpx
import psycopg2
from dotenv import load_dotenv
from pathlib import Path

load_dotenv('backend/.env')

CACHE_DIR = Path('backend/uploads/drive_cache')
CACHE_DIR.mkdir(parents=True, exist_ok=True)

async def download_photo(client, drive_id, sem):
    target_path = CACHE_DIR / f"{drive_id}.jpg"
    if target_path.exists() and target_path.stat().st_size > 500:
        return True
    
    async with sem:
        url = f"https://lh3.googleusercontent.com/d/{drive_id}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
        }
        try:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200 and len(resp.content) > 500:
                with open(target_path, "wb") as f:
                    f.write(resp.content)
                return True
            else:
                alt_url = f"https://drive.google.com/uc?export=download&id={drive_id}"
                resp2 = await client.get(alt_url, headers=headers)
                if resp2.status_code == 200 and len(resp2.content) > 500:
                    with open(target_path, "wb") as f:
                        f.write(resp2.content)
                    return True
        except Exception as e:
            return False
    return False

async def main():
    conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
    cur = conn.cursor()
    cur.execute("SELECT id, first_name, last_name, photo_url FROM pupils WHERE photo_url LIKE '%/d/%';")
    rows = cur.fetchall()
    print(f"Found {len(rows)} pupils with Google Drive photos to verify/cache.")

    drive_ids = []
    for r in rows:
        match = re.search(r'/d/([a-zA-Z0-9_-]{25,})', r[3])
        if match:
            drive_ids.append(match.group(1))

    unique_ids = list(set(drive_ids))
    print(f"Total unique photo IDs: {len(unique_ids)}")

    already_cached = [did for did in unique_ids if (CACHE_DIR / f"{did}.jpg").exists() and (CACHE_DIR / f"{did}.jpg").stat().st_size > 500]
    to_download = [did for did in unique_ids if did not in already_cached]
    print(f"Already cached: {len(already_cached)}, To download: {len(to_download)}")

    if not to_download:
        print("All photos are already cached!")
        return

    sem = asyncio.Semaphore(15) # 15 concurrent downloads
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        tasks = [download_photo(client, did, sem) for did in to_download]
        results = await asyncio.gather(*tasks)
        success = sum(1 for r in results if r)
        print(f"Downloaded and cached {success}/{len(to_download)} photos successfully!")

if __name__ == '__main__':
    asyncio.run(main())
