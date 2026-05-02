import User from '../models/User.js';
import XPTransaction from '../models/XPTransaction.js';
import { QUOTA_LIMITS } from '../middleware/aiQuota.js';

/**
 * Paliers de niveau XP — courbe douce (Hamari & Koivisto 2014).
 *   Niveau N requiert : 100 × N × (N+1) / 2 points.
 *   Niveau 1 → 100 pts, Niv 2 → 300, Niv 3 → 600, Niv 4 → 1000, Niv 5 → 1500…
 *
 * Affiché dans le profil étudiant + topbar (StreakFlame déjà présent).
 */
function levelFromPoints(points) {
  let level = 0;
  let need = 0;
  while (true) {
    const nextThreshold = 100 * (level + 1) * (level + 2) / 2;
    if (points < nextThreshold) {
      const prev = level === 0 ? 0 : 100 * level * (level + 1) / 2;
      return {
        level,
        points,
        toNext: nextThreshold - points,
        progressInLevel: points - prev,
        levelSize: nextThreshold - prev,
        nextThreshold,
      };
    }
    level++;
    if (level > 100) break; // safety
  }
  return { level, points, toNext: 0, progressInLevel: 0, levelSize: 1, nextThreshold: points };
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

/**
 * GET /api/users/me/xp-breakdown
 *
 * Retourne :
 *   - Total points XP de l'utilisateur
 *   - Niveau calculé depuis le total + progression vers le suivant
 *   - Décomposition par source (video, qcm, prosit, project, module, battle, …)
 *     basée sur l'historique XPTransaction
 *   - 10 dernières transactions (audit visuel)
 */
export async function getMyXpBreakdown(req, res) {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('points');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    // Aggrège les transactions par source (toutes périodes confondues)
    const aggBySource = await XPTransaction.aggregate([
      { $match: { userId: user._id } },
      { $group: {
          _id: '$source',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        } },
      { $sort: { total: -1 } },
    ]);

    const bySource = {};
    for (const row of aggBySource) {
      bySource[row._id] = { total: row.total, count: row.count };
    }

    // 10 dernières transactions (pour audit visuel)
    const recent = await XPTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('amount reason source createdAt')
      .lean();

    res.json({
      totalPoints:    user.points || 0,
      level:          levelFromPoints(user.points || 0),
      bySource,
      recent,
    });
  } catch (err) {
    console.error('[getMyXpBreakdown]', err);
    res.status(500).json({ message: err.message });
  }
}
