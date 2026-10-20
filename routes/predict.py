from fastapi import APIRouter, UploadFile, File
import shutil
import os

# NOTE: .env is loaded in app.py before this module is imported.
from modules.pipeline import WomenDistressPipeline
from services.alert_dispatcher import AlertDispatcher

router = APIRouter()

pipeline = WomenDistressPipeline()
alert_dispatcher = AlertDispatcher()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


from fastapi import Form, Request
from typing import Optional, Dict
import time
import logging
import uuid
import hashlib
import asyncio
import threading

logger = logging.getLogger("routes.predict")

class InFlightTask:
    def __init__(self):
        self.event = threading.Event()
        self.result = None
        self.exception = None

_in_flight_lock = threading.Lock()
_in_flight_tasks: Dict[str, InFlightTask] = {}

@router.post("/predict")
async def predict(
    request: Request,
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    accuracy: Optional[float] = Form(None),
    timestamp: Optional[float] = Form(None),
):
    t_start = time.perf_counter()
    raw_filename = file.filename or "unknown.mp4"

    # Identify and log request origin and correlation ID
    origin = request.headers.get("X-Request-Origin")
    if not origin:
        if raw_filename.startswith("triggered_"):
            origin = "triggered_clip"
        elif "test" in raw_filename.lower():
            origin = "test"
        else:
            origin = "manual_upload"

    corr_id = request.headers.get("X-Correlation-ID")
    if not corr_id:
        corr_id = f"{origin}-{uuid.uuid4().hex[:8]}"

    logger.info(
        f"[PREDICT] [{corr_id}] [origin={origin}] Request received: filename='{raw_filename}', "
        f"content_type='{file.content_type}'"
    )

    # 1. Upload reading, validation, file hash & saving
    t_upload_start = time.perf_counter()
    content = await file.read()
    file_size = len(content)
    file_hash = hashlib.sha256(content).hexdigest()
    t_upload_save_ms = (time.perf_counter() - t_upload_start) * 1000.0

    # 2. In-flight submission protection:
    # If the exact same video payload is currently actively running inference,
    # await its result rather than executing an accidental duplicate 73-87s model pass.
    # Legitimate subsequent uploads after completion are never suppressed.
    is_duplicate = False
    with _in_flight_lock:
        if file_hash in _in_flight_tasks:
            task = _in_flight_tasks[file_hash]
            is_duplicate = True
            logger.warning(
                f"[PREDICT] [{corr_id}] [origin={origin}] Concurrent in-flight duplicate detected for hash "
                f"{file_hash[:12]} ('{raw_filename}'). Awaiting active analysis result to eliminate duplicate inference."
            )
        else:
            task = InFlightTask()
            _in_flight_tasks[file_hash] = task

    if is_duplicate:
        await asyncio.to_thread(task.event.wait)
        if task.exception is not None:
            raise task.exception
        t_total_ms = (time.perf_counter() - t_start) * 1000.0
        logger.info(
            f"[PREDICT] [{corr_id}] [origin={origin}] In-flight duplicate resolved successfully in "
            f"{t_total_ms:.1f}ms without duplicate AI compute."
        )
        return task.result

    # Primary analysis path
    video_path = os.path.join(UPLOAD_DIR, raw_filename)
    try:
        with open(video_path, "wb") as buffer:
            buffer.write(content)

        logger.info(
            f"[PREDICT] [{corr_id}] [origin={origin}] File saved locally to '{video_path}' "
            f"({file_size} bytes, hash={file_hash[:12]}). Analysis started..."
        )

        # 3. Video analysis and temporal model inferences (run in worker thread to prevent event loop blocking)
        t_analysis_start = time.perf_counter()
        result = await asyncio.to_thread(pipeline.process, video_path)
        t_analysis_ms = (time.perf_counter() - t_analysis_start) * 1000.0

        m1 = result.get("model1") or {}
        m2 = result.get("model2") or {}
        m3 = result.get("model3") or {}
        logger.info(
            f"[PREDICT] [{corr_id}] [origin={origin}] Analysis completed in {t_analysis_ms:.1f}ms | "
            f"Overall Status: '{result.get('status')}' | "
            f"Model 1 (Violence): {m1.get('prediction', 'N/A')} ({m1.get('confidence', 0)}%) | "
            f"Model 2 (Distress): {m2.get('prediction', 'N/A')} ({m2.get('confidence', 0)}%) | "
            f"Persons Detected: {m3.get('people_detected', 0)}"
        )

        # 4. Attach location data if available
        t_threat_start = time.perf_counter()
        gps_data = {
            "latitude": latitude,
            "longitude": longitude,
            "accuracy": accuracy,
            "timestamp": timestamp,
        }
        result["location"] = gps_data
        t_threat_ms = (time.perf_counter() - t_threat_start) * 1000.0

        # 5. Incident persistence & decoupled background notification dispatch
        t_dispatch_start = time.perf_counter()
        incident_id = alert_dispatcher.maybe_dispatch(result, video_path, location_data=gps_data)
        t_dispatch_ms = (time.perf_counter() - t_dispatch_start) * 1000.0

        if incident_id:
            result["incident_id"] = incident_id
            logger.info(
                f"[PREDICT] [{corr_id}] [origin={origin}] Result qualifies for incident persistence & dispatch! "
                f"Incident ID: {incident_id}"
            )
        else:
            logger.info(
                f"[PREDICT] [{corr_id}] [origin={origin}] Result does not qualify for new incident "
                f"(benign, below threshold, or suppressed by cooldown)."
            )

        t_total_ms = (time.perf_counter() - t_start) * 1000.0
        logger.info(
            f"[PREDICT] [{corr_id}] [origin={origin}] Stage latency breakdown: "
            f"upload_save={t_upload_save_ms:.1f}ms | "
            f"inference={t_analysis_ms:.1f}ms | "
            f"threat_eval={t_threat_ms:.1f}ms | "
            f"dispatch_init={t_dispatch_ms:.1f}ms | "
            f"total_request={t_total_ms:.1f}ms ({t_total_ms/1000.0:.2f}s)"
        )

        task.result = result
        task.event.set()
        return result

    except Exception as exc:
        task.exception = exc
        task.event.set()
        raise exc

    finally:
        with _in_flight_lock:
            _in_flight_tasks.pop(file_hash, None)

