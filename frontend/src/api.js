import axios from 'axios';

/**
 * API base URL resolution order:
 * 1) REACT_APP_API (preferred)
 * 2) REACT_APP_API_BASE (legacy)
 * 3) window.ENV.API_BASE (optional runtime injection)
 * 4) localhost fallback (dev)
 */
const API_BASE =
  process.env.REACT_APP_API ||
  process.env.REACT_APP_API_BASE ||
  (typeof window !== 'undefined' && window.ENV && window.ENV.API_BASE) ||
  'http://localhost:5000';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Optional: Attach token automatically to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Basic response error logging to aid debugging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API error:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);
