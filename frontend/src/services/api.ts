import axios from "axios";

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== "") {
    return envUrl;
  }
  if (typeof window !== "undefined" && window.location) {
    if (window.location.port === "5173") {
      return "http://127.0.0.1:8000";
    }
    return window.location.origin;
  }
  return "http://127.0.0.1:8000";
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000, // 10 minutes timeout since video processing can take some time
});

export const uploadAndAnalyzeVideo = async (
  file: File,
  onUploadProgress?: (progressEvent: any) => void,
  locationData?: {
    latitude?: number | null;
    longitude?: number | null;
    accuracy?: number | null;
    timestamp?: number | null;
  }
) => {
  const formData = new FormData();
  formData.append("file", file);
  // Only send coordinates if they are authoritative (configured CCTV or manual)
  if (locationData?.latitude != null && (locationData as any)?.source !== "browser_ip_approx") {
    formData.append("latitude", String(locationData.latitude));
    formData.append("longitude", String(locationData.longitude));
    if (locationData?.accuracy != null) formData.append("accuracy", String(locationData.accuracy));
    if (locationData?.timestamp != null) formData.append("timestamp", String(locationData.timestamp));
  }

  const correlationId = "manual-" + Math.random().toString(36).substring(2, 10);
  const response = await api.post("/predict", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      "X-Request-Origin": "manual_upload",
      "X-Correlation-ID": correlationId,
    },
    onUploadProgress,
  });

  return response.data;
};

export const fetchHistory = async (skip: number = 0, limit: number = 50) => {
  const response = await api.get(`/api/v1/history?skip=${skip}&limit=${limit}`);
  return response.data;
};

export interface OutputItem {
  filename: string;
  category: "whole_images" | "triggered_clips" | "debug_gender";
  url: string;
  size_bytes: number;
  size_formatted: string;
  created_at: string;
  timestamp: number;
  type: "image" | "video";
  track_id?: number;
  frame_number?: number;
  gender?: string;
  confidence?: number;
  cached?: boolean;
}

export interface OutputsResponse {
  status: string;
  counts: {
    whole_images: number;
    triggered_clips: number;
    debug_gender: number;
    total: number;
  };
  data: {
    whole_images: OutputItem[];
    triggered_clips: OutputItem[];
    debug_gender: OutputItem[];
  };
}

export const fetchOutputs = async (): Promise<OutputsResponse> => {
  const response = await api.get<OutputsResponse>("/api/v1/outputs");
  return response.data;
};

export const deleteOutputFile = async (relativePath: string) => {
  const response = await api.delete(`/api/v1/outputs/file?path=${encodeURIComponent(relativePath)}`);
  return response.data;
};

export interface NotificationSettingsSummary {
  sms_enabled: boolean;
  sms_recipient_number: string;
  masked_recipient: string;
  source: "dashboard" | "environment";
  updated_at: string | null;
  textbee_configured: boolean;
}

export interface NotificationSettingsResponse {
  status: string;
  settings: NotificationSettingsSummary;
  message?: string;
}

export const fetchNotificationSettings = async (): Promise<NotificationSettingsSummary> => {
  const response = await api.get<NotificationSettingsResponse>("/api/v1/settings/notifications");
  return response.data.settings;
};

export const updateNotificationSettings = async (
  smsRecipientNumber: string,
  userRole: string = "admin"
): Promise<NotificationSettingsSummary> => {
  const response = await api.put<NotificationSettingsResponse>(
    "/api/v1/settings/notifications",
    { sms_recipient_number: smsRecipientNumber },
    {
      headers: {
        "X-User-Role": userRole,
      },
    }
  );
  return response.data.settings;
};

export const resetNotificationRecipient = async (
  userRole: string = "admin"
): Promise<NotificationSettingsSummary> => {
  const response = await api.delete<NotificationSettingsResponse>(
    "/api/v1/settings/notifications/recipient",
    {
      headers: {
        "X-User-Role": userRole,
      },
    }
  );
  return response.data.settings;
};

export const sendTestSms = async (
  recipient?: string,
  userRole: string = "admin"
): Promise<{ status: string; message: string; details?: any }> => {
  const response = await api.post(
    "/api/v1/settings/notifications/test-sms",
    recipient ? { recipient } : {},
    {
      headers: {
        "X-User-Role": userRole,
      },
    }
  );
  return response.data;
};

export interface CameraConfig {
  camera_id: string;
  name: string;
  host: string | null;
  port: number;
  path: string;
  username: string | null;
  has_password?: boolean;
  password?: string;
  retain_existing_password?: boolean;
  is_configured: boolean;
  active_url_masked: string | null;
  auto_reconnect: boolean;
  is_connected: boolean;
  is_running?: boolean;
  runtime_connection_state?: string;
  last_connected_at: string | null;
  last_error: string | null;
  updated_at: string | null;
  source: string;
}

export interface CameraTestResult {
  success: boolean;
  status_code: number | null;
  latency_ms: number | null;
  url_masked: string | null;
  content_type?: string;
  message: string;
}

export interface CameraTelemetryStatus {
  running: boolean;
  connection_state: "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "ERROR" | "UNCONFIGURED";
  camera_id: string;
  camera_name?: string;
  is_configured: boolean;
  stream_url: string | null;
  frames_processed: number;
  uptime_seconds: number;
  camera_fps: number;
  ai_fps: number;
  inference_time_ms: number;
  predicted_class: string;
  confidence: number;
  threat_state: string;
  threat_active: boolean;
  alert_status: string;
  last_incident_id: string | null;
  last_threat_time: number | null;
  evidence_buffer_size: number;
  last_connected_at: string | null;
  last_error: string | null;
}

export const fetchCameraConfig = async (): Promise<CameraConfig> => {
  const response = await api.get<{ status: string; config: CameraConfig }>("/api/v1/ipwebcam/config");
  return response.data.config;
};

export const updateCameraConfig = async (
  payload: Partial<CameraConfig> & { password?: string; retain_existing_password?: boolean },
  userRole: string = "operator"
): Promise<{ config: CameraConfig; reconnected: boolean; message: string }> => {
  const response = await api.put<{ status: string; config: CameraConfig; reconnected: boolean; message: string }>(
    "/api/v1/ipwebcam/config",
    payload,
    {
      headers: {
        "X-User-Role": userRole,
      },
    }
  );
  return response.data;
};

export const testCameraConnection = async (
  payload?: { host?: string; port?: number; path?: string; username?: string; password?: string }
): Promise<CameraTestResult> => {
  const response = await api.post<CameraTestResult>("/api/v1/ipwebcam/test", payload || {});
  return response.data;
};

export const connectIpWebcam = async (url?: string): Promise<{ status: string; camera_id: string }> => {
  const response = await api.post<{ status: string; camera_id: string }>(
    "/api/v1/ipwebcam/connect",
    url ? { url } : {}
  );
  return response.data;
};

export const disconnectIpWebcam = async (): Promise<{ status: string }> => {
  const response = await api.post<{ status: string }>("/api/v1/ipwebcam/disconnect");
  return response.data;
};

export const fetchCameraStatus = async (): Promise<CameraTelemetryStatus> => {
  const response = await api.get<CameraTelemetryStatus>("/api/v1/ipwebcam/status");
  return response.data;
};

export const discoverLocalCameras = async (userRole: string = "operator"): Promise<any[]> => {
  const response = await api.post<{ status: string; cameras: any[] }>(
    "/api/v1/ipwebcam/discover",
    {},
    {
      headers: {
        "X-User-Role": userRole,
      },
    }
  );
  return response.data.cameras || [];
};

export default api;
export { API_BASE_URL };

