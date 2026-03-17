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
// Skip redirect for login endpoints — a failed login returns 401 too,
// and we don't want the interceptor to reload the page in that case.
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isLoginEndpoint = url.includes("/login");
    if (error.response?.status === 401 && !isLoginEndpoint) {
      logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
