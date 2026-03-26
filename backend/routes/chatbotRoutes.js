import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { handleChatbotMessage } from '../controllers/chatbotController.js';

const router = express.Router();

router.use(authMiddleware);
router.post('/message', handleChatbotMessage);

export default router;
