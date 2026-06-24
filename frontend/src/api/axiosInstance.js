import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aiite_token');

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';

    // Only auto-logout for actual auth/session failures.
    // Do not logout on every 403 because some routes may return 403
    // for permission issues while the session is still valid.
    if (status === 401) {
      localStorage.removeItem('aiite_token');
      localStorage.removeItem('aiite_user');
      window.location.href = '/';
    }

    // Optional: if login itself fails, never clear storage here.
    if (status === 403 && url.includes('/auth/me')) {
      localStorage.removeItem('aiite_token');
      localStorage.removeItem('aiite_user');
      window.location.href = '/';
    }

    return Promise.reject(error);
  }
);

export default api;