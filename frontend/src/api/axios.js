import axios from "axios";

const fallbackApiBaseUrl = import.meta.env.PROD
  ? "http://16.171.198.202"
  : "http://localhost:8000";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || fallbackApiBaseUrl
).replace(/\/+$/, "");

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true
});

export default api;
