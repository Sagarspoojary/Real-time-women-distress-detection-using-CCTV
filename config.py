import os
import torch

# Configuration file for Women Distress Detection AI

# Weights pathing
WEAPON_MODEL_PATH = "models/model3b/best.pt"
COCO_MODEL_PATH = "models/model3a/yolo11n.pt"

# Weapon detection parameters
WEAPON_CONF_THRESHOLD = 0.35
WEAPON_IOU_THRESHOLD = 0.45
WEAPON_MAX_DETECTIONS = 100

def get_device():
    # Detect GPU hardware acceleration fallback automatically
    if torch.cuda.is_available():
        return "cuda"
    elif torch.backends.mps.is_available():
        return "mps"
    return "cpu"

WEAPON_DEVICE = get_device()
