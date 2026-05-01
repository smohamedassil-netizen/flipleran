import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import api from '../utils/api.js';
import { ChevronLeft, RotateCcw, Award, Shuffle, ArrowLeft, Plus, X, Repeat, ThumbsUp, Zap } from 'lucide-react';

/* SM-2 (Wozniak 1990) — mapping UI → quality
   "Encore" = j'ai raté ou hésité longtemps    → quality 1 (reset, retour demain)
   "Bien"   = j'ai répondu correctement        → quality 4 (intervalle ×easeFactor)
   "Facile" = j'ai répondu sans hésiter        → quality 5 (intervalle ×easeFactor + bonus E) */
const SM2_QUALITY = { again: 1, good: 4, easy: 5 };

const fmtNextReview = (date) => {
  if (!date) return '';
  const ms = new Date(date).getTime() - Date.now();
  const days = Math.round(ms / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'demain';
  if (days < 30) return `dans ${days} j`;
  if (days < 365) return `dans ${Math.round(days / 30)} mois`;
  return `dans ${Math.round(days / 365)} an${days >= 730 ? 's' : ''}`;
};

export default function Study() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({ front: '', back: '' });
  const [addingCard, setAddingCard] = useState(false);
  // SM-2 — feedback temporaire après le grade (next review date) + verrou pendant l'API
  const [grading, setGrading] = useState(false);
  const [lastGrade, setLastGrade] = useState(null); // { label, nextReview }
  // Stats de la session courante (utile dans l'écran "terminé")
  const [sessionStats, setSessionStats] = useState({ again: 0, good: 0, easy: 0 });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const [deckRes, cardsRes] = await Promise.all([
          api.get(`/decks/${deckId}`),
          api.get(`/decks/${deckId}/cards`),
        ]);
        if (cancelled) return;
        setDeck(deckRes.data);
        setCards(cardsRes.data);
      } catch (err) {
        if (cancelled) return;
        const status = err.response?.status;
        if (status === 404) {
          setError("Ce deck n'existe pas (ou plus). Il a peut-être été supprimé.");
        } else if (status === 403) {
          setError("Tu n'as pas accès à ce deck.");
        } else {
          setError(err.response?.data?.message || 'Impossible de charger ce deck. Réessaie dans un instant.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [deckId]);

  const goTo = useCallback((newIndex) => {
    if (newIndex >= cards.length) {
      setCompleted(true);
    } else if (newIndex >= 0) {
      setIndex(newIndex);
      setFlipped(false);
      setCompleted(false);
      setLastGrade(null);
    }
  }, [cards.length]);

  const restart = useCallback(() => {
    setIndex(0);
    setFlipped(false);
    setCompleted(false);
    setLastGrade(null);
    setSessionStats({ again: 0, good: 0, easy: 0 });
  }, []);

  // SM-2 — grader la carte courante puis avancer
  const gradeAndNext = useCallback(async (label) => {
    if (grading || !cards[index]) return;
    const quality = SM2_QUALITY[label];
    setGrading(true);
    try {
      const { data } = await api.post(`/decks/${deckId}/cards/${cards[index]._id}/grade`, { quality });
      setLastGrade({ label, nextReview: data.nextReview });
      setSessionStats((s) => ({ ...s, [label]: (s[label] || 0) + 1 }));
      // Mettre à jour la carte localement (on la garde dans l'array, mais avec ses nouvelles dates)
      setCards((prev) => prev.map((c, i) => i === index
        ? { ...c, ...data }
        : c));
      // Avancer après un court délai pour laisser voir le feedback
      setTimeout(() => {
        if (index + 1 >= cards.length) setCompleted(true);
        else {
          setIndex((i) => i + 1);
          setFlipped(false);
          setLastGrade(null);
        }
      }, 600);
    } catch (err) {
      console.error('[grade]', err.response?.data?.message || err.message);
      setLastGrade({ label, error: true });
    } finally {
      setGrading(false);
    }
  }, [grading, cards, index, deckId]);

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
      console.error(err);
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

  // Keyboard support — flèches pour naviguer, espace pour retourner.
  // Une fois la carte retournée, raccourcis SM-2 : 1=Encore, 2=Bien, 3=Facile (style Anki)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignorer si l'utilisateur tape dans un input/textarea (formulaire ajout carte)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft') {
        goTo(index - 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && !grading) {
        if (e.key === '1') gradeAndNext('again');
        else if (e.key === '2') gradeAndNext('good');
        else if (e.key === '3') gradeAndNext('easy');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [index, goTo, flipped, grading, gradeAndNext]);

  if (loading) {
    return (
      <Layout title="Étudier">
        <p className="text-small">Chargement...</p>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Étudier">
        <Breadcrumb items={[
          { label: 'Accueil', to: '/' },
          { label: 'Mes decks', to: '/decks' },
          { label: 'Erreur' },
        ]} />
        <div className="empty-state">
          <X size={32} className="empty-state-icon" />
          <p className="empty-state-title">Impossible de charger ce deck</p>
          <p className="empty-state-desc">{error}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => navigate('/decks')} className="btn btn-primary btn-sm">
              <ArrowLeft size={15} /> Retour aux decks
            </button>
          </div>
        </div>
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
          <h2 style={{ marginTop: 16, marginBottom: 8 }}>Session terminée !</h2>
          <p className="text-small" style={{ marginBottom: 16 }}>
            Tu as révisé {cards.length} carte{cards.length > 1 ? 's' : ''} de ce deck.
          </p>
          {(sessionStats.again + sessionStats.good + sessionStats.easy) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
              <span style={{ background: '#FEE2E2', color: '#B91C1C', padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
                <Repeat size={13} style={{ verticalAlign: -2, marginRight: 4 }} /> {sessionStats.again} encore
              </span>
              <span style={{ background: '#DBEAFE', color: '#1B4F72', padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
                <ThumbsUp size={13} style={{ verticalAlign: -2, marginRight: 4 }} /> {sessionStats.good} bien
              </span>
              <span style={{ background: '#DCFCE7', color: '#166534', padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
                <Zap size={13} style={{ verticalAlign: -2, marginRight: 4 }} /> {sessionStats.easy} facile
              </span>
            </div>
          )}
          <p className="text-small" style={{ marginBottom: 24, fontStyle: 'italic', opacity: 0.7 }}>
            La prochaine revue de chaque carte est calculée automatiquement (algorithme SM-2, Wozniak 1990).
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

          {/* SM-2 grading controls (visibles uniquement quand la carte est retournée) */}
          {flipped ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
                <button
                  onClick={() => goTo(index - 1)}
                  disabled={index === 0 || grading}
                  className="btn btn-ghost btn-sm"
                  title="Carte précédente (sans noter)"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={() => gradeAndNext('again')}
                  disabled={grading}
                  className="btn btn-sm"
                  style={{ background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5', display: 'flex', alignItems: 'center', gap: 6, minWidth: 110, justifyContent: 'center' }}
                  title="Quality 1 — Reset, retour demain (raccourci : 1)"
                >
                  <Repeat size={15} /> Encore
                </button>
                <button
                  onClick={() => gradeAndNext('good')}
                  disabled={grading}
                  className="btn btn-sm"
                  style={{ background: '#1B4F72', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 6, minWidth: 110, justifyContent: 'center' }}
                  title="Quality 4 — Intervalle ×easeFactor (raccourci : 2)"
                >
                  <ThumbsUp size={15} /> Bien
                </button>
                <button
                  onClick={() => gradeAndNext('easy')}
                  disabled={grading}
                  className="btn btn-sm"
                  style={{ background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC', display: 'flex', alignItems: 'center', gap: 6, minWidth: 110, justifyContent: 'center' }}
                  title="Quality 5 — Bonus easeFactor (raccourci : 3)"
                >
                  <Zap size={15} /> Facile
                </button>
              </div>
              {lastGrade?.nextReview && (
                <p className="text-small" style={{ textAlign: 'center', marginTop: 12, color: '#10B981' }}>
                  ✓ Noté · prochaine revue {fmtNextReview(lastGrade.nextReview)}
                </p>
              )}
              {lastGrade?.error && (
                <p className="text-small" style={{ textAlign: 'center', marginTop: 12, color: '#DC2626' }}>
                  Erreur d'enregistrement — passe à la suivante manuellement.
                </p>
              )}
              <p className="text-small" style={{ textAlign: 'center', marginTop: 8, opacity: 0.5 }}>
                Raccourcis : 1 = Encore · 2 = Bien · 3 = Facile · ← retour
              </p>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 }}>
                <button
                  onClick={() => goTo(index - 1)}
                  disabled={index === 0}
                  className="btn btn-secondary btn-sm"
                >
                  <ChevronLeft size={15} /> Précédent
                </button>
                <button
                  onClick={() => setFlipped(true)}
                  className="btn btn-primary btn-sm"
                  title="Voir la réponse pour t'auto-évaluer (raccourci : Espace)"
                >
                  <RotateCcw size={15} /> Voir la réponse
                </button>
              </div>
              <p className="text-small" style={{ textAlign: 'center', marginTop: 16, opacity: 0.5 }}>
                Espace pour retourner · ← carte précédente
              </p>
            </>
          )}
        </>
      )}
    </Layout>
  );
}
