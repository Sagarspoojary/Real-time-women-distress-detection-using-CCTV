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
try:
    from dotenv import load_dotenv
    load_dotenv(override=False)
except ImportError:
    pass

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

    def _get_static_env_location(self) -> Optional[Dict[str, Any]]:
        """Checks for authoritative fixed CCTV coordinates configured in environment variables."""
        lat_str = os.environ.get("SAFETY_LOCATION_LAT") or os.environ.get("ALERT_CAMERA_LAT") or os.environ.get("CAMERA_LATITUDE")
        lon_str = os.environ.get("SAFETY_LOCATION_LON") or os.environ.get("ALERT_CAMERA_LON") or os.environ.get("CAMERA_LONGITUDE")
        name = os.environ.get("SAFETY_LOCATION_NAME") or os.environ.get("ALERT_CAMERA_LOCATION") or "CCTV Camera"
        if lat_str and lon_str:
            try:
                lat = float(lat_str.strip())
                lon = float(lon_str.strip())
                if -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0:
                    return {
                        "latitude": lat,
                        "longitude": lon,
                        "accuracy": 5.0,
                        "timestamp": "Configured CCTV Location",
                        "maps_link": f"https://www.google.com/maps?q={lat},{lon}",
                        "status": f"available (Configured: {name})",
                        "is_gps": True,
                        "source": "configured_cctv",
                        "camera_name": name
                    }
            except ValueError:
                logger.warning(f"[LocationService] Invalid static GPS coordinates in env: lat='{lat_str}', lon='{lon_str}'")
        return None

    def update_location(self, latitude: float, longitude: float, accuracy: Optional[float] = None, timestamp: Optional[str] = None, is_manual: bool = False) -> Dict[str, Any]:
        """Update stored coordinates from Browser GPS or manual input."""
        with self._data_lock:
            # If static CCTV coordinates exist in .env and this is not a manual user override,
            # do not let coarse browser IP/Wi-Fi estimates overwrite the authoritative CCTV location!
            static_loc = self._get_static_env_location()
            if static_loc is not None and not is_manual:
                logger.info(
                    f"[LocationService] Received browser location ({latitude}, {longitude}, acc={accuracy}m), "
                    f"preserving authoritative .env CCTV coordinates ({static_loc['latitude']}, {static_loc['longitude']})."
                )
                return static_loc

            maps_link = f"https://www.google.com/maps?q={latitude},{longitude}"
            
            # Identify if this is a high-accuracy GPS or a coarse IP-based estimate
            is_approximate = (accuracy is not None and accuracy >= 500) and not is_manual
            is_gps = (accuracy is not None and accuracy < 500) or is_manual
            
            if is_manual:
                status = "available (Manual Coordinates)"
                source = "manual"
                accuracy = accuracy or 5.0
            elif is_approximate:
                status = f"approximate (Network/IP Geolocation ±{round(accuracy)}m)"
                source = "browser_ip_approx"
            else:
                status = "available"
                source = "browser_gps"

            self._location_data = {
                "latitude": latitude,
                "longitude": longitude,
                "accuracy": accuracy,
                "timestamp": timestamp,
                "maps_link": maps_link,
                "status": status,
                "is_gps": is_gps,
                "source": source
            }
            self._save_cache(self._location_data)
            logger.info(f"[LocationService] Updated location: {latitude}, {longitude} (Accuracy: {accuracy}m, Status: {status})")
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
                        "timestamp": "Approximate IP Geolocation",
                        "maps_link": maps_link,
                        "status": f"available (IP: {city}, {region})",
                        "is_gps": False
                    }
                    logger.info(f"[LocationService] Fallback IP location obtained: {lat}, {lon} ({city})")
                    return loc_info
        except Exception as e:
            logger.warning(f"[LocationService] IP location fallback failed: {e}")
        return None

    def get_location(self) -> Dict[str, Any]:
        """
        Get latest stored location or fallback status.

        Priority order:
          1. Manual coordinates saved via dashboard (is_manual flag in _location_data)
          2. Static CCTV coordinates configured in .env (SAFETY_LOCATION_LAT/LON)
          3. Browser-pushed GPS or cached location
          4. Fresh server-side IP geolocation fallback
          5. Location unavailable
        """
        with self._data_lock:
            # 1. Manual coordinates explicitly saved by user via dashboard Settings
            if self._location_data and self._location_data.get("source") == "manual":
                return dict(self._location_data)

            # 2. Static CCTV coordinates configured in .env (Authoritative for CCTV)
            static_loc = self._get_static_env_location()
            if static_loc:
                return static_loc

            # 3. Dynamic browser GPS or cached location (when no static CCTV is set)
            if self._location_data:
                return dict(self._location_data)

            # 4. Fresh server-side IP geolocation fallback
            ip_loc = self._fetch_ip_location()
            if ip_loc:
                return ip_loc

            return {
                "latitude": None,
                "longitude": None,
                "accuracy": None,
                "timestamp": None,
                "maps_link": None,
                "status": "Location unavailable",
                "is_gps": False
            }

    def clear(self):
        with self._data_lock:
            self._location_data = None
