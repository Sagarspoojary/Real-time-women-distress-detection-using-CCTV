"""
IP Webcam Routes — Live Mobile IP Webcam Control & MJPEG Stream
================================================================

Endpoints:
  POST /api/v1/ipwebcam/start   — Start the IP webcam background worker (accepts JSON {"url": "..."})
  POST /api/v1/ipwebcam/stop    — Stop the IP webcam background worker
  GET  /api/v1/ipwebcam/status  — Return current worker status
  GET  /api/v1/ipwebcam/stream  — MJPEG stream for browser <img> tag
"""

import logging
import time
from typing import Generator

import cv2
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, HttpUrl

from modules.ip_webcam_processor import (
    IPWebcamStreamProcessor,
    get_active_processor,
    set_active_processor,
)
from modules.webcam_stream_processor import (
    get_active_processor as get_local_processor,
    set_active_processor as set_local_processor,
)

logger = logging.getLogger("ip_webcam_routes")
router = APIRouter()

class StartIPWebcamRequest(BaseModel):
    url: str

# ─────────────────────────────────────────────────────────────────────────────
# Start
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/ipwebcam/start")
async def start_ip_webcam(req: StartIPWebcamRequest):
    """Start the live IP webcam AI processing worker."""
    existing = get_active_processor()
    if existing and existing._running:
        if existing.stream_url == req.url:
            return JSONResponse(
                content={"status": "already_running", "camera_id": existing.camera_id},
                status_code=200,
            )
        else:
            # Stop the old one before starting a new one
            existing.stop()
            set_active_processor(None)
            
    # Stop local webcam if it is running to free resources
    local_processor = get_local_processor()
    if local_processor and local_processor._running:
        local_processor.stop()
        set_local_processor(None)

    try:
        processor = IPWebcamStreamProcessor(stream_url=req.url, camera_id="IP-WEBCAM-01", location="Mobile IP Camera")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    started = processor.start()

    if started:
        set_active_processor(processor)
        logger.info("[IPWebcamRoutes] IP Webcam started successfully.")
        return JSONResponse(content={"status": "started", "camera_id": processor.camera_id}, status_code=200)
    else:
        return JSONResponse(content={"status": "failed", "detail": "Could not start IP webcam."}, status_code=500)


# ─────────────────────────────────────────────────────────────────────────────
# Stop
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/ipwebcam/stop")
async def stop_ip_webcam():
    """Stop the live IP webcam AI processing worker."""
    processor = get_active_processor()
    if not processor or not processor._running:
        return JSONResponse(content={"status": "not_running"}, status_code=200)

    processor.stop()
    set_active_processor(None)
    logger.info("[IPWebcamRoutes] IP Webcam stopped.")
    return JSONResponse(content={"status": "stopped"}, status_code=200)


# ─────────────────────────────────────────────────────────────────────────────
# Status
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/ipwebcam/status")
async def ip_webcam_status():
    """Return current IP webcam processor status."""
    processor = get_active_processor()
    if not processor:
        return JSONResponse(content={
            "running": False,
            "camera_id": None,
            "stream_url": None,
            "frames_processed": 0,
            "uptime_seconds": 0,
            "threat_active": False,
            "last_incident_id": None,
            "last_threat_time": None,
            "evidence_buffer_size": 0,
        }, status_code=200)

    return JSONResponse(content=processor.status(), status_code=200)


# ─────────────────────────────────────────────────────────────────────────────
# MJPEG Stream
# ─────────────────────────────────────────────────────────────────────────────

def _generate_mjpeg_frames() -> Generator[bytes, None, None]:
    placeholder = _make_placeholder_frame()

    while True:
        processor = get_active_processor()

        if processor and processor._running:
            frame = processor.get_latest_frame()
        else:
            frame = None

        if frame is None:
            frame = placeholder

        ret, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
        if not ret:
            time.sleep(0.067)
            continue

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + jpeg.tobytes()
            + b"\r\n"
        )

        time.sleep(0.067)


def _make_placeholder_frame():
    import numpy as np
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    frame[:] = (20, 20, 30)

    cv2.putText(
        frame, "IP WEBCAM OFFLINE", (120, 230),
        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (100, 120, 140), 2, cv2.LINE_AA
    )
    cv2.putText(
        frame, "Configure URL to connect", (180, 270),
        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (70, 80, 100), 1, cv2.LINE_AA
    )
    return frame


@router.get("/ipwebcam/stream")
async def ip_webcam_stream():
    """
    MJPEG live stream endpoint.
    """
    return StreamingResponse(
        _generate_mjpeg_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )
