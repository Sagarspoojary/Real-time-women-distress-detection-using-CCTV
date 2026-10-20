import React from "react";
import { LegalLayout } from "../../components/legal/LegalLayout";
import { FiShield, FiAlertCircle, FiLock, FiCheckCircle } from "react-icons/fi";

const tocItems = [
  { id: "introduction", label: "1. Introduction & Scope" },
  { id: "data-fiduciary", label: "2. Data Fiduciary & Identity" },
  { id: "data-collected", label: "3. Categories of Data Collected" },
  { id: "purpose-limitation", label: "4. Purpose & Legal Basis (DPDP Act)" },
  { id: "biometrics", label: "5. Computer Vision & Biometric Notice" },
  { id: "retention", label: "6. Data Retention & Auto-Purge" },
  { id: "security", label: "7. Security Safeguards" },
  { id: "data-principal-rights", label: "8. Rights of Data Principals" },
  { id: "cctv-signage", label: "9. CCTV Signage & Operator Duties" },
  { id: "grievance", label: "10. Grievance Redressal Mechanism" },
];

export const PrivacyPolicy: React.FC = () => {
  return (
    <LegalLayout
      title="Privacy Policy & Data Protection Notice"
      subtitle="Compliant with India's Digital Personal Data Protection (DPDP) Act, 2023 and the Information Technology Act, 2000."
      effectiveDate="October 20, 2024"
      lastUpdated="October 20, 2026"
      toc={tocItems}
    >
      {/* 1. Introduction */}
      <section id="introduction" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <span className="p-2 bg-cyan-950/60 border border-cyan-500/30 rounded-lg text-cyan-400 text-lg">
            <FiShield />
          </span>
          1. Introduction & Statutory Scope
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          This Privacy Policy and Data Protection Notice (“Privacy Policy”) governs the collection, processing, storage, and protection of digital personal data by <strong>AegisSafe AI Technologies Pvt. Ltd.</strong> (“Company”, “we”, “our”, or “us”) in connection with the <strong>Women Distress Detection AI and CCTV Surveillance Platform</strong> (“System” or “Platform”).
        </p>
        <p className="text-slate-300 leading-relaxed mb-4">
          This policy is formulated in strict accordance with the provisions of:
        </p>
        <ul className="list-disc list-inside space-y-2 text-slate-400 pl-2">
          <li><strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>, enacted by the Parliament of India;</li>
          <li><strong>Information Technology Act, 2000 (IT Act)</strong>, and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011;</li>
          <li>Applicable Indian guidelines on electronic surveillance and closed-circuit television (CCTV) operation in public and commercial premises.</li>
        </ul>
        <div className="mt-5 p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200 flex items-start gap-3">
          <FiAlertCircle className="text-cyan-400 text-lg flex-shrink-0 mt-0.5" />
          <span>
            <strong>Key Guarantee:</strong> We operate on the principle of <em>Data Minimization</em>. We do not sell, rent, or monetize video streams or personal data. We do not use third-party behavioral advertising trackers, cookies, or external surveillance analytics.
          </span>
        </div>
      </section>

      {/* 2. Data Fiduciary */}
      <section id="data-fiduciary" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
          2. Data Fiduciary Identity & Contact Details
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Under Section 2(i) of the DPDP Act 2023, the entity that determines the purpose and means of the processing of personal data is the <strong>Data Fiduciary</strong>:
        </p>
        <div className="bg-slate-900/70 p-5 rounded-xl border border-slate-800 text-xs sm:text-sm space-y-2 font-mono">
          <p><span className="text-cyan-400">Legal Entity Name:</span> AegisSafe AI Technologies Private Limited</p>
          <p><span className="text-cyan-400">CIN:</span> U72900KA2024PTC184920</p>
          <p><span className="text-cyan-400">Registered Office:</span> Tech Park Central, 4th Floor, Outer Ring Road, Bellandur, Bengaluru, Karnataka 560103, India</p>
          <p><span className="text-cyan-400">Official Portal:</span> https://aegissafe.ai</p>
          <p><span className="text-cyan-400">Data Protection Officer:</span> dpo@aegissafe.ai</p>
          <p><span className="text-cyan-400">Grievance Redressal Officer:</span> grievance@aegissafe.ai</p>
        </div>
        <p className="text-xs text-slate-400 mt-4 leading-relaxed">
          <em>Note:</em> Where the platform is deployed on-premise by third-party institutional clients (such as educational institutions, residential complexes, metro transit authorities, or corporate campuses), the deploying client acts as the primary Data Fiduciary for footage originating from their cameras, and AegisSafe AI acts as the Data Processor.
        </p>
      </section>

      {/* 3. Categories of Data Collected */}
      <section id="data-collected" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
          3. Categories of Data Collected (Data Minimization)
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          We strictly restrict collection to data technically essential for public safety surveillance, distress detection, and verified operator access:
        </p>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h3 className="font-bold text-white text-sm mb-1 text-cyan-400">A. Operator Account & Authentication Data</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Full Name, official email address, hashed and salted password (via Firebase Auth / Argon2), role designation (Admin, Operator, Security Officer), and authentication session timestamps.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h3 className="font-bold text-white text-sm mb-1 text-cyan-400">B. Video Surveillance Feeds & Spatial Telemetry</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Optical frame buffers from connected CCTV RTSP streams, laptop webcams, or local IP Webcam feeds (e.g., <code>http://192.168.x.x:8080/videofeed</code>). Bounding-box coordinates, frame timestamps, and spatial movement trajectories generated by YOLO and ByteTrack.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h3 className="font-bold text-white text-sm mb-1 text-cyan-400">C. Distress Incident Evidence (Generated Only Upon Threat Confirmation)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When the AI pipeline confirms an anomaly meeting severity thresholds (e.g., violence, severe distress gestures, physical assault):
            </p>
            <ul className="list-disc list-inside text-xs text-slate-400 mt-2 space-y-1 pl-2">
              <li><strong>Snapshot Frame:</strong> Single high-resolution JPEG showing the bounding box and timestamp of the alert event;</li>
              <li><strong>Triggered Evidence Clip:</strong> Standard 10-second MP4 video clip recording the incident for investigative review;</li>
              <li><strong>Debug Classification Crops:</strong> Bounding crops used solely for verifying model precision (e.g. gender and person verification).</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h3 className="font-bold text-white text-sm mb-1 text-cyan-400">D. Emergency Dispatch & Telemetry Data</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Designated emergency recipient mobile phone numbers in E.164 format (e.g., <code>+918296387497</code>) configured by operators in Dashboard Settings, dispatch logs, and SMS delivery batch IDs via our TextBee SMS gateway.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Purpose & Legal Basis */}
      <section id="purpose-limitation" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
          4. Purpose Limitation & Legal Grounds under DPDP Act 2023
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          In accordance with Section 4 and Section 7 of the DPDP Act 2023, personal data is processed solely under the following legitimate grounds:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <FiCheckCircle /> Legitimate Uses (Sec. 7)
            </div>
            <p className="text-slate-400 leading-relaxed">
              Processing for responding to medical emergencies, physical assault, threats to life, and public safety anomalies in surveyed premises.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <FiCheckCircle /> Informed Consent (Sec. 6)
            </div>
            <p className="text-slate-400 leading-relaxed">
              Operators and emergency contacts give affirmative, unambiguous consent during registration and settings configuration.
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-red-950/20 border border-red-500/30 text-xs text-red-200 space-y-1">
          <p className="font-bold uppercase tracking-wider text-red-400">Strict Prohibitions:</p>
          <p>
            Surveillance footage and derived metadata are NEVER sold, rented, monetized, traded, or shared with commercial data brokers, advertising agencies, or marketing networks.
          </p>
        </div>
      </section>

      {/* 5. Biometrics & Computer Vision */}
      <section id="biometrics" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
          5. Computer Vision & Biometric Notice
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          The system employs advanced deep learning pipelines, including <strong>VideoMAE Action Transformers</strong>, <strong>YOLO11 Object Detectors</strong>, and <strong>EfficientNetV2 Gender Classifiers</strong>.
        </p>
        <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
          <p>
            <strong>Transient In-Memory Feature Analysis:</strong> Live camera frames are converted into numerical tensors within volatile RAM memory. The AI classifies human action patterns (e.g., normal walking, distress running, falling, physical conflict).
          </p>
          <p>
            <strong>No National Biometric Database:</strong> We do NOT extract or store biometric templates to cross-reference against national identity systems (e.g., Aadhaar, CCTNS, or passports). Facial crops are used strictly for local forensic logging and gender voting to minimize false positives in women distress screening.
          </p>
          <p>
            <strong>Section 9 Notice (Children's Data):</strong> In compliance with Section 9 of the DPDP Act 2023, the platform does not engage in behavioral tracking, targeted profiling, or advertising directed at children. Surveillance is focused purely on physical safety anomalies.
          </p>
        </div>
      </section>

      {/* 6. Retention & Auto-Purge */}
      <section id="retention" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
          6. Data Retention & Automated Evidence Purge
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          To prevent unnecessary data accumulation, we enforce strict automated lifecycle retention rules:
        </p>
        <div className="space-y-3 text-xs sm:text-sm text-slate-300">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center">
            <div>
              <p className="font-bold text-white">Automated Evidence Retention Limit</p>
              <p className="text-xs text-slate-400">Triggered video clips and evidence snapshots</p>
            </div>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-mono font-bold">
              7 Calendar Days
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center">
            <div>
              <p className="font-bold text-white">Debug Classification Crops</p>
              <p className="text-xs text-slate-400">Temporary facial and bounding crops in outputs/debug_gender/</p>
            </div>
            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg font-mono font-bold">
              7 Calendar Days
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center">
            <div>
              <p className="font-bold text-white">Continuous Normal Frame Buffers</p>
              <p className="text-xs text-slate-400">Video frames where no threat or distress is detected</p>
            </div>
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg font-mono font-bold">
              Transient (0s)
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4 leading-relaxed">
          Our background daemon (<code>services/evidence_cleanup_service.py</code>) runs continuously and permanently unlinks files older than the retention threshold. Authorized operators can also immediately delete any file on-demand via the <strong>Outputs Vault</strong>.
        </p>
      </section>

      {/* 7. Security Safeguards */}
      <section id="security" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <span className="p-2 bg-indigo-950/60 border border-indigo-500/30 rounded-lg text-indigo-400 text-lg">
            <FiLock />
          </span>
          7. Technical & Organizational Security Safeguards
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Under Section 8(5) of the DPDP Act 2023, we implement reasonable security safeguards to prevent personal data breaches:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h4 className="font-bold text-white mb-1 text-cyan-400">Encryption in Transit & Rest</h4>
            <p className="text-slate-400">TLS 1.3 encryption across all HTTPS/WSS endpoints. Database credentials and API secrets protected in environment vaults.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h4 className="font-bold text-white mb-1 text-cyan-400">Local-Network First</h4>
            <p className="text-slate-400">IP Webcam and CCTV feeds stream over private LAN subnets without routing raw feeds through public cloud relays.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h4 className="font-bold text-white mb-1 text-cyan-400">Role-Based Access Control</h4>
            <p className="text-slate-400">Fine-grained clearance levels for Admin, Operator, and Auditor profiles preventing unauthorized evidence exports.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h4 className="font-bold text-white mb-1 text-cyan-400">Breach Notification</h4>
            <p className="text-slate-400">Mandatory statutory notification to the Data Protection Board of India (DPBI) and affected Data Principals in the event of any security incident.</p>
          </div>
        </div>
      </section>

      {/* 8. Rights of Data Principals */}
      <section id="data-principal-rights" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
          8. Rights of Data Principals under DPDP Act 2023
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Every individual whose personal data or surveillance footage is captured is entitled to statutory rights under Chapter III of the DPDP Act 2023:
        </p>
        <div className="space-y-3 text-xs sm:text-sm">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <strong className="text-cyan-400 block mb-0.5">1. Right to Access Information (Section 11)</strong>
            <span className="text-slate-400">You have the right to obtain a summary of digital personal data being processed and identities of all entities with whom it has been shared.</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <strong className="text-cyan-400 block mb-0.5">2. Right to Correction & Erasure (Section 12)</strong>
            <span className="text-slate-400">You may request the correction of inaccurate data or the deletion of evidence records, except where preservation is required by applicable law or active criminal investigation.</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <strong className="text-cyan-400 block mb-0.5">3. Right of Grievance Redressal (Section 13)</strong>
            <span className="text-slate-400">You have the right to register a grievance with our designated Grievance Officer and receive formal redressal within 30 days.</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <strong className="text-cyan-400 block mb-0.5">4. Right to Nominate (Section 14)</strong>
            <span className="text-slate-400">You may nominate another individual to exercise your rights under the DPDP Act in the event of death or incapacity.</span>
          </div>
        </div>
      </section>

      {/* 9. CCTV Signage & Operator Duties */}
      <section id="cctv-signage" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
          9. Mandatory CCTV Signage & Operator Obligations
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Deployers and facility operators utilizing this software are legally required to comply with the following mandatory surveillance governance standards:
        </p>
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2">
          <p className="font-bold uppercase tracking-wider text-amber-400">Physical Signage Requirement:</p>
          <p>
            Prominent bilingual or multilingual signage must be visibly posted at every ingress and perimeter point of the surveyed space:
          </p>
          <div className="p-3 rounded-lg bg-black/50 border border-amber-500/40 font-mono text-[11px] text-amber-300">
            “NOTICE: THIS PREMISES IS MONITORED BY 24x7 CCTV & AI VIDEO ANALYTICS FOR WOMEN SAFETY & PUBLIC CRIME PREVENTION. PURPOSE: EMERGENCY DISTRESS RESPONSE. DATA FIDUCIARY: [OPERATOR NAME]. CONTACT: [EMAIL/PHONE].”
          </div>
        </div>
      </section>

      {/* 10. Grievance Redressal */}
      <section id="grievance" className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
          10. Grievance Redressal Mechanism & Officer Details
        </h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          In compliance with Section 13(2) of the DPDP Act 2023 and Rule 5(9) of the Information Technology Rules, 2011, any inquiries, privacy concerns, or data erasure requests must be addressed to our Grievance Redressal Officer:
        </p>
        <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800 text-xs sm:text-sm space-y-2">
          <p><strong className="text-white">Grievance Officer:</strong> Mr. Arvind Raman</p>
          <p><strong className="text-white">Designation:</strong> Head of Compliance & Data Protection</p>
          <p><strong className="text-white">Address:</strong> AegisSafe AI Technologies Pvt. Ltd., Tech Park Central, Outer Ring Road, Bengaluru, Karnataka 560103, India</p>
          <p><strong className="text-white">Official Grievance Email:</strong> <a href="mailto:grievance@aegissafe.ai" className="text-cyan-400 underline">grievance@aegissafe.ai</a></p>
          <p><strong className="text-white">Privacy Inquiries:</strong> <a href="mailto:privacy@aegissafe.ai" className="text-cyan-400 underline">privacy@aegissafe.ai</a></p>
          <p><strong className="text-white">Statutory Acknowledgment:</strong> Within 48 hours</p>
          <p><strong className="text-white">Statutory Resolution SLA:</strong> Within 30 calendar days</p>
        </div>
        <p className="text-xs text-slate-400 mt-4 leading-relaxed">
          If you remain unsatisfied with our redressal, you retain the statutory right to escalate the matter to the <strong>Data Protection Board of India (DPBI)</strong> in accordance with Section 28 of the DPDP Act, 2023.
        </p>
      </section>
    </LegalLayout>
  );
};

export default PrivacyPolicy;
