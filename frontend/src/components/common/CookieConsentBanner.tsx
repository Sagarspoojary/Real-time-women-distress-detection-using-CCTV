import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BsCookie, BsShieldCheck, BsX, BsCheck2 } from "react-icons/bs";

const STORAGE_KEY = "safety_cookie_consent_v1";

export const CookieConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Preference toggles
  const [essential] = useState(true); // Always true & locked
  const [preferences, setPreferences] = useState(true);
  const [operational, setOperational] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      // Small timeout for smooth entrance animation after initial page load
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for open-cookie-settings custom event from footer/legal pages
  useEffect(() => {
    const handleOpenSettings = () => {
      setShowModal(true);
      setVisible(true);
    };
    window.addEventListener("open-cookie-settings", handleOpenSettings);
    return () => window.removeEventListener("open-cookie-settings", handleOpenSettings);
  }, []);

  const saveConsent = (choice: "all" | "essential" | "custom") => {
    const payload = {
      choice,
      essential: true,
      preferences: choice === "all" ? true : choice === "essential" ? false : preferences,
      operational: choice === "all" ? true : choice === "essential" ? false : operational,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setVisible(false);
    setShowModal(false);
  };

  if (!visible && !showModal) return null;

  return (
    <>
      {/* Floating Bottom Banner */}
      {visible && !showModal && (
        <aside
          role="region"
          aria-label="Privacy and Cookie Consent"
          className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-xl z-50 animate-fade-in"
        >
          <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-cyan-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl bg-slate-950/90 text-slate-200">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xl flex-shrink-0 mt-0.5">
                <BsCookie />
              </div>
              <div className="space-y-2 flex-grow">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm tracking-tight flex items-center gap-2">
                    Privacy & Storage Notice
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                      DPDP Act 2023
                    </span>
                  </h3>
                  <button
                    onClick={() => saveConsent("essential")}
                    className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                    aria-label="Dismiss and accept essential only"
                  >
                    <BsX className="text-xl" />
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  We use strictly necessary browser storage to authenticate operator sessions and preserve your visual theme preference. We do <strong>not</strong> track you with third-party advertising cookies or sell surveillance metadata.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => saveConsent("all")}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
                  >
                    Accept All
                  </button>
                  <button
                    type="button"
                    onClick={() => saveConsent("essential")}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-700 hover:border-slate-600 hover:bg-slate-800 transition-all focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
                  >
                    Essential Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="px-3 py-2 text-xs font-medium text-cyan-400 hover:text-cyan-300 underline transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none rounded-lg"
                  >
                    Customize
                  </button>
                  <Link
                    to="/cookies"
                    className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors ml-auto underline"
                  >
                    Cookie Policy &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Preferences Customization Modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-lg glass-panel p-6 sm:p-7 rounded-2xl border border-slate-700 shadow-2xl bg-slate-950/95 text-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-950/60 border border-cyan-500/30 rounded-lg text-cyan-400 text-lg">
                  <BsShieldCheck />
                </div>
                <div>
                  <h3 id="cookie-modal-title" className="text-base font-bold text-white">
                    Customize Storage & Privacy Preferences
                  </h3>
                  <p className="text-xs text-slate-400">Control what data can be cached on your local device.</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
                aria-label="Close preferences modal"
              >
                <BsX className="text-2xl" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Essential */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">Strictly Necessary Storage</span>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      Required
                    </span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Essential for secure operator authentication (JWT session tokens via Firebase) and verifying API authorization headers. Cannot be disabled.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={essential}
                  disabled
                  className="w-4 h-4 rounded text-cyan-500 bg-slate-800 border-slate-700 opacity-60 cursor-not-allowed mt-1"
                  aria-label="Strictly Necessary Storage (Always Enabled)"
                />
              </div>

              {/* Preferences */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="font-bold text-white">User Interface Preferences</span>
                  <p className="text-slate-400 leading-relaxed">
                    Saves your chosen theme (Dark Mode / Light Mode) in localStorage so your preference persists across sessions without resetting.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="pref-toggle"
                  checked={preferences}
                  onChange={(e) => setPreferences(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 bg-slate-800 border-slate-700 focus:ring-cyan-500 mt-1 cursor-pointer"
                  aria-label="User Interface Preferences Toggle"
                />
              </div>

              {/* Operational Caching */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="font-bold text-white">Operational Stream State Caching</span>
                  <p className="text-slate-400 leading-relaxed">
                    Caches the last connected camera source (e.g., Mobile IP Webcam address) to save you from re-typing IP addresses during page reloads.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="oper-toggle"
                  checked={operational}
                  onChange={(e) => setOperational(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 bg-slate-800 border-slate-700 focus:ring-cyan-500 mt-1 cursor-pointer"
                  aria-label="Operational Stream State Caching Toggle"
                />
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 flex flex-wrap items-center justify-between gap-3">
              <Link
                to="/cookies"
                onClick={() => setShowModal(false)}
                className="text-xs text-cyan-400 hover:underline"
              >
                Read Full Cookie Policy &rarr;
              </Link>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => saveConsent("essential")}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-700 hover:bg-slate-800 transition-colors"
                >
                  Reject Optional
                </button>
                <button
                  type="button"
                  onClick={() => saveConsent("custom")}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 shadow-md transition-all flex items-center gap-1.5"
                >
                  <BsCheck2 className="text-sm" /> Save Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieConsentBanner;
