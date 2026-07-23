import React, { useState, useEffect } from "react";
import IncidentCard from "../../components/incident/IncidentCard";
import type { IncidentData } from "../../components/incident/IncidentCard";
import IncidentDetails from "../../components/incident/IncidentDetails";
import toast from "react-hot-toast";
import { 
  FiSearch, 
  FiCheckCircle, 
  FiBell, 
  FiAlertOctagon,
  FiX
} from "react-icons/fi";

const Notifications: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Search & Filter conditions
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");

  // Load incidents from local history + read status dictionary
  useEffect(() => {
    try {
      const logs = JSON.parse(localStorage.getItem("distress_ai_history") || "[]");
      const readStatuses = JSON.parse(localStorage.getItem("distress_ai_read_status") || "{}");

      const mapped: IncidentData[] = logs.map((item: any) => {
        const isAnomaly = 
          item.model1?.prediction?.toLowerCase() === "violence" || 
          item.model1?.prediction?.toLowerCase() === "assault" || 
          item.status?.toLowerCase() === "distress detected";

        const severity = isAnomaly ? "Critical" : "Low";
        const status = isAnomaly ? "Active" : "Resolved";
        const desc = isAnomaly 
          ? `Spatio-temporal classifier triggered: Anomaly predicted with ${(item.model1?.confidence || 0)}% confidence.`
          : "Surveillance scanning completed. Bounding box tracks registered clear.";

        return {
          id: item.id,
          videoName: item.videoName,
          timestamp: item.timestamp,
          severity,
          status,
          desc,
          unread: readStatuses[item.id] === undefined ? true : readStatuses[item.id],
          modelData: item
        };
      });

      setIncidents(mapped);

      // Default select the first incident
      if (mapped.length > 0) {
        setSelectedId(mapped[0].id);
      }
    } catch (err) {
      console.error("Failed to load incident status logs", err);
    }
  }, []);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    
    // Automatically mark as read on select
    setIncidents((prev) => 
      prev.map((inc) => {
        if (inc.id === id && inc.unread) {
          // Persist read status
          const readStatuses = JSON.parse(localStorage.getItem("distress_ai_read_status") || "{}");
          readStatuses[id] = false;
          localStorage.setItem("distress_ai_read_status", JSON.stringify(readStatuses));
          return { ...inc, unread: false };
        }
        return inc;
      })
    );
  };

  const handleMarkAllRead = () => {
    const readStatuses = JSON.parse(localStorage.getItem("distress_ai_read_status") || "{}");
    incidents.forEach((inc) => {
      readStatuses[inc.id] = false;
    });
    localStorage.setItem("distress_ai_read_status", JSON.stringify(readStatuses));

    setIncidents((prev) => prev.map((inc) => ({ ...inc, unread: false })));
    toast.success("All alerts marked as read.");
  };

  const handleDeleteNotification = (id: string) => {
    try {
      // 1. Remove from history logs
      const logs = JSON.parse(localStorage.getItem("distress_ai_history") || "[]");
      const updatedLogs = logs.filter((x: any) => x.id !== id);
      localStorage.setItem("distress_ai_history", JSON.stringify(updatedLogs));

      // 2. Remove from read status
      const readStatuses = JSON.parse(localStorage.getItem("distress_ai_read_status") || "{}");
      delete readStatuses[id];
      localStorage.setItem("distress_ai_read_status", JSON.stringify(readStatuses));

      // Update state
      const updatedIncidents = incidents.filter((x) => x.id !== id);
      setIncidents(updatedIncidents);

      if (selectedId === id) {
        setSelectedId(updatedIncidents.length > 0 ? updatedIncidents[0].id : null);
      }
      toast.success("Incident record purged.");
    } catch (err) {
      toast.error("Failed to purge incident log.");
    }
  };

  // Filter criteria logic
  const filteredIncidents = incidents.filter((inc) => {
    const query = searchQuery.toLowerCase();
    const matchesQuery = 
      inc.videoName.toLowerCase().includes(query) ||
      inc.desc.toLowerCase().includes(query) ||
      inc.id.includes(query);

    if (!matchesQuery) return false;

    if (severityFilter !== "all" && inc.severity.toLowerCase() !== severityFilter) return false;

    if (readFilter === "unread" && !inc.unread) return false;
    if (readFilter === "read" && inc.unread) return false;

    return true;
  });

  const selectedIncident = incidents.find((x) => x.id === selectedId);

  // Check if any unread critical anomalies exist to display the persistent banner
  const hasUnreadCritical = incidents.some((inc) => inc.unread && (inc.severity === "Critical" || inc.severity === "Emergency"));

  const unreadCount = incidents.filter((x) => x.unread).length;

  return (
    <div className="space-y-6 select-none pb-12">
      
      {/* Persistent warning alert banner */}
      {hasUnreadCritical && (
        <div className="bg-red-950/40 border border-red-500/25 p-4 rounded-xl flex gap-3 items-center justify-between shadow-lg shadow-red-950/20 animate-pulse text-red-200 text-xs">
          <div className="flex items-center gap-2">
            <FiAlertOctagon className="text-red-400 text-lg" />
            <div>
              <h5 className="font-extrabold uppercase tracking-wider">CRITICAL INCIDENT DETECTED</h5>
              <p className="text-[10px] text-red-300/80 mt-0.5 leading-relaxed">
                Violence or physical distress alert currently unresolved in the inspection pipeline. Mark alerts as read to clear the warn banner.
              </p>
            </div>
          </div>
          <button
            onClick={handleMarkAllRead}
            className="px-3 py-1 bg-red-650 hover:bg-red-550 text-white font-bold rounded uppercase tracking-wider cursor-pointer text-[10px]"
          >
            Mark All Read
          </button>
        </div>
      )}

      {/* Main header block */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FiBell className="text-cyan-400" /> Security Operations Center (SOC)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review threat dispatches, active warnings, and coordinate dispatches.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer uppercase tracking-wider"
          >
            <FiCheckCircle /> Mark all read
          </button>
        )}
      </div>

      {incidents.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-900 text-center flex flex-col items-center justify-center gap-3 py-16">
          <div className="p-4 bg-slate-900 border border-slate-800 text-slate-600 rounded-3xl mb-2">
            <FiBell className="text-4xl text-cyan-400" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider">No Notifications</h3>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            FastAPI threat scanners are clean. No anomalous incident dispatches compiled.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT PANEL: Incident lists */}
          <div className="lg:col-span-1 space-y-4">
            
            {/* Search & Filter cards */}
            <div className="glass-panel p-4 rounded-xl border border-slate-900 space-y-3">
              {/* Search */}
              <div className="relative">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  type="text"
                  placeholder="Search dispatches..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-lg glass-input"
                />
              </div>

              {/* Filters */}
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
                  value={readFilter}
                  onChange={(e: any) => setReadFilter(e.target.value)}
                  className="px-3 py-1.5 text-[11px] rounded-lg glass-input font-bold text-slate-400 cursor-pointer"
                >
                  <option value="all">All Alerts</option>
                  <option value="unread">Unread Only</option>
                  <option value="read">Read Only</option>
                </select>
              </div>
            </div>

            {/* Scrolling list */}
            <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
              {filteredIncidents.length === 0 ? (
                <div className="glass-panel p-8 text-center text-xs text-slate-500 italic border border-slate-900 rounded-xl">
                  No matching dispatches.
                </div>
              ) : (
                filteredIncidents.map((inc) => (
                  <div key={inc.id} className="relative group">
                    <IncidentCard
                      incident={inc}
                      active={selectedId === inc.id}
                      onClick={() => handleSelect(inc.id)}
                    />
                    
                    {/* Delete overlay button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(inc.id);
                      }}
                      className="absolute top-3 right-3 p-1 rounded bg-slate-900 border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                      title="Purge Incident Log"
                    >
                      <FiX className="text-[10px]" />
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>

          {/* RIGHT PANEL: Selected Details inspection */}
          <div className="lg:col-span-2 space-y-4">
            {selectedIncident ? (
              <div className="glass-panel p-6 rounded-2xl border border-slate-900 space-y-6">
                
                {/* Details Header */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-900/60">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-tight">
                      {selectedIncident.videoName}
                    </h3>
                    <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                      REPORT TIME: {new Date(selectedIncident.timestamp).toLocaleString()}
                    </span>
                  </div>
                  
                  <span className={`px-2.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-widest ${
                    selectedIncident.severity === "Critical"
                      ? "bg-red-500/20 text-red-400 border-red-500/35"
                      : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                  }`}>
                    {selectedIncident.severity}
                  </span>
                </div>

                <IncidentDetails incident={selectedIncident} />

              </div>
            ) : (
              <div className="glass-panel p-12 text-center text-xs text-slate-500 italic border border-slate-900 rounded-2xl py-24">
                Select an incident dispatch card from the left panel to review surveillance metrics.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default Notifications;
