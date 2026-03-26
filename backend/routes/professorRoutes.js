import express from 'express';
import { getCourseDashboard, getProfessorCourses } from '../controllers/dashboardController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole    from '../middleware/roleMiddleware.js';

const router = express.Router();
router.use(authMiddleware);
router.use(requireRole('professeur', 'admin'));

router.get('/courses',                  getProfessorCourses);
router.get('/dashboard/:courseId',      getCourseDashboard);

export default router;
