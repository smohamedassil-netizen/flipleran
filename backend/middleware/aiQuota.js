import User from '../models/User.js';

/**
 * Quotas mensuels du plan FREE.
 * Les utilisateurs PREMIUM (avec premiumUntil > now) bypassent ces limites.
 */
export const QUOTA_LIMITS = {
  videoAnalysis:  3,
  moduleBot:      30,
  qcmGeneration:  5,
  deckGeneration: 5,
};

/**
 * Premier jour du mois UTC suivant — la prochaine date de reset du compteur.
 */
function nextMonthlyReset(from = new Date()) {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return d;
}

/**
 * True si l'utilisateur a un abonnement Premium actif.
 */
function isPremiumActive(user) {
  return user?.plan === 'premium'
    && user.premiumUntil
    && new Date(user.premiumUntil).getTime() > Date.now();
}

/**
 * Factory de middleware : `checkAiQuota('moduleBot')` retourne un middleware
 * Express qui vérifie le quota de l'utilisateur courant pour la fonctionnalité
 * IA donnée, incrémente le compteur si OK, ou renvoie 429 sinon.
 *
 * Comportement :
 *   - Premium actif → bypass total (next() sans toucher au compteur).
 *   - Sinon, si resetAt absent ou < now : reset du compteur et nouvelle resetAt.
 *   - Si count >= limit → 429 { message, upgrade: true, used, limit, resetAt }.
 *   - Sinon, count++ et next().
 */
export function checkAiQuota(feature) {
  if (!QUOTA_LIMITS[feature]) {
    throw new Error(`[aiQuota] Feature inconnue : ${feature}`);
  }

  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

      // Premium actif → bypass
      if (isPremiumActive(user)) return next();

      const now = new Date();
      const limit = QUOTA_LIMITS[feature];

      // Initialise la sous-structure si absente (utile pour comptes pré-quota)
      if (!user.aiUsage) user.aiUsage = {};
      if (!user.aiUsage[feature]) user.aiUsage[feature] = { count: 0, resetAt: null };

      const usage = user.aiUsage[feature];

      // Reset mensuel si la date est passée (ou jamais initialisée)
      if (!usage.resetAt || new Date(usage.resetAt).getTime() <= now.getTime()) {
        usage.count = 0;
        usage.resetAt = nextMonthlyReset(now);
      }

      // Quota dépassé
      if (usage.count >= limit) {
        return res.status(429).json({
          message: 'Quota IA dépassé',
          upgrade: true,
          feature,
          used: usage.count,
          limit,
          resetAt: usage.resetAt,
        });
      }

      // OK : incrémente et continue
      usage.count += 1;
      user.markModified('aiUsage');
      await user.save();

      // Headers informatifs (utile côté UI pour afficher le compteur)
      res.set('X-AI-Quota-Used',  String(usage.count));
      res.set('X-AI-Quota-Limit', String(limit));
      res.set('X-AI-Quota-Reset', usage.resetAt.toISOString());

      next();
    } catch (err) {
      console.error('[aiQuota]', err.message);
      // Ne pas bloquer l'utilisateur sur erreur middleware — fail open
      next();
    }
  };
}

export default checkAiQuota;
