import express from 'express';
import { getCourses, createCourse, getCourseById, updateCourse, deleteCourse, updateAiPersona } from '../controllers/courseController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

router.route('/')
  .get(getCourses)
  .post(requireRole('professeur', 'admin'), createCourse);
router.route('/:id')
  .get(getCourseById)
  .put(requireRole('professeur', 'admin'), updateCourse)
  .delete(requireRole('professeur', 'admin'), deleteCourse);
router.put('/:id/ai-persona', requireRole('professeur', 'admin'), updateAiPersona);

export default router;
