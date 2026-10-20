"""
routes/outputs.py — API Endpoints for Viewing & Managing Surveillance Outputs
=============================================================================

Exposes:
- Whole Images (alert snapshots & evidence frames in outputs/)
- Triggered Clips (video recordings in outputs/triggered_clips/)
- Debug Gender Crops (face/body crops in outputs/debug_gender/)
"""

import os
import re
import time
import shutil
import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

logger = logging.getLogger("routes.outputs")
router = APIRouter(tags=["Outputs"])

OUTPUTS_DIR = os.path.abspath("outputs")
TRIGGERED_CLIPS_DIR = os.path.join(OUTPUTS_DIR, "triggered_clips")
DEBUG_GENDER_DIR = os.path.join(OUTPUTS_DIR, "debug_gender")

# Ensure base directories exist
os.makedirs(OUTPUTS_DIR, exist_ok=True)
os.makedirs(TRIGGERED_CLIPS_DIR, exist_ok=True)
os.makedirs(DEBUG_GENDER_DIR, exist_ok=True)


def _format_size(size_bytes: int) -> str:
    """Format file size in human readable format."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"


def _is_safe_path(target_path: str) -> bool:
    """Ensure target path is strictly within the outputs directory."""
    try:
        resolved = os.path.abspath(target_path)
        return resolved.startswith(OUTPUTS_DIR) and os.path.exists(resolved)
    except Exception:
        return False


def _parse_gender_crop_filename(fname: str) -> Dict[str, Any]:
    """
    Parses gender crop naming convention:
    track{track_id:03d}_frame{frame_number:04d}_{gender.lower()}_{conf:.2f}{tag}.jpg
    """
    meta = {
        "track_id": None,
        "frame_number": None,
        "gender": "Unknown",
        "confidence": 0.0,
        "cached": False,
    }
    match = re.match(
        r"track(?P<track>\d+)_frame(?P<frame>\d+)_(?P<gender>[a-zA-Z]+)_(?P<conf>[\d\.]+)(?P<cached>_CACHED)?",
        fname,
    )
    if match:
        meta["track_id"] = int(match.group("track"))
        meta["frame_number"] = int(match.group("frame"))
        meta["gender"] = match.group("gender").capitalize()
        try:
            meta["confidence"] = float(match.group("conf"))
        except ValueError:
            pass
        meta["cached"] = bool(match.group("cached"))
    return meta


@router.get("/outputs")
async def get_outputs():
    """
    Returns all output artifacts categorized into:
    - whole_images: Alert snapshots and full-frame evidence in outputs/
    - triggered_clips: Triggered MP4 video clips in outputs/triggered_clips/
    - debug_gender: Gender classifier crop debug images in outputs/debug_gender/
    """
    whole_images: List[Dict[str, Any]] = []
    triggered_clips: List[Dict[str, Any]] = []
    debug_gender: List[Dict[str, Any]] = []

    # 1. Whole Images in outputs/ (exclude subdirectories)
    image_exts = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    video_exts = {".mp4", ".avi", ".mov", ".mkv", ".webm"}

    try:
        for fname in os.listdir(OUTPUTS_DIR):
            fpath = os.path.join(OUTPUTS_DIR, fname)
            if os.path.isfile(fpath):
                ext = os.path.splitext(fname)[1].lower()
                mtime = os.path.getmtime(fpath)
                size = os.path.getsize(fpath)
                item = {
                    "filename": fname,
                    "category": "whole_images",
                    "url": f"/outputs/{fname}",
                    "size_bytes": size,
                    "size_formatted": _format_size(size),
                    "created_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(mtime)),
                    "timestamp": mtime,
                    "type": "video" if ext in video_exts else "image",
                }
                if ext in image_exts:
                    whole_images.append(item)
                elif ext in video_exts and fname != "debug_tracking.mp4":
                    triggered_clips.append(item)
    except Exception as e:
        logger.error(f"[Outputs] Error scanning outputs directory: {e}")

    # 2. Triggered Clips in outputs/triggered_clips/
    try:
        if os.path.exists(TRIGGERED_CLIPS_DIR):
            for fname in os.listdir(TRIGGERED_CLIPS_DIR):
                fpath = os.path.join(TRIGGERED_CLIPS_DIR, fname)
                if os.path.isfile(fpath):
                    ext = os.path.splitext(fname)[1].lower()
                    if ext in video_exts or ext in image_exts:
                        mtime = os.path.getmtime(fpath)
                        size = os.path.getsize(fpath)
                        triggered_clips.append({
                            "filename": fname,
                            "category": "triggered_clips",
                            "url": f"/outputs/triggered_clips/{fname}",
                            "size_bytes": size,
                            "size_formatted": _format_size(size),
                            "created_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(mtime)),
                            "timestamp": mtime,
                            "type": "video" if ext in video_exts else "image",
                        })
    except Exception as e:
        logger.error(f"[Outputs] Error scanning triggered_clips: {e}")

    # 3. Debug Gender Crops in outputs/debug_gender/
    try:
        if os.path.exists(DEBUG_GENDER_DIR):
            for fname in os.listdir(DEBUG_GENDER_DIR):
                fpath = os.path.join(DEBUG_GENDER_DIR, fname)
                if os.path.isfile(fpath):
                    ext = os.path.splitext(fname)[1].lower()
                    if ext in image_exts:
                        mtime = os.path.getmtime(fpath)
                        size = os.path.getsize(fpath)
                        crop_meta = _parse_gender_crop_filename(fname)
                        debug_gender.append({
                            "filename": fname,
                            "category": "debug_gender",
                            "url": f"/outputs/debug_gender/{fname}",
                            "size_bytes": size,
                            "size_formatted": _format_size(size),
                            "created_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(mtime)),
                            "timestamp": mtime,
                            "type": "image",
                            **crop_meta,
                        })
    except Exception as e:
        logger.error(f"[Outputs] Error scanning debug_gender: {e}")

    # Sort all by newest first
    whole_images.sort(key=lambda x: x["timestamp"], reverse=True)
    triggered_clips.sort(key=lambda x: x["timestamp"], reverse=True)
    debug_gender.sort(key=lambda x: x["timestamp"], reverse=True)

    counts = {
        "whole_images": len(whole_images),
        "triggered_clips": len(triggered_clips),
        "debug_gender": len(debug_gender),
        "total": len(whole_images) + len(triggered_clips) + len(debug_gender),
    }

    return {
        "status": "success",
        "counts": counts,
        "data": {
            "whole_images": whole_images,
            "triggered_clips": triggered_clips,
            "debug_gender": debug_gender,
        },
    }


@router.delete("/outputs/file")
async def delete_output_file(path: str = Query(..., description="Relative path under outputs/")):
    """Safely delete an output file."""
    # Sanitize and resolve
    clean_path = path.lstrip("/").replace("\\", "/")
    if clean_path.startswith("outputs/"):
        clean_path = clean_path[len("outputs/"):]

    target_file = os.path.abspath(os.path.join(OUTPUTS_DIR, clean_path))
    if not _is_safe_path(target_file):
        raise HTTPException(status_code=400, detail="Invalid path or file does not exist.")

    try:
        os.remove(target_file)
        logger.info(f"[Outputs] Deleted file: {target_file}")
        return {"status": "success", "message": f"File '{os.path.basename(target_file)}' deleted successfully."}
    except Exception as e:
        logger.error(f"[Outputs] Error deleting {target_file}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
