import Notification from '../models/Notification.js';

/**
 * Crée une notification persistée et l'émet en temps réel via Socket.io.
 * Utilise dedupKey pour éviter les doublons (notamment dans les jobs cron quotidiens).
 *
 * @param {Object} io        — instance Socket.io (peut être null)
 * @param {Object} payload   — { userId, type, title, message, link, priority, relatedType, relatedId, dedupKey }
 * @returns {Promise<Notification|null>} — la notif créée, ou null si doublon
 */
export async function pushNotification(io, payload) {
  try {
    const {
      userId, type = 'info', title = '', message,
      link = null, priority = 'normal',
      relatedType = null, relatedId = null,
      dedupKey = null,
    } = payload;

    if (!userId || !message) return null;

    // Dédoublonnage si clé fournie
    if (dedupKey) {
      const existing = await Notification.findOne({ dedupKey });
      if (existing) return null;
    }

    const notif = await Notification.create({
      userId, type, title, message, link, priority,
      relatedType, relatedId, dedupKey,
    });

    // Émission temps réel dans la room personnelle
    if (io) {
      io.to(`user_${userId}`).emit('notification', {
        _id:      notif._id,
        type,
        title,
        message,
        link,
        priority,
        read:     false,
        createdAt: notif.createdAt,
      });
    }

    return notif;
  } catch (err) {
    // Erreur probable = doublon dedupKey (unique index)
    if (err.code !== 11000) {
      console.error('[pushNotification]', err.message);
    }
    return null;
  }
}

/**
 * Diffuse une même notification à plusieurs utilisateurs.
 */
export async function pushNotificationToMany(io, userIds, payload) {
  const results = [];
  for (const userId of userIds) {
    const dk = payload.dedupKey ? `${payload.dedupKey}_${userId}` : null;
    const notif = await pushNotification(io, { ...payload, userId, dedupKey: dk });
    if (notif) results.push(notif);
  }
  return results;
}
