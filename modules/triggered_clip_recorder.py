import os
import time
import logging
import threading
from collections import deque
from typing import Optional, Callable
import cv2
import numpy as np

logger = logging.getLogger("triggered_clip_recorder")

TRIGGERED_CLIPS_DIR = "outputs/triggered_clips"

class TriggeredClipRecorder:
    """
    A bounded rolling buffer that captures a 10-second clip (pre and post trigger) 
    when the person-count threshold is met, without blocking the live camera loop.
    """
    def __init__(self, fps: float = 15.0, width: int = 640, height: int = 480,
                 pre_trigger_seconds: float = 5.0, post_trigger_seconds: float = 5.0,
                 cooldown_seconds: float = 60.0,
                 on_clip_saved: Optional[Callable[[str], None]] = None):
        self.fps = fps
        self.width = width
        self.height = height
        
        self.pre_frames = int(fps * pre_trigger_seconds)
        self.post_frames = int(fps * post_trigger_seconds)
        self.cooldown_seconds = cooldown_seconds
        self.on_clip_saved = on_clip_saved
        
        self._buffer = deque(maxlen=self.pre_frames)
        self._lock = threading.Lock()
        
        # State
        self._state = "IDLE"  # IDLE, RECORDING
        self._post_frames_remaining = 0
        self._recording_frames = []
        self._last_trigger_time = 0.0
        
        os.makedirs(TRIGGERED_CLIPS_DIR, exist_ok=True)

    def update_dimensions(self, width: int, height: int):
        with self._lock:
            self.width = width
            self.height = height

    def add_frame(self, frame: np.ndarray):
        if frame is None:
            return
            
        with self._lock:
            if self._state == "IDLE":
                self._buffer.append(frame.copy())
            elif self._state == "RECORDING":
                self._recording_frames.append(frame.copy())
                self._post_frames_remaining -= 1
                
                if self._post_frames_remaining <= 0:
                    self._flush_recording_async()

    def trigger(self, source: str = "CAMERA", correlation_id: Optional[str] = None):
        """Called when the person count threshold is met."""
        with self._lock:
            if self._state != "IDLE":
                return
                
            now = time.time()
            if now - self._last_trigger_time < self.cooldown_seconds:
                remaining = int(self.cooldown_seconds - (now - self._last_trigger_time))
                logger.debug(f"[TriggeredClipRecorder] [{source}] Trigger ignored due to cooldown ({remaining}s remaining).")
                return
                
            import uuid
            corr_id = correlation_id or uuid.uuid4().hex[:8]
            self._current_source = source
            self._current_correlation_id = corr_id

            formatted_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(now))
            logger.info(
                f"[TriggeredClipRecorder] [{source}] [{corr_id}] Trigger activated at {formatted_time} | "
                f"Pre-trigger frames buffered: {len(self._buffer)} | "
                f"Collecting {self.post_frames} post-trigger frames..."
            )
            self._state = "RECORDING"
            self._post_frames_remaining = self.post_frames
            # Start the recording buffer with the pre-trigger frames
            self._recording_frames = list(self._buffer)
            self._last_trigger_time = now

    def _flush_recording_async(self):
        """Asynchronously write the collected frames to disk and notify callback."""
        frames_to_save = self._recording_frames
        source = getattr(self, "_current_source", "CAMERA")
        corr_id = getattr(self, "_current_correlation_id", None)
        
        # Reset state immediately to keep camera loop completely unblocked
        self._state = "IDLE"
        self._recording_frames = []
        self._buffer.clear()
        
        # Write to disk in a separate thread
        threading.Thread(
            target=self._write_video_and_notify,
            args=(frames_to_save, time.time(), source, corr_id),
            daemon=True
        ).start()

    def _write_video_and_notify(self, frames, timestamp, source: str = "CAMERA", correlation_id: Optional[str] = None):
        import uuid
        corr_id = correlation_id or uuid.uuid4().hex[:8]
        if not frames or len(frames) == 0:
            logger.error(f"[TriggeredClipRecorder] [{source}] [{corr_id}] No frames collected to write triggered clip. Aborting.")
            return

        filename = f"triggered_{int(timestamp)}_{corr_id}.mp4"
        video_path = os.path.join(TRIGGERED_CLIPS_DIR, filename)
        logger.info(
            f"[TriggeredClipRecorder] [{source}] [{corr_id}] Recording completion: Writing {len(frames)} frames to '{video_path}' "
            f"at target resolution {self.width}x{self.height} @ {self.fps} FPS..."
        )
        
        try:
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            out = cv2.VideoWriter(video_path, fourcc, self.fps, (self.width, self.height))
            
            if not out.isOpened():
                logger.error(f"[TriggeredClipRecorder] [{source}] [{corr_id}] VideoWriter failed to open for '{video_path}'")
                return
                
            for frame in frames:
                if frame.shape[1] != self.width or frame.shape[0] != self.height:
                    frame = cv2.resize(frame, (self.width, self.height))
                out.write(frame)
                
            out.release()
            
            # File finalization & validation
            if not os.path.exists(video_path):
                logger.error(f"[TriggeredClipRecorder] [{source}] [{corr_id}] MP4 validation failed: File not found after release: '{video_path}'")
                return
                
            file_size = os.path.getsize(video_path)
            if file_size == 0:
                logger.error(f"[TriggeredClipRecorder] [{source}] [{corr_id}] MP4 validation failed: Written file is 0 bytes: '{video_path}'")
                return

            # Verify that the generated video can be decoded
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                logger.error(f"[TriggeredClipRecorder] [{source}] [{corr_id}] MP4 validation failed: Cannot open written video with cv2.VideoCapture: '{video_path}'")
                cap.release()
                return

            written_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            written_fps = cap.get(cv2.CAP_PROP_FPS) or self.fps
            written_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            written_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            ret, test_frame = cap.read()
            cap.release()

            if not ret or test_frame is None:
                logger.error(f"[TriggeredClipRecorder] [{source}] [{corr_id}] MP4 validation failed: Unable to decode test frame from '{video_path}'")
                return

            duration = written_frames / written_fps if written_fps > 0 else 0.0
            logger.info(
                f"[TriggeredClipRecorder] [{source}] [{corr_id}] Saved and finalized clip: '{video_path}' | "
                f"Size: {file_size} bytes | Frames: {written_frames} | Duration: {duration:.2f}s | "
                f"Resolution: {written_w}x{written_h} | MP4 Validation: PASSED"
            )
            
            if self.on_clip_saved:
                try:
                    self.on_clip_saved(video_path, source=source, correlation_id=corr_id)
                except TypeError:
                    try:
                        self.on_clip_saved(video_path, source=source)
                    except TypeError:
                        self.on_clip_saved(video_path)
                
        except Exception as e:
            logger.error(f"[TriggeredClipRecorder] [{source}] [{corr_id}] Error writing triggered clip: {e}", exc_info=True)


