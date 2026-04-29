import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { getCourseLeaderboard, getGlobalLeaderboard } from '../controllers/leaderboardController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/course/:courseId', requireRole('etudiant'), getCourseLeaderboard);
router.get('/global',           requireRole('etudiant'), getGlobalLeaderboard);

export default router;
