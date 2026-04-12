import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import {
  startAnalysis,
  getAnalysis,
  getAnalysisStatus,
  deleteAnalysis,
} from '../controllers/videoAnalysisController.js';

const router = Router();

// Lancer une analyse — professeurs et admins uniquement
router.post('/:id/analyze', authMiddleware, requireRole('professeur', 'admin'), startAnalysis);

// Récupérer l'analyse complète — tous les utilisateurs authentifiés
router.get('/:id/analysis', authMiddleware, getAnalysis);

// Polling léger du status — tous les utilisateurs authentifiés
router.get('/:id/analysis/status', authMiddleware, getAnalysisStatus);

// Supprimer pour relancer — professeurs et admins
router.delete('/:id/analysis', authMiddleware, requireRole('professeur', 'admin'), deleteAnalysis);

export default router;
