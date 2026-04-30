import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import {
  getCourseLeaderboard, getGlobalLeaderboard,
  getScopedLeaderboard, getHonorBoard,
} from '../controllers/leaderboardController.js';

const router = express.Router();

router.use(authMiddleware);

// F11B — Leaderboard 3 scopes (cohort | monthly | personal)
router.get('/',                 getScopedLeaderboard);

// Legacy (gardés pour rétrocompat — leaderboard par cours et global)
router.get('/course/:courseId', requireRole('etudiant'), getCourseLeaderboard);
router.get('/global',           requireRole('etudiant'), getGlobalLeaderboard);

// F11B — Honor board (top 3 du mois pour un cours)
router.get('/honor-board/:courseId', getHonorBoard);

export default router;
