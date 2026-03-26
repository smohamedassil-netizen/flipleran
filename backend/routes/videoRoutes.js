import express from 'express';
import {
  uploadVideo,
  getVideosByCourse,
  getVideoById,
  saveProgress,
  getVideoStats,
  deleteVideo,
} from '../controllers/videoController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole    from '../middleware/roleMiddleware.js';
import uploadVideoMw  from '../middleware/uploadVideo.js';

const router = express.Router();
router.use(authMiddleware);

// Upload (professeur / admin uniquement) — timeout 5 min pour gros fichiers
router.post(
  '/upload',
  requireRole('professeur', 'admin'),
  (req, res, next) => { req.setTimeout(5 * 60 * 1000); next(); },
  uploadVideoMw.single('video'),
  uploadVideo
);

// Liste des vidéos d'un cours (avec progression de l'étudiant courant)
router.get('/course/:courseId', getVideosByCourse);

// Détail d'une vidéo
router.get('/:id', getVideoById);

// Progression (étudiant)
router.post('/:id/progress', saveProgress);

// Stats (professeur / admin)
router.get('/:id/stats', requireRole('professeur', 'admin'), getVideoStats);

// Suppression (professeur / admin)
router.delete('/:id', requireRole('professeur', 'admin'), deleteVideo);

export default router;
