import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  getMyStreak, getMyLevel, getLevelsForUser, getLevelsScale,
} from '../controllers/gamificationController.js';
import {
  getMyQuests, refreshMyQuests,
} from '../controllers/questController.js';

/**
 * Routes F11A — Streaks, niveaux, quêtes hebdo IA.
 *
 * Toutes auth-protégées. Les endpoints sont passifs (lecture) — le tracking
 * d'activité se fait via les hooks intégrés dans videoController, etc.
 */
const router = express.Router();
router.use(authMiddleware);

/* Streak */
router.get('/streak', getMyStreak);

/* Niveaux */
router.get('/levels/scale',         getLevelsScale);
router.get('/levels/me',            getMyLevel);
router.get('/levels/user/:userId',  getLevelsForUser);

/* Quêtes hebdomadaires */
router.get('/quests',               getMyQuests);
router.post('/quests/refresh',      refreshMyQuests);

export default router;
