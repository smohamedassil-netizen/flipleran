import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getLeaderboard, getMyBattleStats } from '../controllers/battleController.js';

const router = express.Router();
router.use(authMiddleware);

// Classement interne du Quiz Battle (séparé de l'XP global FlipLearn)
router.get('/leaderboard', getLeaderboard);

// Stats personnelles du joueur connecté
router.get('/mine', getMyBattleStats);

export default router;
