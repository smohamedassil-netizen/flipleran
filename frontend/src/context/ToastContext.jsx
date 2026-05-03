import { createContext, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircle, AlertCircle, Info, X, Bell, FileText, Video as VideoIcon,
  FolderKanban, MessageSquare, Sparkles, Gift,
} from 'lucide-react';

export const ToastContext = createContext(null);

let toastId = 0;

// Cohérent avec le design system (--color-primary = #1B4F72 EM Alger)
const THEME = {
  success:         { bg: '#059669', Icon: CheckCircle },
  error:           { bg: '#dc2626', Icon: AlertCircle },
  info:            { bg: '#1B4F72', Icon: Info },
  urgent:          { bg: '#dc2626', Icon: AlertCircle },
  warning:         { bg: '#d97706', Icon: AlertCircle },
  reminder_qcm:    { bg: '#1B4F72', Icon: FileText },
  reminder_video:  { bg: '#7c3aed', Icon: VideoIcon },
  reminder_project:{ bg: '#c2410c', Icon: FolderKanban },
  reminder_manual: { bg: '#0284c7', Icon: Bell },
  ticket_update:   { bg: '#0ea5e9', Icon: MessageSquare },
  project_status:  { bg: '#059669', Icon: FolderKanban },
  message:         { bg: '#6366f1', Icon: MessageSquare },
  reward:          { bg: '#9333ea', Icon: Gift },
  achievement:     { bg: '#d97706', Icon: Sparkles },
};

function durationFor(priority) {
  // Durées calibrées 5-10 secondes selon l'urgence (urgent = persistant, sans auto-dismiss)
  if (priority === 'urgent') return null;   // null = persistant, requiert clic
  if (priority === 'high')   return 7500;
  return 5500;
}

// Routes pendant lesquelles l'utilisateur ne doit pas être dérangé
// (les toasts non-urgents sont mis en file d'attente jusqu'à la sortie)
const FOCUS_ROUTE_PATTERNS = [
  /^\/qcm\//,           // pendant un QCM en cours
  /^\/quiz-battle/,     // pendant un Quiz Battle
  /^\/study\//,         // pendant une session de révision SM-2
  /^\/watch\//,         // pendant le visionnage d'une vidéo (option : commenter cette ligne si trop strict)
];

// Préférence son utilisateur (off par défaut pour ne pas surprendre)
function getSoundEnabled() {
  try { return localStorage.getItem('fliplearn_toast_sound') === 'on'; }
  catch { return false; }
}

// Limite max de toasts visibles simultanément
const MAX_VISIBLE_TOASTS = 3;

