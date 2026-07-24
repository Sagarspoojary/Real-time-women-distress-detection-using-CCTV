"""
alerts/email_service.py
========================
SMTP email sender for Women Distress AI alerts.

Features:
  - Connects to Gmail SMTP via STARTTLS (port 587)
  - Sends to multiple recipients simultaneously
  - Attaches snapshot.jpg and distress_clip.mp4 when available
  - Renders a rich plain-text + HTML body
  - Logs every send attempt (success or failure)
  - Never crashes the AI pipeline on failure
"""

import os
import logging
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

from alerts.smtp_config import (
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    ALERT_SUBJECT,
)

logger = logging.getLogger("alerts.email")


# ─── Email Body Builder ────────────────────────────────────────────────────────

def _build_plain_body(alert_info: dict) -> str:
    """Build plain-text version of the alert email."""
    now = datetime.now()
    location = alert_info.get("location", {})
    
    if location and location.get("status") == "available":
        loc_str = f"""Latitude:             {location.get('latitude')}
Longitude:            {location.get('longitude')}
Accuracy:             {location.get('accuracy', 'N/A')} meters
Location Timestamp:   {location.get('timestamp', 'N/A')}
Google Maps Link:     {location.get('maps_link')}"""
    else:
        loc_str = "Location:             Location unavailable"

    return f"""
╔══════════════════════════════════════════════╗
║       WOMEN DISTRESS AI — EMERGENCY ALERT    ║
╚══════════════════════════════════════════════╝

A possible women distress situation has been detected.
Please verify the situation immediately.

────────────────────────────────────────────────
INCIDENT DETAILS
────────────────────────────────────────────────

Date:                 {now.strftime('%d %B %Y')}
Time:                 {now.strftime('%H:%M:%S')} IST
Camera / Video:       {alert_info.get('video_name', 'Unknown')}
Track ID:             #{alert_info.get('track_id', 'Unknown')}
Gender:               Female
Detection Confidence: {alert_info.get('detection_confidence', 0.0):.2%}
Distress Type:        {alert_info.get('distress_type', 'Unknown')}
Distress Confidence:  {alert_info.get('distress_confidence', 0.0):.2%}
Alert Level:          HIGH ⚠️
Recognized Person:    {alert_info.get('recognized_name', 'Unknown')}
Weapon Detected:      {'YES ⚠️' if alert_info.get('weapon_detected') else 'No'}

────────────────────────────────────────────────
GEOLOCATION & LIVE GPS
────────────────────────────────────────────────

{loc_str}

────────────────────────────────────────────────
SYSTEM INFO
────────────────────────────────────────────────

System:   Women Distress AI
Model 1:  Violence Detection (VideoMAE)
Model 2:  Distress Classification (VideoMAE)
Model 3:  Person Detection + Tracking (YOLO11n + ByteTrack)
Model 4:  Gender Classification (EfficientNetV2-S)

────────────────────────────────────────────────

This is an automated alert. Do not reply to this email.
Attachments include: snapshot.jpg and distress_clip.mp4

"""


