import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './components/App';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { getToken, logout } from './utils/auth';

// ── Attach JWT to every outgoing axios request ────────────────
axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auto-logout on 401 (token expired / invalid) ─────────────
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
