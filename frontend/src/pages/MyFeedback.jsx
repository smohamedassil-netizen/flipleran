import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import { MessageCircle, ArrowLeft, BookOpen, Video, ClipboardList, Check } from 'lucide-react';

/* ─── Carte d'un retour ─────────────────────────────────────────────── */
function FeedbackCard({ fb, onMarkRead }) {
  const date = new Date(fb.createdAt).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const profName = fb.profId ? `${fb.profId.prenom ?? ''} ${fb.profId.nom ?? ''}`.trim() : 'Professeur';

  // Contexte (cours / vidéo / QCM)
  const contextItems = [];
  if (fb.courseId?.titre) contextItems.push({ icon: BookOpen,        label: fb.courseId.titre });
  if (fb.videoId?.titre)  contextItems.push({ icon: Video,           label: `Vidéo : ${fb.videoId.titre}` });
  if (fb.qcmId?.titre)    contextItems.push({ icon: ClipboardList,   label: `QCM : ${fb.qcmId.titre}` });

  return (
    <div className="card" style={{
      padding: 18,
      borderLeft: `4px solid ${fb.read ? 'var(--color-border)' : '#D97706'}`,
      background: fb.read ? 'var(--color-surface)' : '#FFFBEB',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MessageCircle size={18} color="#D97706" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>
            Retour de {profName}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--color-text-secondary)' }}>{date}</p>
        </div>
        {!fb.read && (
          <button
            onClick={() => onMarkRead(fb._id)}
            aria-label="Marquer ce retour comme lu"
            style={{
              padding: '5px 10px', borderRadius: 6, border: '1px solid var(--color-success)',
              background: 'white', color: 'var(--color-success)', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
            }}
          >
            <Check size={12} /> Marquer lu
          </button>
        )}
      </div>

      {contextItems.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {contextItems.map(({ icon: Icon, label }, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', background: 'var(--color-primary-light)',
              color: 'var(--color-primary)', borderRadius: 6,
              fontSize: 11, fontWeight: 600,
            }}>
              <Icon size={11} /> {label}
            </span>
          ))}
        </div>
      )}

      <p style={{
        margin: 0, fontSize: 14, color: 'var(--color-text)', lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
      }}>
        {fb.message}
      </p>
    </div>
  );
}

export default function MyFeedback() {
  const navigate = useNavigate();
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.get('/feedback/mine')
      .then(({ data }) => setList(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.response?.data?.message ?? 'Erreur de chargement.'))
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    try {
      await api.put(`/feedback/${id}/read`);
      setList((prev) => prev.map(fb => fb._id === id ? { ...fb, read: true } : fb));
    } catch { /* silencieux */ }
  };

  const unreadCount = list.filter(fb => !fb.read).length;

  return (
    <Layout title="Mes retours">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Retour à la page précédente"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}
        >
          <ArrowLeft size={18} /> Retour
        </button>

        <div style={{ marginBottom: 20 }}>
          <h1 className="page-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <MessageCircle size={22} color="#D97706" />
            Retours de mes professeurs
            {unreadCount > 0 && (
              <span style={{
                padding: '2px 10px', borderRadius: 999, background: '#D97706', color: 'white',
                fontSize: 12, fontWeight: 700,
              }}>
                {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </h1>
          <p className="page-subtitle">
            Commentaires personnalisés que vos professeurs vous ont laissés sur votre travail.
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, width: '100%' }} />)}
          </div>
        ) : list.length === 0 ? (
          <div className="empty-state" style={{ padding: 60 }}>
            <MessageCircle size={36} className="empty-state-icon" />
            <p className="empty-state-title">Aucun retour pour l'instant</p>
            <p className="empty-state-desc">
              Vos professeurs pourront vous laisser des retours pédagogiques personnalisés ici.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {list.map(fb => (
              <FeedbackCard key={fb._id} fb={fb} onMarkRead={markRead} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
