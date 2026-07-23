import React from "react";
import { 
  FiPhoneCall, 
  FiUsers, 
  FiDownload, 
  FiShare2, 
  FiFileText 
} from "react-icons/fi";

interface EmergencyPanelProps {
  onExportReport: () => void;
  onDownloadEvidence: () => void;
}

const EmergencyPanel: React.FC<EmergencyPanelProps> = ({
  onExportReport,
  onDownloadEvidence,
}) => {
  return (
    <div className="glass-panel p-4 rounded-xl border border-red-500/10 bg-red-950/5 flex flex-col gap-3 select-none">
      <h3 className="font-extrabold text-[10px] uppercase tracking-wider text-red-400 flex items-center gap-1.5">
        <FiPhoneCall /> Emergency Action Terminal
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
        {/* Call Emergency - Disabled */}
        <button
          disabled
          className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 text-slate-500 text-xs font-bold rounded-lg cursor-not-allowed uppercase tracking-wider"
          title="FastAPI integration pending"
        >
          <FiPhoneCall /> Call 911 (N/A)
        </button>

        {/* Notify Security - Disabled */}
        <button
          disabled
          className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 text-slate-500 text-xs font-bold rounded-lg cursor-not-allowed uppercase tracking-wider"
          title="FastAPI integration pending"
        >
          <FiUsers /> Dispatch Team (N/A)
        </button>

        {/* Export Report */}
        <button
          onClick={onExportReport}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 text-white text-xs font-bold rounded-lg cursor-pointer uppercase tracking-wider"
        >
          <FiFileText /> Export Report
        </button>

        {/* Download Evidence */}
        <button
          onClick={onDownloadEvidence}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 text-white text-xs font-bold rounded-lg cursor-pointer uppercase tracking-wider"
        >
          <FiDownload /> Download Video
        </button>

        {/* Share Incident - Disabled */}
        <button
          disabled
          className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 text-slate-500 text-xs font-bold rounded-lg cursor-not-allowed uppercase tracking-wider"
          title="FastAPI integration pending"
        >
          <FiShare2 /> Share Log (N/A)
        </button>
      </div>
    </div>
  );
};

export default EmergencyPanel;
