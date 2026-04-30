import WeeklyQuest from '../models/WeeklyQuest.js';
import { generateForUser, getWeekStart } from '../services/questGenerator.js';

/**
 * questController — Endpoints lecture des quêtes hebdomadaires (F11A).
 * L'écriture se fait via les hooks dans les controllers d'activité.
 */

/* ─── GET /api/quests ───────────────────────────────────────────────────── */
/**
 * Renvoie les quêtes de la semaine de l'étudiant. Si aucune, déclenche
 * `generateForUser` paresseusement (utile pour une démo ou un nouvel
 * étudiant qui n'attend pas le cron lundi).
 */
export const getMyQuests = async (req, res) => {
  try {
    const weekStart = getWeekStart();
    let weekly = await WeeklyQuest.findOne({ userId: req.user.id, weekStart }).lean();
    if (!weekly) {
      const result = await generateForUser(req.user.id);
      weekly = result.weekly || null;
    }
    if (!weekly) {
      return res.json({ weekStart, quests: [], source: null });
    }
    res.json(weekly);
  } catch (err) {
    console.error('getMyQuests error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ─── POST /api/quests/refresh (régénération manuelle, dev only) ────── */
/**
 * Permet de regénérer les quêtes de la semaine en supprimant les actuelles.
 * Utile en démo si l'étudiant veut voir l'IA tourner devant le jury.
 * Limité à 1 par jour côté UI.
 */
export const refreshMyQuests = async (req, res) => {
  try {
    const weekStart = getWeekStart();
    await WeeklyQuest.deleteOne({ userId: req.user.id, weekStart });
    const result = await generateForUser(req.user.id);
    res.json(result.weekly || { quests: [] });
  } catch (err) {
    console.error('refreshMyQuests error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

export default { getMyQuests, refreshMyQuests };
