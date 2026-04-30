import StudyStreak from '../models/StudyStreak.js';

/**
 * streakService — Logique de mise à jour des streaks (F11 sprint-final).
 *
 * @see Deci & Ryan 1985, Csikszentmihalyi 1990, Werbach & Hunter 2012.
 *
 * Algorithme `updateStreak` :
 *  - Activité aujourd'hui déjà comptée → incrémente activitiesCount du jour.
 *  - Activité hier ET aujourd'hui (premier hit du jour) → currentStreak += 1.
 *  - Gap d'1 jour ET savedDays > 0 → utilise un freeze (currentStreak conservé).
 *  - Gap > 1 jour ou pas de freeze dispo → reset currentStreak à 1.
 *  - À chaque fois : update longestStreak si dépassé.
 *
 * Bonus : 1 saved day gagné toutes les 7 actions consécutives (max 3 stockables).
 */

const STREAK_BADGE_THRESHOLDS = [3, 7, 14, 30, 60, 100, 365];
const MAX_HISTORY_DAYS = 90;
const MAX_SAVED_DAYS = 3;

/**
 * Renvoie 'YYYY-MM-DD' en UTC pour la date fournie (par défaut now).
 */
function dateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/**
 * Renvoie la différence en jours entiers UTC entre deux clés 'YYYY-MM-DD'.
 * Returns Infinity si une des deux est null/invalide.
 */
export function daysDiff(keyA, keyB) {
  if (!keyA || !keyB) return Infinity;
  const a = new Date(keyA + 'T00:00:00Z').getTime();
  const b = new Date(keyB + 'T00:00:00Z').getTime();
  if (isNaN(a) || isNaN(b)) return Infinity;
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/**
 * Met à jour le streak d'un étudiant suite à une action (vidéo complétée,
 * QCM, contribution Prosit, etc.). Idempotent dans la même journée.
 *
 * @param {string} userId
 * @param {string} activityType - libre, journalisé pour stats futures
 * @param {number} xpEarned - optionnel, ajouté au total du jour
 * @returns {Promise<{ currentStreak, longestStreak, savedDays, justUnlocked: number[] }>}
 *   `justUnlocked` = paliers de badge atteints durant cet appel (3, 7, 14, 30…)
 */
export async function updateStreak(userId, activityType = 'generic', xpEarned = 0) {
  const today = dateKey();
  const yesterday = dateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

  let streak = await StudyStreak.findOne({ userId });
  if (!streak) {
    streak = await StudyStreak.create({
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: today,
      history: [{ date: today, activitiesCount: 1, xpEarned }],
    });
    return {
      currentStreak: 1, longestStreak: 1, savedDays: 0,
      justUnlocked: [], isFirstActivity: true,
    };
  }

  const previousStreak = streak.currentStreak;
  const previousLongest = streak.longestStreak;

  if (streak.lastActivityDate === today) {
    // Activité déjà comptée aujourd'hui — on incrémente juste la dernière entrée
    const last = streak.history[streak.history.length - 1];
    if (last && last.date === today) {
      last.activitiesCount += 1;
      last.xpEarned = (last.xpEarned || 0) + xpEarned;
    }
    await streak.save();
    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      savedDays: streak.savedDays,
      justUnlocked: [],
      isFirstActivity: false,
    };
  }

  const gap = daysDiff(streak.lastActivityDate, today);

  if (gap === 1) {
    // Hier + aujourd'hui = streak continue
    streak.currentStreak += 1;
  } else if (gap === 2 && streak.savedDays > 0) {
    // Gap 1 jour mais freeze dispo → consume + streak conservé
    streak.savedDays -= 1;
    streak.freezeUsedCount += 1;
  } else {
    // Gap > 1 jour OU gap 2 sans freeze → reset
    streak.currentStreak = 1;
  }

  streak.lastActivityDate = today;
  if (streak.currentStreak > streak.longestStreak) {
    streak.longestStreak = streak.currentStreak;
  }

  // Ajoute l'entrée du jour
  streak.history.push({ date: today, activitiesCount: 1, xpEarned });
  // Truncate history aux 90 derniers jours
  if (streak.history.length > MAX_HISTORY_DAYS) {
    streak.history = streak.history.slice(-MAX_HISTORY_DAYS);
  }

  // Bonus saved day : toutes les 7 actions consécutives
  if (streak.currentStreak > 0 && streak.currentStreak % 7 === 0 && streak.savedDays < MAX_SAVED_DAYS) {
    streak.savedDays += 1;
  }

  await streak.save();

  // Calcul des paliers fraîchement atteints
  const justUnlocked = STREAK_BADGE_THRESHOLDS.filter(
    (t) => previousStreak < t && streak.currentStreak >= t
  );

  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    savedDays: streak.savedDays,
    justUnlocked,
    isFirstActivity: false,
    crossedLongest: streak.longestStreak > previousLongest,
  };
}

/**
 * Lecture rapide pour endpoint /api/streak.
 */
export async function getStreak(userId) {
  const streak = await StudyStreak.findOne({ userId }).lean();
  if (!streak) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      savedDays: 0,
      freezeUsedCount: 0,
      isActiveToday: false,
      history: [],
    };
  }
  const today = dateKey();
  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    lastActivityDate: streak.lastActivityDate,
    savedDays: streak.savedDays,
    freezeUsedCount: streak.freezeUsedCount,
    isActiveToday: streak.lastActivityDate === today,
    history: streak.history.slice(-30), // 30 derniers jours pour le graphe
  };
}

export default { updateStreak, getStreak, daysDiff };
