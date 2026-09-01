import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const getToken = () => {
  return localStorage.getItem('fasilink-admin-token') || sessionStorage.getItem('fasilink-admin-token');
};

const adminApi = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

adminApi.interceptors.request.use((config) => {
  const token = getToken();
  config.headers = config.headers || {};
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const msg = error.response?.data?.error || '';
    
    if (
      status === 401 ||
      (status === 400 && msg === 'Invalid token.') ||
      (status === 403 && (msg.includes('Account is') || msg.includes('Access denied') || msg.includes('permissions')))
    ) {
      localStorage.removeItem('fasilink-admin-token');
      localStorage.removeItem('fasilink-admin-user');
      sessionStorage.removeItem('fasilink-admin-token');
      sessionStorage.removeItem('fasilink-admin-user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default adminApi;
