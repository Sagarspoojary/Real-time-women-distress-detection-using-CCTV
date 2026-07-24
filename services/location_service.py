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

    def _fetch_ip_location(self) -> Optional[Dict[str, Any]]:
        """Fallback: get approximate location based on server/client IP (free ip-api.com)."""
        try:
            import urllib.request
            req = urllib.request.urlopen("http://ip-api.com/json/", timeout=3)
            if req.status == 200:
                data = json.loads(req.read().decode())
                if data.get("status") == "success":
                    lat = data.get("lat")
                    lon = data.get("lon")
                    city = data.get("city", "")
                    region = data.get("regionName", "")
                    country = data.get("country", "")
                    maps_link = f"https://www.google.com/maps?q={lat},{lon}"
                    loc_info = {
                        "latitude": lat,
                        "longitude": lon,
                        "accuracy": 5000, # Approx IP accuracy ~5km
                        "timestamp": "IP Location (Approx)",
                        "maps_link": maps_link,
                        "status": f"available (IP: {city}, {region}, {country})"
                    }
                    logger.info(f"[LocationService] Fallback IP location obtained: {lat}, {lon} ({city})")
                    return loc_info
        except Exception as e:
            logger.warning(f"[LocationService] IP location fallback failed: {e}")
        return None

    def get_location(self) -> Dict[str, Any]:
        """Get latest stored location or fallback status."""
        with self._data_lock:
            if self._location_data:
                return dict(self._location_data)
            
            # Fallback to IP geolocation if browser GPS hasn't synced yet
            ip_loc = self._fetch_ip_location()
            if ip_loc:
                return ip_loc

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
