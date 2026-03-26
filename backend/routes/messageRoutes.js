import express from 'express';
import { getMessages, sendMessage, deleteMessage, getContacts } from '../controllers/messageController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/contacts', getContacts);
router.get('/:roomId', getMessages);
router.post('/', sendMessage);
router.delete('/:id', deleteMessage);

export default router;
