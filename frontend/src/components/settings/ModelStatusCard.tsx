import React, { useState } from "react";
import { FiCpu, FiClock, FiSettings } from "react-icons/fi";

interface ModelItem {
  id: string;
  name: string;
  desc: string;
  version: string;
  implemented: boolean;
  enabled: boolean;
}

const ModelStatusCard: React.FC = () => {
  const [models, setModels] = useState<ModelItem[]>([
    { 
      id: "mod1", 
      name: "Violence Detection", 
      desc: "Spatio-temporal classifier detecting physical aggression and assault signatures.",
      version: "v2.1-MAE",
      implemented: true,
      enabled: true
    },
    { 
      id: "mod2", 
      name: "Distress Detection", 
      desc: "Gestures parser flagging active distress waving, panic signs, and calling logs.",
      version: "v1.5-Gesture",
      implemented: true,
      enabled: true
    },
    { 
      id: "mod3", 
      name: "Person Detection & Tracking", 
      desc: "YOLO11 object locator coupled with ByteTrack state tracking ID managers.",
      version: "v3.0-YOLO",
      implemented: true,
      enabled: true
    },
    { 
      id: "mod4", 
      name: "Weapon Detection", 
      desc: "Real-time threat item locator (blades, fire-arms) in public cameras.",
      version: "v0.8-Alpha",
      implemented: false,
      enabled: false
    },
    { 
      id: "mod5", 
      name: "Gender Classifier", 
      desc: "Demographic parsing to support distress analysis indexes.",
      version: "Planned",
      implemented: false,
      enabled: false
    },
    { 
      id: "mod6", 
      name: "Face Identification", 
      desc: "Identity matches against restricted logs databases.",
      version: "Planned",
      implemented: false,
      enabled: false
    },
    { 
      id: "mod7", 
      name: "Pose Analysis", 
      desc: "Body pose node coordinates tracker to extract posture anomalies.",
      version: "Planned",
      implemented: false,
      enabled: false
    },
    { 
      id: "mod8", 
      name: "Behaviour Analysis", 
      desc: "Spatio-temporal tracking of movements for suspicious loitering detection.",
      version: "Planned",
      implemented: false,
      enabled: false
    },
    { 
      id: "mod9", 
      name: "Threat Assessment Engine", 
      desc: "Integrates multiple metrics to calculate a threat level index.",
      version: "Planned",
      implemented: false,
      enabled: false
    },
    { 
      id: "mod10", 
      name: "Decision Dispatcher", 
      desc: "Triggers notifications and emergency dispatches based on threat assessments.",
      version: "Planned",
      implemented: false,
      enabled: false
    }
  ]);

  const handleToggle = (id: string) => {
    setModels(prev => 
      prev.map(m => {
        if (m.id === id && m.implemented) {
          return { ...m, enabled: !m.enabled };
        }
        return m;
      })
    );
  };

  return (
    <div className="space-y-4 text-xs select-none">
      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
        <h3 className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400">AI Model Registry</h3>
        <span className="text-[10px] text-slate-500 font-bold uppercase">Active Models: {models.filter(m => m.enabled).length}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {models.map((model) => (
          <div 
            key={model.id} 
            className={`glass-panel p-4 rounded-xl border flex flex-col justify-between gap-3 ${
              model.implemented 
                ? "border-slate-900 bg-slate-950/20" 
                : "border-slate-950/50 bg-slate-950/5 opacity-60"
            }`}
          >
            <div>
              {/* Header */}
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border flex-shrink-0 ${
                    model.implemented 
                      ? "bg-slate-900 border-slate-800 text-cyan-400" 
                      : "bg-slate-950 border-slate-950 text-slate-600"
                  }`}>
                    <FiCpu />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200 uppercase">{model.name}</h4>
                    <span className="text-[9px] font-mono text-slate-500 block mt-0.5">Version: {model.version}</span>
                  </div>
                </div>

                {/* Status Badges */}
                {model.implemented ? (
                  <span className={`px-2 py-0.5 rounded border text-[8px] font-extrabold uppercase tracking-widest ${
                    model.enabled 
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_6px_rgba(6,182,212,0.15)]" 
                      : "bg-slate-900 text-slate-500 border-slate-800"
                  }`}>
                    {model.enabled ? "Active" : "Disabled"}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded border border-slate-800 bg-slate-900/40 text-slate-600 text-[8px] font-extrabold uppercase tracking-widest flex items-center gap-1">
                    <FiClock /> Coming Soon
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-slate-400 mt-2.5 leading-relaxed">{model.desc}</p>
            </div>

            {/* Toggle footer */}
            {model.implemented && (
              <div className="border-t border-slate-900/60 pt-3 flex justify-between items-center">
                <span className="text-slate-500 text-[9px] uppercase font-bold flex items-center gap-1">
                  <FiSettings /> Configuration Toggles
                </span>
                
                {/* Switch button */}
                <button
                  onClick={() => handleToggle(model.id)}
                  className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${
                    model.enabled ? "bg-cyan-500" : "bg-slate-800 border border-slate-700"
                  }`}
                >
                  <span className={`absolute left-0.5 top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${
                    model.enabled ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>
            )}

          </div>
        ))}
      </div>

    </div>
  );
};

export default ModelStatusCard;
