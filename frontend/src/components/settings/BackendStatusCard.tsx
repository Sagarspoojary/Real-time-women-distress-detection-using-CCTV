import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../services/api";
import { 
  FiServer, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiRefreshCw, 
  FiZap 
} from "react-icons/fi";
import toast from "react-hot-toast";

const BackendStatusCard: React.FC = () => {
  const [apiUrl, setApiUrl] = useState(API_BASE_URL);
  const [status, setStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [latency, setLatency] = useState<number | null>(null);
  const version = "1.0.0";
  const [loading, setLoading] = useState(false);

  const checkHealth = async (showToast = false) => {
    setLoading(true);
    if (showToast) {
      toast.loading("Pinging security gateway...", { id: "ping" });
    }
    const startTime = performance.now();
    try {
      // Ping the root health-check route
      await axios.get(apiUrl, { timeout: 3000 });
      const endTime = performance.now();
      
      setLatency(Math.round(endTime - startTime));
      setStatus("connected");
      if (showToast) {
        toast.success("Security gateway connection active!", { id: "ping" });
      }
    } catch (err) {
      setStatus("disconnected");
      setLatency(null);
      if (showToast) {
        toast.error("Gateway offline. Verification failed.", { id: "ping" });
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial check
  useEffect(() => {
    checkHealth();
  }, [apiUrl]);

  return (
    <div className="glass-panel p-6 rounded-xl border border-slate-900 space-y-6 text-xs select-none">
      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
        <h3 className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <FiServer /> Surveillance Server Interface
        </h3>

        <span className={`px-2.5 py-0.5 rounded border text-[8px] font-extrabold uppercase tracking-widest flex items-center gap-1 ${
          status === "connected" 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
            : status === "disconnected"
            ? "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse"
            : "bg-slate-950 text-slate-500 border-slate-800"
        }`}>
          {status === "connected" ? "Connected" : status === "disconnected" ? "Disconnected" : "Checking..."}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Latency card */}
        <div className="p-4 bg-slate-950/20 border border-slate-900 rounded-xl flex gap-3.5 items-center">
          <div className="p-2.5 bg-slate-900 border border-slate-800 text-cyan-400 rounded-lg">
            <FiZap className="text-md" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Latency latency</span>
            <span className="font-mono font-bold text-slate-200 mt-1 block">
              {latency !== null ? `${latency} ms` : "Offline"}
            </span>
          </div>
        </div>

        {/* API version */}
        <div className="p-4 bg-slate-950/20 border border-slate-900 rounded-xl flex gap-3.5 items-center">
          <div className="p-2.5 bg-slate-900 border border-slate-800 text-cyan-400 rounded-lg">
            <FiCheckCircle className="text-md" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block">API Release version</span>
            <span className="font-mono font-bold text-slate-200 mt-1 block">v{version}</span>
          </div>
        </div>

        {/* Connection status description */}
        <div className="p-4 bg-slate-950/20 border border-slate-900 rounded-xl flex gap-3.5 items-center">
          <div className="p-2.5 bg-slate-900 border border-slate-800 text-cyan-400 rounded-lg">
            <FiAlertCircle className="text-md" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Host Address</span>
            <span className="font-mono font-bold text-slate-200 mt-1 block truncate max-w-[120px]">{apiUrl}</span>
          </div>
        </div>

      </div>

      {/* URL Inputs */}
      <div className="space-y-4 pt-4 border-t border-slate-900/60">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Surveillance Gateway endpoint URL
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:8000"
              className="flex-grow px-3 py-2 rounded-lg glass-input text-white font-mono font-bold text-xs"
            />
            <button
              onClick={() => checkHealth(true)}
              disabled={loading}
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-50 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 uppercase tracking-wider text-[10px]"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} /> Ping Gateway
            </button>
          </div>
          <span className="text-[9px] text-slate-600 mt-1.5 block">
            Enter the host route of your running FastAPI backend application to sync data feeds.
          </span>
        </div>
      </div>

    </div>
  );
};

export default BackendStatusCard;
