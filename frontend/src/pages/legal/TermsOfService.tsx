import React from "react";
import { LegalLayout } from "../../components/legal/LegalLayout";
import { FiAlertTriangle, FiCheckSquare, FiXCircle, FiCpu } from "react-icons/fi";

const tocItems = [
  { id: "acceptance", label: "1. Acceptance of Terms" },
  { id: "ai-disclaimer", label: "2. Critical AI & Emergency Disclaimer" },
  { id: "permitted-use", label: "3. Permitted Use & Operator Eligibility" },
  { id: "prohibited-use", label: "4. Strictly Prohibited Conduct" },
  { id: "cctv-compliance", label: "5. CCTV & Indian Law Compliance" },
  { id: "hardware-network", label: "6. Camera & Network Responsibilities" },
  { id: "intellectual-property", label: "7. Intellectual Property & Models" },
  { id: "limitation-liability", label: "8. Limitation of Liability" },
  { id: "indemnification", label: "9. Indemnification" },
  { id: "governing-law", label: "10. Governing Law & Dispute Resolution" },
];

export const TermsOfService: React.FC = () => {
  return (
    <LegalLayout
      title="Terms of Service & Operational Agreement"
      subtitle="Comprehensive terms governing the deployment, licensing, and usage of the Women Distress Detection AI surveillance platform."
      effectiveDate="October 20, 2024"
      lastUpdated="October 20, 2026"
      toc={tocItems}
    >
      {/* 1. Acceptance */}
      <section id="acceptance" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <span className="p-2 bg-cyan-950/60 border border-cyan-500/30 rounded-lg text-cyan-400 text-lg">
            <FiCheckSquare />
          </span>
          1. Acceptance of Terms & Binding Agreement
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          By registering an account, initializing the surveillance engine, connecting any camera source (including laptop webcams, IP Webcams, or RTSP CCTV streams), or accessing the dashboard, you (“User”, “Operator”, or “Deploying Organization”) agree to be legally bound by these Terms of Service (“Terms”) and our Privacy Policy.
        </p>
        <p className="text-slate-300 leading-relaxed">
          If you are accepting these Terms on behalf of an enterprise, educational institution, municipal authority, or commercial establishment, you represent and warrant that you possess full legal authority to bind such entity to this agreement.
        </p>
      </section>

      {/* 2. Critical AI & Emergency Disclaimer */}
      <section id="ai-disclaimer" className="glass-panel p-6 sm:p-8 rounded-2xl border border-red-500/40 bg-red-950/10">
        <div className="flex items-center gap-3 mb-4 text-red-400">
          <span className="p-2 bg-red-950/80 border border-red-500/40 rounded-lg text-xl">
            <FiAlertTriangle />
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            2. CRITICAL AI & EMERGENCY SERVICES DISCLAIMER
          </h2>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-red-200/90 leading-relaxed">
          <p className="font-semibold text-white">
            PLEASE READ THIS SECTION WITH UTMOST ATTENTION. IT CONTAINS VITAL LIMITATIONS CONCERNING SAFETY, POLICE RESPONSE, AND AI ACCURACY:
          </p>
          <ul className="list-disc list-inside space-y-2.5 pl-2">
            <li>
              <strong>Assistive Decision-Support Tool Only:</strong> The System is an automated computer-vision and deep learning assistive screening tool. It is engineered to assist human operators in detecting potential anomalies and distress body language. It is <strong>NOT</strong> an autonomous emergency response dispatch agency, security guard replacement, or sovereign law enforcement service.
            </li>
            <li>
              <strong>Probabilistic Nature of Deep Learning:</strong> AI models (including VideoMAE, YOLO, and EfficientNet) operate on statistical probabilities. System performance is subject to environmental variables, including optical occlusions, low lighting, camera glare, frame-rate drops, network latency, and atypical physical gestures. The Company expressly <strong>DISCLAIMS ANY GUARANTEE OF 100% ACCURACY</strong> or zero false-negatives/false-positives.
            </li>
            <li>
              <strong>NOT A REPLACEMENT FOR 112 / POLICE:</strong> In any active emergency, life-threatening situation, or observed physical assault, operators and citizens must <strong>IMMEDIATELY DIAL THE OFFICIAL GOVERNMENT EMERGENCY HELPLINE (112 in India, 100 for Police, 108 for Medical)</strong> without waiting for AI pipeline verification or automated SMS dispatch.
            </li>
            <li>
              <strong>SMS Delivery Dependencies:</strong> Automated SMS notifications dispatched via cellular gateways (such as TextBee) are subject to telecommunications network conditions, cellular coverage, and operator handset availability. The Company assumes no liability for cellular network delivery delays or provider outages.
            </li>
          </ul>
        </div>
      </section>

      {/* 3. Permitted Use */}
      <section id="permitted-use" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
          3. Permitted Use & Operator Clearance
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          You are granted a revocable, non-exclusive, non-transferable license to access and deploy the platform strictly for:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="text-cyan-400 font-bold text-sm block">A. Safety & Public Monitoring</span>
            <p className="text-slate-400">
              Monitoring authorized premises (campuses, transit hubs, parking facilities, commercial areas) to enhance women's security and prevent violent escalation.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="text-cyan-400 font-bold text-sm block">B. Authorized Forensic Auditing</span>
            <p className="text-slate-400">
              Reviewing logged incident records and evidentiary video clips to support official investigations under statutory law enforcement directives.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Prohibited Use */}
      <section id="prohibited-use" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <span className="p-2 bg-red-950/60 border border-red-500/30 rounded-lg text-red-400 text-lg">
            <FiXCircle />
          </span>
          4. Strictly Prohibited Conduct
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Any breach of the following restrictions will result in immediate termination of access and potential referral to law enforcement:
        </p>
        <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-slate-400 pl-2">
          <li><strong>Covert Surveillance in Private Zones:</strong> Deploying cameras in restrooms, changing rooms, residential private quarters, or areas where individuals maintain a reasonable expectation of privacy;</li>
          <li><strong>Harassment & Stalking:</strong> Using person-tracking IDs or coordinate telemetry to stalk, harass, intimidate, or unlawfully surveil any person;</li>
          <li><strong>Unlicensed Biometric Database Creation:</strong> Scraping, storing, or compiling biometric facial data of surveyed individuals for cross-matching against unauthorized commercial registries;</li>
          <li><strong>Reverse Engineering:</strong> Decompiling, reverse engineering, disassembling, or extracting model architecture or proprietary checkpoint weights (e.g. <code>videomae_model1_best.pth</code>);</li>
          <li><strong>Tampering with Evidence Logs:</strong> Attempting to fraudulently alter, forge, or delete incident timestamps or evidence hashes stored in the database.</li>
        </ul>
      </section>

      {/* 5. CCTV Compliance */}
      <section id="cctv-compliance" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
          5. Mandatory CCTV & Indian Regulatory Compliance
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Under Indian jurisprudence and the <strong>Digital Personal Data Protection Act, 2023</strong>, optical surveillance in public or semi-public spaces must adhere to the rule of transparent notice:
        </p>
        <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200 space-y-2">
          <p className="font-bold uppercase tracking-wider text-cyan-400">Operator Mandate:</p>
          <p>
            You agree to erect clear, visible physical signage at all entrances and within camera coverage zones advising visitors that the area is monitored by CCTV and AI video analysis for women safety and crime deterrence.
          </p>
        </div>
      </section>

      {/* 6. Hardware & Network Responsibilities */}
      <section id="hardware-network" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
          6. Hardware, IP Webcam & Network Responsibilities
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          The Operator retains sole responsibility for the operational environment:
        </p>
        <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-slate-400 pl-2">
          <li><strong>Local Network Security:</strong> Ensuring that IP Webcams (e.g., Android IP Webcam app) and CCTV RTSP streams operate on secure, password-protected local Wi-Fi or isolated VLANs;</li>
          <li><strong>Emergency Contact Accuracy:</strong> Ensuring that mobile numbers entered into the Dashboard Settings are valid E.164 phone numbers belonging to authorized emergency contacts;</li>
          <li><strong>Physical Camera Maintenance:</strong> Ensuring lenses remain unobstructed, clean, well-lit, and focused on relevant walkways or surveillance zones.</li>
        </ul>
      </section>

      {/* 7. Intellectual Property */}
      <section id="intellectual-property" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <span className="p-2 bg-indigo-950/60 border border-indigo-500/30 rounded-lg text-indigo-400 text-lg">
            <FiCpu />
          </span>
          7. Intellectual Property & Proprietary Models
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          All proprietary software, deep learning architectures, trained VideoMAE transformer weights, UI designs, codebases, and documentation remain the exclusive intellectual property of <strong>AegisSafe AI Technologies Pvt. Ltd.</strong> protected under the Indian Copyright Act, 1957 and International IP treaties.
        </p>
      </section>

      {/* 8. Limitation of Liability */}
      <section id="limitation-liability" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
          8. Limitation of Liability
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4 text-xs sm:text-sm">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE INDIAN LAW:
        </p>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-2 leading-relaxed">
          <p>
            IN NO EVENT SHALL AEGISSAFE AI TECHNOLOGIES PVT. LTD., ITS DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR EXEMPLARY DAMAGES (INCLUDING LOSS OF LIFE, BODILY INJURY, PROPERTY DAMAGE, LOSS OF EVIDENCE, OR OPERATIONAL DOWNTIME) ARISING OUT OF OR IN CONNECTION WITH:
          </p>
          <ol className="list-decimal list-inside space-y-1 pl-2">
            <li>ANY FAILURE OF THE AI SYSTEM TO DETECT AN ACT OF VIOLENCE, ASSAULT, OR DISTRESS;</li>
            <li>ANY FALSE-POSITIVE THREAT CLASSIFICATION OR ERRONEOUS DISPATCH;</li>
            <li>TELECOMMUNICATION GATEWAY OR SMS LATENCY PREVENTING HANDSET DELIVERY;</li>
            <li>CAMERA HARDWARE FAILURE, LOCAL WI-FI DROPOUTS, OR POWER DISRUPTIONS.</li>
          </ol>
          <p className="mt-2 text-slate-300">
            OUR TOTAL AGGREGATE LIABILITY ARISING FROM ALL CLAIMS SHALL BE STRICTLY LIMITED TO THE FEES PAID BY YOU TO AEGISSAFE AI FOR ACCESS TO THE SOFTWARE DURING THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE CLAIM.
          </p>
        </div>
      </section>

      {/* 9. Indemnification */}
      <section id="indemnification" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
          9. Indemnification
        </h2>
        <p className="text-slate-300 leading-relaxed text-xs sm:text-sm">
          You agree to defend, indemnify, and hold harmless AegisSafe AI Technologies Pvt. Ltd., its affiliates, officers, and engineers from and against any third-party claims, liabilities, damages, losses, or legal expenses arising from your unlawful camera installation, failure to display statutory CCTV signage, breach of the DPDP Act 2023, or violation of these Terms.
        </p>
      </section>

      {/* 10. Governing Law */}
      <section id="governing-law" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
          10. Governing Law & Dispute Resolution
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4 text-xs sm:text-sm">
          These Terms shall be governed by, construed, and enforced exclusively in accordance with the substantive <strong>laws of the Republic of India</strong>, without regard to conflict of law principles.
        </p>
        <p className="text-slate-300 leading-relaxed text-xs sm:text-sm">
          Any legal dispute, suit, or proceeding arising out of or related to these Terms or the System shall be subject to the exclusive jurisdiction of the competent civil courts situated in <strong>Bengaluru, Karnataka, India</strong>.
        </p>
      </section>
    </LegalLayout>
  );
};

export default TermsOfService;
