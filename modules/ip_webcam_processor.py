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
    def __init__(
        self,
        stream_url: str,
        camera_id: str = "IP-WEBCAM-01",
        location: str = "Mobile Camera",
        pipeline: Optional[WomenDistressPipeline] = None
    ):
        self.stream_url = stream_url
        self.camera_id = camera_id
        self.location = location

        # SSRF Protection
        self._validate_url(stream_url)

        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self._cap_lock = threading.Lock()
        self._cap: Optional[cv2.VideoCapture] = None
        self._reconnect_requested = False
        self._connection_state = "DISCONNECTED"
        self._last_error: Optional[str] = None

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

        # AI + Alerting: Reuse existing pipeline to prevent duplicate heavy model allocations!
        self._pipeline = pipeline or WomenDistressPipeline()
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

    @staticmethod
    def _mask_url(url: Optional[str]) -> str:
        if not url:
            return "None"
        import re
        return re.sub(r"://([^:@]+):([^@]+)@", r"://****:****@", url)

    def _validate_url(self, url: str) -> None:
        """Prevent SSRF by ensuring only safe schemes and non-cloud destinations are used."""
        parsed = urlparse(url)
        if parsed.scheme not in ["http", "https", "rtsp"]:
            raise ValueError(f"Invalid URL scheme '{parsed.scheme}'. Only http, https, and rtsp are permitted.")
        
        # Basic restriction against internal AWS/GCP metadata endpoints
        if parsed.hostname in ["169.254.169.254", "metadata.google.internal"]:
            raise ValueError("Access to cloud metadata endpoints is forbidden.")

    def update_stream_url(self, new_url: str) -> None:
        """
        Dynamically updates the stream URL and reconnects the video capture
        without destroying the processor or reloading AI models.
        """
        self._validate_url(new_url)
        with self._lock:
            old_masked = self._mask_url(self.stream_url)
            new_masked = self._mask_url(new_url)
            logger.info(f"[IP_CAMERA] Updating stream URL from {old_masked} to {new_masked}")
            self.stream_url = new_url
            self._reconnect_requested = True
            self._connection_state = "CONNECTING"
            self._last_error = None

        with self._cap_lock:
            if self._cap and self._cap.isOpened():
                try:
                    self._cap.release()
                except Exception:
                    pass

    def start(self) -> bool:
        with self._lock:
            if self._running:
                logger.warning(f"[IP_CAMERA] Already running on {self._mask_url(self.stream_url)}.")
                return False
            self._running = True
            self._connection_state = "CONNECTING"
            self._start_time = time.monotonic()
            self._thread = threading.Thread(target=self._worker_loop, name="IPWebcamWorker", daemon=True)
            self._thread.start()
            logger.info(f"[IP_CAMERA] Started | camera_id={self.camera_id}")
            return True

    def stop(self) -> None:
        with self._lock:
            self._running = False
            self._connection_state = "DISCONNECTED"

        with self._cap_lock:
            if self._cap:
                try:
                    self._cap.release()
                except Exception:
                    pass
                self._cap = None

        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5.0)

        self._recorder.clear()
        with self._frame_lock:
            self._latest_frame = None

        try:
            from services.camera_connection_service import camera_connection_service
            camera_connection_service.update_connection_state(False, camera_id=self.camera_id)
        except Exception:
            pass

        logger.info(f"[IP_CAMERA] Stopped camera {self.camera_id}.")

    def get_latest_frame(self) -> Optional[np.ndarray]:
        with self._frame_lock:
            return self._latest_frame.copy() if self._latest_frame is not None else None

    def status(self) -> Dict[str, Any]:
        uptime = (time.monotonic() - self._start_time) if self._start_time else 0.0
        return {
            "running": self._running,
            "connection_state": getattr(self, "_connection_state", "CONNECTED" if self._running else "DISCONNECTED"),
            "camera_id": self.camera_id,
            "stream_url": self._mask_url(self.stream_url),
            "stream_url_raw": self.stream_url,
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
            "last_error": getattr(self, "_last_error", None)
        }

    def _worker_loop(self) -> None:
        reconnect_delay = 2.0
        max_reconnect_delay = 30.0
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "timeout;5000"  # 5s timeout to prevent hanging on disconnect

        while self._running:
            url_to_open = self.stream_url

            # Defensive auto-fix: Ensure video stream path is present
            # Android IP Webcam app displays 'http://IP:8080' on screen without '/videofeed'.
            # The root path '/' serves a 40KB HTML web page which fails with 'Stream ends prematurely at 40812'.
            try:
                from urllib.parse import urlparse, urlunparse
                parsed_u = urlparse(url_to_open)
                if not parsed_u.path or parsed_u.path == "/":
                    parsed_u = parsed_u._replace(path="/videofeed")
                    url_to_open = urlunparse(parsed_u)
                    self.stream_url = url_to_open
            except Exception:
                pass

            masked_url = self._mask_url(url_to_open)
            self._reconnect_requested = False
            self._connection_state = "CONNECTING"

            with self._cap_lock:
                cap = cv2.VideoCapture(url_to_open, cv2.CAP_FFMPEG)
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 2)  # Reduce buffer size for lower latency on mobile IP cams
                self._cap = cap

            # Auto-fallback: If HTTPS fails, test HTTP
            if not cap.isOpened() and url_to_open.startswith("https://"):
                http_fallback = "http://" + url_to_open[8:]
                logger.info(f"[IP_CAMERA] HTTPS failed on {masked_url}. Attempting HTTP fallback: {self._mask_url(http_fallback)}")
                with self._cap_lock:
                    cap = cv2.VideoCapture(http_fallback, cv2.CAP_FFMPEG)
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 2)
                    self._cap = cap
                if cap.isOpened():
                    url_to_open = http_fallback
                    self.stream_url = http_fallback
                    masked_url = self._mask_url(url_to_open)
            # Or vice-versa: if HTTP fails, test HTTPS
            elif not cap.isOpened() and url_to_open.startswith("http://"):
                https_fallback = "https://" + url_to_open[7:]
                with self._cap_lock:
                    cap = cv2.VideoCapture(https_fallback, cv2.CAP_FFMPEG)
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 2)
                    self._cap = cap
                if cap.isOpened():
                    url_to_open = https_fallback
                    self.stream_url = https_fallback
                    masked_url = self._mask_url(url_to_open)

            if not cap.isOpened():
                self._connection_state = "ERROR"
                self._last_error = f"Could not open stream at {masked_url}"
                logger.warning(f"[IP_CAMERA] Could not open {masked_url}. Retrying in {reconnect_delay:.1f}s...")
                
                try:
                    from services.camera_connection_service import camera_connection_service
                    camera_connection_service.update_connection_state(False, error_message=self._last_error, camera_id=self.camera_id)
                except Exception:
                    pass

                # Bounded backoff retry with quick interruption check
                t_sleep_start = time.monotonic()
                while self._running and not self._reconnect_requested and (time.monotonic() - t_sleep_start < reconnect_delay):
                    time.sleep(0.2)

                reconnect_delay = min(reconnect_delay * 1.5, max_reconnect_delay)
                continue

            try:
                actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            except Exception:
                actual_w = 640
            try:
                actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            except Exception:
                actual_h = 480
            try:
                actual_fps = float(cap.get(cv2.CAP_PROP_FPS) or 15.0)
            except Exception:
                actual_fps = 15.0

            if actual_w > 0 and actual_h > 0:
                self._recorder.update_dimensions(actual_w, actual_h)
                self._triggered_clip_recorder.update_dimensions(actual_w, actual_h)

            logger.info(f"[IP_CAMERA] Connected to {masked_url} ({actual_w}x{actual_h} @ {actual_fps:.1f} FPS)")
            self._connection_state = "CONNECTED"
            self._last_error = None
            reconnect_delay = 2.0

            try:
                from services.camera_connection_service import camera_connection_service
                camera_connection_service.update_connection_state(True, camera_id=self.camera_id)
            except Exception:
                pass

            frame_count = 0
            last_frame_time = time.time()

            while self._running and not self._reconnect_requested and cap.isOpened():
                # Check watchdog
                if time.time() - last_frame_time > 10.0:
                    logger.warning(f"[IP_CAMERA] Stream watchdog timeout on {masked_url}. No frames received in 10s.")
                    break

                ret, frame = cap.read()
                if not ret or frame is None:
                    logger.warning(f"[IP_CAMERA] Frame read failed or stream ended for {masked_url}.")
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
            if self._running and not self._reconnect_requested:
                logger.info(f"[IP_CAMERA] Reconnecting in {reconnect_delay:.1f}s...")
                t_sleep_start = time.monotonic()
                while self._running and not self._reconnect_requested and (time.monotonic() - t_sleep_start < reconnect_delay):
                    time.sleep(0.2)

    def _run_yolo_async(self, frame: np.ndarray, frame_count: int) -> None:
        try:
            has_distress = self._threat_active or (self._threat_state == "THREAT ACTIVE")
            result = self._pipeline.process_yolo(frame, frame_count, has_distress)
            self._latest_persons = result.get("persons", [])
            
            # TRIGGER LOGIC
            person_count = result.get("model3", {}).get("people_detected", len(self._latest_persons))
            if person_count >= TRIGGER_PERSON_COUNT:
                now_t = time.time()
                if self._trigger_start_time == 0.0:
                    self._trigger_start_time = now_t
                    import uuid
                    self._current_trigger_corr_id = uuid.uuid4().hex[:8]
                    formatted_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(now_t))
                    logger.info(
                        f"[IP_CAMERA] [{self.camera_id}] [{self._current_trigger_corr_id}] Multiple persons detected ({person_count} >= {TRIGGER_PERSON_COUNT}) "
                        f"at {formatted_time}. Persistence timer started ({TRIGGER_PERSISTENCE_SECONDS}s required)."
                    )
                elif now_t - self._trigger_start_time >= TRIGGER_PERSISTENCE_SECONDS:
                    duration = now_t - self._trigger_start_time
                    import uuid
                    corr_id = getattr(self, "_current_trigger_corr_id", None) or uuid.uuid4().hex[:8]
                    logger.warning(
                        f"[IP_CAMERA] [{self.camera_id}] [{corr_id}] Trigger condition CONFIRMED: {person_count} persons sustained for {duration:.1f}s. "
                        f"Activating triggered clip recording."
                    )
                    self._triggered_clip_recorder.trigger(source=self.camera_id, correlation_id=corr_id)
                    self._trigger_start_time = 0.0
            else:
                if self._trigger_start_time > 0.0:
                    logger.debug(
                        f"[IP_CAMERA] [{self.camera_id}] Person count dropped ({person_count} < {TRIGGER_PERSON_COUNT}). "
                        f"Persistence timer reset."
                    )
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
