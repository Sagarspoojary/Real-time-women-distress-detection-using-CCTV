import React from "react";
import { motion } from "framer-motion";
import { FiActivity, FiTarget, FiAlertTriangle } from "react-icons/fi";
import { BsBoundingBox } from "react-icons/bs";

export interface PersonData {
  trackId: number;
  confidence: number;
  bbox: [number, number, number, number];
  threatLevel: "Low" | "Medium" | "High" | "Critical";
  distress: boolean;
  pose: string;
  // Future models fields (coming soon)
  weapon?: string | null;
  gender?: string;
  identity?: string;
}

interface PersonCardProps {
  person: PersonData;
}

const PersonCard: React.FC<PersonCardProps> = ({ person }) => {
  const getThreatColor = (level: string) => {
    switch (level) {
      case "Critical": return "bg-red-950/30 border-red-500/25 text-red-400";
      case "High": return "bg-orange-950/30 border-orange-500/25 text-orange-400";
      case "Medium": return "bg-amber-950/30 border-amber-500/25 text-amber-400";
      default: return "bg-cyan-950/20 border-cyan-500/20 text-cyan-400";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="glass-panel p-4 rounded-xl border border-slate-900 flex flex-col gap-3 relative select-none hover:border-slate-800 transition-all"
    >
      {/* Header: ID, Threat Level & Confidence */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg">
            <FiTarget className="text-sm" />
          </div>
          <span className="font-extrabold text-sm text-white font-mono">
            TRACK_ID: {String(person.trackId).padStart(3, "0")}
          </span>
        </div>

        <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-widest ${getThreatColor(person.threatLevel)}`}>
          {person.threatLevel} RISK
        </span>
      </div>

      {/* Stats and Bbox Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-1.5 border-y border-slate-900">
        
        {/* Confidence */}
        <div>
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">Confidence</span>
          <span className="text-xs font-bold text-slate-100 font-mono mt-0.5 block">
            {(person.confidence * 100).toFixed(1)}%
          </span>
        </div>

        {/* Pose / Action */}
        <div>
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">Current Pose</span>
          <span className="text-xs font-bold text-slate-100 mt-0.5 block flex items-center gap-1.5 capitalize">
            <FiActivity className="text-slate-500 text-xs" /> {person.pose}
          </span>
        </div>

        {/* Distress Status */}
        <div>
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">Distress State</span>
          {person.distress ? (
            <span className="text-xs font-bold text-red-400 mt-0.5 block flex items-center gap-1">
              <FiAlertTriangle className="text-xs animate-pulse" /> Distress Detected
            </span>
          ) : (
            <span className="text-xs font-bold text-emerald-400 mt-0.5 block">
              Normal
            </span>
          )}
        </div>

        {/* Bbox coordinates */}
        <div>
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">BBox Coordinates</span>
          <span className="text-[10px] font-bold text-slate-400 font-mono mt-0.5 block flex items-center gap-1">
            <BsBoundingBox className="text-slate-600" /> [{person.bbox.map(c => Math.round(c)).join(", ")}]
          </span>
        </div>

      </div>

      {/* Future Model Placeholders (Coming Soon / Not Available) */}
      <div className="space-y-1.5 pt-1.5">
        <div className="flex justify-between items-center text-[10px]">
          <span className="font-semibold text-slate-500 uppercase tracking-wider">Weapon Type</span>
          <span className="font-bold text-indigo-400 bg-indigo-950/20 border border-indigo-500/10 px-2 py-0.5 rounded text-[8px] uppercase tracking-widest">
            Coming Soon
          </span>
        </div>
        <div className="flex justify-between items-center text-[10px]">
          <span className="font-semibold text-slate-500 uppercase tracking-wider">Gender Classifier</span>
          <span className="font-bold text-indigo-400 bg-indigo-950/20 border border-indigo-500/10 px-2 py-0.5 rounded text-[8px] uppercase tracking-widest">
            Coming Soon
          </span>
        </div>
        <div className="flex justify-between items-center text-[10px]">
          <span className="font-semibold text-slate-500 uppercase tracking-wider">Identity Match</span>
          <span className="font-bold text-indigo-400 bg-indigo-950/20 border border-indigo-500/10 px-2 py-0.5 rounded text-[8px] uppercase tracking-widest">
            Coming Soon
          </span>
        </div>
      </div>

    </motion.div>
  );
};

export default PersonCard;
