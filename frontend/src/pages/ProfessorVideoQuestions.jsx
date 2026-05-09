import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  ArrowLeft, Plus, Edit2, Trash2, Save, X, BarChart2, AlertCircle, CheckCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

/**
 * ProfessorVideoQuestions — éditeur des questions interactives in-video.
 *
 * Modèle EdPuzzle / classe inversée Type 2 (Bergmann & Sams, 2012).
 * Le prof place des points de contrôle pédagogiques sur la timeline ;
 * chaque point devient une question à choix multiple (4 options) qui se
 * déclenche au timestamp ciblé pendant le visionnage de l'étudiant.
 *
 * Layout : 2 colonnes desktop (player + liste). Sur écran < 900px, la
 * liste passe sous le player.
 */

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const fmtTime = (s) => {
  const sec = Math.max(0, Math.floor(s ?? 0));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};

const parseTime = (str) => {
  if (typeof str === 'number') return str;
  const s = String(str ?? '').trim();
  if (!s) return 0;
  if (s.includes(':')) {
    const parts = s.split(':').map(n => Number(n) || 0);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return Number(s) || 0;
};

const emptyForm = (timestamp = 0) => ({
  timestamp,
  texte: '',
  options: { A: '', B: '', C: '', D: '' },
  correctAnswer: 'A',
  explanation: '',
  pauseVideo: true,
});

export default function ProfessorVideoQuestions() {
  const { videoId } = useParams();
  const navigate    = useNavigate();
  const videoRef    = useRef(null);

  const [video,     setVideo]     = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId,  setEditingId]  = useState(null);          // null = create
  const [form,       setForm]       = useState(emptyForm());
  const [saving,     setSaving]     = useState(false);
  const [statsId,    setStatsId]    = useState(null);
  const [statsData,  setStatsData]  = useState(null);

  // Charge la vidéo + ses questions
  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    Promise.all([
      api.get(`/videos/${videoId}`).catch(() => ({ data: null })),
      api.get(`/video-questions/video/${videoId}`).catch(() => ({ data: [] })),
    ]).then(([vRes, qRes]) => {
      if (cancelled) return;
      setVideo(vRes.data);
      setQuestions(Array.isArray(qRes.data) ? qRes.data : []);
    }).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [videoId]);

  // Clic sur la timeline -> ajoute une question au timestamp ciblé
  const handleTimelineClick = (e) => {
    const v = videoRef.current;
    if (!v?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const t = Math.max(0, Math.min(v.duration, ratio * v.duration));
    setEditingId(null);
    setForm(emptyForm(Math.round(t)));
    setEditorOpen(true);
  };

  // Ouvre l'éditeur pour modification
  const startEdit = (q) => {
    setEditingId(q._id);
    setForm({
      timestamp:     q.timestamp,
      texte:         q.texte,
      options:       { ...q.options },
      correctAnswer: q.correctAnswer,
      explanation:   q.explanation ?? '',
      pauseVideo:    q.pauseVideo ?? true,
    });
    setEditorOpen(true);
  };

  // Soumission
  const submit = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (!form.texte.trim()) return setError('Le texte de la question est obligatoire.');
    for (const opt of OPTION_LABELS) {
      if (!form.options[opt]?.trim()) return setError(`L'option ${opt} est vide.`);
    }
    if (!OPTION_LABELS.includes(form.correctAnswer)) return setError('Sélectionnez une bonne réponse.');

    const payload = {
      videoId,
      timestamp:     parseTime(form.timestamp),
      texte:         form.texte.trim(),
      options: {
        A: form.options.A.trim(),
        B: form.options.B.trim(),
        C: form.options.C.trim(),
        D: form.options.D.trim(),
      },
      correctAnswer: form.correctAnswer,
      explanation:   form.explanation.trim(),
      pauseVideo:    form.pauseVideo,
    };

    setSaving(true);
    try {
      if (editingId) {
        const { data } = await api.put(`/video-questions/${editingId}`, payload);
        setQuestions(prev => prev
          .map(q => q._id === editingId ? data : q)
          .sort((a, b) => a.timestamp - b.timestamp)
        );
      } else {
        const { data } = await api.post('/video-questions', payload);
        setQuestions(prev => [...prev, data].sort((a, b) => a.timestamp - b.timestamp));
      }
      setEditorOpen(false);
      setEditingId(null);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  // Suppression
  const remove = async (q) => {
    if (!confirm(`Supprimer la question "${q.texte.slice(0, 40)}…" ?`)) return;
    try {
      await api.delete(`/video-questions/${q._id}`);
      setQuestions(prev => prev.filter(x => x._id !== q._id));
      if (statsId === q._id) { setStatsId(null); setStatsData(null); }
    } catch (err) {
      alert(err.response?.data?.message ?? 'Erreur lors de la suppression.');
    }
  };

  // Statistiques
  const toggleStats = async (q) => {
    if (statsId === q._id) {
      setStatsId(null); setStatsData(null); return;
    }
    setStatsId(q._id); setStatsData(null);
    try {
      const { data } = await api.get(`/video-questions/${q._id}/stats`);
      setStatsData(data);
    } catch {
      setStatsData({ error: true });
    }
  };

  // Saute la lecture du player à un timestamp donné
  const seekTo = (t) => {
    const v = videoRef.current;
    if (v) { v.currentTime = t; v.pause(); }
  };

  if (loading) {
    return <Layout title="Questions in-video"><p style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Chargement…</p></Layout>;
  }

  return (
    <Layout title="Questions interactives">
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 14, fontWeight: 500, padding: '6px 0' }}>
            <ArrowLeft size={16} /> Retour
          </button>
          <span style={{ color: '#CBD5E1' }}>·</span>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1B4F72', margin: 0 }}>
            Questions interactives — {video?.titre ?? 'Capsule'}
          </h1>
        </div>

        {/* Encart pédagogique */}
        <div style={{
          padding: '14px 18px', marginBottom: 18, borderRadius: 10,
          background: '#F8FAFC', borderLeft: '3px solid #1B4F72',
          fontSize: 13, color: '#334155', lineHeight: 1.6,
        }}>
          <p style={{ margin: 0, fontStyle: 'italic' }}>
            « <strong>Don't ask if students understand, make them prove it.</strong> »
            <span style={{ color: '#94A3B8', marginLeft: 6 }}>— Eric Mazur, <em>Peer Instruction: A User's Manual</em> (1997)</span>
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748B' }}>
            Place des points de contrôle pédagogiques sur la timeline. Chaque clic sur la barre
            ouvre l'éditeur d'une nouvelle question au timestamp ciblé. Les étudiants devront
            répondre correctement pour reprendre la lecture (classe inversée Type 2 — Bergmann & Sams, 2012).
          </p>
        </div>

        {/* Layout 2 colonnes */}
        <div className="vq-grid">
          {/* Colonne gauche : player */}
          <div>
            <div style={{
              position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden',
              aspectRatio: '16/9',
            }}>
              <video
                ref={videoRef}
                src={video?.url}
                style={{ width: '100%', height: '100%' }}
                controls
                preload="metadata"
              />
            </div>

            {/* Timeline cliquable */}
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Timeline ({questions.length} question{questions.length > 1 ? 's' : ''}) — clic pour ajouter
              </p>
              <div
                onClick={handleTimelineClick}
                style={{
                  position: 'relative', height: 36,
                  background: '#F1F5F9', borderRadius: 6,
                  cursor: 'crosshair',
                }}
                title="Cliquez sur la timeline pour ajouter une question au timestamp ciblé"
              >
                {video?.duration > 0 && questions.map(q => {
                  const left = Math.min(100, Math.max(0, (q.timestamp / video.duration) * 100));
                  return (
                    <button
                      key={q._id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); seekTo(q.timestamp); startEdit(q); }}
                      title={`${fmtTime(q.timestamp)} — ${q.texte.slice(0, 50)}`}
                      style={{
                        position: 'absolute',
                        top: '50%', left: `${left}%`,
                        width: 14, height: 14, borderRadius: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: '#F59E0B',
                        border: '2px solid #fff',
                        cursor: 'pointer',
                        padding: 0,
                        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                      }}
                    />
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setEditingId(null); setForm(emptyForm(Math.round(videoRef.current?.currentTime ?? 0))); setEditorOpen(true); }}
              style={{
                marginTop: 14,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 14px', borderRadius: 8,
                background: '#1B4F72', color: 'white', border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Plus size={14} /> Ajouter une question au temps actuel
            </button>
          </div>

          {/* Colonne droite : liste */}
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1B4F72', margin: '0 0 12px' }}>
              Questions ({questions.length})
            </h2>

            {questions.length === 0 ? (
              <div style={{
                padding: 24, textAlign: 'center',
                background: 'white', border: '1px dashed #CBD5E1', borderRadius: 10,
                color: '#94A3B8', fontSize: 13,
              }}>
                Aucune question pour cette capsule. Cliquez sur la timeline pour en ajouter une.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {questions.map(q => (
                  <div key={q._id} style={{
                    padding: 12, background: 'white', border: '1px solid #E5E7EB', borderRadius: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => seekTo(q.timestamp)}
                        title="Aller à ce timestamp"
                        style={{
                          padding: '3px 9px', borderRadius: 999,
                          background: '#EBF3FA', color: '#1B4F72',
                          border: '1px solid #BFDBFE',
                          fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        {fmtTime(q.timestamp)}
                      </button>
                      <p style={{ flex: 1, margin: 0, fontSize: 13, color: '#1E293B', lineHeight: 1.5 }}>
                        {q.texte}
                      </p>
                    </div>

                    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button onClick={() => startEdit(q)} className="btn btn-ghost btn-sm">
                        <Edit2 size={12} /> Modifier
                      </button>
                      <button onClick={() => toggleStats(q)} className="btn btn-ghost btn-sm">
                        <BarChart2 size={12} /> {statsId === q._id ? 'Masquer stats' : 'Stats'}
                      </button>
                      <button onClick={() => remove(q)} className="btn btn-ghost btn-sm" style={{ color: '#DC2626' }}>
                        <Trash2 size={12} /> Supprimer
                      </button>
                    </div>

                    {statsId === q._id && (
                      <StatsPanel data={statsData} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal d'édition */}
        {editorOpen && (
          <Editor
            form={form}
            setForm={setForm}
            saving={saving}
            error={error}
            isEdit={!!editingId}
            onClose={() => { setEditorOpen(false); setEditingId(null); setError(''); }}
            onSubmit={submit}
          />
        )}
      </div>

      {/* Style minimal pour le grid responsive */}
      <style>{`
        .vq-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .vq-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </Layout>
  );
}

/* ─── Panneau de statistiques (recharts) ───────────────────────────────── */
function StatsPanel({ data }) {
  if (!data) return <p style={{ marginTop: 10, fontSize: 12, color: '#94A3B8' }}>Chargement…</p>;
  if (data.error) return <p style={{ marginTop: 10, fontSize: 12, color: '#DC2626' }}>Erreur lors du chargement des stats.</p>;
  if (data.total === 0) return <p style={{ marginTop: 10, fontSize: 12, color: '#94A3B8' }}>Aucune réponse pour le moment.</p>;

  const chartData = OPTION_LABELS.map(opt => ({
    name: opt,
    count: data.distribution[opt] ?? 0,
    isCorrect: opt === data.correctAnswer,
  }));

  return (
    <div style={{
      marginTop: 10, padding: 10,
      background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: '#475569' }}>
        <span>{data.total} réponse{data.total > 1 ? 's' : ''}</span>
        <span style={{ fontWeight: 700, color: data.successRate >= 70 ? '#16A34A' : data.successRate >= 40 ? '#D97706' : '#DC2626' }}>
          {data.successRate}% de réussite
        </span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'rgba(27,79,114,0.05)' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.isCorrect ? '#16A34A' : '#94A3B8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p style={{ margin: '4px 0 0', fontSize: 10, color: '#94A3B8' }}>
        Bonne réponse en vert · {data.avgTimeMs > 0 ? `temps moyen : ${(data.avgTimeMs / 1000).toFixed(1)}s` : ''}
      </p>
    </div>
  );
}

/* ─── Modal d'édition ──────────────────────────────────────────────────── */
function Editor({ form, setForm, saving, error, isEdit, onClose, onSubmit }) {
  const inputStyle = {
    width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8,
    fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
  };
  const labelStyle = { display: 'block', fontSize: 11, color: '#475569', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 };

  return (
    <div role="dialog" aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: 16,
      }}
    >
      <form onSubmit={onSubmit}
        className="card"
        style={{
          width: '100%', maxWidth: 600, padding: 24,
          maxHeight: '88vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1B4F72', margin: 0 }}>
            {isEdit ? 'Modifier la question' : 'Nouvelle question interactive'}
          </h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <label style={labelStyle}>Timestamp (secondes ou mm:ss)</label>
        <input
          value={form.timestamp}
          onChange={(e) => setForm(f => ({ ...f, timestamp: e.target.value }))}
          style={{ ...inputStyle, marginBottom: 12 }}
          placeholder="Ex: 45 ou 1:30"
        />

        <label style={labelStyle}>Texte de la question *</label>
        <textarea
          value={form.texte}
          onChange={(e) => setForm(f => ({ ...f, texte: e.target.value }))}
          rows={2}
          style={{ ...inputStyle, marginBottom: 12, resize: 'vertical' }}
          placeholder="Énoncé de la question…"
        />

        <label style={labelStyle}>Options *</label>
        {OPTION_LABELS.map(opt => (
          <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, correctAnswer: opt }))}
              title="Marquer comme bonne réponse"
              style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: form.correctAnswer === opt ? '#16A34A' : '#F1F5F9',
                color: form.correctAnswer === opt ? '#fff' : '#475569',
                border: form.correctAnswer === opt ? '2px solid #16A34A' : '1px solid #E5E7EB',
                fontWeight: 700, fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {form.correctAnswer === opt ? <CheckCircle size={14} /> : opt}
            </button>
            <input
              value={form.options[opt]}
              onChange={(e) => setForm(f => ({ ...f, options: { ...f.options, [opt]: e.target.value } }))}
              style={{ ...inputStyle }}
              placeholder={`Option ${opt}`}
            />
          </div>
        ))}
        <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 12px' }}>
          Cliquez sur la lettre pour désigner la bonne réponse.
        </p>

        <label style={labelStyle}>Explication (affichée après la réponse)</label>
        <textarea
          value={form.explanation}
          onChange={(e) => setForm(f => ({ ...f, explanation: e.target.value }))}
          rows={2}
          style={{ ...inputStyle, marginBottom: 12, resize: 'vertical' }}
          placeholder="Pourquoi cette réponse est-elle correcte ?"
        />

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', cursor: 'pointer', marginBottom: 16 }}>
          <input
            type="checkbox"
            checked={form.pauseVideo}
            onChange={(e) => setForm(f => ({ ...f, pauseVideo: e.target.checked }))}
          />
          Mettre la vidéo en pause à ce timestamp (recommandé)
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={onClose} className="btn btn-ghost">Annuler</button>
          <button type="submit" disabled={saving} className="btn btn-primary">
            <Save size={14} /> {saving ? 'Sauvegarde…' : isEdit ? 'Mettre à jour' : 'Créer la question'}
          </button>
        </div>
      </form>
    </div>
  );
}
