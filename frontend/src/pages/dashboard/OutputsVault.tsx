import React from "react";
import { Link } from "react-router-dom";
import OutputsGallery from "../../components/dashboard/OutputsGallery";
import { 
  FiLayers, 
  FiArrowLeft, 
  FiShield, 
  FiVideo, 
  FiImage, 
  FiUserCheck
} from "react-icons/fi";

const OutputsVault: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/dashboard"
              className="text-xs font-semibold text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
            >
              <FiArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-semibold text-cyan-400">Outputs Vault</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-400">
              <FiLayers className="w-5 h-5" />
            </div>
            Surveillance Outputs & Evidence Vault
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Central repository of all auto-recorded violence video clips, full-frame incident snapshots, and cropped faces with AI gender classification voting logs.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/dashboard/live-detection"
            className="flex items-center gap-2 px-3.5 py-2 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded-lg transition-all"
          >
            <FiShield className="text-xs" /> Live Camera
          </Link>
          <Link
            to="/dashboard/history"
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all"
          >
            Incident History
          </Link>
        </div>
      </div>

      {/* Highlights / Vault Quick Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-900 flex items-center gap-3">
          <div className="p-2.5 bg-red-950/30 border border-red-500/30 text-red-400 rounded-lg">
            <FiVideo className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Triggered Clips</span>
            <span className="text-xs font-bold text-slate-200">10-Second MP4 Evidence</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-900 flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 rounded-lg">
            <FiImage className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Alert Snapshots</span>
            <span className="text-xs font-bold text-slate-200">High-Res Threat Frames</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-900 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-950/30 border border-indigo-500/30 text-indigo-400 rounded-lg">
            <FiUserCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gender Debug</span>
            <span className="text-xs font-bold text-slate-200">Cropped Facial Detections</span>
          </div>
        </div>
      </div>

      {/* Main Outputs Gallery Component */}
      <OutputsGallery />
    </div>
  );
};

export default OutputsVault;
