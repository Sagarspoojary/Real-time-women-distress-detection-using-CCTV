import axios from "axios";

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== "") {
    return envUrl;
  }
  if (typeof window !== "undefined" && window.location) {
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
  onUploadProgress?: (progressEvent: any) => void
) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/predict", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress,
  });

  return response.data;
};

export default api;
export { API_BASE_URL };
