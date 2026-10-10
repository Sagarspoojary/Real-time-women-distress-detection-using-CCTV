import React, { useState } from "react";
import { 
  FiInfo, 
  FiVideo, 
  FiShield, 
  FiClock, 
  FiBell, 
  FiImage, 
  FiTool, 
  FiAlertTriangle, 
  FiMail, 
  FiHelpCircle,
  FiChevronDown,
  FiChevronUp
} from "react-icons/fi";

const FAQItem: React.FC<{ question: string; answer: React.ReactNode }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-700/50 last:border-0 py-3">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left text-slate-200 font-medium hover:text-cyan-400 transition-colors"
      >
        <span>{question}</span>
        {isOpen ? <FiChevronUp className="text-slate-400" /> : <FiChevronDown className="text-slate-400" />}
      </button>
      {isOpen && (
        <div className="mt-2 text-sm text-slate-400 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
};

const HelpSupport: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">Help & Technical Support</h1>
        <p className="text-slate-400">
          Documentation and troubleshooting for the Real-Time AI-Based Safety Monitoring System.
        </p>
      </div>

      {/* Emergency Disclaimer */}
      <div className="glass-panel p-6 rounded-xl border border-red-500/30 bg-red-500/5 flex items-start gap-4">
        <FiAlertTriangle className="text-red-500 text-3xl flex-shrink-0 mt-1" />
        <div>
          <h3 className="text-lg font-bold text-red-500 mb-2">Emergency Disclaimer</h3>
          <p className="text-sm text-red-200/80 leading-relaxed">
            This system is an AI-assisted monitoring tool and should not be treated as a replacement for emergency services or human judgment. In an actual emergency, contact the appropriate local emergency service directly.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Main Content (Left Column) */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* System Overview */}
          <section className="glass-panel p-6 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><FiInfo className="text-xl" /></div>
              <h2 className="text-xl font-semibold text-white">System Overview</h2>
            </div>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              The system provides real-time safety monitoring using computer vision and AI. It analyzes live video streams to identify potential acts of violence or distress.
            </p>
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 flex items-center justify-center">
              <div className="text-xs text-slate-500 font-mono flex flex-wrap items-center justify-center gap-2">
                <span className="text-cyan-400">Camera</span> &rarr; 
                <span className="text-blue-400">AI Analysis</span> &rarr; 
                <span className="text-emerald-400">Threat Detection</span> &rarr; 
                <span className="text-orange-400">Incident Generation</span> &rarr; 
                <span className="text-purple-400">Evidence</span> &rarr; 
                <span className="text-red-400">Alert</span> &rarr; 
                <span className="text-white">Dashboard</span>
              </div>
            </div>
          </section>

          {/* Camera Setup */}
          <section className="glass-panel p-6 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><FiVideo className="text-xl" /></div>
              <h2 className="text-xl font-semibold text-white">Camera Setup</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-md font-medium text-slate-200 mb-2">Laptop Camera</h3>
                <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
                  <li>Select <strong>Laptop Camera</strong> from the camera selector in the Live Detection page.</li>
                  <li>Allow the browser permission to access your webcam if prompted.</li>
                  <li>Click <strong>Start Monitoring</strong> to begin the analysis.</li>
                  <li>Ensure the camera is unobstructed and available.</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-md font-medium text-slate-200 mb-2">Mobile IP Webcam</h3>
                <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
                  <li>Connect the phone and computer to the <strong>same Wi-Fi network</strong>.</li>
                  <li>Start the <em>IP Webcam</em> application on your phone and tap "Start server".</li>
                  <li>Enter the displayed IP address (e.g., <code className="bg-slate-800 px-1 py-0.5 rounded">http://192.168.1.100:8080/video</code>) into the dashboard.</li>
                  <li>Select <strong>Mobile IP Webcam</strong> from the camera selector.</li>
                  <li>Click <strong>Start Monitoring</strong>.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Threat Detection */}
          <section className="glass-panel p-6 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><FiShield className="text-xl" /></div>
              <h2 className="text-xl font-semibold text-white">Threat Detection</h2>
            </div>
            <p className="text-sm text-slate-400 mb-3 leading-relaxed">
              The system analyzes camera frames continuously. Existing AI models classify observed activity while tracking individuals. 
            </p>
            <ul className="list-disc list-inside text-sm text-slate-400 space-y-2">
              <li><strong>Classification:</strong> The threat engine determines when an incident should be generated based on severity thresholds.</li>
              <li><strong>Evidence:</strong> Evidence is automatically associated with critical incidents.</li>
              <li><strong>Alerts:</strong> Alerts are generated according to the configured system behavior.</li>
            </ul>
            <p className="text-xs text-slate-500 mt-4 italic">
              Note: The system provides advanced AI-assisted detection but cannot perfectly guarantee the detection of all real-world violence. Lighting, camera angle, and framerate impact results.
            </p>
          </section>

          {/* Incident History & Evidence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="glass-panel p-6 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400"><FiClock className="text-xl" /></div>
                <h2 className="text-xl font-semibold text-white">Incident History</h2>
              </div>
              <p className="text-sm text-slate-400 mb-2">
                Users can view previous incidents in the <strong>History</strong> and <strong>Notifications</strong> pages.
              </p>
              <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
                <li>Displays timestamp, threat prediction, and confidence score.</li>
                <li>Live active incidents appear immediately in the left panel of the Notifications page.</li>
              </ul>
            </section>

            <section className="glass-panel p-6 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400"><FiImage className="text-xl" /></div>
                <h2 className="text-xl font-semibold text-white">Evidence</h2>
              </div>
              <p className="text-sm text-slate-400 mb-2">
                When a critical threat is confirmed, the system generates evidence:
              </p>
              <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
                <li><strong>Snapshot:</strong> A high-resolution JPEG image highlighting the detected threat.</li>
                <li><strong>Video Clip:</strong> A short MP4 recording of the moments leading up to the incident.</li>
              </ul>
            </section>
          </div>

        </div>

        {/* Sidebar Content (Right Column) */}
        <div className="space-y-6">
          
          {/* Alerts / Notifications */}
          <section className="glass-panel p-6 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg text-red-400"><FiBell className="text-xl" /></div>
              <h2 className="text-xl font-semibold text-white">Alerts / Notifications</h2>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-slate-400">
                The system uses an Alert Dispatcher to notify emergency contacts during a confirmed threat.
              </p>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                <h4 className="text-sm font-semibold text-slate-300 mb-1">Email Alerts</h4>
                <p className="text-xs text-slate-500">Fully implemented. Dispatches HTML emails containing the evidence snapshot inline and the video clip as an attachment to all configured contacts.</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                <h4 className="text-sm font-semibold text-slate-300 mb-1">SMS Notifications</h4>
                <p className="text-xs text-slate-500">Supported via Fast2SMS but currently dependent on API key configuration (falls back to Mock mode if unconfigured).</p>
              </div>
            </div>
          </section>

          {/* Troubleshooting */}
          <section className="glass-panel p-6 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400"><FiTool className="text-xl" /></div>
              <h2 className="text-xl font-semibold text-white">Troubleshooting</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-slate-200">Camera not working</h4>
                <ul className="text-xs text-slate-400 list-disc list-inside mt-1 space-y-1">
                  <li>Check browser permissions.</li>
                  <li>Check whether another application is using the camera.</li>
                  <li>Restart the camera source.</li>
                  <li>Check the selected camera.</li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-200">Mobile IP Webcam not connecting</h4>
                <ul className="text-xs text-slate-400 list-disc list-inside mt-1 space-y-1">
                  <li>Verify phone and PC are on the same network.</li>
                  <li>Verify IP Webcam is running on the phone.</li>
                  <li>Verify the configured URL.</li>
                  <li>Check firewall/network connectivity.</li>
                  <li>Check that the phone's IP address has not changed.</li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-200">No incidents appearing</h4>
                <ul className="text-xs text-slate-400 list-disc list-inside mt-1 space-y-1">
                  <li>Verify monitoring is running.</li>
                  <li>Check camera input.</li>
                  <li>Check dashboard/history.</li>
                  <li>Check backend terminal logs for AI worker status.</li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-200">No email alert</h4>
                <ul className="text-xs text-slate-400 list-disc list-inside mt-1 space-y-1">
                  <li>Verify email configuration in the Settings page.</li>
                  <li>Check spam/junk folder.</li>
                  <li>Verify SMTP configuration in the backend `.env`.</li>
                  <li>Check backend logs for dispatch errors.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Contact Support */}
          <section className="glass-panel p-6 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-slate-700/50 rounded-lg text-slate-300"><FiMail className="text-xl" /></div>
              <h2 className="text-xl font-semibold text-white">Support Info</h2>
            </div>
            <p className="text-sm text-slate-400">
              Refer to the project administrator or deployment documentation for configuration and support.
            </p>
          </section>

        </div>
      </div>

      {/* FAQ Section */}
      <section className="glass-panel p-6 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><FiHelpCircle className="text-xl" /></div>
          <h2 className="text-xl font-semibold text-white">Frequently Asked Questions</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
          <div>
            <FAQItem 
              question="How do I start monitoring?"
              answer="Navigate to the Live Detection page, select your camera source, and click 'Start Monitoring'. The AI will immediately begin processing frames."
            />
            <FAQItem 
              question="How do I switch between cameras?"
              answer="Stop the current monitoring session, use the 'Camera Source' dropdown to select a different input, and restart monitoring."
            />
            <FAQItem 
              question="How do I connect Mobile IP Webcam?"
              answer="Ensure your phone and PC are on the same Wi-Fi. Open the IP Webcam app on your phone, start the server, and enter the provided URL (e.g. http://192.168.x.x:8080/video) into the dashboard input before starting."
            />
            <FAQItem 
              question="Why did I not receive an alert?"
              answer="Alerts are subject to a cooldown period (default 5 minutes) to prevent spam. If it's a fresh incident, verify your email configuration in Settings and check your spam folder."
            />
          </div>
          <div>
            <FAQItem 
              question="Where can I view incidents?"
              answer="All detected incidents are available in the Notifications panel (for active/recent alerts) and the History page (for older logs)."
            />
            <FAQItem 
              question="Where can I view evidence?"
              answer="Evidence such as video clips and snapshots are sent directly to the configured emergency contacts via email. A summary of the event is logged in the dashboard."
            />
            <FAQItem 
              question="Why is my camera not connecting?"
              answer="If using a laptop camera, ensure browser permissions are granted. If using an IP Webcam, ensure no firewalls are blocking the connection on your local network."
            />
          </div>
        </div>
      </section>

    </div>
  );
};

export default HelpSupport;
