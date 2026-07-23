import React, { createContext, useContext, useState } from "react";

interface DashboardContextType {
  sidebarExpanded: boolean;
  toggleSidebar: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => !prev);
  };

  const toggleMobileSidebar = () => {
    setMobileOpen((prev) => !prev);
  };

  return (
    <DashboardContext.Provider
      value={{
        sidebarExpanded,
        toggleSidebar,
        mobileOpen,
        setMobileOpen,
        toggleMobileSidebar,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
};
