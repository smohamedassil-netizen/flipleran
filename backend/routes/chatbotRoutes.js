import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  getModuleChatbot,
  handleModuleMessage,
} from '../controllers/chatbotController.js';

const router = express.Router();

router.use(authMiddleware);

// Assistant Module — chat IA specialise par cours (seul agent IA conversationnel conserve)
router.get('/module/:courseId', getModuleChatbot);
router.post('/module/:courseId/message', handleModuleMessage);

export default router;
