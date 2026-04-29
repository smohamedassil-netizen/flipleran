/**
 * socketConfig.js — Configuration commune pour socket.io-client.
 *
 * WebSocket est désactivé en dev (polling uniquement) car sous
 * Windows + Firefox + localhost, le pare-feu/antivirus bloque
 * souvent l'upgrade HTTP → WS. Le polling fonctionne nativement
 * avec les middlewares CORS/credentials déjà en place.
 *
 * En production, les deux transports sont activés pour bénéficier
 * de la faible latence du WebSocket une fois l'upgrade réussi.
 */

const isProd = import.meta.env.PROD;

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (isProd ? '' : 'http://localhost:5000');

export function makeSocketConfig(token) {
  return {
    auth: { token },
    transports: isProd ? ['websocket', 'polling'] : ['polling'],
    withCredentials: true,
  };
}
