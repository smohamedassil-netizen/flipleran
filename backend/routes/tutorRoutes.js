import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import {
  postChat, postAskVideo, getSuggestions, getContext, getAskVideoQuota,
} from '../controllers/tutorController.js';

/**
 * Routes du tuteur IA personnel (F4 sprint-final).
 * Réservé aux étudiants — les profs et admins n'ont pas leur propre tuteur,
 * ils utilisent le module assistant ou les insights pédagogiques.
 *
 * @see Bandura 1977, Vygotsky 1978, Mazur 1997.
 */
const router = express.Router();
router.use(authMiddleware);
router.use(requireRole('etudiant'));

router.post('/chat',             postChat);
router.post('/ask-video',        postAskVideo);
router.get('/ask-video/quota',   getAskVideoQuota);
router.get('/suggestions',       getSuggestions);
router.get('/context',           getContext);

export default router;
