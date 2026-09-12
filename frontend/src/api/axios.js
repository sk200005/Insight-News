import axios from "axios";

const API_BASE_URL = import.meta.env.PROD
  ? ""
  : "http://localhost:8000";

export { API_BASE_URL };

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true
});

export default api;

