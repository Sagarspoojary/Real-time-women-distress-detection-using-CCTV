import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiAlertTriangle, FiAlertCircle, FiInfo } from "react-icons/fi";

export interface AlertData {
  id: string;
  time: string;
  priority: "Info" | "Warning" | "Critical" | "Emergency";
  desc: string;
  status: string;
}

interface AlertCardProps {
  alerts: AlertData[];
  onDismiss: (id: string) => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ alerts, onDismiss }) => {
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "Emergency": 
        return {
          card: "bg-red-950/40 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)] text-red-200 animate-pulse",
          icon: <FiAlertTriangle className="text-red-400 text-lg" />,
          badge: "bg-red-500/20 text-red-400 border-red-500/35"
        };
      case "Critical": 
        return {
          card: "bg-orange-950/30 border-orange-500/25 shadow-[0_0_15px_rgba(249,115,22,0.1)] text-orange-200",
          icon: <FiAlertCircle className="text-orange-400 text-lg" />,
          badge: "bg-orange-500/20 text-orange-400 border-orange-500/35"
        };
      case "Warning": 
        return {
          card: "bg-amber-950/30 border-amber-500/25 text-amber-200",
          icon: <FiAlertCircle className="text-amber-400 text-lg" />,
          badge: "bg-amber-500/20 text-amber-400 border-amber-500/35"
        };
      default: 
        return {
          card: "bg-cyan-950/20 border-cyan-500/20 text-cyan-200",
          icon: <FiInfo className="text-cyan-400 text-lg" />,
          badge: "bg-cyan-500/20 text-cyan-400 border-cyan-500/35"
        };
    }
  };

  return (
    <div className="space-y-3 w-full select-none">
      <AnimatePresence initial={false}>
        {alerts.map((alert) => {
          const style = getPriorityStyle(alert.priority);
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className={`p-4 rounded-xl border flex gap-4 relative items-start group transition-all ${style.card}`}
            >
              {/* Alert Icon */}
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-900/60 flex-shrink-0">
                {style.icon}
              </div>

              {/* Content */}
              <div className="flex-grow pr-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${style.badge}`}>
                    {alert.priority}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 font-semibold">{alert.time}</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-auto">{alert.status}</span>
                </div>
                <p className="text-xs font-semibold text-slate-100 mt-2 leading-relaxed">
                  {alert.desc}
                </p>
              </div>

              {/* Dismiss Button */}
              <button
                onClick={() => onDismiss(alert.id)}
                className="absolute top-4 right-4 p-1 rounded bg-slate-950/40 border border-transparent hover:border-slate-800 hover:bg-slate-950 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Dismiss Alert"
              >
                <FiX className="text-xs" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default AlertCard;
