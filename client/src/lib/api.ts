import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:5050/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ps_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("ps_user");
      localStorage.removeItem("ps_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);
