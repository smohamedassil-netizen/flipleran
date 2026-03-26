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
