"""
IPWebcamStreamProcessor — Real-Time Mobile IP Webcam Violence Detection Worker
=============================================================================

Responsibilities:
1. Opens a Mobile IP Webcam MJPEG stream via cv2.VideoCapture(url).
2. Validates URL to prevent SSRF vulnerabilities.
3. Feeds two rolling buffers (16-frame VideoMAE buffer, 150-frame evidence buffer).
4. Handles network disconnects, timeouts, and malformed streams cleanly without crashing FastAPI.
5. Reuses the exact same AI inference architecture as the laptop webcam.
"""

import os
import time
import logging
import threading
from urllib.parse import urlparse
from collections import deque
from typing import Optional, Dict, Any

import cv2
import numpy as np

from modules.pipeline import WomenDistressPipeline
from modules.evidence_recorder import EvidenceRecorder
from modules.triggered_clip_recorder import TriggeredClipRecorder
from services.triggered_clip_service import on_triggered_clip_saved
from services.alert_dispatcher import AlertDispatcher

logger = logging.getLogger("ip_webcam_processor")

# Configuration
INFERENCE_EVERY_N_FRAMES: int = int(os.environ.get("IP_WEBCAM_INFERENCE_EVERY_N", "30"))
VIOLENCE_CONFIRMATION_COUNT: int = int(os.environ.get("VIOLENCE_CONFIRMATION_COUNT", "2"))
RECOVERY_PERIOD_SECONDS: int = int(os.environ.get("RECOVERY_PERIOD_SECONDS", "30"))

TRIGGER_PERSON_COUNT: int = int(os.environ.get("TRIGGER_PERSON_COUNT", "2"))
TRIGGER_PERSISTENCE_SECONDS: float = float(os.environ.get("TRIGGER_PERSISTENCE_SECONDS", "2.0"))

_active_processor: Optional["IPWebcamStreamProcessor"] = None
_processor_lock = threading.Lock()


def get_active_processor() -> Optional["IPWebcamStreamProcessor"]:
    return _active_processor

def set_active_processor(processor: Optional["IPWebcamStreamProcessor"]) -> None:
    global _active_processor
    with _processor_lock:
        _active_processor = processor


