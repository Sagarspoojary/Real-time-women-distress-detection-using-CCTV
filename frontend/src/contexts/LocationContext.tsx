import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE_URL } from "../services/api";

export interface LocationData {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: number | null;
  permissionStatus: "granted" | "denied" | "unavailable" | "prompt";
  source?: string;
  isApproximate?: boolean;
  cameraName?: string;
  mapsLink?: string;
}

interface LocationContextType {
  location: LocationData;
  requestLocation: () => void;
  refreshLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<LocationData>({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
    permissionStatus: "prompt",
  });

  /**
   * Fetches the backend's current best-known location (may be a configured
   * static CCTV .env entry, a cached browser GPS push, or an IP estimate).
   * Used to populate the UI display – NOT to suppress the browser GPS prompt.
   */
  const fetchBackendLocation = useCallback(async (): Promise<boolean> => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/location`);
      if (res.data?.status === "success" && res.data.data) {
        const d = res.data.data;
        if (d.latitude != null && d.longitude != null) {
          const isConfigured = d.source === "configured_cctv" || d.source === "manual";
          setLocation({
            latitude: d.latitude,
            longitude: d.longitude,
            accuracy: d.accuracy,
            timestamp: Date.now(),
            permissionStatus: "granted",
            source: d.source,
            isApproximate: d.accuracy != null && d.accuracy >= 500 && !isConfigured,
            cameraName: d.camera_name,
            mapsLink: d.maps_link,
          });
          return isConfigured;
        }
      }
    } catch (_) {
      // Backend not ready or offline — silent
    }
    return false;
  }, []);

  /**
   * Requests location: Checks backend first for authoritative CCTV configuration (.env / manual).
   * Only falls back to browser Wi-Fi/IP estimation if NO fixed CCTV coordinates are configured.
   */
  const requestLocation = useCallback(async () => {
    // 1. Fetch backend location first to check for configured CCTV coordinates
    const isConfigured = await fetchBackendLocation();

    // 2. If configured (.env static CCTV or manual), preserve CCTV coordinates and do not overwrite with laptop IP
    if (isConfigured) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => setLocation((prev) => ({ ...prev, permissionStatus: "granted" })),
          () => {},
          { timeout: 5000 }
        );
      }
      return;
    }

    if (!navigator.geolocation) {
      console.warn("[Geolocation] Browser Geolocation API is not supported.");
      setLocation((prev) => ({ ...prev, permissionStatus: "unavailable" }));
      return;
    }

    // 3. Browser geolocation fallback for devices without static CCTV setup
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const isApprox = accuracy >= 500;
        setLocation({
          latitude,
          longitude,
          accuracy,
          timestamp: position.timestamp,
          permissionStatus: "granted",
          source: isApprox ? "browser_ip_approx" : "browser_gps",
          isApproximate: isApprox,
          mapsLink: `https://www.google.com/maps?q=${latitude},${longitude}`,
        });
        console.log(
          "[Geolocation] Location acquired:",
          latitude, longitude,
          `(Accuracy: ${accuracy}m${isApprox ? " — approximate IP estimate" : ""})`
        );
      },
      (error) => {
        console.warn("[Geolocation] Location request failed or denied:", error.message);
        setLocation((prev) => ({
          ...prev,
          permissionStatus: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [fetchBackendLocation]);

  useEffect(() => {
    requestLocation();
  }, []);

  return (
    <LocationContext.Provider value={{
      location,
      requestLocation,
      refreshLocation: async () => { await fetchBackendLocation(); }
    }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
};

