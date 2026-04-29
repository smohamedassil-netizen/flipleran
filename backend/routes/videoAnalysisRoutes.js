import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { checkAiQuota } from '../middleware/aiQuota.js';
import {
  startAnalysis,
  getAnalysis,
  getAnalysisStatus,
  deleteAnalysis,
} from '../controllers/videoAnalysisController.js';

const router = Router();

// Lancer une analyse — tous les utilisateurs authentifiés (étudiants inclus).
// Soumis au quota IA mensuel (FREE = 3 / mois ; PREMIUM = illimité).
router.post('/:id/analyze', authMiddleware, checkAiQuota('videoAnalysis'), startAnalysis);

// Récupérer l'analyse complète — tous les utilisateurs authentifiés
router.get('/:id/analysis', authMiddleware, getAnalysis);

// Polling léger du status — tous les utilisateurs authentifiés
router.get('/:id/analysis/status', authMiddleware, getAnalysisStatus);

// Supprimer pour relancer — professeurs et admins uniquement
router.delete('/:id/analysis', authMiddleware, requireRole('professeur', 'admin'), deleteAnalysis);

export default router;
