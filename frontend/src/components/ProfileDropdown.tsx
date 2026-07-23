import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FiUser, FiSettings, FiLogOut, FiShield } from "react-icons/fi";

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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

  const handleLogout = async () => {
    onClose();
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const displayName = user?.displayName || "Operator";
  const userEmail = user?.email || "operator@security.ai";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.2 }}
          className="absolute right-0 mt-3 w-56 glass-panel border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden"
        >
          {/* User Details */}
          <div className="px-4 py-3 bg-slate-900/30 border-b border-slate-800/80">
            <h4 className="font-bold text-sm text-white truncate">{displayName}</h4>
            <span className="text-[10px] text-slate-400 truncate block mt-0.5">{userEmail}</span>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-[9px] font-bold text-cyan-400 uppercase tracking-widest">
              <FiShield /> SEC CLEARANCE L1
            </div>
          </div>

          {/* Links */}
          <div className="p-1.5 divide-y divide-slate-900/85">
            <div className="py-1">
              <Link
                to="/dashboard/profile"
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-950/30 transition-all"
              >
                <FiUser className="text-slate-400 text-sm" /> Operator Profile
              </Link>
              <Link
                to="/dashboard/settings"
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-950/30 transition-all"
              >
                <FiSettings className="text-slate-400 text-sm" /> Terminal Settings
              </Link>
            </div>
            
            <div className="pt-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all text-left"
              >
                <FiLogOut className="text-red-400 text-sm" /> Terminate Session
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProfileDropdown;
