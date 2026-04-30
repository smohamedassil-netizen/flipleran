import express from 'express';
import {
  startAutoPrep,
  getAutoPrepJob,
  getLatestForVideo,
  publishAutoPrep,
} from '../controllers/courseAutoPrepController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';

/**
 * Routes d'auto-préparation IA d'un cours.
 *
 *   POST   /api/courses/:courseId/videos/:videoId/auto-prep         (prof, lance le job)
 *   GET    /api/courses/:courseId/videos/:videoId/auto-prep/latest  (prof, dernier job pour cette vidéo)
 *   GET    /api/courses/auto-prep-jobs/:jobId                        (prof, statut + résultats)
 *   POST   /api/courses/auto-prep-jobs/:jobId/publish                (prof, applique les sélections)
 *
 * Limite quotidienne : 5 jobs / prof / jour (vérifiée dans le controller,
 * pas via le middleware aiQuota qui est mensuel).
 */
const router = express.Router();
router.use(authMiddleware);
router.use(requireRole('professeur', 'admin'));

router.post('/:courseId/videos/:videoId/auto-prep',         startAutoPrep);
router.get('/:courseId/videos/:videoId/auto-prep/latest',   getLatestForVideo);

// Routes job-centric (pas dépendantes du courseId/videoId)
const jobRouter = express.Router();
jobRouter.use(authMiddleware);
jobRouter.use(requireRole('professeur', 'admin'));
jobRouter.get('/:jobId',          getAutoPrepJob);
jobRouter.post('/:jobId/publish', publishAutoPrep);

export { jobRouter as autoPrepJobRouter };
export default router;
