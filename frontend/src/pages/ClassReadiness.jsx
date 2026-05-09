import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import ReadinessRow from '../components/ReadinessRow.jsx';
import { useToast } from '../context/useToast.js';
import { ArrowLeft, BarChart3, Lightbulb, Send, X } from 'lucide-react';

const DEFAULT_REMINDER_TEMPLATE = (courseTitre) =>
  `Bonjour, le prochain cours de "${courseTitre}" approche. Pense à regarder la capsule et faire le QCM avant — ça te permettra de profiter pleinement du présentiel. Bonne préparation !`;

function RemindModal({ resource, courseTitre, onClose, onSend, sending }) {
  const [message, setMessage] = useState(DEFAULT_REMINDER_TEMPLATE(courseTitre));
  const [selected, setSelected] = useState(() => new Set(resource.missingStudents.map((s) => s._id)));

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === resource.missingStudents.length) setSelected(new Set());
    else setSelected(new Set(resource.missingStudents.map((s) => s._id)));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            Envoyer un rappel groupé
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Fermer"><X size={14} /></button>
        </div>

        <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px' }}>
          Concerne la ressource : <strong>{resource.titre}</strong>
        </p>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Destinataires ({selected.size}/{resource.missingStudents.length})
            </label>
            <button type="button" onClick={toggleAll} style={{ background: 'none', border: 'none', color: '#1B4F72', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              {selected.size === resource.missingStudents.length ? 'Tout décocher' : 'Tout cocher'}
            </button>
          </div>
          <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 6, padding: 6, background: '#F8FAFC' }}>
            {resource.missingStudents.map((s) => (
              <label key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={selected.has(s._id)} onChange={() => toggle(s._id)} />
                <span>{s.prenom} {s.nom}</span>
                <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 'auto' }}>{s.email}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4, display: 'block' }}>
            Message
          </label>
          <textarea
            className="input"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 500))}
            style={{ width: '100%', resize: 'vertical' }}
          />
          <p style={{ fontSize: 10, color: '#94A3B8', textAlign: 'right', margin: '2px 0 0' }}>{message.length}/500</p>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={sending}>Annuler</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onSend(Array.from(selected), message)}
            disabled={sending || selected.size === 0 || message.trim().length === 0}
          >
            <Send size={13} /> {sending ? 'Envoi…' : `Envoyer (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Hub : liste des cours du prof avec lien direct vers chaque préparation ─ */
export function ClassReadinessHub() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/professor/courses')
      .then(({ data }) => setCourses(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.response?.data?.message || 'Impossible de charger vos modules.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="Préparation classe">
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--color-text)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={22} color="#1B4F72" />
          Préparation classe
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
          Choisis un module pour voir qui est prêt avant ta prochaine séance.
        </p>
      </div>

      {loading && <p>Chargement…</p>}
      {!loading && error && <div className="alert alert-error">{error}</div>}
      {!loading && !error && courses.length === 0 && (
        <div className="empty-state" style={{ padding: 32 }}>
          <p className="empty-state-title">Aucun module</p>
          <p className="empty-state-desc">Vous n'avez pas encore de cours.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {courses.map((c) => (
          <button
            key={c._id}
            type="button"
            onClick={() => navigate(`/professor/class-readiness/${c._id}`)}
            style={{
              background: 'white',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: 16,
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              transition: 'transform 120ms, box-shadow 120ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1E293B' }}>{c.titre}</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="badge badge-primary" style={{ fontSize: 11 }}>{c.filiere}</span>
              <span style={{ fontSize: 11, color: '#64748B' }}>{c.promotion}</span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#1B4F72', fontWeight: 600 }}>
              Voir la préparation →
            </p>
          </button>
        ))}
      </div>
    </Layout>
  );
}

export default function ClassReadiness() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { success, error: errorToast } = useToast();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [modalResource, setModalResource] = useState(null);
  const [sending, setSending] = useState(false);

  // C4 — Onglets : Préparation (existant) / Top blocages (nouveau)
  const [activeTab, setActiveTab] = useState('preparation');
  const [blocages, setBlocages] = useState(null);
  const [loadingBlocages, setLoadingBlocages] = useState(false);

  useEffect(() => {
    if (activeTab !== 'blocages') return;
    setLoadingBlocages(true);
    api.get(`/class-readiness/${courseId}/top-blocages`)
      .then(({ data }) => setBlocages(data))
      .catch(() => setBlocages({ top: [], totalQuestions: 0 }))
      .finally(() => setLoadingBlocages(false));
  }, [activeTab, courseId]);

  const load = () => {
    setLoading(true);
    setError('');
    api.get(`/class-readiness/${courseId}`)
      .then(({ data }) => setData(data))
      .catch((err) => setError(err.response?.data?.message || 'Impossible de charger la préparation classe.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [courseId]);

  const handleSend = async (studentIds, message) => {
    if (!modalResource) return;
    setSending(true);
    try {
      const { data: result } = await api.post(`/class-readiness/${courseId}/remind`, {
        studentIds,
        message,
        videoId: modalResource._id,
      });
      success(`Rappel envoyé à ${result.sent} étudiant${result.sent > 1 ? 's' : ''}${result.duplicates > 0 ? ` (${result.duplicates} déjà notifié${result.duplicates > 1 ? 's' : ''} récemment)` : ''}.`);
      setModalResource(null);
      load();
    } catch (err) {
      errorToast(err.response?.data?.message || 'Erreur lors de l\'envoi.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout title="Préparation classe">
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 0', fontSize: 14, fontWeight: 500 }}>
        <ArrowLeft size={16} /> Retour
      </button>

      {/* C5 — Bouton "Activer un Prosit" (boucle étape 2 → étape 3 du Cycle CAI) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button
          className="btn btn-accent btn-sm"
          onClick={() => navigate(`/prosits/new?courseId=${courseId}`)}
          title="Créer un nouveau Prosit pour ce module (étape 3 du Cycle CAI)"
        >
          <Lightbulb size={14} style={{ marginRight: 6 }} />
          Activer un Prosit
        </button>
      </div>

      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--color-text)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={22} color="#1B4F72" />
          Préparation classe {data?.course?.titre ? `— ${data.course.titre}` : ''}
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
          {data ? `${data.totalStudents} étudiant${data.totalStudents > 1 ? 's' : ''} inscrit${data.totalStudents > 1 ? 's' : ''} dans ce module.` : 'Chargement…'}
        </p>
      </div>

      {/* C4 — Barre d'onglets */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid #E5E7EB' }}>
        <button
          onClick={() => setActiveTab('preparation')}
          style={{
            background: 'none', border: 'none',
            padding: '8px 16px',
            fontSize: 14, fontWeight: 600,
            color: activeTab === 'preparation' ? '#1B4F72' : '#64748B',
            borderBottom: activeTab === 'preparation' ? '2px solid #1B4F72' : '2px solid transparent',
            cursor: 'pointer',
            marginBottom: -1,
          }}
        >
          Préparation
        </button>
        <button
          onClick={() => setActiveTab('blocages')}
          style={{
            background: 'none', border: 'none',
            padding: '8px 16px',
            fontSize: 14, fontWeight: 600,
            color: activeTab === 'blocages' ? '#1B4F72' : '#64748B',
            borderBottom: activeTab === 'blocages' ? '2px solid #1B4F72' : '2px solid transparent',
            cursor: 'pointer',
            marginBottom: -1,
          }}
        >
          Top blocages
        </button>
      </div>

      {activeTab === 'preparation' && (
        <>
          {loading && (
            <div className="card" style={{ padding: 20 }}>
              <p>Chargement…</p>
            </div>
          )}

          {!loading && error && (
            <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>
          )}

          {!loading && !error && data && data.resources.length === 0 && (
            <div className="empty-state" style={{ padding: 32 }}>
              <p className="empty-state-title">Aucune ressource</p>
              <p className="empty-state-desc">Ce module n'a pas encore de capsules ou de QCM.</p>
            </div>
          )}

          {!loading && !error && data && data.resources.map((r) => (
            <ReadinessRow key={r._id} resource={r} onRemind={(res) => setModalResource(res)} />
          ))}
        </>
      )}

      {activeTab === 'blocages' && (
        <div>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
            Agrégation des 3 questions QCM les plus ratées par tes étudiants
            — utile pour cibler ton cours en présentiel.
          </p>
          {loadingBlocages ? (
            <div className="card" style={{ padding: 20 }}><p>Chargement…</p></div>
          ) : !blocages || blocages.top.length === 0 ? (
            <div className="card" style={{ padding: 14 }}>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                Aucun blocage majeur détecté (≥30% d'échec) sur les questions
                tentées au moins 2 fois. Ta classe maîtrise le module.
              </p>
            </div>
          ) : (
            blocages.top.map((b, i) => (
              <div key={i} className="card" style={{ padding: 14, marginBottom: 10, borderLeft: '4px solid #EF4444' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: 0.5 }}>
                  #{i + 1} — {b.videoTitre}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                  {b.questionLabel}
                </div>
                <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 6 }}>
                  {b.wrong}/{b.attempts} étudiants ont raté ({b.wrongRate}% d'échec)
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {modalResource && (
        <RemindModal
          resource={modalResource}
          courseTitre={data?.course?.titre || ''}
          onClose={() => setModalResource(null)}
          onSend={handleSend}
          sending={sending}
        />
      )}
    </Layout>
  );
}
