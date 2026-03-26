import express from 'express';
import {
  createQCM,
  getQCMByVideo,
  submitQCM,
  getQCMStats,
  updateQCM,
  deleteQCM,
  generateQCMWithAI,
} from '../controllers/qcmController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole    from '../middleware/roleMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

// Création (professeur / admin)
router.post('/create', requireRole('professeur', 'admin'), createQCM);

// Génération par IA (professeur / admin)
router.post('/generate-ai', requireRole('professeur', 'admin'), generateQCMWithAI);

// QCM d'une vidéo (accessible à tous les rôles connectés)
router.get('/video/:videoId', getQCMByVideo);

// Soumission (étudiant)
router.post('/submit', submitQCM);

// Stats (professeur / admin)
router.get('/:id/stats', requireRole('professeur', 'admin'), getQCMStats);

// Mise à jour / suppression (professeur / admin)
router.put('/:id',    requireRole('professeur', 'admin'), updateQCM);
router.delete('/:id', requireRole('professeur', 'admin'), deleteQCM);

export default router;
