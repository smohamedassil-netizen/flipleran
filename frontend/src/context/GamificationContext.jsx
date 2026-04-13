import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext.jsx';

const GamificationContext = createContext(null);

/**
 * Wrap the app with this provider to enable the floating points/badge
 * notification system.  Components call `notify({ points, badges })` after
 * QCM submission or video completion.
 */
export function GamificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const idRef = useRef(0);
  const { refreshMe } = useAuth();

  /**
   * @param {{ earned: number, newBadges: Array }} payload
   */
  const notify = useCallback(({ earned = 0, newBadges = [] } = {}) => {
    if (!earned && !newBadges?.length) return;

    const id = ++idRef.current;
    setNotifications((prev) => [...prev, { id, earned, newBadges }]);

    // Sync user points/badges from server so dashboard stays up to date
    refreshMe();

    // Auto-remove after animation
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3500);
  }, [refreshMe]);

  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <GamificationContext.Provider value={{ notify }}>
      {children}
      <NotificationStack notifications={notifications} onDismiss={dismiss} />
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error('useGamification must be inside GamificationProvider');
  return ctx;
}

/* ─── Internal notification stack renderer ──────────────────────────────── */
import PointsNotification from '../components/PointsNotification.jsx';

function NotificationStack({ notifications, onDismiss }) {
  if (!notifications.length) return null;
  return (
    <div
      style={{
        position:  'fixed',
        bottom:    '24px',
        right:     '24px',
        zIndex:    9999,
        display:   'flex',
        flexDirection: 'column-reverse',
        gap:       '12px',
        pointerEvents: 'none',
      }}
    >
      {notifications.map((n) => (
        <PointsNotification
          key={n.id}
          earned={n.earned}
          newBadges={n.newBadges}
          onDone={() => onDismiss(n.id)}
        />
      ))}
    </div>
  );
}
