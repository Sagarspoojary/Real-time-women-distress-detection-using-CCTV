import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiClock, FiActivity, FiUserPlus, FiAlertTriangle, FiCheck } from "react-icons/fi";

export interface TimelineEvent {
  id: string;
  time: string;
  type: "person" | "violence" | "distress" | "alert" | "system";
  text: string;
}

interface TimelineProps {
  events: TimelineEvent[];
}

const Timeline: React.FC<TimelineProps> = ({ events }) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case "person": return <FiUserPlus className="text-cyan-400" />;
      case "violence": return <FiAlertTriangle className="text-red-400" />;
      case "distress": return <FiActivity className="text-orange-400" />;
      case "alert": return <FiAlertTriangle className="text-amber-400" />;
      default: return <FiCheck className="text-emerald-400" />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case "person": return "border-cyan-500/20";
      case "violence": return "border-red-500/30";
      case "distress": return "border-orange-500/20";
      case "alert": return "border-amber-500/25";
      default: return "border-slate-800";
    }
  };

  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-900 select-none flex flex-col h-[320px]">
      {/* Header */}
      <h3 className="font-bold text-xs uppercase tracking-wider text-white mb-4 flex items-center gap-2">
        <FiClock className="text-cyan-400 animate-pulse" /> Live Event Timeline
      </h3>

      {/* Timeline list */}
      <div className="flex-grow overflow-y-auto space-y-3 pr-1">
        <AnimatePresence initial={false}>
          {events.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
              Awaiting stream analysis initialization...
            </div>
          ) : (
            events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex gap-3 p-2.5 rounded-lg bg-slate-950/45 border ${getBorderColor(event.type)}`}
              >
                {/* Event Icon wrapper */}
                <div className="mt-0.5 p-1 rounded bg-slate-900 flex-shrink-0">
                  {getEventIcon(event.type)}
                </div>

                <div className="flex-grow flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-300 leading-tight">{event.text}</span>
                  <span className="text-[9px] font-mono font-bold text-slate-500 ml-4 whitespace-nowrap">{event.time}</span>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Timeline;
