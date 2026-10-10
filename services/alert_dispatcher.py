"""
AlertDispatcher — Automated Emergency Email, SMS, and Voice Trigger Engine
==========================================================================

Responsibilities
----------------
1. Evaluate AI pipeline results against configured confidence & risk thresholds.
2. Enforce per-source rate-limiting cooldown to prevent duplicate alert spam across streams.
3. Generate unique incident IDs and HTML/SMS/Voice alert payloads.
4. Enqueue alert dispatch jobs into an in-process thread-safe queue.
5. Background worker thread consumes jobs asynchronously to isolate email, SMS, and Voice API calls.
6. Isolate failures across channels (Email failure does not block SMS; SMS failure does not block Voice Call).
7. NEVER raise exceptions to the caller or block AI frame processing loops.
"""

import os
import uuid
import time
import logging
import queue
import threading
from datetime import datetime, timezone
import cv2

from services.email_service import EmailService
from services.emergency_contact_service import EmergencyContactService
from services.phone_notification_service import PhoneNotificationService, mask_phone_number
from services.sms_service import SMSService

logger = logging.getLogger("alert_dispatcher")

# Configuration from environment variables
ALERT_CONFIDENCE_THRESHOLD: float = float(os.environ.get("ALERT_CONFIDENCE_THRESHOLD", "75.0"))
SMS_ALERT_THRESHOLD: float = float(os.environ.get("SMS_ALERT_THRESHOLD", "75.0"))
VOICE_CALL_THRESHOLD: float = float(os.environ.get("VOICE_CALL_THRESHOLD", "90.0"))

ENABLE_SMS_ALERTS: bool = os.environ.get("ENABLE_SMS_ALERTS", "false").lower() in ("true", "1", "yes")
ENABLE_CALL_ALERTS: bool = os.environ.get("ENABLE_CALL_ALERTS", "false").lower() in ("true", "1", "yes")

ALERT_COOLDOWN_SECONDS: int = int(os.environ.get("ALERT_COOLDOWN_SECONDS", "300"))
ALERT_MAX_RETRIES: int = int(os.environ.get("ALERT_MAX_RETRIES", "2"))
ALERT_RETRY_DELAY_SECONDS: float = float(os.environ.get("ALERT_RETRY_DELAY_SECONDS", "3.0"))

ALERT_CAMERA_ID: str = os.environ.get("ALERT_CAMERA_ID", "CAM-01")
ALERT_CAMERA_LOCATION: str = os.environ.get("ALERT_CAMERA_LOCATION", "Main Entrance")
ALERT_GPS_LOCATION: str = os.environ.get("ALERT_GPS_LOCATION", "N/A")

EVIDENCE_VIDEO_PATH: str = "outputs/debug_tracking.mp4"
SNAPSHOT_DIR: str = "outputs"

MODEL1_THREAT_LABELS = {"Violence", "Assault"}
MODEL2_THREAT_LABELS = {"Punching", "Violence", "Fall", "SOS"}


def _compute_risk_level(confidence: float, threat_type: str) -> str:
    if confidence >= 90.0 or threat_type == "Assault":
        return "CRITICAL"
    if confidence >= 75.0:
        return "HIGH"
    if confidence >= 60.0:
        return "MEDIUM"
    return "LOW"


def _build_ai_summary(
    model1_pred: str,
    model1_conf: float,
    model2_pred: str,
    model2_conf: float,
    person_count: int,
    female_count: int,
) -> str:
    parts = []
    if model1_pred in MODEL1_THREAT_LABELS:
        parts.append(f"{model1_pred} detected with {model1_conf:.1f}% confidence (Model 1 - VideoMAE Violence).")
    if model2_pred in MODEL2_THREAT_LABELS:
        parts.append(f"{model2_pred} behaviour detected with {model2_conf:.1f}% confidence (Model 2 - VideoMAE Distress).")
    if person_count == 1:
        parts.append("One person detected in the scene.")
    elif person_count > 1:
        parts.append(f"{person_count} persons detected in the scene.")
    if female_count > 0:
        parts.append(f"{female_count} female subject(s) identified - possible victim(s) in distress.")
    if model1_pred == "Assault" or model2_pred in {"Punching", "Violence"}:
        parts.append("Possible assault in progress. Immediate attention recommended.")
    elif model2_pred in {"Fall", "SOS"}:
        parts.append("Subject may require immediate medical assistance.")
    else:
        parts.append("Threat behaviour confirmed. Immediate verification required.")
    return " ".join(parts)


