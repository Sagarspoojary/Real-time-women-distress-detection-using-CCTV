import React, { useState, useEffect } from "react";
import ReportCard from "../../components/report/ReportCard";
import type { ReportData } from "../../components/report/ReportCard";
import ReportViewer from "../../components/report/ReportViewer";
import { 
  FiSearch, 
  FiFileText, 
  FiRefreshCw 
} from "react-icons/fi";

const DetectionResults: React.FC = () => {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const loadReports = () => {
    try {
      const logs = JSON.parse(localStorage.getItem("distress_ai_history") || "[]");
      
      const mapped: ReportData[] = logs.map((item: any) => {
        const isAnomaly = 
          item.model1?.prediction?.toLowerCase() === "violence" || 
          item.model1?.prediction?.toLowerCase() === "assault" || 
          item.status?.toLowerCase() === "distress detected";

        const severity = isAnomaly ? "Critical" : "Low";
        const status = isAnomaly ? "Pending" : "Approved";
        
        // Approximate KB size based on payload length
        const sizeKB = Number((JSON.stringify(item).length / 1024).toFixed(2));

        return {
          id: `REP_${item.id.slice(-6)}`,
          incidentId: item.id,
          videoName: item.videoName,
          timestamp: item.timestamp,
          severity,
          status,
          sizeKB,
          modelData: item
        };
      });

      setReports(mapped);
      
      if (mapped.length > 0) {
        setSelectedId(mapped[0].id);
      }
    } catch (err) {
      console.error("Failed to compile diagnostic reports logs", err);
    }
  };

  // Initial load
  useEffect(() => {
    loadReports();
  }, []);

  const handleRefresh = () => {
    loadReports();
  };

  // Filter logic
  const filteredReports = reports.filter((rep) => {
    const query = searchQuery.toLowerCase();
    const matchesQuery = 
      rep.videoName.toLowerCase().includes(query) ||
      rep.id.toLowerCase().includes(query) ||
      rep.incidentId.includes(query);

    if (!matchesQuery) return false;

    if (severityFilter !== "all" && rep.severity.toLowerCase() !== severityFilter) return false;

    if (dateFilter !== "all") {
      const date = new Date(rep.timestamp);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (dateFilter === "today" && diffDays > 1) return false;
      if (dateFilter === "week" && diffDays > 7) return false;
      if (dateFilter === "month" && diffDays > 30) return false;
    }

    return true;
  });

  const selectedReport = reports.find((x) => x.id === selectedId);

  return (
    <div className="space-y-6 select-none pb-12 text-xs">
      
      {/* 1. Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FiFileText className="text-cyan-400" /> Evidence & Report Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Access certified digital evidence, inspect hashes, and compile official case files.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer uppercase tracking-wider"
        >
          <FiRefreshCw /> Refresh Data
        </button>
      </div>

      {reports.length === 0 ? (
        /* Empty State */
        <div className="glass-panel p-12 rounded-2xl border border-slate-900 text-center flex flex-col items-center justify-center gap-3 py-16">
          <div className="p-4 bg-slate-900 border border-slate-800 text-slate-600 rounded-3xl mb-2">
            <FiFileText className="text-4xl text-cyan-400" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider">No Reports Available</h3>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            AI analytics logs are empty. Scan surveillance feeds to compile digital evidence reports.
          </p>
        </div>
      ) : (
        /* Reports Grid Layout */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left panel: list of Report cards */}
          <div className="lg:col-span-1 space-y-4">
            
            {/* Search and Filters */}
            <div className="glass-panel p-4 rounded-xl border border-slate-900 space-y-3">
              <div className="relative">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  type="text"
                  placeholder="Search report IDs, names..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-lg glass-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="px-3 py-1.5 text-[11px] rounded-lg glass-input font-bold text-slate-400 cursor-pointer"
                >
                  <option value="all">All Severity</option>
                  <option value="critical">Critical Risk</option>
                  <option value="low">Low Risk</option>
                </select>

                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-1.5 text-[11px] rounded-lg glass-input font-bold text-slate-400 cursor-pointer"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
              {filteredReports.length === 0 ? (
                <div className="glass-panel p-8 text-center text-xs text-slate-500 italic border border-slate-900 rounded-xl font-semibold">
                  No matching reports.
                </div>
              ) : (
                filteredReports.map((rep) => (
                  <ReportCard
                    key={rep.id}
                    report={rep}
                    active={selectedId === rep.id}
                    onClick={() => setSelectedId(rep.id)}
                  />
                ))
              )}
            </div>

          </div>

          {/* Right panel: selected Report details */}
          <div className="lg:col-span-2 space-y-4">
            {selectedReport ? (
              <div className="glass-panel p-6 rounded-2xl border border-slate-900">
                <ReportViewer report={selectedReport} />
              </div>
            ) : (
              <div className="glass-panel p-12 text-center text-xs text-slate-500 italic border border-slate-900 rounded-2xl py-24">
                Select a report file card from the left panel to open details.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default DetectionResults;
