import axios from 'axios';

const api = axios.create({
  baseURL: 'https://aiite-academy-backend.onrender.com/api',
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

    if (status === 401 || status === 403) {
      localStorage.removeItem('aiite_token');
      localStorage.removeItem('aiite_user');
      window.location.href = '/';
    }

    return Promise.reject(error);
  }
);

export default api;