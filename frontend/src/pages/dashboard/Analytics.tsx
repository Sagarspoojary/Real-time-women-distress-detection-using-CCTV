import React, { useState, useEffect } from "react";
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { FiTrendingUp, FiAlertCircle, FiShield, FiVideo, FiFilter } from "react-icons/fi";
import { BiLoaderAlt } from "react-icons/bi";

interface HistoryItem {
  id: string;
  videoName: string;
  timestamp: string;
  model1?: { prediction: string; confidence: number };
  model2?: { prediction: string; confidence: number };
  status?: string;
}

const COLORS = {
  Normal: "#10b981", // emerald-500
  Violence: "#ef4444", // red-500
  Assault: "#f97316", // orange-500
  Distress: "#eab308", // yellow-500
  Other: "#64748b" // slate-500
};

const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<HistoryItem[]>([]);
  const [timeFilter, setTimeFilter] = useState<"all" | "week" | "month">("all");

  useEffect(() => {
    try {
      const logs = JSON.parse(localStorage.getItem("distress_ai_history") || "[]");
      setIncidents(logs);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load history for analytics", err);
      setError("Failed to load analytics data.");
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <BiLoaderAlt className="animate-spin text-4xl text-cyan-500 mb-4" />
        <p className="text-slate-400">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <FiAlertCircle className="text-5xl text-red-500 mb-4" />
        <p className="text-slate-300">{error}</p>
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] bg-slate-900/50 rounded-2xl border border-slate-800">
        <FiTrendingUp className="text-5xl text-slate-600 mb-4" />
        <h2 className="text-xl font-bold text-slate-300">No incidents recorded yet.</h2>
        <p className="text-slate-500 mt-2">Analytics will appear here once the AI detects activity.</p>
      </div>
    );
  }

  // Filter incidents based on time selection
  const now = new Date();
  const filteredIncidents = incidents.filter(inc => {
    if (timeFilter === "all") return true;
    const incDate = new Date(inc.timestamp);
    const diffDays = (now.getTime() - incDate.getTime()) / (1000 * 3600 * 24);
    if (timeFilter === "week") return diffDays <= 7;
    if (timeFilter === "month") return diffDays <= 30;
    return true;
  });

  // Calculate Metrics
  const totalIncidents = filteredIncidents.length;
  let violenceCount = 0;
  let assaultCount = 0;
  let distressCount = 0;
  let normalCount = 0;

  filteredIncidents.forEach(inc => {
    const pred1 = inc.model1?.prediction?.toLowerCase();
    const status = inc.status?.toLowerCase();
    
    if (pred1 === "violence") violenceCount++;
    else if (pred1 === "assault") assaultCount++;
    else if (status === "distress detected" || pred1 === "distress") distressCount++;
    else normalCount++;
  });

  const criticalCount = violenceCount + assaultCount + distressCount;

  // Chart Data: Threat Types
  const threatTypeData = [
    { name: "Normal", value: normalCount, color: COLORS.Normal },
    { name: "Violence", value: violenceCount, color: COLORS.Violence },
    { name: "Assault", value: assaultCount, color: COLORS.Assault },
    { name: "Distress", value: distressCount, color: COLORS.Distress }
  ].filter(item => item.value > 0);

  // Chart Data: Daily Trends
  const trendMap = new Map<string, { date: string, Total: number, Critical: number }>();
  filteredIncidents.forEach(inc => {
    const dateStr = new Date(inc.timestamp).toLocaleDateString();
    if (!trendMap.has(dateStr)) {
      trendMap.set(dateStr, { date: dateStr, Total: 0, Critical: 0 });
    }
    const entry = trendMap.get(dateStr)!;
    entry.Total += 1;
    
    const isCritical = 
      inc.model1?.prediction?.toLowerCase() === "violence" || 
      inc.model1?.prediction?.toLowerCase() === "assault" || 
      inc.status?.toLowerCase() === "distress detected";
    
    if (isCritical) entry.Critical += 1;
  });
  const trendData = Array.from(trendMap.values()).reverse(); // Older dates first

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">System Analytics</h1>
          <p className="text-slate-400 mt-1">Review historical detection metrics and incident trends.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
          <FiFilter className="text-slate-400 ml-2" />
          <select 
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="bg-transparent text-sm text-slate-200 border-none outline-none py-1.5 px-2 cursor-pointer"
          >
            <option value="all">All Time</option>
            <option value="month">Last 30 Days</option>
            <option value="week">Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-6 rounded-xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
            <FiVideo className="text-2xl" />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">Total Scans</p>
            <h3 className="text-2xl font-bold text-white">{totalIncidents}</h3>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <FiShield className="text-2xl" />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">Normal Behavior</p>
            <h3 className="text-2xl font-bold text-white">{normalCount}</h3>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl border border-red-500/30 flex items-center gap-4 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
            <FiAlertCircle className="text-2xl" />
          </div>
          <div>
            <p className="text-sm text-red-400 font-medium">Critical Incidents</p>
            <h3 className="text-2xl font-bold text-white">{criticalCount}</h3>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-col justify-center">
          <p className="text-sm text-slate-400 font-medium mb-2">Threat Breakdown</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-red-400">Violence: {violenceCount}</span>
            <span className="text-orange-400">Assault: {assaultCount}</span>
            <span className="text-yellow-400">Distress: {distressCount}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Trend Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-xl border border-slate-800 h-[400px] flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-6">Incident Trend</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend />
                <Line type="monotone" dataKey="Total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Critical" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 h-[400px] flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-2">Threat Distribution</h3>
          <div className="flex-1 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={threatTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {threatTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Incidents Table */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Critical Incidents</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date / Time</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Source</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Prediction</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Confidence</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredIncidents
                .filter(inc => 
                  inc.model1?.prediction?.toLowerCase() === "violence" || 
                  inc.model1?.prediction?.toLowerCase() === "assault" || 
                  inc.status?.toLowerCase() === "distress detected"
                )
                .slice(0, 5)
                .map((inc, i) => {
                  const date = new Date(inc.timestamp);
                  const pred = inc.model1?.prediction || "Distress";
                  
                  return (
                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-sm text-slate-300">
                        {date.toLocaleDateString()} <span className="text-slate-500 ml-1">{date.toLocaleTimeString()}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300 font-mono truncate max-w-[150px]">
                        {inc.videoName || "Live Camera"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700">
                          {pred}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300">
                        {inc.model1?.confidence ? `${inc.model1.confidence}%` : "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          Critical
                        </span>
                      </td>
                    </tr>
                  );
                })}
              
              {filteredIncidents.filter(inc => 
                  inc.model1?.prediction?.toLowerCase() === "violence" || 
                  inc.model1?.prediction?.toLowerCase() === "assault" || 
                  inc.status?.toLowerCase() === "distress detected"
                ).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                    No critical incidents in the selected time period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
