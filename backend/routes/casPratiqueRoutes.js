/**
 * casPratiqueRoutes.js — /api/cas-pratiques/*
 * Routes du nouveau flow "Cas pratique" (refonte 2026-05-09).
 *
 * Réutilise certains endpoints legacy via prositController (uploads,
 * détection IA, coach IA Groq) pour ne pas dupliquer la logique.
 */
import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import {
  listCasPratiques, getCasPratique,
  createCasPratique, updateCasPratique, deleteCasPratique,
  setGroup, suggestRotation,
  updateCadrage, validateCadrage,
  submitLivrable, listLivrables, startPhaseBilan,
  updateBilan,
  evaluate,
  getEligibleStudents,
} from '../controllers/casPratiqueController.js';
import {
  getAiHelp,
  getAiReport,
} from '../controllers/prositController.js';

const router = express.Router();
router.use(authMiddleware);

/* ─── Lecture ─── */
router.get('/',                listCasPratiques);
router.get('/:id',             getCasPratique);

/* ─── CRUD prof ─── */
router.post('/',               requireRole('professeur', 'admin'), createCasPratique);
router.put('/:id',             requireRole('professeur', 'admin'), updateCasPratique);
router.delete('/:id',          requireRole('professeur', 'admin'), deleteCasPratique);

/* ─── Composition du groupe ─── */
router.get('/:id/eligible-students',         requireRole('professeur', 'admin'), getEligibleStudents);
router.post('/:id/group',                    requireRole('professeur', 'admin'), setGroup);
router.post('/:id/role-rotation/suggest',    requireRole('professeur', 'admin'), suggestRotation);

/* ─── Phase Cadrage ─── */
router.put('/:id/cadrage',                   requireRole('etudiant'),            updateCadrage);
router.post('/:id/cadrage/validate',         requireRole('etudiant'),            validateCadrage);

/* ─── Phase Travail individuel ─── */
router.post('/:id/livrable',                 requireRole('etudiant'),            submitLivrable);
router.get('/:id/livrables',                 requireRole('professeur', 'admin'), listLivrables);
router.post('/:id/phase-bilan',              requireRole('professeur', 'admin'), startPhaseBilan);

/* ─── Phase Bilan ─── */
router.put('/:id/bilan',                     requireRole('etudiant'),            updateBilan);

/* ─── Évaluation ─── */
router.post('/:id/evaluate',                 requireRole('professeur', 'admin'), evaluate);

/* ─── Aide IA + rapport intégrité (réutilisés depuis prositController) ─── */
router.post('/:id/ai-help',                  getAiHelp);
router.get('/:id/ai-report',                 requireRole('professeur', 'admin'), getAiReport);

export default router;
