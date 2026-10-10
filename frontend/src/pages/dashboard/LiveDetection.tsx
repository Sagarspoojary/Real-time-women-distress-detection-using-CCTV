import React, { useState, useEffect, useRef, useCallback } from "react";
import LiveCamera from "../../components/live/LiveCamera";
import CameraControls from "../../components/live/CameraControls";
import SystemStatusCard from "../../components/live/SystemStatusCard";
import PersonCard from "../../components/live/PersonCard";
import type { PersonData } from "../../components/live/PersonCard";
import Timeline from "../../components/live/Timeline";
import type { TimelineEvent } from "../../components/live/Timeline";
import AlertCard from "../../components/live/AlertCard";
import type { AlertData } from "../../components/live/AlertCard";
import { FiCpu } from "react-icons/fi";

const API = "http://localhost:8000/api/v1";
const POLL_INTERVAL_MS = 2000; // poll /status every 2 seconds

const LiveDetection: React.FC = () => {
  // Camera state
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Camera source configuration
  const [cameraSource, setCameraSource] = useState<"LOCAL" | "IP">("LOCAL");
  const [ipUrl, setIpUrl] = useState("http://10.69.157.102:8080/video");

  // Real-time metrics (from status API)
  const [frameNumber, setFrameNumber] = useState(0);
  const [cameraFps, setCameraFps] = useState(0);
  const [aiFps, setAiFps] = useState(0);
  const [inferenceTimeMs, setInferenceTimeMs] = useState(0);
  const [predictedClass, setPredictedClass] = useState("Normal");
  const [confidence, setConfidence] = useState(0);
  const [threatState, setThreatState] = useState("NORMAL");
  const [alertStatus, setAlertStatus] = useState("IDLE");

  const [threatActive, setThreatActive] = useState(false);
  const [lastIncidentId, setLastIncidentId] = useState<string | null>(null);
  const [uptimeSeconds, setUptimeSeconds] = useState(0);

  const [, setAlertLevel] = useState<"Normal" | "Warning" | "Critical" | "Emergency">("Normal");

  // UI data
  const [persons] = useState<PersonData[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  // Track incidents we've already shown an alert card for (to avoid duplicates)
  const seenIncidents = useRef<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ────────────────────────────────────────────────────────────────────────────
  // Status polling — runs while webcam is active
  // ────────────────────────────────────────────────────────────────────────────
  const pollStatus = useCallback(async () => {
    try {
      const endpoint = cameraSource === "LOCAL" ? "webcam/status" : "ipwebcam/status";
      const res = await fetch(`${API}/${endpoint}`);
      if (!res.ok) return;
      const data = await res.json();

      setFrameNumber(data.frames_processed ?? 0);
      setUptimeSeconds(data.uptime_seconds ?? 0);
      setCameraFps(data.camera_fps ?? 0);
      setAiFps(data.ai_fps ?? 0);
      setInferenceTimeMs(data.inference_time_ms ?? 0);
      setPredictedClass(data.predicted_class ?? "Normal");
      setConfidence(data.confidence ?? 0);
      setThreatState(data.threat_state ?? "NORMAL");
      setAlertStatus(data.alert_status ?? "IDLE");

      const isThreat: boolean = data.threat_active === true;
      const incidentId: string | null = data.last_incident_id ?? null;

      setThreatActive(isThreat);
      setLastIncidentId(incidentId);

      if (isThreat || data.threat_state === "THREAT ACTIVE") {
        setAlertLevel("Emergency");

        // Inject a real alert card if this is a new incident
        if (incidentId && !seenIncidents.current.has(incidentId)) {
          seenIncidents.current.add(incidentId);
          const timestamp = new Date().toLocaleTimeString(undefined, { hour12: false });

          const newAlert: AlertData = {
            id: incidentId,
            time: timestamp,
            priority: "Emergency",
            desc: `Violence detected (${data.predicted_class} ${data.confidence}%). Incident: ${incidentId}. Emergency email dispatched with video evidence.`,
            status: "EMAIL DISPATCHED",
          };
          setAlerts((prev) => [newAlert, ...prev.slice(0, 5)]);

          const newEvent: TimelineEvent = {
            id: `evt-${incidentId}`,
            time: timestamp,
            text: `⚠ EMERGENCY: ${incidentId} — Email alert dispatched with video clip + snapshot`,
            type: "violence",
          };
          setEvents((prev) => [newEvent, ...prev.slice(0, 15)]);
        }
      } else if (data.threat_state === "VIOLENCE SUSPECTED" || data.threat_state === "CONFIRMING") {
        setAlertLevel("Warning");
      } else {
        setAlertLevel("Normal");
      }
    } catch {
      // Backend may be starting up — ignore silently
    }
  }, [cameraSource]);

  // Start / stop polling
  useEffect(() => {
    if (isActive && !isPaused) {
      pollRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);
      pollStatus(); // immediate first poll
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isActive, isPaused, pollStatus]);

  // ────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────────────────────────────────
  const handleStart = async () => {
    setIsLoading(true);
    try {
      const endpoint = cameraSource === "LOCAL" ? "webcam/start" : "ipwebcam/start";
      const body = cameraSource === "IP" ? JSON.stringify({ url: ipUrl }) : undefined;
      const headers = cameraSource === "IP" ? { "Content-Type": "application/json" } : undefined;
      
      const res = await fetch(`${API}/${endpoint}`, { 
        method: "POST",
        headers,
        body
      });
      const data = await res.json();
      if (res.ok && (data.status === "started" || data.status === "already_running")) {
        setIsActive(true);
        setIsPaused(false);
        setFrameNumber(0);
        setAlertLevel("Normal");
        setThreatActive(false);
        seenIncidents.current.clear();

        const timestamp = new Date().toLocaleTimeString(undefined, { hour12: false });
        const camName = cameraSource === "LOCAL" ? "WEBCAM-01" : "IP-WEBCAM-01";
        setEvents([
          { id: "boot-1", time: timestamp, text: `${cameraSource === "LOCAL" ? "Webcam" : "IP Camera"} AI inference engines started successfully`, type: "system" },
          { id: "boot-2", time: timestamp, text: `${camName} initialized — VideoMAE Model 1 active`, type: "system" },
        ]);
        setAlerts([]);
      } else {
        const msg = data.detail || "Failed to start webcam.";
        addSystemEvent(`ERROR: ${msg}`, "alert");
      }
    } catch (err) {
      addSystemEvent("ERROR: Could not reach backend. Is the server running?", "alert");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      const endpoint = cameraSource === "LOCAL" ? "webcam/stop" : "ipwebcam/stop";
      await fetch(`${API}/${endpoint}`, { method: "POST" });
    } catch {
      // ignore
    } finally {
      setIsActive(false);
      setIsPaused(false);
      setThreatActive(false);
      setAlertLevel("Normal");
      setFrameNumber(0);
      setUptimeSeconds(0);
      setPersons_noop();
      setIsLoading(false);
    }
  };

  const handlePause = () => {
    setIsPaused((prev) => !prev);
  };

  const handleDismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    if (alerts.length <= 1) setAlertLevel("Normal");
  };

  // Helper to add system events
  const addSystemEvent = (text: string, type: TimelineEvent["type"]) => {
    const timestamp = new Date().toLocaleTimeString(undefined, { hour12: false });
    setEvents((prev) => [{ id: String(Date.now()), time: timestamp, text, type }, ...prev.slice(0, 15)]);
  };

  // No-op setter to satisfy TypeScript without having persons state change
  const setPersons_noop = () => {};

  // ────────────────────────────────────────────────────────────────────────────
  // Uptime formatter
  // ────────────────────────────────────────────────────────────────────────────
  const formatUptime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 select-none">

      {/* COLUMN 1 & 2: Camera Viewport + Controls + Timeline */}
      <div className="xl:col-span-3 space-y-6 flex flex-col">

        <LiveCamera
          isActive={isActive}
          isPaused={isPaused}
          fps={cameraFps || 20}
          streamUrl={isActive && !isPaused ? `${API}/${cameraSource === "LOCAL" ? "webcam" : "ipwebcam"}/stream` : undefined}
          threatActive={threatActive}
        />

        {/* Camera control bar */}
        <CameraControls
          isActive={isActive}
          isPaused={isPaused}
          cameraSource={cameraSource}
          setCameraSource={setCameraSource}
          ipUrl={ipUrl}
          setIpUrl={setIpUrl}
          onStart={isLoading ? () => {} : handleStart}
          onStop={isLoading ? () => {} : handleStop}
          onPause={handlePause}
        />

        {/* Event Logs Timeline */}
        <Timeline events={events} />
      </div>

      {/* COLUMN 3: Diagnostics Panel */}
      <div className="space-y-6 flex flex-col">

        {/* Detection Metrics Stats */}
        <div className="glass-panel p-4 rounded-xl border border-slate-900 flex flex-col gap-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2">
            <FiCpu className="text-cyan-400" /> AI Detection Terminal
          </h3>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center py-2 border-b border-slate-900/60 text-xs">
              <span className="font-semibold text-slate-500 uppercase tracking-wider">Threat State</span>
              {isActive && !isPaused ? (
                threatState === "THREAT ACTIVE" ? (
                  <span className="font-bold text-red-400 animate-pulse">⚠ THREAT ACTIVE</span>
                ) : threatState === "CONFIRMING" || threatState === "VIOLENCE SUSPECTED" ? (
                  <span className="font-bold text-amber-400 animate-pulse">⚡ {threatState}</span>
                ) : (
                  <span className="font-bold text-emerald-400 animate-pulse">NORMAL</span>
                )
              ) : (
                <span className="font-bold text-slate-500">STANDBY</span>
              )}
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-900/60 text-xs">
              <span className="font-semibold text-slate-500 uppercase tracking-wider">Activity / Class</span>
              <span className={`font-mono font-bold ${
                predictedClass !== "Normal" ? "text-red-400" : "text-emerald-400"
              }`}>
                {predictedClass} ({confidence.toFixed(1)}%)
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-900/60 text-xs">
              <span className="font-semibold text-slate-500 uppercase tracking-wider">Camera FPS / AI FPS</span>
              <span className="font-mono font-bold text-slate-100">
                {cameraFps.toFixed(1)} FPS / {aiFps.toFixed(1)} FPS
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-900/60 text-xs">
              <span className="font-semibold text-slate-500 uppercase tracking-wider">Inference Latency</span>
              <span className="font-mono font-bold text-cyan-400">
                {inferenceTimeMs.toFixed(0)} ms
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-900/60 text-xs">
              <span className="font-semibold text-slate-500 uppercase tracking-wider">Alert / Evidence</span>
              <span className={`font-mono font-bold text-[11px] ${
                alertStatus === "SENT" ? "text-emerald-400" : alertStatus === "DISPATCHING" ? "text-amber-400" : "text-slate-400"
              }`}>
                {alertStatus}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-900/60 text-xs">
              <span className="font-semibold text-slate-500 uppercase tracking-wider">Frames Scanned</span>
              <span className="font-mono font-bold text-slate-100">{frameNumber.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-900/60 text-xs">
              <span className="font-semibold text-slate-500 uppercase tracking-wider">Uptime</span>
              <span className="font-mono font-bold text-slate-100">
                {isActive ? formatUptime(uptimeSeconds) : "—"}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 text-xs">
              <span className="font-semibold text-slate-500 uppercase tracking-wider">Last Incident</span>
              <span className="font-mono font-bold text-amber-400 text-[10px]">
                {lastIncidentId ?? "None"}
              </span>
            </div>
          </div>
        </div>

        {/* Model Pipeline statuses */}
        <SystemStatusCard />
      </div>

      {/* COLUMN 4: Active Targets & Alerts */}
      <div className="xl:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">

        {/* Bounding box target list */}
        <div className="flex flex-col gap-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 px-1">
            Active Targets ({isActive ? persons.length : 0})
          </h3>
          {isActive && persons.length > 0 ? (
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {persons.map((person) => (
                <PersonCard key={person.trackId} person={person} />
              ))}
            </div>
          ) : (
            <div className="glass-panel p-8 rounded-xl border border-slate-900 text-xs text-slate-500 italic text-center">
              {isActive
                ? "Person tracking results will appear here during threat events."
                : "No active targets locked. Initialize feed analysis."}
            </div>
          )}
        </div>

        {/* Priority Dispatch alert overlays */}
        <div className="flex flex-col gap-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 px-1">
            Dispatch Alerts ({alerts.length})
          </h3>
          {alerts.length > 0 ? (
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              <AlertCard alerts={alerts} onDismiss={handleDismissAlert} />
            </div>
          ) : (
            <div className="glass-panel p-8 rounded-xl border border-slate-900 text-xs text-slate-500 italic text-center">
              System secure. No active alert logs reported.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default LiveDetection;
