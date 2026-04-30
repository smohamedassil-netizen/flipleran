/**
 * levelsService — Système de niveaux/titres basé sur les XP cumulés (F11
 * sprint-final).
 *
 * @see Werbach & Hunter (2012). For the Win. Les niveaux donnent du sens
 *      cumulatif aux XP et créent des paliers visibles d'évolution.
 * @see Csikszentmihalyi (1990). Flow. Les paliers progressifs gardent
 *      l'apprenant dans la zone optimale (challenge croissant).
 *
 * 5 niveaux : Débutant → Apprenti → Confirmé → Expert → Maître.
 * Couleurs choisies pour cohérence avec le design system (slate / blue /
 * green / purple / amber).
 */

export const XP_LEVELS = [
  { key: 'debutant',  title: 'Débutant',  min: 0,     max: 500,    color: '#94A3B8' },
  { key: 'apprenti',  title: 'Apprenti',  min: 500,   max: 2000,   color: '#3B82F6' },
  { key: 'confirme',  title: 'Confirmé',  min: 2000,  max: 5000,   color: '#10B981' },
  { key: 'expert',    title: 'Expert',    min: 5000,  max: 10000,  color: '#8B5CF6' },
  { key: 'maitre',    title: 'Maître',    min: 10000, max: Infinity, color: '#F59E0B' },
];

/**
 * Renvoie le niveau correspondant à un total d'XP.
 * @param {number} points
 * @returns {{
 *   key, title, color,
 *   current,         // XP courants
 *   levelMin,        // seuil bas du niveau actuel
 *   levelMax,        // seuil haut (Infinity pour Maître)
 *   next,            // titre du niveau suivant (null pour Maître)
 *   progressPercent, // progression dans le niveau actuel (0-100)
 * }}
 */
export function getCurrentLevel(points = 0) {
  const xp = Math.max(0, Number(points) || 0);
  const idx = XP_LEVELS.findIndex((lvl) => xp >= lvl.min && xp < lvl.max);
  const level = idx === -1 ? XP_LEVELS[XP_LEVELS.length - 1] : XP_LEVELS[idx];
  const nextLevel = idx >= 0 && idx < XP_LEVELS.length - 1 ? XP_LEVELS[idx + 1] : null;
  const range = (level.max === Infinity ? 0 : level.max - level.min);
  const inRange = xp - level.min;
  const progressPercent = range === 0 ? 100 : Math.max(0, Math.min(100, Math.round((inRange / range) * 100)));

  return {
    key:     level.key,
    title:   level.title,
    color:   level.color,
    current: xp,
    levelMin: level.min,
    levelMax: level.max === Infinity ? null : level.max,
    next:    nextLevel ? nextLevel.title : null,
    nextThreshold: nextLevel ? nextLevel.min : null,
    pointsToNext: nextLevel ? Math.max(0, nextLevel.min - xp) : 0,
    progressPercent,
  };
}

export default { getCurrentLevel, XP_LEVELS };
