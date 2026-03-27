import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// This runs BEFORE every single request goes out
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  
  if (token) {
    // Inject the token into the headers automatically
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

export default api;