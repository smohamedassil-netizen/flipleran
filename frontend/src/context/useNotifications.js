/**
 * Hook séparé du Provider — exigé par React Fast Refresh (Vite)
 * pour que la modification du fichier Provider ne casse pas le HMR.
 */
import { useContext } from 'react';
import { NotificationContext } from './NotificationContext.jsx';

export const useNotifications = () => useContext(NotificationContext);
