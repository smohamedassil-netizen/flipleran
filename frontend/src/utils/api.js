import axios from 'axios';

const STORAGE_KEY = 'fliplearn_user';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

/* ── Request: injecte le token JWT ──────────────────────────────────────── */
api.interceptors.request.use((config) => {
  try {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
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
      localStorage.removeItem(STORAGE_KEY);
      // Ne pas rediriger si déjà sur /login ou /register
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
