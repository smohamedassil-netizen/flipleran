import express from 'express';
import { getMyProgress, getCourseProgress, markVideoCompleted } from '../controllers/progressController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', getMyProgress);
router.get('/:courseId', getCourseProgress);
router.post('/complete', markVideoCompleted);

export default router;
