import React from "react";
import { 
  FiUser, 
  FiLock, 
  FiSliders, 
  FiCpu, 
  FiServer, 
  FiBell, 
  FiShield, 
  FiEye, 
  FiHelpCircle, 
  FiInfo,
  FiUsers
} from "react-icons/fi";

export type SettingsTab = 
  | "profile" 
  | "account" 
  | "application" 
  | "models" 
  | "backend" 
  | "notifications" 
  | "security" 
  | "appearance" 
  | "support" 
  | "about"
  | "contacts";

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  activeTab,
  onChange,
}) => {
  const tabs = [
    { id: "profile", label: "Profile", icon: <FiUser /> },
    { id: "account", label: "Account", icon: <FiLock /> },
    { id: "application", label: "Application", icon: <FiSliders /> },
    { id: "models", label: "AI Models", icon: <FiCpu /> },
    { id: "backend", label: "Backend", icon: <FiServer /> },
    { id: "notifications", label: "Notifications", icon: <FiBell /> },
    { id: "security", label: "Security", icon: <FiShield /> },
    { id: "appearance", label: "Appearance", icon: <FiEye /> },
    { id: "contacts", label: "Emergency Contacts", icon: <FiUsers /> },
    { id: "support", label: "Help & Support", icon: <FiHelpCircle /> },
    { id: "about", label: "About", icon: <FiInfo /> },
  ] as const;

  return (
    <div className="w-full lg:w-64 flex flex-col gap-4 text-xs select-none">
      
      {/* Mobile Select dropdown */}
      <div className="lg:hidden">
        <select
          value={activeTab}
          onChange={(e) => onChange(e.target.value as SettingsTab)}
          className="w-full px-4 py-2.5 rounded-lg glass-input font-bold text-slate-300 cursor-pointer"
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop list group */}
      <div className="hidden lg:flex flex-col gap-1.5 p-2 glass-panel border border-slate-900 rounded-xl">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`w-full px-4 py-2.5 rounded-lg flex items-center gap-3 font-semibold text-left transition-all cursor-pointer ${
                isActive 
                  ? "bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400 font-bold" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              }`}
            >
              <span className={`text-md ${isActive ? "text-cyan-400" : "text-slate-500"}`}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
};

export default SettingsSidebar;
