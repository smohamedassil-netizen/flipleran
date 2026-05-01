import User from '../models/User.js';
import { QUOTA_LIMITS } from '../middleware/aiQuota.js';

/**
 * GET /api/users/me/preferences
 * Retourne les préférences de l'utilisateur connecté.
 */
export async function getMyPreferences(req, res) {
  try {
    const user = await User.findById(req.user.id).select('emailNotifications');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    res.json({
      emailNotifications: user.emailNotifications !== false,
    });
  } catch (err) {
    console.error('[getMyPreferences]', err);
    res.status(500).json({ message: 'Erreur récupération des préférences' });
  }
}

/**
 * PATCH /api/users/me/preferences
 * Met à jour les préférences de l'utilisateur connecté.
 * Body : { emailNotifications?: boolean }
 */
export async function updateMyPreferences(req, res) {
  try {
    const update = {};
    if (typeof req.body.emailNotifications === 'boolean') {
      update.emailNotifications = req.body.emailNotifications;
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'Aucune préférence valide fournie.' });
    }
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true })
      .select('emailNotifications');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    res.json({
      emailNotifications: user.emailNotifications !== false,
    });
  } catch (err) {
    console.error('[updateMyPreferences]', err);
    res.status(500).json({ message: 'Erreur mise à jour des préférences' });
  }
}

/**
 * GET /api/users/me/ai-quota
 *
 * Retourne le plan de l'utilisateur connecté, sa date de fin Premium si
 * applicable, et le détail des quotas IA pour chaque feature couverte.
 *
 * Format de réponse :
 *   {
 *     plan: 'free' | 'premium',
 *     premiumUntil: '2026-05-29T...' | null,
 *     premiumActive: true | false,
 *     quotas: {
 *       videoAnalysis:  { used, limit, resetAt },
 *       moduleBot:      { used, limit, resetAt },
 *       qcmGeneration:  { used, limit, resetAt },
 *       deckGeneration: { used, limit, resetAt }
 *     }
 *   }
 *
 * Pour un Premium actif, `limit` est null (illimité) et `used` reflète quand
 * même le compteur (informatif, mais sans contrainte).
 */
export async function getMyAiQuota(req, res) {
  try {
    const user = await User.findById(req.user.id).select('plan premiumUntil aiUsage');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    const premiumActive = user.plan === 'premium'
      && user.premiumUntil
      && new Date(user.premiumUntil).getTime() > Date.now();

    const quotas = {};
    for (const feature of Object.keys(QUOTA_LIMITS)) {
      const usage = user.aiUsage?.[feature] || { count: 0, resetAt: null };
      quotas[feature] = {
        used: usage.count || 0,
        limit: premiumActive ? null : QUOTA_LIMITS[feature],
        resetAt: usage.resetAt,
      };
    }

    res.json({
      plan: user.plan,
      premiumUntil: user.premiumUntil,
      premiumActive,
      quotas,
    });
  } catch (err) {
    console.error('[getMyAiQuota]', err);
    res.status(500).json({ message: 'Erreur récupération des quotas IA' });
  }
}