def _build_html_body(alert_info: dict) -> str:
    """Build HTML version of the alert email (shown in modern email clients)."""
    now = datetime.now()
    weapon_badge = (
        '<span style="background:#e53e3e;color:white;padding:2px 8px;border-radius:4px;">YES ⚠️</span>'
        if alert_info.get('weapon_detected')
        else '<span style="background:#38a169;color:white;padding:2px 8px;border-radius:4px;">No</span>'
    )
    
    location = alert_info.get("location", {})
    if location and location.get("status", "").startswith("available"):
        lat = location.get("latitude")
        lng = location.get("longitude")
        acc = location.get("accuracy", "N/A")
        ts = location.get("timestamp", "N/A")
        link = location.get("maps_link")
        
        loc_html = f"""
      <p class="section-title">📍 Live GPS Geolocation</p>
      <div class="row"><span class="label">Latitude</span><span class="value">{lat}</span></div>
      <div class="row"><span class="label">Longitude</span><span class="value">{lng}</span></div>
      <div class="row"><span class="label">GPS Accuracy</span><span class="value">{acc} meters</span></div>
      <div class="row"><span class="label">GPS Timestamp</span><span class="value">{ts}</span></div>
      <div style="text-align: center; margin-top: 15px;">
        <a href="{link}" target="_blank" style="background: #3182ce; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block;">
          🗺️ Open Incident Location in Google Maps
        </a>
      </div>
      <p style="text-align: center; font-size: 11px; color: #a0aec0; margin-top: 6px;">{link}</p>
        """
    else:
        loc_html = """
      <p class="section-title">📍 Live GPS Geolocation</p>
      <div class="row"><span class="label">Location</span><span class="value" style="color: #e53e3e;">Location unavailable</span></div>
        """

    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: Arial, sans-serif; background: #0f0f0f; color: #e2e8f0; margin: 0; padding: 20px; }}
    .card {{ background: #1a1a2e; border: 2px solid #e53e3e; border-radius: 12px; max-width: 600px; margin: auto; overflow: hidden; }}
    .header {{ background: linear-gradient(135deg, #7b0000, #c53030); padding: 24px; text-align: center; }}
    .header h1 {{ margin: 0; color: white; font-size: 22px; }}
    .header p {{ margin: 6px 0 0; color: #fed7d7; font-size: 13px; }}
    .body {{ padding: 24px; }}
    .row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #2d2d2d; }}
    .label {{ color: #a0aec0; font-size: 13px; font-weight: bold; text-transform: uppercase; }}
    .value {{ color: #f0f0f0; font-size: 14px; font-weight: bold; text-align: right; }}
    .alert-level {{ background: #e53e3e; color: white; padding: 4px 12px; border-radius: 20px; font-weight: bold; }}
    .footer {{ background: #111; padding: 14px 24px; font-size: 11px; color: #666; text-align: center; }}
    .section-title {{ color: #fc8181; font-size: 12px; font-weight: bold; text-transform: uppercase; margin: 20px 0 4px; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🚨 WOMEN DISTRESS ALERT</h1>
      <p>An emergency situation requires your immediate attention.</p>
    </div>
    <div class="body">
      <p class="section-title">📍 Incident Details</p>
      <div class="row"><span class="label">Date</span><span class="value">{now.strftime('%d %B %Y')}</span></div>
      <div class="row"><span class="label">Time</span><span class="value">{now.strftime('%H:%M:%S')} IST</span></div>
      <div class="row"><span class="label">Camera / Video</span><span class="value">{alert_info.get('video_name', 'Unknown')}</span></div>
      <div class="row"><span class="label">Track ID</span><span class="value">#{alert_info.get('track_id', '?')}</span></div>
      <div class="row"><span class="label">Gender</span><span class="value" style="color:#f687b3;">Female</span></div>
      <div class="row"><span class="label">Recognized Person</span><span class="value">{alert_info.get('recognized_name', 'Unknown')}</span></div>

      <p class="section-title">🤖 AI Analysis</p>
      <div class="row"><span class="label">Distress Type</span><span class="value">{alert_info.get('distress_type', 'Unknown')}</span></div>
      <div class="row"><span class="label">Detection Confidence</span><span class="value">{alert_info.get('detection_confidence', 0.0):.2%}</span></div>
      <div class="row"><span class="label">Distress Confidence</span><span class="value">{alert_info.get('distress_confidence', 0.0):.2%}</span></div>
      <div class="row"><span class="label">Weapon Detected</span><span class="value">{weapon_badge}</span></div>
      <div class="row"><span class="label">Alert Level</span><span class="value"><span class="alert-level">HIGH</span></span></div>

      {loc_html}

      <br>
      <p style="color:#fc8181;font-size:13px;text-align:center;">
        📎 Attachments: <strong>snapshot.jpg</strong> and <strong>distress_clip.mp4</strong>
      </p>
    </div>
    <div class="footer">
      Women Distress AI System &nbsp;|&nbsp; Automated Alert &nbsp;|&nbsp; Do not reply
    </div>
  </div>
</body>
</html>
"""


# ─── SMTP Sender ──────────────────────────────────────────────────────────────

def send_alert_email(
    alert_info: dict,
    snapshot_bytes: bytes | None = None,
    clip_path: str | None = None,
) -> bool:
    """
    Send the emergency alert email with optional attachments.

    Args:
        alert_info:      Dict with all incident metadata (track_id, confidence, etc.)
        snapshot_bytes:  JPEG bytes of the distress frame snapshot (or None).
        clip_path:       Path to the distress video clip MP4 file (or None).

    Returns:
        True if email was sent successfully, False otherwise.
        NEVER raises — logs errors and returns False instead.
    """
    recipients = alert_info.get("recipients", [])
    if not recipients:
        logger.error("[Email] No recipients configured — aborting alert.")
        return False

    # ── Build MIME message ────────────────────────────────────────────────────
    msg = MIMEMultipart("mixed")
    msg["From"]    = SMTP_USER
    msg["To"]      = ", ".join(recipients)
    msg["Subject"] = ALERT_SUBJECT

    # Multipart/alternative for plain + HTML
    alternative = MIMEMultipart("alternative")
    alternative.attach(MIMEText(_build_plain_body(alert_info), "plain", "utf-8"))
    alternative.attach(MIMEText(_build_html_body(alert_info),  "html",  "utf-8"))
    msg.attach(alternative)

    # ── Attach snapshot.jpg ───────────────────────────────────────────────────
    if snapshot_bytes:
        try:
            part = MIMEBase("image", "jpeg")
            part.set_payload(snapshot_bytes)
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", 'attachment; filename="snapshot.jpg"')
            msg.attach(part)
            logger.info(f"[Email] snapshot.jpg attached ({len(snapshot_bytes)//1024} KB)")
        except Exception as e:
            logger.warning(f"[Email] Failed to attach snapshot: {e}")

    # ── Attach distress_clip.mp4 ──────────────────────────────────────────────
    if clip_path and os.path.exists(clip_path):
        try:
            clip_size = os.path.getsize(clip_path)
            # Skip if clip is too large for email (>20 MB)
            if clip_size > 20 * 1024 * 1024:
                logger.warning(
                    f"[Email] Clip too large to attach ({clip_size//1024//1024} MB > 20 MB limit). "
                    "Clip saved locally at: " + clip_path
                )
            else:
                with open(clip_path, "rb") as f:
                    part = MIMEBase("video", "mp4")
                    part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header("Content-Disposition", 'attachment; filename="distress_clip.mp4"')
                msg.attach(part)
                logger.info(f"[Email] distress_clip.mp4 attached ({clip_size//1024} KB)")
        except Exception as e:
            logger.warning(f"[Email] Failed to attach clip: {e}")

    # ── Send via SMTP ─────────────────────────────────────────────────────────
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=60) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()

            if SMTP_USER and SMTP_PASSWORD:
                server.login(SMTP_USER, SMTP_PASSWORD)
            else:
                logger.warning("[Email] No SMTP credentials — attempting unauthenticated send.")

            server.sendmail(SMTP_USER, recipients, msg.as_string())

        logger.info(
            f"[Email] ✅ Alert sent successfully | "
            f"To: {recipients} | "
            f"Track ID: #{alert_info.get('track_id')} | "
            f"Distress: {alert_info.get('distress_type')} | "
            f"Confidence: {alert_info.get('distress_confidence', 0):.2%}"
        )
        return True

    except smtplib.SMTPAuthenticationError:
        logger.error(
            "[Email] ❌ SMTP Authentication failed. "
            "Check ALERT_SMTP_USER and ALERT_SMTP_PASSWORD. "
            "Make sure you are using a Gmail App Password, not your login password."
        )
        return False
    except smtplib.SMTPException as e:
        logger.error(f"[Email] ❌ SMTP error: {e}")
        return False
    except Exception as e:
        logger.error(f"[Email] ❌ Unexpected error sending alert: {e}")
        return False
