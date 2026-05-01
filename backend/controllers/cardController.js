import Card from '../models/Card.js';
import Deck from '../models/Deck.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const getCards = async (req, res) => {
  try {
    const cards = await Card.find({ deck: req.params.deckId });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/decks/:deckId/cards/:id/grade
 * Body : { quality: 0..5 }
 *
 * Implémente l'algorithme SM-2 (Wozniak, 1990) — répétition espacée basée sur
 * la courbe de l'oubli (Ebbinghaus, 1885). À chaque révision l'étudiant note
 * sa réussite sur l'échelle SM-2 :
 *   0..2 → réponse ratée    → reset (repetitions=0, interval=1, retour demain)
 *   3    → réponse correcte mais difficile (intervalle inchangé en pratique)
 *   4    → réponse correcte normale
 *   5    → réponse parfaite, sans hésitation
 *
 * Côté UI on expose 3 boutons mappés ainsi :
 *   "Encore"  → quality = 1
 *   "Bien"    → quality = 4
 *   "Facile"  → quality = 5
 *
 * Le easeFactor (E) évolue à chaque révision selon la formule originale :
 *   E := max(1.3, E + 0.1 − (5−q)·(0.08 + (5−q)·0.02))
 *
 * L'intervalle suit la séquence canonique :
 *   répétition 1 → 1 jour
 *   répétition 2 → 6 jours
 *   répétitions ≥ 3 → round(intervalle_précédent × E)
 */
export const gradeCard = async (req, res) => {
  try {
    const { quality } = req.body;
    if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
      return res.status(400).json({ message: 'quality doit être un entier entre 0 et 5.' });
    }

    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Carte introuvable.' });
    if (card.deck.toString() !== req.params.deckId) {
      return res.status(400).json({ message: 'Cette carte n\'appartient pas à ce deck.' });
    }

    let { interval, easeFactor, repetitions } = card;
    if (typeof easeFactor !== 'number' || easeFactor < 1.3) easeFactor = 2.5;

    if (quality < 3) {
      repetitions = 0;
      interval = 1;
    } else {
      repetitions = (repetitions || 0) + 1;
      if (repetitions === 1) interval = 1;
      else if (repetitions === 2) interval = 6;
      else interval = Math.max(1, Math.round((interval || 1) * easeFactor));
    }

    easeFactor = Math.max(
      1.3,
      easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    );

    const nextReview = new Date(Date.now() + interval * DAY_MS);

    card.repetitions = repetitions;
    card.interval = interval;
    card.easeFactor = easeFactor;
    card.nextReview = nextReview;
    await card.save();

    res.json({
      _id: card._id,
      repetitions,
      interval,
      easeFactor: Number(easeFactor.toFixed(2)),
      nextReview,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCard = async (req, res) => {
  try {
    const { front, back, image, audio, difficulty } = req.body;
    const card = await Card.create({ deck: req.params.deckId, front, back, image, audio, difficulty });
    await Deck.findByIdAndUpdate(req.params.deckId, { $inc: { cardCount: 1 } });
    res.status(201).json(card);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCard = async (req, res) => {
  try {
    const card = await Card.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!card) return res.status(404).json({ message: 'Card not found' });
    res.json(card);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCard = async (req, res) => {
  try {
    const card = await Card.findByIdAndDelete(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card not found' });
    await Deck.findByIdAndUpdate(card.deck, { $inc: { cardCount: -1 } });
    res.json({ message: 'Card deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
