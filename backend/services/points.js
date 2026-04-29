import User    from '../models/User.js';
import Badge   from '../models/Badge.js';
import Progress from '../models/Progress.js';
import QCM     from '../models/QCM.js';
import Video   from '../models/Video.js';

/* ─── Badge definitions (seeded once) ──────────────────────────────────────── */
export const BADGE_DEFS = [
  {
    key:         'first_video',
    nom:         'Premier pas',
    description: 'Regarder votre première vidéo en entier',
    icon:        'Play',
    color:       '#3B82F6',
    rarity:      'common',
    condition:   '1 vidéo regardée à 80%+',
  },
  {
    key:         'assidu',
    nom:         'Assidu',
    description: 'Regarder 5 vidéos en entier',
    icon:        'BookOpen',
    color:       '#8B5CF6',
    rarity:      'rare',
    condition:   '5 vidéos regardées à 80%+',
  },
  {
    key:         'first_qcm',
    nom:         'Lancé',
    description: 'Compléter votre premier QCM',
    icon:        'CheckCircle',
    color:       '#10B981',
    rarity:      'common',
    condition:   '1 QCM complété',
  },
  {
    key:         'expert',
    nom:         'Expert',
    description: 'Obtenir plus de 90% à 3 QCM consécutifs',
    icon:        'Trophy',
    color:       '#F59E0B',
    rarity:      'epic',
    condition:   'Score > 90% sur 3 QCM consécutifs',
  },
  {
    key:         'champion',
    nom:         'Champion',
    description: 'Être classé 1er du classement dans un cours',
    icon:        'Crown',
    color:       '#EF4444',
    rarity:      'epic',
    condition:   'Rang #1 dans le classement',
  },
  {
    key:         'perfectionist',
    nom:         'Perfectionniste',
    description: 'Obtenir 100% à un QCM',
    icon:        'Star',
    color:       '#F59E0B',
    rarity:      'rare',
    condition:   '100% à un QCM',
  },
  {
    key:         'ai_explorer',
    nom:         'Explorateur IA',
    description: 'Première interaction avec un assistant IA d\'un module',
    icon:        'Sparkles',
    color:       '#9333EA',
    rarity:      'common',
    condition:   '1 message envoyé à un Assistant IA de cours',
  },
  {
    key:         'project_completed',
    nom:         'Projet bouclé',
    description: 'Terminer un projet (mono ou groupé)',
    icon:        'FolderCheck',
    color:       '#0EA5E9',
    rarity:      'rare',
    condition:   '1 projet passé en statut "termine"',
  },
  {
    key:         'prosit_completed',
    nom:         'Prositer',
    description: 'Premier Prosit terminé et évalué',
    icon:        'Lightbulb',
    color:       '#F59E0B',
    rarity:      'rare',
    condition:   '1 Prosit avec phase Retour évaluée par le tuteur',
  },
  {
    key:         'prosit_animator',
    nom:         'Animateur né',
    description: 'Avoir endossé le rôle d\'Animateur dans 3 Prosits',
    icon:        'Mic',
    color:       '#8B5CF6',
    rarity:      'epic',
    condition:   '3 Prosits joués en tant qu\'Animateur',
  },
  {
    key:         'prosit_perfect',
    nom:         'Solution exemplaire',
    description: 'Obtenir une note ≥ 18/20 sur un Prosit',
    icon:        'Award',
    color:       '#EF4444',
    rarity:      'epic',
    condition:   'Note finale ≥ 18/20 sur un Prosit',
  },
];

/* ─── Seed badges into DB (call once on server start) ───────────────────────── */
export async function seedBadges() {
  for (const def of BADGE_DEFS) {
    await Badge.findOneAndUpdate({ key: def.key }, def, { upsert: true, new: true });
  }
}

/* ─── Award a badge to user (idempotent) ───────────────────────────────────── */
async function awardBadge(user, badgeKey) {
  const badge = await Badge.findOne({ key: badgeKey });
  if (!badge) return null;

  const already = user.badges.some((b) => b.toString() === badge._id.toString());
  if (already) return null;

  user.badges.push(badge._id);
  return badge; // caller must save user
}

