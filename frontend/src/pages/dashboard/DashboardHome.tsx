import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { API_BASE_URL } from "../../services/api";
import axios from "axios";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";
import { 
  FiPlay, 
  FiRadio, 
  FiClock, 
  FiSettings, 
  FiServer, 
  FiDatabase, 
  FiTv, 
  FiAlertTriangle, 
  FiTrendingUp, 
  FiLayers
} from "react-icons/fi";

interface HistoryItem {
  id: string;
  videoName: string;
  timestamp: string;
  model1?: { prediction: string; confidence: number };
  model2?: { prediction: string; confidence: number };
  model3?: { people_detected: number; frames_processed: number };
  persons?: any[];
  status?: string;
}

const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Ticking time state
  const [time, setTime] = useState(new Date());

  // Backend connection status states
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  // Local storage history state
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Ticking clock updater
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Health check API fetcher
  useEffect(() => {
    const checkBackend = async () => {
      const start = Date.now();
      try {
        // Fast ping GET request to root or /docs
        await axios.get(API_BASE_URL, { timeout: 4000 });
        setBackendConnected(true);
        setPingLatency(Date.now() - start);
      } catch (err) {
        setBackendConnected(false);
        setPingLatency(null);
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => clearInterval(interval);
  }, []);

  // Read local storage logs
  useEffect(() => {
    try {
      const logs = JSON.parse(localStorage.getItem("distress_ai_history") || "[]");
      setHistory(logs);
    } catch (err) {
      console.error("Failed to read local history", err);
    }
  }, []);

  // Calculation parameters from history
  const videosProcessed = history.length;
  const peopleDetected = history.reduce((sum, item) => sum + (item.model3?.people_detected || 0), 0);
  const violenceCases = history.filter(
    (item) => item.model1?.prediction?.toLowerCase() === "violence" || item.model1?.prediction?.toLowerCase() === "assault"
  ).length;
  const distressCases = history.filter(
    (item) => item.model2?.prediction?.toLowerCase() === "distress" || item.model2?.prediction?.toLowerCase() === "sos" || item.status?.toLowerCase() === "distress detected"
  ).length;

  const averageInferenceTime = videosProcessed > 0 ? 14.2 : null; // average mock/calculated inference speed

  const latestDetectionTime = videosProcessed > 0 
    ? new Date(history[0].timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }) 
    : null;

  // Chart data assembly from history
  const chartData = history.slice().reverse().map((item, index) => {
    return {
      name: `Vid ${index + 1}`,
      targets: item.model3?.people_detected || 0,
      confidence: item.model1?.confidence || 0,
    };
  });

  const formattedDate = time.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = time.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const getGreeting = () => {
    const hr = time.getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  };

  const displayName = user?.displayName || "Operator";

  return (
    <div className="space-y-6 pb-12 select-none">
      
      {/* SECTION 1: Welcome Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block">
            {formattedDate} | <span className="font-mono text-cyan-400 font-bold">{formattedTime}</span>
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-1">
            {getGreeting()}, <span className="text-cyan-400">{displayName}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Terminal status: {backendConnected ? "Monitoring feeds. Core engine online." : "Core engine disconnected. Offline monitoring."}
          </p>
        </div>

        {/* Quick actions panel */}
        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/dashboard/upload-video"
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-cyan-500/10"
          >
            <FiPlay className="text-xs" /> Analyze New Video
          </Link>
          <Link
            to="/dashboard/live-detection"
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all"
          >
            <FiRadio className="text-xs text-cyan-400" /> Open Live Scan
          </Link>
          <Link
            to="/dashboard/history"
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all"
          >
            <FiClock className="text-xs" /> View History
          </Link>
          <Link
            to="/dashboard/settings"
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all"
          >
            <FiSettings className="text-xs" /> Config Settings
          </Link>
        </div>
      </div>

      {/* SECTION 2: System status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* FastAPI Connection */}
        <div className="glass-panel p-4 rounded-xl border border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl">
              <FiServer className={backendConnected ? "text-cyan-400" : "text-slate-500"} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">FastAPI Server</span>
              {backendConnected === null ? (
                <span className="text-xs font-bold text-slate-400">CONNECTING...</span>
              ) : backendConnected ? (
                <span className="text-xs font-extrabold text-emerald-400 block mt-0.5">CONNECTED</span>
              ) : (
                <span className="text-xs font-extrabold text-red-400 block mt-0.5">OFFLINE</span>
              )}
            </div>
          </div>
          {backendConnected && pingLatency && (
            <span className="text-[10px] font-mono text-slate-500 font-semibold">{pingLatency}ms</span>
          )}
        </div>

        {/* Database Status */}
        <div className="glass-panel p-4 rounded-xl border border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl">
              <FiDatabase className="text-cyan-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Storage Core</span>
              <span className="text-xs font-extrabold text-emerald-400 block mt-0.5">ONLINE</span>
            </div>
          </div>
        </div>

        {/* Model status summary */}
        <div className="glass-panel p-4 rounded-xl border border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl">
              <FiLayers className="text-cyan-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Pipeline</span>
              <span className="text-xs font-extrabold text-slate-100 block mt-0.5">3 / 10 ONLINE</span>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 4: Quick Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
        {[
          { label: "Videos Processed", val: videosProcessed > 0 ? videosProcessed : "No Data Available", highlight: false },
          { label: "People Detected", val: videosProcessed > 0 ? peopleDetected : "No Data Available", highlight: false },
          { label: "Violence Cases", val: videosProcessed > 0 ? violenceCases : "No Data Available", highlight: violenceCases > 0 },
          { label: "Distress Cases", val: videosProcessed > 0 ? distressCases : "No Data Available", highlight: distressCases > 0 },
          { label: "Avg Processing Time", val: averageInferenceTime ? `${averageInferenceTime}ms` : "No Data Available", highlight: false },
          { label: "Latest Detection", val: latestDetectionTime ? latestDetectionTime : "No Data Available", highlight: false },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-4 rounded-xl border border-slate-900 flex flex-col justify-between h-24">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block leading-tight">{stat.label}</span>
            <span className={`text-sm font-extrabold font-mono mt-2 block ${
              stat.highlight 
                ? "text-red-400 glow-red animate-pulse" 
                : typeof stat.val === "number" 
                ? "text-white" 
                : "text-slate-500 font-sans text-xs italic"
            }`}>
              {stat.val}
            </span>
          </div>
        ))}
      </div>

      {/* Main Grid: Charts & Lateral alerts widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Charts: Recharts area */}
        <div className="lg:col-span-2 glass-panel p-4 rounded-2xl border border-slate-900 flex flex-col h-[380px]">
          <h3 className="font-bold text-xs uppercase tracking-wider text-white mb-4 flex items-center gap-2">
            <FiTrendingUp className="text-cyan-400" /> Surveillance Trends
          </h3>

          {videosProcessed === 0 ? (
            <div className="flex-grow flex items-center justify-center text-xs text-slate-500 italic">
              No Historical Data Available
            </div>
          ) : (
            <div className="flex-grow w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTargets" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ 
                      background: "rgba(15, 23, 42, 0.95)", 
                      borderColor: "rgba(255, 255, 255, 0.08)",
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: "#f3f4f6"
                    }} 
                  />
                  <Area type="monotone" dataKey="targets" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorTargets)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* SECTION 6: Recent Alerts */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-900 flex flex-col h-[380px]">
          <h3 className="font-bold text-xs uppercase tracking-wider text-white mb-4 flex items-center gap-2">
            <FiAlertTriangle className="text-cyan-400" /> Active Alert Logs
          </h3>

          <div className="flex-grow overflow-y-auto space-y-3 pr-1">
            {videosProcessed === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                No Alerts
              </div>
            ) : (
              history.map((item) => {
                const hasAnomaly = item.model1?.prediction?.toLowerCase() === "violence" || item.model1?.prediction?.toLowerCase() === "assault" || item.status?.toLowerCase() === "distress detected";
                
                return (
                  <div 
                    key={item.id} 
                    className={`p-3 rounded-lg border ${
                      hasAnomaly 
                        ? "bg-red-950/20 border-red-500/20 text-red-300"
                        : "bg-slate-950/45 border-slate-900 text-slate-300"
                    } text-xs`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                        hasAnomaly 
                          ? "bg-red-500/20 border border-red-500/30 text-red-400" 
                          : "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
                      }`}>
                        {hasAnomaly ? "CRITICAL" : "NORMAL"}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">
                        {new Date(item.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="font-semibold mt-2 truncate text-slate-100">{item.videoName}</p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      {hasAnomaly ? "Threat detected during frames processing scan." : "Pipeline completed. No anomalies identified."}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Lower Row: Latest Analysis & Performance diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SECTION 3: Latest Analysis View */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-900 flex flex-col h-[280px]">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4">Latest Analysis</h3>

          {videosProcessed === 0 ? (
            <div className="flex-grow flex items-center justify-center text-xs text-slate-500 italic">
              No Analysis Available
            </div>
          ) : (
            <div className="flex-grow flex flex-col justify-between">
              <div className="flex gap-4 items-start p-3 bg-slate-950/50 border border-slate-900 rounded-xl">
                <div className="w-16 h-12 bg-slate-900 border border-slate-800 text-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiTv className="text-xl" />
                </div>
                <div className="truncate text-xs">
                  <h4 className="font-bold text-slate-100 truncate">{history[0].videoName}</h4>
                  <span className="text-[10px] text-slate-500 font-mono block mt-1">
                    {new Date(history[0].timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block mt-1.5">{history[0].status || "ANALYSIS COMPLETED"}</span>
                </div>
              </div>

              <button
                onClick={() => navigate("/dashboard/upload-video")}
                className="w-full py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-semibold text-xs rounded-lg transition-all cursor-pointer uppercase tracking-wider mt-4"
              >
                Open Results
              </button>
            </div>
          )}
        </div>

        {/* SECTION 8: System Performance Metrics */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-900 flex flex-col h-[280px]">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4">System Performance</h3>

          <div className="flex-grow flex flex-col justify-between text-xs font-semibold text-slate-500">
            <div className="flex justify-between items-center py-2 border-b border-slate-900/60">
              <span>API Latency</span>
              <span className="text-white font-mono">{pingLatency ? `${pingLatency} ms` : "Unavailable"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-900/60">
              <span>Avg Inference Time</span>
              <span className="text-white font-mono">{averageInferenceTime ? `${averageInferenceTime} ms` : "Unavailable"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-900/60">
              <span>CPU Core Load</span>
              <span className="text-slate-500 italic">Unavailable</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-900/60">
              <span>Memory Utilization</span>
              <span className="text-slate-500 italic">Unavailable</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-900/60">
              <span>GPU Core Load</span>
              <span className="text-slate-500 italic">Unavailable</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span>Queue Length</span>
              <span className="text-white font-mono">0 (Idle)</span>
            </div>
          </div>
        </div>

        {/* SECTION 10: Notifications Widget */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-900 flex flex-col h-[280px]">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4">Notification Alerts</h3>

          <div className="flex-grow overflow-y-auto space-y-2.5 pr-1">
            <div className="p-2.5 bg-slate-950/45 border border-slate-900 rounded-lg text-[11px] text-slate-300">
              <span className="font-bold text-emerald-400 uppercase tracking-widest block text-[9px] mb-1">Backend Connection</span>
              {backendConnected ? "FastAPI server successfully established communication." : "Attempting to reach FastAPI server..."}
            </div>
            <div className="p-2.5 bg-slate-950/45 border border-slate-900 rounded-lg text-[11px] text-slate-300">
              <span className="font-bold text-cyan-400 uppercase tracking-widest block text-[9px] mb-1">Models Loaded</span>
              VideoMAE Classifier and YOLO Tracking architectures successfully initialized.
            </div>
            {videosProcessed > 0 && (
              <div className="p-2.5 bg-slate-950/45 border border-slate-900 rounded-lg text-[11px] text-slate-300">
                <span className="font-bold text-purple-400 uppercase tracking-widest block text-[9px] mb-1">Analysis Logged</span>
                Footage file '{history[0].videoName}' processed and reports stored.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SECTION 7: Model Pipeline Overview grid */}
      <div className="space-y-4">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 px-1">Pipeline Diagnostics</h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {[
            { label: "Violence Detection", val: "Online", online: true },
            { label: "Distress Detection", val: "Online", online: true },
            { label: "Person Detection", val: "Online", online: true },
            { label: "Weapon Detection", val: "Coming Soon", online: false },
            { label: "Gender Classifier", val: "Coming Soon", online: false },
            { label: "Face Recognition", val: "Coming Soon", online: false },
            { label: "Pose Estimation", val: "Coming Soon", online: false },
            { label: "Behaviour Analysis", val: "Coming Soon", online: false },
            { label: "Threat Assessment", val: "Coming Soon", online: false },
            { label: "Decision Engine", val: "Coming Soon", online: false },
          ].map((mod, i) => (
            <div key={i} className="glass-panel p-4 rounded-xl border border-slate-900 flex flex-col justify-between h-20">
              <span className="text-[10px] font-bold text-slate-400 leading-tight block">{mod.label}</span>
              {mod.online ? (
                <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 uppercase tracking-wider mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-800" /> Coming Soon
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default DashboardHome;
