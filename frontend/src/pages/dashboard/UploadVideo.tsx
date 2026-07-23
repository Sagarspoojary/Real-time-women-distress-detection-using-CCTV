import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { uploadAndAnalyzeVideo, API_BASE_URL } from "../../services/api";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiUploadCloud, 
  FiFile, 
  FiX, 
  FiPlay, 
  FiCpu, 
  FiAlertCircle, 
  FiClipboard, 
  FiDownload, 
  FiChevronDown, 
  FiChevronUp,
  FiClock,
  FiTarget,
  FiMail,
  FiAlertOctagon,
  FiCheckCircle,
  FiAlertTriangle
} from "react-icons/fi";
import { BsBoundingBox } from "react-icons/bs";

const UploadVideo: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);

  // Loading and progress states
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusStage, setStatusStage] = useState<"idle" | "uploading" | "processing" | "completed" | "error">("idle");
  const [activeModelText, setActiveModelText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Response dataset
  const [results, setResults] = useState<any>(null);
  const [expandedJson, setExpandedJson] = useState(false);

  // Emergency email workflow states
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "success" | "failed">("idle");
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle fake active model text transitions during backend analysis
  useEffect(() => {
    if (statusStage !== "processing") {
      setActiveModelText("");
      return;
    }

    const stages = [
      { text: "Executing Model 1: Violence Classifier...", delay: 0 },
      { text: "Executing Model 2: Distress Action Classifier...", delay: 4000 },
      { text: "Executing Model 3: YOLO11 + ByteTrack Tracking...", delay: 8000 },
      { text: "Rendering HUD bounding box debug video...", delay: 12000 },
      { text: "Finalizing security package dispatch...", delay: 16000 }
    ];

    const timers = stages.map((stage) => 
      setTimeout(() => {
        setActiveModelText(stage.text);
      }, stage.delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [statusStage]);

  // Clean object URL on unmount
  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
    };
  }, [originalUrl]);

  // Validate file
  const validateFile = (selectedFile: File) => {
    const validExtensions = ["mp4", "avi", "mov", "mkv"];
    const extension = selectedFile.name.split(".").pop()?.toLowerCase();
    
    if (!extension || !validExtensions.includes(extension)) {
      toast.error("Unsupported file format! Please upload MP4, AVI, MOV, or MKV.");
      return false;
    }
    return true;
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        setOriginalUrl(URL.createObjectURL(droppedFile));
        resetResults();
      }
    }
  };

  // Manual File Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        setOriginalUrl(URL.createObjectURL(selectedFile));
        resetResults();
      }
    }
  };

  const resetResults = () => {
    setResults(null);
    setProcessedUrl(null);
    setStatusStage("idle");
    setErrorMsg(null);
    setEmailStatus("idle");
    setShowConfirm(false);
    setEmailSent(false);
  };

  const removeFile = () => {
    setFile(null);
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    setOriginalUrl(null);
    resetResults();
  };

  // Run AI Analysis request
  const handleAnalyze = async () => {
    if (!file) return;

    setLoading(true);
    setStatusStage("uploading");
    setUploadProgress(0);
    setErrorMsg(null);

    try {
      const data = await uploadAndAnalyzeVideo(file, (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setUploadProgress(percentCompleted);
        if (percentCompleted === 100) {
          setStatusStage("processing");
        }
      });

      setResults(data);
      setStatusStage("completed");
      // Cache buster timestamp added to force refresh of processed video player
      setProcessedUrl(`${API_BASE_URL}/outputs/debug_tracking.mp4?t=${Date.now()}`);
      
      // Persist results log locally for dashboard integration
      try {
        const historyItem = {
          id: String(Date.now()),
          videoName: file.name,
          timestamp: new Date().toISOString(),
          model1: data.model1,
          model2: data.model2,
          model3: data.model3,
          persons: data.persons || [],
          status: data.status,
          emailSent: "No"
        };
        const existingHistory = JSON.parse(localStorage.getItem("distress_ai_history") || "[]");
        localStorage.setItem("distress_ai_history", JSON.stringify([historyItem, ...existingHistory]));
      } catch (storageErr) {
        console.error("Failed to write to local storage logs", storageErr);
      }

      toast.success("AI Inference scan completed!");
    } catch (err: any) {
      console.error(err);
      setStatusStage("error");
      const errText = err.response?.data?.detail || err.message || "Network request failed.";
      setErrorMsg(errText);
      toast.error("Failed to process security feed.");
    } finally {
      setLoading(false);
    }
  };



  const handleSendEmail = async () => {
    setEmailStatus("sending");
    try {
      const target = results?.persons?.find((p: any) => p.gender === "Female" && p.distress);
      if (!target) {
        toast.error("Condition mismatch: No female distress target detected.");
        setEmailStatus("failed");
        return;
      }

      const payload = {
        incident_id: String(Date.now()),
        persons: results.persons,
        model1: results.model1 || {},
        model2: results.model2 || {},
        timestamp: new Date().toLocaleString(),
        video_name: file?.name || "security_feed.mp4"
      };

      const response = await axios.post(`${API_BASE_URL}/api/v1/emergency/send`, payload);
      
      if (response.data.status === "success") {
        setEmailStatus("success");
        setEmailSent(true);
        toast.success("Alert broadcast emails sent successfully to all emergency contacts!");
        
        try {
          const existingHistory = JSON.parse(localStorage.getItem("distress_ai_history") || "[]");
          if (existingHistory.length > 0) {
            existingHistory[0].emailSent = "Yes";
            localStorage.setItem("distress_ai_history", JSON.stringify(existingHistory));
          }
        } catch (storageErr) {
          console.error(storageErr);
        }
      } else {
        setEmailStatus("failed");
        toast.error(response.data.reason || "Failed to send emergency emails.");
      }
    } catch (err: any) {
      console.error(err);
      setEmailStatus("failed");
      const errDetail = err.response?.data?.detail || "Network error. SMTP server may be offline.";
      toast.error(errDetail);
    }
  };

  const copyJsonToClipboard = () => {
    if (!results) return;
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    toast.success("JSON copied to clipboard!");
  };

  const downloadJson = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `detection_results_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 select-none pb-12">
      
      {/* 1. Page Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-900 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Footage Analysis Terminal</h1>
          <p className="text-xs text-slate-400 mt-1">Upload video files for multi-stage anomaly detection scans.</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-xs font-bold text-cyan-400 uppercase tracking-wider">
          <FiCpu /> Core Node Online
        </div>
      </div>

      {/* 2. Drag & Drop Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upload card controls */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {!file ? (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-grow h-[260px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all ${
                dragActive 
                  ? "border-cyan-400 bg-cyan-950/15" 
                  : "border-slate-800 bg-slate-950/20 hover:border-slate-700"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="video/*"
                onChange={handleFileChange}
              />
              <div className="p-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                <FiUploadCloud className="text-3xl text-cyan-400" />
              </div>
              <h3 className="font-bold text-sm text-slate-200">Drag & drop footage here</h3>
              <p className="text-xs text-slate-500 mt-1.5">Supported formats: MP4, AVI, MOV, MKV</p>
              <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mt-4">or browse file systems</span>
            </div>
          ) : (
            <div className="glass-panel p-4 rounded-2xl border border-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-900 border border-slate-800 text-cyan-400 rounded-lg">
                  <FiFile className="text-lg" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-200 truncate max-w-xs sm:max-w-md">{file.name}</h4>
                  <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
              </div>
              
              {!loading && (
                <button
                  onClick={removeFile}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/20 transition-all cursor-pointer"
                >
                  <FiX />
                </button>
              )}
            </div>
          )}

          {/* Action trigger button */}
          {file && !loading && statusStage !== "completed" && (
            <button
              onClick={handleAnalyze}
              className="py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <FiPlay /> Initialize AI Scan
            </button>
          )}

          {/* Loader Overlay panel */}
          <AnimatePresence>
            {loading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass-panel p-6 rounded-2xl border border-slate-900 flex flex-col items-center justify-center text-center gap-4 py-8 shadow-2xl"
              >
                <div className="w-12 h-12 border-4 border-t-cyan-400 border-slate-800 rounded-full animate-spin" />
                <div>
                  <h4 className="font-extrabold text-sm text-white uppercase tracking-wider">
                    {statusStage === "uploading" ? `Uploading Feed (${uploadProgress}%)` : "Surveillance Pipeline Running"}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    {statusStage === "uploading" 
                      ? "Dispatching video frames to remote analyzer..."
                      : activeModelText || "Running action classification modules..."}
                  </p>
                </div>

                {/* Progress bar */}
                {statusStage === "uploading" && (
                  <div className="w-full max-w-xs h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80 mt-2">
                    <div 
                      className="h-full bg-cyan-500 transition-all duration-200" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error panel */}
          {statusStage === "error" && errorMsg && (
            <div className="p-4 bg-red-950/20 border border-red-500/20 text-red-400 rounded-xl flex gap-3 items-center">
              <FiAlertCircle className="text-lg flex-shrink-0" />
              <div>
                <h5 className="font-bold text-xs uppercase tracking-wider">Pipeline Processing Error</h5>
                <p className="text-xs mt-1 text-red-400/80 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Pipeline timeline display */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-900">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <FiClock /> Process Timeline
          </h3>

          <div className="space-y-4 relative pl-5 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
            {[
              { label: "Footage Received", desc: "Local payload uploaded", active: statusStage !== "idle" },
              { label: "Model 1: Violence Detector", desc: "Spatio-temporal classification", active: statusStage === "processing" || statusStage === "completed" },
              { label: "Model 2: Distress Detector", desc: "Emergency gesture parsing", active: statusStage === "processing" || statusStage === "completed" },
              { label: "Model 3: Tracker Engaged", desc: "YOLO bounding box rendering", active: statusStage === "processing" || statusStage === "completed" },
              { label: "Package Dispatch", desc: "Coordinates and debug file ready", active: statusStage === "completed" }
            ].map((node, index) => (
              <div key={index} className="relative text-xs">
                <div className={`absolute -left-[23px] top-0.5 w-3 h-3 rounded-full border-2 ${
                  node.active 
                    ? "bg-cyan-400 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]" 
                    : "bg-slate-950 border-slate-800"
                }`} />
                <h5 className={`font-bold uppercase tracking-wider ${node.active ? "text-slate-100" : "text-slate-500"}`}>{node.label}</h5>
                <p className="text-[10px] text-slate-500 mt-0.5">{node.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. Side-by-Side Video Players comparison */}
      <AnimatePresence>
        {statusStage === "completed" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className={`grid grid-cols-1 ${results?.model1?.prediction === "Normal" ? "max-w-2xl mx-auto w-full" : "lg:grid-cols-2"} gap-6`}
          >
            {/* Original Input */}
            <div className="flex flex-col gap-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 px-1">Original Video</h3>
              <div className="relative aspect-video bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden shadow-lg">
                {originalUrl && (
                  <video 
                    src={originalUrl} 
                    controls 
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </div>

            {/* Processed Output */}
            {results?.model1?.prediction !== "Normal" && (
              <div className="flex flex-col gap-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-cyan-400 glow-cyan px-1">Processed AI Stream</h3>
                <div className="relative aspect-video bg-slate-950 border border-cyan-500/20 rounded-2xl overflow-hidden shadow-2xl shadow-cyan-950/10">
                  {processedUrl && (
                    <video 
                      src={processedUrl} 
                      controls 
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. AI Diagnostic Cards & Target lists */}
      <AnimatePresence>
        {statusStage === "completed" && results && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* INCIDENT STATUS BANNER */}
            {(() => {
              const distressTarget = results?.persons?.find((p: any) => p.gender === "Female" && p.distress);
              const isViolence = results?.model1?.prediction === "Violence";

              let bannerBg = "bg-green-950/20 border-green-500/30 text-green-400";
              let bannerIcon = <FiCheckCircle className="text-lg" />;
              let bannerLabel = "Normal Activity";
              let bannerDesc = "AI pipeline reports normal surveillance feed status. No anomalies detected.";

              if (distressTarget) {
                bannerBg = "bg-red-950/30 border-red-500/40 text-red-400 animate-pulse";
                bannerIcon = <FiAlertOctagon className="text-lg text-red-500" />;
                bannerLabel = "Female Distress Detected";
                bannerDesc = "CRITICAL WARNING: AI Action Classifier triggered a high-threat distress waving anomaly.";
              } else if (isViolence) {
                bannerBg = "bg-amber-950/20 border-amber-500/30 text-amber-400";
                bannerIcon = <FiAlertCircle className="text-lg text-amber-500" />;
                bannerLabel = "Violence Detected";
                bannerDesc = "WARNING: Spatio-temporal classifier flagged a potential physical conflict incident.";
              }

              return (
                <div className={`p-4 rounded-2xl border ${bannerBg} flex items-start gap-3 text-xs select-none shadow-lg`}>
                  <div className="mt-0.5">{bannerIcon}</div>
                  <div>
                    <h4 className="font-extrabold uppercase tracking-wide text-sm">{bannerLabel}</h4>
                    <p className="text-slate-400 mt-1 leading-relaxed">{bannerDesc}</p>
                  </div>
                </div>
              );
            })()}

            {/* EMERGENCY EMAIL DISPATCH PANEL */}
            {(() => {
              const distressTarget = results?.persons?.find((p: any) => p.gender === "Female" && p.distress);
              if (!distressTarget) return null;

              const recognizedName = distressTarget.recognized_name || distressTarget.identity || "Unknown Person";

              return (
                <div className="glass-panel border border-red-500/20 p-5 rounded-2xl shadow-xl space-y-4 select-none">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <h3 className="text-red-400 font-extrabold text-sm uppercase tracking-wide flex items-center gap-1.5">
                        <FiMail /> Emergency Incident Dispatch Panel
                      </h3>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        A distress situation involving a female operator has been identified. Immediate emergency broadcast recommended.
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-red-950/20 border border-red-500/20 text-red-400 text-[10px] font-bold rounded uppercase tracking-wider">
                      Threat Active
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-950/40 border border-slate-900 rounded-xl text-xs">
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-semibold">Incident Type</span>
                      <span className="font-bold text-red-400">Female Distress</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-semibold">Recognized Person</span>
                      <span className="font-bold text-slate-200">{recognizedName}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-semibold">Confidence Score</span>
                      <span className="font-mono font-bold text-slate-200">{(distressTarget.face_confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-semibold">Track ID</span>
                      <span className="font-mono font-bold text-slate-200">#{distressTarget.track_id}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2 border-t border-slate-900/60">
                    <div className="text-slate-500 text-[10px]">
                      {emailStatus === "idle" && "Click button to broadcast emergency notifications to contacts."}
                      {emailStatus === "sending" && "Broadcasting warning packets to SMTP gateway..."}
                      {emailStatus === "success" && "Emails sent successfully."}
                      {emailStatus === "failed" && "SMTP server failed. Check settings and retry."}
                    </div>

                    <div className="flex gap-3 w-full sm:w-auto">
                      {emailStatus === "sending" ? (
                        <button
                          disabled
                          className="px-6 py-2 bg-slate-900 border border-slate-800 text-slate-500 font-bold rounded-xl text-xs uppercase tracking-wide w-full sm:w-auto cursor-not-allowed"
                        >
                          Sending Alert...
                        </button>
                      ) : emailStatus === "success" ? (
                        <div className="px-6 py-2 bg-green-950/20 border border-green-500/20 text-green-400 font-bold rounded-xl text-xs uppercase tracking-wide w-full sm:w-auto text-center">
                          Broadcast Complete
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowConfirm(true)}
                          className="px-6 py-2 bg-red-650 hover:bg-red-550 text-white font-bold rounded-xl text-xs uppercase tracking-wide cursor-pointer transition-colors shadow-lg shadow-red-950/30 w-full sm:w-auto text-center"
                        >
                          {emailStatus === "failed" ? "Retry Send" : "Send Emergency Email"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* CONFIRMATION POPUP DIALOG */}
            {showConfirm && (
              <>
                <div 
                  onClick={() => setShowConfirm(false)} 
                  className="fixed inset-0 bg-black/60 z-50 pointer-events-auto" 
                />
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md glass-panel border border-red-500/20 p-6 rounded-2xl shadow-2xl z-50 select-none flex flex-col gap-4 text-xs">
                  <h3 className="font-extrabold text-sm text-red-400 flex items-center gap-1.5 uppercase">
                    <FiAlertTriangle /> Confirm Emergency Broadcast?
                  </h3>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    This will immediately send distress alert emails to the four configured emergency contacts.
                  </p>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirm(false)}
                      className="flex-grow py-2 bg-slate-900 border border-slate-800 text-slate-300 font-semibold rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowConfirm(false);
                        handleSendEmail();
                      }}
                      className="flex-grow py-2 bg-red-650 hover:bg-red-550 text-white font-bold rounded-lg cursor-pointer"
                    >
                      Confirm Broadcast
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ANALYSIS PROCESS TIMELINE */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-900 space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Analysis Process Pipeline</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-7 gap-4 text-[10px] select-none font-semibold text-slate-500">
                {[
                  { label: "Upload Started", done: true },
                  { label: "Violence Detection", done: true },
                  { label: "Distress Detection", done: true },
                  { label: "Face Recognition", done: true },
                  { label: "Gender Classification", done: true },
                  { label: "Emergency Ready", done: results?.persons?.some((p: any) => p.gender === "Female" && p.distress) },
                  { label: "Email Sent", done: emailSent }
                ].map((step, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5 p-3 bg-slate-950/20 border border-slate-900/60 rounded-xl items-center text-center">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] border ${
                      step.done 
                        ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" 
                        : "bg-slate-950 border-slate-900 text-slate-600"
                    }`}>
                      {step.done ? "✓" : idx + 1}
                    </div>
                    <span className={step.done ? "text-slate-200" : "text-slate-600"}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* THREE COLUMNS GRID FOR DETAILS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Inference Summaries column */}
              <div className="lg:col-span-1 space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 px-1">Inference Diagnostics</h3>

                {/* Model 1: Violence */}
                <div className="glass-panel p-4 rounded-xl border border-slate-900 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">Model 1: Violence</span>
                    <h4 className="font-bold text-sm text-slate-200 mt-1 uppercase">
                      {results.model1?.prediction || "Normal"}
                    </h4>
                  </div>
                  {results.model1 && (
                    <span className="font-mono text-xs font-bold text-cyan-400 glow-cyan">
                      {results.model1.confidence}%
                    </span>
                  )}
                </div>

                {/* Model 2: Distress */}
                <div className="glass-panel p-4 rounded-xl border border-slate-900 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">Model 2: Action Pose</span>
                    <h4 className="font-bold text-sm text-slate-200 mt-1 uppercase">
                      {results.model2?.prediction || "N/A"}
                    </h4>
                  </div>
                  {results.model2 && (
                    <span className="font-mono text-xs font-bold text-purple-400">
                      {results.model2.confidence}%
                    </span>
                  )}
                </div>

                {/* Model 3: Person Tracking metadata */}
                <div className="glass-panel p-4 rounded-xl border border-slate-900 flex flex-col gap-2">
                  <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">Model 3: Tracking Summary</span>
                  <div className="flex justify-between items-center text-xs py-1 border-b border-slate-900/60">
                    <span className="font-medium text-slate-400">Total Tracked Targets</span>
                    <span className="font-bold text-white">{results.model3?.people_detected || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1">
                    <span className="font-medium text-slate-400">Total Frames Processed</span>
                    <span className="font-mono font-bold text-white">{results.model3?.frames_processed || 0}</span>
                  </div>
                </div>
              </div>

              {/* Tracked Target list column */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 px-1">
                  Target Entities ({results.persons?.length || 0})
                </h3>

                {results.persons && results.persons.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-1">
                    {results.persons.map((person: any, index: number) => (
                      <div 
                        key={index} 
                        className="glass-panel p-4 rounded-xl border border-slate-900 flex flex-col gap-2.5 relative select-none hover:border-slate-800 transition-all text-xs"
                      >
                        {/* Target Header */}
                        <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                          <div className="flex items-center gap-1.5">
                            <FiTarget className="text-cyan-400" />
                            <span className="font-extrabold font-mono text-white">TRACK_ID: {String(person.track_id).padStart(3, "0")}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            person.weapon || person.distress
                              ? "bg-red-950/20 border border-red-500/20 text-red-400 animate-pulse"
                              : "bg-cyan-950/20 border border-cyan-500/20 text-cyan-400"
                          }`}>
                            {person.weapon || person.distress ? "HIGH RISK" : "LOW RISK"}
                          </span>
                        </div>

                        {/* Thumbnail details */}
                        <div className="flex gap-4 items-center py-1">
                          {person.face_thumbnail ? (
                            <img 
                              src={person.face_thumbnail} 
                              alt="Face Thumbnail" 
                              className="w-14 h-14 rounded-lg object-cover border border-slate-800 bg-slate-950" 
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg border border-dashed border-slate-800 bg-slate-950/40 flex items-center justify-center text-slate-600 text-[10px]">
                              No Face
                            </div>
                          )}
                          
                          <div className="flex-grow grid grid-cols-2 gap-y-1.5 text-xs">
                            <div>
                              <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">Identified As</span>
                              <span className="font-bold text-slate-200">{person.recognized_name || person.identity || "Unknown"}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">Gender</span>
                              <span className="font-bold text-slate-200">{person.gender || "Unknown"}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">Face status</span>
                              <span className={`font-bold ${person.face_status === "Known" ? "text-cyan-400" : "text-slate-400"}`}>
                                {person.face_status || "Unknown"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">Gender Conf</span>
                              <span className="font-mono text-slate-300">
                                {person.gender_confidence ? `${(person.gender_confidence * 100).toFixed(0)}%` : "0%"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Diagnostic coordinates */}
                        <div className="grid grid-cols-2 gap-y-2 py-1 pt-2 border-t border-slate-900/60">
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">Distress state</span>
                            <span className={`font-bold ${person.distress ? "text-red-400" : "text-emerald-400"}`}>
                              {person.distress ? "Active" : "Normal"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">Coordinates (BBox)</span>
                            <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
                              <BsBoundingBox className="text-[10px]" /> [{person.bbox?.map((c: number) => Math.round(c)).join(", ")}]
                            </span>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="glass-panel p-8 rounded-xl border border-slate-900 text-xs text-slate-500 italic text-center">
                    No targets detected in current file scan.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Expandable raw JSON Inspector */}
      <AnimatePresence>
        {statusStage === "completed" && results && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-xl border border-slate-900 overflow-hidden"
          >
            {/* Header button */}
            <button
              onClick={() => setExpandedJson(!expandedJson)}
              className="w-full px-4 py-3 bg-slate-900/30 hover:bg-slate-900/50 flex justify-between items-center text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <span className="uppercase tracking-wider">Raw JSON Diagnostics</span>
              {expandedJson ? <FiChevronUp className="text-sm" /> : <FiChevronDown className="text-sm" />}
            </button>

            {/* Expanded panel drawer */}
            {expandedJson && (
              <div className="p-4 border-t border-slate-900 flex flex-col gap-3">
                <div className="flex justify-end gap-2 border-b border-slate-900 pb-3">
                  <button
                    onClick={copyJsonToClipboard}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 text-white rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    <FiClipboard /> Copy JSON
                  </button>
                  <button
                    onClick={downloadJson}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 text-white rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    <FiDownload /> Download JSON
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto rounded bg-slate-950 p-4 border border-slate-900">
                  <pre className="text-[10px] font-mono text-cyan-400 select-text leading-relaxed">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default UploadVideo;
