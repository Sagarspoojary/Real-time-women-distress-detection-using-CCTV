import os
import smtplib
import logging
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Create dedicated logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("email_service")

class EmailService:
    def __init__(self):
        self.smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        self.smtp_username = os.environ.get("SMTP_USERNAME", "")
        self.smtp_password = os.environ.get("SMTP_PASSWORD", "")
        self.email_from = os.environ.get("EMAIL_FROM", "")

    def send_emergency_email(self, recipients, subject, body_content):
        from alerts.email_service import send_alert_email
        from alerts.smtp_config import RECIPIENTS, SMTP_USER, SMTP_PASSWORD
        import cv2

        seen = set()
        valid_recipients = []
        for r in recipients:
            addr = r.strip() if r else ""
            if addr and addr not in seen:
                seen.add(addr)
                valid_recipients.append(addr)
        if not valid_recipients:
            valid_recipients = RECIPIENTS

        # Try to locate snapshot & clip from outputs directory if available
        snapshot_bytes = None
        clip_path = None
        debug_video = "outputs/debug_tracking.mp4"

        if os.path.exists(debug_video):
            clip_path = debug_video
            try:
                cap = cv2.VideoCapture(debug_video)
                ret, frame = cap.read()
                if ret and frame is not None:
                    from alerts.attachment_generator import generate_snapshot
                    snapshot_bytes = generate_snapshot(frame)
                cap.release()
            except Exception as e:
                logger.warning(f"Could not extract snapshot for email: {e}")

        alert_info = {
            "track_id": "Alert",
            "gender": "Female",
            "distress_type": "Female Distress",
            "distress_confidence": 0.95,
            "detection_confidence": 0.95,
            "video_name": "Security_Feed.mp4",
            "recognized_name": "Detected Entity",
            "weapon_detected": False,
            "recipients": valid_recipients,
        }

        success = send_alert_email(alert_info, snapshot_bytes=snapshot_bytes, clip_path=clip_path)
        if success:
            return len(valid_recipients)
        else:
            raise RuntimeError("Failed to send emergency alert email")
