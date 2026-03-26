/**
 * useVideoProgress
 * Gère la sauvegarde périodique du % visionné vers l'API.
 *
 * - Envoie toutes les INTERVAL secondes si le pourcentage a changé
 * - Envoie immédiatement au passage du seuil de complétion (80%)
 * - Retourne { completed, watchedPercent }
 */
import { useState, useRef, useCallback } from 'react';
import api from '../utils/api.js';

const INTERVAL      = 10;    // secondes entre deux envois
const THRESHOLD     = 80;    // % pour marquer comme complété

export const useVideoProgress = (videoId, initialProgress = 0, { onPointsEarned } = {}) => {
  const [watchedPercent, setWatchedPercent] = useState(initialProgress);
  const [completed, setCompleted]           = useState(initialProgress >= THRESHOLD);

  const lastSentRef     = useRef(initialProgress);
  const lastSentTimeRef = useRef(0);
  const completedRef    = useRef(initialProgress >= THRESHOLD);

  const sendProgress = useCallback(async (percent) => {
    try {
      const { data } = await api.post(`/videos/${videoId}/progress`, {
        watchedPercent: Math.round(percent),
      });
      if (data.completed && !completedRef.current) {
        completedRef.current = true;
        setCompleted(true);
        if (data.points && onPointsEarned) {
          onPointsEarned(data.points);
        }
      }
      lastSentRef.current = percent;
    } catch { /* silencieux */ }
  }, [videoId, onPointsEarned]);

  /**
   * Appelé depuis l'événement onTimeUpdate du player.
   * @param {number} currentTime  secondes écoulées
   * @param {number} duration     durée totale en secondes
   */
  const onTimeUpdate = useCallback((currentTime, duration) => {
    if (!duration || duration === 0) return;

    const percent   = (currentTime / duration) * 100;
    const rounded   = Math.round(percent);
    const now       = Date.now() / 1000;

    setWatchedPercent(rounded);

    // Envoi périodique (toutes les INTERVAL secondes)
    const shouldSendByTime = now - lastSentTimeRef.current >= INTERVAL;

    // Envoi immédiat au franchissement du seuil
    const crossedThreshold =
      rounded >= THRESHOLD &&
      lastSentRef.current < THRESHOLD &&
      !completedRef.current;

    if (shouldSendByTime || crossedThreshold) {
      lastSentTimeRef.current = now;
      sendProgress(rounded);
    }
  }, [sendProgress]);

  return { watchedPercent, completed, onTimeUpdate, sendProgress };
};
