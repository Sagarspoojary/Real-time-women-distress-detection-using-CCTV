import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useDashboard } from "../contexts/DashboardContext";
import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";
import Breadcrumbs from "../components/Breadcrumbs";
import { motion } from "framer-motion";

const DashboardLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const { sidebarExpanded } = useDashboard();

  // Route guarding: if loading, display loader. If not logged in, redirect to login page.
  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-cyan-400 border-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Adjust page content margin-left dynamically for expanded/collapsed desktop sidebar
  const mainMargin = sidebarExpanded ? "lg:pl-64" : "lg:pl-16";

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main Container Shell */}
      <div className={`flex flex-col flex-grow min-h-screen transition-all duration-300 ${mainMargin}`}>
        
        {/* Top Navbar */}
        <TopNav />

        {/* Inner Content Area */}
        <main className="flex-grow p-4 lg:p-6 flex flex-col gap-4 max-w-7xl w-full mx-auto">
          {/* Breadcrumb row */}
          <Breadcrumbs />

          {/* Animated Page view container */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-grow flex flex-col"
          >
            <Outlet />
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="w-full border-t border-slate-900 bg-[#030712] py-4 px-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 font-semibold select-none max-w-7xl mx-auto">
          <span>&copy; {new Date().getFullYear()} Women Distress Detection AI. All rights reserved.</span>
          <div className="flex gap-4 mt-2 sm:mt-0">
            <span>Terminal Version 1.0.0</span>
            <span>Clearance: Authorized Personnel Only</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
