/**
 * Hook séparé du Provider — exigé par React Fast Refresh (Vite)
 * pour que la modification du fichier Provider ne casse pas le HMR.
 */
import { useContext } from 'react';
import { ToastContext } from './ToastContext.jsx';

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
