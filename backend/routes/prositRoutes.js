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
} from '../controllers/prositController.js';

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

export default router;
