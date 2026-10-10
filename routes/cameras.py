from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import os
import json
import logging

from modules.rtsp_stream_processor import RTSPStreamProcessor

logger = logging.getLogger("camera_routes")
router = APIRouter()

CAMERAS_FILE = os.path.join("data", "cameras.json")

# In-memory dictionary tracking active RTSPStreamProcessor threads per camera_id
ACTIVE_PROCESSORS: Dict[str, RTSPStreamProcessor] = {}


class CameraConfig(BaseModel):
    camera_id: str
    name: str
    rtsp_url: str
    location: Optional[str] = "Main Entrance"
    enabled: Optional[bool] = True


def _load_cameras_from_disk() -> List[Dict[str, Any]]:
    if not os.path.exists(CAMERAS_FILE):
        default_cams = [{
            "camera_id": "CAM-01",
            "name": "Main Entrance Camera",
            "rtsp_url": "rtsp://admin:password@192.168.1.100:554/stream",
            "location": "Main Entrance",
            "enabled": False
        }]
        _save_cameras_to_disk(default_cams)
        return default_cams
    try:
        with open(CAMERAS_FILE, "r") as f:
            return json.load(f).get("cameras", [])
    except Exception as e:
        logger.error(f"[CameraRoutes] Error loading cameras file: {e}")
        return []


def _save_cameras_to_disk(cameras: List[Dict[str, Any]]):
    os.makedirs("data", exist_ok=True)
    with open(CAMERAS_FILE, "w") as f:
        json.dump({"cameras": cameras}, f, indent=4)


def mask_rtsp_url(url: str) -> str:
    if "@" in url:
        parts = url.split("@")
        prefix = parts[0].split("//")[0] + "//****:****"
        return f"{prefix}@{parts[1]}"
    return url


@router.get("/cameras")
async def get_cameras():
    cameras = _load_cameras_from_disk()
    safe_cams = []
    for c in cameras:
        safe_cams.append({
            "camera_id": c["camera_id"],
            "name": c["name"],
            "rtsp_url": mask_rtsp_url(c["rtsp_url"]),
            "location": c.get("location", "Main Entrance"),
            "enabled": c.get("enabled", False),
            "is_running": c["camera_id"] in ACTIVE_PROCESSORS
        })
    return {"cameras": safe_cams}


@router.post("/cameras")
async def add_or_update_camera(cam: CameraConfig):
    cameras = _load_cameras_from_disk()
    existing_idx = next((i for i, c in enumerate(cameras) if c["camera_id"] == cam.camera_id), None)
    
    new_data = {
        "camera_id": cam.camera_id,
        "name": cam.name,
        "rtsp_url": cam.rtsp_url,
        "location": cam.location or "Main Entrance",
        "enabled": bool(cam.enabled)
    }

    if existing_idx is not None:
        cameras[existing_idx] = new_data
    else:
        cameras.append(new_data)

    _save_cameras_to_disk(cameras)
    return {"status": "success", "camera_id": cam.camera_id}


@router.post("/cameras/{camera_id}/start")
async def start_camera(camera_id: str):
    cameras = _load_cameras_from_disk()
    target = next((c for c in cameras if c["camera_id"] == camera_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Camera not found.")

    if camera_id in ACTIVE_PROCESSORS:
        return {"status": "already_running", "camera_id": camera_id}

    processor = RTSPStreamProcessor(
        camera_id=target["camera_id"],
        camera_name=target["name"],
        rtsp_url=target["rtsp_url"],
        location=target.get("location", "Main Entrance")
    )
    processor.start()
    ACTIVE_PROCESSORS[camera_id] = processor
    return {"status": "started", "camera_id": camera_id}


@router.post("/cameras/{camera_id}/stop")
async def stop_camera(camera_id: str):
    if camera_id not in ACTIVE_PROCESSORS:
        return {"status": "not_running", "camera_id": camera_id}

    processor = ACTIVE_PROCESSORS.pop(camera_id)
    processor.stop()
    return {"status": "stopped", "camera_id": camera_id}
