import express from 'express';
import {
  atRiskStudents,
  classOverview,
  getHealth,
  predict,
  predictForMe,
  trainModels,
} from '../controllers/aiController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/health', getHealth);
router.post('/train', trainModels);
router.post('/predict', predict);
router.get('/me/:courseId', predictForMe);
router.get('/at-risk', atRiskStudents);
router.get('/overview', classOverview);

export default router;
