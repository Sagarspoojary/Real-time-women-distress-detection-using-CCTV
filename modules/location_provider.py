import os
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("location_provider")

class LocationProvider:
    """
    Isolated location provider that retrieves GPS coordinates and location metadata
    from environment configuration, providing a standard dictionary format for incidents.
    """
    
    def __init__(self):
        # Read from environment variables, fallback to None
        self._lat_str = os.environ.get("SAFETY_LOCATION_LAT")
        self._lon_str = os.environ.get("SAFETY_LOCATION_LON")
        self._name_str = os.environ.get("SAFETY_LOCATION_NAME")
        
        self.latitude: Optional[float] = None
        self.longitude: Optional[float] = None
        self.location_name: Optional[str] = self._name_str
        self.is_configured: bool = False
        
        self._initialize()
        
    def _initialize(self):
        if self._lat_str and self._lon_str:
            try:
                lat = float(self._lat_str)
                lon = float(self._lon_str)
                
                # Validate ranges (-90 to 90 for lat, -180 to 180 for lon)
                if -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0:
                    self.latitude = lat
                    self.longitude = lon
                    self.is_configured = True
                    logger.info(f"[LocationProvider] Configured valid GPS: {lat}, {lon} ({self.location_name or 'Unnamed'})")
                else:
                    logger.warning(f"[LocationProvider] Invalid GPS coordinates out of bounds: lat={lat}, lon={lon}")
            except ValueError:
                logger.warning(f"[LocationProvider] Invalid GPS coordinates format: lat='{self._lat_str}', lon='{self._lon_str}'")
        else:
            logger.info("[LocationProvider] No static GPS coordinates configured.")

    def get_location_data(self) -> Dict[str, Any]:
        """
        Returns a structured dictionary of location data for the alert dispatcher and API.
        If location is unavailable, returns a dict with None values.
        """
        return {
            "latitude": self.latitude,
            "longitude": self.longitude,
            "accuracy": None, # Environment variables do not provide precision metrics
            "source": "static_env" if self.is_configured else None,
            "name": self.location_name
        }

# Global singleton instance for the backend to use
location_provider = LocationProvider()
