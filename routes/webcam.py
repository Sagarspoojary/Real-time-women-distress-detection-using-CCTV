"""
Webcam Routes — Live Laptop Webcam Control & MJPEG Stream
==========================================================

Endpoints:
  POST /api/v1/webcam/start   — Start the webcam background worker
  POST /api/v1/webcam/stop    — Stop the webcam background worker
  GET  /api/v1/webcam/status  — Return current worker status
  GET  /api/v1/webcam/stream  — MJPEG stream for browser <img> tag
"""

import logging
import time
from typing import Generator

import cv2
from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse

from modules.webcam_stream_processor import (
    WebcamStreamProcessor,
    get_active_processor,
    set_active_processor,
)
from modules.ip_webcam_processor import (
    get_active_processor as get_ip_processor,
    set_active_processor as set_ip_processor,
)

logger = logging.getLogger("webcam_routes")
router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Start
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/webcam/start")
async def start_webcam():
    """Start the live webcam AI processing worker."""
    existing = get_active_processor()
    if existing and existing._running:
        return JSONResponse(
            content={"status": "already_running", "camera_id": existing.camera_id},
            status_code=200,
        )

    # Stop IP webcam if it is running to free resources
    ip_processor = get_ip_processor()
    if ip_processor and ip_processor._running:
        ip_processor.stop()
        set_ip_processor(None)

    processor = WebcamStreamProcessor(camera_id="WEBCAM-01", location="Live Camera")
    started = processor.start()

    if started:
        set_active_processor(processor)
        logger.info("[WebcamRoutes] Webcam started successfully.")
        return JSONResponse(content={"status": "started", "camera_id": "WEBCAM-01"}, status_code=200)
    else:
        return JSONResponse(content={"status": "failed", "detail": "Could not start webcam."}, status_code=500)


# ─────────────────────────────────────────────────────────────────────────────
# Stop
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/webcam/stop")
async def stop_webcam():
    """Stop the live webcam AI processing worker."""
    processor = get_active_processor()
    if not processor or not processor._running:
        return JSONResponse(content={"status": "not_running"}, status_code=200)

    processor.stop()
    set_active_processor(None)
    logger.info("[WebcamRoutes] Webcam stopped.")
    return JSONResponse(content={"status": "stopped"}, status_code=200)


# ─────────────────────────────────────────────────────────────────────────────
# Status
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/webcam/status")
async def webcam_status():
    """Return current webcam processor status."""
    processor = get_active_processor()
    if not processor:
        return JSONResponse(content={
            "running": False,
            "camera_id": None,
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
    """
    Generator that yields JPEG-encoded frames as multipart/x-mixed-replace boundaries.
    The browser's native <img src="/api/v1/webcam/stream"> renders this as a live feed.
    Streams at ~15 fps (one frame every ~67ms) to balance smoothness vs. CPU load.
    """
    # Offline placeholder frame (shown when webcam is not running)
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

        time.sleep(0.067)  # ~15 fps


def _make_placeholder_frame():
    """Create a 640x480 dark placeholder frame shown when webcam is offline."""
    import numpy as np
    frame = __import__("numpy").zeros((480, 640, 3), dtype=__import__("numpy").uint8)
    frame[:] = (20, 20, 30)  # dark navy

    cv2.putText(
        frame, "WEBCAM OFFLINE", (160, 230),
        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (100, 120, 140), 2, cv2.LINE_AA
    )
    cv2.putText(
        frame, "Click 'Start Webcam' to begin", (100, 270),
        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (70, 80, 100), 1, cv2.LINE_AA
    )
    return frame


@router.get("/webcam/stream")
async def webcam_stream():
    """
    MJPEG live stream endpoint.
    Browser usage: <img src="http://localhost:8000/api/v1/webcam/stream" />
    """
    return StreamingResponse(
        _generate_mjpeg_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )
