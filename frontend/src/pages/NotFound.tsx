import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiAlertOctagon, FiArrowLeft } from "react-icons/fi";

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center select-none text-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass-panel border border-slate-900 p-8 rounded-2xl flex flex-col items-center gap-6 shadow-2xl"
      >
        <div className="p-4 bg-red-950/20 border border-red-500/20 text-red-400 rounded-full animate-bounce">
          <FiAlertOctagon className="text-4xl" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-white tracking-tight font-mono">404</h1>
          <h3 className="font-extrabold text-sm uppercase text-slate-200 tracking-wider">
            Terminal Route Unregistered
          </h3>
          <p className="text-slate-500 leading-relaxed max-w-xs mx-auto">
            The requested security dashboard coordinate or interface is not linked to this operator account.
          </p>
        </div>

        <button
          onClick={() => navigate("/dashboard")}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-bold rounded-xl transition-all cursor-pointer uppercase tracking-wider text-[10px]"
        >
          <FiArrowLeft /> Return to Main SOC Dashboard
        </button>
      </motion.div>
    </div>
  );
};

export default NotFound;
