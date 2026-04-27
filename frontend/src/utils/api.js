import axios from 'axios';

const STORAGE_KEY = 'fliplearn_user';

// En dev : '/api' (proxifié par Vite vers localhost:5000)
// En prod : VITE_API_URL doit pointer vers le backend Render (ex: https://fliplearn-5lsz.onrender.com)
const API_ROOT = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: API_ROOT,
  timeout: 15000,
});

/* ── Request: injecte le token JWT ──────────────────────────────────────── */
api.interceptors.request.use((config) => {
  try {
    const user = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
  } catch { /* ignore */ }
  return config;
});

/* ── Response: gère les erreurs globales ────────────────────────────────── */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem(STORAGE_KEY);
      // Ne pas rediriger si déjà sur /login ou /register
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register') &&
          !window.location.pathname.startsWith('/welcome')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
