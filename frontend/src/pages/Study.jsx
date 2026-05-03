import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import api from '../utils/api.js';
import { ChevronLeft, ChevronRight, RotateCcw, Award, Shuffle, ArrowLeft, Plus, X } from 'lucide-react';

export default function Study() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({ front: '', back: '' });
  const [addingCard, setAddingCard] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/decks/${deckId}`),
      api.get(`/decks/${deckId}/cards`),
    ]).then(([deckRes, cardsRes]) => {
      setDeck(deckRes.data);
      setCards(cardsRes.data);
      setLoading(false);
    });
  }, [deckId]);

  const goTo = useCallback((newIndex) => {
    if (newIndex >= cards.length) {
      setCompleted(true);
    } else if (newIndex >= 0) {
      setIndex(newIndex);
      setFlipped(false);
      setCompleted(false);
    }
  }, [cards.length]);

  const restart = useCallback(() => {
    setIndex(0);
    setFlipped(false);
    setCompleted(false);
  }, []);

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!newCard.front.trim() || !newCard.back.trim()) return;
    setAddingCard(true);
    try {
      const { data } = await api.post(`/decks/${deckId}/cards`, newCard);
      setCards((prev) => [...prev, data]);
      setNewCard({ front: '', back: '' });
      setShowAddCard(false);
      setCompleted(false);
    } catch (err) {
      logError(err);
    } finally {
      setAddingCard(false);
    }
  };

  const shuffleCards = useCallback(() => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setIndex(0);
    setFlipped(false);
    setCompleted(false);
  }, [cards]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        goTo(index - 1);
      } else if (e.key === 'ArrowRight') {
        goTo(index + 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [index, goTo]);

  if (loading) {
    return (
      <Layout title="Étudier">
        <p className="text-small">Chargement...</p>
      </Layout>
    );
  }

  if (cards.length === 0) {
    return (
      <Layout title="Étudier">
        <Breadcrumb items={[
          { label: 'Accueil', to: '/' },
          { label: 'Mes decks', to: '/decks' },
          { label: deck?.title || 'Deck' },
        ]} />
        <div className="empty-state">
          <RotateCcw size={32} className="empty-state-icon" />
          <p className="empty-state-title">Deck vide</p>
          <p className="empty-state-desc">Ce deck ne contient aucune carte pour l'instant.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => setShowAddCard(true)} className="btn btn-primary btn-sm">
              <Plus size={15} /> Ajouter une carte
            </button>
            <button onClick={() => navigate('/decks')} className="btn btn-secondary btn-sm">
              <ArrowLeft size={15} /> Retour aux decks
            </button>
          </div>
        </div>
        {showAddCard && (
          <div style={{ maxWidth: 480, margin: '24px auto 0', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Nouvelle carte</span>
              <button onClick={() => setShowAddCard(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddCard} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="form-label">Recto (question)</label>
                <textarea className="form-input" rows={2} value={newCard.front} onChange={(e) => setNewCard((p) => ({ ...p, front: e.target.value }))} required placeholder="Question ou terme..." style={{ resize: 'vertical' }} />
              </div>
              <div>
                <label className="form-label">Verso (réponse)</label>
                <textarea className="form-input" rows={2} value={newCard.back} onChange={(e) => setNewCard((p) => ({ ...p, back: e.target.value }))} required placeholder="Réponse ou définition..." style={{ resize: 'vertical' }} />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={addingCard} style={{ alignSelf: 'flex-start' }}>
                {addingCard ? 'Ajout...' : 'Ajouter'}
              </button>
            </form>
          </div>
        )}
      </Layout>
    );
  }

  const card = cards[index];
  const progress = ((index + 1) / cards.length) * 100;

  return (
    <Layout title="Étudier">
      <Breadcrumb items={[
        { label: 'Accueil', to: '/' },
        { label: 'Mes decks', to: '/decks' },
        { label: deck?.title || 'Deck' },
      ]} />

      {completed ? (
        <div className="celebrate" style={{ textAlign: 'center', padding: 60 }}>
          <Award size={48} color="var(--color-primary)" />
          <h2 style={{ marginTop: 16, marginBottom: 8 }}>Félicitations !</h2>
          <p className="text-small" style={{ marginBottom: 24 }}>
            Vous avez terminé toutes les {cards.length} cartes du deck.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button onClick={restart} className="btn btn-primary btn-sm">
              <RotateCcw size={15} /> Recommencer
            </button>
            <button onClick={() => navigate('/decks')} className="btn btn-secondary btn-sm">
              <ArrowLeft size={15} /> Retour aux decks
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Progress bar and counter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <span className="text-small" style={{ whiteSpace: 'nowrap' }}>
              Carte {index + 1} / {cards.length}
            </span>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-small">{Math.round(progress)}%</span>
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <button onClick={() => setShowAddCard((v) => !v)} className="btn btn-primary btn-sm">
              <Plus size={15} /> Ajouter une carte
            </button>
            <button onClick={shuffleCards} className="btn btn-ghost btn-sm" title="Mélanger les cartes">
              <Shuffle size={15} /> Mélanger
            </button>
          </div>
          {showAddCard && (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Nouvelle carte</span>
                <button onClick={() => setShowAddCard(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16} /></button>
              </div>
              <form onSubmit={handleAddCard} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="form-label">Recto (question)</label>
                    <textarea className="form-input" rows={2} value={newCard.front} onChange={(e) => setNewCard((p) => ({ ...p, front: e.target.value }))} required placeholder="Question..." style={{ resize: 'vertical' }} />
                  </div>
                  <div>
                    <label className="form-label">Verso (réponse)</label>
                    <textarea className="form-input" rows={2} value={newCard.back} onChange={(e) => setNewCard((p) => ({ ...p, back: e.target.value }))} required placeholder="Réponse..." style={{ resize: 'vertical' }} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={addingCard} style={{ alignSelf: 'flex-start' }}>
                  {addingCard ? 'Ajout...' : 'Ajouter la carte'}
                </button>
              </form>
            </div>
          )}

          {/* Flashcard with 3D flip */}
          <div className="flashcard-container">
            <div
              className={`flashcard ${flipped ? 'flipped' : ''}`}
              onClick={() => setFlipped((f) => !f)}
            >
              <div className="flashcard-face flashcard-front">
                <p style={{ fontSize: 18, fontWeight: 600 }}>{card.front}</p>
                <p style={{ fontSize: 12, opacity: 0.7, marginTop: 12 }}>Cliquez pour retourner</p>
              </div>
              <div className="flashcard-face flashcard-back">
                <p style={{ fontSize: 16 }}>{card.back}</p>
              </div>
            </div>
          </div>

          {/* Navigation controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 }}>
            <button
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              className="btn btn-secondary btn-sm"
            >
              <ChevronLeft size={15} /> Précédent
            </button>
            <button
              onClick={() => setFlipped((f) => !f)}
              className="btn btn-ghost btn-sm"
              title="Retourner la carte"
            >
              <RotateCcw size={15} /> Retourner
            </button>
            <button
              onClick={() => goTo(index + 1)}
              className="btn btn-primary btn-sm"
            >
              Suivant <ChevronRight size={15} />
            </button>
          </div>

          {/* Keyboard hint */}
          <p className="text-small" style={{ textAlign: 'center', marginTop: 16, opacity: 0.5 }}>
            ← → pour naviguer &middot; Espace pour retourner
          </p>
        </>
      )}
    </Layout>
  );
}
