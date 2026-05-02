import express from 'express';
import {
  getCourses, createCourse, getCourseById, updateCourse, deleteCourse,
  updateAiPersona, getCourseOutcomes, updateCourseOutcomes,
  getCourseInsights, getStudentSuggestion,
} from '../controllers/courseController.js';
import {
  getMyCompletion, submitCompletion, listCompletions,
} from '../controllers/courseCompletionController.js';
import {
  getMyGrade, listGrades, updateGradeSettings,
} from '../controllers/courseGradeController.js';
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

// Insights pédagogiques IA (F3 sprint-final, Hattie 2009 + Black & Wiliam 1998)
router.get('/:id/insights',                       requireRole('professeur', 'admin'), getCourseInsights);
router.get('/:id/insights/student/:userId',       requireRole('professeur', 'admin'), getStudentSuggestion);

// Validation finale du module — auto-évaluation métacognitive (Lebrun 2007, Tardif 1998)
router.get('/:id/my-completion',                  getMyCompletion);
router.post('/:id/validate',                      requireRole('etudiant'), submitCompletion);
router.get('/:id/completions',                    requireRole('professeur', 'admin'), listCompletions);

// Note de contrôle continu — séparée des XP gamification (Black & Wiliam 1998)
router.get('/:id/my-grade',                       requireRole('etudiant'), getMyGrade);
router.get('/:id/grades',                         requireRole('professeur', 'admin'), listGrades);
router.put('/:id/grade-settings',                 requireRole('professeur', 'admin'), updateGradeSettings);

export default router;
