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

const router = express.Router();

router.use(authMiddleware);

router.route('/').get(getDecks).post(createDeck);
router.post('/generate-ai', generateFlashcardsAI);
router.route('/:id').get(getDeckById).put(updateDeck).delete(deleteDeck);

export default router;
