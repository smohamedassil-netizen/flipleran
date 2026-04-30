import express from 'express';
import {
  getDecks,
  createDeck,
  getDeckById,
  updateDeck,
  deleteDeck,
  generateFlashcardsAI,
} from '../controllers/deckController.js';
import {
  autoGenerate,
  autoStatus,
  dueToday,
} from '../controllers/autoFlashcardsController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { checkAiQuota } from '../middleware/aiQuota.js';

const router = express.Router();

// Decks de flashcards = outil de revision personnel de l'etudiant
router.use(authMiddleware);
router.use(requireRole('etudiant'));

router.route('/').get(getDecks).post(createDeck);
// Génération IA manuelle (1 vidéo, déclenchée explicitement par l'étudiant)
// — soumise au quota mensuel (FREE = 5 / mois).
router.post('/generate-ai', checkAiQuota('deckGeneration'), generateFlashcardsAI);

// F6 — Auto-flashcards depuis vidéos vues. IMPORTANT : ces routes statiques
// DOIVENT être déclarées AVANT la route /:id pour ne pas être interprétées
// comme des deck IDs par Express.
router.post('/auto-generate', checkAiQuota('deckGeneration'), autoGenerate);
router.get('/auto-status', autoStatus);
router.get('/due-today', dueToday);

router.route('/:id').get(getDeckById).put(updateDeck).delete(deleteDeck);

export default router;
