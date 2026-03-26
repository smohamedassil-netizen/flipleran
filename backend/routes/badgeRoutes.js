import express from 'express';
import { getBadges, createBadge, awardBadge } from '../controllers/badgeController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

router.route('/').get(getBadges).post(createBadge);
router.post('/award', awardBadge);

export default router;
