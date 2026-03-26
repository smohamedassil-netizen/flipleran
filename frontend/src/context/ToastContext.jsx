import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let toastId = 0;

const ICONS = {
  success: CheckCircle,
  error:   AlertCircle,
  info:    Info,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(({ message, type = 'info', duration = 3500 }) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const success = useCallback((message) => toast({ message, type: 'success' }), [toast]);
  const error   = useCallback((message) => toast({ message, type: 'error' }), [toast]);
  const info    = useCallback((message) => toast({ message, type: 'info' }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, dismiss }}>
      {children}

      {/* Toast container */}
      <div className="toast-container">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] ?? Info;
          return (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <Icon size={16} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2, display: 'flex' }}
              >
                <X size={14} />
              </button>
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
