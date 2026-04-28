import express from 'express';
import { getCards, createCard, updateCard, deleteCard } from '../controllers/cardController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';

const router = express.Router({ mergeParams: true });

// Cards = contenu des decks de flashcards (outil etudiant)
router.use(authMiddleware);
router.use(requireRole('etudiant'));

router.route('/').get(getCards).post(createCard);
router.route('/:id').put(updateCard).delete(deleteCard);

export default router;
