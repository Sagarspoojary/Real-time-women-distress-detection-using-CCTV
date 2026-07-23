import React, { useState } from "react";
import type { IncidentData } from "./IncidentCard";
import HistoryJsonViewer from "../history/HistoryJsonViewer";
import EmergencyPanel from "./EmergencyPanel";
import { API_BASE_URL } from "../../services/api";
import { 
  FiClock, 
  FiTarget, 
  FiChevronDown, 
  FiChevronUp,
  FiTerminal
} from "react-icons/fi";
import { BsBoundingBox } from "react-icons/bs";
import toast from "react-hot-toast";

interface IncidentDetailsProps {
  incident: IncidentData;
}

const IncidentDetails: React.FC<IncidentDetailsProps> = ({ incident }) => {
  const [expandedJson, setExpandedJson] = useState(false);

  const processedUrl = `${API_BASE_URL}/outputs/debug_tracking.mp4?t=${incident.id}`;
  const modelData = incident.modelData;

  const handleExportReport = () => {
    // Generate simple text report download
    const reportContent = `
WOMEN DISTRESS AI - INCIDENT REPORT
==================================
Incident ID: #${incident.id}
Video Target: ${incident.videoName}
Timestamp: ${incident.timestamp}
Threat Severity: ${incident.severity}
Status: ${incident.status}

DIAGNOSTIC SUMMARY:
------------------
Model 1: Violence Classifier: ${modelData.model1?.prediction || "Normal"} (${modelData.model1?.confidence || 0}%)
Model 2: Distress gesture Detector: ${modelData.model2?.prediction || "N/A"} (${modelData.model2?.confidence || 0}%)
Model 3: Bounding Box Tracker: ${modelData.model3?.people_detected || 0} targets identified

PEOPLE DATA:
-----------
${modelData.persons?.map((p: any) => `Track ID: ${p.track_id} | Distress: ${p.distress} | Coordinates: [${p.bbox?.join(", ")}]`).join("\n") || "No entities detected."}
    `;

    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `incident_report_${incident.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Incident report downloaded!");
  };

  const handleDownloadEvidence = () => {
    const link = document.createElement("a");
    link.href = processedUrl;
    link.download = `evidence_${incident.id}.mp4`;
    link.click();
    toast.success("Downloading processed evidence footage...");
  };

  return (
    <div className="space-y-6 select-none text-xs">
      
      {/* 1. Comparative media players */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Processed Feed */}
        <div className="flex flex-col gap-2">
          <h4 className="font-bold text-[10px] uppercase tracking-wider text-cyan-400 glow-cyan">AI Output Video</h4>
          <div className="relative aspect-video bg-slate-950 border border-cyan-500/20 rounded-xl overflow-hidden shadow-lg">
            <video src={processedUrl} controls className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Timeline execution log */}
        <div className="glass-panel p-4 rounded-xl border border-slate-900 flex flex-col">
          <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <FiClock /> Verification Timeline
          </h4>
          <div className="flex-grow space-y-3 relative pl-4 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-800">
            {[
              { label: "Video Uploaded", active: true },
              { label: "Model 1 (Violence) Completed", active: true },
              { label: "Model 2 (Distress) Completed", active: true },
              { label: "Model 3 (Tracking) Completed", active: true },
              { label: "Alert Generated", active: true },
              { label: "Incident Closed", active: incident.status === "Resolved" }
            ].map((node, i) => (
              <div key={i} className="relative">
                <div className={`absolute -left-[16px] top-1 w-2.5 h-2.5 rounded-full border ${
                  node.active 
                    ? "bg-cyan-400 border-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0.6)]" 
                    : "bg-slate-950 border-slate-800"
                }`} />
                <span className={`font-bold text-[10px] uppercase tracking-wide block ${node.active ? "text-slate-200" : "text-slate-500"}`}>
                  {node.label}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 2. Emergency Action controls */}
      <EmergencyPanel 
        onExportReport={handleExportReport} 
        onDownloadEvidence={handleDownloadEvidence} 
      />

      {/* 3. Model Results & Tracked target lists */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Model summaries */}
        <div className="md:col-span-1 space-y-4">
          <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Model Scores</h4>

          <div className="glass-panel p-4 rounded-xl border border-slate-900 space-y-3">
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Model 1: Violence</span>
              <span className="font-bold text-slate-200 mt-1 block uppercase">
                {modelData.model1?.prediction || "Normal"} ({modelData.model1?.confidence || 0}%)
              </span>
            </div>
            <div className="border-t border-slate-900/60 pt-2">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Model 2: Distress</span>
              <span className="font-bold text-slate-200 mt-1 block uppercase">
                {modelData.model2?.prediction || "N/A"} ({modelData.model2?.confidence || 0}%)
              </span>
            </div>
            <div className="border-t border-slate-900/60 pt-2 flex justify-between items-center text-xs">
              <span className="text-slate-400">Targets Tracked</span>
              <span className="font-bold text-white">{modelData.model3?.people_detected || 0}</span>
            </div>
          </div>
        </div>

        {/* Tracked target details list */}
        <div className="md:col-span-2 space-y-4">
          <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-400">
            Target coordinate charts ({modelData.persons?.length || 0})
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[220px] overflow-y-auto pr-1">
            {modelData.persons && modelData.persons.length > 0 ? (
              modelData.persons.map((person: any, idx: number) => (
                <div 
                  key={idx} 
                  className="glass-panel p-4 rounded-xl border border-slate-900 flex flex-col gap-2"
                >
                  <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                    <span className="font-bold font-mono text-white flex items-center gap-1">
                      <FiTarget className="text-cyan-400" /> ID: {String(person.track_id).padStart(3, "0")}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                      person.weapon || person.distress 
                        ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse" 
                        : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    }`}>
                      {person.weapon || person.distress ? "HIGH RISK" : "NORMAL"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-1.5 font-semibold text-slate-400">
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">Confidence</span>
                      <span className="font-mono font-bold text-slate-200">{(person.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-mono">BBox Coordinates</span>
                      <span className="font-mono text-slate-400 text-[10px] flex items-center gap-1 mt-0.5">
                        <BsBoundingBox className="text-[9px]" /> [{person.bbox?.map((c: number) => Math.round(c)).join(", ")}]
                      </span>
                    </div>
                  </div>

                  {/* Future Placeholder labels */}
                  <div className="border-t border-slate-900/60 pt-2 space-y-1 text-[9px]">
                    <div className="flex justify-between text-slate-500">
                      <span>Gender Classifier</span>
                      <span className="font-bold tracking-widest text-[8px] uppercase text-indigo-500">Not Available</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Identity Recognition</span>
                      <span className="font-bold tracking-widest text-[8px] uppercase text-indigo-500">Not Available</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-8 text-center text-slate-500 italic bg-slate-950/20 border border-slate-900 rounded-xl">
                No target entities detected.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 4. Expandable JSON viewer */}
      <div className="glass-panel rounded-xl border border-slate-900 overflow-hidden">
        <button
          onClick={() => setExpandedJson(!expandedJson)}
          className="w-full px-4 py-3 bg-slate-900/30 hover:bg-slate-900/50 flex justify-between items-center text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <span className="uppercase tracking-wider">Raw Diagnostics JSON</span>
          {expandedJson ? <FiChevronDown className="text-sm" /> : <FiChevronUp className="text-sm" />}
        </button>

        {expandedJson && (
          <div className="p-4 border-t border-slate-900 flex flex-col gap-3">
            <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FiTerminal /> API Payload Search
            </h4>
            <HistoryJsonViewer data={modelData} />
          </div>
        )}
      </div>

    </div>
  );
};

export default IncidentDetails;
