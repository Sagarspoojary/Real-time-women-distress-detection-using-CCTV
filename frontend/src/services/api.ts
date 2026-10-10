import axios from "axios";

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== "") {
    return envUrl;
  }
  if (typeof window !== "undefined" && window.location) {
    if (window.location.port === "5173") {
      return "http://localhost:8000";
    }
    return window.location.origin;
  }
  return "http://localhost:8000";
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
  if (locationData?.latitude != null) formData.append("latitude", String(locationData.latitude));
  if (locationData?.longitude != null) formData.append("longitude", String(locationData.longitude));
  if (locationData?.accuracy != null) formData.append("accuracy", String(locationData.accuracy));
  if (locationData?.timestamp != null) formData.append("timestamp", String(locationData.timestamp));

  const response = await api.post("/predict", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress,
  });

  return response.data;
};

export const fetchHistory = async (skip: number = 0, limit: number = 50) => {
  const response = await api.get(`/api/v1/history?skip=${skip}&limit=${limit}`);
  return response.data;
};

export default api;
export { API_BASE_URL };