def _html_row(label: str, value: str, alt: bool) -> str:
    bg = "#0f172a" if not alt else "#111827"
    return (
        f'<tr style="background:{bg};">'
        f'<td style="padding:11px 16px;font-size:12px;font-weight:600;color:#94a3b8;width:45%;border-bottom:1px solid #1e293b;text-transform:uppercase;letter-spacing:0.5px;">{label}</td>'
        f'<td style="padding:11px 16px;font-size:13px;color:#e2e8f0;border-bottom:1px solid #1e293b;word-break:break-all;">{value}</td>'
        f"</tr>"
    )


def _build_html_email(
    incident_id: str,
    timestamp: str,
    camera_id: str,
    camera_location: str,
    threat_type: str,
    confidence: float,
    person_count: int,
    gender_summary: str,
    risk_level: str,
    gps_location: str,
    ai_summary: str,
    video_name: str,
    latitude: float = None,
    longitude: float = None,
    accuracy: float = None,
) -> str:
    risk_color_map = {
        "CRITICAL": "#dc2626",
        "HIGH":     "#ea580c",
        "MEDIUM":   "#d97706",
        "LOW":      "#16a34a",
    }
    risk_color = risk_color_map.get(risk_level, "#dc2626")

    if latitude is not None and longitude is not None:
        gmaps_url = f"https://www.google.com/maps?q={latitude},{longitude}"
        acc_str = f" (±{accuracy:.1f}m)" if accuracy is not None else ""
        gps_display = (
            f"Lat: {latitude:.6f}, Lng: {longitude:.6f}{acc_str}<br/>"
            f'<a href="{gmaps_url}" target="_blank" style="color:#38bdf8;font-weight:bold;text-decoration:underline;">📍 View Incident Location on Google Maps</a>'
        )
    else:
        gps_display = gps_location if gps_location else "Location unavailable"

    rows_html = "".join([
        _html_row(label, value, alt)
        for label, value, alt in [
            ("Incident ID",       incident_id,          False),
            ("Date &amp; Time",   timestamp,             True),
            ("Camera ID",         camera_id,             False),
            ("Camera Location",   camera_location,       True),
            ("Threat Type",       threat_type,           False),
            ("Confidence Score",  f"{confidence:.1f}%",  True),
            ("Persons Detected",  str(person_count),     False),
            ("Gender Info",       gender_summary,        True),
            ("GPS Coordinates",   gps_display,           False),
            ("Evidence File",     video_name,            True),
        ]
    ])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EMERGENCY ALERT</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#0f172a;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;min-height:100vh;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="620" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;max-width:620px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#7f1d1d 0%,#991b1b 50%,#b91c1c 100%);padding:28px 32px;text-align:center;">
              <div style="font-size:36px;margin-bottom:8px;">&#128680;</div>
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:2px;text-transform:uppercase;">EMERGENCY ALERT</h1>
              <p style="margin:6px 0 0;font-size:13px;color:#fca5a5;letter-spacing:1px;">AI-POWERED WOMEN SAFETY MONITORING SYSTEM</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0;text-align:center;">
              <span style="display:inline-block;background:{risk_color};color:#ffffff;font-size:13px;font-weight:700;letter-spacing:2px;padding:6px 22px;border-radius:100px;text-transform:uppercase;">RISK LEVEL: {risk_level}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0;">
              <div style="background:#1e3a5f;border:1px solid #2563eb;border-radius:8px;padding:16px 20px;">
                <p style="margin:0;font-size:13px;font-weight:600;color:#93c5fd;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">AI Summary</p>
                <p style="margin:0;font-size:14px;color:#e2e8f0;line-height:1.6;">{ai_summary}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 0;">
              <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;">Incident Details</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;overflow:hidden;border:1px solid #334155;">{rows_html}</table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0;">
              <div style="background:#450a0a;border:1px solid #dc2626;border-radius:8px;padding:16px 20px;text-align:center;">
                <p style="margin:0;font-size:15px;font-weight:700;color:#fca5a5;">IMMEDIATE ACTION REQUIRED</p>
                <p style="margin:8px 0 0;font-size:13px;color:#fca5a5;line-height:1.5;">Verify the situation immediately and contact local authorities if necessary.</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#64748b;line-height:1.6;">Automated alert by AI Safety System. Incident ID: {incident_id}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _extract_snapshot(video_path: str, incident_id: str):
    if not os.path.isfile(video_path):
        return None
    os.makedirs(SNAPSHOT_DIR, exist_ok=True)
    snapshot_path = os.path.join(SNAPSHOT_DIR, f"alert_snapshot_{incident_id}.jpg")
    try:
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0:
            cap.release()
            return None
        target_frame = max(0, total_frames // 2)
        cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
        ret, frame = cap.read()
        cap.release()
        if not ret or frame is None:
            return None
        cv2.imwrite(snapshot_path, frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return snapshot_path
    except Exception as e:
        logger.error(f"[AlertDispatcher] Snapshot extraction error: {e}")
        return None


def _collect_email_recipients() -> list:
    recipients = []
    try:
        cs = EmergencyContactService()
        for email_str in cs.get_legacy_email_strings():
            if email_str and email_str.strip():
                recipients.append(email_str.strip())
    except Exception as e:
        logger.warning(f"[AlertDispatcher] Could not load email contacts: {e}")

    for key in ("ALERT_EMAIL_1", "ALERT_EMAIL_2", "ALERT_EMAIL_3"):
        val = os.environ.get(key, "").strip()
        if val:
            recipients.append(val)

    seen = set()
    unique = []
    for r in recipients:
        if r not in seen:
            seen.add(r)
            unique.append(r)
    return unique


class AlertDispatcher:
    def __init__(self):
        self._email_service = EmailService()
        self._phone_service = PhoneNotificationService()
        self._sms_service = SMSService()
        self._cooldown_registry: dict = {}
        self._dispatched_ids: set = set()
        self._lock = threading.Lock()

        # In-process background queue and worker thread
        self._job_queue = queue.Queue()
        self._worker_thread = threading.Thread(target=self._process_queue_loop, daemon=True)
        self._worker_thread.start()

        logger.info(
            f"[AlertDispatcher] Initialized | "
            f"threshold={ALERT_CONFIDENCE_THRESHOLD}% | "
            f"SMS_threshold={SMS_ALERT_THRESHOLD}% (enabled={ENABLE_SMS_ALERTS}) | "
            f"Voice_threshold={VOICE_CALL_THRESHOLD}% (enabled={ENABLE_CALL_ALERTS}) | "
            f"cooldown={ALERT_COOLDOWN_SECONDS}s"
        )

    def maybe_dispatch(self, pipeline_result: dict, video_path: str, location_data: dict = None, snapshot_path: str = None) -> str:
        try:
            return self._evaluate_and_enqueue(pipeline_result, video_path, location_data=location_data, snapshot_path=snapshot_path)
        except Exception as e:
            logger.error(f"[AlertDispatcher] Unhandled exception in maybe_dispatch: {e}")
            return None

    def _evaluate_and_enqueue(self, pipeline_result: dict, video_path: str, location_data: dict = None, snapshot_path: str = None) -> str:
        model1 = pipeline_result.get("model1") or {}
        model2 = pipeline_result.get("model2") or {}
        persons = pipeline_result.get("persons") or []

        model1_pred: str   = model1.get("prediction", "Normal")
        model1_conf: float = float(model1.get("confidence", 0.0))
        model2_pred: str   = model2.get("prediction", "Normal")
        model2_conf: float = float(model2.get("confidence", 0.0))

        model1_threat = model1_pred in MODEL1_THREAT_LABELS and model1_conf >= ALERT_CONFIDENCE_THRESHOLD
        model2_threat = model2_pred in MODEL2_THREAT_LABELS and model2_conf >= ALERT_CONFIDENCE_THRESHOLD

        if not model1_threat and not model2_threat:
            return

        if model1_threat and model2_threat:
            if model1_conf >= model2_conf:
                threat_type, confidence = model1_pred, model1_conf
            else:
                threat_type, confidence = model2_pred, model2_conf
        elif model1_threat:
            threat_type, confidence = model1_pred, model1_conf
        else:
            threat_type, confidence = model2_pred, model2_conf

        source_key = os.path.splitext(os.path.basename(video_path))[0]
        now = time.monotonic()

        with self._lock:
            last_sent = self._cooldown_registry.get(source_key, 0.0)
            elapsed   = now - last_sent

            if elapsed < ALERT_COOLDOWN_SECONDS:
                remaining = int(ALERT_COOLDOWN_SECONDS - elapsed)
                logger.info(f"[AlertDispatcher] SUPPRESSED alert for '{source_key}' — cooldown active ({remaining}s remaining).")
                return

            self._cooldown_registry[source_key] = now

        incident_id = f"INC-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"
        risk_level = _compute_risk_level(confidence, threat_type)

        job = {
            "incident_id": incident_id,
            "source_key": source_key,
            "threat_type": threat_type,
            "confidence": confidence,
            "risk_level": risk_level,
            "model1_pred": model1_pred,
            "model1_conf": model1_conf,
            "model2_pred": model2_pred,
            "model2_conf": model2_conf,
            "persons": persons,
            "video_path": video_path,
            "snapshot_path": snapshot_path,
            "location_data": location_data or {}
        }
        
        # Persist incident to DB here before dispatch
        try:
            from database.database import SessionLocal
            from database import crud
            db = SessionLocal()
            try:
                crud.create_incident(
                    db=db,
                    incident_id=incident_id,
                    source=source_key,
                    pipeline_result=pipeline_result,
                    video_path=video_path,
                    snapshot_path=snapshot_path,
                    location_data=location_data,
                    alert_status="ENQUEUED"
                )
                
                # Push event to WebSocket queue so frontend can refresh history
                try:
                    from routes.ws import ws_event_queue
                    ws_event_queue.put({
                        "type": "NEW_INCIDENT",
                        "incident_id": incident_id
                    })
                except Exception as ws_err:
                    logger.error(f"[AlertDispatcher] WS Error while enqueuing event: {ws_err}")
            finally:
                db.close()
        except Exception as db_err:
            logger.error(f"[AlertDispatcher] DB Error while creating incident: {db_err}")

        self._job_queue.put(job)
        logger.info(f"[AlertDispatcher] Enqueued alert job for incident {incident_id} | Risk: {risk_level}")
        return incident_id

    def _process_queue_loop(self):
        while True:
            try:
                job = self._job_queue.get()
                if job is None:
                    break
                self._dispatch_job_async(job)
            except Exception as e:
                logger.error(f"[AlertDispatcher Worker] Error processing alert job: {e}")
            finally:
                self._job_queue.task_done()

    def _dispatch_job_async(self, job: dict):
        incident_id = job["incident_id"]
        threat_type = job["threat_type"]
        confidence = job["confidence"]
        risk_level = job["risk_level"]
        video_path = job["video_path"]
        provided_snapshot_path = job.get("snapshot_path")  # May be pre-supplied by WebcamStreamProcessor
        location_data = job["location_data"]
        persons = job["persons"]

        person_count = len(persons)
        female_count = len([p for p in persons if p.get("gender") == "Female"])
        male_count = len([p for p in persons if p.get("gender") == "Male"])
        unknown_count = person_count - female_count - male_count
        gender_parts = []
        if female_count: gender_parts.append(f"{female_count} Female")
        if male_count: gender_parts.append(f"{male_count} Male")
        if unknown_count: gender_parts.append(f"{unknown_count} Unknown")
        gender_summary = ", ".join(gender_parts) if gender_parts else "Not determined"

        ai_summary = _build_ai_summary(
            job["model1_pred"], job["model1_conf"],
            job["model2_pred"], job["model2_conf"],
            person_count, female_count
        )

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S IST")
        video_name = os.path.basename(video_path)

        cs = EmergencyContactService()
        email_recipients = _collect_email_recipients()
        phone_recipients = cs.get_enabled_phone_numbers()

        # Use pre-supplied evidence paths (e.g. from WebcamStreamProcessor) if available;
        # otherwise fall back to extracting a snapshot from the default debug video.
        if provided_snapshot_path and os.path.isfile(provided_snapshot_path):
            snapshot_path = provided_snapshot_path
        else:
            snapshot_path = _extract_snapshot(EVIDENCE_VIDEO_PATH, incident_id)

        if video_path and os.path.isfile(video_path):
            video_attachment = video_path
        elif os.path.isfile(EVIDENCE_VIDEO_PATH):
            video_attachment = EVIDENCE_VIDEO_PATH
        else:
            video_attachment = None

        results_summary = {"incident_id": incident_id, "email": "SKIPPED", "sms": "SKIPPED", "voice": "SKIPPED"}

        # 1. EMAIL DISPATCH (Isolated failure)
        enable_email = os.environ.get("ENABLE_EMAIL_ALERTS", "true").lower() in ("true", "1", "yes")
        if enable_email and email_recipients:
            html_body = _build_html_email(
                incident_id=incident_id, timestamp=timestamp, camera_id=ALERT_CAMERA_ID,
                camera_location=ALERT_CAMERA_LOCATION, threat_type=threat_type, confidence=confidence,
                person_count=person_count, gender_summary=gender_summary, risk_level=risk_level,
                gps_location=ALERT_GPS_LOCATION, ai_summary=ai_summary, video_name=video_name,
                latitude=location_data.get("latitude"), longitude=location_data.get("longitude"),
                accuracy=location_data.get("accuracy")
            )
            subject = f"EMERGENCY ALERT - {threat_type} Detected | {risk_level} RISK | {ALERT_CAMERA_ID}"
            try:
                sent = self._email_service.send_alert_email(
                    recipients=email_recipients, subject=subject, html_body=html_body,
                    snapshot_path=snapshot_path, video_path=video_attachment
                )
                results_summary["email"] = f"SUCCESS ({sent} recipients)"
            except Exception as e:
                logger.error(f"[AlertDispatcher] Email dispatch failed for incident {incident_id}: {e}")
                results_summary["email"] = f"FAILED: {e}"

        # 2. SMS DISPATCH (Isolated failure)
        if self._sms_service.enabled and confidence >= SMS_ALERT_THRESHOLD:
            # Build dynamic GPS link if coordinates are available
            lat = location_data.get("latitude")
            lon = location_data.get("longitude")
            if lat is not None and lon is not None:
                gps_str = f"https://www.google.com/maps?q={lat},{lon}"
            else:
                gps_str = ALERT_GPS_LOCATION

            sms_text = (
                f"EMERGENCY ALERT: {threat_type} Detected\n"
                f"Risk Level: {risk_level}\n"
                f"Confidence: {confidence:.0f}%\n"
                f"Camera: {ALERT_CAMERA_LOCATION} ({ALERT_CAMERA_ID})\n"
                f"Time: {timestamp}\n\n"
                f"AI Summary: {ai_summary}\n\n"
                f"Persons Detected: {person_count}\n"
                f"Gender Summary: {gender_summary}\n"
                f"GPS Location: {gps_str}\n\n"
                f"Incident ID: {incident_id}\n"
                f"Immediate action required."
            )
            try:
                # If there are phone recipients from EmergencyContactService, we can send to the first one,
                # or default to the SMS_TO_NUMBER configured in environment.
                recipient = phone_recipients[0] if phone_recipients else None
                sms_res = self._sms_service.send_sms(sms_text, to_number=recipient)
                results_summary["sms"] = "SUCCESS" if sms_res else "FAILED"
            except Exception as e:
                logger.error(f"[AlertDispatcher] SMS dispatch failed for incident {incident_id}: {e}")
                results_summary["sms"] = f"FAILED: {e}"

        # 3. VOICE CALL DISPATCH (Voice removed - logged gracefully via PhoneNotificationService)
        if phone_recipients and (confidence >= VOICE_CALL_THRESHOLD or threat_type == "Assault" or risk_level == "CRITICAL"):
            try:
                call_res = self._phone_service.trigger_emergency_call(phone_recipients, "Voice call requested")
                results_summary["voice"] = call_res.get("error", "DISABLED")
            except Exception as e:
                logger.error(f"[AlertDispatcher] Voice call log error: {e}")
                results_summary["voice"] = f"DISABLED: {e}"

        logger.info(f"[AlertDispatcher Summary] Incident {incident_id} Dispatch Results: {results_summary}")
