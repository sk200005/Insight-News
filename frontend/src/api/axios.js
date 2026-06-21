import axios from "axios";

const fallbackApiBaseUrl = import.meta.env.PROD
  ? "https://insight-news-l0yx.onrender.com"
  : "http://localhost:8000";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || fallbackApiBaseUrl
).replace(/\/+$/, "");

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true
});

export default api;
