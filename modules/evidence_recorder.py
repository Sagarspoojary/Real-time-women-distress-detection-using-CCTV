"""
EvidenceRecorder — Saves a short video clip + snapshot frame at the moment violence is detected
================================================================================================

Responsibilities:
1. Maintain a rolling circular buffer of the last BUFFER_SIZE BGR frames from the webcam.
2. On threat detection, flush the buffer to disk as an MP4 video clip (H.264 via OpenCV).
3. Save the current frame as a JPEG snapshot alongside the clip.
4. Return (video_path, snapshot_path) to the caller (WebcamStreamProcessor).
5. Never raise exceptions to the caller — isolate all I/O errors internally.
"""

import os
import logging
import threading
from collections import deque
from typing import Tuple, Optional

import cv2
import numpy as np

logger = logging.getLogger("evidence_recorder")

# Default: buffer ~5 seconds at 30 fps
DEFAULT_BUFFER_FRAMES: int = int(os.environ.get("EVIDENCE_BUFFER_FRAMES", "150"))
EVIDENCE_DIR: str = "outputs"


class EvidenceRecorder:
    """
    Thread-safe rolling frame buffer that saves evidence clips + snapshots
    when a threat is detected by the AI pipeline.
    """

    def __init__(self, fps: float = 20.0, width: int = 640, height: int = 480,
                 buffer_frames: int = DEFAULT_BUFFER_FRAMES):
        """
        Args:
            fps: Frames-per-second written into the output video. Should match capture FPS.
            width: Frame width in pixels.
            height: Frame height in pixels.
            buffer_frames: Maximum number of frames held in the rolling evidence buffer.
        """
        self._fps = fps
        self._width = width
        self._height = height
        self._buffer: deque = deque(maxlen=buffer_frames)
        self._lock = threading.Lock()
        os.makedirs(EVIDENCE_DIR, exist_ok=True)

    def add_frame(self, frame: np.ndarray) -> None:
        """Append a BGR frame to the rolling evidence buffer."""
        if frame is None:
            return
        with self._lock:
            self._buffer.append(frame.copy())

    def update_dimensions(self, width: int, height: int) -> None:
        """Update the recorded video resolution (called when webcam dimensions are known)."""
        self._width = width
        self._height = height

    def save_evidence(self, incident_id: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Flush the current evidence buffer to disk as an MP4 clip + JPEG snapshot.

        Args:
            incident_id: Unique incident identifier (e.g. "INC-20260913140000-AB12CD").

        Returns:
            (video_path, snapshot_path) — absolute-ish paths, or (None, None) on failure.
        """
        with self._lock:
            frames_snapshot = list(self._buffer)

        if not frames_snapshot:
            logger.warning(f"[EvidenceRecorder] No frames in buffer for incident {incident_id}.")
            return None, None

        video_path = os.path.join(EVIDENCE_DIR, f"incident_{incident_id}.mp4")
        snapshot_path = os.path.join(EVIDENCE_DIR, f"incident_{incident_id}.jpg")

        # --- Write JPEG snapshot (middle frame of the buffer for best context) ---
        mid_frame = frames_snapshot[len(frames_snapshot) // 2]
        try:
            cv2.imwrite(snapshot_path, mid_frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
            logger.info(f"[EvidenceRecorder] Snapshot saved: {snapshot_path}")
        except Exception as e:
            logger.error(f"[EvidenceRecorder] Snapshot write failed: {e}")
            snapshot_path = None

        # --- Write MP4 video clip ---
        try:
            # Try mp4v first (widely supported on Windows via OpenCV)
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            out = cv2.VideoWriter(video_path, fourcc, self._fps, (self._width, self._height))

            if not out.isOpened():
                logger.error(f"[EvidenceRecorder] VideoWriter failed to open for {video_path}. Skipping clip.")
                return None, snapshot_path

            for frame in frames_snapshot:
                # Resize frame if it doesn't match configured dimensions
                if frame.shape[1] != self._width or frame.shape[0] != self._height:
                    frame = cv2.resize(frame, (self._width, self._height))
                out.write(frame)

            out.release()
            logger.info(f"[EvidenceRecorder] Video clip saved: {video_path} ({len(frames_snapshot)} frames @ {self._fps}fps)")
        except Exception as e:
            logger.error(f"[EvidenceRecorder] Video write failed: {e}")
            video_path = None

        return video_path, snapshot_path

    def clear(self) -> None:
        """Clear the evidence buffer (e.g. after stopping the webcam)."""
        with self._lock:
            self._buffer.clear()

    @property
    def buffer_size(self) -> int:
        """Current number of frames in the evidence buffer."""
        with self._lock:
            return len(self._buffer)
