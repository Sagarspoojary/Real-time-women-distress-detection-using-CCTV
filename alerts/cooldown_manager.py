"""
alerts/cooldown_manager.py
==========================
Prevents duplicate alert emails for the same tracked person.

Rules:
  - One email per Track ID every COOLDOWN_SECONDS seconds.
  - If the same track reappears after cooldown has expired → new email allowed.
  - Different track IDs are completely independent.
  - Thread-safe using a Lock (alerts run in background threads).
"""

import time
import threading
import logging

from alerts.smtp_config import COOLDOWN_SECONDS

logger = logging.getLogger("alerts.cooldown")


class CooldownManager:
    """
    Tracks the last alert time per Track ID.
    Thread-safe for concurrent background alert threads.
    """

    def __init__(self, cooldown_seconds: int = COOLDOWN_SECONDS):
        self._cooldown = cooldown_seconds
        self._last_sent: dict[int, float] = {}   # track_id → timestamp of last email
        self._lock = threading.Lock()

    def is_allowed(self, track_id: int) -> bool:
        """
        Returns True if sending an alert for this track_id is allowed.
        Returns False if we are still within the cooldown window.
        """
        now = time.time()
        with self._lock:
            last = self._last_sent.get(track_id, 0.0)
            elapsed = now - last
            if elapsed >= self._cooldown:
                return True
            remaining = self._cooldown - elapsed
            logger.debug(
                f"[Cooldown] Track ID {track_id} — blocked. "
                f"{remaining:.1f}s remaining in cooldown."
            )
            return False

    def mark_sent(self, track_id: int) -> None:
        """Record that an alert was just sent for this track_id."""
        with self._lock:
            self._last_sent[track_id] = time.time()
            logger.debug(f"[Cooldown] Track ID {track_id} — cooldown started ({self._cooldown}s).")

    def reset(self, track_id: int) -> None:
        """Clear cooldown for a track (e.g. when the track is removed by ByteTrack)."""
        with self._lock:
            self._last_sent.pop(track_id, None)

    def reset_all(self) -> None:
        """Clear all cooldowns (e.g. on new video upload)."""
        with self._lock:
            self._last_sent.clear()
            logger.debug("[Cooldown] All cooldowns cleared.")
