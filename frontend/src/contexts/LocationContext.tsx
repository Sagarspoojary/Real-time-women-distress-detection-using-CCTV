import React, { createContext, useContext, useState, useEffect } from "react";

export interface LocationData {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: number | null;
  permissionStatus: "granted" | "denied" | "unavailable" | "prompt";
}

interface LocationContextType {
  location: LocationData;
  requestLocation: () => void;
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

  const requestLocation = () => {
    if (!navigator.geolocation) {
      console.warn("[Geolocation] Browser Geolocation API is not supported.");
      setLocation((prev) => ({ ...prev, permissionStatus: "unavailable" }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = position.coords;
        setLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          timestamp: position.timestamp,
          permissionStatus: "granted",
        });
        console.log("[Geolocation] Location permission granted:", coords.latitude, coords.longitude);
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
  };

  useEffect(() => {
    requestLocation();
  }, []);

  return (
    <LocationContext.Provider value={{ location, requestLocation }}>
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
