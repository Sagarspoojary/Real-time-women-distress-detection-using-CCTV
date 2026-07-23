import React from "react";
import { motion } from "framer-motion";
import { FiCpu } from "react-icons/fi";

const RouteLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center gap-4 z-[9999] select-none text-xs">
      <div className="relative">
        {/* Blinking outer circle */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="w-16 h-16 rounded-full border-2 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent"
        />
        {/* Inner pulsing logo */}
        <div className="absolute inset-0 flex items-center justify-center text-cyan-400 text-lg">
          <FiCpu className="animate-pulse" />
        </div>
      </div>
      
      <div className="text-center space-y-1.5">
        <h4 className="font-extrabold uppercase text-slate-300 tracking-widest text-[10px]">
          Synchronizing SOC Feeds
        </h4>
        <p className="text-[9px] text-slate-500 font-mono">
          Syncing cryptographic clearance tokens...
        </p>
      </div>
    </div>
  );
};

export default RouteLoader;
