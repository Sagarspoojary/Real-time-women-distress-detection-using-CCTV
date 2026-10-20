import React from "react";
import { LegalLayout } from "../../components/legal/LegalLayout";
import { FiCheckCircle, FiShield, FiSliders } from "react-icons/fi";
import { BsCookie } from "react-icons/bs";

const tocItems = [
  { id: "overview", label: "1. Overview & Technology" },
  { id: "storage-used", label: "2. Exact Cookies & Storage Used" },
  { id: "zero-trackers", label: "3. Zero Third-Party Ad Trackers" },
  { id: "consent-mechanism", label: "4. Consent Management" },
  { id: "browser-controls", label: "5. Browser Settings Guide" },
];

export const CookiePolicy: React.FC = () => {
  const handleOpenCookiePreferences = () => {
    window.dispatchEvent(new CustomEvent("open-cookie-settings"));
  };

  return (
    <LegalLayout
      title="Cookie & Local Storage Policy"
      subtitle="Transparent disclosure of browser storage, session persistence, and zero third-party telemetry."
      effectiveDate="October 20, 2024"
      lastUpdated="October 20, 2026"
      toc={tocItems}
    >
      {/* 1. Overview */}
      <section id="overview" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <span className="p-2 bg-cyan-950/60 border border-cyan-500/30 rounded-lg text-cyan-400 text-lg">
            <BsCookie />
          </span>
          1. Overview & Technology Explained
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          This Cookie and Local Storage Policy explains how <strong>AegisSafe AI Technologies Pvt. Ltd.</strong> uses browser cookies, Web Storage (<code>localStorage</code> and <code>sessionStorage</code>), and similar client-side technologies when you access our surveillance dashboard and public portals.
        </p>
        <p className="text-slate-300 leading-relaxed">
          Unlike consumer advertising websites, our system is an operational public safety and computer-vision platform. We do not monetize your browsing activity. We use browser storage strictly to authenticate authorized operators, remember your theme mode, and preserve camera stream states.
        </p>
      </section>

      {/* 2. Storage Used */}
      <section id="storage-used" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
          2. Complete Audit of Cookies & Local Storage Used
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          The table below lists every client-side storage key utilized by our application:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300 border-collapse">
            <thead className="bg-slate-900/90 text-cyan-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Storage Key / Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Technical Purpose</th>
                <th className="py-3 px-4">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
              <tr className="hover:bg-slate-800/20">
                <td className="py-3 px-4 font-bold text-white">firebase:authUser:...</td>
                <td className="py-3 px-4 text-emerald-400 font-sans">Strictly Necessary</td>
                <td className="py-3 px-4 text-slate-400 font-sans">Stores JWT authentication tokens for verified security operators.</td>
                <td className="py-3 px-4 text-slate-400 font-sans">Until Sign-Out / Session Expiry</td>
              </tr>
              <tr className="hover:bg-slate-800/20">
                <td className="py-3 px-4 font-bold text-white">safety_theme</td>
                <td className="py-3 px-4 text-emerald-400 font-sans">Preference</td>
                <td className="py-3 px-4 text-slate-400 font-sans">Remembers user preference between Dark Theme and Light Theme.</td>
                <td className="py-3 px-4 text-slate-400 font-sans">Persistent (1 Year)</td>
              </tr>
              <tr className="hover:bg-slate-800/20">
                <td className="py-3 px-4 font-bold text-white">safety_cookie_consent_v1</td>
                <td className="py-3 px-4 text-emerald-400 font-sans">Strictly Necessary</td>
                <td className="py-3 px-4 text-slate-400 font-sans">Stores whether you accepted all or essential storage preferences.</td>
                <td className="py-3 px-4 text-slate-400 font-sans">Persistent (1 Year)</td>
              </tr>
              <tr className="hover:bg-slate-800/20">
                <td className="py-3 px-4 font-bold text-white">camera_active_source</td>
                <td className="py-3 px-4 text-cyan-400 font-sans">Operational</td>
                <td className="py-3 px-4 text-slate-400 font-sans">Caches the last selected camera device ID (Laptop vs IP Webcam).</td>
                <td className="py-3 px-4 text-slate-400 font-sans">Session Duration</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Zero Third-Party Ad Trackers */}
      <section id="zero-trackers" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <span className="p-2 bg-emerald-950/60 border border-emerald-500/30 rounded-lg text-emerald-400 text-lg">
            <FiShield />
          </span>
          3. Zero Third-Party Advertising & Telemetry Trackers
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          We maintain a strict <strong>Zero Third-Party Commercial Tracking Policy</strong>:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <FiCheckCircle className="text-emerald-400 text-lg mb-2" />
            <h4 className="font-bold text-white">No Ad Retargeting</h4>
            <p className="text-slate-400">Zero Google DoubleClick, Facebook Meta Pixel, or marketing beacons.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <FiCheckCircle className="text-emerald-400 text-lg mb-2" />
            <h4 className="font-bold text-white">No Spyware Analytics</h4>
            <p className="text-slate-400">No screen-recording scripts (Hotjar, FullStory) monitoring camera operators.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <FiCheckCircle className="text-emerald-400 text-lg mb-2" />
            <h4 className="font-bold text-white">Local Bundling</h4>
            <p className="text-slate-400">UI scripts and icons are packaged locally in the application bundle.</p>
          </div>
        </div>
      </section>

      {/* 4. Consent Management */}
      <section id="consent-mechanism" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <span className="p-2 bg-indigo-950/60 border border-indigo-500/30 rounded-lg text-indigo-400 text-lg">
            <FiSliders />
          </span>
          4. Consent Management & Preference Controls
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          You can modify your consent settings at any time by clicking the button below:
        </p>
        <button
          onClick={handleOpenCookiePreferences}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-2"
        >
          <FiSliders />
          Open Cookie Preference Settings
        </button>
      </section>

      {/* 5. Browser Controls */}
      <section id="browser-controls" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
          5. Browser Settings & Manual Storage Deletion
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4 text-xs sm:text-sm">
          You can delete or block cookies and local storage through your browser settings:
        </p>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400 pl-2">
          <li><strong>Google Chrome:</strong> Settings &rarr; Privacy and security &rarr; Third-party cookies &rarr; Clear browsing data.</li>
          <li><strong>Mozilla Firefox:</strong> Settings &rarr; Privacy & Security &rarr; Cookies and Site Data &rarr; Clear Data.</li>
          <li><strong>Microsoft Edge:</strong> Settings &rarr; Cookies and site permissions &rarr; Manage and delete cookies.</li>
          <li><strong>Apple Safari:</strong> Preferences &rarr; Privacy &rarr; Manage Website Data.</li>
        </ul>
        <p className="text-xs text-amber-300/80 mt-4">
          <em>Note:</em> Disabling strictly necessary storage (such as Firebase auth session keys) will prevent you from signing in to the surveillance control dashboard.
        </p>
      </section>
    </LegalLayout>
  );
};

export default CookiePolicy;
