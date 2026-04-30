import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import uploadResource, { uploadLivrable } from '../middleware/uploadResource.js';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  createGroupsRandom,
  createGroupsManual,
  updatePhase,
  addLivrable,
  addEvaluation,
  getEvaluations,
  getAiHelp,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  addIdea,
  deleteIdea,
} from '../controllers/projectController.js';
import {
  projectCoachStatus, projectCoachSuggest, projectCoachReview, projectCoachSources,
} from '../controllers/coachController.js';

const router = express.Router();
router.use(authMiddleware);

// CRUD projet
router.post('/',    requireRole('professeur'), createProject);
router.get('/',     getProjects);
router.get('/:id',  getProject);
router.put('/:id',  requireRole('professeur'), updateProject);
router.delete('/:id', requireRole('professeur', 'admin'), deleteProject);

// Groupes
router.post('/:id/groupes/random', requireRole('professeur'), createGroupsRandom);
router.post('/:id/groupes',        requireRole('professeur'), createGroupsManual);

// Phases
router.put('/:id/phases/:phaseId', requireRole('etudiant', 'professeur', 'admin'), updatePhase);

// Checklist (tâches d'une phase)
router.post('/:id/phases/:phaseId/checklist', requireRole('professeur', 'admin'), addChecklistItem);
router.put('/:id/phases/:phaseId/checklist/:itemId', toggleChecklistItem);
router.delete('/:id/phases/:phaseId/checklist/:itemId', requireRole('professeur', 'admin'), deleteChecklistItem);

// Idées / suggestions (prof only)
router.post('/:id/ideas',          requireRole('professeur', 'admin'), addIdea);
router.delete('/:id/ideas/:ideaId', requireRole('professeur', 'admin'), deleteIdea);

// Livrables (upload fichier)
router.post('/:id/livrables', requireRole('etudiant'), uploadLivrable.single('file'), addLivrable);

// Évaluations
router.post('/:id/evaluations', requireRole('etudiant'), addEvaluation);
router.get('/:id/evaluations',  requireRole('professeur', 'admin'), getEvaluations);

// Aide IA
router.post('/:id/ai-help', requireRole('etudiant', 'professeur'), getAiHelp);

/* DÉSACTIVÉ pour PFE L3 — perspective d'évolution (F7 — Coach IA anti-blocage Projet)
router.get('/:id/coach/status',  requireRole('etudiant'), projectCoachStatus);
router.post('/:id/coach/suggest', requireRole('etudiant'), projectCoachSuggest);
router.post('/:id/coach/review',  requireRole('etudiant'), projectCoachReview);
router.get('/:id/coach/sources',  requireRole('etudiant'), projectCoachSources);
*/

export default router;
