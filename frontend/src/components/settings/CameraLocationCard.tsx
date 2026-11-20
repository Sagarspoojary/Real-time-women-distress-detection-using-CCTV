import React, { useState, useEffect } from "react";
import { FiMapPin, FiSave, FiExternalLink, FiRefreshCw, FiCheckCircle, FiAlertTriangle, FiInfo } from "react-icons/fi";
import axios from "axios";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../../services/api";
import { useLocation } from "../../contexts/LocationContext";

export const CameraLocationCard: React.FC = () => {
  const { location, refreshLocation } = useLocation();
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [cameraName, setCameraName] = useState<string>("Main Entrance");
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (location.latitude != null) setLat(String(location.latitude));
    if (location.longitude != null) setLng(String(location.longitude));
    if (location.cameraName) setCameraName(location.cameraName);
  }, [location]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      toast.error("Please enter a valid Latitude between -90 and 90.");
      return;
    }
    if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      toast.error("Please enter a valid Longitude between -180 and 180.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        latitude: parsedLat,
        longitude: parsedLng,
        accuracy: 5.0,
        timestamp: new Date().toISOString(),
        is_manual: true,
      };

      const res = await axios.post(`${API_BASE_URL}/api/v1/location`, payload);
      if (res.data && res.data.status === "success") {
        toast.success("Camera GPS coordinates saved successfully!");
        if (refreshLocation) {
          await refreshLocation();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update camera location.");
    } finally {
      setSaving(false);
    }
  };

  const handleFetchBrowserLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by this browser.");
      return;
    }
    setFetching(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setFetching(false);
        if (pos.coords.accuracy > 500) {
          toast(
            `Acquired approximate location (±${Math.round(pos.coords.accuracy)}m). Laptops without GPS estimate via IP.`,
            { icon: "⚠️" }
          );
        } else {
          toast.success("High-precision GPS coordinates acquired!");
        }
      },
      (err) => {
        setFetching(false);
        toast.error(`Could not read GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-900 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-4">
        <div>
          <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2 uppercase tracking-wide">
            <FiMapPin className="text-cyan-400 text-base" /> Fixed CCTV Camera GPS & Location
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Configure the physical deployment location of this surveillance camera for emergency SMS and Email alerts.
          </p>
        </div>

        {location.latitude != null && location.longitude != null && (
          <a
            href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-bold px-3 py-1.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 transition-all self-start sm:self-center"
          >
            <span>Open in Google Maps</span>
            <FiExternalLink className="text-[11px]" />
          </a>
        )}
      </div>

      {/* Current Active Location Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-950/40 border border-slate-900 rounded-xl text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Active Status</span>
          <div className="flex items-center gap-1.5 mt-0.5 font-bold">
            {location.isApproximate ? (
              <>
                <FiAlertTriangle className="text-amber-400 text-sm" />
                <span className="text-amber-400">Approximate (IP Estimate)</span>
              </>
            ) : location.latitude != null ? (
              <>
                <FiCheckCircle className="text-emerald-400 text-sm" />
                <span className="text-emerald-400">Accurate / Configured</span>
              </>
            ) : (
              <span className="text-slate-500">Unconfigured</span>
            )}
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Coordinates</span>
          <span className="font-mono font-bold text-slate-300 mt-0.5 block">
            {location.latitude != null && location.longitude != null
              ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
              : "N/A"}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Accuracy Radius</span>
          <span className="font-bold text-slate-300 mt-0.5 block">
            {location.accuracy != null ? `±${Math.round(location.accuracy)} meters` : "N/A"}
          </span>
        </div>
      </div>

      {/* Notice about Laptops and CCTV GPS */}
      <div className="p-3.5 bg-cyan-950/20 border border-cyan-800/30 rounded-xl flex items-start gap-3">
        <FiInfo className="text-cyan-400 mt-0.5 shrink-0 text-base" />
        <div className="text-[11px] text-slate-400 leading-relaxed">
          <strong className="text-cyan-300 font-bold block mb-0.5">Why laptop location can be inaccurate:</strong>
          Laptops and desktop PCs do not have dedicated GPS hardware chips. Web browsers estimate location based on ISP network routing, which often defaults to regional telecom centers (e.g., Bangalore) with an error radius of ±5,000 meters. For a fixed CCTV installation, enter your exact coordinates below or set <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded font-mono">SAFETY_LOCATION_LAT</code> and <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded font-mono">SAFETY_LOCATION_LON</code> in <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded font-mono">.env</code>.
        </div>
      </div>

      {/* Coordinate Entry Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Camera / Terminal Location Name
          </label>
          <input
            type="text"
            value={cameraName}
            onChange={(e) => setCameraName(e.target.value)}
            placeholder="e.g. Main Entrance, Campus Block A"
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Latitude (-90 to +90)
            </label>
            <input
              type="text"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="e.g. 13.340880"
              className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Longitude (-180 to +180)
            </label>
            <input
              type="text"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="e.g. 74.742140"
              className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleFetchBrowserLocation}
            disabled={fetching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
          >
            <FiRefreshCw className={`text-xs ${fetching ? "animate-spin" : ""}`} />
            <span>Autofill from Browser GPS</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold uppercase tracking-wide transition-colors cursor-pointer disabled:opacity-50"
          >
            <FiSave className="text-xs" />
            <span>{saving ? "Saving..." : "Save Coordinates"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
