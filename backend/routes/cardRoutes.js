import express from 'express';
import { getCards, createCard, updateCard, deleteCard, gradeCard } from '../controllers/cardController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';

const router = express.Router({ mergeParams: true });

// Cards = contenu des decks de flashcards (outil etudiant)
router.use(authMiddleware);
router.use(requireRole('etudiant'));

router.route('/').get(getCards).post(createCard);
router.route('/:id').put(updateCard).delete(deleteCard);
// SM-2 (Wozniak 1990) — l'étudiant note sa révision sur 0..5 (UI : Encore/Bien/Facile)
router.post('/:id/grade', gradeCard);

export default router;
