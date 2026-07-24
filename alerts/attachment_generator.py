"""
alerts/attachment_generator.py
================================
Generates two alert attachments:

  1. snapshot.jpg  — the exact frame where distress was confirmed
  2. distress_clip.mp4 — 5-second clip before + 5-second clip after the event

How snapshot works:
  The frame (numpy array) captured at the moment of distress detection
  is JPEG-encoded in memory and returned as bytes. No disk write required
  for the snapshot itself — it is attached directly to the email.

How clip works:
  FFmpeg is used to cut the source video from (detection_time - CLIP_BEFORE)
  to (detection_time + CLIP_AFTER). This keeps the clip short and relevant.
  The output is saved to outputs/alerts/ with a unique filename per alert.
  FFmpeg must be available on PATH.
"""

import os
import cv2
import logging
import subprocess
import tempfile
from datetime import datetime

from alerts.smtp_config import (
    CLIP_SECONDS_BEFORE,
    CLIP_SECONDS_AFTER,
    ALERTS_OUTPUT_DIR,
)

logger = logging.getLogger("alerts.attachments")


def generate_snapshot(frame) -> bytes | None:
    """
    Encode the given OpenCV frame (numpy BGR array) as JPEG bytes.

    Args:
        frame: numpy ndarray (BGR) — the distress detection frame.

    Returns:
        JPEG bytes if successful, None on failure.
    """
    if frame is None:
        logger.warning("[Snapshot] No frame provided — skipping snapshot.")
        return None
    try:
        success, buffer = cv2.imencode(
            ".jpg", frame,
            [cv2.IMWRITE_JPEG_QUALITY, 92]
        )
        if not success:
            logger.warning("[Snapshot] JPEG encode failed.")
            return None
        return buffer.tobytes()
    except Exception as e:
        logger.error(f"[Snapshot] Error encoding frame: {e}")
        return None


def generate_clip(
    video_path: str,
    detection_frame: int,
    fps: float,
    track_id: int,
) -> str | None:
    """
    Extract a short video clip centred around the detection frame.

    Args:
        video_path:       Path to the original source video.
        detection_frame:  Frame number where distress was confirmed.
        fps:              Frames per second of the source video.
        track_id:         Track ID of the distressed person (for filename).

    Returns:
        Absolute path to the saved clip file, or None on failure.
    """
    if not os.path.exists(video_path):
        logger.warning(f"[Clip] Source video not found: {video_path}")
        return None

    if fps <= 0:
        fps = 25.0  # safe fallback

    os.makedirs(ALERTS_OUTPUT_DIR, exist_ok=True)

    # Calculate start/end times in seconds
    detection_sec = detection_frame / fps
    start_sec = max(0.0, detection_sec - CLIP_SECONDS_BEFORE)
    duration_sec = CLIP_SECONDS_BEFORE + CLIP_SECONDS_AFTER

    # Unique filename per alert
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    clip_filename = f"distress_clip_track{track_id}_{ts}.mp4"
    clip_path = os.path.join(ALERTS_OUTPUT_DIR, clip_filename)

    cmd = [
        "ffmpeg",
        "-y",                         # overwrite without prompt
        "-ss", str(round(start_sec, 3)),
        "-i", video_path,
        "-t", str(round(duration_sec, 3)),
        "-vcodec", "libx264",
        "-acodec", "aac",
        "-pix_fmt", "yuv420p",
        "-loglevel", "error",
        clip_path,
    ]

    try:
        subprocess.run(cmd, check=True, timeout=60)
        size_kb = os.path.getsize(clip_path) / 1024
        logger.info(
            f"[Clip] Saved: {clip_path} "
            f"({CLIP_SECONDS_BEFORE}s before + {CLIP_SECONDS_AFTER}s after "
            f"frame {detection_frame}, {size_kb:.1f} KB)"
        )
        return clip_path
    except subprocess.TimeoutExpired:
        logger.error("[Clip] FFmpeg timed out.")
        return None
    except subprocess.CalledProcessError as e:
        logger.error(f"[Clip] FFmpeg failed (exit {e.returncode}): {e}")
        return None
    except Exception as e:
        logger.error(f"[Clip] Unexpected error: {e}")
        return None