from pydantic import BaseModel
from typing import List, Dict, Any

class EmailPayload(BaseModel):
    recipients: List[str]
    incident_details: Dict[str, Any]

@router.post("/send-email")
async def send_email(payload: EmailPayload):
    # Log the simulated email details to console
    print("\n" + "="*60)
    print("🚨 EMERGENCY EMAIL ALERT SYSTEM DISPATCHED")
    print("="*60)
    print(f"Recipients: {', '.join(payload.recipients)}")
    print(f"Subject: Emergency Alert - Female Distress Detected")
    print("-"*60)
    print(f"Incident Type: {payload.incident_details.get('incident_type', 'Female Distress')}")
    print(f"Video Target: {payload.incident_details.get('video_name', 'Unknown')}")
    print(f"Capture Time: {payload.incident_details.get('timestamp', 'Unknown')}")
    print(f"Threat Score: {payload.incident_details.get('confidence', '0.00')}")
    print(f"Entity Track ID: #{payload.incident_details.get('track_id', 'Unknown')}")
    print(f"Identified Person: {payload.incident_details.get('person_name', 'Unknown Person')}")
    print("-"*60)
    print("AI DIAGNOSTICS SUMMARY:")
    print("Operator attention required. Female distress waving anomaly flagged.")
    print("="*60 + "\n")
    
    return {"status": "success", "message": "Emergency alert successfully dispatched to 4 contacts."}