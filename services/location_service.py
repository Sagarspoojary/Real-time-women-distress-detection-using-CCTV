"""
services/location_service.py
============================
Thread-safe location store for Women Distress AI backend.
Stores the latest live GPS coordinates received from the React frontend via watchPosition().
"""

import threading
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("services.location")

class LocationService:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(LocationService, cls).__new__(cls)
                cls._instance._location_data = None
                cls._instance._data_lock = threading.Lock()
            return cls._instance

    def update_location(self, latitude: float, longitude: float, accuracy: Optional[float] = None, timestamp: Optional[str] = None) -> Dict[str, Any]:
        """Update stored coordinates."""
        with self._data_lock:
            maps_link = f"https://www.google.com/maps?q={latitude},{longitude}"
            self._location_data = {
                "latitude": latitude,
                "longitude": longitude,
                "accuracy": accuracy,
                "timestamp": timestamp,
                "maps_link": maps_link,
                "status": "available"
            }
            logger.info(f"[LocationService] Updated location: {latitude}, {longitude} (Accuracy: {accuracy}m)")
            return self._location_data

    def get_location(self) -> Dict[str, Any]:
        """Get latest stored location or fallback status."""
        with self._data_lock:
            if self._location_data:
                return dict(self._location_data)
            return {
                "latitude": None,
                "longitude": None,
                "accuracy": None,
                "timestamp": None,
                "maps_link": None,
                "status": "Location unavailable"
            }

    def clear(self):
        with self._data_lock:
            self._location_data = None
