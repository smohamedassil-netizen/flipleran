import express from 'express';
import { getBadges, createBadge, awardBadge } from '../controllers/badgeController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

router.route('/')
  .get(getBadges)
  .post(requireRole('professeur', 'admin'), createBadge);
router.post('/award', requireRole('professeur', 'admin'), awardBadge);

export default router;
