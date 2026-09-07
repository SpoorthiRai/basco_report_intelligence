import requests

for port in [8000, 8002]:
    url = f"http://127.0.0.1:{port}/api/auth/login/"
    try:
        r = requests.post(url, json={"email": "admin@basco.com", "password": "Test@1234"}, timeout=3)
        print(f"Port {port}: status={r.status_code}, body={r.text[:100]}")
    except Exception as e:
        print(f"Port {port}: exception={e}")