// Petit "pop" sonore via Web Audio API — uniquement si l'utilisateur l'a explicitement activé
function playPopSound(priority) {
  if (!getSoundEnabled()) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const freq = priority === 'urgent' ? 880 : priority === 'high' ? 660 : 523;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch { /* silence si bloqué */ }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const timers = useRef({});             // { id: { timeoutId, remaining, startedAt, total } }
  const queue = useRef([]);              // toasts en attente (mode focus ou stack plein)
  const navigate = useNavigate();
  const location = useLocation();

  const isFocusMode = FOCUS_ROUTE_PATTERNS.some((re) => re.test(location.pathname));

  const dismiss = useCallback((id) => {
    const t = timers.current[id];
    if (t?.timeoutId) clearTimeout(t.timeoutId);
    delete timers.current[id];
    setToasts((prev) =>
      prev.map((tt) => (tt.id === id ? { ...tt, exiting: true } : tt))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((tt) => tt.id !== id));
    }, 320);
  }, []);

  // Affiche réellement un toast (gère le timer auto-dismiss)
  const showToast = useCallback((entry) => {
    setToasts((prev) => [...prev, entry]);
    if (entry.duration != null) {
      const timeoutId = setTimeout(() => dismiss(entry.id), entry.duration);
      timers.current[entry.id] = {
        timeoutId, total: entry.duration, startedAt: Date.now(), remaining: entry.duration,
      };
    } else {
      // urgent : persistant, requiert clic explicite
      timers.current[entry.id] = { timeoutId: null, total: null, startedAt: Date.now(), remaining: null };
    }
  }, [dismiss]);

  /**
   * Signature : toast({ message, title?, type?, priority?, link?, duration?, silent?, onDismiss? })
   */
  const toast = useCallback((opts) => {
    const id = ++toastId;
    const priority = opts.priority || (opts.type === 'urgent' ? 'urgent' : 'normal');
    const duration = opts.duration !== undefined ? opts.duration : durationFor(priority);
    const isUrgent = priority === 'urgent';

    const entry = {
      id,
      title:    opts.title || '',
      message:  opts.message,
      type:     opts.type || 'info',
      priority,
      link:     opts.link || null,
      duration,
      onDismiss: opts.onDismiss || null,
      exiting:  false,
    };

    // Mode Focus : tout sauf urgent va en file d'attente
    if (isFocusMode && !isUrgent) {
      queue.current.push(entry);
      setPendingCount((c) => c + 1);
      return id;
    }

    // Stack plein : si déjà MAX visibles, mettre en queue
    if (toasts.length >= MAX_VISIBLE_TOASTS && !isUrgent) {
      queue.current.push(entry);
      setPendingCount((c) => c + 1);
      return id;
    }

    showToast(entry);
    if (!opts.silent) playPopSound(priority);
    return id;
  }, [isFocusMode, toasts.length, showToast]);

  const success = useCallback((message) => toast({ message, type: 'success' }), [toast]);
  const error   = useCallback((message) => toast({ message, type: 'error' }), [toast]);
  const info    = useCallback((message) => toast({ message, type: 'info' }), [toast]);

  // Quand on sort du focus mode ou qu'un slot se libère, on dépile la queue
  useEffect(() => {
    if (isFocusMode) return;
    if (toasts.length >= MAX_VISIBLE_TOASTS) return;
    if (queue.current.length === 0) return;
    const next = queue.current.shift();
    setPendingCount((c) => Math.max(0, c - 1));
    showToast(next);
  }, [isFocusMode, toasts.length, showToast]);

  // Pause au survol
  const handleMouseEnter = (id) => {
    const t = timers.current[id];
    if (!t || !t.timeoutId) return;
    clearTimeout(t.timeoutId);
    t.remaining = Math.max(300, t.total - (Date.now() - t.startedAt));
    t.timeoutId = null;
  };
  const handleMouseLeave = (id) => {
    const t = timers.current[id];
    if (!t || t.timeoutId || t.total == null) return;
    t.startedAt = Date.now();
    t.total = t.remaining;
    t.timeoutId = setTimeout(() => dismiss(id), t.remaining);
  };

  const handleClick = (t) => {
    if (t.link) navigate(t.link);
    if (t.onDismiss) t.onDismiss();
    dismiss(t.id);
  };

  // API publique pour le ToggleSound dans Settings
  const setSoundEnabled = (on) => {
    try { localStorage.setItem('fliplearn_toast_sound', on ? 'on' : 'off'); } catch {}
  };

  // Helper dev (exposé uniquement en mode dev pour les tests manuels)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (import.meta.env?.DEV) {
      window.__fliplearn = { ...(window.__fliplearn || {}), toast };
    }
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, dismiss, setSoundEnabled }}>
      {children}

      <div className="toast-stack">
        {toasts.map((t) => {
          const theme = THEME[t.type] || THEME.info;
          const Icon = theme.Icon;
          const isUrgent = t.priority === 'urgent';
          const isHigh   = t.priority === 'high';
          return (
            <div
              key={t.id}
              className={`toast-pop ${t.exiting ? 'toast-pop-exit' : ''} ${isUrgent ? 'toast-pop-urgent' : ''} ${isHigh ? 'toast-pop-high' : ''}`}
              onClick={() => handleClick(t)}
              onMouseEnter={() => handleMouseEnter(t.id)}
              onMouseLeave={() => handleMouseLeave(t.id)}
              style={{
                cursor: t.link ? 'pointer' : 'default',
                background: `linear-gradient(135deg, ${theme.bg} 0%, ${theme.bg}dd 60%, ${theme.bg}b3 100%)`,
              }}
              role={isUrgent ? 'alert' : 'status'}
              aria-live={isUrgent ? 'assertive' : 'polite'}
            >
              <span className="toast-pop-halo" aria-hidden="true" />
              <span className="toast-pop-shine" aria-hidden="true" />

              <div className="toast-pop-icon">
                <Icon size={20} color="white" strokeWidth={2.5} />
              </div>
              <div className="toast-pop-body">
                {t.title && <div className="toast-pop-title">{t.title}</div>}
                <div className="toast-pop-message">{t.message}</div>
                {t.link && (
                  <div className="toast-pop-cta">
                    {isUrgent ? 'Cliquer pour ouvrir' : 'Cliquer pour ouvrir →'}
                  </div>
                )}
                {isUrgent && !t.link && (
                  <div className="toast-pop-cta">Clique pour fermer</div>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dismiss(t.id); }}
                className="toast-pop-close"
                aria-label="Fermer"
              >
                <X size={14} />
              </button>
              {t.duration != null && (
                <span className="toast-pop-progress" style={{ animationDuration: `${t.duration}ms` }} />
              )}
            </div>
          );
        })}

        {pendingCount > 0 && (
          <div className="toast-pending-pill" aria-live="polite">
            <Bell size={12} />
            <span>{pendingCount} notification{pendingCount > 1 ? 's' : ''} en attente</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

// useToast est déplacé dans ./useToast.js pour permettre à Vite Fast Refresh
// de fonctionner correctement (un fichier ne doit exporter QUE des composants
// React pour que le HMR React préserve l'état).
