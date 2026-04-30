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
  withCredentials: true,            // send httpOnly refresh cookie
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

/* ── Response: auto-refresh on 401, then redirect if still failing ─────── */
let isRefreshing = false;
let refreshQueue = [];

function processQueue(error, token) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't retry the refresh endpoint itself or already-retried requests
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url === '/auth/refresh' ||
      originalRequest.url === '/auth/login'
    ) {
      // Hard redirect on non-retryable 401
      if (error.response?.status === 401 && !originalRequest._retry) {
        sessionStorage.removeItem(STORAGE_KEY);
        const p = window.location.pathname;
        if (!p.startsWith('/login') && !p.startsWith('/register') && !p.startsWith('/welcome')) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }

    // Queue concurrent requests while a refresh is in progress
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${API_ROOT}/auth/refresh`,
        {},
        { withCredentials: true }
      );

      const newToken = data.token;

      // Update stored user with new access token
      try {
        const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
        if (stored) {
          stored.token = newToken;
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        }
      } catch { /* ignore */ }

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      processQueue(null, newToken);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      sessionStorage.removeItem(STORAGE_KEY);
      const p = window.location.pathname;
      if (!p.startsWith('/login') && !p.startsWith('/register') && !p.startsWith('/welcome')) {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
