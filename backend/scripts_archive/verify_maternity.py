import urllib.request
import json

def verify():
    try:
        url = "http://localhost:8000/health-records/maternity"
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
            print(f"Nombre de dossiers : {len(data)}")
            for i, r in enumerate(data[:3]):  # Check first 3
                print(f"Dossier {i+1}: {r['mother_name']}, Visites: {len(r['visits'])}, Poids actuel: {r.get('weight_current')}")
    except Exception as e:
        print(f"Erreur : {e}")

if __name__ == "__main__":
    verify()
