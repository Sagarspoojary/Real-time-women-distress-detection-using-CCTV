"""
IP Webcam Routes — Live Mobile IP Webcam Centralized Management & MJPEG Stream
==============================================================================

Endpoints:
  GET  /api/v1/ipwebcam/config     — Retrieve current camera configuration (sanitized)
  PUT  /api/v1/ipwebcam/config     — Update and persist camera configuration (auto-reconnects active stream)
  POST /api/v1/ipwebcam/test       — Pre-flight reachability & latency handshake test
  POST /api/v1/ipwebcam/start      — Start/connect IP webcam background AI processor
  POST /api/v1/ipwebcam/connect    — Alias for start
  POST /api/v1/ipwebcam/stop       — Stop/disconnect IP webcam background AI processor
  POST /api/v1/ipwebcam/disconnect — Alias for stop
  GET  /api/v1/ipwebcam/status     — Combined connection & AI telemetry status
  GET  /api/v1/ipwebcam/stream     — MJPEG live video feed for frontend <img> tags
  POST /api/v1/ipwebcam/discover   — Bounded scan for local IP Webcam instances
"""

import logging
import time
from typing import Generator, Optional, Dict, Any
import cv2
from fastapi import APIRouter, HTTPException, Depends, Header, Body
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from modules.ip_webcam_processor import (
    IPWebcamStreamProcessor,
    get_active_processor,
    set_active_processor,
)
from modules.webcam_stream_processor import (
    get_active_processor as get_local_processor,
    set_active_processor as set_local_processor,
)
from services.camera_connection_service import (
    camera_connection_service,
    DEFAULT_CAMERA_ID
)

logger = logging.getLogger("ip_webcam_routes")
router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# Request / Response Schemas
# ─────────────────────────────────────────────────────────────────────────────

class CameraConfigPayload(BaseModel):
    name: Optional[str] = "Android IP Webcam"
    host: Optional[str] = None
    port: Optional[int] = 8080
    path: Optional[str] = "/videofeed"
    username: Optional[str] = None
    password: Optional[str] = None
    retain_existing_password: Optional[bool] = False
    auto_reconnect: Optional[bool] = True

class StartIPWebcamRequest(BaseModel):
    url: Optional[str] = None

class TestCameraRequest(BaseModel):
    host: Optional[str] = None
    port: Optional[int] = 8080
    path: Optional[str] = "/videofeed"
    username: Optional[str] = None
    password: Optional[str] = None

def verify_operator_role(x_user_role: Optional[str] = Header(None, alias="X-User-Role")) -> str:
    if x_user_role:
        role = x_user_role.strip().lower()
        if role in ("viewer", "guest", "readonly", "unauthorized"):
            raise HTTPException(
                status_code=403,
                detail="Operator or Administrator privileges required to manage camera settings."
            )
        return role
    return "operator"

# ─────────────────────────────────────────────────────────────────────────────
# Camera Configuration
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/ipwebcam/config")
async def get_ip_webcam_config():
    """Returns the persistent camera configuration with passwords safely omitted."""
    try:
        config = camera_connection_service.get_public_configuration()
        processor = get_active_processor()
        config["is_running"] = bool(processor and processor._running)
        if processor and processor._running:
            config["runtime_connection_state"] = getattr(processor, "_connection_state", "CONNECTED")
        else:
            config["runtime_connection_state"] = "DISCONNECTED"
        return {"status": "success", "config": config}
    except Exception as e:
        logger.error(f"[IPWebcamRoutes] Failed to get config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/ipwebcam/config")
