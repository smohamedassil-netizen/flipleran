import express from 'express';
import { getCards, createCard, updateCard, deleteCard } from '../controllers/cardController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);

router.route('/').get(getCards).post(createCard);
router.route('/:id').put(updateCard).delete(deleteCard);

export default router;
