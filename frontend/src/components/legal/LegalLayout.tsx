import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  BsShieldFillExclamation, 
  BsShieldCheck, 
  BsPrinter, 
  BsArrowLeft,
  BsFileEarmarkText,
  BsFileLock2,
  BsCookie,
  BsArrowCounterclockwise
} from "react-icons/bs";
import ThemeToggle from "../ThemeToggle";

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  effectiveDate: string;
  children: React.ReactNode;
  toc?: { id: string; label: string }[];
}

export const LegalLayout: React.FC<LegalLayoutProps> = ({
  title,
  subtitle,
  lastUpdated,
  effectiveDate,
  children,
  toc = [],
}) => {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<string>(toc[0]?.id || "");

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      for (let i = toc.length - 1; i >= 0; i--) {
        const el = document.getElementById(toc[i].id);
        if (el && el.offsetTop - 140 <= scrollY) {
          setActiveSection(toc[i].id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [toc]);

  const navLinks = [
    { to: "/privacy", label: "Privacy Policy", icon: <BsFileLock2 /> },
    { to: "/terms", label: "Terms of Service", icon: <BsFileEarmarkText /> },
    { to: "/cookies", label: "Cookie Policy", icon: <BsCookie /> },
    { to: "/refund", label: "Refund Policy", icon: <BsArrowCounterclockwise /> },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/landing"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800/50"
            aria-label="Back to home page"
          >
            <BsArrowLeft className="text-base" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
          <div className="h-5 w-[1px] bg-slate-800 hidden sm:block" />
          <Link to="/landing" className="flex items-center gap-2.5">
            <div className="p-1.5 bg-cyan-950/40 border border-cyan-500/20 rounded-lg">
              <BsShieldFillExclamation className="text-cyan-400 text-lg shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
            </div>
            <span className="font-bold text-base tracking-tight text-white">
              Women Distress <span className="text-cyan-400">AI</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-900/60 text-slate-300 hover:text-white text-xs font-medium transition-all shadow-sm"
            aria-label="Print or save as PDF"
            title="Print or save as PDF"
          >
            <BsPrinter className="text-sm text-cyan-400" />
            <span className="hidden sm:inline">Print / Save PDF</span>
          </button>
          <Link
            to="/login"
            className="px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-lg shadow-md transition-all"
          >
            Operator Login
          </Link>
        </div>
      </header>

      {/* Hero Title Section */}
      <section className="border-b border-slate-800/60 bg-gradient-to-b from-cyan-950/20 via-transparent to-transparent px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-xs font-semibold tracking-wide text-cyan-300 uppercase mb-4">
            <BsShieldCheck className="text-cyan-400 text-sm" /> Legal & Regulatory Compliance
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {title}
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-400 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-xs font-medium text-slate-400 border-t border-slate-800/60 pt-4">
            <span><strong>Effective Date:</strong> {effectiveDate}</span>
            <span className="text-slate-600">•</span>
            <span><strong>Last Updated:</strong> {lastUpdated}</span>
            <span className="text-slate-600">•</span>
            <span><strong>Jurisdiction:</strong> India (DPDP Act 2023 & IT Act 2000)</span>
          </div>
        </div>
      </section>

      {/* Policy Navigation Bar */}
      <nav 
        aria-label="Legal documents navigation"
        className="sticky top-[65px] z-30 w-full glass-panel border-b border-slate-800/80 px-6 py-2.5 overflow-x-auto scrollbar-none"
      >
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          {navLinks.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          
          {/* Table of Contents Sticky Sidebar */}
          {toc.length > 0 && (
            <aside className="hidden lg:block lg:col-span-1">
              <div className="sticky top-[130px] p-5 rounded-2xl glass-panel border border-slate-800/80">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Table of Contents
                </h2>
                <ul className="space-y-1 text-xs">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className={`block py-1.5 px-2 rounded-lg transition-colors ${
                          activeSection === item.id
                            ? "bg-cyan-500/10 text-cyan-300 font-semibold"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                        }`}
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 pt-5 border-t border-slate-800/60 text-[11px] text-slate-400 space-y-2">
                  <p className="font-semibold text-slate-300">Need legal assistance?</p>
                  <p>Our Grievance Redressal Officer responds within 48 hours.</p>
                  <a
                    href="mailto:grievance@aegissafe.ai"
                    className="text-cyan-400 hover:text-cyan-300 underline font-medium block"
                  >
                    grievance@aegissafe.ai
                  </a>
                </div>
              </div>
            </aside>
          )}

          {/* Legal Content */}
          <div className={toc.length > 0 ? "lg:col-span-3 space-y-8" : "lg:col-span-4 space-y-8"}>
            <div className="prose prose-invert max-w-none space-y-8 text-slate-300 leading-relaxed text-sm">
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 px-6 py-12 text-slate-400 text-xs">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2.5">
                <BsShieldFillExclamation className="text-cyan-400 text-lg" />
                <span className="font-bold text-sm text-white">
                  AegisSafe AI Technologies Pvt. Ltd.
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-md">
                Developer of Real-Time Women Distress Detection & Safety Surveillance Systems. Engineered in Bengaluru, India. Compliant with Digital Personal Data Protection (DPDP) Act, 2023.
              </p>
              <p className="text-[11px] text-slate-500">
                <strong>Corporate Identification Number (CIN):</strong> U72900KA2024PTC184920<br />
                <strong>Registered Office:</strong> Tech Park Central, 4th Floor, Outer Ring Road, Bengaluru, Karnataka 560103, India.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Statutory Contacts</h3>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li><strong className="text-slate-300">Grievance Officer:</strong> Mr. Arvind Raman</li>
                <li><strong className="text-slate-300">Email:</strong> grievance@aegissafe.ai</li>
                <li><strong className="text-slate-300">Privacy Desk:</strong> privacy@aegissafe.ai</li>
                <li><strong className="text-slate-300">SLA:</strong> 48h Ack | 30d Redressal</li>
                <li><strong className="text-slate-300">Phone:</strong> +91 80 4920 1800</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Compliance Policies</h3>
              <ul className="space-y-1.5 text-xs">
                <li><Link to="/privacy" className="hover:text-cyan-400 transition-colors">Privacy Policy (DPDP Act)</Link></li>
                <li><Link to="/terms" className="hover:text-cyan-400 transition-colors">Terms of Service</Link></li>
                <li><Link to="/cookies" className="hover:text-cyan-400 transition-colors">Cookie & Storage Policy</Link></li>
                <li><Link to="/refund" className="hover:text-cyan-400 transition-colors">Refund & Cancellation</Link></li>
                <li>
                  <button 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("open-cookie-settings"));
                    }}
                    className="text-cyan-400 hover:underline"
                  >
                    Manage Cookie Preferences
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
            <p>&copy; {new Date().getFullYear()} AegisSafe AI Technologies Pvt. Ltd. All rights reserved.</p>
            <p className="text-cyan-400/90 font-mono text-[10px]">
              DPDP ACT 2023 COMPLIANT • SECURE LOCAL PROCESSING • ZERO THIRD-PARTY AD TRACKING
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
