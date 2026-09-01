import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const endpoint = `${API_BASE}/admin/auth`;

export const adminLogin = async (payload) => {
  const response = await axios.post(`${endpoint}/login`, payload);
  return response.data;
};

export const adminForgotPassword = async (payload) => {
  const response = await axios.post(`${endpoint}/forgot-password`, payload);
  return response.data;
};
