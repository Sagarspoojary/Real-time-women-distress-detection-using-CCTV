import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HistoryJsonViewer from "./HistoryJsonViewer";
import { API_BASE_URL } from "../../services/api";
import { 
  FiX, 
  FiClock, 
  FiTarget, 
  FiInfo, 
  FiTerminal
} from "react-icons/fi";
import { BsBoundingBox } from "react-icons/bs";

interface HistoryItem {
  id: string;
  videoName: string;
  timestamp: string;
  model1?: { prediction: string; confidence: number };
  model2?: { prediction: string; confidence: number };
  model3?: { people_detected: number; frames_processed: number };
  persons?: any[];
  status?: string;
}

interface HistoryDetailModalProps {
  isOpen: boolean;
  item: HistoryItem | null;
  onClose: () => void;
}

const HistoryDetailModal: React.FC<HistoryDetailModalProps> = ({
  isOpen,
  item,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"visuals" | "diagnostics" | "json">("visuals");

  if (!item) return null;

  // Processed video URL pathing with cache buster
  const processedUrl = `${API_BASE_URL}/outputs/debug_tracking.mp4?t=${item.id}`;



  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40 pointer-events-auto"
          />

          {/* Sliding Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-4xl bg-[#030712] border-l border-slate-900 shadow-2xl z-50 overflow-y-auto flex flex-col select-none"
          >
            {/* 1. Modal Header */}
            <div className="p-4 lg:p-6 border-b border-slate-900/80 bg-slate-950/20 flex justify-between items-center">
              <div className="truncate pr-4">
                <span className="text-[10px] font-mono text-slate-500 font-bold block">
                  INSPECTION ID: #{item.id}
                </span>
                <h3 className="font-extrabold text-sm text-slate-200 truncate mt-0.5 uppercase">
                  {item.videoName}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <FiX className="text-md" />
              </button>
            </div>

            {/* Tabs selector */}
            <div className="flex border-b border-slate-900 bg-slate-950/10 px-4 lg:px-6">
              {[
                { id: "visuals", label: "Media Players" },
                { id: "diagnostics", label: "Targets & Analytics" },
                { id: "json", label: "Raw JSON API" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3 px-4 text-xs font-bold transition-all relative cursor-pointer ${
                    activeTab === tab.id 
                      ? "text-cyan-400" 
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="modalTabLine" 
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0.6)]" 
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="flex-grow p-4 lg:p-6 space-y-6">
              
              {/* TAB 1: Media Player Side-by-Side comparison */}
              {activeTab === "visuals" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Processed video player */}
                    <div className="flex flex-col gap-2">
                      <h4 className="font-bold text-[10px] uppercase tracking-wider text-cyan-400 glow-cyan">Processed AI output Stream</h4>
                      <div className="relative aspect-video bg-slate-950 border border-cyan-500/20 rounded-xl overflow-hidden shadow-lg">
                        <video src={processedUrl} controls className="w-full h-full object-contain" />
                      </div>
                    </div>

                    {/* Timeline summary card */}
                    <div className="glass-panel p-4 rounded-xl border border-slate-900 flex flex-col">
                      <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                        <FiClock /> Pipeline Execution Stages
                      </h4>
                      <div className="flex-grow space-y-3 relative pl-4 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-800 text-xs">
                        {[
                          { label: "Footage Received", active: true },
                          { label: "Model 1: Violence Detector", active: true },
                          { label: "Model 2: Distress Detector", active: true },
                          { label: "Model 3: Tracking Pipeline", active: true },
                          { label: "Output debug video generated", active: true },
                          { label: "Analysis Completed", active: true }
                        ].map((node, i) => (
                          <div key={i} className="relative">
                            <div className="absolute -left-[16px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-400 border border-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0.6)]" />
                            <span className="font-bold text-[10px] text-slate-200 uppercase tracking-wide block">{node.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="glass-panel p-4 rounded-xl border border-slate-900 flex items-center gap-3">
                    <FiInfo className="text-cyan-400 text-lg flex-shrink-0" />
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      This comparative player streams the final video rendered by OpenCV and converted to H.264 format. The output embeds coordinate tracking lines and risk indicators.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: Model summarizations & tracked target grids */}
              {activeTab === "diagnostics" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Left Column: Diagnostics Summaries */}
                  <div className="md:col-span-1 space-y-4">
                    <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Model Scores</h4>
                    
                    {/* Model 1: Violence */}
                    <div className="glass-panel p-4 rounded-xl border border-slate-900">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Model 1: Violence</span>
                      <div className="flex justify-between items-center mt-1 text-xs">
                        <span className="font-bold text-white uppercase">{item.model1?.prediction || "Normal"}</span>
                        <span className="font-mono font-extrabold text-cyan-400">{item.model1?.confidence || 0}%</span>
                      </div>
                    </div>

                    {/* Model 2: Distress */}
                    <div className="glass-panel p-4 rounded-xl border border-slate-900">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Model 2: Distress</span>
                      <div className="flex justify-between items-center mt-1 text-xs">
                        <span className="font-bold text-white uppercase">{item.model2?.prediction || "N/A"}</span>
                        <span className="font-mono font-extrabold text-purple-400">{item.model2?.confidence || 0}%</span>
                      </div>
                    </div>

                    {/* Model 3: Tracking summaries */}
                    <div className="glass-panel p-4 rounded-xl border border-slate-900 space-y-2 text-xs">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Model 3: Tracking</span>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Targets Found</span>
                        <span className="font-bold text-white">{item.model3?.people_detected || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Frames Ticked</span>
                        <span className="font-mono font-bold text-white">{item.model3?.frames_processed || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Tracked Target Details lists */}
                  <div className="md:col-span-2 space-y-4">
                    <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-400">
                      Tracked Target Cards ({item.persons?.length || 0})
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[360px] overflow-y-auto pr-1">
                      {item.persons && item.persons.length > 0 ? (
                        item.persons.map((person, idx) => (
                          <div 
                            key={idx} 
                            className="glass-panel p-4 rounded-xl border border-slate-900 flex flex-col gap-2 text-xs"
                          >
                            <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                              <span className="font-bold font-mono text-white flex items-center gap-1">
                                <FiTarget className="text-cyan-400" /> ID: {String(person.track_id).padStart(3, "0")}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                person.weapon || person.distress 
                                  ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                                  : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                              }`}>
                                {person.weapon || person.distress ? "HIGH RISK" : "NORMAL"}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 py-1">
                              <div>
                                <span className="text-[9px] text-slate-500 block uppercase">Confidence</span>
                                <span className="font-mono font-bold text-slate-200">{(person.confidence * 100).toFixed(1)}%</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 block uppercase">Distress</span>
                                <span className={`font-bold ${person.distress ? "text-red-400" : "text-emerald-400"}`}>
                                  {person.distress ? "Yes" : "No"}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 block uppercase">Weapon</span>
                                <span className="font-bold text-slate-200">{person.weapon_type || "None"}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 block uppercase font-mono">BBox Coordinates</span>
                                <span className="font-mono text-slate-400 text-[10px] flex items-center gap-1">
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
                              <div className="flex justify-between text-slate-500">
                                <span>Pose Estimation</span>
                                <span className="font-bold tracking-widest text-[8px] uppercase text-indigo-500">Not Available</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 p-8 text-center text-xs text-slate-500 italic bg-slate-950/20 border border-slate-900 rounded-xl">
                          No target entities detected.
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 3: Interactive JSON Viewer */}
              {activeTab === "json" && (
                <div className="space-y-4">
                  <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FiTerminal /> API Payload Search
                  </h4>
                  <HistoryJsonViewer data={item} />
                </div>
              )}

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HistoryDetailModal;
