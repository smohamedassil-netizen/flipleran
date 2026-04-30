import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import Markdown from '../components/Markdown.jsx';
import api from '../utils/api.js';
import { BLOOM_LEVELS, BLOOM_META } from '../utils/bloom.js';
import {
  Home, Target, Plus, Trash2, GripVertical, Save, ArrowLeft,
  AlertCircle, CheckCircle, Info, ChevronDown, ChevronUp, X, BookOpen,
} from 'lucide-react';

/**
 * CourseLearningOutcomes — Éditeur des objectifs d'apprentissage et du contrat
 * pédagogique d'un cours, formulés selon la taxonomie de Bloom révisée.
 *
 * @description Implémente l'**alignement constructif** (Biggs, 1996) : le prof
 * rend explicite ce que l'étudiant saura faire, les niveaux cognitifs visés
 * (Anderson & Krathwohl, 2001) et les engagements réciproques du dispositif.
 * C'est le socle déclaratif du module, ancre des vidéos et des QCM.
 *
 * @see Bloom (1956). *Taxonomy of Educational Objectives*. David McKay.
 * @see Anderson & Krathwohl (2001). *A Taxonomy for Learning, Teaching, and
 *      Assessing*. Longman.
 * @see Biggs, J. (1996). Enhancing teaching through constructive alignment.
 *      *Higher Education*, 32(3), 347–364.
 */

