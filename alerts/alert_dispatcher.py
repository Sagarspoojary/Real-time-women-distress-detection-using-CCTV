"""
alerts/alert_dispatcher.py
============================
Orchestrates the full alert flow when a female distress event is confirmed.

Flow:
  1. CooldownManager checks if this track_id is allowed to alert.
  2. AttachmentGenerator captures:
       a. snapshot.jpg  — the distress frame as JPEG bytes
       b. distress_clip.mp4 — 10-second clip from the source video
  3. EmailService sends the alert email with both attachments.
  4. All of this runs in a BACKGROUND THREAD so the detection pipeline
     is never blocked.

Integration point:
  Call AlertDispatcher.dispatch() from pipeline.py after distress is
  confirmed — it returns immediately and the email sends asynchronously.
"""

import threading
import logging
import os
import cv2

from alerts.cooldown_manager   import CooldownManager
from alerts.attachment_generator import generate_snapshot, generate_clip
from alerts.email_service      import send_alert_email
from alerts.smtp_config        import RECIPIENTS, ALERT_DISTRESS_CLASSES

logger = logging.getLogger("alerts.dispatcher")


class AlertDispatcher:
    """
    Singleton-style dispatcher. Create ONE instance in pipeline.py and
    call dispatch() whenever a distress event is detected.
    """

    def __init__(self):
        self._cooldown = CooldownManager()
        logger.info("[AlertDispatcher] Initialized. Recipients: %s", RECIPIENTS)

    # ── Public API ─────────────────────────────────────────────────────────────

    def dispatch(
        self,
        *,
        track_id: int,
        gender: str,
        distress_type: str,
        distress_confidence: float,
        detection_confidence: float,
        video_path: str,
        detection_frame: int,
        fps: float,
        snapshot_frame,                 # numpy BGR frame at detection moment
        recognized_name: str = "Unknown",
        weapon_detected: bool = False,
    ) -> None:
        """
        Entry point — call this when distress is confirmed.
        Returns immediately; email is sent in a background thread.

        Args:
            track_id:             ByteTrack ID of the distressed person.
            gender:               Must be "Female" to trigger (safety check).
            distress_type:        Model 2 prediction label (e.g. "SOS", "Fall").
            distress_confidence:  Model 2 confidence (0–1).
            detection_confidence: YOLO person detection confidence (0–1).
            video_path:           Path to the original source video.
            detection_frame:      Frame number where distress was confirmed.
            fps:                  FPS of the source video.
            snapshot_frame:       numpy BGR frame to use as snapshot.jpg.
            recognized_name:      Face recognition result (default "Unknown").
            weapon_detected:      Whether a weapon was associated with this person.
        """
        # ── Guard 1: Gender check ──────────────────────────────────────────────
        if gender != "Female":
            return

        # ── Guard 2: Distress class filter ────────────────────────────────────
        if distress_type not in ALERT_DISTRESS_CLASSES:
            logger.debug(
                f"[Dispatcher] Track {track_id} — distress type '{distress_type}' "
                "not in alert classes. Skipping."
            )
            return

        # ── Guard 3: Cooldown check ────────────────────────────────────────────
        if not self._cooldown.is_allowed(track_id):
            return

        # ── Mark cooldown immediately (before thread starts) ───────────────────
        # This prevents a second call from slipping in before the thread begins.
        self._cooldown.mark_sent(track_id)

        # ── Build alert metadata ───────────────────────────────────────────────
        video_name = os.path.basename(video_path) if video_path else "Unknown"
        alert_info = {
            "track_id":             track_id,
            "gender":               gender,
            "distress_type":        distress_type,
            "distress_confidence":  distress_confidence,
            "detection_confidence": detection_confidence,
            "video_name":           video_name,
            "recognized_name":      recognized_name,
            "weapon_detected":      weapon_detected,
            "recipients":           RECIPIENTS,
        }

        # ── Capture snapshot NOW (must happen in this thread, frame may not ─────
        # ── persist after the next iteration of the detection loop)           ─────
        snapshot_bytes = generate_snapshot(snapshot_frame)

        logger.info(
            f"[Dispatcher] 🚨 Distress alert triggered | "
            f"Track #{track_id} | {distress_type} ({distress_confidence:.2%}) | "
            f"Video: {video_name}"
        )

        # ── Launch background thread ───────────────────────────────────────────
        thread = threading.Thread(
            target=self._send_in_background,
            args=(alert_info, snapshot_bytes, video_path, detection_frame, fps, track_id),
            daemon=True,
            name=f"alert-track-{track_id}",
        )
        thread.start()

    def reset_track(self, track_id: int) -> None:
        """Call when ByteTrack marks a track as stale — resets its cooldown."""
        self._cooldown.reset(track_id)

    def reset_all(self) -> None:
        """Call at the start of each new video upload."""
        self._cooldown.reset_all()

    # ── Private: background worker ─────────────────────────────────────────────

    def _send_in_background(
        self,
        alert_info: dict,
        snapshot_bytes: bytes | None,
        video_path: str,
        detection_frame: int,
        fps: float,
        track_id: int,
    ) -> None:
        """
        Runs in a daemon thread. Generates video clip and sends email.
        Any exception is caught and logged — never propagates.
        """
        clip_path = None
        try:
            # Step 1 — Generate video clip
            clip_path = generate_clip(
                video_path=video_path,
                detection_frame=detection_frame,
                fps=fps,
                track_id=track_id,
            )

            # Step 2 — Send email
            success = send_alert_email(
                alert_info=alert_info,
                snapshot_bytes=snapshot_bytes,
                clip_path=clip_path,
            )

            if success:
                logger.info(
                    f"[Dispatcher] ✅ Alert email delivered | "
                    f"Track #{track_id} | "
                    f"Snapshot: {'yes' if snapshot_bytes else 'no'} | "
                    f"Clip: {clip_path or 'none'}"
                )
            else:
                logger.warning(
                    f"[Dispatcher] ⚠️ Alert email failed | Track #{track_id}"
                )

        except Exception as e:
            logger.error(
                f"[Dispatcher] ❌ Unhandled error in alert thread for Track #{track_id}: {e}",
                exc_info=True,
            )
