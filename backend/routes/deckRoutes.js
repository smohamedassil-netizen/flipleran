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
import { checkAiQuota } from '../middleware/aiQuota.js';

const router = express.Router();

// Decks de flashcards = outil de revision personnel de l'etudiant
router.use(authMiddleware);
router.use(requireRole('etudiant'));

router.route('/').get(getDecks).post(createDeck);
// Génération IA manuelle (1 vidéo, déclenchée explicitement par l'étudiant)
// — soumise au quota mensuel (FREE = 5 / mois).
router.post('/generate-ai', checkAiQuota('deckGeneration'), generateFlashcardsAI);

/* F6 — Auto-flashcards SM-2 (perspective d'évolution post-PFE)
   Pour réactiver : importer { autoGenerate, autoStatus, dueToday } depuis
   '../controllers/autoFlashcardsController.js' et brancher les 3 routes :
     router.post('/auto-generate', checkAiQuota('deckGeneration'), autoGenerate);
     router.get('/auto-status', autoStatus);
     router.get('/due-today', dueToday);
   Les fichiers backend (autoFlashcardsController, services/autoFlashcards) sont
   préservés tels quels. */

router.route('/:id').get(getDeckById).put(updateDeck).delete(deleteDeck);

export default router;
