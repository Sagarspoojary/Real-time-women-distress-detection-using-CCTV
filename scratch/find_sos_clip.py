import os
import cv2
import torch
from modules.videomae_base import VideoMAEBase

def find_sos():
    print("Loading Model 2 (7 classes)...")
    class_names = ["Normal", "Walking", "Running", "Punching", "Violence", "Fall", "SOS"]
    model = VideoMAEBase("models/model2/videomae_model2_best.pth", class_names=class_names)
    
    upload_dir = "uploads"
    if not os.path.exists(upload_dir):
        print(f"Directory {upload_dir} not found.")
        return
        
    for filename in os.listdir(upload_dir):
        if not filename.endswith(".mp4"):
            continue
            
        filepath = os.path.join(upload_dir, filename)
        print(f"\nProcessing {filepath}...")
        
        cap = cv2.VideoCapture(filepath)
        frames = []
        frame_idx = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(frame)
            frame_idx += 1
            
            if len(frames) == 16:
                result = model.predict_frames(frames)
                pred, conf = result["prediction"], result["confidence"]
                if pred in ["SOS", "Fall"]:
                    print(f"[{frame_idx}] MATCH FOUND in {filename}! Prediction: {pred} ({conf:.2f}%)")
                    
                # Sliding window of 8 frames
                frames = frames[8:]
                
        cap.release()

if __name__ == "__main__":
    find_sos()
