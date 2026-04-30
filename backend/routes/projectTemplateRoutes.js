import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import {
  listTemplates,
  getTemplate,
  markTemplateUsed,
  generateTemplate,
} from '../controllers/projectTemplateController.js';

/**
 * Routes F10 — Bibliothèque de templates de projets.
 *
 * Accessibles à tous les profs et admins. Étudiants : lecture seule (peut
 * être pertinent pour s'inspirer mais pas de "use" — ils ne créent pas de
 * projets directement).
 */
const router = express.Router();
router.use(authMiddleware);

// Lecture publique (tous rôles authentifiés)
router.get('/',          listTemplates);
router.get('/:id',       getTemplate);

// Actions prof/admin
router.post('/:id/use',  requireRole('professeur', 'admin'), markTemplateUsed);
router.post('/generate', requireRole('professeur', 'admin'), generateTemplate);

export default router;
