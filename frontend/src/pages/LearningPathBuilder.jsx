import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import PathBuilderStepCard from '../components/PathBuilderStepCard.jsx';
import PathBuilderAddStep  from '../components/PathBuilderAddStep.jsx';
import api from '../utils/api.js';
import {
  Home, Route, Plus, Save, Eye, Send, ArrowLeft,
  AlertCircle, CheckCircle,
} from 'lucide-react';

/**
 * LearningPathBuilder — Éditeur de parcours pédagogique scénarisé pour le prof.
 *
 * Permet d'organiser les ressources d'un cours (capsules, QCM, Prosits, lectures)
 * en une séquence guidée que l'étudiant suit étape par étape. Conformément
 * à Lebrun (2007), ce builder matérialise la **scénarisation pédagogique** :
 * le prof choisit l'ordre, les transitions et les critères de progression
 * — ce qui distingue un dispositif d'apprentissage authentique d'un simple
 * dépôt de ressources.
 *
 * @see Lebrun, M. (2007). *Théories et méthodes pédagogiques pour enseigner
 *      et apprendre*. De Boeck.
 */

export default function LearningPathBuilder() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [path, setPath]     = useState(null);
  const [steps, setSteps]   = useState([]);
  const [meta, setMeta]     = useState({ title: 'Parcours d\'apprentissage', description: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [feedback, setFeedback] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);

  const isDraft = !path?.publishedAt;

  /* ── Chargement initial ──────────────────────────────────────────── */
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const courseRes = await api.get(`/courses/${courseId}`);
        setCourse(courseRes.data);
        try {
          const { data } = await api.get(`/learning-paths/course/${courseId}?free=true`);
          setPath(data);
          setMeta({ title: data.title, description: data.description || '' });
          setSteps([...(data.steps || [])].sort((a, b) => a.order - b.order));
        } catch {
          setPath(null);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [courseId]);

  /* ── Mutations ───────────────────────────────────────────────────── */
  const addStep = (newStep) =>
    setSteps((prev) => [...prev, { ...newStep, _id: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` }]);

  const updateStep = (idx, updated) => {
    const next = [...steps];
    next[idx] = updated;
    setSteps(next);
  };

  const removeStep = (idx) => setSteps((prev) => prev.filter((_, i) => i !== idx));

  const moveStep = (from, to) => {
    if (to < 0 || to >= steps.length) return;
    const next = [...steps];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setSteps(next);
  };

  /* ── Drag & drop natif HTML5 ─────────────────────────────────────── */
  const handleDragStart = (e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    moveStep(dragIdx, idx);
    setDragIdx(null);
  };

  /* ── Persistance ─────────────────────────────────────────────────── */
  const buildPayload = () => ({
    courseId,
    title: meta.title,
    description: meta.description,
    steps: steps.map((s, i) => ({
      order: i,
      type: s.type,
      resourceId: s.resourceId,
      resourceModel: s.resourceModel,
      title: s.title || '',
      isRequired: s.isRequired !== false,
      unlockCriteria: s.unlockCriteria || {},
      estimatedMinutes: s.estimatedMinutes ?? 0,
      customMessage: s.customMessage || '',
    })),
  });

  const handleSave = async () => {
    setSaving(true); setError(''); setFeedback('');
    try {
      const payload = buildPayload();
      if (path?._id) {
        const { data } = await api.put(`/learning-paths/${path._id}`, payload);
        setPath((p) => ({ ...p, ...data }));
      } else {
        const { data } = await api.post('/learning-paths', payload);
        setPath(data);
      }
      setFeedback('Parcours enregistré.');
      setTimeout(() => setFeedback(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!steps.length) {
      setError('Ajoutez au moins une étape avant de publier.');
      return;
    }
    setSaving(true); setError(''); setFeedback('');
    try {
      const payload = buildPayload();
      let pathId = path?._id;
      if (pathId) {
        await api.put(`/learning-paths/${pathId}`, payload);
      } else {
        const { data } = await api.post('/learning-paths', payload);
        pathId = data._id;
        setPath(data);
      }
      const { data } = await api.post(`/learning-paths/${pathId}/publish`);
      setPath((p) => ({ ...(p || {}), ...data.path, publishedAt: data.publishedAt }));
      setFeedback('Parcours publié et visible par les étudiants.');
      setTimeout(() => setFeedback(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la publication.');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => navigate(`/courses/${courseId}`);

  /* ── Render ──────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <Layout title="Parcours pédagogique">
        <p className="text-small">Chargement…</p>
      </Layout>
    );
  }

  return (
    <Layout title="Parcours pédagogique">
      <Breadcrumb items={[
        { label: 'Accueil', to: '/', icon: Home },
        { label: 'Mes modules', to: '/courses' },
        { label: course?.titre, to: `/courses/${courseId}` },
        { label: 'Parcours pédagogique' },
      ]} />

      <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
        <ArrowLeft size={18} /> Retour
      </button>

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">
              <Route size={22} style={{ marginRight: 8 }} />
              Parcours pédagogique
              {isDraft && (
                <span style={{ marginLeft: 10, padding: '3px 10px', borderRadius: 999, fontSize: 12, backgroundColor: '#FFFBEB', color: '#D4952A', border: '1px solid #D4952A33' }}>
                  Brouillon
                </span>
              )}
            </h1>
            <p className="page-subtitle">
              {course?.titre} · Organise les capsules, QCM et Prosits en une séquence guidée.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={handlePreview}>
              <Eye size={14} /> Aperçu étudiant
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleSave} disabled={saving}>
              <Save size={14} /> Enregistrer
            </button>
            <button className="btn btn-primary btn-sm" onClick={handlePublish} disabled={saving}>
              <Send size={14} /> {isDraft ? 'Publier' : 'Republier'}
            </button>
          </div>
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

      {/* Métadonnées du parcours */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 4, display: 'block' }}>
              Titre du parcours
            </label>
            <input
              className="input"
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 4, display: 'block' }}>
              Description / intro pédagogique
            </label>
            <textarea
              className="input"
              rows={2}
              value={meta.description}
              onChange={(e) => setMeta({ ...meta, description: e.target.value })}
              placeholder="Quelques lignes pour présenter le parcours aux étudiants."
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>
      </div>

      {/* Liste des steps */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title">{steps.length} étape{steps.length !== 1 ? 's' : ''}</span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> Ajouter une étape
          </button>
        </div>

        {steps.length === 0 ? (
          <div className="empty-state">
            <Route size={32} className="empty-state-icon" />
            <p className="empty-state-title">Aucune étape</p>
            <p className="empty-state-desc">
              Ajoute des capsules, QCM, Prosits ou lectures pour construire le parcours.
            </p>
          </div>
        ) : (
          <div>
            {steps.map((step, i) => (
              <PathBuilderStepCard
                key={step._id || `${step.resourceId}-${i}`}
                step={step}
                index={i}
                total={steps.length}
                onUpdate={(updated) => updateStep(i, updated)}
                onRemove={removeStep}
                onMove={moveStep}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDragging={dragIdx === i}
              />
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <PathBuilderAddStep
          courseId={courseId}
          onClose={() => setShowAddModal(false)}
          onAdd={addStep}
        />
      )}
    </Layout>
  );
}
