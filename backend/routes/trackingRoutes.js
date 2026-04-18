import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import {
  getCourseTracking,
  sendManualReminder,
  getMyCoursesSummary,
} from '../controllers/trackingController.js';

const router = express.Router();

router.use(authMiddleware, requireRole('professeur', 'admin'));

router.get('/my-courses', getMyCoursesSummary);
router.get('/course/:courseId', getCourseTracking);
router.post('/course/:courseId/remind', sendManualReminder);

export default router;
