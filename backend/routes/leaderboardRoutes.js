import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getCourseLeaderboard, getGlobalLeaderboard } from '../controllers/leaderboardController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/course/:courseId', getCourseLeaderboard);
router.get('/global',          getGlobalLeaderboard);

export default router;
