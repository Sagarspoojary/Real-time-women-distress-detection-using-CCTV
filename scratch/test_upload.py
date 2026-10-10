import requests
import uuid
import sys
import os

with open("dummy.mp4", "wb") as f:
    f.write(b"dummy video data")

url = "http://127.0.0.1:8000/api/v1/triggered-clip-upload"
try:
    with open("dummy.mp4", "rb") as f:
        files = {"file": ("dummy.mp4", f, "video/mp4")}
        res = requests.post(url, files=files, timeout=5)
    print("Status:", res.status_code)
    print("Response:", res.text)
except Exception as e:
    print("Error:", e)
