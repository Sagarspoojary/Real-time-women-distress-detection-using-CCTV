import requests
import os
import cv2
import numpy as np

# Create a valid 10-frame MP4 video
video_path = "valid_dummy.mp4"
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(video_path, fourcc, 10.0, (640, 480))
for _ in range(10):
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    out.write(frame)
out.release()

url = "http://127.0.0.1:8000/api/v1/triggered-clip-upload"
print(f"Uploading {video_path} to {url}...")
try:
    with open(video_path, "rb") as f:
        files = {"file": (os.path.basename(video_path), f, "video/mp4")}
        res = requests.post(url, files=files, timeout=60)
    print("Status:", res.status_code)
    print("Response:", res.text)
except Exception as e:
    print("Error:", e)
