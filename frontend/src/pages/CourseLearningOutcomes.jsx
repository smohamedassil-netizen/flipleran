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
  Lightbulb, Eye, Sparkles, FileText,
} from 'lucide-react';

/* ─── Templates de contrat pédagogique pré-remplis ────────────────────────
   Trois modèles types qu'un prof peut insérer en 1 clic puis adapter.
   Réduit la charge de la page blanche et illustre ce qu'attend la plateforme. */
const CONTRACT_TEMPLATES = [
  {
    id: 'classique',
    label: 'Cours classique',
    description: 'Engagement standard prof / étudiants',
    body: `# Bienvenue dans ce module

## Ce que vous allez apprendre
Voir la liste des objectifs ci-dessous (taxonomie de Bloom).

## Mon engagement (le professeur)
- Réponse à vos messages sous **48h ouvrées**
- Correction des QCM dans la **semaine** qui suit
- Disponibilité en présentiel pour les questions

## Votre engagement (étudiants)
- Regarder les vidéos **avant** le cours en présentiel
- Faire le QCM associé à chaque vidéo
- Participer activement aux Prosits en groupe

## Évaluation
- 60 % contrôle final
- 30 % QCM en cours de module
- 10 % participation Prosits`,
  },
  {
    id: 'collaboratif',
    label: 'Cours collaboratif',
    description: 'Centré sur le travail en groupe et les Prosits',
    body: `# Bienvenue — module collaboratif

## L'esprit du module
Ce cours s'appuie sur l'**Apprentissage Par Problème (APP/CESI)** : vous travaillez en groupe sur des cas concrets contextualisés.

## Mon engagement
- Encadrement des groupes lors des phases Aller et Retour
- Feedback individualisé sur chaque livrable de groupe
- Réponse aux messages sous **24h** pendant les phases actives

## Votre engagement
- Présence et ponctualité sur les phases Aller et Retour
- Contribution équilibrée dans le groupe (rotation des rôles CESI)
- Respect des deadlines de chaque phase

## Évaluation
- 40 % livrables Prosit (note prof 70 % + note pairs 30 %)
- 30 % QCM individuel
- 30 % contrôle final`,
  },
  {
    id: 'intensif',
    label: 'Cours intensif',
    description: 'Module dense — charge de travail élevée',
    body: `# Bienvenue dans ce module intensif

## Charge de travail prévue
**Compter ~6h de travail personnel par semaine** en plus des séances en présentiel.

## Mon engagement
- Mise à disposition des ressources **chaque lundi**
- Réponse aux messages sous **48h**
- Permanence hebdomadaire pour vos questions

## Votre engagement
- Visionner les vidéos avant chaque séance
- Réussir les QCM avec un **score minimum de 60 %**
- Rendre les livrables Prosit **dans les délais** (pas de retard accepté)

## Évaluation
- 50 % contrôle final
- 25 % QCM (moyenne)
- 25 % Prosit en groupe`,
  },
];

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

/* ─── Encart "À quoi sert cette page" ─────────────────────────────────────
   Toujours visible en haut, explique au prof le POURQUOI et l'EFFET CONCRET
   de ce qu'il définit ici. Sans ça, beaucoup de profs ne comprennent pas
   l'utilité et perçoivent la page comme une charge administrative. */
