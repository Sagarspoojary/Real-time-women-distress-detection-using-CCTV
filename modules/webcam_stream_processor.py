"""
WebcamStreamProcessor — Real-Time Laptop Webcam Violence Detection Worker
==========================================================================

Responsibilities:
1. Opens the laptop's built-in webcam via cv2.VideoCapture(WEBCAM_INDEX).
2. Feeds two rolling buffers:
   - frame_buffer  (deque, maxlen=16)  → VideoMAE Model 1 temporal inference window
   - evidence_buffer inside EvidenceRecorder (maxlen=150) → pre-incident clip
3. Runs VideoMAE Model 1 inference asynchronously/non-blocking on 16-frame windows.
4. Measures and exposes real-time performance metrics:
   - Camera FPS (capture frame rate)
   - AI FPS (inference throughput)
   - Inference Latency (ms)
   - Predicted Activity & Confidence
   - Threat State Machine (NORMAL, VIOLENCE SUSPECTED, CONFIRMING, THREAT ACTIVE)
   - Alert Status
5. On confirmed threat (consecutive detections >= threshold):
   a. Transition state to THREAT ACTIVE
   b. Calls EvidenceRecorder.save_evidence() → saves clip + snapshot to outputs/
   c. Calls AlertDispatcher.maybe_dispatch() → sends email with attachments ONCE per incident
6. Exposes get_latest_frame() for MJPEG stream endpoint.
7. Exposes status() for /webcam/status API.
"""

import os
import time
import logging
import threading
from collections import deque
from typing import Optional, Tuple, Dict, Any

import cv2
import numpy as np

from modules.violence_detector import ViolenceDetector
from modules.pipeline import WomenDistressPipeline
from modules.evidence_recorder import EvidenceRecorder
from modules.triggered_clip_recorder import TriggeredClipRecorder
from services.triggered_clip_service import on_triggered_clip_saved
from services.alert_dispatcher import AlertDispatcher

logger = logging.getLogger("webcam_stream_processor")

# Configuration
WEBCAM_INDEX: int = int(os.environ.get("WEBCAM_INDEX", "0"))
INFERENCE_EVERY_N_FRAMES: int = int(os.environ.get("WEBCAM_INFERENCE_EVERY_N", "15"))
VIOLENCE_CONFIRMATION_COUNT: int = int(os.environ.get("VIOLENCE_CONFIRMATION_COUNT", "2"))
RECOVERY_PERIOD_SECONDS: float = float(os.environ.get("THREAT_RECOVERY_SECONDS", "30.0"))

TRIGGER_PERSON_COUNT: int = int(os.environ.get("TRIGGER_PERSON_COUNT", "2"))
TRIGGER_PERSISTENCE_SECONDS: float = float(os.environ.get("TRIGGER_PERSISTENCE_SECONDS", "2.0"))

# Module-level singleton
_active_processor: Optional["WebcamStreamProcessor"] = None
_processor_lock = threading.Lock()


def get_active_processor() -> Optional["WebcamStreamProcessor"]:
    return _active_processor


def set_active_processor(processor: Optional["WebcamStreamProcessor"]) -> None:
    global _active_processor
    with _processor_lock:
        _active_processor = processor


