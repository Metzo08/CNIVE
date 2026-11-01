import requests

def test_api():
    base_url = "http://localhost:8001"
    
    # Login to get token
    login_url = f"{base_url}/auth/login"
    login_data = {"username": "admin@gte.sn", "password": "Pass123!"}
    
    try:
        print(f"Tentative de connexion à {login_url}...")
        r = requests.post(login_url, data=login_data)
        if r.status_code != 200:
            print(f"Erreur login: {r.status_code} - {r.text}")
            return
        
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test Pupils list
        pupils_url = f"{base_url}/pupils/?limit=10"
        print(f"Test de récupération des élèves: {pupils_url}")
        r = requests.get(pupils_url, headers=headers)
        print(f"Status Pupils: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Nombre d'élèves reçus: {len(data)}")
            if len(data) > 0:
                print(f"Premier élève: {data[0].get('first_name')} {data[0].get('last_name')}")
        else:
            print(f"Erreur Pupils: {r.text}")
            
    except Exception as e:
        print(f"Erreur de connexion: {e}")

if __name__ == "__main__":
    test_api()
