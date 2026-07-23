import React, { useState } from "react";
import { FiClipboard, FiDownload, FiSearch } from "react-icons/fi";
import toast from "react-hot-toast";

interface HistoryJsonViewerProps {
  data: any;
}

const HistoryJsonViewer: React.FC<HistoryJsonViewerProps> = ({ data }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const jsonString = JSON.stringify(data, null, 2);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonString);
    toast.success("JSON copied to clipboard!");
  };

  const downloadJson = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analysis_json_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("JSON download initiated.");
  };

  // Helper to highlight matching query text in the printed JSON string
  const renderHighlightedJson = () => {
    if (!searchQuery) {
      return <code className="text-cyan-400 font-mono text-[10px] select-text">{jsonString}</code>;
    }

    const parts = jsonString.split(new RegExp(`(${searchQuery})`, "gi"));
    return (
      <code className="font-mono text-[10px] select-text">
        {parts.map((part, index) =>
          part.toLowerCase() === searchQuery.toLowerCase() ? (
            <span key={index} className="bg-amber-400 text-slate-950 font-bold px-0.5 rounded">
              {part}
            </span>
          ) : (
            <span key={index} className="text-cyan-400">{part}</span>
          )
        )}
      </code>
    );
  };

  return (
    <div className="flex flex-col gap-3 w-full select-none">
      
      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 pb-3">
        {/* Search bar inside JSON */}
        <div className="relative max-w-xs w-full">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
          <input
            type="text"
            placeholder="Search key, value, coordinates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-4 py-1 text-[11px] rounded bg-slate-950 border border-slate-900 focus:border-slate-800 text-slate-100 font-semibold focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer"
          >
            <FiClipboard /> Copy
          </button>
          <button
            onClick={downloadJson}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer"
          >
            <FiDownload /> Download
          </button>
        </div>
      </div>

      {/* Code print block */}
      <div className="max-h-72 overflow-y-auto rounded bg-slate-950 p-4 border border-slate-900/60">
        <pre className="whitespace-pre-wrap break-all leading-relaxed">
          {renderHighlightedJson()}
        </pre>
      </div>

    </div>
  );
};

export default HistoryJsonViewer;
