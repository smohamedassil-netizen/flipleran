import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole    from '../middleware/roleMiddleware.js';
import {
  listByVideo,
  countsByCourse,
  create,
  update,
  remove,
  submitAnswer,
  stats,
} from '../controllers/videoQuestionController.js';

const router = express.Router();
router.use(authMiddleware);

/* ─── Lecture (auth requise — étudiant + prof + admin) ─── */
router.get('/video/:videoId', listByVideo);
// Batch — counts de questions par vidéo pour un cours (évite le N+1 du StudentCourse)
router.get('/by-course/:courseId/counts', countsByCourse);

/* ─── CRUD prof ─── */
router.post('/',       requireRole('professeur', 'admin'), create);
router.put('/:id',     requireRole('professeur', 'admin'), update);
router.delete('/:id',  requireRole('professeur', 'admin'), remove);

/* ─── Soumission étudiant (idempotent via index unique) ─── */
router.post('/:id/answer', requireRole('etudiant'), submitAnswer);

/* ─── Stats prof ─── */
router.get('/:id/stats', requireRole('professeur', 'admin'), stats);

export default router;
