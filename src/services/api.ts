import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url || "";

    // Session expired / invalid -> bounce to login (but never loop on auth calls).
    if (status === 401 && !url.includes("/auth/")) {
      const theme =
        sessionStorage.getItem("theme") || localStorage.getItem("theme");
      localStorage.clear();
      if (theme) {
        localStorage.setItem("theme", theme);
        sessionStorage.setItem("theme", theme);
      }
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    // Authenticated but no organization yet -> route into onboarding.
    if (
      status === 403 &&
      error?.response?.data?.code === "NO_ORGANIZATION" &&
      window.location.pathname !== "/onboarding"
    ) {
      window.location.href = "/onboarding";
    }

    return Promise.reject(error);
  },
);

export default api;
