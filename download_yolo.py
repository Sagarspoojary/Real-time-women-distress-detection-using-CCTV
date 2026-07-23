from ultralytics import YOLO
import shutil
import os

model = YOLO("yolo11n.pt")

destination = "models/model3a/yolo11n.pt"

os.makedirs("models/model3", exist_ok=True)

shutil.copy("yolo11n.pt", destination)

print("Downloaded successfully!")
print(destination)