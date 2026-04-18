import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  handleChatbotMessage,
  getModuleChatbot,
  handleModuleMessage,
} from '../controllers/chatbotController.js';

const router = express.Router();

router.use(authMiddleware);

// Assistant générique
router.post('/message', handleChatbotMessage);

// Assistant spécialisé par module
router.get('/module/:courseId', getModuleChatbot);
router.post('/module/:courseId/message', handleModuleMessage);

export default router;
