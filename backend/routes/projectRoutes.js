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
  // F8 — feedback livrable + progress + rubric + templates
  addLivrableFeedback,
  getProjectProgress,
  setProjectRubric,
  getProjectRubric,
  getProjectTemplate,
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

/* ─── F7 — Coach IA anti-blocage (étudiant uniquement) ───────────────────
   Pas de quota IA : Groq gratuit + usage ponctuel par étudiant en blocage. */
router.get('/:id/coach/status',  requireRole('etudiant'), projectCoachStatus);
router.post('/:id/coach/suggest', requireRole('etudiant'), projectCoachSuggest);
router.post('/:id/coach/review',  requireRole('etudiant'), projectCoachReview);
router.get('/:id/coach/sources',  requireRole('etudiant'), projectCoachSources);

/* ─── F8 — Templates phases/rubric par type (route avec préfixe statique) ──
   IMPORTANT : ces routes utilisent /templates/:type qui ne conflicte pas
   avec /:id (mongoid 24 chars), mais on les laisse en haut du bloc pour clarté. */
router.get('/templates/:type', getProjectTemplate);

/* ─── F8 — Feedback livrable / progress / rubric ───────────────────────── */
router.post('/:id/livrables/:livrableId/feedback', requireRole('professeur', 'admin'), addLivrableFeedback);
router.get('/:id/progress',  getProjectProgress);
router.get('/:id/rubric',    getProjectRubric);
router.put('/:id/rubric',    requireRole('professeur', 'admin'), setProjectRubric);

export default router;
