import express from 'express';
import {
  getMyProgress,
  getCourseProgress,
  markVideoCompleted,
  getUpcomingDeadlines,
} from '../controllers/progressController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', getMyProgress);
// IMPORTANT : /upcoming doit être déclaré AVANT /:courseId pour ne pas être
// matché comme un courseId dynamique.
router.get('/upcoming', requireRole('etudiant'), getUpcomingDeadlines);
router.get('/:courseId', getCourseProgress);
router.post('/complete', markVideoCompleted);

export default router;
