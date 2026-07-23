import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiTv, FiAlertCircle } from "react-icons/fi";
import { BsRecordFill } from "react-icons/bs";

interface LiveCameraProps {
  isActive: boolean;
  isPaused: boolean;
  fps: number;
}

const LiveCamera: React.FC<LiveCameraProps> = ({ isActive, isPaused, fps }) => {
  const [crosshairPos, setCrosshairPos] = useState({ x: 50, y: 50 });

  // Simulate crosshair movement for target lock-on styling
  useEffect(() => {
    if (!isActive || isPaused) return;
    const interval = setInterval(() => {
      setCrosshairPos({
        x: Math.floor(Math.random() * 60) + 20,
        y: Math.floor(Math.random() * 60) + 20
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [isActive, isPaused]);

  return (
    <div className="relative w-full h-[400px] bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden shadow-inner flex flex-col items-center justify-center">
      {/* 1. Grid Background Scanlines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.15)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_50%,rgba(0,0,0,0.15)_50%)] bg-[size:100%_4px] pointer-events-none" />

      {/* 2. Top Bar Camera Overlay */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10 pointer-events-none select-none">
        <div className="flex items-center gap-2">
          {isActive && !isPaused ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-950/40 border border-red-500/20 text-[9px] font-bold text-red-400 uppercase tracking-widest animate-pulse">
              <BsRecordFill /> REC [FEED_04]
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              STBY
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest">
          1920x1080 @ {isActive && !isPaused ? fps.toFixed(1) : "0.0"} FPS
        </span>
      </div>

      {/* 3. Bottom Bar Camera Overlay */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center z-10 pointer-events-none select-none">
        <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
          CLEARANCE: LEVEL 1 (RESTRICTED)
        </span>
        <span className="text-[9px] font-mono text-cyan-400 font-bold glow-cyan uppercase tracking-wider">
          {isActive && !isPaused ? "AI SCANNERS ACTIVE" : "SCANNERS OFFLINE"}
        </span>
      </div>

      {/* 4. Active Visual Simulation content */}
      {isActive ? (
        isPaused ? (
          <div className="flex flex-col items-center gap-2 z-10 text-center">
            <FiAlertCircle className="text-amber-400 text-3xl animate-bounce" />
            <h4 className="font-bold text-sm text-slate-200 uppercase tracking-wider">AI Scans Paused</h4>
            <p className="text-xs text-slate-500">Resume detection core from the controls panel.</p>
          </div>
        ) : (
          <div className="absolute inset-0 z-0">
            {/* Dynamic Target Box 1 */}
            <motion.div
              animate={{
                x: [100, 250, 180, 100],
                y: [80, 120, 220, 80]
              }}
              transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
              className="absolute w-24 h-48 border border-cyan-400 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.15)] flex flex-col justify-between p-2 pointer-events-none"
            >
              <div className="text-[9px] font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-500/20 px-1 py-0.5 rounded w-fit select-none font-mono">
                ID: 01 | 93%
              </div>
              <div className="text-[8px] text-cyan-400/70 select-none font-mono text-right uppercase">
                TARGET LOCK
              </div>
            </motion.div>

            {/* Dynamic Target Box 2 */}
            <motion.div
              animate={{
                x: [380, 200, 320, 380],
                y: [180, 90, 160, 180]
              }}
              transition={{ repeat: Infinity, duration: 16, ease: "linear" }}
              className="absolute w-28 h-52 border border-purple-500 rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.15)] flex flex-col justify-between p-2 pointer-events-none"
            >
              <div className="text-[9px] font-bold text-purple-400 bg-purple-950/80 border border-purple-500/20 px-1 py-0.5 rounded w-fit select-none font-mono">
                ID: 04 | 91%
              </div>
              <div className="text-[8px] text-purple-400/70 select-none font-mono text-right uppercase">
                TARGET LOCK
              </div>
            </motion.div>

            {/* Target Crosshair */}
            <motion.div
              animate={{
                left: `${crosshairPos.x}%`,
                top: `${crosshairPos.y}%`
              }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
            >
              <div className="w-full h-full border border-cyan-500/30 rounded-full animate-ping absolute" />
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_5px_rgba(6,182,212,1)]" />
              <div className="w-4 h-[1px] bg-cyan-400/60 absolute" />
              <div className="h-4 w-[1px] bg-cyan-400/60 absolute" />
            </motion.div>
          </div>
        )
      ) : (
        <div className="flex flex-col items-center gap-3 z-10 text-center px-6">
          <div className="p-4 bg-slate-900 border border-slate-800 text-slate-500 rounded-2xl shadow-lg">
            <FiTv className="text-3xl" />
          </div>
          <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider">Feed Offline</h4>
          <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
            Initialize the camera stream from the controls dashboard to start automated threat scans.
          </p>
        </div>
      )}
    </div>
  );
};

export default LiveCamera;
