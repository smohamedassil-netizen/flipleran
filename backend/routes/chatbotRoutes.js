import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { checkAiQuota } from '../middleware/aiQuota.js';
import {
  getModuleChatbot,
  handleModuleMessage,
} from '../controllers/chatbotController.js';

const router = express.Router();

router.use(authMiddleware);

// Assistant Module — chat IA specialise par cours (seul agent IA conversationnel conserve)
router.get('/module/:courseId', getModuleChatbot);
// Envoi d'un message — soumis au quota IA mensuel (FREE = 30 / mois).
router.post('/module/:courseId/message', checkAiQuota('moduleBot'), handleModuleMessage);

export default router;
