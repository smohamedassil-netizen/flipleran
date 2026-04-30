import User from '../models/User.js';
import { getStreak } from '../services/streakService.js';
import { getCurrentLevel, XP_LEVELS } from '../services/levelsService.js';

/**
 * gamificationController — Endpoints lecture pour streaks/niveaux/quêtes
 * (F11 sprint-final). L'écriture des streaks se fait via les hooks dans
 * les controllers d'activité (videoController, qcmController, etc.).
 */

/* ─── GET /api/streak ───────────────────────────────────────────────────── */
export const getMyStreak = async (req, res) => {
  try {
    const data = await getStreak(req.user.id);
    res.json(data);
  } catch (err) {
    console.error('getMyStreak error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/levels/me ───────────────────────────────────────────────── */
export const getMyLevel = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('points').lean();
    const points = user?.points ?? 0;
    const level = getCurrentLevel(points);
    res.json(level);
  } catch (err) {
    console.error('getMyLevel error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/levels (pour tous, ex: page profil ou prof tracking) ────── */
export const getLevelsForUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('points prenom nom').lean();
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    const level = getCurrentLevel(user.points || 0);
    res.json({ ...level, prenom: user.prenom, nom: user.nom });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/levels/scale (référence pour UI : la liste des paliers) ── */
export const getLevelsScale = (_req, res) => {
  res.json({
    levels: XP_LEVELS.map((l) => ({
      key: l.key,
      title: l.title,
      min: l.min,
      max: l.max === Infinity ? null : l.max,
      color: l.color,
    })),
  });
};

export default { getMyStreak, getMyLevel, getLevelsForUser, getLevelsScale };