class IPWebcamStreamProcessor:
    def __init__(self, stream_url: str, camera_id: str = "IP-WEBCAM-01", location: str = "Mobile Camera"):
        self.stream_url = stream_url
        self.camera_id = camera_id
        self.location = location

        # SSRF Protection
        self._validate_url(stream_url)

        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()

        # Buffers
        self._frame_buffer: deque = deque(maxlen=16)
        self._latest_frame: Optional[np.ndarray] = None
        self._frame_lock = threading.Lock()
        self._recorder = EvidenceRecorder()
        self._triggered_clip_recorder = TriggeredClipRecorder(
            fps=15.0,
            on_clip_saved=on_triggered_clip_saved
        )
        self._trigger_start_time = 0.0

        # AI + Alerting
        self._pipeline = WomenDistressPipeline()
        self._dispatcher = AlertDispatcher()

        # Status tracking
        self._start_time: Optional[float] = None
        self._frames_processed: int = 0
        self._consecutive_threats: int = 0
        self._threat_active: bool = False
        self._last_threat_time: Optional[float] = None
        self._last_incident_id: Optional[str] = None
        
        # Telemetry
        self._camera_fps: float = 0.0
        self._ai_fps: float = 0.0
        self._inference_time_ms: float = 0.0
        self._frame_timestamps: deque = deque(maxlen=30)
        self._inference_timestamps: deque = deque(maxlen=10)
        self._predicted_class: str = "Normal"
        self._latest_persons = []
        self._confidence: float = 0.0
        self._threat_state: str = "NORMAL"
        self._alert_status: str = "IDLE"
        self._ai_busy = False
        self._yolo_busy = False

    def _validate_url(self, url: str) -> None:
        """Prevent SSRF by ensuring only safe schemes are used."""
        parsed = urlparse(url)
        if parsed.scheme not in ["http", "https", "rtsp"]:
            raise ValueError(f"Invalid URL scheme '{parsed.scheme}'. Only http, https, and rtsp are permitted.")
        
        # Basic restriction against internal AWS/GCP metadata endpoints
        if parsed.hostname in ["169.254.169.254", "localhost", "127.0.0.1"]:
            # Note: Allow localhost for testing, but block cloud metadata.
            if parsed.hostname == "169.254.169.254":
                raise ValueError("Access to cloud metadata endpoints is forbidden.")

    def start(self) -> bool:
        with self._lock:
            if self._running:
                logger.warning(f"[IP_CAMERA] Already running on {self.stream_url}.")
                return False
            self._running = True
            self._start_time = time.monotonic()
            self._thread = threading.Thread(target=self._worker_loop, name="IPWebcamWorker", daemon=True)
            self._thread.start()
            logger.info(f"[IP_CAMERA] Started | camera_id={self.camera_id}")
            return True

    def stop(self) -> None:
        with self._lock:
            self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5.0)
        self._recorder.clear()
        with self._frame_lock:
            self._latest_frame = None
        logger.info(f"[IP_CAMERA] Stopped camera {self.camera_id}.")

    def get_latest_frame(self) -> Optional[np.ndarray]:
        with self._frame_lock:
            return self._latest_frame.copy() if self._latest_frame is not None else None

    def status(self) -> Dict[str, Any]:
        uptime = (time.monotonic() - self._start_time) if self._start_time else 0.0
        return {
            "running": self._running,
            "camera_id": self.camera_id,
            "stream_url": self.stream_url,
            "frames_processed": self._frames_processed,
            "uptime_seconds": round(uptime, 1),
            "camera_fps": round(self._camera_fps, 1),
            "ai_fps": round(self._ai_fps, 1),
            "inference_time_ms": round(self._inference_time_ms, 1),
            "predicted_class": self._predicted_class,
            "confidence": round(self._confidence, 1),
            "threat_state": self._threat_state,
            "threat_active": self._threat_active,
            "alert_status": self._alert_status,
            "last_incident_id": self._last_incident_id,
            "last_threat_time": self._last_threat_time,
            "evidence_buffer_size": self._recorder.buffer_size,
        }

    def _worker_loop(self) -> None:
        reconnect_delay = 2.0
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "timeout;5000" # 5s timeout to prevent hanging on disconnect

        while self._running:
            cap = cv2.VideoCapture(self.stream_url, cv2.CAP_FFMPEG)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 2) # Reduce buffer size for lower latency on mobile IP cams

            if not cap.isOpened():
                logger.warning(f"[IP_CAMERA] Could not open {self.stream_url}. Retrying in {reconnect_delay}s...")
                time.sleep(reconnect_delay)
                reconnect_delay = min(reconnect_delay * 1.5, 30.0)
                continue

            actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            actual_fps = cap.get(cv2.CAP_PROP_FPS) or 15.0
            if actual_w > 0 and actual_h > 0:
                self._recorder.update_dimensions(actual_w, actual_h)
                self._triggered_clip_recorder.update_dimensions(actual_w, actual_h)

            logger.info(f"[IP_CAMERA] Connected to {self.stream_url} ({actual_w}x{actual_h} @ {actual_fps:.1f} FPS)")
            reconnect_delay = 2.0
            frame_count = 0
            
            # Watchdog for dead streams that don't return False from read() immediately
            last_frame_time = time.time()

            while self._running and cap.isOpened():
                # Check watchdog
                if time.time() - last_frame_time > 10.0:
                    logger.warning("[IP_CAMERA] Stream watchdog timeout. No frames received in 10s.")
                    break

                ret, frame = cap.read()
                if not ret or frame is None:
                    logger.warning("[IP_CAMERA] Frame read failed or stream ended.")
                    break
                
                last_frame_time = time.time()
                now = time.monotonic()
                frame_count += 1
                self._frames_processed += 1

                self._frame_timestamps.append(now)
                if len(self._frame_timestamps) > 1:
                    dt = self._frame_timestamps[-1] - self._frame_timestamps[0]
                    if dt > 0:
                        self._camera_fps = (len(self._frame_timestamps) - 1) / dt

                frame_to_stream = frame.copy()
                for p in self._latest_persons:
                    self._pipeline.model3.draw_premium_box(
                        frame_to_stream, 
                        p["bbox"][0], p["bbox"][1], p["bbox"][2], p["bbox"][3],
                        track_id=p["track_id"],
                        conf=p["confidence"],
                        gender=p["gender"],
                        weapon=p["weapon_type"] if p["weapon_detected"] else "None",
                        pose=p["pose"],
                        threat="High" if p["distress"] else "Low",
                        identity=p["identity"],
                        gender_confidence=p["gender_confidence"]
                    )
                with self._frame_lock:
                    self._latest_frame = frame_to_stream

                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                self._frame_buffer.append(rgb_frame)
                self._recorder.add_frame(frame)
                self._triggered_clip_recorder.add_frame(frame)

                # Trigger non-blocking YOLO inference
                if not self._yolo_busy:
                    self._yolo_busy = True
                    threading.Thread(
                        target=self._run_yolo_async,
                        args=(frame.copy(), frame_count),
                        daemon=True
                    ).start()

                if len(self._frame_buffer) == 16 and frame_count % INFERENCE_EVERY_N_FRAMES == 0:
                    if not self._ai_busy:
                        self._ai_busy = True
                        frames_snapshot = list(self._frame_buffer)
                        threading.Thread(
                            target=self._run_inference_async,
                            args=(frames_snapshot,),
                            daemon=True
                        ).start()

            cap.release()
            if self._running:
                logger.info(f"[IP_CAMERA] Reconnecting in {reconnect_delay}s...")
                time.sleep(reconnect_delay)

    def _run_yolo_async(self, frame: np.ndarray, frame_count: int) -> None:
        try:
            has_distress = self._threat_active or (self._threat_state == "THREAT ACTIVE")
            result = self._pipeline.process_yolo(frame, frame_count, has_distress)
            self._latest_persons = result.get("persons", [])
            
            # TRIGGER LOGIC
            person_count = result.get("model3", {}).get("people_detected", len(self._latest_persons))
            if person_count >= TRIGGER_PERSON_COUNT:
                if self._trigger_start_time == 0.0:
                    self._trigger_start_time = time.time()
                elif time.time() - self._trigger_start_time >= TRIGGER_PERSISTENCE_SECONDS:
                    self._triggered_clip_recorder.trigger()
                    self._trigger_start_time = 0.0
            else:
                self._trigger_start_time = 0.0
                
        except Exception as e:
            logger.error(f"[IP_CAMERA] YOLO execution error: {e}")
        finally:
            self._yolo_busy = False

    def _run_inference_async(self, frames: list) -> None:
        try:
            import torch
            start_t = time.monotonic()
            result = self._pipeline.process_videomae(frames)
            if torch.cuda.is_available():
                torch.cuda.synchronize()
            end_t = time.monotonic()

            latency_ms = (end_t - start_t) * 1000.0
            self._inference_time_ms = latency_ms

            # Track Prediction-Update Interval and AI FPS (Instantaneous)
            if self._inference_timestamps:
                dt = end_t - self._inference_timestamps[-1]
                if dt > 0:
                    # ai_fps reflects the rate at which predictions are actually updating
                    self._ai_fps = 1.0 / dt
            self._inference_timestamps.append(end_t)
            
            # Keep only last 100 for memory safety
            if len(self._inference_timestamps) > 100:
                self._inference_timestamps.pop(0)

            model1 = result.get("model1", {})
            model2 = result.get("model2", {})
            
            m1_pred = model1.get("prediction", "Normal")
            m1_conf = float(model1.get("confidence", 0.0))
            m2_pred = model2.get("prediction", "Normal")
            m2_conf = float(model2.get("confidence", 0.0))

            self._predicted_class = m1_pred if m1_conf >= m2_conf else m2_pred
            self._confidence = max(m1_conf, m2_conf)

            confidence_threshold = float(os.environ.get("ALERT_CONFIDENCE_THRESHOLD", "75.0"))
            violence_labels = {"Violence", "Assault", "Punching", "SOS", "Fall"}

            is_threat = (
                (m1_pred in violence_labels and m1_conf >= confidence_threshold) or
                (m2_pred in violence_labels and m2_conf >= confidence_threshold)
            )

            if is_threat:
                self._consecutive_threats += 1
                if self._consecutive_threats >= VIOLENCE_CONFIRMATION_COUNT:
                    if not self._threat_active:
                        self._threat_active = True
                        self._threat_state = "THREAT ACTIVE"
                        self._alert_status = "DISPATCHING"

                        incident_id = f"IPCAM-{int(time.time())}"
                        self._last_incident_id = incident_id
                        self._last_threat_time = time.time()

                        logger.warning(f"[THREAT] Violence confirmed -> THREAT ACTIVE (Incident: {incident_id})")

                        video_path, snapshot_path = self._recorder.save_evidence(incident_id=incident_id)

                        from modules.location_provider import location_provider
                        self._dispatcher.maybe_dispatch(
                            pipeline_result=result,
                            video_path=video_path or "ip_webcam_live.mp4",
                            location_data=location_provider.get_location_data(),
                            snapshot_path=snapshot_path
                        )
                        self._alert_status = "SENT"
                    else:
                        self._last_threat_time = time.time()
                        self._threat_state = "THREAT ACTIVE"
                else:
                    self._threat_state = "CONFIRMING" if self._consecutive_threats > 1 else "VIOLENCE SUSPECTED"
            else:
                self._consecutive_threats = 0
                if self._threat_active:
                    if self._last_threat_time and (time.time() - self._last_threat_time) > RECOVERY_PERIOD_SECONDS:
                        self._threat_active = False
                        self._threat_state = "NORMAL"
                        self._alert_status = "IDLE"
                    else:
                        self._threat_state = "THREAT ACTIVE"
                else:
                    self._threat_state = "NORMAL"
                    self._alert_status = "IDLE"

        except Exception as e:
            logger.error(f"[AI] Inference execution error: {e}")
        finally:
            self._ai_busy = False
