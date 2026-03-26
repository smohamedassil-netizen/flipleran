import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fliplearn_notifications') || '[]');
    } catch { return []; }
  });

  const addNotification = useCallback((notif) => {
    const newNotif = {
      id: Date.now(),
      message: notif.message,
      type: notif.type || 'info', // info, success, warning
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => {
      const updated = [newNotif, ...prev].slice(0, 50); // keep 50 max
      localStorage.setItem('fliplearn_notifications', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem('fliplearn_notifications', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem('fliplearn_notifications');
  }, []);

  /* ── Socket.io : écouter les notifications en temps réel ──────────── */
  useEffect(() => {
    let user;
    try {
      user = JSON.parse(localStorage.getItem('fliplearn_user') || 'null');
    } catch { user = null; }
    if (!user?.token || !user?._id) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');
    const socket = io(socketUrl, {
      auth: { token: user.token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('join', `user_${user._id}`);
    });

    socket.on('notification', (data) => {
      addNotification({
        message: data.message,
        type: data.type || 'info',
      });
    });

    return () => socket.disconnect();
  }, [addNotification]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAllRead, clearAll, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
