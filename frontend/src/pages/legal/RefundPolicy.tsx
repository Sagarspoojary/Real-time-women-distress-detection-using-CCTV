import React from "react";
import { LegalLayout } from "../../components/legal/LegalLayout";
import { FiDollarSign, FiClock, FiHelpCircle, FiCheckCircle } from "react-icons/fi";

const tocItems = [
  { id: "overview", label: "1. Policy Overview" },
  { id: "eval-period", label: "2. 14-Day Pilot Guarantee" },
  { id: "subscriptions", label: "3. SaaS Subscriptions & Renewals" },
  { id: "hardware", label: "4. Hardware & Edge Appliance Returns" },
  { id: "sla-remedies", label: "5. Service Outage Credits" },
  { id: "process", label: "6. How to Claim a Refund" },
];

export const RefundPolicy: React.FC = () => {
  return (
    <LegalLayout
      title="Refund & Cancellation Policy"
      subtitle="Clear and fair terms for software licenses, pilot evaluations, camera hardware kits, and support subscriptions."
      effectiveDate="October 20, 2024"
      lastUpdated="October 20, 2026"
      toc={tocItems}
    >
      {/* 1. Overview */}
      <section id="overview" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <span className="p-2 bg-cyan-950/60 border border-cyan-500/30 rounded-lg text-cyan-400 text-lg">
            <FiDollarSign />
          </span>
          1. Policy Overview & Commercial Scope
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          At <strong>AegisSafe AI Technologies Pvt. Ltd.</strong>, we are committed to transparent, customer-centric billing for our Women Distress Detection AI surveillance platform, on-premise AI acceleration licenses, and cloud support services.
        </p>
        <p className="text-slate-300 leading-relaxed">
          This Refund & Cancellation Policy outlines your rights regarding software subscription cancellations, refund eligibility periods, hardware returns, and service downtime credits in accordance with the <strong>Consumer Protection Act, 2019</strong> and applicable Indian commercial laws.
        </p>
      </section>

      {/* 2. 14-Day Pilot Guarantee */}
      <section id="eval-period" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <span className="p-2 bg-emerald-950/60 border border-emerald-500/30 rounded-lg text-emerald-400 text-lg">
            <FiClock />
          </span>
          2. 14-Day Institutional Pilot Money-Back Guarantee
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          We want deploying institutions to be completely confident in our computer-vision distress detection models:
        </p>
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs sm:text-sm text-emerald-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-400">
            <FiCheckCircle /> 100% Unconditional Software Refund Window
          </div>
          <p className="leading-relaxed">
            New commercial clients and educational institutions purchasing an initial software license tier are eligible for a <strong>100% full refund within fourteen (14) calendar days</strong> from the date of license activation if the system does not meet technical deployment criteria on your camera infrastructure.
          </p>
        </div>
      </section>

      {/* 3. Subscriptions & Renewals */}
      <section id="subscriptions" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
          3. Subscription Licenses, Renewals & Cancellation
        </h2>
        <div className="space-y-4 text-xs sm:text-sm text-slate-300">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h4 className="font-bold text-white mb-1 text-cyan-400">Monthly Subscriptions</h4>
            <p className="text-slate-400">
              You may cancel your monthly surveillance license at any time through Dashboard Settings. Cancellation takes effect at the end of the current billing cycle. No partial mid-month prorated refunds are issued once the initial 14-day window has elapsed.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h4 className="font-bold text-white mb-1 text-cyan-400">Annual Subscriptions</h4>
            <p className="text-slate-400">
              Annual enterprise subscriptions cancelled after the 14-day evaluation window are eligible for a prorated refund for remaining unused whole months, subject to a 10% administrative decommission fee.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Hardware */}
      <section id="hardware" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
          4. Hardware & Edge Compute Appliance Returns
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4 text-xs sm:text-sm">
          Where physical equipment (such as Jetson edge accelerators, IP camera kits, or power-over-ethernet switches) is procured directly through AegisSafe AI:
        </p>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400 pl-2">
          <li><strong>Defective Hardware:</strong> Defective units reported within 30 days of delivery will be replaced immediately at no additional shipping charge under our manufacturer warranty;</li>
          <li><strong>Change of Mind:</strong> Unopened, undamaged hardware in original packaging may be returned within 14 days subject to a 15% restocking and inspection fee. Return shipping costs are paid by the customer.</li>
        </ul>
      </section>

      {/* 5. SLA Remedies */}
      <section id="sla-remedies" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
          5. Service Level Agreement (SLA) Outage Credits
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4 text-xs sm:text-sm">
          For clients subscribed to our Cloud Model Synchronization & Remote Telemetry tier, we commit to a <strong>99.9% Core API Uptime SLA</strong>:
        </p>
        <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 text-xs space-y-2 font-mono">
          <p><span className="text-cyan-400">Uptime 99.0% - 99.8%:</span> 10% monthly service credit</p>
          <p><span className="text-cyan-400">Uptime 95.0% - 98.9%:</span> 25% monthly service credit</p>
          <p><span className="text-cyan-400">Uptime below 95.0%:</span> 50% monthly service credit</p>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          <em>Exclusions:</em> Local camera hardware disconnection, building electrical power cuts, or customer local area network (LAN) dropouts do not constitute platform downtime.
        </p>
      </section>

      {/* 6. How to Claim */}
      <section id="process" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <span className="p-2 bg-indigo-950/60 border border-indigo-500/30 rounded-lg text-indigo-400 text-lg">
            <FiHelpCircle />
          </span>
          6. How to Claim a Refund or Cancellation
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4 text-xs sm:text-sm">
          To initiate a cancellation or request a refund under eligible terms:
        </p>
        <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800 text-xs sm:text-sm space-y-2">
          <p><strong className="text-white">Email:</strong> <a href="mailto:billing@aegissafe.ai" className="text-cyan-400 underline">billing@aegissafe.ai</a></p>
          <p><strong className="text-white">Required Details:</strong> Registered Account Email, Invoice Number, Reason for Return, Organization Name</p>
          <p><strong className="text-white">Acknowledgment:</strong> Within 24-48 business hours</p>
          <p><strong className="text-white">Refund Processing Window:</strong> Approved refunds are credited back to the original payment source (UPI, NetBanking, Credit Card) within <strong>5 to 7 business days</strong>.</p>
        </div>
      </section>
    </LegalLayout>
  );
};

export default RefundPolicy;