/* ─── Check and award all applicable badges ────────────────────────────────── */
async function checkBadges(user, { videosCompleted = 0, qcmResults = [] } = {}) {
  // Only students can earn badges
  if (user.role !== 'etudiant') return [];

  const newBadges = [];

  // "Premier pas" — 1st video
  if (videosCompleted >= 1) {
    const b = await awardBadge(user, 'first_video');
    if (b) newBadges.push(b);
  }

  // "Assidu" — 5 videos
  if (videosCompleted >= 5) {
    const b = await awardBadge(user, 'assidu');
    if (b) newBadges.push(b);
  }

  // "Lancé" — 1st QCM
  if (qcmResults.length >= 1) {
    const b = await awardBadge(user, 'first_qcm');
    if (b) newBadges.push(b);
  }

  // "Perfectionniste" — 100% on any QCM
  const hasPerfect = qcmResults.some((r) => r.score === 100);
  if (hasPerfect) {
    const b = await awardBadge(user, 'perfectionist');
    if (b) newBadges.push(b);
  }

  // "Expert" — >90% on 3 consecutive QCMs
  if (qcmResults.length >= 3) {
    const last3 = qcmResults.slice(-3);
    if (last3.every((r) => r.score > 90)) {
      const b = await awardBadge(user, 'expert');
      if (b) newBadges.push(b);
    }
  }

  return newBadges;
}

/* ─── Count total videos completed across all courses ──────────────────────── */
async function countTotalVideosCompleted(userId) {
  const progresses = await Progress.find({ userId });
  return progresses.reduce((sum, p) => sum + (p.videosCompleted?.length ?? 0), 0);
}

/* ─── Get all QCM results for a user (across all QCMs) ─────────────────────── */
async function getAllQCMResults(userId) {
  const qcms = await QCM.find({ 'resultats.userId': userId });
  const results = [];
  for (const qcm of qcms) {
    const myResults = qcm.resultats.filter(
      (r) => r.userId.toString() === userId.toString()
    );
    results.push(...myResults);
  }
  // Sort by completedAt ascending
  results.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
  return results;
}

/* ─── Main: add points and check badges ────────────────────────────────────── */
/**
 * @param {string}  userId
 * @param {number}  amount
 * @param {string}  reason   — 'video_watched' | 'qcm_completed' | 'qcm_bonus'
 * @returns {{ newPoints: number, newBadges: Badge[] }}
 */
export async function addPoints(userId, amount, reason) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // Only students accumulate points
  if (user.role !== 'etudiant') return { newPoints: user.points ?? 0, newBadges: [] };

  user.points = (user.points ?? 0) + amount;

  // Gather context for badge checking
  const videosCompleted = await countTotalVideosCompleted(userId);
  const qcmResults      = await getAllQCMResults(userId);

  const newBadges = await checkBadges(user, { videosCompleted, qcmResults });

  await user.save();

  return {
    newPoints: user.points,
    newBadges,
  };
}

/* ─── Auto-trigger badges hors flux points (chatbot IA, projet, etc.) ─── */
/**
 * À appeler depuis n'importe quel controller pour attribuer un badge automatiquement
 * en réaction à une action utilisateur (1ère interaction IA, projet terminé, etc.).
 * @param {string} userId
 * @param {'ai_explorer'|'project_completed'|string} badgeKey
 * @returns {Promise<{ badge: Badge|null, isNew: boolean }>}
 */
export async function triggerAutoBadge(userId, badgeKey) {
  const user = await User.findById(userId);
  if (!user || user.role !== 'etudiant') return { badge: null, isNew: false };

  const badge = await awardBadge(user, badgeKey);
  if (!badge) return { badge: null, isNew: false };

  await user.save();
  return { badge, isNew: true };
}

/* ─── Check champion badge for a course ────────────────────────────────────── */
/**
 * Call after any points update to see if someone became #1.
 * @param {string} courseId
 */
export async function checkChampionBadge(courseId) {
  // Get all students enrolled in the course (have a Progress doc)
  const progresses = await Progress.find({ courseId }).populate('userId', 'points badges');
  if (!progresses.length) return [];

  // Sort by points desc
  progresses.sort((a, b) => (b.userId?.points ?? 0) - (a.userId?.points ?? 0));
  const top = progresses[0];
  if (!top?.userId) return [];

  const user = await User.findById(top.userId._id);
  const badge = await Badge.findOne({ key: 'champion' });
  if (!badge) return [];

  const already = user.badges.some((b) => b.toString() === badge._id.toString());
  if (already) return [];

  user.badges.push(badge._id);
  await user.save();
  return [badge];
}
