import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import {
  listRewards,
  createReward,
  updateReward,
  deleteReward,
  claimReward,
  myClaims,
  listAllClaims,
  processClaim,
} from '../controllers/rewardController.js';

const router = express.Router();
router.use(authMiddleware);

// Catalogue
router.get('/', listRewards);
router.get('/mine', myClaims);
router.get('/claims', requireRole('admin'), listAllClaims);

router.post('/', requireRole('admin'), createReward);
router.post('/:id/claim', claimReward);

router.put('/:id', requireRole('admin'), updateReward);
router.put('/claims/:id', requireRole('admin'), processClaim);

router.delete('/:id', requireRole('admin'), deleteReward);

export default router;
