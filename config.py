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

# ─────────────────────────────────────────────────────────────────────────────
# Alert / Email Configuration
# All values are read from environment variables (.env via python-dotenv or
# system environment).  Sane production-ready defaults are provided.
# ─────────────────────────────────────────────────────────────────────────────

# Minimum AI model confidence (0-100) that triggers an automated alert email.
ALERT_CONFIDENCE_THRESHOLD: float = float(os.environ.get("ALERT_CONFIDENCE_THRESHOLD", "75.0"))

# After one alert fires for a given video source, suppress further alerts for
# this many seconds to prevent email spam during continuous detections.
ALERT_COOLDOWN_SECONDS: int = int(os.environ.get("ALERT_COOLDOWN_SECONDS", "300"))

# Number of additional SMTP retry attempts after the first attempt fails.
ALERT_MAX_RETRIES: int = int(os.environ.get("ALERT_MAX_RETRIES", "2"))

# Delay in seconds between retry attempts.
ALERT_RETRY_DELAY_SECONDS: float = float(os.environ.get("ALERT_RETRY_DELAY_SECONDS", "3"))

# Camera metadata embedded in alert emails.
ALERT_CAMERA_ID: str = os.environ.get("ALERT_CAMERA_ID", "CAM-01")
ALERT_CAMERA_LOCATION: str = os.environ.get("ALERT_CAMERA_LOCATION", "Main Entrance")
ALERT_GPS_LOCATION: str = os.environ.get("ALERT_GPS_LOCATION", "N/A")

