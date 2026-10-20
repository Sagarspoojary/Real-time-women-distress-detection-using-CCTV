import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { 
  BsShieldFillExclamation, 
  BsActivity, 
  BsEye, 
  BsShieldCheck,
  BsLaptop,
  BsCloudCheck
} from "react-icons/bs";
import { 
  FiVideo, 
  FiShield, 
  FiCpu, 
  FiTrendingUp, 
  FiAlertTriangle
} from "react-icons/fi";
import { GiCrossedPistols } from "react-icons/gi";
import { FaUserShield, FaBrain } from "react-icons/fa";
import ThemeToggle from "../components/ThemeToggle";

const Landing: React.FC = () => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const handleOpenCookieSettings = () => {
    window.dispatchEvent(new CustomEvent("open-cookie-settings"));
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col relative selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background visual glowing patterns */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.08)_0%,rgba(124,58,237,0.03)_50%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.04)_0%,transparent_70%)] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 w-full glass-panel border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-950/40 border border-cyan-500/20 rounded-lg">
            <BsShieldFillExclamation className="text-cyan-400 text-xl shadow-[0_0_10px_rgba(6,182,212,0.4)]" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">
            Women Distress <span className="text-cyan-400">AI</span>
          </span>
        </div>
        <nav className="flex items-center gap-3">
          <ThemeToggle />
          <Link 
            to="/login" 
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none rounded-lg"
          >
            Log In
          </Link>
          <Link 
            to="/register" 
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-lg shadow-lg shadow-cyan-500/10 border border-cyan-400/20 hover:scale-105 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          >
            Create Account
          </Link>
        </nav>
      </header>

      {/* Statutory Emergency Disclaimer Banner */}
      <div className="bg-red-950/30 border-b border-red-500/30 px-6 py-2.5 text-xs text-red-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FiAlertTriangle className="text-red-400 text-base flex-shrink-0" />
            <span>
              <strong>Statutory Safety Notice:</strong> This AI system is an assistive decision-support tool. It does <em>not</em> replace police or emergency first-responders. In active emergencies, dial <strong>112</strong> immediately.
            </span>
          </div>
          <Link to="/terms" className="text-red-300 hover:text-white underline font-semibold whitespace-nowrap">
            Read AI Disclaimer &rarr;
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-16 text-center flex flex-col items-center">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-xs font-semibold tracking-wide text-cyan-300 uppercase mb-8 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
        >
          <FiShield className="text-cyan-400" /> AI-Assisted Visual Distress Screening Active
        </motion.div>

        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.8 }}
          className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl"
        >
          Securing Public Spaces Through
          <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 glow-cyan">
            Advanced Computer Vision
          </span>
        </motion.h1>

        <motion.p
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl leading-relaxed"
        >
          Women Distress Detection AI analyzes live video feeds to detect violent incidents, recognize distress body language, track entities, and trigger rapid alerts to authorized personnel.
        </motion.p>

        {/* Hero CTA buttons */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-10 flex flex-wrap gap-4 justify-center"
        >
          <Link 
            to="/register" 
            className="px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:via-indigo-500 hover:to-purple-500 rounded-xl shadow-xl shadow-cyan-500/10 border border-cyan-400/20 hover:scale-105 active:scale-95 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          >
            Deploy AI System
          </Link>
          <Link 
            to="/login" 
            className="px-8 py-4 text-base font-semibold text-slate-300 hover:text-white bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl hover:scale-105 active:scale-95 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          >
            Access Dashboard
          </Link>
        </motion.div>
      </section>

      {/* Project Introduction */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-900">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
              Why We Engineered This System
            </h2>
            <p className="mt-4 text-slate-400 leading-relaxed">
              In public spaces, response time is everything. Relying solely on passive video recording is insufficient. Women Distress Detection AI introduces active surveillance. By identifying signals of physical assault, panic motions, or SOS gestures, the system transforms CCTV systems into proactive safety nets.
            </p>
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-emerald-950/40 border border-emerald-500/20 rounded-lg text-emerald-400 mt-1">
                  <BsShieldCheck className="text-lg" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Preventative Escalation</h4>
                  <p className="text-sm text-slate-400 mt-1">
                    Assists security personnel by detecting distress patterns to expedite timely escalation and emergency response.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-indigo-950/40 border border-indigo-500/20 rounded-lg text-indigo-400 mt-1">
                  <FaBrain className="text-lg" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Multi-stage AI Architecture</h4>
                  <p className="text-sm text-slate-400 mt-1">Fuses spatio-temporal video features, object detection, and tracking.</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="glass-panel p-8 rounded-2xl border border-slate-800/80 relative"
          >
            <div className="absolute -top-6 -left-6 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">Model Benchmark Summary</span>
            <h3 className="text-xl font-bold text-white mt-2 mb-4">Core Model Efficiencies (Test Benchmarks)</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span className="text-slate-300">Model 1 (Violence Classification)</span>
                  <span className="text-cyan-400 font-mono">94.72% Test Acc</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full rounded-full" style={{ width: "94.72%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span className="text-slate-300">Model 2 (Distress / SOS Recognition)</span>
                  <span className="text-purple-400 font-mono">96.29% Test Acc</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: "96.29%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span className="text-slate-300">Model 3 (YOLO Person Tracking)</span>
                  <span className="text-indigo-400 font-mono">Real-Time FPS</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: "88%" }} />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-5 italic">
              *Laboratory test benchmarks on curated datasets. Real-world optical accuracy varies based on lighting, camera angle, and optical occlusions.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-900">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Surveillance Capabilities
          </h2>
          <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
            Deep-learning modules trained to categorize activity and isolate security risks immediately.
          </p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {/* Card 1 */}
          <motion.div variants={itemVariants} className="glass-panel p-6 rounded-2xl border border-slate-800/80 hover:border-cyan-500/30 transition-all duration-300 group">
            <div className="p-3 bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
              <BsShieldFillExclamation className="text-2xl" />
            </div>
            <h3 className="text-lg font-bold text-white mt-5">Violence Detection</h3>
            <p className="text-sm text-slate-400 mt-2">Classifies video frames for normal activity, general violence, or severe assault with high confidence.</p>
          </motion.div>

          {/* Card 2 */}
          <motion.div variants={itemVariants} className="glass-panel p-6 rounded-2xl border border-slate-800/80 hover:border-purple-500/30 transition-all duration-300 group">
            <div className="p-3 bg-purple-950/40 border border-purple-500/20 text-purple-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
              <BsActivity className="text-2xl" />
            </div>
            <h3 className="text-lg font-bold text-white mt-5">Distress Detection</h3>
            <p className="text-sm text-slate-400 mt-2">Recognizes physical running, falls, punching, and distinct emergency/SOS body language.</p>
          </motion.div>

          {/* Card 3 */}
          <motion.div variants={itemVariants} className="glass-panel p-6 rounded-2xl border border-slate-800/80 hover:border-indigo-500/30 transition-all duration-300 group">
            <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 text-indigo-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
              <BsEye className="text-2xl" />
            </div>
            <h3 className="text-lg font-bold text-white mt-5">Person Tracking</h3>
            <p className="text-sm text-slate-400 mt-2">Uses YOLO11 + ByteTrack to isolate targets, assign unique track IDs, and log coordinates.</p>
          </motion.div>

          {/* Card 4 (In Development) */}
          <motion.div variants={itemVariants} className="glass-panel p-6 rounded-2xl border border-slate-800/40 opacity-70 relative">
            <span className="absolute top-4 right-4 px-2 py-0.5 text-[10px] font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-md">Roadmap</span>
            <div className="p-3 bg-slate-900/60 text-slate-500 rounded-xl w-fit">
              <GiCrossedPistols className="text-2xl" />
            </div>
            <h3 className="text-lg font-bold text-slate-300 mt-5">Weapon Detection</h3>
            <p className="text-sm text-slate-500 mt-2">Identifies knives, handguns, and rifles on individual targets using high-density bounding box crops.</p>
          </motion.div>

          {/* Card 5 (In Development) */}
          <motion.div variants={itemVariants} className="glass-panel p-6 rounded-2xl border border-slate-800/40 opacity-70 relative">
            <span className="absolute top-4 right-4 px-2 py-0.5 text-[10px] font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-md">Roadmap</span>
            <div className="p-3 bg-slate-900/60 text-slate-500 rounded-xl w-fit">
              <FaUserShield className="text-2xl" />
            </div>
            <h3 className="text-lg font-bold text-slate-300 mt-5">Face Recognition</h3>
            <p className="text-sm text-slate-500 mt-2">Checks identity records against local authorization databases to flag unknown intruders or repeat offenders.</p>
          </motion.div>

          {/* Card 6 (In Development) */}
          <motion.div variants={itemVariants} className="glass-panel p-6 rounded-2xl border border-slate-800/40 opacity-70 relative">
            <span className="absolute top-4 right-4 px-2 py-0.5 text-[10px] font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-md">Roadmap</span>
            <div className="p-3 bg-slate-900/60 text-slate-500 rounded-xl w-fit">
              <FiTrendingUp className="text-2xl" />
            </div>
            <h3 className="text-lg font-bold text-slate-300 mt-5">Threat Assessment</h3>
            <p className="text-sm text-slate-500 mt-2">Correlates multiple detection variables to assign a dynamic unified risk level to the environment.</p>
          </motion.div>
        </motion.div>
      </section>

      {/* Technology Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-900 w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Engineered Stack
          </h2>
          <p className="mt-4 text-slate-400">
            A look at the professional, scalable technologies powering our threat assessment ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 text-center">
          {[
            { name: "FastAPI", category: "Backend Engine", icon: <BsLaptop className="mx-auto text-cyan-400 text-3xl mb-3" /> },
            { name: "PyTorch", category: "Deep Learning", icon: <FaBrain className="mx-auto text-orange-500 text-3xl mb-3" /> },
            { name: "VideoMAE", category: "Action Transformers", icon: <FiCpu className="mx-auto text-indigo-400 text-3xl mb-3" /> },
            { name: "YOLO11", category: "Object Detection", icon: <BsEye className="mx-auto text-pink-500 text-3xl mb-3" /> },
            { name: "ByteTrack", category: "Motion Tracking", icon: <FiTrendingUp className="mx-auto text-emerald-400 text-3xl mb-3" /> },
            { name: "React", category: "UI Engine", icon: <BsActivity className="mx-auto text-blue-400 text-3xl mb-3" /> },
            { name: "TypeScript", category: "Typed Logic", icon: <BsShieldCheck className="mx-auto text-cyan-300 text-3xl mb-3" /> },
            { name: "TailwindCSS", category: "Utility Style", icon: <BsLaptop className="mx-auto text-sky-400 text-3xl mb-3" /> },
            { name: "Firebase", category: "Auth Core", icon: <BsCloudCheck className="mx-auto text-amber-500 text-3xl mb-3" /> }
          ].map((tech, idx) => (
            <div key={idx} className="glass-panel p-6 rounded-xl border border-slate-800/80">
              {tech.icon}
              <h4 className="font-bold text-white text-md">{tech.name}</h4>
              <span className="text-xs text-slate-500 mt-1 block">{tech.category}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-900 w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Systems Pipeline
          </h2>
          <p className="mt-4 text-slate-400">
            From live frame capture to control center deployment, here is the execution pipeline.
          </p>
        </div>

        <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-4 max-w-5xl mx-auto">
          {/* Timeline Connector Line */}
          <div className="absolute left-[39px] lg:left-0 lg:top-[39px] top-0 bottom-0 lg:bottom-auto w-[2px] lg:w-full lg:h-[2px] bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 opacity-30 pointer-events-none" />

          {[
            { step: "01", title: "Video Ingestion", desc: "Live CCTV streams or video uploads feed into local processing buffers.", icon: <FiVideo /> },
            { step: "02", title: "AI Processing", desc: "VideoMAE and YOLO classify activities and isolate person entities in transient memory.", icon: <FiCpu /> },
            { step: "03", title: "Distress Scoring", desc: "Postures, running, and distress signals are scored against sensitivity thresholds.", icon: <BsShieldFillExclamation /> },
            { step: "04", title: "Evidence Log", desc: "Confirmed incidents record 10-second MP4 evidence clips and structured metadata.", icon: <BsShieldCheck /> },
            { step: "05", title: "Alert Dispatch", desc: "Dispatches rapid alerts to configured emergency SMS channels and dashboard.", icon: <FiAlertTriangle /> }
          ].map((node, index) => (
            <div key={index} className="flex flex-row lg:flex-col items-start lg:items-center text-left lg:text-center gap-6 lg:gap-4 z-10 w-full lg:w-44">
              <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 text-2xl shadow-lg shadow-cyan-950/20">
                {node.icon}
              </div>
              <div>
                <span className="text-[10px] font-bold text-cyan-500 tracking-widest block uppercase">STEP {node.step}</span>
                <h4 className="font-bold text-white text-md mt-1">{node.title}</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{node.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-900 text-center w-full">
        <div className="glass-panel p-12 rounded-3xl border border-slate-800/80 relative overflow-hidden max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_70%)] pointer-events-none" />
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Deploy Women Distress AI Today
          </h2>
          <p className="mt-4 text-slate-400 max-w-xl mx-auto leading-relaxed">
            Integrate public cameras and private monitoring systems with high-accuracy spatial tracking and behavior classification.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Link 
              to="/register" 
              className="px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-cyan-500/10 border border-cyan-400/20 hover:scale-105 active:scale-95 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
            >
              Get Started
            </Link>
            <Link 
              to="/login" 
              className="px-8 py-4 text-base font-semibold text-slate-300 hover:text-white bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl hover:scale-105 active:scale-95 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Comprehensive Statutory Footer with Business Details */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-14 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Col 1: Business Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <BsShieldFillExclamation className="text-cyan-400 text-xl" />
                <span className="font-bold text-sm text-white">
                  AegisSafe AI Technologies Pvt. Ltd.
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Developer of Real-Time Women Distress Detection & Safety Surveillance Systems. Engineered in Bengaluru, India.
              </p>
              <div className="text-[11px] text-slate-500 space-y-1 font-mono pt-1">
                <p><strong>CIN:</strong> U72900KA2024PTC184920</p>
                <p><strong>Registered Office:</strong> Tech Park Central, 4th Floor, Outer Ring Road, Bellandur, Bengaluru, Karnataka 560103, India.</p>
              </div>
            </div>

            {/* Col 2: Legal & Compliance Policies */}
            <div>
              <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Legal & Regulatory</h3>
              <ul className="space-y-2 text-xs">
                <li><Link to="/privacy" className="hover:text-cyan-400 transition-colors">Privacy Policy (DPDP Act 2023)</Link></li>
                <li><Link to="/terms" className="hover:text-cyan-400 transition-colors">Terms of Service & Disclaimer</Link></li>
                <li><Link to="/cookies" className="hover:text-cyan-400 transition-colors">Cookie & Storage Policy</Link></li>
                <li><Link to="/refund" className="hover:text-cyan-400 transition-colors">Refund & Cancellation Policy</Link></li>
                <li>
                  <button 
                    onClick={handleOpenCookieSettings}
                    className="text-cyan-400 hover:underline"
                  >
                    Manage Cookie Preferences
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Platform Features */}
            <div>
              <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Platform & Capabilities</h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><Link to="/dashboard/live-detection" className="hover:text-cyan-400 transition-colors">Live CCTV Monitoring</Link></li>
                <li><Link to="/dashboard/outputs-vault" className="hover:text-cyan-400 transition-colors">Outputs Vault (Evidence Archive)</Link></li>
                <li><Link to="/dashboard/upload-video" className="hover:text-cyan-400 transition-colors">Video Upload Analysis</Link></li>
                <li><Link to="/dashboard/settings" className="hover:text-cyan-400 transition-colors">SMS Recipient Settings</Link></li>
                <li><Link to="/dashboard/help-support" className="hover:text-cyan-400 transition-colors">Technical Help & FAQs</Link></li>
              </ul>
            </div>

            {/* Col 4: Grievance Officer & Emergency Helpline */}
            <div className="space-y-3">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Statutory Grievance Redressal</h3>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-[11px]">
                <p><strong className="text-white">Grievance Officer:</strong> Mr. Arvind Raman</p>
                <p><strong className="text-white">Email:</strong> <a href="mailto:grievance@aegissafe.ai" className="text-cyan-400 hover:underline">grievance@aegissafe.ai</a></p>
                <p><strong className="text-white">SLA:</strong> 48h Ack • 30d Redressal</p>
                <p className="text-slate-500 text-[10px] pt-1">
                  Appointed under Section 13(2) of the Digital Personal Data Protection Act, 2023.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-500/20 text-[11px] text-red-200">
                <strong>Emergency Helpline:</strong> Dial <strong>112</strong> (National Emergency Service) or <strong>1091</strong> (Women Helpline in India).
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>&copy; {new Date().getFullYear()} AegisSafe AI Technologies Pvt. Ltd. All rights reserved.</p>
            <p className="font-mono text-cyan-400/90 text-[10px]">
              DPDP ACT 2023 COMPLIANT • LOCAL PROCESSING • ZERO THIRD-PARTY AD TRACKERS
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
