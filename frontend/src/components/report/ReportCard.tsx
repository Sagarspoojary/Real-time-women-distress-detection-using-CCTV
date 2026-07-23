import React from "react";
import { 
  FiFileText, 
  FiClock, 
  FiDatabase 
} from "react-icons/fi";

export interface ReportData {
  id: string;
  incidentId: string;
  videoName: string;
  timestamp: string;
  severity: "Info" | "Low" | "Medium" | "High" | "Critical" | "Emergency";
  status: "Approved" | "Pending" | "Archived";
  sizeKB: number;
  modelData: any;
}

interface ReportCardProps {
  report: ReportData;
  active: boolean;
  onClick: () => void;
}

const ReportCard: React.FC<ReportCardProps> = ({
  report,
  active,
  onClick,
}) => {
  const formattedDate = new Date(report.timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  const formattedTime = new Date(report.timestamp).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Emergency": return "bg-red-950/20 border-red-500/20 text-red-400";
      case "Critical": return "bg-orange-950/20 border-orange-500/20 text-orange-400";
      case "High": return "bg-amber-950/20 border-amber-500/20 text-amber-400";
      default: return "bg-cyan-950/15 border-cyan-500/10 text-cyan-400";
    }
  };

  return (
    <div
      onClick={onClick}
      className={`glass-panel p-4 rounded-xl border flex flex-col gap-3 relative select-none cursor-pointer transition-all hover:border-slate-700 ${
        active 
          ? "border-cyan-500/30 bg-gradient-to-r from-cyan-950/30 to-indigo-950/15" 
          : "border-slate-900 bg-slate-950/20"
      } text-xs`}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-2.5 truncate">
          <div className="p-2 bg-slate-900 border border-slate-800 text-cyan-400 rounded-lg flex-shrink-0">
            <FiFileText />
          </div>
          <div className="truncate">
            <h4 className="font-extrabold text-slate-200 truncate uppercase tracking-tight">
              {report.videoName}
            </h4>
            <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
              REP_ID: #{report.id}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-2 border-t border-slate-900/60 font-semibold text-slate-500 items-center justify-between">
        <div className="flex items-center gap-1">
          <FiClock /> <span>{formattedDate} @ {formattedTime}</span>
        </div>
        <div className="flex items-center gap-1">
          <FiDatabase /> <span>{report.sizeKB.toFixed(1)} KB</span>
        </div>
        <span className={`px-2 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wider ${getSeverityColor(report.severity)}`}>
          {report.severity}
        </span>
      </div>

    </div>
  );
};

export default ReportCard;
