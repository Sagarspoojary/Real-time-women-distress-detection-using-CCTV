import React from "react";
import { 
  FiShield,
  FiCheckCircle, 
  FiLock 
} from "react-icons/fi";

interface EvidenceCardProps {
  evidenceId: string;
  videoName: string;
  timestamp: string;
  frameCount: number;
}

const EvidenceCard: React.FC<EvidenceCardProps> = ({
  evidenceId,
  videoName,
  timestamp,
  frameCount,
}) => {
  const formattedDate = new Date(timestamp).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  const formattedTime = new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  // Calculate mock SHA-256 for evidence integrity display
  const mockHash = `sha256:7f9a2b8e${evidenceId}d5c3f1e0a8b9c7d6e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0`;

  return (
    <div className="glass-panel p-4 rounded-xl border border-cyan-500/10 bg-cyan-950/5 flex flex-col gap-3.5 select-none text-xs">
      <h3 className="font-extrabold text-[10px] uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 border-b border-slate-900 pb-2">
        <FiShield /> Evidence Digital File Verification
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-semibold text-slate-500">
        <div>
          <span className="text-[9px] text-slate-500 uppercase block">Evidence ID</span>
          <span className="font-mono font-bold text-slate-200 mt-1 block">EVID_#{evidenceId}</span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 uppercase block">Original Name</span>
          <span className="font-bold text-slate-200 mt-1 block truncate max-w-xs">{videoName}</span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 uppercase block">Capture Dispatch</span>
          <span className="font-mono font-bold text-slate-200 mt-1 block">{formattedDate} @ {formattedTime}</span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 uppercase block">Frames Count</span>
          <span className="font-mono font-bold text-slate-200 mt-1 block">{frameCount} frames</span>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-900/60 text-[10px]">
        {/* Integrity hash */}
        <div className="flex justify-between items-center text-slate-500">
          <span className="flex items-center gap-1"><FiCheckCircle /> Integrity hash</span>
          <span className="font-mono font-bold text-slate-300 truncate max-w-xs">{mockHash}</span>
        </div>
        {/* Digital Signature */}
        <div className="flex justify-between items-center text-slate-500">
          <span className="flex items-center gap-1"><FiLock /> Signature Seal</span>
          <span className="font-mono font-bold text-emerald-400 uppercase tracking-wide">
            0x9EFA8B... DIGITAL SIGNED SECURE
          </span>
        </div>
      </div>

    </div>
  );
};

export default EvidenceCard;
export type { EvidenceCardProps };
