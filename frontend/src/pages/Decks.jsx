import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import { useDecks } from '../hooks/useDecks.js';
import api from '../utils/api.js';
import { Plus, Trash2, Play, BookOpen, ArrowLeft, Sparkles, X, Loader } from 'lucide-react';

/* ─── AI Generate Modal ─────────────────────────────────────────────────── */
function AIGenerateModal({ onSuccess, onClose }) {
  const [courses, setCourses] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedVideo, setSelectedVideo] = useState('');
  const [deckTitle, setDeckTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/courses').then(({ data }) => setCourses(data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedCourse) { setVideos([]); setSelectedVideo(''); return; }
    setLoadingVideos(true);
    api.get(`/videos/course/${selectedCourse}`)
      .then(({ data }) => { setVideos(data); setSelectedVideo(''); })
      .catch(console.error)
      .finally(() => setLoadingVideos(false));
  }, [selectedCourse]);

  const handleGenerate = async () => {
    if (!selectedVideo) { setError('Sélectionnez une vidéo'); return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/decks/generate-ai', {
        videoId: selectedVideo,
        deckTitle: deckTitle.trim() || undefined,
      });
      onSuccess(data.deck, data.count);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la génération');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>Générer avec l'IA</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Flashcards automatiques depuis une vidéo</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Cours *</label>
            <select className="form-input" value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
              <option value="">-- Sélectionner un cours --</option>
              {courses.map(c => <option key={c._id} value={c._id}>{c.titre}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label">Vidéo *</label>
            <select className="form-input" value={selectedVideo} onChange={e => setSelectedVideo(e.target.value)} disabled={!selectedCourse || loadingVideos}>
              <option value="">{loadingVideos ? 'Chargement...' : '-- Sélectionner une vidéo --'}</option>
              {videos.map(v => <option key={v._id} value={v._id}>{v.titre}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label">Titre du deck (optionnel)</label>
            <input className="form-input" value={deckTitle} onChange={e => setDeckTitle(e.target.value)} placeholder="Ex: Révision Chapitre 1" />
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: 13, padding: '8px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>{error}</div>}

          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#64748b', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Sparkles size={14} style={{ marginTop: 1, flexShrink: 0, color: '#7c3aed' }} />
            <span>L'IA va analyser le titre et le contenu de la vidéo pour générer automatiquement 10 flashcards de révision.</span>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={onClose} className="btn btn-ghost btn-sm">Annuler</button>
            <button
              onClick={handleGenerate}
              disabled={!selectedVideo || loading}
              className="btn btn-sm"
              style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {loading ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Génération...</> : <><Sparkles size={13} /> Générer</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */
export default function Decks() {
  const { decks, loading, createDeck, deleteDeck } = useDecks();
  const [showForm, setShowForm] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'General' });
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    await createDeck(form);
    setForm({ title: '', description: '', category: 'General' });
    setShowForm(false);
  };

  const handleAISuccess = (deck, count) => {
    setShowAI(false);
    navigate(`/study/${deck._id}`);
  };

  return (
    <Layout title="Mes decks">
      <Breadcrumb items={[{ label: 'Accueil', to: '/' }, { label: 'Mes decks' }]} />

      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="page-title">Mes decks</h1>
          <p className="page-subtitle">{decks.length} deck{decks.length !== 1 ? 's' : ''} — cartes mémoire recto/verso pour réviser</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowAI(true)}
            className="btn btn-sm"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Sparkles size={14} /> Générer avec l'IA
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm">
            <Plus size={14} /> Nouveau deck
          </button>
        </div>
      </div>

      {/* Info box explaining decks */}
      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#0369a1' }}>
        <BookOpen size={16} style={{ marginTop: 1, flexShrink: 0 }} />
        <span><strong>Les decks</strong> sont des jeux de cartes mémoire (flashcards) : face avant = question, face arrière = réponse. Idéal pour réviser du vocabulaire, des définitions, des formules. Utilisez l'IA pour en générer automatiquement depuis vos vidéos de cours.</span>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header"><span className="card-title">Créer un deck manuellement</span></div>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label className="form-label">Titre *</label>
              <input type="text" className="form-input" placeholder="Ex: Algorithmique L3" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <label className="form-label">Description</label>
              <input type="text" className="form-input" placeholder="Description optionnelle" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Catégorie</label>
              <input type="text" className="form-input" placeholder="Ex: Mathématiques" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
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
          <p className="empty-state-desc">Créez votre premier deck ou générez-en un automatiquement avec l'IA depuis une vidéo de cours.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => setShowAI(true)} className="btn btn-sm" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none' }}>
              <Sparkles size={14} /> Générer avec l'IA
            </button>
            <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm"><Plus size={14} /> Créer manuellement</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {decks.map((deck) => (
            <div key={deck._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0f9ff', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BookOpen size={18} color="#0369a1" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deck.title}</p>
                  <p className="text-small" style={{ marginBottom: 0 }}>{deck.cardCount ?? 0} carte{deck.cardCount !== 1 ? 's' : ''} · {deck.category}</p>
                </div>
              </div>
              {deck.description && <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{deck.description}</p>}
              <div style={{ display: 'flex', gap: '8px', marginTop: 4 }}>
                <button onClick={() => navigate(`/study/${deck._id}`)} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                  <Play size={13} /> Etudier
                </button>
                <button onClick={() => deleteDeck(deck._id)} className="btn btn-danger btn-sm">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAI && <AIGenerateModal onSuccess={handleAISuccess} onClose={() => setShowAI(false)} />}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}
