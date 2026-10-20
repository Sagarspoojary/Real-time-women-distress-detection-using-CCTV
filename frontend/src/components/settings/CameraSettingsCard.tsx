import React, { useState, useEffect, useCallback } from "react";
import {
  FiCamera,
  FiEdit2,
  FiSave,
  FiX,
  FiPlay,
  FiSquare,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertTriangle,
  FiWifi,
  FiLock,
  FiInfo,
  FiZap,
  FiGlobe
} from "react-icons/fi";
import toast from "react-hot-toast";
import {
  fetchCameraConfig,
  updateCameraConfig,
  testCameraConnection,
  connectIpWebcam,
  disconnectIpWebcam,
  fetchCameraStatus,
  discoverLocalCameras,
  type CameraConfig,
  type CameraTestResult,
  type CameraTelemetryStatus
} from "../../services/api";

interface CameraSettingsCardProps {
  onStatusChange?: (status: CameraTelemetryStatus) => void;
  standalone?: boolean;
}

const CameraSettingsCard: React.FC<CameraSettingsCardProps> = ({
  onStatusChange,
  standalone = false,
}) => {
  const [config, setConfig] = useState<CameraConfig | null>(null);
  const [status, setStatus] = useState<CameraTelemetryStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  // Form Fields
  const [name, setName] = useState("Android IP Webcam");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(8080);
  const [path, setPath] = useState("/videofeed");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [autoReconnect, setAutoReconnect] = useState(true);

  // Operation States
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<CameraTestResult | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([]);
  const [showDiscovery, setShowDiscovery] = useState(false);

  // Load initial configuration
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, stat] = await Promise.all([
        fetchCameraConfig(),
        fetchCameraStatus()
      ]);
      setConfig(cfg);
      setStatus(stat);

      setName(cfg.name || "Android IP Webcam");
      setHost(cfg.host || "");
      setPort(cfg.port || 8080);
      setPath(cfg.path || "/videofeed");
      setUsername(cfg.username || "");
      setPassword(""); // Passwords never fetched back to browser
      setAutoReconnect(cfg.auto_reconnect !== false);

      if (onStatusChange) {
        onStatusChange(stat);
      }
    } catch (err: any) {
      console.error("Failed to load camera settings:", err);
      toast.error("Failed to load camera settings.");
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Periodic status refresh
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const stat = await fetchCameraStatus();
        setStatus(stat);
        if (onStatusChange) {
          onStatusChange(stat);
        }
      } catch {
        // ignore background poll errors
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [onStatusChange]);

  // Start Editing
  const handleStartEdit = () => {
    if (config) {
      setName(config.name || "Android IP Webcam");
      setHost(config.host || "");
      setPort(config.port || 8080);
      setPath(config.path || "/videofeed");
      setUsername(config.username || "");
      setPassword("");
      setAutoReconnect(config.auto_reconnect !== false);
    }
    setTestResult(null);
    setEditing(true);
  };

  // Cancel Editing
  const handleCancelEdit = () => {
    if (config) {
      setName(config.name || "Android IP Webcam");
      setHost(config.host || "");
      setPort(config.port || 8080);
      setPath(config.path || "/videofeed");
      setUsername(config.username || "");
      setPassword("");
      setAutoReconnect(config.auto_reconnect !== false);
    }
    setTestResult(null);
    setEditing(false);
  };

  // Save Changes
  const handleSaveChanges = async () => {
    if (!host.trim()) {
      toast.error("Please enter a valid IP address or hostname.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name: name.trim() || "Android IP Webcam",
        host: host.trim(),
        port: Number(port) || 8080,
        path: path.trim() || "/videofeed",
        username: username.trim() || null,
        auto_reconnect: autoReconnect,
      };

      if (password) {
        payload.password = password;
      } else if (config?.has_password) {
        payload.retain_existing_password = true;
      }

      const res = await updateCameraConfig(payload, "operator");
      setConfig(res.config);
      setEditing(false);
      setTestResult(null);

      toast.success(res.message || "Camera configuration saved successfully!");

      // Refresh status
      const stat = await fetchCameraStatus();
      setStatus(stat);
      if (onStatusChange) onStatusChange(stat);
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || err.message || "Failed to update configuration.";
      toast.error(detail);
    } finally {
      setSaving(false);
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    const targetHost = editing ? host.trim() : (config?.host || "");
    const targetPort = editing ? Number(port) : (config?.port || 8080);
    const targetPath = editing ? path.trim() : (config?.path || "/videofeed");
    const targetUser = editing ? username.trim() : (config?.username || "");
    const targetPass = editing ? password : "";

    if (!targetHost) {
      toast.error("No IP address specified. Please provide a camera host.");
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await testCameraConnection({
        host: targetHost,
        port: targetPort,
        path: targetPath,
        username: targetUser || undefined,
        password: targetPass || undefined,
      });
      setTestResult(res);
      if (res.success) {
        toast.success(res.message || `Connected in ${res.latency_ms}ms!`);
      } else {
        toast.error(res.message || "Camera is unreachable.");
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to test connection.";
      setTestResult({
        success: false,
        status_code: null,
        latency_ms: null,
        url_masked: null,
        message: msg,
      });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  // Connect Camera
  const handleConnect = async () => {
    if (!config?.is_configured && !host) {
      toast.error("Camera is unconfigured. Please enter your phone's IP address first.");
      setEditing(true);
      return;
    }

    setConnecting(true);
    try {
      await connectIpWebcam();
      toast.success("Camera connected! AI inference active.");
      const stat = await fetchCameraStatus();
      setStatus(stat);
      if (onStatusChange) onStatusChange(stat);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to connect camera.";
      toast.error(msg);
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect Camera
  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectIpWebcam();
      toast.success("Camera disconnected.");
      const stat = await fetchCameraStatus();
      setStatus(stat);
      if (onStatusChange) onStatusChange(stat);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to disconnect camera.";
      toast.error(msg);
    } finally {
      setDisconnecting(false);
    }
  };

  // Discover Local Cameras
  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const devices = await discoverLocalCameras();
      setDiscoveredDevices(devices);
      setShowDiscovery(true);
      if (devices.length > 0) {
        toast.success(`Found ${devices.length} camera(s) on local Wi-Fi!`);
      } else {
        toast("No IP Webcam servers found on the current local subnet.", { icon: "ℹ️" });
      }
    } catch (err: any) {
      toast.error("Failed to scan local network.");
    } finally {
      setDiscovering(false);
    }
  };

  const selectDiscoveredCamera = (device: any) => {
    setHost(device.host);
    setPort(device.port || 8080);
    setPath(device.path || "/videofeed");
    setEditing(true);
    setShowDiscovery(false);
    toast.success(`Selected ${device.host}:${device.port}. Click Save Changes to apply.`);
  };

  // Connection State Determination
  const isRunning = Boolean(status?.running);
  const connState = status?.connection_state || (config?.is_configured ? "DISCONNECTED" : "UNCONFIGURED");

  const getBadgeStyle = () => {
    switch (connState) {
      case "CONNECTED":
        return "bg-emerald-950/40 border-emerald-500/30 text-emerald-400";
      case "CONNECTING":
        return "bg-blue-950/40 border-blue-500/30 text-blue-400";
      case "ERROR":
        return "bg-rose-950/40 border-rose-500/30 text-rose-400";
      case "UNCONFIGURED":
        return "bg-amber-950/40 border-amber-500/30 text-amber-400";
      case "DISCONNECTED":
      default:
        return "bg-slate-900 border-slate-800 text-slate-400";
    }
  };

  return (
    <div className={`p-5 bg-slate-950/40 border border-cyan-900/30 rounded-2xl space-y-4 select-none ${standalone ? 'shadow-2xl' : ''}`}>
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-inner">
            <FiCamera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-xs uppercase tracking-wider flex items-center gap-2">
              {config?.name || "Android IP Webcam"}
              {loading && <FiRefreshCw className="w-3 h-3 animate-spin text-cyan-400" />}
            </h3>
            <p className="text-[10px] text-slate-400">
              Live mobile camera feed over same local Wi-Fi network
            </p>
          </div>
        </div>

        {/* State Badges & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase border flex items-center gap-1.5 ${getBadgeStyle()}`}>
            {connState === "CONNECTED" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            {connState === "CONNECTING" && <FiRefreshCw className="w-3 h-3 animate-spin" />}
            {connState === "ERROR" && <FiAlertTriangle className="w-3 h-3" />}
            {connState}
          </span>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Refresh Status"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Active Stream Metadata Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80 text-[11px]">
        <div>
          <span className="text-[9px] text-slate-500 block uppercase font-bold">Active Stream URL</span>
          <span className="font-mono font-bold text-cyan-400 truncate block">
            {config?.active_url_masked || <span className="text-amber-400 italic">Unconfigured</span>}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 block uppercase font-bold">Last Successful Connection</span>
          <span className="text-slate-300 font-medium">
            {config?.last_connected_at
              ? new Date(config.last_connected_at).toLocaleString()
              : "Never connected"}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 block uppercase font-bold">Processing Metrics</span>
          <span className="text-slate-300 font-mono text-[10px]">
            {isRunning
              ? `${status?.camera_fps || 0} FPS | ${status?.frames_processed || 0} frames`
              : "Stream Idle"}
          </span>
        </div>
      </div>

      {/* Error Banner if any */}
      {(status?.last_error || config?.last_error) && connState === "ERROR" && (
        <div className="p-3 bg-rose-950/30 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-start gap-2">
          <FiAlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-grow">
            <span className="font-bold block uppercase text-[10px]">Connection Error</span>
            <span className="text-[11px] leading-relaxed">{status?.last_error || config?.last_error}</span>
          </div>
        </div>
      )}

      {/* Form Fields: Read-only or Editable */}
      <div className="space-y-3 pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          
          {/* Camera Name */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Camera Name</label>
            <input
              type="text"
              disabled={!editing}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Android IP Webcam"
              className="w-full px-3 py-1.5 rounded-lg glass-input text-slate-200 text-xs border border-slate-700/60 focus:border-cyan-400 disabled:opacity-70 disabled:cursor-not-allowed"
            />
          </div>

          {/* Hostname or IPv4 Address */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1 flex items-center gap-1">
              <FiGlobe className="w-3 h-3 text-cyan-400" /> Hostname or IPv4 Address
            </label>
            <input
              type="text"
              disabled={!editing}
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="e.g. 192.168.1.100"
              className="w-full px-3 py-1.5 rounded-lg glass-input text-slate-200 font-mono text-xs border border-slate-700/60 focus:border-cyan-400 disabled:opacity-70 disabled:cursor-not-allowed"
            />
          </div>

          {/* HTTP Port */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">HTTP Port (Default: 8080)</label>
            <input
              type="number"
              disabled={!editing}
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              placeholder="8080"
              className="w-full px-3 py-1.5 rounded-lg glass-input text-slate-200 font-mono text-xs border border-slate-700/60 focus:border-cyan-400 disabled:opacity-70 disabled:cursor-not-allowed"
            />
          </div>

          {/* Stream Path */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Stream Path (Default: /videofeed)</label>
            <input
              type="text"
              disabled={!editing}
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/videofeed or /video"
              className="w-full px-3 py-1.5 rounded-lg glass-input text-slate-200 font-mono text-xs border border-slate-700/60 focus:border-cyan-400 disabled:opacity-70 disabled:cursor-not-allowed"
            />
          </div>

          {/* Username */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Username (Optional)</label>
            <input
              type="text"
              disabled={!editing}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Leave empty if none"
              className="w-full px-3 py-1.5 rounded-lg glass-input text-slate-200 text-xs border border-slate-700/60 focus:border-cyan-400 disabled:opacity-70 disabled:cursor-not-allowed"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1 flex items-center gap-1">
              <FiLock className="w-3 h-3 text-cyan-400" /> Password (Optional)
            </label>
            <input
              type="password"
              disabled={!editing}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={config?.has_password ? "•••••••• (Password configured)" : "Leave empty if none"}
              className="w-full px-3 py-1.5 rounded-lg glass-input text-slate-200 text-xs border border-slate-700/60 focus:border-cyan-400 disabled:opacity-70 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Test Result Message Box */}
        {testResult && (
          <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
            testResult.success
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
          }`}>
            {testResult.success ? (
              <FiCheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <FiAlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-grow">
              <span className="font-bold block uppercase text-[10px]">
                {testResult.success ? "Connection Verified" : "Handshake Failed"}
              </span>
              <p className="text-[11px] leading-relaxed">{testResult.message}</p>
              {testResult.latency_ms !== null && (
                <span className="font-mono text-[10px] opacity-80 mt-0.5 block">
                  Round-trip latency: {testResult.latency_ms}ms
                </span>
              )}
            </div>
          </div>
        )}

        {/* Discovered Cameras Dropdown List */}
        {showDiscovery && discoveredDevices.length > 0 && (
          <div className="p-3 bg-slate-900/80 border border-cyan-800/40 rounded-xl space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-cyan-300 flex items-center gap-1">
              <FiWifi className="w-3.5 h-3.5" /> Available Cameras Found on Local Subnet
            </span>
            <div className="space-y-1.5">
              {discoveredDevices.map((dev, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-colors"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-200 text-xs">{dev.host}:{dev.port}</span>
                    <span className="text-[10px] text-slate-500 block">{dev.name} ({dev.latency_ms}ms)</span>
                  </div>
                  <button
                    onClick={() => selectDiscoveredCamera(dev)}
                    className="px-2.5 py-1 rounded bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-900/60">
          
          {/* Left Buttons: Edit / Save / Cancel */}
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleSaveChanges}
                  disabled={saving || !host.trim()}
                  className="px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <FiRefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FiSave className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <FiX className="w-3.5 h-3.5" /> Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleStartEdit}
                className="px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <FiEdit2 className="w-3.5 h-3.5 text-cyan-400" /> Edit Configuration
              </button>
            )}

            <button
              onClick={handleTestConnection}
              disabled={testing || (!host && !config?.host)}
              className="px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Test IP reachability and HTTP handshake"
            >
              {testing ? <FiRefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <FiZap className="w-3.5 h-3.5 text-amber-400" />}
              Test Connection
            </button>

            <button
              onClick={handleDiscover}
              disabled={discovering}
              className="px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
              title="Scan local /24 subnet for IP Webcam app"
            >
              <FiWifi className={`w-3.5 h-3.5 ${discovering ? 'animate-spin text-cyan-400' : ''}`} />
              {discovering ? "Scanning..." : "Discover"}
            </button>
          </div>

          {/* Right Buttons: Connect / Disconnect */}
          <div className="flex items-center gap-2">
            {!isRunning ? (
              <button
                onClick={handleConnect}
                disabled={connecting || (!config?.is_configured && !host)}
                className="px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connecting ? <FiRefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FiPlay className="w-3.5 h-3.5" />}
                Connect Camera
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-rose-400 hover:text-rose-300 cursor-pointer disabled:opacity-50"
              >
                {disconnecting ? <FiRefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FiSquare className="w-3.5 h-3.5" />}
                Disconnect Camera
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Guide Note */}
      <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-900 text-[10px] text-slate-400 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-300 uppercase tracking-wide">
          <FiInfo className="text-cyan-400 w-3.5 h-3.5" /> How to connect your Android phone:
        </div>
        <ol className="list-decimal list-inside space-y-1 text-slate-400 leading-relaxed pl-1">
          <li>Ensure your Android phone and this computer are connected to the <strong className="text-slate-300">same Wi-Fi network</strong>.</li>
          <li>Open the <strong className="text-slate-300">IP Webcam</strong> app on Android, scroll to the bottom, and tap <strong className="text-slate-300">Start server</strong>.</li>
          <li>Look at the URL on the phone screen (e.g., <code className="text-cyan-400 font-mono">http://192.168.1.100:8080</code>).</li>
          <li>Enter the IP address above and click <strong className="text-slate-300">Save Changes</strong>. The camera connects automatically without restarting the server!</li>
        </ol>
      </div>

    </div>
  );
};

export default CameraSettingsCard;
