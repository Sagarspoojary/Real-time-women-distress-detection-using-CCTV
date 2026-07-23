import React, { useState, useEffect } from "react";
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

const LiveDetection: React.FC = () => {
  // Camera state
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Real-time metrics
  const [frameNumber, setFrameNumber] = useState(0);
  const [fps, setFps] = useState(29.4);
  const [inferenceTime, setInferenceTime] = useState(14.2);
  const [confidence, setConfidence] = useState(0.934);
  const [alertLevel, setAlertLevel] = useState<"Normal" | "Warning" | "Critical" | "Emergency">("Normal");
  
  // Simulated datasets
  const [persons, setPersons] = useState<PersonData[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  // Simulation Runner
  useEffect(() => {
    if (!isActive || isPaused) return;

    // Start ticks
    const interval = setInterval(() => {
      // 1. Increment frame
      setFrameNumber((prev) => prev + 1);

      // 2. Fluctuate metrics
      setFps(28.5 + Math.random() * 1.5);
      setInferenceTime(12.8 + Math.random() * 3.4);
      setConfidence(0.89 + Math.random() * 0.08);

      // 3. Update tracked person coordinates slightly
      setPersons((prevPersons) => {
        if (prevPersons.length === 0) {
          // Initialize simulation tracks
          return [
            {
              trackId: 1,
              confidence: 0.932,
              bbox: [585, 488, 1093, 1076],
              threatLevel: "Low",
              distress: false,
              pose: "standing",
            },
            {
              trackId: 4,
              confidence: 0.913,
              bbox: [1464, 220, 2190, 1075],
              threatLevel: "High",
              distress: true,
              pose: "running",
            }
          ];
        }

        // Shift coordinates slightly
        return prevPersons.map((p) => {
          const shiftX = Math.floor(Math.random() * 6) - 3;
          const shiftY = Math.floor(Math.random() * 4) - 2;
          return {
            ...p,
            confidence: Number((0.88 + Math.random() * 0.1).toFixed(3)),
            bbox: [
              p.bbox[0] + shiftX,
              p.bbox[1] + shiftY,
              p.bbox[2] + shiftX,
              p.bbox[3] + shiftY
            ] as [number, number, number, number]
          };
        });
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isActive, isPaused]);

  // Periodic simulated events injector (Timeline + Alerts)
  useEffect(() => {
    if (!isActive || isPaused) return;

    const eventFeed = [
      { text: "Target track ID 01 registered in sector A", type: "person" },
      { text: "Action: running detected on Track ID 04", type: "distress" },
      { text: "Critical: physical punching anomaly detected", type: "violence" },
      { text: "High-priority warning dispatched to terminal L1", type: "alert" },
      { text: "CCTV feed stream latency synchronized", type: "system" }
    ];

    const alertsFeed = [
      { priority: "Warning", desc: "Suspicious physical posturing on Track ID 01", status: "PENDING" },
      { priority: "Emergency", desc: "Assault anomaly detected on Camera 04 Sector B", status: "ACTIVE DISPATCH" },
      { priority: "Critical", desc: "Sudden rapid acceleration detected in restricted path", status: "ALERT CONFIRMED" }
    ];

    const timer = setInterval(() => {
      // Pick random event
      const randEvent = eventFeed[Math.floor(Math.random() * eventFeed.length)];
      const timestamp = new Date().toLocaleTimeString(undefined, { hour12: false });
      
      const newEvent: TimelineEvent = {
        id: String(Math.random()),
        time: timestamp,
        text: randEvent.text,
        type: randEvent.type as any
      };

      setEvents((prev) => [newEvent, ...prev.slice(0, 15)]);

      // 15% chance to spawn an alert
      if (Math.random() > 0.65) {
        const randAlert = alertsFeed[Math.floor(Math.random() * alertsFeed.length)];
        const newAlert: AlertData = {
          id: String(Math.random()),
          time: timestamp,
          priority: randAlert.priority as any,
          desc: randAlert.desc,
          status: randAlert.status
        };

        setAlerts((prev) => [newAlert, ...prev.slice(0, 5)]);
        setAlertLevel(randAlert.priority as any);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [isActive, isPaused]);

  // Handle camera start
  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
    setFrameNumber(0);
    // Initialize default items
    const timestamp = new Date().toLocaleTimeString(undefined, { hour12: false });
    setEvents([
      { id: "1", time: timestamp, text: "AI inference engines started successfully", type: "system" },
      { id: "2", time: timestamp, text: "CCTV Camera Feed 04 initialized", type: "system" }
    ]);
    setPersons([
      { trackId: 1, confidence: 0.93, bbox: [585, 488, 1093, 1076], threatLevel: "Low", distress: false, pose: "standing" },
      { trackId: 4, confidence: 0.91, bbox: [1464, 220, 2190, 1075], threatLevel: "High", distress: true, pose: "running" }
    ]);
  };

  // Handle camera stop
  const handleStop = () => {
    setIsActive(false);
    setIsPaused(false);
    setPersons([]);
    setEvents([]);
    setAlerts([]);
    setAlertLevel("Normal");
  };

  // Handle camera pause
  const handlePause = () => {
    setIsPaused((prev) => !prev);
  };

  // Dismiss an alert
  const handleDismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    if (alerts.length <= 1) {
      setAlertLevel("Normal");
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 select-none">
      
      {/* COLUMN 1 & 2: Camera Viewport, Timeline controls */}
      <div className="xl:col-span-3 space-y-6 flex flex-col">
        
        {/* Live Viewport Panel */}
        <LiveCamera isActive={isActive} isPaused={isPaused} fps={fps} />

        {/* Camera control bar */}
        <CameraControls 
          isActive={isActive} 
          isPaused={isPaused} 
          onStart={handleStart} 
          onStop={handleStop} 
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
              <span className="font-semibold text-slate-500 uppercase tracking-wider">Detection Status</span>
              {isActive && !isPaused ? (
                <span className="font-bold text-emerald-400 animate-pulse">ANALYZING STREAM</span>
              ) : (
                <span className="font-bold text-slate-500">STANDBY</span>
              )}
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-900/60 text-xs">
              <span className="font-semibold text-slate-500 uppercase tracking-wider">Frames Scanned</span>
              <span className="font-mono font-bold text-slate-100">{frameNumber}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-900/60 text-xs">
              <span className="font-semibold text-slate-500 uppercase tracking-wider">System Latency</span>
              <span className="font-mono font-bold text-slate-100">
                {isActive && !isPaused ? `${inferenceTime.toFixed(1)} ms` : "0.0 ms"}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-900/60 text-xs">
              <span className="font-semibold text-slate-500 uppercase tracking-wider">Average Confidence</span>
              <span className="font-mono font-bold text-cyan-400 glow-cyan">
                {isActive && !isPaused ? `${(confidence * 100).toFixed(1)}%` : "0.0%"}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 text-xs">
              <span className="font-semibold text-slate-500 uppercase tracking-wider">Alert Index</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                alertLevel === "Emergency"
                  ? "bg-red-950/20 text-red-400 border border-red-500/20"
                  : alertLevel === "Critical"
                  ? "bg-orange-950/20 text-orange-400 border border-orange-500/20"
                  : alertLevel === "Warning"
                  ? "bg-amber-950/20 text-amber-400 border border-amber-500/20"
                  : "bg-slate-900 text-slate-400"
              }`}>
                {alertLevel}
              </span>
            </div>
          </div>
        </div>

        {/* Model Pipeline statuses */}
        <SystemStatusCard />

      </div>

      {/* COLUMN 4: Active Targets list & Alerts List */}
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
              No active targets locked. Initialize feed analysis.
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