async def update_ip_webcam_config(
    payload: CameraConfigPayload,
    user_role: str = Depends(verify_operator_role)
):
    """
    Validates and persists camera configuration.
    If the camera is currently connected, dynamically updates the address and
    reconnects the stream without restarting the application or reloading AI models.
    """
    try:
        data = payload.dict()
        updated_config = camera_connection_service.save_configuration(
            data=data,
            camera_id=DEFAULT_CAMERA_ID,
            updated_by=user_role
        )

        # Check if an active processor is running. If so, dynamically update its stream URL!
        processor = get_active_processor()
        reconnected = False
        if processor and processor._running:
            full_config = camera_connection_service.get_configuration(DEFAULT_CAMERA_ID)
            new_stream_url = camera_connection_service.build_stream_url(
                host=full_config.get("host"),
                port=full_config.get("port", 8080),
                path=full_config.get("path", "/videofeed"),
                username=full_config.get("username"),
                password=full_config.get("password"),
                mask_credentials=False
            )
            if new_stream_url:
                processor.update_stream_url(new_stream_url)
                reconnected = True
                logger.info("[IPWebcamRoutes] Dynamically reconnected active stream to new configuration.")

        return {
            "status": "success",
            "message": "Camera configuration updated and saved." + (" Stream reconnected dynamically." if reconnected else ""),
            "config": updated_config,
            "reconnected": reconnected
        }
    except ValueError as e:
        logger.warning(f"[IPWebcamRoutes] Validation error updating config: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[IPWebcamRoutes] Unexpected error updating config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────────────────────────────────────
# Test Connection
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/ipwebcam/test")
async def test_ip_webcam_connection(
    req: Optional[TestCameraRequest] = Body(default=None)
):
    """
    Performs a fast pre-flight handshake to verify camera reachability, latency,
    and credentials without starting long-running background AI workers.
    """
    try:
        host = req.host if req and req.host else None
        port = req.port if req and req.port else 8080
        path = req.path if req and req.path else "/videofeed"
        username = req.username if req else None
        password = req.password if req else None

        result = camera_connection_service.test_connection(
            host=host,
            port=port,
            path=path,
            username=username,
            password=password,
            timeout=3.0
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[IPWebcamRoutes] Test error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────────────────────────────────────
# Connect / Start
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/ipwebcam/start")
@router.post("/ipwebcam/connect")
async def start_ip_webcam(
    req: Optional[StartIPWebcamRequest] = Body(default=None)
):
    """
    Connects to the mobile IP webcam and starts live AI inference.
    Uses saved persistent configuration if no explicit URL is passed.
    """
    # 1. Resolve URL from request or persistent DB configuration
    full_config = camera_connection_service.get_configuration(DEFAULT_CAMERA_ID)

    if req and req.url and req.url.strip():
        try:
            stream_url = camera_connection_service.normalize_stream_url(req.url.strip())
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        stream_url = camera_connection_service.build_stream_url(
            host=full_config.get("host"),
            port=full_config.get("port", 8080),
            path=full_config.get("path", "/videofeed"),
            username=full_config.get("username"),
            password=full_config.get("password"),
            mask_credentials=False
        )

    if not stream_url:
        raise HTTPException(
            status_code=400,
            detail="Camera is not configured. Please enter the phone's IP address in Camera Settings first."
        )

    # 2. Check if already running on the same URL
    existing = get_active_processor()
    if existing and existing._running:
        if existing.stream_url == stream_url:
            return JSONResponse(
                content={"status": "already_running", "camera_id": existing.camera_id},
                status_code=200,
            )
        else:
            # Address changed: update existing stream without tearing down AI models
            existing.update_stream_url(stream_url)
            return JSONResponse(
                content={"status": "reconnected", "camera_id": existing.camera_id},
                status_code=200
            )

    # 3. Stop local webcam if it is running to prevent hardware resource contention
    local_processor = get_local_processor()
    if local_processor and local_processor._running:
        local_processor.stop()
        set_local_processor(None)

    # 4. Instantiate or reuse pipeline to avoid duplicating PyTorch weights
    pipeline_instance = None
    if existing:
        pipeline_instance = getattr(existing, "_pipeline", None)

    try:
        processor = IPWebcamStreamProcessor(
            stream_url=stream_url,
            camera_id=DEFAULT_CAMERA_ID,
            location=full_config.get("name", "Mobile Camera"),
            pipeline=pipeline_instance
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    started = processor.start()

    if started:
        set_active_processor(processor)
        logger.info(f"[IPWebcamRoutes] IP Webcam processor started for {camera_connection_service.mask_url(stream_url)}.")
        return JSONResponse(content={"status": "started", "camera_id": processor.camera_id}, status_code=200)
    else:
        return JSONResponse(content={"status": "failed", "detail": "Could not start IP webcam processor."}, status_code=500)

# ─────────────────────────────────────────────────────────────────────────────
# Disconnect / Stop
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/ipwebcam/stop")
@router.post("/ipwebcam/disconnect")
async def stop_ip_webcam():
    """Disconnects the IP webcam and stops live AI processing."""
    processor = get_active_processor()
    if not processor or not processor._running:
        camera_connection_service.update_connection_state(False)
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
    """Returns comprehensive connection and AI telemetry status."""
    config = camera_connection_service.get_public_configuration()
    processor = get_active_processor()

    if not processor:
        return JSONResponse(content={
            "running": False,
            "connection_state": "DISCONNECTED" if config.get("is_configured") else "UNCONFIGURED",
            "camera_id": config.get("camera_id"),
            "camera_name": config.get("name"),
            "is_configured": config.get("is_configured"),
            "stream_url": config.get("active_url_masked"),
            "frames_processed": 0,
            "uptime_seconds": 0,
            "camera_fps": 0.0,
            "ai_fps": 0.0,
            "inference_time_ms": 0.0,
            "predicted_class": "Normal",
            "confidence": 0.0,
            "threat_state": "NORMAL",
            "threat_active": False,
            "alert_status": "IDLE",
            "last_incident_id": None,
            "last_threat_time": None,
            "evidence_buffer_size": 0,
            "last_connected_at": config.get("last_connected_at"),
            "last_error": config.get("last_error"),
            "source": config.get("source")
        }, status_code=200)

    proc_status = processor.status()
    proc_status["camera_name"] = config.get("name")
    proc_status["is_configured"] = config.get("is_configured")
    proc_status["last_connected_at"] = config.get("last_connected_at")
    if not proc_status.get("last_error"):
        proc_status["last_error"] = config.get("last_error")

    return JSONResponse(content=proc_status, status_code=200)

# ─────────────────────────────────────────────────────────────────────────────
# Local Rediscovery
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/ipwebcam/discover")
async def discover_ip_webcams(
    user_role: str = Depends(verify_operator_role)
):
    """
    Scans the local subnet on port 8080 to discover active IP Webcam servers.
    Bounded to the local /24 subnet.
    """
    try:
        cameras = camera_connection_service.discover_local_cameras()
        return {
            "status": "success",
            "discovered_count": len(cameras),
            "cameras": cameras
        }
    except Exception as e:
        logger.error(f"[IPWebcamRoutes] Discovery error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        frame, "IP WEBCAM OFFLINE", (120, 220),
        cv2.FONT_HERSHEY_SIMPLEX, 0.95, (100, 120, 150), 2, cv2.LINE_AA
    )
    cv2.putText(
        frame, "Connect via Dashboard Camera Settings", (140, 265),
        cv2.FONT_HERSHEY_SIMPLEX, 0.50, (70, 85, 110), 1, cv2.LINE_AA
    )
    return frame

@router.get("/ipwebcam/stream")
async def ip_webcam_stream():
    """
    MJPEG live stream endpoint for standard browser <img> tag consumption.
    Reads from the single capture processor so there are no competing streams.
    """
    return StreamingResponse(
        _generate_mjpeg_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )
