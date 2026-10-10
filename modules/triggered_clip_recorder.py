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

    def trigger(self):
        """Called when the person count threshold is met."""
        with self._lock:
            if self._state != "IDLE":
                return
                
            now = time.time()
            if now - self._last_trigger_time < self.cooldown_seconds:
                return
                
            logger.info("[TriggeredClipRecorder] Trigger activated! Collecting post-trigger frames...")
            self._state = "RECORDING"
            self._post_frames_remaining = self.post_frames
            # Start the recording buffer with the pre-trigger frames
            self._recording_frames = list(self._buffer)
            self._last_trigger_time = now

    def _flush_recording_async(self):
        """Asynchronously write the collected frames to disk and notify callback."""
        frames_to_save = self._recording_frames
        
        # Reset state immediately to keep camera loop completely unblocked
        self._state = "IDLE"
        self._recording_frames = []
        self._buffer.clear()
        
        # Write to disk in a separate thread
        threading.Thread(
            target=self._write_video_and_notify,
            args=(frames_to_save, time.time()),
            daemon=True
        ).start()

    def _write_video_and_notify(self, frames, timestamp):
        filename = f"triggered_{int(timestamp)}.mp4"
        video_path = os.path.join(TRIGGERED_CLIPS_DIR, filename)
        
        try:
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            out = cv2.VideoWriter(video_path, fourcc, self.fps, (self.width, self.height))
            
            if not out.isOpened():
                logger.error(f"[TriggeredClipRecorder] VideoWriter failed for {video_path}")
                return
                
            for frame in frames:
                if frame.shape[1] != self.width or frame.shape[0] != self.height:
                    frame = cv2.resize(frame, (self.width, self.height))
                out.write(frame)
                
            out.release()
            logger.info(f"[TriggeredClipRecorder] Saved triggered clip: {video_path}")
            
            if self.on_clip_saved:
                self.on_clip_saved(video_path)
                
        except Exception as e:
            logger.error(f"[TriggeredClipRecorder] Error writing triggered clip: {e}")
