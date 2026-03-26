import { useState, useEffect } from 'react';
import api from '../utils/api.js';

export const useDecks = () => {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDecks = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/decks');
      setDecks(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch decks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDecks(); }, []);

  const createDeck = async (deckData) => {
    const { data } = await api.post('/decks', deckData);
    setDecks((prev) => [data, ...prev]);
    return data;
  };

  const deleteDeck = async (id) => {
    await api.delete(`/decks/${id}`);
    setDecks((prev) => prev.filter((d) => d._id !== id));
  };

  return { decks, loading, error, fetchDecks, createDeck, deleteDeck };
};