/* ─── Modal d'ajout/édition d'un outcome ──────────────────────────────────── */
function OutcomeModal({ initial, onClose, onSave }) {
  const [statement, setStatement] = useState(initial?.statement || '');
  const [bloomLevel, setBloomLevel] = useState(initial?.bloomLevel || 'understand');
  const [estimatedMinutes, setEstimatedMinutes] = useState(initial?.estimatedMinutes ?? 30);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!statement.trim()) { setError('Énoncé requis.'); return; }
    if (!BLOOM_LEVELS.includes(bloomLevel)) { setError('Niveau Bloom invalide.'); return; }
    onSave({
      ...(initial?._id ? { _id: initial._id } : {}),
      statement: statement.trim(),
      bloomLevel,
      estimatedMinutes: Math.max(0, Number(estimatedMinutes) || 30),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0 }}>
            <Target size={18} style={{ marginRight: 6 }} />
            {initial ? 'Modifier l\'objectif' : 'Nouvel objectif d\'apprentissage'}
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 4, display: 'block' }}>
              Énoncé de l'objectif
            </label>
            <textarea
              className="input"
              rows={2}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Ex: Identifier les vulnérabilités OWASP Top 10"
              style={{ width: '100%', resize: 'vertical' }}
            />
            <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0', fontStyle: 'italic' }}>
              Commence par un verbe d'action observable.
            </p>
          </div>

          <div>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 6, display: 'block' }}>
              Niveau Bloom (Anderson & Krathwohl, 2001)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {BLOOM_LEVELS.map((lvl) => {
                const meta = BLOOM_META[lvl];
                const active = bloomLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setBloomLevel(lvl)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      border: `2px solid ${active ? meta.color : '#E5E7EB'}`,
                      background: active ? meta.bg : 'white',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: meta.color }}>
                      {meta.label} <span style={{ color: '#94A3B8', fontWeight: 500, fontSize: 11 }}>({meta.shortLabel})</span>
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#475569', lineHeight: 1.4 }}>
                      {meta.verbs.slice(0, 4).join(', ')}…
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 4, display: 'block' }}>
              Durée estimée (minutes)
            </label>
            <input
              type="number" min={0}
              className="input"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              style={{ width: 120 }}
            />
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={14} /> <span>{error}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <CheckCircle size={14} /> {initial ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Carte d'un outcome (drag & drop) ────────────────────────────────────── */
function OutcomeCard({ outcome, index, total, onEdit, onRemove, onMove, onDragStart, onDragOver, onDrop, isDragging }) {
  const meta = BLOOM_META[outcome.bloomLevel] || BLOOM_META.understand;
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      style={{
        background: 'white', borderRadius: 10,
        border: `1px solid ${isDragging ? '#1B4F72' : '#E5E7EB'}`,
        padding: '12px 14px', marginBottom: 8,
        opacity: isDragging ? 0.5 : 1,
        display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      <span style={{ cursor: 'grab', color: '#94A3B8', flexShrink: 0 }} title="Glisser pour réordonner">
        <GripVertical size={16} />
      </span>
      <span style={{
        padding: '3px 10px', borderRadius: 999,
        background: meta.bg, color: meta.color,
        fontSize: 11, fontWeight: 700, flexShrink: 0,
        textTransform: 'uppercase', letterSpacing: 0.4,
      }}>
        {meta.shortLabel}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
          {index + 1}. {outcome.statement}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B' }}>
          {meta.label} · ~{outcome.estimatedMinutes ?? 30} min
        </p>
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => onMove(index, index - 1)} disabled={index === 0} title="Monter">↑</button>
        <button className="btn btn-ghost btn-sm" onClick={() => onMove(index, index + 1)} disabled={index === total - 1} title="Descendre">↓</button>
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(index)} title="Modifier">Modifier</button>
        <button className="btn btn-ghost btn-sm" onClick={() => onRemove(index)} style={{ color: '#9B2335' }} title="Supprimer">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

/* ─── Bandeau pédagogique Bloom (collapsible) ─────────────────────────────── */
function BloomGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E5E7EB', marginBottom: 16, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#1B4F72' }}>
          <Info size={14} /> Comprendre la taxonomie de Bloom révisée
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 8px' }}>
            Les objectifs d'apprentissage utilisent un <strong>verbe d'action précis</strong> selon
            la taxonomie de Bloom révisée (Anderson & Krathwohl, 2001). Cette explicitation est
            le pivot de l'<strong>alignement constructif</strong> (Biggs, 1996) : objectifs,
            activités d'apprentissage et critères d'évaluation cohérents.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
            {BLOOM_LEVELS.map((lvl) => {
              const meta = BLOOM_META[lvl];
              return (
                <div key={lvl} style={{ padding: 8, background: meta.bg, borderRadius: 6, borderLeft: `3px solid ${meta.color}` }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: meta.color }}>
                    {meta.label} <span style={{ fontWeight: 500, opacity: 0.7 }}>({meta.shortLabel})</span>
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#475569' }}>
                    {meta.verbs.slice(0, 5).join(', ')}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Page principale ─────────────────────────────────────────────────────── */
export default function CourseLearningOutcomes() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [outcomes, setOutcomes] = useState([]);
  const [contract, setContract] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [editing, setEditing] = useState(null); // { index, outcome } | { index: null } pour create
  const [dragIdx, setDragIdx] = useState(null);

  /* ── Chargement ────────────────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const courseRes = await api.get(`/courses/${courseId}`);
        setCourse(courseRes.data);
        const { data } = await api.get(`/courses/${courseId}/outcomes`);
        setOutcomes(data.learningOutcomes || []);
        setContract(data.pedagogicalContract || '');
      } catch (err) {
        setError(err.response?.data?.message || 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId]);

  /* ── Mutations locales ─────────────────────────────────────────────── */
  const addOutcome = (o) => setOutcomes((prev) => [...prev, o]);
  const replaceAt  = (idx, o) => setOutcomes((prev) => prev.map((x, i) => i === idx ? o : x));
  const removeAt   = (idx) => setOutcomes((prev) => prev.filter((_, i) => i !== idx));
  const moveAt     = (from, to) => {
    if (to < 0 || to >= outcomes.length) return;
    const next = [...outcomes];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setOutcomes(next);
  };

  /* ── Drag & drop natif ─────────────────────────────────────────────── */
  const handleDragStart = (e, idx) => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver  = (e)       => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop      = (e, idx)  => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    moveAt(dragIdx, idx);
    setDragIdx(null);
  };

  /* ── Persistance ───────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true); setError(''); setFeedback('');
    try {
      const { data } = await api.put(`/courses/${courseId}/outcomes`, {
        learningOutcomes: outcomes,
        pedagogicalContract: contract,
      });
      setOutcomes(data.learningOutcomes || []);
      setContract(data.pedagogicalContract || '');
      setFeedback('Objectifs et contrat enregistrés.');
      setTimeout(() => setFeedback(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur d\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <Layout title="Objectifs Bloom">
        <p className="text-small">Chargement…</p>
      </Layout>
    );
  }

  return (
    <Layout title="Objectifs d'apprentissage">
      <Breadcrumb items={[
        { label: 'Accueil', to: '/', icon: Home },
        { label: 'Mes cours', to: '/courses' },
        { label: course?.titre, to: `/courses/${courseId}` },
        { label: 'Objectifs Bloom' },
      ]} />

      <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
        <ArrowLeft size={18} /> Retour
      </button>

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">
              <Target size={22} style={{ marginRight: 8 }} />
              Objectifs d'apprentissage
            </h1>
            <p className="page-subtitle">
              {course?.titre} · Taxonomie de Bloom révisée + contrat pédagogique
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {feedback && (
        <div className="alert alert-success" style={{ marginBottom: 14 }}>
          <CheckCircle size={15} /> <span>{feedback}</span>
        </div>
      )}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 14 }}>
          <AlertCircle size={15} /> <span>{error}</span>
        </div>
      )}

      <BloomGuide />

      {/* Liste des outcomes */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title">{outcomes.length} objectif{outcomes.length !== 1 ? 's' : ''}</span>
          <button className="btn btn-primary btn-sm" onClick={() => setEditing({ index: null })}>
            <Plus size={14} /> Ajouter un objectif
          </button>
        </div>

        {outcomes.length === 0 ? (
          <div className="empty-state">
            <Target size={32} className="empty-state-icon" />
            <p className="empty-state-title">Aucun objectif défini</p>
            <p className="empty-state-desc">
              Définis ce que l'étudiant saura faire à la fin du cours, avec un verbe d'action et un niveau Bloom.
            </p>
          </div>
        ) : (
          <div>
            {outcomes.map((o, i) => (
              <OutcomeCard
                key={o._id || `tmp-${i}`}
                outcome={o}
                index={i}
                total={outcomes.length}
                onEdit={(idx) => setEditing({ index: idx, outcome: outcomes[idx] })}
                onRemove={removeAt}
                onMove={moveAt}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDragging={dragIdx === i}
              />
            ))}
          </div>
        )}
      </div>

      {/* Contrat pédagogique */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header">
          <span className="card-title">
            <BookOpen size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Contrat pédagogique
          </span>
          <p style={{ fontSize: 11, color: '#64748B', margin: '4px 0 0' }}>
            Markdown supporté. Max 2000 caractères. Affiché en haut de la page cours pour les étudiants.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, display: 'block' }}>
              Édition
            </label>
            <textarea
              className="input"
              rows={14}
              value={contract}
              onChange={(e) => setContract(e.target.value.slice(0, 2000))}
              placeholder={`# Bienvenue dans le module\n\n## Ce que tu vas apprendre\n- Premier point\n- Deuxième point\n\n## Engagement réciproque\nTu t'engages à...\nJe m'engage à...\n\n## Évaluation\n- ...`}
              style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
            />
            <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'right', margin: '4px 0 0' }}>
              {contract.length}/2000
            </p>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, display: 'block' }}>
              Aperçu
            </label>
            <div style={{
              padding: 12, minHeight: 240,
              background: '#F8FAFC', borderRadius: 8, border: '1px solid #E5E7EB',
            }}>
              {contract.trim()
                ? <Markdown source={contract} />
                : <p style={{ fontSize: 12, fontStyle: 'italic', color: '#94A3B8', margin: 0 }}>
                    L'aperçu apparaîtra ici…
                  </p>}
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'édition */}
      {editing && (
        <OutcomeModal
          initial={editing.outcome}
          onClose={() => setEditing(null)}
          onSave={(o) => {
            if (editing.index === null) addOutcome(o);
            else replaceAt(editing.index, o);
            setEditing(null);
          }}
        />
      )}
    </Layout>
  );
}
