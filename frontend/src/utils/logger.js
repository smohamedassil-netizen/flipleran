/**
 * Logger silencieux en production : n'affiche les console.* qu'en mode dev.
 *
 * Usage :
 *   import { logError, logWarn } from '../utils/logger.js';
 *   .catch(logError);
 *   try { ... } catch (err) { logError(err); }
 *
 * En production (Render), aucune sortie console — les erreurs API sont déjà
 * affichées via les toasts d'erreur côté UI.
 */

const isDev = !!import.meta.env?.DEV;

export function logError(...args) {
  if (isDev) console.error(...args);
}

export function logWarn(...args) {
  if (isDev) console.warn(...args);
}

export function logInfo(...args) {
  if (isDev) console.info(...args);
}
