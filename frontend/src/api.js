import axios from 'axios';

// Use the environment variable for the API base URL
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

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
