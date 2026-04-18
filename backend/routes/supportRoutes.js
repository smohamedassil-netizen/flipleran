import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import {
  createTicket,
  getTickets,
  getMyTickets,
  getTicketById,
  acceptTicket,
  resolveTicket,
  addTicketMessage,
  updateTicketPriority,
} from '../controllers/supportController.js';

const router = express.Router();
router.use(authMiddleware);

// Routes user
router.post('/', createTicket);
router.get('/mine', getMyTickets);

// Routes admin (liste + gestion)
router.get('/', requireRole('admin'), getTickets);
router.put('/:id/accept', requireRole('admin'), acceptTicket);
router.put('/:id/resolve', requireRole('admin'), resolveTicket);
router.put('/:id/priority', requireRole('admin'), updateTicketPriority);

// Partagées : owner ou admin
router.get('/:id', getTicketById);
router.post('/:id/message', addTicketMessage);

export default router;
