import express from 'express';
import {
  getDecks,
  createDeck,
  getDeckById,
  updateDeck,
  deleteDeck,
  generateFlashcardsAI,
} from '../controllers/deckController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';

const router = express.Router();

// Decks de flashcards = outil de revision personnel de l'etudiant
router.use(authMiddleware);
router.use(requireRole('etudiant'));

router.route('/').get(getDecks).post(createDeck);
router.post('/generate-ai', generateFlashcardsAI);
router.route('/:id').get(getDeckById).put(updateDeck).delete(deleteDeck);

export default router;
