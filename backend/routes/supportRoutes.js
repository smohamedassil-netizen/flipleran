import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { createTicket, getTickets, acceptTicket, resolveTicket } from '../controllers/supportController.js';

const router = express.Router();
router.use(authMiddleware);

router.post('/', createTicket);
router.get('/', getTickets);
router.put('/:id/accept', acceptTicket);
router.put('/:id/resolve', resolveTicket);

export default router;
