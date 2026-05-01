import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  getMyAiQuota,
  getMyPreferences,
  updateMyPreferences,
} from '../controllers/userController.js';

const router = express.Router();
router.use(authMiddleware);

// Quotas IA de l'utilisateur connecté (plan, premiumUntil, compteurs par feature).
router.get('/me/ai-quota', getMyAiQuota);

// Préférences de notification de l'utilisateur connecté.
router.get('/me/preferences', getMyPreferences);
router.patch('/me/preferences', updateMyPreferences);

export default router;
