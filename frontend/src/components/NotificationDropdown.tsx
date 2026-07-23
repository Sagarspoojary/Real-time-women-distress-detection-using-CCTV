import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { FiBell, FiAlertCircle, FiCheckCircle } from "react-icons/fi";

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const mockNotifications = [
  { id: 1, type: "danger", title: "Assault Anomaly Detected", desc: "Camera Feed 04 - Sector B", time: "2m ago" },
  { id: 2, type: "warning", title: "Camera Offline Warning", desc: "Camera Feed 12 - Parking Exit", time: "15m ago" },
  { id: 3, type: "info", title: "Model Config Update", desc: "Confidence threshold set to 55%", time: "1h ago" }
];

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.2 }}
          className="absolute right-0 mt-3 w-80 glass-panel border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-900/30 flex justify-between items-center">
            <h4 className="font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2">
              <FiBell className="text-cyan-400" /> Notifications
            </h4>
            <button className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase transition-colors">
              Clear All
            </button>
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-900/85">
            {mockNotifications.map((notif) => (
              <div key={notif.id} className="p-4 hover:bg-slate-950/30 transition-all flex gap-3">
                <div className={`mt-0.5 p-1.5 rounded-lg border flex-shrink-0 ${
                  notif.type === "danger" 
                    ? "bg-red-950/20 border-red-500/20 text-red-400"
                    : notif.type === "warning"
                    ? "bg-amber-950/20 border-amber-500/20 text-amber-400"
                    : "bg-cyan-950/20 border-cyan-500/20 text-cyan-400"
                }`}>
                  {notif.type === "danger" ? <FiAlertCircle /> : notif.type === "warning" ? <FiAlertCircle /> : <FiCheckCircle />}
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <h5 className="text-xs font-bold text-slate-100">{notif.title}</h5>
                    <span className="text-[9px] font-semibold text-slate-500">{notif.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{notif.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer link */}
          <Link
            to="/dashboard/notifications"
            onClick={onClose}
            className="block text-center py-2 bg-slate-900/50 border-t border-slate-800 hover:bg-slate-900 text-[11px] font-bold text-slate-400 hover:text-white transition-colors"
          >
            Open Alerts Hub
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationDropdown;
