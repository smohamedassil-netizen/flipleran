import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api.js';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNew, setHasNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);

  /* ── Charger depuis la DB ─────────────────────────────────────────────── */
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications', { params: { limit: 50 } });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      /* silent : l'API peut être indisponible */
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Ajouter une notif (temps réel) ──────────────────────────────────── */
  const addNotification = useCallback((notif) => {
    setNotifications(prev => {
      if (notif._id && prev.some(n => n._id === notif._id)) return prev;
      const entry = {
        _id: notif._id || `tmp_${Date.now()}`,
        type: notif.type || 'info',
        title: notif.title || '',
        message: notif.message,
        link: notif.link || null,
        priority: notif.priority || 'normal',
        read: false,
        createdAt: notif.createdAt || new Date().toISOString(),
      };
      return [entry, ...prev].slice(0, 100);
    });
    setUnreadCount(c => c + 1);
    setHasNew(true);
    setTimeout(() => setHasNew(false), 3500);
  }, []);

  /* ── Marquer une notif comme lue ─────────────────────────────────────── */
  const markAsRead = useCallback(async (id) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
    try { await api.put(`/notifications/${id}/read`); } catch { /* ignore */ }
  }, []);

  /* ── Marquer tout comme lu ──────────────────────────────────────────── */
  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try { await api.put('/notifications/read-all'); } catch { /* ignore */ }
  }, []);

  /* ── Supprimer une notif ────────────────────────────────────────────── */
  const deleteNotification = useCallback(async (id) => {
    setNotifications(prev => prev.filter(n => n._id !== id));
    try { await api.delete(`/notifications/${id}`); } catch { /* ignore */ }
  }, []);

  /* ── Vider tout ─────────────────────────────────────────────────────── */
  const clearAll = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);
    try { await api.delete('/notifications/clear'); } catch { /* ignore */ }
  }, []);

  /* ── Helper pour compat : addSystemNotification ─────────────────────── */
  const addSystemNotification = useCallback((message) => {
    addNotification({ message, type: 'info' });
  }, [addNotification]);

  /* ── Socket.io : écouter les notifs temps réel ──────────────────────── */
  useEffect(() => {
    let user;
    try {
      user = JSON.parse(sessionStorage.getItem('fliplearn_user') || 'null');
    } catch { user = null; }
    if (!user?.token || !user?._id) return;

    // Charger l'historique au démarrage
    fetchNotifications();

    const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');
    const socket = io(socketUrl, {
      auth: { token: user.token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', `user_${user._id}`);
    });

    socket.on('notification', (data) => {
      addNotification(data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [addNotification, fetchNotifications]);

  const value = {
    notifications,
    unreadCount,
    hasNew,
    loading,
    fetchNotifications,
    addNotification,
    addSystemNotification,
    markAsRead,
    markAllRead,
    deleteNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