class WebcamStreamProcessor:
    """
    Background daemon worker that captures frames from laptop webcam,
    runs VideoMAE Model 1 violence classification, tracks performance metrics,
    and manages the threat state machine for emergency dispatch.
    """

    def __init__(self, camera_id: str = "WEBCAM-01", location: str = "Live Camera"):
        self.camera_id = camera_id
        self.location = location

        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()

        # 16-frame rolling buffer for VideoMAE temporal input
        self._frame_buffer: deque = deque(maxlen=16)

        # Latest frame for MJPEG stream (thread-safe)
        self._latest_frame: Optional[np.ndarray] = None
        self._frame_lock = threading.Lock()

        # Evidence recorder (150-frame rolling buffer for pre-incident clip)
        self._recorder = EvidenceRecorder()
        self._triggered_clip_recorder = TriggeredClipRecorder(
            fps=15.0,
            on_clip_saved=on_triggered_clip_saved
        )
        self._trigger_start_time = 0.0

        # AI Model & Alert Dispatcher
        self._pipeline = WomenDistressPipeline()
        self._dispatcher = AlertDispatcher()

        # Metrics & Performance Tracking
        self._start_time: Optional[float] = None
        self._frames_processed: int = 0
        self._inferences_count: int = 0
        self._camera_fps: float = 0.0
        self._ai_fps: float = 0.0
        self._inference_time_ms: float = 0.0
        
        self._latest_persons = []

        # Rolling timestamp windows for FPS calculation
        self._frame_timestamps: deque = deque(maxlen=30)
        self._inference_timestamps: deque = deque(maxlen=10)

        # Threat State Machine & Status
        self._threat_state: str = "NORMAL"  # NORMAL, VIOLENCE SUSPECTED, CONFIRMING, THREAT ACTIVE
        self._threat_active: bool = False
        self._alert_status: str = "IDLE"  # IDLE, DISPATCHING, SENT, SUPPRESSED
        self._predicted_class: str = "Normal"
        self._confidence: float = 0.0
        self._consecutive_threats: int = 0
        self._last_threat_time: Optional[float] = None
        self._last_incident_id: Optional[str] = None

        # Lock for AI worker busy state (prevents AI queue lag)
        self._ai_busy = False
        self._yolo_busy = False

    # ─────────────────────────────────────────────────────────────────────
    # Lifecycle
    # ─────────────────────────────────────────────────────────────────────

    def start(self) -> bool:
        """Start the background webcam worker thread. Returns True if started."""
        with self._lock:
            if self._running:
                logger.warning(f"[CAMERA] Already running on camera index {WEBCAM_INDEX}.")
                return False
            self._running = True
            self._start_time = time.monotonic()
            self._thread = threading.Thread(target=self._worker_loop, name="WebcamWorker", daemon=True)
            self._thread.start()
            logger.info(f"[CAMERA] Started | camera_id={self.camera_id} | index={WEBCAM_INDEX}")
            return True

    def stop(self) -> None:
        """Stop the webcam worker thread cleanly."""
        with self._lock:
            self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5.0)
        self._recorder.clear()
        with self._frame_lock:
            self._latest_frame = None
        logger.info(f"[CAMERA] Stopped camera {self.camera_id}.")

    # ─────────────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────────────

    def get_latest_frame(self) -> Optional[np.ndarray]:
        """Returns the most recently captured BGR frame (for MJPEG streaming)."""
        with self._frame_lock:
            return self._latest_frame.copy() if self._latest_frame is not None else None

    def status(self) -> Dict[str, Any]:
        """Returns current processor status and real-time metrics for the status API."""
        uptime = (time.monotonic() - self._start_time) if self._start_time else 0.0
        return {
            "running": self._running,
            "camera_id": self.camera_id,
            "webcam_index": WEBCAM_INDEX,
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

    # ─────────────────────────────────────────────────────────────────────
    # Internal worker loop
    # ─────────────────────────────────────────────────────────────────────

    def _worker_loop(self) -> None:
        """Main camera frame capture loop."""
        reconnect_delay = 2.0

        while self._running:
            cap = cv2.VideoCapture(WEBCAM_INDEX, cv2.CAP_DSHOW)
            if not cap.isOpened():
                cap = cv2.VideoCapture(WEBCAM_INDEX)

            if not cap.isOpened():
                logger.warning(f"[CAMERA] Could not open webcam index {WEBCAM_INDEX}. Retrying in {reconnect_delay}s...")
                time.sleep(reconnect_delay)
                reconnect_delay = min(reconnect_delay * 1.5, 30.0)
                continue

            # --- LATENCY FIXES ---
            # 1. Prevent unbounded frame queueing in OS/OpenCV
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            # 2. Request a smaller hardware frame to speed up decode/copy
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            # 3. Request lower hardware FPS so we don't process 60 useless frames/sec
            cap.set(cv2.CAP_PROP_FPS, 15)

            actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            actual_fps = cap.get(cv2.CAP_PROP_FPS) or 15.0
            if actual_w > 0 and actual_h > 0:
                self._recorder.update_dimensions(actual_w, actual_h)
                self._triggered_clip_recorder.update_dimensions(actual_w, actual_h)

            logger.info(f"[CAMERA] Opened webcam index {WEBCAM_INDEX} ({actual_w}x{actual_h} @ {actual_fps:.1f} FPS)")
            reconnect_delay = 2.0
            frame_count = 0

            while self._running and cap.isOpened():
                ret, frame = cap.read()
                if not ret or frame is None:
                    logger.warning("[CAMERA] Frame read failed.")
                    break

                now = time.monotonic()
                frame_count += 1
                self._frames_processed += 1

                # Track Camera FPS
                self._frame_timestamps.append(now)
                if len(self._frame_timestamps) > 1:
                    dt = self._frame_timestamps[-1] - self._frame_timestamps[0]
                    if dt > 0:
                        self._camera_fps = (len(self._frame_timestamps) - 1) / dt

                # Thread-safe update of latest frame for MJPEG stream
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

                # Convert BGR to RGB for VideoMAE buffer
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

                # Trigger non-blocking VideoMAE inference every N frames when buffer is full
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
                logger.info(f"[CAMERA] Reconnecting in {reconnect_delay}s...")
                time.sleep(reconnect_delay)

    def _run_yolo_async(self, frame: np.ndarray, frame_count: int) -> None:
        """
        Runs YOLO Person Detection concurrently on a single frame.
        """
        try:
            # We determine distress overlay state directly from the Threat State Machine
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
                    self._trigger_start_time = 0.0  # Reset to require new persistence
            else:
                self._trigger_start_time = 0.0
                
        except Exception as e:
            logger.error(f"[CAMERA] YOLO execution error: {e}")
        finally:
            self._yolo_busy = False

    def _run_inference_async(self, frames: list) -> None:
        """
        Runs VideoMAE Model 1 & 2 inference on the 16 RGB frames in a non-blocking thread,
        updates metrics, and advances the threat state machine.
        """
        try:
            import torch
            start_t = time.monotonic()

            # Execute WomenDistressPipeline (VideoMAE Only)
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
                    self._ai_fps = 1.0 / dt
            self._inference_timestamps.append(end_t)
            
            if len(self._inference_timestamps) > 100:
                self._inference_timestamps.pop(0)

            model1 = result.get("model1", {})
            model2 = result.get("model2", {})

            m1_pred = model1.get("prediction", "Normal")
            m1_conf = float(model1.get("confidence", 0.0))
            m2_pred = model2.get("prediction", "Normal")
            m2_conf = float(model2.get("confidence", 0.0))

            pred_class = m1_pred if m1_conf >= m2_conf else m2_pred
            conf = max(m1_conf, m2_conf)

            self._predicted_class = pred_class
            self._confidence = conf

            # Read configured threshold
            confidence_threshold = float(os.environ.get("ALERT_CONFIDENCE_THRESHOLD", "75.0"))
            threat_classes = {"Violence", "Assault", "Punching", "SOS", "Fall"}

            is_threat = (pred_class in threat_classes and conf >= confidence_threshold)

            logger.info(f"[AI] Prediction: {pred_class} | {conf:.1f}% | Latency: {latency_ms:.1f}ms")

            if is_threat:
                self._consecutive_threats += 1
                logger.info(f"[AI] Confirmation: {self._consecutive_threats}/{VIOLENCE_CONFIRMATION_COUNT}")

                if self._consecutive_threats >= VIOLENCE_CONFIRMATION_COUNT:
                    if not self._threat_active:
                        # Transition to THREAT ACTIVE & create single incident
                        self._threat_active = True
                        self._threat_state = "THREAT ACTIVE"
                        self._alert_status = "DISPATCHING"

                        incident_id = f"WEBCAM-{int(time.time())}"
                        self._last_incident_id = incident_id
                        self._last_threat_time = time.time()

                        logger.warning(f"[THREAT] Violence confirmed -> THREAT ACTIVE (Incident: {incident_id})")

                        # Save evidence video clip + snapshot
                        video_path, snapshot_path = self._recorder.save_evidence(incident_id=incident_id)
                        logger.info(f"[EVIDENCE] Saved clip: {video_path} | snapshot: {snapshot_path}")

                        # Dispatch single email alert
                        pipeline_result = {
                            "model1": {"prediction": pred_class, "confidence": conf},
                            "model2": {"prediction": "Normal", "confidence": 0.0},
                            "persons": []
                        }

                        logger.info(f"[ALERT] Dispatching email for incident {incident_id}")
                        from modules.location_provider import location_provider
                        self._dispatcher.maybe_dispatch(
                            pipeline_result=pipeline_result,
                            video_path=video_path or "webcam_live.mp4",
                            location_data=location_provider.get_location_data(),
                            snapshot_path=snapshot_path
                        )
                        self._alert_status = "SENT"
                    else:
                        # Threat remains active
                        self._last_threat_time = time.time()
                        self._threat_state = "THREAT ACTIVE"
                else:
                    self._threat_state = "CONFIRMING" if self._consecutive_threats > 1 else "VIOLENCE SUSPECTED"
            else:
                self._consecutive_threats = 0
                if self._threat_active:
                    # Check recovery period
                    if self._last_threat_time and (time.time() - self._last_threat_time) > RECOVERY_PERIOD_SECONDS:
                        self._threat_active = False
                        self._threat_state = "NORMAL"
                        self._alert_status = "IDLE"
                        logger.info("[THREAT] Violence cleared -> Transitioned to NORMAL state.")
                    else:
                        self._threat_state = "THREAT ACTIVE"
                else:
                    self._threat_state = "NORMAL"
                    self._alert_status = "IDLE"

        except Exception as e:
            logger.error(f"[AI] Inference execution error: {e}")
        finally:
            self._ai_busy = False
