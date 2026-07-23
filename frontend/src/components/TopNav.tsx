import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useDashboard } from "../contexts/DashboardContext";
import NotificationDropdown from "./NotificationDropdown";
import ProfileDropdown from "./ProfileDropdown";
import ThemeToggle from "./ThemeToggle";
import { 
  FiSearch, 
  FiBell, 
  FiMenu, 
  FiSettings, 
  FiClock, 
  FiCalendar 
} from "react-icons/fi";
import { BsShieldFillExclamation } from "react-icons/bs";

const TopNav: React.FC = () => {
  const { user } = useAuth();
  const { toggleMobileSidebar } = useDashboard();
  const [time, setTime] = useState(new Date());
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Real-time ticking system clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = time.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  
  const formattedTime = time.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const displayName = user?.displayName || "Operator";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/85 px-4 lg:px-6 py-3 flex items-center justify-between select-none">
      
      {/* Left side: Hamburger menu (mobile) & Brand Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all"
        >
          <FiMenu className="text-md" />
        </button>

        <div className="hidden sm:flex items-center gap-2.5">
          <div className="p-1.5 bg-cyan-950/40 border border-cyan-500/25 rounded-lg">
            <BsShieldFillExclamation className="text-cyan-400 text-md shadow-[0_0_10px_rgba(6,182,212,0.4)]" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white hidden md:inline">
            Women Distress <span className="text-cyan-400">AI</span>
          </span>
        </div>
      </div>

      {/* Middle: Global Search Bar */}
      <div className="flex-grow max-w-xs md:max-w-md mx-4">
        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
          <input
            type="text"
            placeholder="Search assets, threat logs, track IDs..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg glass-input"
          />
        </div>
      </div>

      {/* Right side: Time, Toggles, Dropdowns */}
      <div className="flex items-center gap-3">
        
        {/* Real-time Clock display */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-semibold text-slate-400 border-r border-slate-800/80 pr-4">
          <div className="flex items-center gap-1.5">
            <FiCalendar className="text-slate-500" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-cyan-400 glow-cyan">
            <FiClock className="text-slate-500" />
            <span>{formattedTime}</span>
          </div>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Settings shortcut (goes to Settings page) */}
        <button
          onClick={() => {}}
          className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-white transition-all"
        >
          <FiSettings className="text-md" />
        </button>

        {/* Notifications Button */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className={`p-2 rounded-lg border transition-all ${
              notifOpen 
                ? "bg-cyan-950/20 border-cyan-500/30 text-white" 
                : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white"
            }`}
          >
            <FiBell className="text-md" />
            {/* Notification Badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </button>
          
          <NotificationDropdown isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        {/* Profile Avatar Button */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-cyan-500/10 border border-cyan-400/20 select-none">
              {initials}
            </div>
            <div className="hidden xl:block">
              <h4 className="text-xs font-bold text-white leading-none">{displayName}</h4>
              <span className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5 block">Operator</span>
            </div>
          </button>

          <ProfileDropdown isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
        </div>

      </div>
    </header>
  );
};

export default TopNav;
