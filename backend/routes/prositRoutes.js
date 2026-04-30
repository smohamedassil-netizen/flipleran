import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import {
  createProsit, updateProsit, deleteProsit,
  listProsits, getProsit,
  generateGroupesAuto, setGroupesManual, joinGroupe,
  updateGroupeWorkspace, postContribution,
  transitionPhase, evaluateGroupe,
  getMyRolesProgress,
  getAiHelp,
  postSelfAssessment, postPeerAssessment, getMyAssessmentsStatus,
  getPeerAssessmentSummary, extendPeerAssessmentDeadline,
  getAiReport,
  getEligibleStudents,
} from '../controllers/prositController.js';
import {
  prositCoachStatus, prositCoachSuggest, prositCoachReview, prositCoachSources,
} from '../controllers/coachController.js';

const router = express.Router();
router.use(authMiddleware);

/* ─── Étudiant ── progression rôles (avant /:id pour ne pas matcher) ─── */
router.get('/me/roles-progress', requireRole('etudiant'), getMyRolesProgress);

/* ─── Lecture ─── */
router.get('/', listProsits);
router.get('/:id', getProsit);

/* ─── CRUD prof ─── */
router.post('/',         requireRole('professeur', 'admin'), createProsit);
router.put('/:id',       requireRole('professeur', 'admin'), updateProsit);
router.delete('/:id',    requireRole('professeur', 'admin'), deleteProsit);

/* ─── Groupes ─── */
router.post('/:id/groupes/auto',   requireRole('professeur', 'admin'), generateGroupesAuto);
router.post('/:id/groupes/manual', requireRole('professeur', 'admin'), setGroupesManual);
router.post('/:id/groupes/join',   requireRole('etudiant'), joinGroupe);

/* ─── Espace collaboratif (étudiant) ─── */
router.put('/:id/groupes/:gIdx',                requireRole('etudiant'), updateGroupeWorkspace);
router.post('/:id/groupes/:gIdx/contribution',  requireRole('etudiant'), postContribution);

/* ─── Transitions de phase (prof) ─── */
router.post('/:id/transition',         requireRole('professeur', 'admin'), transitionPhase);
router.put('/:id/groupes/:gIdx/evaluation', requireRole('professeur', 'admin'), evaluateGroupe);

/* ─── Aide IA Prosit (prof + étudiant) ─── */
router.post('/:id/ai-help', getAiHelp);

/* ─── Évaluation par les pairs (Falchikov 2005, Topping 1998) ─── */
router.post('/:id/groupes/:gIdx/self-assessment', requireRole('etudiant'), postSelfAssessment);
router.post('/:id/groupes/:gIdx/peer-assessment', requireRole('etudiant'), postPeerAssessment);
router.get('/:id/my-assessments-status',          requireRole('etudiant'), getMyAssessmentsStatus);
router.get('/:id/peer-assessments/summary',       requireRole('professeur', 'admin'), getPeerAssessmentSummary);
router.put('/:id/peer-assessments/deadline',      requireRole('professeur', 'admin'), extendPeerAssessmentDeadline);

/* ─── Détection plagiat IA (F2 sprint-final, Mitchell et al. 2023) ─── */
router.get('/:id/ai-report', requireRole('professeur', 'admin'), getAiReport);

/* ─── Composition de groupes (prof) ─── */
router.get('/:id/eligible-students', requireRole('professeur', 'admin'), getEligibleStudents);

/* ─── F7 — Coach IA anti-blocage (étudiant uniquement) ────────────────────
   Pas de quota IA : Groq gratuit + usage ponctuel par étudiant en blocage.
   Rate-limit global /api (300 req / 15min) reste appliqué côté server.js. */
router.get('/:id/coach/status',  requireRole('etudiant'), prositCoachStatus);
router.post('/:id/coach/suggest', requireRole('etudiant'), prositCoachSuggest);
router.post('/:id/coach/review',  requireRole('etudiant'), prositCoachReview);
router.get('/:id/coach/sources',  requireRole('etudiant'), prositCoachSources);

export default router;
