import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboard } from "../contexts/DashboardContext";
import { useAuth } from "../contexts/AuthContext";
import { 
  FiGrid, 
  FiRadio, 
  FiUploadCloud, 
  FiFileText, 
  FiClock, 
  FiTrendingUp, 
  FiBell, 
  FiSettings, 
  FiUser, 
  FiHelpCircle, 
  FiLogOut,
  FiChevronLeft,
  FiChevronRight,
  FiX
} from "react-icons/fi";
import { BsShieldFillExclamation } from "react-icons/bs";

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  active: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon, label, collapsed, active, onClick }) => {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold select-none transition-all relative group ${
        active 
          ? "bg-gradient-to-r from-cyan-950/40 to-indigo-950/20 border-l-2 border-cyan-400 text-white" 
          : "text-slate-400 hover:text-white hover:bg-slate-900/30 border-l-2 border-transparent"
      }`}
    >
      <div className={`text-md ${active ? "text-cyan-400" : "text-slate-400 group-hover:text-white"}`}>
        {icon}
      </div>
      {!collapsed && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.15 }}
          className="truncate"
        >
          {label}
        </motion.span>
      )}

      {/* Floating tooltip for collapsed view */}
      {collapsed && (
        <div className="absolute left-14 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[10px] text-white font-bold opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all pointer-events-none z-50 whitespace-nowrap uppercase tracking-widest">
          {label}
        </div>
      )}
    </Link>
  );
};

const Sidebar: React.FC = () => {
  const { sidebarExpanded, toggleSidebar, mobileOpen, setMobileOpen } = useDashboard();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: <FiGrid /> },
    { to: "/dashboard/live-detection", label: "Live Detection", icon: <FiRadio /> },
    { to: "/dashboard/upload-video", label: "Upload Video", icon: <FiUploadCloud /> },
    { to: "/dashboard/detection-results", label: "Detection Results", icon: <FiFileText /> },
    { to: "/dashboard/history", label: "History", icon: <FiClock /> },
    { to: "/dashboard/analytics", label: "Analytics", icon: <FiTrendingUp /> },
    { to: "/dashboard/notifications", label: "Notifications", icon: <FiBell /> },
    { to: "/dashboard/settings", label: "Settings", icon: <FiSettings /> },
    { to: "/dashboard/profile", label: "Profile", icon: <FiUser /> },
    { to: "/dashboard/help-support", label: "Help & Support", icon: <FiHelpCircle /> },
  ];

  // Desktop sidebar wrapper properties
  const sidebarWidth = sidebarExpanded ? "w-64" : "w-16";

  const renderContent = (isMobile: boolean = false) => (
    <div className="flex flex-col h-full bg-[#030712] relative select-none">
      
      {/* Mobile close button / Desktop Collapse button */}
      <div className="p-4 border-b border-slate-900 flex items-center justify-between">
        {(!sidebarExpanded && !isMobile) ? (
          <div className="mx-auto p-1 bg-cyan-950/40 border border-cyan-500/25 rounded-md">
            <BsShieldFillExclamation className="text-cyan-400 text-xs" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="p-1 bg-cyan-950/40 border border-cyan-500/25 rounded-md">
              <BsShieldFillExclamation className="text-cyan-400 text-xs" />
            </div>
            <span className="font-extrabold text-xs tracking-wider uppercase text-white">
              AI CommandCenter
            </span>
          </div>
        )}

        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            <FiX className="text-xs" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-grow p-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => (
          <SidebarItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            collapsed={isMobile ? false : !sidebarExpanded}
            active={
              item.to === "/dashboard" 
                ? location.pathname === "/dashboard" 
                : location.pathname.startsWith(item.to)
            }
            onClick={isMobile ? () => setMobileOpen(false) : undefined}
          />
        ))}
      </nav>

      {/* Footer controls (Logout) */}
      <div className="p-3 border-t border-slate-900">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/20 border-l-2 border-transparent transition-all text-left"
        >
          <FiLogOut className="text-md flex-shrink-0" />
          {(!sidebarExpanded && !isMobile) ? null : <span>Terminate Session</span>}
        </button>
      </div>

      {/* Collapse Toggle Handle (Desktop only) */}
      {!isMobile && (
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 shadow-md cursor-pointer transition-all z-40"
        >
          {sidebarExpanded ? <FiChevronLeft className="text-xs" /> : <FiChevronRight className="text-xs" />}
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* 1. Desktop Sidebar Container */}
      <aside className={`hidden lg:block h-screen fixed left-0 top-0 border-r border-slate-900 transition-all duration-300 z-30 ${sidebarWidth}`}>
        {renderContent(false)}
      </aside>

      {/* 2. Mobile Responsive Drawer Panel */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black z-40"
            />
            {/* Slide in drawer panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 border-r border-slate-900 z-50 overflow-hidden shadow-2xl"
            >
              {renderContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
