import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api.js';

const AuthContext = createContext(null);

const STORAGE_KEY = 'fliplearn_user';

/* ─── redirect map per role ──────────────────────────────────────────────── */
export const ROLE_HOME = {
  etudiant:   '/',
  professeur: '/professor/dashboard',
  admin:      '/admin',
};

/* ─── Provider ───────────────────────────────────────────────────────────── */
export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  /* Rehydrate from sessionStorage on mount */
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  /* Persist user to sessionStorage whenever it changes + notifier les autres contexts */
  useEffect(() => {
    if (user) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new Event('fliplearn:user-changed'));
  }, [user]);

  /* ── login ─────────────────────────────────────────────────────────────── */
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data);
    return data;
  }, []);

  /* ── register — ne connecte PAS automatiquement, le compte est pending ──── */
  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return data; // { status: 'pending', email, message }
  }, []);

  /* ── logout ────────────────────────────────────────────────────────────── */
  const logout = useCallback(() => setUser(null), []);

  /* ── refreshMe — sync latest data from server ──────────────────────────── */
  const refreshMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser((prev) => ({ ...prev, ...data }));
    } catch {
      /* token expired → interceptor will handle redirect */
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/* ─── hook ───────────────────────────────────────────────────────────────── */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
