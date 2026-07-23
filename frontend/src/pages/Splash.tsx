import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BsShieldFillExclamation } from "react-icons/bs";

const Splash: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/landing");
    }, 2800);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#030712] relative overflow-hidden select-none">
      {/* Background ambient glowing grids */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.08)_0,transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.05)_0,transparent_40%)] pointer-events-none" />

      {/* Main Container */}
      <div className="z-10 flex flex-col items-center max-w-md px-6 text-center">
        {/* Animated Glowing Logo */}
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: [0.3, 1.1, 1], opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="relative flex items-center justify-center w-28 h-28 rounded-3xl bg-radial from-slate-900 to-slate-950 border border-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.15)] mb-8"
        >
          <BsShieldFillExclamation className="text-cyan-400 text-5xl drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            className="absolute inset-0 border-t-2 border-r-2 border-cyan-500/40 rounded-3xl"
          />
        </motion.div>

        {/* Project Name */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
        >
          Women Distress
          <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 glow-cyan">
            Detection AI
          </span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-3 text-sm tracking-widest uppercase text-slate-400"
        >
          INTELLIGENT SURVEILLANCE & PROTECTION
        </motion.p>

        {/* Modern Progress Loading Indicator */}
        <div className="w-48 h-1 bg-slate-800/80 rounded-full overflow-hidden mt-12 relative border border-slate-700/20">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.2, ease: "easeInOut" }}
            className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
          />
        </div>

        {/* Loader Status Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, delay: 1.4 }}
          className="mt-3 text-xs font-medium tracking-wide text-cyan-400/80"
        >
          Initializing security cores...
        </motion.p>
      </div>
    </div>
  );
};

export default Splash;
