import Card from '../models/Card.js';
import Deck from '../models/Deck.js';

export const getCards = async (req, res) => {
  try {
    const cards = await Card.find({ deck: req.params.deckId });
    res.json(cards);
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
