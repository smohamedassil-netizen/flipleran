import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, AlertCircle, Info, X, Bell, FileText, Video as VideoIcon,
  FolderKanban, MessageSquare, Sparkles, Gift,
} from 'lucide-react';

const ToastContext = createContext(null);

let toastId = 0;

const THEME = {
  success:         { bg: '#059669', fg: '#ecfdf5', Icon: CheckCircle },
  error:           { bg: '#dc2626', fg: '#fef2f2', Icon: AlertCircle },
  info:            { bg: '#1B4F72', fg: '#eff6ff', Icon: Info },
  urgent:          { bg: '#dc2626', fg: '#fef2f2', Icon: AlertCircle },
  warning:         { bg: '#d97706', fg: '#fffbeb', Icon: AlertCircle },
  reminder_qcm:    { bg: '#1B4F72', fg: '#eff6ff', Icon: FileText },
  reminder_video:  { bg: '#7c3aed', fg: '#f5f3ff', Icon: VideoIcon },
  reminder_project:{ bg: '#c2410c', fg: '#fff7ed', Icon: FolderKanban },
  reminder_manual: { bg: '#0284c7', fg: '#f0f9ff', Icon: Bell },
  ticket_update:   { bg: '#0ea5e9', fg: '#f0f9ff', Icon: MessageSquare },
  project_status:  { bg: '#059669', fg: '#ecfdf5', Icon: FolderKanban },
  message:         { bg: '#6366f1', fg: '#eef2ff', Icon: MessageSquare },
  reward:          { bg: '#9333ea', fg: '#faf5ff', Icon: Gift },
  achievement:     { bg: '#d97706', fg: '#fffbeb', Icon: Sparkles },
};

function durationFor(priority) {
  if (priority === 'urgent') return 8000;
  if (priority === 'high')   return 6500;
  return 4800;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});
  const navigate = useNavigate();

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 220);
  }, []);

  /**
   * Signature : toast({ message, title?, type?, priority?, link?, duration? })
   * Rétrocompat : toast({ message, type }) continue de fonctionner.
   */
  const toast = useCallback((opts) => {
    const id = ++toastId;
    const priority = opts.priority || (opts.type === 'urgent' ? 'urgent' : 'normal');
    const duration = opts.duration ?? durationFor(priority);
    setToasts((prev) => [...prev, {
      id,
      title:    opts.title || '',
      message:  opts.message,
      type:     opts.type || 'info',
      priority,
      link:     opts.link || null,
      exiting:  false,
    }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const success = useCallback((message) => toast({ message, type: 'success' }), [toast]);
  const error   = useCallback((message) => toast({ message, type: 'error' }), [toast]);
  const info    = useCallback((message) => toast({ message, type: 'info' }), [toast]);

  const handleClick = (t) => {
    if (t.link) navigate(t.link);
    dismiss(t.id);
  };

  return (
    <ToastContext.Provider value={{ toast, success, error, info, dismiss }}>
      {children}

      <div className="toast-stack">
        {toasts.map((t) => {
          const theme = THEME[t.type] || THEME.info;
          const Icon = theme.Icon;
          const isUrgent = t.priority === 'urgent';
          return (
            <div
              key={t.id}
              className={`toast-pop ${t.exiting ? 'toast-pop-exit' : ''} ${isUrgent ? 'toast-pop-urgent' : ''}`}
              onClick={() => handleClick(t)}
              style={{
                cursor: t.link ? 'pointer' : 'default',
                background: `linear-gradient(135deg, ${theme.bg} 0%, ${theme.bg}e6 100%)`,
              }}
            >
              <div className="toast-pop-icon" style={{ background: 'rgba(255,255,255,.18)' }}>
                <Icon size={18} color="white" />
              </div>
              <div className="toast-pop-body">
                {t.title && <div className="toast-pop-title">{t.title}</div>}
                <div className="toast-pop-message">{t.message}</div>
                {t.link && <div className="toast-pop-cta">Cliquer pour ouvrir →</div>}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dismiss(t.id); }}
                className="toast-pop-close"
                aria-label="Fermer"
              >
                <X size={14} />
              </button>
              {!isUrgent && (
                <span className="toast-pop-progress" style={{ animationDuration: `${durationFor(t.priority)}ms` }} />
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
