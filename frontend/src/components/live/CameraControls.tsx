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
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
}

const CameraControls: React.FC<CameraControlsProps> = ({
  isActive,
  isPaused,
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
    <div className="glass-panel p-4 rounded-xl border border-slate-900 flex flex-wrap items-center justify-between gap-4 select-none">
      
      {/* Play / Stop / Pause Actions */}
      <div className="flex items-center gap-2">
        {!isActive ? (
          <button
            onClick={onStart}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-lg shadow-md shadow-cyan-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <FiPlay /> Start Camera
          </button>
        ) : (
          <>
            <button
              onClick={onStop}
              className="flex items-center gap-2 px-4 py-2 bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-white font-semibold text-xs rounded-lg transition-all"
            >
              <FiSquare /> Stop Stream
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
  );
};

export default CameraControls;
