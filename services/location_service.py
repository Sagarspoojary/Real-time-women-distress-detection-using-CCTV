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

import json
import os

CACHE_FILE = "data/last_location.json"

class LocationService:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(LocationService, cls).__new__(cls)
                cls._instance._data_lock = threading.Lock()
                cls._instance._location_data = cls._instance._load_cache()
            return cls._instance

    def _load_cache(self) -> Optional[Dict[str, Any]]:
        try:
            if os.path.exists(CACHE_FILE):
                with open(CACHE_FILE, "r") as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"[LocationService] Could not load location cache: {e}")
        return None

    def _save_cache(self, data: Dict[str, Any]):
        try:
            os.makedirs("data", exist_ok=True)
            with open(CACHE_FILE, "w") as f:
                json.dump(data, f)
        except Exception as e:
            logger.warning(f"[LocationService] Could not save location cache: {e}")

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
            self._save_cache(self._location_data)
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
