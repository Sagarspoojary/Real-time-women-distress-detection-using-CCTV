import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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
