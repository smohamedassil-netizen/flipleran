import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { useDecks } from '../hooks/useDecks.js';
import { Plus, Trash2, Play, BookOpen, ArrowLeft } from 'lucide-react';

export default function Decks() {
  const { decks, loading, createDeck, deleteDeck } = useDecks();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'General' });
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    await createDeck(form);
    setForm({ title: '', description: '', category: 'General' });
    setShowForm(false);
  };

  return (
    <Layout title="Mes decks">
      <button onClick={() => navigate('/')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
        <ArrowLeft size={18} /> Retour
      </button>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Mes decks</h1>
          <p className="page-subtitle">{decks.length} deck{decks.length !== 1 ? 's' : ''} au total</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          <Plus size={15} /> Nouveau deck
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <span className="card-title">Créer un deck</span>
          </div>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label className="form-label">Titre</label>
              <input
                type="text"
                className="form-input"
                placeholder="Nom du deck"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">Description</label>
              <input
                type="text"
                className="form-input"
                placeholder="Description optionnelle"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Catégorie</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Mathématiques"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary btn-sm">Créer</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Deck grid */}
      {loading ? (
        <p className="text-small">Chargement...</p>
      ) : decks.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={32} className="empty-state-icon" />
          <p className="empty-state-title">Aucun deck</p>
          <p className="empty-state-desc">Créez votre premier deck pour commencer.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {decks.map((deck) => (
            <div key={deck._id} className="card">
              <p style={{ fontWeight: 600, fontSize: 'var(--font-size-md)', marginBottom: '4px' }}>{deck.title}</p>
              <p className="text-small" style={{ marginBottom: '16px' }}>{deck.cardCount} cartes · {deck.category}</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => navigate(`/study/${deck._id}`)} className="btn btn-primary btn-sm">
                  <Play size={13} /> Étudier
                </button>
                <button onClick={() => deleteDeck(deck._id)} className="btn btn-danger btn-sm">
                  <Trash2 size={13} /> Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