function WhyThisPage() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #EBF3FA, #F0F9FF)',
      border: '1px solid #BFDBFE',
      borderRadius: 10,
      padding: 16,
      marginBottom: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <Lightbulb size={20} color="#1B4F72" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1B4F72', margin: 0 }}>
            À quoi sert cette page ?
          </h3>
          <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 0', lineHeight: 1.5 }}>
            Définissez ici <strong>ce que vos étudiants doivent savoir faire</strong> à la fin
            du cours. Ces objectifs sont ensuite réutilisés automatiquement à 3 endroits dans
            l'application :
          </p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 10,
        marginTop: 8,
      }}>
        <div style={{ background: 'white', padding: 10, borderRadius: 8, border: '1px solid #E0E7FF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Eye size={14} color="#1B4F72" />
            <strong style={{ fontSize: 12, color: '#1B4F72' }}>Vu par vos étudiants</strong>
          </div>
          <p style={{ fontSize: 11, color: '#475569', margin: 0, lineHeight: 1.4 }}>
            Affichés en haut de la page cours pour que chaque étudiant sache pourquoi il regarde ces vidéos.
          </p>
        </div>

        <div style={{ background: 'white', padding: 10, borderRadius: 8, border: '1px solid #E0E7FF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Sparkles size={14} color="#9333EA" />
            <strong style={{ fontSize: 12, color: '#9333EA' }}>Cible la génération IA</strong>
          </div>
          <p style={{ fontSize: 11, color: '#475569', margin: 0, lineHeight: 1.4 }}>
            Quand l'IA génère des QCM ou un Prosit, elle vise précisément vos objectifs définis ici.
          </p>
        </div>

        <div style={{ background: 'white', padding: 10, borderRadius: 8, border: '1px solid #E0E7FF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Target size={14} color="#059669" />
            <strong style={{ fontSize: 12, color: '#059669' }}>Mesurez la progression</strong>
          </div>
          <p style={{ fontSize: 11, color: '#475569', margin: 0, lineHeight: 1.4 }}>
            Suivez objectif par objectif quel étudiant maîtrise quoi (tracking ciblé).
          </p>
        </div>
      </div>

      <p style={{ fontSize: 12, color: '#475569', margin: '12px 0 0', lineHeight: 1.5 }}>
        Cette page vous permet aussi de définir le <strong>contrat pédagogique</strong> (en bas) :
        vos engagements, ceux que vous attendez de vos étudiants et les modalités d'évaluation.
        Il s'affiche en haut de la page cours côté étudiant — utilisez le bouton{' '}
        <strong>« Aperçu étudiant »</strong> en haut à droite pour le vérifier.
      </p>

      <p style={{ fontSize: 11, color: '#64748B', margin: '8px 0 0', fontStyle: 'italic' }}>
        💡 Pas le temps ? Commencez avec 3-5 objectifs et un modèle de contrat prêt à l'emploi
        (en bas de la page).
      </p>
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
              {course?.titre} · Définissez ce que vos étudiants doivent savoir faire à la fin du cours
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => window.open(`/courses/${courseId}`, '_blank')}
              title="Voir comment vos étudiants verront cette page"
            >
              <Eye size={14} /> Aperçu étudiant
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              <Save size={14} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>

      <WhyThisPage />

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
            Engagements mutuels prof / étudiants, affichés en haut de la page cours côté étudiant.
            Mise en forme : <strong>Markdown</strong> (#&nbsp;Titre, **gras**, - liste). Max 2000&nbsp;caractères.
          </p>
        </div>

        {/* Templates pré-remplis */}
        <div style={{
          padding: '10px 14px',
          background: '#F8FAFC',
          borderTop: '1px solid #E5E7EB',
          borderBottom: '1px solid #E5E7EB',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 8px' }}>
            <FileText size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Insérer un modèle prêt à l'emploi
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CONTRACT_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  if (contract.trim() && !window.confirm(`Le contenu actuel sera remplacé par le modèle "${tpl.label}". Continuer ?`)) {
                    return;
                  }
                  setContract(tpl.body.slice(0, 2000));
                }}
                title={tpl.description}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #BFDBFE',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#1B4F72',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'background 120ms, border-color 120ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#EBF3FA'; e.currentTarget.style.borderColor = '#1B4F72'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
              >
                <FileText size={12} />
                {tpl.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 10, color: '#94A3B8', margin: '6px 0 0', fontStyle: 'italic' }}>
            Le modèle remplit l'éditeur ci-dessous. Vous pouvez ensuite l'adapter à votre cours.
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
