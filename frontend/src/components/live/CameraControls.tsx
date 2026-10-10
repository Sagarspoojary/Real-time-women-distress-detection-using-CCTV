import React from "react";
import { 
  FiPlay, 
  FiSquare, 
  FiPause, 
  FiCamera, 
  FiMaximize2 
} from "react-icons/fi";
import toast from "react-hot-toast";

interface CameraControlsProps {
  isActive: boolean;
  isPaused: boolean;
  cameraSource: "LOCAL" | "IP";
  setCameraSource: (source: "LOCAL" | "IP") => void;
  ipUrl: string;
  setIpUrl: (url: string) => void;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
}

const CameraControls: React.FC<CameraControlsProps> = ({
  isActive,
  isPaused,
  cameraSource,
  setCameraSource,
  ipUrl,
  setIpUrl,
  onStart,
  onStop,
  onPause,
}) => {

  const handleSnapshot = () => {
    if (!isActive) {
      toast.error("Camera is offline. Can't take snapshot.");
      return;
    }
    toast.success("Snapshot captured successfully!");
  };

  const handleFullscreen = () => {
    if (!isActive) {
      toast.error("Camera is offline.");
      return;
    }
    toast.success("Entering fullscreen mode...");
  };

  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-900 flex flex-col gap-4 select-none">
      
      {/* Configuration Row */}
      <div className="flex flex-wrap items-center gap-4 border-b border-slate-800/50 pb-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Camera Source</label>
          <select 
            className="bg-slate-900/60 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 transition-colors"
            value={cameraSource}
            onChange={(e) => setCameraSource(e.target.value as "LOCAL" | "IP")}
            disabled={isActive}
          >
            <option value="LOCAL">Laptop Camera</option>
            <option value="IP">Mobile IP Webcam</option>
          </select>
        </div>

        {cameraSource === "IP" && (
          <div className="flex items-center gap-2 flex-grow max-w-sm">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">URL</label>
            <input 
              type="text" 
              className="bg-slate-900/60 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 transition-colors w-full"
              value={ipUrl}
              onChange={(e) => setIpUrl(e.target.value)}
              disabled={isActive}
              placeholder="http://10.69.157.102:8080/video"
            />
          </div>
        )}
      </div>

      {/* Play / Stop / Pause / Utility Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {!isActive ? (
            <button
              onClick={onStart}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-lg shadow-md shadow-cyan-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <FiPlay /> {cameraSource === "IP" ? "Connect" : "Start Camera"}
            </button>
          ) : (
            <>
              <button
                onClick={onStop}
                className="flex items-center gap-2 px-4 py-2 bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-white font-semibold text-xs rounded-lg transition-all"
              >
                <FiSquare /> {cameraSource === "IP" ? "Disconnect" : "Stop Stream"}
              </button>
            
            <button
              onClick={onPause}
              className={`flex items-center gap-2 px-4 py-2 border font-semibold text-xs rounded-lg transition-all ${
                isPaused 
                  ? "bg-amber-950/20 border-amber-500/20 text-amber-400 hover:bg-amber-500/20 hover:text-white"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <FiPause /> {isPaused ? "Resume Scan" : "Pause Scan"}
            </button>
          </>
        )}
      </div>

      {/* Utility Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSnapshot}
          className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all"
          title="Capture Snapshot"
        >
          <FiCamera className="text-sm" />
        </button>
        <button
          onClick={handleFullscreen}
          className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all"
          title="Fullscreen View"
        >
          <FiMaximize2 className="text-sm" />
        </button>
      </div>

      </div>
    </div>
  );
};

export default CameraControls;
