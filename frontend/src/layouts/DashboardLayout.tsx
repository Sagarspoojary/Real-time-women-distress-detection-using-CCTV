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
    <div className="min-h-screen bg-white dark:bg-[#030712] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
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
        <footer className="w-full border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-[#030712] py-4 px-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 font-semibold select-none max-w-7xl mx-auto transition-colors duration-200 gap-2">
          <span>&copy; {new Date().getFullYear()} AegisSafe AI Technologies Pvt. Ltd. All rights reserved.</span>
          <div className="flex flex-wrap items-center gap-3">
            <a href="/privacy" className="hover:text-cyan-500 transition-colors">Privacy (DPDP Act)</a>
            <span>•</span>
            <a href="/terms" className="hover:text-cyan-500 transition-colors">Terms</a>
            <span>•</span>
            <a href="/cookies" className="hover:text-cyan-500 transition-colors">Cookies</a>
            <span>•</span>
            <a href="/refund" className="hover:text-cyan-500 transition-colors">Refunds</a>
            <span>•</span>
            <span className="font-mono text-cyan-600 dark:text-cyan-400">Authorized Personnel Only</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
