import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getMyAiQuota } from '../controllers/userController.js';

const router = express.Router();
router.use(authMiddleware);

// Quotas IA de l'utilisateur connecté (plan, premiumUntil, compteurs par feature).
router.get('/me/ai-quota', getMyAiQuota);

export default router;
