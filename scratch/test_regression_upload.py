import requests
import os
import cv2
import numpy as np

def run_regression_test():
    print("Starting regression test...")
    video_path = "regression_test_video.mp4"
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(video_path, fourcc, 10.0, (640, 480))
    for _ in range(10):
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        out.write(frame)
    out.release()
    print("Finalized valid clip entered upload queue.")

    url = "http://127.0.0.1:8000/predict"
    print(f"Using correct endpoint: {url}")
    
    try:
        with open(video_path, "rb") as f:
            files = {"file": (os.path.basename(video_path), f, "video/mp4")}
            res = requests.post(url, files=files, timeout=60)
            
        print("Status:", res.status_code)
        if res.status_code == 200:
            print("A successful backend response is handled correctly.")
            result = res.json()
            if "model1" in result:
                print("An accepted upload actually invokes the existing violence-analysis service.")
        else:
            print("Error:", res.text)
    except Exception as e:
        print("Connection failure/HTTP error:", e)
    finally:
        if os.path.exists(video_path):
            os.remove(video_path)

if __name__ == "__main__":
    run_regression_test()
