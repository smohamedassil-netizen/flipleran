import express from 'express';
import {
  getCourses, createCourse, getCourseById, updateCourse, deleteCourse,
  updateAiPersona, getCourseOutcomes, updateCourseOutcomes,
} from '../controllers/courseController.js';
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

// Objectifs d'apprentissage Bloom (Anderson & Krathwohl, 2001 ; Biggs, 1996)
router.get('/:id/outcomes', getCourseOutcomes);
router.put('/:id/outcomes', requireRole('professeur', 'admin'), updateCourseOutcomes);

export default router;
