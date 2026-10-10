"""
RTSPStreamProcessor — Real-Time CCTV Camera Processing Worker
=============================================================

Responsibilities:
1. Threaded OpenCV VideoCapture connection to RTSP camera feeds.
2. Rolling frame buffer holding exactly 16 frames for VideoMAE temporal input.
3. Automatic connection failure detection & exponential reconnect backoff.
4. Independent thread per camera instance to prevent multi-camera interference.
5. Ingests frames and feeds WomenDistressPipeline and AlertDispatcher.
"""

import time
import logging
import threading
from collections import deque
import cv2
import numpy as np

from modules.pipeline import WomenDistressPipeline
from services.alert_dispatcher import AlertDispatcher

logger = logging.getLogger("rtsp_stream_processor")


class RTSPStreamProcessor:
    def __init__(self, camera_id: str, camera_name: str, rtsp_url: str, location: str = "Main Entrance"):
        self.camera_id = camera_id
        self.camera_name = camera_name
        self.rtsp_url = rtsp_url
        self.location = location
        self.enabled = True

        self._running = False
        self._thread = None
        self._lock = threading.Lock()

        # Rolling frame buffer (VideoMAE requires 16 frames)
        self.frame_buffer = deque(maxlen=16)

        self.pipeline = WomenDistressPipeline()
        self.dispatcher = AlertDispatcher()

    def start(self):
        """Starts background RTSP processing worker thread."""
        with self._lock:
            if self._running:
                return
            self._running = True
            self._thread = threading.Thread(target=self._worker_loop, daemon=True)
            self._thread.start()
            logger.info(f"[RTSPWorker] Started stream processing for camera: {self.camera_id} ({self.camera_name})")

    def stop(self):
        """Stops background RTSP worker cleanly."""
        with self._lock:
            self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=3.0)
        logger.info(f"[RTSPWorker] Stopped stream processing for camera: {self.camera_id}")

    def mask_rtsp_url(self, url: str) -> str:
        """Mask credentials inside RTSP URL for safe logging."""
        if "@" in url:
            parts = url.split("@")
            prefix = parts[0].split("//")[0] + "//****:****"
            return f"{prefix}@{parts[1]}"
        return url

    def _worker_loop(self):
        reconnect_delay = 2.0
        masked_url = self.mask_rtsp_url(self.rtsp_url)

        while self._running:
            logger.info(f"[RTSPWorker] Connecting to camera {self.camera_id} at {masked_url}...")
            cap = cv2.VideoCapture(self.rtsp_url)

            if not cap.isOpened():
                logger.warning(f"[RTSPWorker] Connection failed for {self.camera_id}. Retrying in {reconnect_delay}s...")
                time.sleep(reconnect_delay)
                reconnect_delay = min(reconnect_delay * 1.5, 30.0)
                continue

            logger.info(f"[RTSPWorker] Connected successfully to camera {self.camera_id}.")
            reconnect_delay = 2.0  # Reset backoff on successful connect

            frame_count = 0
            while self._running and cap.isOpened():
                ret, frame = cap.read()
                if not ret or frame is None:
                    logger.warning(f"[RTSPWorker] Frame drop/disconnect detected on camera {self.camera_id}.")
                    break

                self.frame_buffer.append(frame)
                frame_count += 1

                # Sample every 5th frame to optimize CPU/GPU load while filling 16-frame VideoMAE buffer
                if len(self.frame_buffer) == 16 and frame_count % 5 == 0:
                    try:
                        # Process 16-frame window through WomenDistressPipeline
                        frames_list = list(self.frame_buffer)
                        result = self.pipeline.process_frames(frames_list)

                        # Trigger AlertDispatcher
                        self.dispatcher.maybe_dispatch(
                            pipeline_result=result,
                            video_path=f"rtsp_{self.camera_id}.mp4",
                            location_data={"latitude": None, "longitude": None}
                        )
                    except Exception as e:
                        logger.error(f"[RTSPWorker] Error processing frames on camera {self.camera_id}: {e}")

            cap.release()
            if self._running:
                logger.info(f"[RTSPWorker] Camera {self.camera_id} disconnected. Attempting reconnect in {reconnect_delay}s...")
                time.sleep(reconnect_delay)
