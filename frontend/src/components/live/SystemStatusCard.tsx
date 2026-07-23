import React from "react";
import { FiShield } from "react-icons/fi";

const systemModules = [
  { id: 1, name: "Model 1 - Violence Detection", status: "Online" },
  { id: 2, name: "Model 2 - Distress Detection", status: "Online" },
  { id: 3, name: "Model 3 - Person Tracking", status: "Online" },
  { id: 4, name: "Model 4 - Weapon Detection", status: "Coming Soon" },
  { id: 5, name: "Model 5 - Gender Detection", status: "Coming Soon" },
  { id: 6, name: "Model 6 - Face Recognition", status: "Coming Soon" },
  { id: 7, name: "Model 7 - Pose Estimation", status: "Coming Soon" },
  { id: 8, name: "Model 8 - Behaviour Analysis", status: "Coming Soon" },
  { id: 9, name: "Model 9 - Threat Assessment", status: "Coming Soon" },
  { id: 10, name: "Model 10 - Decision Engine", status: "Coming Soon" }
];

const SystemStatusCard: React.FC = () => {
  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-900 select-none">
      <h3 className="font-bold text-xs uppercase tracking-wider text-white mb-4 flex items-center gap-2">
        <FiShield className="text-cyan-400" /> Pipeline Diagnostics
      </h3>

      <div className="space-y-2.5">
        {systemModules.map((mod) => (
          <div 
            key={mod.id} 
            className="flex items-center justify-between p-2 rounded-lg bg-slate-950/45 border border-slate-900/60"
          >
            <span className="text-[11px] font-semibold text-slate-300">{mod.name}</span>
            {mod.status === "Online" ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                Coming Soon
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemStatusCard;
