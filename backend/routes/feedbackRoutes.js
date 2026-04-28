import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import {
  createFeedback,
  getMyFeedback,
  markFeedbackRead,
} from '../controllers/feedbackController.js';

const router = express.Router();
router.use(authMiddleware);

// Prof : envoyer un feedback cible a un etudiant
router.post('/', requireRole('professeur', 'admin'), createFeedback);

// Etudiant : recuperer ses feedbacks + les marquer comme lus
router.get('/mine',         requireRole('etudiant'), getMyFeedback);
router.put('/:id/read',     requireRole('etudiant'), markFeedbackRead);

export default router;
