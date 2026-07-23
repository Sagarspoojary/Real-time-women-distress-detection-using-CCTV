import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AnalysisCard from "../../components/history/AnalysisCard";
import HistoryDetailModal from "../../components/history/HistoryDetailModal";
import DeleteConfirmationDialog from "../../components/history/DeleteConfirmationDialog";
import toast from "react-hot-toast";
import { 
  FiSearch, 
  FiFilter, 
  FiDownload, 
  FiPlay,
  FiFileText
} from "react-icons/fi";

interface HistoryItem {
  id: string;
  videoName: string;
  timestamp: string;
  model1?: { prediction: string; confidence: number };
  model2?: { prediction: string; confidence: number };
  model3?: { people_detected: number; frames_processed: number };
  persons?: any[];
  status?: string;
}

const History: React.FC = () => {
  const navigate = useNavigate();

  // Logs list state
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "week" | "month">("all");
  const [anomalyFilter, setAnomalyFilter] = useState<"all" | "violence" | "distress" | "normal">("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "people_desc" | "people_asc">("date_desc");

  // Selection states for Modals
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const [itemToDelete, setItemToDelete] = useState<HistoryItem | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    try {
      const logs = JSON.parse(localStorage.getItem("distress_ai_history") || "[]");
      setHistory(logs);
    } catch (err) {
      console.error("Failed to read storage history logs", err);
    }
  }, []);

  const handleInspect = (item: HistoryItem) => {
    setSelectedItem(item);
    setDetailModalOpen(true);
  };

  const handleDeleteRequest = (item: HistoryItem) => {
    setItemToDelete(item);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;

    try {
      const updated = history.filter((x) => x.id !== itemToDelete.id);
      localStorage.setItem("distress_ai_history", JSON.stringify(updated));
      setHistory(updated);
      toast.success("Analysis record deleted successfully!");
    } catch (err) {
      toast.error("Failed to delete record.");
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  // Client-side CSV compiler report downloader
  const exportHistoryToCSV = () => {
    if (history.length === 0) {
      toast.error("No analysis logs to compile reports.");
      return;
    }

    const headers = [
      "Record ID",
      "Video Name",
      "Timestamp",
      "Violence Prediction",
      "Violence Conf (%)",
      "Distress Prediction",
      "Distress Conf (%)",
      "Targets Tracked",
      "Total Frames",
      "General Status"
    ];

    const rows = history.map((item) => [
      item.id,
      `"${item.videoName.replace(/"/g, '""')}"`,
      item.timestamp,
      item.model1?.prediction || "Normal",
      item.model1?.confidence || 0,
      item.model2?.prediction || "N/A",
      item.model2?.confidence || 0,
      item.model3?.people_detected || 0,
      item.model3?.frames_processed || 0,
      item.status || "Completed"
    ]);

    const csvContent = 
      "data:text/csv;charset=utf-8," + 
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `surveillance_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV report downloaded!");
  };

  // Filter logs logic
  const filteredHistory = history.filter((item) => {
    // 1. Search Query filter (checks name, status, predictions, or track IDs)
    const query = searchQuery.toLowerCase();
    const matchesQuery = 
      item.videoName.toLowerCase().includes(query) ||
      (item.status && item.status.toLowerCase().includes(query)) ||
      (item.model1?.prediction && item.model1.prediction.toLowerCase().includes(query)) ||
      (item.model2?.prediction && item.model2.prediction.toLowerCase().includes(query)) ||
      (item.persons && item.persons.some((p) => String(p.track_id).includes(query)));

    if (!matchesQuery) return false;

    // 2. Timeframe Date filter
    if (dateFilter !== "all") {
      const date = new Date(item.timestamp);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (dateFilter === "today" && diffDays > 1) return false;
      if (dateFilter === "yesterday" && (diffDays <= 1 || diffDays > 2)) return false;
      if (dateFilter === "week" && diffDays > 7) return false;
      if (dateFilter === "month" && diffDays > 30) return false;
    }

    // 3. Anomaly Prediction filter
    if (anomalyFilter !== "all") {
      const isViolence = 
        item.model1?.prediction?.toLowerCase() === "violence" || 
        item.model1?.prediction?.toLowerCase() === "assault";
      const isDistress = 
        item.model2?.prediction?.toLowerCase() === "distress" || 
        item.model2?.prediction?.toLowerCase() === "sos" || 
        item.status?.toLowerCase() === "distress detected";

      if (anomalyFilter === "violence" && !isViolence) return false;
      if (anomalyFilter === "distress" && !isDistress) return false;
      if (anomalyFilter === "normal" && (isViolence || isDistress)) return false;
    }

    return true;
  }).sort((a, b) => {
    // 4. Sorting logic
    if (sortBy === "date_asc") {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    }
    if (sortBy === "people_desc") {
      return (b.model3?.people_detected || 0) - (a.model3?.people_detected || 0);
    }
    if (sortBy === "people_asc") {
      return (a.model3?.people_detected || 0) - (b.model3?.people_detected || 0);
    }
    // Default: date_desc (newest first)
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <div className="space-y-6 select-none pb-12">
      
      {/* 1. Header & Quick export buttons */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Inference Incident Archives</h1>
          <p className="text-xs text-slate-400 mt-1">Browse, filter, and inspect previous camera footage processing records.</p>
        </div>
        
        {history.length > 0 && (
          <button
            onClick={exportHistoryToCSV}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-cyan-500/10 cursor-pointer"
          >
            <FiDownload /> Export CSV Report
          </button>
        )}
      </div>

      {history.length === 0 ? (
        /* Empty State Illustration */
        <div className="glass-panel p-12 rounded-2xl border border-slate-900 text-center flex flex-col items-center justify-center gap-4 py-16">
          <div className="p-4 bg-slate-900 border border-slate-800 text-slate-500 rounded-3xl mb-2">
            <FiFileText className="text-4xl text-cyan-400" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider">No Analysis History Available</h3>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            There are currently no surveillance clips analyzed by the AI pipeline. Submit footage to compile diagnostics logs.
          </p>
          <button
            onClick={() => navigate("/dashboard/upload-video")}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 mt-2 cursor-pointer uppercase tracking-wider"
          >
            <FiPlay /> Analyze Your First Video
          </button>
        </div>
      ) : (
        /* Filters and Grid display */
        <div className="space-y-6">
          {/* Controls Bar: Search, Filters & Sorting */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
              <input
                type="text"
                placeholder="Search by file name, prediction tags, Track IDs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg glass-input"
              />
            </div>

            {/* Timeframe Date Filter */}
            <div className="relative">
              <FiFilter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
              <select
                value={dateFilter}
                onChange={(e: any) => setDateFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg glass-input appearance-none cursor-pointer font-semibold text-slate-300"
              >
                <option value="all">Timeframe: All logs</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>

            {/* Anomaly prediction Filter */}
            <div className="relative">
              <select
                value={anomalyFilter}
                onChange={(e: any) => setAnomalyFilter(e.target.value)}
                className="w-full px-4 py-2 text-xs rounded-lg glass-input appearance-none cursor-pointer font-semibold text-slate-300"
              >
                <option value="all">Anomalies: All status</option>
                <option value="violence">Violence Cases Only</option>
                <option value="distress">Distress Cases Only</option>
                <option value="normal">Normal Clean Files</option>
              </select>
            </div>

            {/* Sorting Select (takes the last place or floats) */}
            <div className="relative md:col-start-4">
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 text-xs rounded-lg glass-input appearance-none cursor-pointer font-semibold text-slate-300"
              >
                <option value="date_desc">Sort: Newest First</option>
                <option value="date_asc">Sort: Oldest First</option>
                <option value="people_desc">Sort: High Targets Count</option>
                <option value="people_asc">Sort: Low Targets Count</option>
              </select>
            </div>

          </div>

          {/* Cards Grid */}
          {filteredHistory.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl border border-slate-900 text-center text-xs text-slate-500 italic">
              No matching records identified. Refine search parameters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHistory.map((item) => (
                <AnalysisCard
                  key={item.id}
                  item={item}
                  onInspect={handleInspect}
                  onDeleteRequest={handleDeleteRequest}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Inspection Detail modal Drawer */}
      <HistoryDetailModal
        isOpen={detailModalOpen}
        item={selectedItem}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedItem(null);
        }}
      />

      {/* 5. Warning confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteModalOpen}
        videoName={itemToDelete?.videoName || ""}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
      />

    </div>
  );
};

export default History;
