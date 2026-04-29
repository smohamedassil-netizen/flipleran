import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  Plus, Trash2, ChevronUp, ChevronDown,
  CheckCircle, AlertCircle, ArrowLeft, Eye, Save, Sparkles,
  Crown,
} from 'lucide-react';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const emptyQuestion = () => ({
  texte:          '',
  options:        { A: '', B: '', C: '', D: '' },
  questionType:   'single',
  correctAnswer:  'A',
  correctAnswers: ['A'],
  explanation:    '',
});

/* ─── Question type toggle ───────────────────────────────────────────── */
function TypeToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
      {[
        { key: 'single',   label: 'Choix unique' },
        { key: 'multiple', label: 'Choix multiple' },
      ].map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--radius-sm)',
            border: `1.5px solid ${value === key ? 'var(--color-primary)' : 'var(--color-border)'}`,
            backgroundColor: value === key ? 'var(--color-primary-light)' : 'transparent',
            color: value === key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 120ms',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ─── Question editor ────────────────────────────────────────────────── */
function QuestionEditor({ question, index, total, onChange, onRemove, onMove }) {
  const [open, setOpen] = useState(true);
  const hasError =
    !question.texte.trim() ||
    OPTION_LABELS.some((o) => !question.options[o].trim());

  const isMultiple = question.questionType === 'multiple';
  const selectedAnswers = isMultiple
    ? (question.correctAnswers ?? [])
    : [question.correctAnswer];

  const isSelected = (opt) => selectedAnswers.includes(opt);

  const handleOptionClick = (opt) => {
    if (isMultiple) {
      const current = question.correctAnswers ?? [];
      const updated = current.includes(opt)
        ? current.filter((a) => a !== opt)
        : [...current, opt];
      onChange(index, 'correctAnswers', updated.length > 0 ? updated : [opt]);
    } else {
      onChange(index, 'correctAnswer', opt);
      onChange(index, 'correctAnswers', [opt]);
    }
  };

  const handleTypeChange = (type) => {
    onChange(index, 'questionType', type);
    if (type === 'single') {
      const first = (question.correctAnswers ?? [])[0] || 'A';
      onChange(index, 'correctAnswer', first);
      onChange(index, 'correctAnswers', [first]);
    }
  };

  return (
    <div
      className="card"
      style={{
        padding: 0, overflow: 'hidden',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          backgroundColor: 'var(--color-bg)',
          borderBottom: open ? '1px solid var(--color-border)' : 'none',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <div
          style={{
            width: 28, height: 28, flexShrink: 0,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: hasError ? 'var(--color-border)' : 'var(--color-primary)',
            color: hasError ? 'var(--color-text-secondary)' : '#fff',
            fontWeight: 700, fontSize: 'var(--font-size-xs)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {index + 1}
        </div>

        <span
          style={{
            flex: 1, fontSize: 'var(--font-size-sm)', fontWeight: 600,
            color: 'var(--color-text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {question.texte.trim() || 'Nouvelle question'}
        </span>

        {/* Type badge */}
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: isMultiple ? '#EBF3FA' : '#FEF6E7',
          color: isMultiple ? '#1B4F72' : '#D4952A',
        }}>
          {isMultiple ? 'Multiple' : 'Unique'}
        </span>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn btn-ghost btn-sm" disabled={index === 0} onClick={() => onMove(index, -1)} title="Monter">
            <ChevronUp size={14} />
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={index === total - 1} onClick={() => onMove(index, 1)} title="Descendre">
            <ChevronDown size={14} />
          </button>
          <button type="button" className="btn btn-danger btn-sm" disabled={total <= 1} onClick={() => onRemove(index)} title="Supprimer">
            <Trash2 size={14} />
          </button>
        </div>

        <ChevronDown
          size={15}
          color="var(--color-text-disabled)"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}
        />
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Question type toggle */}
          <TypeToggle value={question.questionType ?? 'single'} onChange={handleTypeChange} />

          {/* Texte de la question */}
          <div>
            <label className="form-label">
              Énoncé <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <textarea
              className="form-input"
              style={{ minHeight: 64, resize: 'vertical' }}
              placeholder="Entrez l'énoncé de la question..."
              value={question.texte}
              onChange={(e) => onChange(index, 'texte', e.target.value)}
            />
          </div>

          {/* Options A-D */}
          <div>
            <label className="form-label">
              Réponses {isMultiple && <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>(cliquez plusieurs lettres)</span>}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {OPTION_LABELS.map((opt) => (
                <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 32, height: 32, flexShrink: 0,
                      borderRadius: isMultiple ? 'var(--radius-sm)' : '50%',
                      border: `1.5px solid ${isSelected(opt) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      backgroundColor: isSelected(opt) ? 'var(--color-primary)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background-color 120ms, border-color 120ms',
                    }}
                    title={isMultiple ? `Cocher/décocher ${opt}` : `Marquer ${opt} comme bonne réponse`}
                    onClick={(e) => { e.preventDefault(); handleOptionClick(opt); }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 'var(--font-size-xs)', color: isSelected(opt) ? '#fff' : 'var(--color-text-secondary)' }}>
                      {opt}
                    </span>
                  </label>

                  <input
                    type="text"
                    className="form-input"
                    style={{ flex: 1 }}
                    placeholder={`Option ${opt}`}
                    value={question.options[opt]}
                    onChange={(e) =>
                      onChange(index, 'options', { ...question.options, [opt]: e.target.value })
                    }
                  />

                  {isSelected(opt) && (
                    <CheckCircle size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                  )}
                </div>
              ))}
            </div>
            <p className="form-hint">
              {isMultiple
                ? 'Cliquez sur les lettres pour sélectionner les bonnes réponses.'
                : 'Cliquez sur la lettre pour définir la bonne réponse.'}
            </p>
          </div>

          {/* Explication */}
          <div>
            <label className="form-label">Explication (affichée après soumission)</label>
            <textarea
              className="form-input"
              style={{ minHeight: 56, resize: 'vertical' }}
              placeholder="Pourquoi cette réponse est-elle correcte ?"
              value={question.explanation}
              onChange={(e) => onChange(index, 'explanation', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ProfessorCreateQCM
══════════════════════════════════════════════════════════════��════════════ */
export default function ProfessorCreateQCM() {
  const { videoId } = useParams();
  const navigate    = useNavigate();

  const [titre,            setTitre]            = useState('');
  const [pointsPerQuestion,setPointsPerQuestion] = useState(10);
  const [timerSeconds,     setTimerSeconds]      = useState(30);
  const [questions,        setQuestions]         = useState([emptyQuestion()]);

  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState('');
  const [preview,     setPreview]     = useState(false);
  const [generating,  setGenerating]  = useState(false);
  const [aiCount,     setAiCount]     = useState(5);
  const [quotaInfo,   setQuotaInfo]   = useState(null);
  const [quotaExceeded, setQuotaExceeded] = useState(null);
  const [videoMeta,   setVideoMeta]   = useState(null);

  /* Charger les méta de la vidéo pré-sélectionnée (titre + cours associé) */
  useEffect(() => {
    if (!videoId) return;
    api.get(`/videos/${videoId}`)
      .then(({ data }) => setVideoMeta(data))
      .catch(() => { /* vidéo inaccessible — on garde l'UI sans badge */ });
  }, [videoId]);

  /* Charger l'état initial du quota IA (qcmGeneration) */
  useEffect(() => {
    api.get('/users/me/ai-quota')
      .then(({ data }) => {
        const q = data?.quotas?.qcmGeneration;
        if (q && q.limit !== null) {
          setQuotaInfo({ used: q.used, limit: q.limit, resetAt: q.resetAt });
        }
      })
      .catch(() => { /* fail silent — l'UI reste neutre si quota inconnu */ });
  }, []);

  /* Charger un QCM existant si disponible */
  useEffect(() => {
    if (!videoId) return;
    api.get(`/qcm/video/${videoId}`)
      .then(({ data }) => {
        setTitre(data.titre);
        setPointsPerQuestion(data.pointsPerQuestion ?? 10);
        setTimerSeconds(data.timerSeconds ?? 30);
        setQuestions(data.questions.map((q) => ({
          texte:          q.texte,
          options:        q.options,
          questionType:   q.questionType ?? 'single',
          correctAnswer:  q.correctAnswer ?? 'A',
          correctAnswers: q.correctAnswers ?? [q.correctAnswer ?? 'A'],
          explanation:    q.explanation ?? '',
        })));
      })
      .catch(() => { /* pas de QCM existant = normal */ });
  }, [videoId]);

  /* ── Question handlers ─────────────────────────────────────────────── */
  const handleQuestionChange = (index, field, value) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setSaved(false);
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion()]);
    setSaved(false);
  };

  const removeQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const moveQuestion = (index, dir) => {
    setQuestions((prev) => {
      const arr  = [...prev];
      const swap = index + dir;
      if (swap < 0 || swap >= arr.length) return arr;
      [arr[index], arr[swap]] = [arr[swap], arr[index]];
      return arr;
    });
    setSaved(false);
  };

  /* ── AI Generation ─────────────────────────────────────────────────── */
  const handleGenerateAI = async () => {
    if (!videoId) return setError('Aucune vidéo associée.');
    setGenerating(true);
    setError('');
    setQuotaExceeded(null);
    try {
      const response = await api.post('/qcm/generate-ai', {
        videoId,
        numberOfQuestions: aiCount,
      });

      // Lecture des headers de quota (axios force le lowercase)
      const used  = response.headers?.['x-ai-quota-used'];
      const limit = response.headers?.['x-ai-quota-limit'];
      const reset = response.headers?.['x-ai-quota-reset'];
      if (used && limit) {
        setQuotaInfo({ used: Number(used), limit: Number(limit), resetAt: reset });
      }

      const { data } = response;
      if (data.questions?.length) {
        setQuestions(data.questions);
        if (data.suggestedTitle && !titre.trim()) {
          setTitre(data.suggestedTitle);
        }
        setSaved(false);
      }
    } catch (err) {
      // 429 = quota dépassé : le body contient { used, limit, resetAt, upgrade }
      if (err.response?.status === 429) {
        const body = err.response.data ?? {};
        setQuotaExceeded({
          resetAt: body.resetAt ?? null,
          used:    body.used ?? null,
          limit:   body.limit ?? null,
        });
        if (body.used != null && body.limit != null) {
          setQuotaInfo({ used: Number(body.used), limit: Number(body.limit), resetAt: body.resetAt });
        }
      } else {
        setError(err.response?.data?.message ?? 'Erreur lors de la génération IA.');
      }
    } finally {
      setGenerating(false);
    }
  };

  /* ── Validation ────────────────────────────────────────────────────── */
  const validate = () => {
    if (!titre.trim())         return 'Le titre est obligatoire.';
    if (!videoId)              return 'Aucune vidéo associée.';
    if (questions.length === 0) return 'Ajoutez au moins une question.';
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.texte.trim()) return `Question ${i + 1} : l'énoncé est vide.`;
      for (const opt of OPTION_LABELS) {
        if (!q.options[opt].trim()) return `Question ${i + 1} : l'option ${opt} est vide.`;
      }
      if (q.questionType === 'multiple' && (!q.correctAnswers || q.correctAnswers.length === 0)) {
        return `Question ${i + 1} : sélectionnez au moins une bonne réponse.`;
      }
    }
    return null;
  };

  /* ── Submit ────────────────────────────────────────────────────────── */
  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    const validationError = validate();
    if (validationError) return setError(validationError);

    setSaving(true);
    try {
      await api.post('/qcm/create', {
        videoId,
        titre,
        questions,
        pointsPerQuestion: Number(pointsPerQuestion),
        timerSeconds:      Number(timerSeconds),
      });
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Créer un QCM">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} />
        </button>
        <h1 className="page-title">Créer un QCM</h1>
        <span style={{ color: 'var(--color-text-disabled)', fontSize: 'var(--font-size-xs)' }}>·</span>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          {questions.length} question{questions.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Vidéo pré-sélectionnée (depuis useParams videoId) */}
      {videoMeta && (
        <div style={{
          padding: '10px 14px', marginBottom: 18, borderRadius: 10,
          background: '#EBF3FA', border: '1px solid #BFDBFE',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#1B4F72', letterSpacing: 0.4 }}>
            Vidéo associée
          </span>
          <span style={{ color: '#1E293B', fontWeight: 600 }}>{videoMeta.titre}</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>

          {/* ── Left column: questions ─────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {error && (
              <div className="alert alert-error">
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {questions.map((q, i) => (
              <div key={i} className="qcm-reveal" style={{ animationDelay: `${i * 40}ms` }}>
                <QuestionEditor
                  question={q}
                  index={i}
                  total={questions.length}
                  onChange={handleQuestionChange}
                  onRemove={removeQuestion}
                  onMove={moveQuestion}
                />
              </div>
            ))}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={addQuestion}
              style={{ alignSelf: 'flex-start' }}
            >
              <Plus size={15} /> Ajouter une question
            </button>
          </div>

          {/* ── Right column: settings + actions ─────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 20 }}>

            {/* QCM settings */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)' }}>
                Paramètres du QCM
              </p>

              <div>
                <label className="form-label" htmlFor="titre">
                  Titre <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  id="titre"
                  className="form-input"
                  placeholder="Ex: QCM - Introduction"
                  value={titre}
                  onChange={(e) => { setTitre(e.target.value); setSaved(false); }}
                />
              </div>

              <div>
                <label className="form-label" htmlFor="timer">
                  Temps par question (secondes)
                </label>
                <input id="timer" type="number" className="form-input" min={10} max={120} step={5}
                  value={timerSeconds}
                  onChange={(e) => { setTimerSeconds(e.target.value); setSaved(false); }}
                />
              </div>

              <div>
                <label className="form-label" htmlFor="points">
                  Points par bonne réponse
                </label>
                <input id="points" type="number" className="form-input" min={1} max={100}
                  value={pointsPerQuestion}
                  onChange={(e) => { setPointsPerQuestion(e.target.value); setSaved(false); }}
                />
              </div>
            </div>

            {/* AI Generation */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'linear-gradient(135deg, #EBF3FA 0%, #FEF6E7 100%)' }}>
              <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-primary)' }}>
                Génération par IA
              </p>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                L'IA génère des questions basées sur le sujet de la vidéo. Vous pourrez les modifier avant de sauvegarder.
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0, fontSize: 12 }}>Nb questions :</label>
                <input type="number" className="form-input" style={{ width: 60 }}
                  min={2} max={15} value={aiCount}
                  onChange={(e) => setAiCount(Number(e.target.value))}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleGenerateAI}
                disabled={generating || !!quotaExceeded}
              >
                <Sparkles size={15} />
                {generating ? 'Génération en cours...' : 'Générer avec l\'IA'}
              </button>

              {/* Compteur de quota mensuel */}
              {quotaInfo && !quotaExceeded && (() => {
                const { used, limit } = quotaInfo;
                const ratio = limit > 0 ? Math.min(used / limit, 1) : 0;
                const barColor = ratio >= 1 ? '#9B2335' : ratio >= 0.8 ? '#D4952A' : '#276749';
                return (
                  <div style={{ marginTop: 4 }}>
                    <p style={{
                      fontSize: 11,
                      color: 'var(--color-text-secondary)',
                      margin: '0 0 4px 0',
                    }}>
                      {used} / {limit} générations utilisées ce mois
                    </p>
                    <div style={{
                      height: 4,
                      backgroundColor: '#E2E8F0',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${ratio * 100}%`,
                        backgroundColor: barColor,
                        transition: 'width 0.4s ease, background-color 0.3s ease',
                      }} />
                    </div>
                  </div>
                );
              })()}

              {/* Quota dépassé : message + lien Premium */}
              {quotaExceeded && (
                <div style={{
                  marginTop: 4,
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: '#FFF5F5',
                  border: '1px solid #9B233533',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <p style={{
                    fontSize: 12,
                    color: '#9B2335',
                    fontWeight: 600,
                    margin: 0,
                  }}>
                    Quota mensuel atteint.
                  </p>
                  {quotaExceeded.resetAt && (
                    <p style={{
                      fontSize: 11,
                      color: 'var(--color-text-secondary)',
                      margin: 0,
                    }}>
                      Renouvellement le {new Date(quotaExceeded.resetAt).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}.
                    </p>
                  )}
                  <Link
                    to="/rewards"
                    className="btn btn-primary btn-sm"
                    style={{ justifyContent: 'center' }}
                  >
                    <Crown size={13} /> Passer en Premium
                  </Link>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)' }}>
                Résumé
              </p>
              {[
                { label: 'Questions',       value: questions.length },
                { label: 'Choix multiple',  value: questions.filter(q => q.questionType === 'multiple').length },
                { label: 'Points max',      value: questions.length * Number(pointsPerQuestion) },
                { label: 'Durée estimée',   value: `${Math.ceil(questions.length * Number(timerSeconds) / 60)} min` },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{label}</span>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text)' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Save size={15} />
              {saving ? 'Sauvegarde...' : saved ? 'Sauvegardé !' : 'Sauvegarder le QCM'}
            </button>

            {saved && (
              <div className="alert alert-success pop-in">
                <CheckCircle size={14} style={{ flexShrink: 0 }} />
                <span>QCM sauvegardé avec succès.</span>
              </div>
            )}

            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setPreview((p) => !p)}
            >
              <Eye size={15} /> {preview ? "Masquer l'aperçu" : 'Aperçu étudiant'}
            </button>
          </div>
        </div>
      </form>

      {/* ── Preview modal ────────────────────────────────────────────── */}
      {preview && (
        <div
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: 24,
          }}
          onClick={() => setPreview(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-bg)',
              borderRadius: 'var(--radius-lg)',
              padding: 28,
              width: '100%', maxWidth: 560,
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)', color: 'var(--color-text)' }}>
                Aperçu : {titre || 'Sans titre'}
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreview(false)}>
                Fermer
              </button>
            </div>

            {questions[0] && (
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Question 1</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: questions[0].questionType === 'multiple' ? '#EBF3FA' : '#FEF6E7', color: questions[0].questionType === 'multiple' ? '#1B4F72' : '#D4952A' }}>
                    {questions[0].questionType === 'multiple' ? 'Choix multiple' : 'Choix unique'}
                  </span>
                </div>
                <p style={{ fontWeight: 600, fontSize: 'var(--font-size-md)', marginBottom: 16, color: 'var(--color-text)' }}>
                  1. {questions[0].texte || '(énoncé vide)'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {OPTION_LABELS.map((opt) => (
                    <div
                      key={opt}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '11px 14px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-surface)',
                      }}
                    >
                      <span style={{ width: 24, height: 24, borderRadius: questions[0].questionType === 'multiple' ? 'var(--radius-sm)' : '50%', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                        {opt}
                      </span>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
                        {questions[0].options[opt] || '(option vide)'}
                      </span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)', marginTop: 12, textAlign: 'center' }}>
                  Aperçu de la question 1 sur {questions.length}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
