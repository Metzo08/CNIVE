import requests

url = "http://localhost:8001/auth/login"
data = {
    "username": "admin@gte.sn",
    "password": "Pass123!"
}

try:
    print(f"Testing login at {url}...")
    r = requests.post(url, data=data)
    print(f"Status Code: {r.status_code}")
    print(f"Response: {r.text}")
except Exception as e:
    print(f"Error: {e}")
