import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import SettingsSidebar from "../../components/settings/SettingsSidebar";
import type { SettingsTab } from "../../components/settings/SettingsSidebar";
import ModelStatusCard from "../../components/settings/ModelStatusCard";
import BackendStatusCard from "../../components/settings/BackendStatusCard";
import ChangePasswordDialog from "../../components/profile/ChangePasswordDialog";
import type { PasswordFields } from "../../components/profile/ChangePasswordDialog";
import ProfileFormModal from "../../components/profile/ProfileFormModal";
import type { ProfileFields } from "../../components/profile/ProfileFormModal";
import { auth } from "../../services/firebase";
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import toast from "react-hot-toast";
import axios from "axios";
import { API_BASE_URL } from "../../services/api";
import { 
  FiSliders, 
  FiUser, 
  FiLock, 
  FiBell, 
  FiShield, 
  FiEye, 
  FiHelpCircle, 
  FiInfo, 
  FiAlertTriangle,
  FiCheckCircle,
  FiUsers
} from "react-icons/fi";

const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Emergency Contacts state fetched from backend
  const [contacts, setContacts] = useState<string[]>(["", "", "", ""]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editEmail, setEditEmail] = useState("");

  // Edit Modals
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Application Settings
  const [language, setLanguage] = useState("english");
  const [timezone, setTimezone] = useState("ist");
  const [dateFormat, setDateFormat] = useState("mm-dd-yyyy");
  const [sidebarState, setSidebarState] = useState("expanded");
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  // Notification Settings
  const [notifyCritical, setNotifyCritical] = useState(true);
  const [notifyWarning, setNotifyWarning] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifySms, setNotifySms] = useState(false);
  const [notifyDesktop, setNotifyDesktop] = useState(true);
  const [notifySound, setNotifySound] = useState(true);

  // Fetch emergency contacts when tab opens
  React.useEffect(() => {
    if (activeTab === "contacts") {
      fetchContacts();
    }
  }, [activeTab]);

  const fetchContacts = async () => {
    setLoadingContacts(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/emergency-contacts`);
      if (response.data && response.data.contacts) {
        setContacts(response.data.contacts);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load emergency contacts from server.");
    } finally {
      setLoadingContacts(false);
    }
  };

  // Appearance Settings
  const [accentColor, setAccentColor] = useState("cyan");
  const [compactMode, setCompactMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  if (!user) {
    return (
      <div className="glass-panel p-8 rounded-2xl border border-slate-900 text-center text-xs text-slate-500 italic">
        Syncing system Operator credentials...
      </div>
    );
  }

  const displayName = user.displayName || "Operator";
  const email = user.email || "operator@security.ai";
  const photoURL = user.photoURL || "";

  // Date formats
  const accountCreated = user.metadata.creationTime 
    ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric"
      })
    : "Unavailable";

  const lastLogin = user.metadata.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "Unavailable";

  const handleSaveProfile = async (data: ProfileFields) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      await updateProfile(currentUser, {
        displayName: data.fullName,
        photoURL: data.photoURL,
      });
      window.location.reload();
      toast.success("System Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    }
  };

  const handleSavePassword = async (data: PasswordFields) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) return;

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, data.currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, data.newPassword);
      toast.success("Credentials updated successfully!");
    } catch (err: any) {
      if (err.code === "auth/wrong-password") {
        toast.error("Invalid current credentials.");
      } else {
        toast.error(err.message || "Failed to update password.");
      }
      throw err;
    }
  };

  const handleDeleteAccount = () => {
    toast.error("Account deletion requires root supervisor override credentials.");
    setDeleteConfirmOpen(false);
  };

  return (
    <div className="space-y-6 select-none pb-12 text-xs">
      
      {/* Page Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-900">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FiSliders className="text-cyan-400" /> System Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure security modules, view clearances, set thresholds, and check gateway status.
        </p>
      </div>

      {/* Main Grid: Left tabs list, Right tab panel details */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* LEFT TAB NAVIGATION */}
        <SettingsSidebar activeTab={activeTab} onChange={setActiveTab} />

        {/* RIGHT DETAILS PANEL */}
        <div className="flex-grow w-full glass-panel p-6 rounded-2xl border border-slate-900 min-h-[460px]">
          
          {/* TAB 1: PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <h2 className="font-extrabold text-sm text-slate-200 border-b border-slate-900 pb-3 flex items-center gap-1.5 uppercase tracking-wide">
                <FiUser className="text-cyan-400" /> Operator clearance Profile
              </h2>

              <div className="flex flex-col sm:flex-row gap-6 items-center border-b border-slate-900/60 pb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center border border-cyan-500/20 overflow-hidden">
                  {photoURL ? <img src={photoURL} alt={displayName} className="w-full h-full object-cover" /> : <span>{displayName.slice(0, 2).toUpperCase()}</span>}
                </div>
                
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="font-extrabold text-sm text-slate-100 uppercase">{displayName}</h3>
                  <span className="text-[10px] text-slate-400 font-mono block">{email}</span>
                  <span className="inline-block px-2.5 py-0.5 mt-2 rounded bg-cyan-950/40 border border-cyan-500/20 text-[8px] font-bold text-cyan-400 uppercase tracking-widest">
                    クリアランス ID: L1 OPERATOR
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-semibold text-slate-500">
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase">Organization unit</span>
                  <span className="font-bold text-slate-300 mt-1 block">Surveillance Command Center</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase">Operational Status</span>
                  <span className="font-bold text-emerald-400 mt-1 block uppercase">ACTIVE MONITORING</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase">Terminal Enrolled</span>
                  <span className="font-mono text-slate-300 mt-1 block">{accountCreated}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase">Last Authorization Ping</span>
                  <span className="font-mono text-slate-300 mt-1 block">{lastLogin}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-900/60 flex justify-end">
                <button
                  onClick={() => setProfileModalOpen(true)}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-bold rounded-lg cursor-pointer uppercase tracking-wider"
                >
                  Edit Profile Name
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ACCOUNT */}
          {activeTab === "account" && (
            <div className="space-y-6">
              <h2 className="font-extrabold text-sm text-slate-200 border-b border-slate-900 pb-3 flex items-center gap-1.5 uppercase tracking-wide">
                <FiLock className="text-cyan-400" /> Account Security actions
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-950/20 border border-slate-900 rounded-xl">
                  <div>
                    <h4 className="font-bold text-slate-200 uppercase">Change Account Password</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Revise authentication keys on the security system.</p>
                  </div>
                  <button
                    onClick={() => setPasswordModalOpen(true)}
                    className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-bold rounded-lg cursor-pointer uppercase tracking-wider"
                  >
                    Change
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950/20 border border-slate-900 rounded-xl">
                  <div>
                    <h4 className="font-bold text-slate-200 uppercase">Terminate Current Session</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Clear access tokens and sign out of the terminal.</p>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="px-3.5 py-1.5 bg-red-950/10 border border-red-500/20 hover:border-red-500/30 text-red-400 font-bold rounded-lg cursor-pointer uppercase tracking-wider"
                  >
                    Sign Out
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-red-950/5 border border-red-500/10 rounded-xl">
                  <div>
                    <h4 className="font-bold text-red-400 uppercase">Delete Account</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Purge supervisor profile and delete account history indexes.</p>
                  </div>
                  <button
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="px-3.5 py-1.5 bg-red-950/30 hover:bg-red-950/50 text-white font-bold rounded-lg cursor-pointer uppercase tracking-wider"
                  >
                    Purge
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: APPLICATION */}
          {activeTab === "application" && (
            <div className="space-y-6">
              <h2 className="font-extrabold text-sm text-slate-200 border-b border-slate-900 pb-3 flex items-center gap-1.5 uppercase tracking-wide">
                <FiSliders className="text-cyan-400" /> Application preferences
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Language */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Language Localization</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg glass-input text-slate-300 cursor-pointer font-bold"
                  >
                    <option value="english">English (US)</option>
                    <option value="hindi">Hindi (IN)</option>
                    <option value="spanish">Spanish (ES)</option>
                  </select>
                </div>

                {/* Timezone */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Time Zone Offset</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg glass-input text-slate-300 cursor-pointer font-bold"
                  >
                    <option value="ist">IST (UTC+05:30)</option>
                    <option value="utc">UTC (Universal Coordinated)</option>
                    <option value="est">EST (UTC-05:00)</option>
                  </select>
                </div>

                {/* Date Format */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Date Format</label>
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg glass-input text-slate-300 cursor-pointer font-bold"
                  >
                    <option value="mm-dd-yyyy">MM/DD/YYYY</option>
                    <option value="dd-mm-yyyy">DD/MM/YYYY</option>
                  </select>
                </div>

                {/* Default Sidebar */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Sidebar Default State</label>
                  <select
                    value={sidebarState}
                    onChange={(e) => setSidebarState(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg glass-input text-slate-300 cursor-pointer font-bold"
                  >
                    <option value="expanded">Expanded</option>
                    <option value="collapsed">Collapsed</option>
                  </select>
                </div>
              </div>

              {/* Animations toggle */}
              <div className="border-t border-slate-900/60 pt-4 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-200 uppercase">Enable UI Animations</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Smooth page transitions and micro-hover layouts.</p>
                </div>
                <button
                  onClick={() => setAnimationsEnabled(!animationsEnabled)}
                  className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${
                    animationsEnabled ? "bg-cyan-500" : "bg-slate-800 border border-slate-700"
                  }`}
                >
                  <span className={`absolute left-0.5 top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${
                    animationsEnabled ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>

            </div>
          )}

          {/* TAB 4: MODELS */}
          {activeTab === "models" && <ModelStatusCard />}

          {/* TAB 5: BACKEND */}
          {activeTab === "backend" && <BackendStatusCard />}

          {/* TAB 6: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <h2 className="font-extrabold text-sm text-slate-200 border-b border-slate-900 pb-3 flex items-center gap-1.5 uppercase tracking-wide">
                <FiBell className="text-cyan-400" /> Notifications & alert dispatches
              </h2>

              <div className="space-y-4">
                {[
                  { label: "Critical Alerts", desc: "Instantly prompt blinking warning alerts on violence anomalies.", state: notifyCritical, set: setNotifyCritical },
                  { label: "Warning Alerts", desc: "Flag medium risk distress gestures.", state: notifyWarning, set: setNotifyWarning },
                  { label: "Email Notifications (Placeholder)", desc: "Dispatch warning report summaries to SMTP accounts.", state: notifyEmail, set: setNotifyEmail },
                  { label: "SMS Notifications (Placeholder)", desc: "Forward distress events via Twilio SMS targets.", state: notifySms, set: setNotifySms },
                  { label: "Desktop Notifications", desc: "Show browser system notification overlays on anomalies.", state: notifyDesktop, set: setNotifyDesktop },
                  { label: "Sound Alerts", desc: "Sound threat buzzer alert logs.", state: notifySound, set: setNotifySound }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-slate-950/20 border border-slate-900 rounded-xl">
                    <div>
                      <h4 className="font-bold text-slate-200 uppercase">{item.label}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => item.set(!item.state)}
                      className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${
                        item.state ? "bg-cyan-500" : "bg-slate-800 border border-slate-700"
                      }`}
                    >
                      <span className={`absolute left-0.5 top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${
                        item.state ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: SECURITY */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <h2 className="font-extrabold text-sm text-slate-200 border-b border-slate-900 pb-3 flex items-center gap-1.5 uppercase tracking-wide">
                <FiShield className="text-cyan-400" /> System security audits
              </h2>

              <div className="space-y-4">
                <div className="p-4 bg-slate-950/30 border border-slate-900 rounded-xl space-y-3">
                  <h4 className="font-bold text-slate-200 uppercase flex items-center gap-1.5">
                    <FiCheckCircle className="text-emerald-400" /> Active Session Details
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2 text-slate-500 font-semibold mt-2">
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">Browser Client</span>
                      <span className="font-bold text-slate-300">Chrome (MacOS Client)</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">IP Address Location</span>
                      <span className="font-mono font-bold text-slate-300">127.0.0.1 (Localhost)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950/20 border border-slate-900 rounded-xl">
                  <div>
                    <h4 className="font-bold text-slate-200 uppercase">Two-Factor Authentication (2FA)</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Require multi-factor authorization pin codes during login.</p>
                  </div>
                  <span className="px-2 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-500 text-[8px] font-extrabold uppercase tracking-widest">
                    Coming Soon
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950/20 border border-slate-900 rounded-xl">
                  <div>
                    <h4 className="font-bold text-slate-200 uppercase">API Access Tokens</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Generate API secrets keys for secondary camera integrations.</p>
                  </div>
                  <span className="px-2 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-500 text-[8px] font-extrabold uppercase tracking-widest">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: APPEARANCE */}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              <h2 className="font-extrabold text-sm text-slate-200 border-b border-slate-900 pb-3 flex items-center gap-1.5 uppercase tracking-wide">
                <FiEye className="text-cyan-400" /> UI theme & layout density
              </h2>

              <div className="space-y-6">
                {/* Accent Color */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">System Accent Color</label>
                  <div className="flex gap-4">
                    {[
                      { id: "cyan", label: "Cyan", color: "bg-cyan-500" },
                      { id: "blue", label: "Blue", color: "bg-blue-600" },
                      { id: "purple", label: "Purple", color: "bg-purple-600" }
                    ].map((col) => (
                      <button
                        key={col.id}
                        onClick={() => setAccentColor(col.id)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                          accentColor === col.id 
                            ? "border-cyan-500/35 bg-cyan-500/10 text-cyan-400" 
                            : "border-slate-900 bg-slate-950/25 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                        {col.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Compact Mode toggle */}
                <div className="flex justify-between items-center p-4 bg-slate-950/20 border border-slate-900 rounded-xl">
                  <div>
                    <h4 className="font-bold text-slate-200 uppercase">Compact Mode</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Increase spacing density to squeeze more widgets on grids.</p>
                  </div>
                  <button
                    onClick={() => setCompactMode(!compactMode)}
                    className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${
                      compactMode ? "bg-cyan-500" : "bg-slate-800 border border-slate-700"
                    }`}
                  >
                    <span className={`absolute left-0.5 top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${
                      compactMode ? "translate-x-4" : "translate-x-0"
                    }`} />
                  </button>
                </div>

                {/* Reduced Motion */}
                <div className="flex justify-between items-center p-4 bg-slate-950/20 border border-slate-900 rounded-xl">
                  <div>
                    <h4 className="font-bold text-slate-200 uppercase">Reduced Motion</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Toggle transitions to optimize system performance.</p>
                  </div>
                  <button
                    onClick={() => setReducedMotion(!reducedMotion)}
                    className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${
                      reducedMotion ? "bg-cyan-500" : "bg-slate-800 border border-slate-700"
                    }`}
                  >
                    <span className={`absolute left-0.5 top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${
                      reducedMotion ? "translate-x-4" : "translate-x-0"
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: HELP & SUPPORT */}
          {activeTab === "support" && (
            <div className="space-y-6">
              <h2 className="font-extrabold text-sm text-slate-200 border-b border-slate-900 pb-3 flex items-center gap-1.5 uppercase tracking-wide">
                <FiHelpCircle className="text-cyan-400" /> Help desk & FAQ
              </h2>

              <div className="space-y-4 font-semibold text-slate-400">
                <div className="glass-panel p-4 rounded-xl border border-slate-900">
                  <h4 className="font-bold text-slate-200 uppercase">FAQ 1: How do I test the violence detection pipeline?</h4>
                  <p className="text-slate-500 mt-1.5 leading-relaxed text-[11px]">
                    Go to the **Upload Video** tab and upload a test footage. Choose to run Model 1 (Violence) and inspect diagnostics results.
                  </p>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-slate-900">
                  <h4 className="font-bold text-slate-200 uppercase">FAQ 2: Why are videos streaming blank or loading infinitely?</h4>
                  <p className="text-slate-500 mt-1.5 leading-relaxed text-[11px]">
                    FastAPI relies on FFmpeg to convert OpenCV output to H.264 codecs. Confirm that FFmpeg is installed and accessible in the system path (`/opt/homebrew/bin/ffmpeg`).
                  </p>
                </div>

                <div className="p-4 bg-slate-950/20 border border-slate-900 rounded-xl">
                  <h4 className="font-bold text-slate-200 uppercase">Support Channels</h4>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Contact system administrators or submit bug reports on the repository help page.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: ABOUT */}
          {activeTab === "about" && (
            <div className="space-y-6">
              <h2 className="font-extrabold text-sm text-slate-200 border-b border-slate-900 pb-3 flex items-center gap-1.5 uppercase tracking-wide">
                <FiInfo className="text-cyan-400" /> About system
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 font-semibold text-slate-500">
                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase">Project Name</span>
                    <span className="font-bold text-slate-300">Women Distress Detection AI</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase">Version Release</span>
                    <span className="font-mono font-bold text-slate-300">v2.0.4-Beta</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/20 border border-slate-900 rounded-xl space-y-2">
                  <h4 className="font-bold text-slate-200 uppercase">Technology stack</h4>
                  <div className="grid grid-cols-2 gap-y-1.5 text-[10px] text-slate-500">
                    <span>Frontend framework:</span>
                    <span className="font-bold text-slate-300">React + Vite + TypeScript</span>
                    <span>Styling library:</span>
                    <span className="font-bold text-slate-300">Tailwind CSS + Framer Motion</span>
                    <span>Backend engine:</span>
                    <span className="font-bold text-slate-300">FastAPI + OpenCV + PyTorch</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 11: EMERGENCY CONTACTS */}
          {activeTab === "contacts" && (
            <div className="space-y-6">
              <h2 className="font-extrabold text-sm text-slate-200 border-b border-slate-900 pb-3 flex items-center gap-1.5 uppercase tracking-wide">
                <FiUsers className="text-cyan-400" /> Emergency contacts dashboard
              </h2>

              <p className="text-slate-400 text-xs">
                Configure exactly four emergency email addresses that will receive instant broadcasts during distress incidents.
              </p>

              {loadingContacts ? (
                <div className="text-xs text-slate-500 italic py-4">Syncing database contact registries...</div>
              ) : (
                <div className="space-y-4">
                  {contacts.map((email, idx) => {
                    const isEditing = editingIdx === idx;
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-950/20 border border-slate-900 rounded-xl gap-4">
                        <div className="flex-grow w-full">
                          <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Emergency Contact {idx + 1}</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg glass-input text-slate-200 font-bold"
                              placeholder="Enter email address"
                            />
                          ) : (
                            <span className="font-mono font-bold text-slate-200 block text-xs">{email || "Not Configured"}</span>
                          )}
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.trim())) {
                                    toast.error("Please enter a valid email address.");
                                    return;
                                  }
                                  try {
                                    const response = await axios.put(`${API_BASE_URL}/api/v1/emergency-contacts/${idx}`, {
                                      email: editEmail.trim()
                                    });
                                    setContacts(response.data.contacts);
                                    setEditingIdx(null);
                                    toast.success("Contact saved to server.");
                                  } catch (err: any) {
                                    toast.error(err.response?.data?.detail || "Failed to save contact.");
                                  }
                                }}
                                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg cursor-pointer uppercase tracking-wider text-[10px]"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingIdx(null)}
                                className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-bold rounded-lg cursor-pointer uppercase tracking-wider text-[10px]"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingIdx(idx);
                                  setEditEmail(email);
                                }}
                                className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-bold rounded-lg cursor-pointer uppercase tracking-wider text-[10px]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const response = await axios.delete(`${API_BASE_URL}/api/v1/emergency-contacts/${idx}`);
                                    setContacts(response.data.contacts);
                                    toast.success("Contact cleared on server.");
                                  } catch (err: any) {
                                    toast.error(err.response?.data?.detail || "Failed to clear contact.");
                                  }
                                }}
                                className="px-3.5 py-1.5 bg-red-950/20 border border-red-500/20 hover:bg-red-950/40 text-red-400 font-bold rounded-lg cursor-pointer uppercase tracking-wider text-[10px]"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Edit Profile Form Popup */}
      <ProfileFormModal
        isOpen={profileModalOpen}
        initialName={displayName}
        initialPhotoURL={photoURL}
        initialEmail={email}
        onSave={handleSaveProfile}
        onClose={() => setProfileModalOpen(false)}
      />

      {/* Change Password Dialog Popup */}
      <ChangePasswordDialog
        isOpen={passwordModalOpen}
        onSave={handleSavePassword}
        onClose={() => setPasswordModalOpen(false)}
      />

      {/* Delete Account confirmation dialog */}
      {deleteConfirmOpen && (
        <>
          <div 
            onClick={() => setDeleteConfirmOpen(false)} 
            className="fixed inset-0 bg-black/50 z-50 pointer-events-auto" 
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm glass-panel border border-red-500/20 p-6 rounded-2xl shadow-2xl z-50 select-none flex flex-col gap-4 text-xs">
            <h3 className="font-extrabold text-sm text-red-400 flex items-center gap-1.5 uppercase">
              <FiAlertTriangle /> Purge account profile?
            </h3>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              This action is destructive. Deleting the operator profile will wipe all security logs history permanently.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-grow py-2 bg-slate-900 border border-slate-800 text-slate-300 font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-grow py-2 bg-red-650 hover:bg-red-550 text-white font-bold rounded-lg cursor-pointer"
              >
                Confirm Purge
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default Settings;
