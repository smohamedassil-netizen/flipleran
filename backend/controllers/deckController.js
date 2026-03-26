import Deck from '../models/Deck.js';

export const getDecks = async (req, res) => {
  try {
    const decks = await Deck.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json(decks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createDeck = async (req, res) => {
  try {
    const { title, description, category, isPublic, tags } = req.body;
    const deck = await Deck.create({
      title,
      description,
      category,
      isPublic,
      tags,
      owner: req.user.id,
    });
    res.status(201).json(deck);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDeckById = async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id).populate('owner', 'name avatar');
    if (!deck) return res.status(404).json({ message: 'Deck not found' });
    res.json(deck);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateDeck = async (req, res) => {
  try {
    const deck = await Deck.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      req.body,
      { new: true }
    );
    if (!deck) return res.status(404).json({ message: 'Deck not found' });
    res.json(deck);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteDeck = async (req, res) => {
  try {
    const deck = await Deck.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!deck) return res.status(404).json({ message: 'Deck not found' });
    res.json({ message: 'Deck deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
