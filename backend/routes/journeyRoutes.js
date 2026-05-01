import express from 'express';
import { getMyJourney } from '../controllers/journeyController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

// CAI — état des 5 étapes pour l'étudiant authentifié sur un cours donné
router.get('/me/:courseId', getMyJourney);

export default router;
