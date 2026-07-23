import React from "react";
import { 
  FiAlertOctagon, 
  FiAlertTriangle, 
  FiInfo, 
  FiTv, 
  FiClock, 
  FiMapPin 
} from "react-icons/fi";

export interface IncidentData {
  id: string;
  videoName: string;
  timestamp: string;
  severity: "Info" | "Low" | "Medium" | "High" | "Critical" | "Emergency";
  status: "Active" | "Reviewing" | "Resolved";
  desc: string;
  unread: boolean;
  modelData: any;
}

interface IncidentCardProps {
  incident: IncidentData;
  active: boolean;
  onClick: () => void;
}

const IncidentCard: React.FC<IncidentCardProps> = ({
  incident,
  active,
  onClick,
}) => {
  const uploadDate = new Date(incident.timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  const uploadTime = new Date(incident.timestamp).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "Emergency": 
        return {
          bg: "bg-red-950/20 border-red-500/30 text-red-400 animate-pulse",
          icon: <FiAlertOctagon className="text-red-400" />
        };
      case "Critical": 
        return {
          bg: "bg-orange-950/20 border-orange-500/30 text-orange-400",
          icon: <FiAlertTriangle className="text-orange-400" />
        };
      case "High": 
        return {
          bg: "bg-amber-950/20 border-amber-500/30 text-amber-400",
          icon: <FiAlertTriangle className="text-amber-400" />
        };
      case "Medium": 
        return {
          bg: "bg-yellow-950/10 border-yellow-500/20 text-yellow-400",
          icon: <FiAlertTriangle className="text-yellow-400" />
        };
      case "Low": 
        return {
          bg: "bg-cyan-950/10 border-cyan-500/20 text-cyan-400",
          icon: <FiInfo className="text-cyan-400" />
        };
      default: 
        return {
          bg: "bg-slate-900 border-slate-800 text-slate-400",
          icon: <FiInfo className="text-slate-400" />
        };
    }
  };

  const style = getSeverityStyle(incident.severity);

  return (
    <div
      onClick={onClick}
      className={`glass-panel p-4 rounded-xl border flex flex-col gap-3 relative select-none cursor-pointer transition-all hover:border-slate-700 ${
        active 
          ? "border-cyan-500/30 bg-gradient-to-r from-cyan-950/30 to-indigo-950/15" 
          : "border-slate-900 bg-slate-950/20"
      } text-xs`}
    >
      {/* Unread Dot Badge */}
      {incident.unread && (
        <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,1)]" />
      )}

      {/* Header: Title & Severity Badge */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-2 truncate">
          <div className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg flex-shrink-0">
            <FiTv />
          </div>
          <div className="truncate pr-4">
            <h4 className="font-extrabold text-slate-200 truncate uppercase tracking-tight">
              {incident.videoName}
            </h4>
            <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
              INCID_ID: #{incident.id}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-slate-300 line-clamp-2 leading-relaxed">
        {incident.desc}
      </p>

      {/* Metrics Row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-2 border-t border-slate-900/60 font-semibold text-slate-500 items-center justify-between">
        <div className="flex items-center gap-1">
          <FiClock /> <span>{uploadDate} @ {uploadTime}</span>
        </div>
        
        {/* Future Location placeholder */}
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          <FiMapPin /> <span className="font-bold uppercase tracking-wider">Sector B (CS)</span>
        </div>

        <span className={`px-2.5 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 ${style.bg}`}>
          {style.icon} {incident.severity}
        </span>
      </div>

    </div>
  );
};

export default IncidentCard;
