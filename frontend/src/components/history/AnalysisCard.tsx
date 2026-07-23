import React from "react";
import { 
  FiTv, 
  FiClock, 
  FiFileText, 
  FiTrash2
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
  emailSent?: string;
}

interface AnalysisCardProps {
  item: HistoryItem;
  onInspect: (item: HistoryItem) => void;
  onDeleteRequest: (item: HistoryItem) => void;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({
  item,
  onInspect,
  onDeleteRequest,
}) => {
  const uploadDate = new Date(item.timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const uploadTime = new Date(item.timestamp).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const hasAnomaly = 
    item.model1?.prediction?.toLowerCase() === "violence" || 
    item.model1?.prediction?.toLowerCase() === "assault" || 
    item.status?.toLowerCase() === "distress detected" ||
    item.persons?.some((p: any) => p.gender === "Female" && p.distress);

  // Extract first or target person's summary features
  const targetPerson = item.persons?.find((p: any) => p.gender === "Female" && p.distress) || item.persons?.[0];
  const recognizedName = targetPerson ? (targetPerson.recognized_name || targetPerson.identity || "Unknown") : "N/A";
  const targetGender = targetPerson ? (targetPerson.gender || "Unknown") : "N/A";
  const faceStatus = targetPerson ? (targetPerson.face_status || "Unknown") : "N/A";

  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-900 flex flex-col gap-4 relative select-none hover:border-slate-800 transition-all text-xs">
      
      {/* 1. Header: Name & Severity Badge */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-2.5 truncate">
          <div className="p-2 bg-slate-900 border border-slate-800 text-slate-500 rounded-lg flex-shrink-0">
            <FiTv className="text-md" />
          </div>
          <div className="truncate">
            <h4 className="font-extrabold text-slate-100 truncate uppercase tracking-tight">
              {item.videoName}
            </h4>
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
              ID: #{item.id}
            </span>
          </div>
        </div>

        <span className={`px-2.5 py-0.5 rounded-full border text-[8px] font-bold uppercase tracking-widest ${
          hasAnomaly 
            ? "bg-red-950/20 border-red-500/20 text-red-400" 
            : "bg-cyan-950/20 border-cyan-500/20 text-cyan-400"
        }`}>
          {hasAnomaly ? "CRITICAL RISK" : "NORMAL"}
        </span>
      </div>

      {/* 2. Upload and frames metrics row */}
      <div className="grid grid-cols-2 gap-y-2 py-3 border-y border-slate-900/60 font-semibold text-slate-500">
        <div className="flex items-center gap-1.5 col-span-2">
          <FiClock /> <span>{uploadDate} @ {uploadTime}</span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">Violence</span>
          <span className="font-bold text-slate-200 mt-0.5 block uppercase">
            {item.model1?.prediction || "Normal"}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">Distress</span>
          <span className="font-bold text-slate-200 mt-0.5 block uppercase">
            {item.model2?.prediction || "N/A"}
          </span>
        </div>
        
        <div className="pt-1.5 border-t border-slate-900/40">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">Recognized Person</span>
          <span className="font-bold text-slate-200 mt-0.5 block truncate">
            {recognizedName}
          </span>
        </div>
        <div className="pt-1.5 border-t border-slate-900/40">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">Gender / Face</span>
          <span className="font-bold text-slate-200 mt-0.5 block truncate">
            {targetGender} ({faceStatus})
          </span>
        </div>

        <div className="pt-1.5 border-t border-slate-900/40 col-span-2 flex justify-between items-center text-[10px]">
          <span className="text-slate-500 font-semibold uppercase tracking-wider">Email Broadcast Sent:</span>
          <span className={`font-extrabold ${item.emailSent === "Yes" ? "text-cyan-400" : "text-slate-500"}`}>
            {item.emailSent === "Yes" ? "Yes" : "No"}
          </span>
        </div>
      </div>

      {/* 3. Action Buttons footer */}
      <div className="flex justify-between items-center mt-1">
        <button
          onClick={() => onInspect(item)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider cursor-pointer transition-all"
        >
          <FiFileText /> Inspect Payload
        </button>

        <button
          onClick={() => onDeleteRequest(item)}
          className="p-2 rounded-lg bg-red-950/10 border border-transparent hover:border-red-500/25 text-red-400 hover:bg-red-950/20 transition-all cursor-pointer"
          title="Delete Record"
        >
          <FiTrash2 className="text-xs" />
        </button>
      </div>

    </div>
  );
};

export default AnalysisCard;
