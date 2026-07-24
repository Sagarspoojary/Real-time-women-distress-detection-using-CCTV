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
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
    error: null,
    permissionGranted: false,
  });

  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
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

      setLocation({
        latitude,
        longitude,
        accuracy: Math.round(accuracy),
        timestamp,
        error: null,
        permissionGranted: true,
      });

      // Automatically sync with FastAPI backend
      axios
        .post(`${API_BASE_URL}/api/v1/location`, {
          latitude,
          longitude,
          accuracy: Math.round(accuracy),
          timestamp,
        })
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
