import express from 'express';
import {
  getPathByCourse,
  createPath,
  updatePath,
  deletePath,
  publishPath,
} from '../controllers/learningPathController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';

/**
 * Routes du parcours pédagogique scénarisé (Lebrun, 2007).
 *
 * - GET /course/:courseId  : tous rôles (étudiants ne voient que les parcours publiés)
 * - POST /                 : prof / admin (création d'un nouveau parcours)
 * - PUT /:id               : prof / admin (édition complète des steps)
 * - DELETE /:id            : prof / admin
 * - POST /:id/publish      : prof / admin (passe publishedAt = now)
 */
const router = express.Router();
router.use(authMiddleware);

router.get('/course/:courseId', getPathByCourse);

router.post('/', requireRole('professeur', 'admin'), createPath);
router.put('/:id', requireRole('professeur', 'admin'), updatePath);
router.delete('/:id', requireRole('professeur', 'admin'), deletePath);
router.post('/:id/publish', requireRole('professeur', 'admin'), publishPath);

export default router;
