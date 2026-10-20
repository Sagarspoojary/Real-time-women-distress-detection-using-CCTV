import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  fetchOutputs, 
  deleteOutputFile, 
  API_BASE_URL 
} from "../../services/api";
import type { 
  OutputItem, 
  OutputsResponse 
} from "../../services/api";
import { 
  FiImage, 
  FiFilm, 
  FiUser, 
  FiLayers, 
  FiSearch, 
  FiRefreshCw, 
  FiDownload, 
  FiTrash2, 
  FiMaximize2, 
  FiX, 
  FiPlay, 
  FiCalendar, 
  FiAlertCircle
} from "react-icons/fi";
import toast from "react-hot-toast";

type CategoryTab = "all" | "whole_images" | "triggered_clips" | "debug_gender";

const OutputsGallery: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<OutputsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<CategoryTab>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<OutputItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<OutputItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Load outputs from API
  const loadOutputs = async (showToast = false) => {
    try {
      setLoading(true);
      const res = await fetchOutputs();
      setData(res);
      if (showToast) {
        toast.success("Outputs vault refreshed!", { id: "outputs-refresh" });
      }
    } catch (err: any) {
      console.error("Failed to load outputs:", err);
      toast.error("Could not fetch outputs vault", { id: "outputs-err" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOutputs();
  }, []);

  // Consolidate items based on selected tab
  const tabItems = useMemo(() => {
    if (!data) return [];
    if (activeTab === "whole_images") return data.data.whole_images;
    if (activeTab === "triggered_clips") return data.data.triggered_clips;
    if (activeTab === "debug_gender") return data.data.debug_gender;
    return [
      ...data.data.whole_images,
      ...data.data.triggered_clips,
      ...data.data.debug_gender,
    ].sort((a, b) => b.timestamp - a.timestamp);
  }, [data, activeTab]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return tabItems;
    const query = searchQuery.toLowerCase();
    return tabItems.filter((item) => {
      const matchName = item.filename.toLowerCase().includes(query);
      const matchGender = item.gender?.toLowerCase().includes(query);
      const matchTrack = item.track_id !== undefined && `track ${item.track_id}`.toLowerCase().includes(query);
      return matchName || matchGender || matchTrack;
    });
  }, [tabItems, searchQuery]);

  // Handle file deletion
  const handleDelete = async (item: OutputItem) => {
    setIsDeleting(true);
    try {
      let relativePath = item.filename;
      if (item.category === "triggered_clips") {
        relativePath = `triggered_clips/${item.filename}`;
      } else if (item.category === "debug_gender") {
        relativePath = `debug_gender/${item.filename}`;
      }
      await deleteOutputFile(relativePath);
      toast.success(`Deleted ${item.filename}`);
      setDeleteConfirm(null);
      if (selectedItem?.filename === item.filename) {
        setSelectedItem(null);
      }
      await loadOutputs();
    } catch (err: any) {
      toast.error(`Delete failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const getMediaUrl = (item: OutputItem) => {
    if (item.url.startsWith("http")) return item.url;
    return `${API_BASE_URL}${item.url}`;
  };

  // Lightbox keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedItem) return;
      if (e.key === "Escape") {
        setSelectedItem(null);
      } else if (e.key === "ArrowRight") {
        const idx = filteredItems.findIndex(i => i.filename === selectedItem.filename);
        if (idx !== -1 && idx < filteredItems.length - 1) {
          setSelectedItem(filteredItems[idx + 1]);
        }
      } else if (e.key === "ArrowLeft") {
        const idx = filteredItems.findIndex(i => i.filename === selectedItem.filename);
        if (idx > 0) {
          setSelectedItem(filteredItems[idx - 1]);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItem, filteredItems]);

  const counts = data?.counts || { whole_images: 0, triggered_clips: 0, debug_gender: 0, total: 0 };

  return (
    <div className="space-y-4">
      {/* ── Section Header ── */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-900 bg-gradient-to-r from-slate-950 via-slate-900/60 to-slate-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 rounded-lg">
              <FiLayers className="text-base" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
                Surveillance Outputs Vault
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                  {counts.total} Files
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Inspect whole alert snapshots, recorded triggered video clips, and debug gender face/body crops.
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Search & Refresh */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-grow md:w-60">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name, gender, track..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all font-sans"
            />
          </div>

          <button
            onClick={() => loadOutputs(true)}
            disabled={loading}
            title="Refresh Outputs"
            className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-50 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer flex-shrink-0"
          >
            <FiRefreshCw className={`text-xs ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Category Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-900/80 pb-2 overflow-x-auto no-scrollbar">
        {[
          { key: "all", label: "All Outputs", count: counts.total, icon: <FiLayers /> },
          { key: "whole_images", label: "Whole Images (Snapshots)", count: counts.whole_images, icon: <FiImage /> },
          { key: "triggered_clips", label: "Triggered Clips", count: counts.triggered_clips, icon: <FiFilm /> },
          { key: "debug_gender", label: "Debug Gender Crops", count: counts.debug_gender, icon: <FiUser /> },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as CategoryTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-cyan-950/50 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent"
              }`}
            >
              <span className={`text-sm ${isActive ? "text-cyan-400" : "text-slate-500"}`}>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                isActive ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-800 text-slate-400"
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Gallery Content Area ── */}
      {loading && !data ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-900 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Scanning outputs vault...
          </span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-900 flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-500 mb-3">
            <FiLayers className="text-2xl" />
          </div>
          <h4 className="text-sm font-bold text-slate-200">No output files found</h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            {searchQuery 
              ? `No outputs match search query '${searchQuery}'. Try another keyword.`
              : "No media recorded in this directory yet. Triggers and surveillance scans will automatically populate this vault."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {filteredItems.map((item) => (
              <motion.div
                key={item.filename}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="group relative glass-panel rounded-xl border border-slate-900 hover:border-cyan-500/40 bg-slate-950/70 overflow-hidden flex flex-col transition-all shadow-md hover:shadow-cyan-500/5"
              >
                {/* Media Preview Container */}
                <div 
                  className="relative aspect-video bg-black flex items-center justify-center overflow-hidden cursor-pointer select-none"
                  onClick={() => setSelectedItem(item)}
                >
                  {item.type === "video" ? (
                    <>
                      <video
                        src={getMediaUrl(item)}
                        preload="metadata"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        muted
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-cyan-500/80 group-hover:bg-cyan-400 group-hover:scale-110 text-slate-950 flex items-center justify-center transition-all shadow-lg shadow-cyan-500/30">
                          <FiPlay className="ml-0.5 text-base" />
                        </div>
                      </div>
                      <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 border border-white/10 text-[9px] font-mono font-bold text-white uppercase flex items-center gap-1">
                        <FiFilm className="text-cyan-400" /> MP4 Video
                      </span>
                    </>
                  ) : (
                    <>
                      <img
                        src={getMediaUrl(item)}
                        alt={item.filename}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="p-2 rounded-full bg-slate-900/80 border border-slate-700 text-cyan-400">
                          <FiMaximize2 className="text-sm" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Category Pill Tag */}
                  <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider backdrop-blur-md ${
                    item.category === "whole_images"
                      ? "bg-cyan-950/80 text-cyan-300 border border-cyan-500/30"
                      : item.category === "triggered_clips"
                      ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                      : "bg-purple-950/80 text-purple-300 border border-purple-500/30"
                  }`}>
                    {item.category === "whole_images" ? "Snapshot" : item.category === "triggered_clips" ? "Triggered Clip" : "Gender Crop"}
                  </span>

                  {/* Size Pill */}
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 border border-white/10 text-[9px] font-mono text-slate-300">
                    {item.size_formatted}
                  </span>
                </div>

                {/* Card Meta Content */}
                <div className="p-3 flex flex-col justify-between flex-grow gap-2">
                  <div>
                    <h4 
                      className="text-xs font-bold text-slate-100 truncate hover:text-cyan-400 transition-colors cursor-pointer"
                      title={item.filename}
                      onClick={() => setSelectedItem(item)}
                    >
                      {item.filename}
                    </h4>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {item.category === "debug_gender" && (
                        <>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            item.gender === "Female"
                              ? "bg-pink-500/10 text-pink-400 border border-pink-500/20"
                              : item.gender === "Male"
                              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}>
                            {item.gender} {item.confidence ? `${Math.round(item.confidence * 100)}%` : ""}
                          </span>
                          {item.track_id !== undefined && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] font-mono text-slate-400">
                              Track #{item.track_id}
                            </span>
                          )}
                          {item.cached && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[8px] font-bold text-amber-400 uppercase">
                              Cached
                            </span>
                          )}
                        </>
                      )}

                      {item.category === "whole_images" && (
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <FiCalendar className="text-slate-500 text-[9px]" />
                          {item.created_at}
                        </span>
                      )}

                      {item.category === "triggered_clips" && (
                        <span className="text-[10px] text-amber-400 font-mono font-bold">
                          Automated Event Trigger
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-xs">
                    <span className="text-[9px] font-mono text-slate-500 truncate">
                      {item.created_at.split(" ")[1]}
                    </span>

                    <div className="flex items-center gap-1">
                      <a
                        href={getMediaUrl(item)}
                        download={item.filename}
                        title="Download File"
                        className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FiDownload className="text-xs" />
                      </a>
                      <button
                        title="Delete File"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(item);
                        }}
                        className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-red-950/40 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all cursor-pointer"
                      >
                        <FiTrash2 className="text-xs" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Lightbox / Media Viewer Modal ── */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Top Bar */}
              <div className="p-4 border-b border-slate-900 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                    selectedItem.category === "whole_images"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : selectedItem.category === "triggered_clips"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  }`}>
                    {selectedItem.category.replace("_", " ")}
                  </span>
                  <h3 className="font-bold text-xs text-white truncate max-w-md font-mono">
                    {selectedItem.filename}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={getMediaUrl(selectedItem)}
                    download={selectedItem.filename}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white text-xs font-semibold rounded-lg transition-all"
                  >
                    <FiDownload className="text-xs" /> Download
                  </a>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"
                  >
                    <FiX className="text-base" />
                  </button>
                </div>
              </div>

              {/* Modal Media Body */}
              <div className="relative flex-grow bg-black flex items-center justify-center p-2 min-h-[360px] max-h-[60vh] overflow-hidden">
                {selectedItem.type === "video" ? (
                  <video
                    src={getMediaUrl(selectedItem)}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-full max-w-full rounded-lg"
                  />
                ) : (
                  <img
                    src={getMediaUrl(selectedItem)}
                    alt={selectedItem.filename}
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                )}
              </div>

              {/* Modal Metadata Footer */}
              <div className="p-4 bg-slate-900/60 border-t border-slate-900 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Size</span>
                  <span className="font-mono text-white font-bold">{selectedItem.size_formatted}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Captured At</span>
                  <span className="font-mono text-white font-bold">{selectedItem.created_at}</span>
                </div>
                {selectedItem.gender && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Gender Output</span>
                    <span className={`font-bold ${
                      selectedItem.gender === "Female" ? "text-pink-400" : "text-indigo-400"
                    }`}>
                      {selectedItem.gender} ({Math.round((selectedItem.confidence || 0) * 100)}%)
                    </span>
                  </div>
                )}
                {selectedItem.track_id !== undefined && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">ByteTrack Entity</span>
                    <span className="font-mono text-cyan-400 font-bold">Track #{selectedItem.track_id} (Frame {selectedItem.frame_number})</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-950 border border-red-500/30 rounded-2xl p-6 shadow-2xl flex flex-col gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-950/60 border border-red-500/30 text-red-400 rounded-xl">
                  <FiAlertCircle className="text-xl" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Permanently Delete Evidence?</h3>
                  <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone.</p>
                </div>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 truncate">
                {deleteConfirm.filename}
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-red-600/20"
                >
                  <FiTrash2 className="text-xs" />
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OutputsGallery;
