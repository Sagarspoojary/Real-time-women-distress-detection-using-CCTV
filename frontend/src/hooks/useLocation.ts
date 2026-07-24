import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { API_BASE_URL } from "../services/api";

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: string | null;
  error: string | null;
  permissionGranted: boolean;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationState>(() => {
    try {
      const cached = localStorage.getItem("distress_ai_last_location");
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          accuracy: parsed.accuracy,
          timestamp: parsed.timestamp,
          error: null,
          permissionGranted: true,
        };
      }
    } catch (e) {
      // ignore parsing error
    }
    return {
      latitude: null,
      longitude: null,
      accuracy: null,
      timestamp: null,
      error: null,
      permissionGranted: false,
    };
  });

  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    // If cached location exists, sync immediately to backend on mount
    try {
      const cached = localStorage.getItem("distress_ai_last_location");
      if (cached) {
        const parsed = JSON.parse(cached);
        axios.post(`${API_BASE_URL}/api/v1/location`, parsed).catch(() => {});
      }
    } catch (e) {}

    if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        error: "Geolocation is not supported by this browser.",
      }));
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      const timestamp = new Date(position.timestamp).toISOString();

      const newLoc = {
        latitude,
        longitude,
        accuracy: Math.round(accuracy),
        timestamp,
      };

      try {
        localStorage.setItem("distress_ai_last_location", JSON.stringify(newLoc));
      } catch (e) {}

      setLocation({
        ...newLoc,
        error: null,
        permissionGranted: true,
      });

      // Automatically sync with FastAPI backend
      axios
        .post(`${API_BASE_URL}/api/v1/location`, newLoc)
        .catch((err) => {
          console.warn("[useLocation] Failed to sync location with backend:", err);
        });
    };

    const handleError = (error: GeolocationPositionError) => {
      console.warn("[useLocation] Geolocation error:", error.message);
      setLocation((prev) => ({
        ...prev,
        error: error.message,
        permissionGranted: false,
      }));
    };

    // Immediate location fetch on mount
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      (err) => console.warn("[useLocation] getCurrentPosition fallback error:", err.message),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: Infinity }
    );

    // Start live tracking using watchPosition()
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return location;
}
