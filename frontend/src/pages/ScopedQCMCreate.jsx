import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  Plus, Trash2, ChevronUp, ChevronDown,
  CheckCircle, AlertCircle, ArrowLeft, Save, BookOpen, Award,
} from 'lucide-react';

/**
 * ScopedQCMCreate — Création de QCM pour un Chapitre ou un Module entier.
 *
 * Scope='chapter' (URL /professor/chapter/:chapterId/qcm) :
 *   QCM passé en fin de chapitre, valide la maîtrise des capsules du chapitre.
 *
 * Scope='module' (URL /professor/module/:courseId/qcm-final) :
 *   QCM final de module, examen sommatif après tous les chapitres.
 *
 * Note : la création de QCM par capsule (scope='video') reste sur
 * ProfessorCreateQCM.jsx (avec génération IA, etc.).
 */

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const emptyQuestion = () => ({
  texte:          '',
  options:        { A: '', B: '', C: '', D: '' },
  questionType:   'single',
  correctAnswer:  'A',
  correctAnswers: ['A'],
  explanation:    '',
});

function QuestionEditor({ question, index, total, onChange, onRemove, onMove }) {
  const [open, setOpen] = useState(true);
  const isMultiple = question.questionType === 'multiple';
  const selectedAnswers = isMultiple
    ? (question.correctAnswers ?? [])
    : [question.correctAnswer];

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

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderBottom: open ? '1px solid var(--color-border)' : 'none' }}>
        <button type="button" onClick={() => setOpen(!open)} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>
          Q{index + 1} {question.texte ? `— ${question.texte.slice(0, 60)}` : '— (vide)'}
        </span>
        <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
          <ChevronUp size={14} />
        </button>
        <button type="button" onClick={() => onMove(index, 1)} disabled={index === total - 1} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
          <ChevronDown size={14} />
        </button>
        <button type="button" onClick={() => onRemove(index)} className="btn btn-ghost btn-sm" style={{ padding: 4, color: 'var(--color-error)' }}>
          <Trash2 size={14} />
        </button>
      </div>
      {open && (
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Énoncé</label>
            <textarea
              className="form-input"
              rows={2}
              value={question.texte}
              onChange={(e) => onChange(index, 'texte', e.target.value)}
              placeholder="Ex : Quel est le rôle principal d'un firewall ?"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { key: 'single', label: 'Choix unique' },
              { key: 'multiple', label: 'Choix multiple' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => onChange(index, 'questionType', key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1.5px solid ${question.questionType === key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  backgroundColor: question.questionType === key ? 'var(--color-primary-light)' : 'transparent',
                  color: question.questionType === key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {OPTION_LABELS.map((opt) => {
            const isSelected = selectedAnswers.includes(opt);
            return (
              <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleOptionClick(opt)}
                  style={{
                    minWidth: 32, height: 28, borderRadius: 'var(--radius-sm)',
                    border: `2px solid ${isSelected ? '#22C55E' : 'var(--color-border)'}`,
                    background: isSelected ? '#F0FDF4' : 'transparent',
                    color: isSelected ? '#15803D' : 'var(--color-text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title={isSelected ? 'Bonne réponse' : 'Marquer comme bonne réponse'}
                >
                  {opt}
                </button>
                <input
                  className="form-input"
                  value={question.options[opt]}
                  onChange={(e) => onChange(index, 'options', { ...question.options, [opt]: e.target.value })}
                  placeholder={`Option ${opt}`}
                  style={{ flex: 1 }}
                />
              </div>
            );
          })}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Explication (optionnel)</label>
            <textarea
              className="form-input"
              rows={2}
              value={question.explanation}
              onChange={(e) => onChange(index, 'explanation', e.target.value)}
              placeholder="Affichée après réponse pour expliquer la bonne réponse."
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScopedQCMCreate() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Détection du scope via le path : /professor/chapter/... ou /professor/module/...
  const isChapter = location.pathname.includes('/chapter/');
  const scope = isChapter ? 'chapter' : 'module';
  const refId = isChapter ? params.chapterId : params.courseId;

  const [titre,             setTitre]             = useState('');
  const [pointsPerQuestion, setPointsPerQuestion] = useState(10);
  const [timerSeconds,      setTimerSeconds]      = useState(45);
  const [passingScore,      setPassingScore]      = useState(60);
  const [questions,         setQuestions]         = useState([emptyQuestion()]);
  const [scopedMeta,        setScopedMeta]        = useState(null);

  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState('');

  /* Charger les méta du chapitre/module + QCM existant */
  useEffect(() => {
    if (!refId) return;

    if (scope === 'chapter') {
      api.get(`/chapters/${refId}`)
        .then(({ data }) => setScopedMeta(data))
        .catch(() => { /* pas grave */ });
      api.get(`/qcm/chapter/${refId}`)
        .then(({ data }) => loadExisting(data))
        .catch(() => { /* pas de QCM existant = normal */ });
    } else {
      api.get(`/courses/${refId}`)
        .then(({ data }) => setScopedMeta(data))
        .catch(() => {});
      api.get(`/qcm/module/${refId}`)
        .then(({ data }) => loadExisting(data))
        .catch(() => {});
    }
    // eslint-disable-next-line
  }, [refId, scope]);

  const loadExisting = (data) => {
    setTitre(data.titre || '');
    setPointsPerQuestion(data.pointsPerQuestion ?? 10);
    setTimerSeconds(data.timerSeconds ?? 45);
    setPassingScore(data.passingScore ?? 60);
    setQuestions((data.questions || []).map((q) => ({
      texte:          q.texte,
      options:        q.options,
      questionType:   q.questionType ?? 'single',
      correctAnswer:  q.correctAnswer ?? 'A',
      correctAnswers: q.correctAnswers ?? [q.correctAnswer ?? 'A'],
      explanation:    q.explanation ?? '',
    })));
  };

  const handleQuestionChange = (index, field, value) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setSaved(false);
  };

  const addQuestion    = () => { setQuestions((p) => [...p, emptyQuestion()]); setSaved(false); };
  const removeQuestion = (i) => { setQuestions((p) => p.filter((_, idx) => idx !== i)); setSaved(false); };
  const moveQuestion   = (i, d) => {
    setQuestions((p) => {
      const arr = [...p]; const j = i + d;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
    setSaved(false);
  };

  const validate = () => {
    if (!titre.trim())          return 'Le titre est obligatoire.';
    if (!refId)                 return scope === 'chapter' ? 'Aucun chapitre.' : 'Aucun module.';
    if (questions.length === 0) return 'Ajoutez au moins une question.';
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.texte.trim()) return `Question ${i + 1} : énoncé vide.`;
      for (const opt of OPTION_LABELS) {
        if (!q.options[opt].trim()) return `Question ${i + 1} : option ${opt} vide.`;
      }
      if (q.questionType === 'multiple' && (!q.correctAnswers || q.correctAnswers.length === 0)) {
        return `Question ${i + 1} : sélectionnez au moins une bonne réponse.`;
      }
    }
    return null;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    const v = validate();
    if (v) return setError(v);
    setSaving(true);
    try {
      const body = {
        scope,
        titre,
        questions,
        pointsPerQuestion: Number(pointsPerQuestion),
        timerSeconds:      Number(timerSeconds),
        passingScore:      Number(passingScore),
      };
      if (scope === 'chapter') body.chapterId = refId;
      else                     body.courseId  = refId;

      await api.post('/qcm/create', body);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const scopeLabel = scope === 'chapter' ? 'QCM de fin de chapitre' : 'QCM final de module';
  const scopeIcon  = scope === 'chapter' ? <BookOpen size={20} color="#1B4F72" /> : <Award size={20} color="#E8A838" />;
  const scopeColor = scope === 'chapter' ? '#1B4F72' : '#E8A838';

  return (
    <Layout title={scopeLabel}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} />
        </button>
        <h1 className="page-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {scopeIcon} {scopeLabel}
        </h1>
      </div>

      {scopedMeta && (
        <div className="card" style={{ padding: 12, marginBottom: 16, borderLeft: `4px solid ${scopeColor}` }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>
            {scope === 'chapter' ? 'Chapitre :' : 'Module :'} {scopedMeta.titre}
          </p>
          {scope === 'chapter' && scopedMeta.description && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>{scopedMeta.description}</p>
          )}
          {scope === 'module' && scopedMeta.filiere && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>
              {scopedMeta.filiere} · {scopedMeta.promotion}
            </p>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 16, marginBottom: 16, background: '#F0F9FF', borderLeft: `4px solid ${scopeColor}` }}>
        <p style={{ margin: 0, fontSize: 13, color: '#0C4A6E' }}>
          {scope === 'chapter'
            ? <>Ce QCM est passé après avoir terminé toutes les capsules du chapitre. Il valide la maîtrise du chapitre.</>
            : <>Ce QCM final est passé après avoir terminé tous les chapitres du module. C'est l'examen sommatif du module.</>
          } Score de réussite minimum : <strong>{passingScore}%</strong>.
        </p>
      </div>

      <form onSubmit={handleSave}>
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <label className="form-label">Titre du QCM</label>
          <input
            className="form-input"
            value={titre}
            onChange={(e) => { setTitre(e.target.value); setSaved(false); }}
            placeholder={scope === 'chapter' ? 'Ex : QCM Cryptographie' : 'Ex : Examen final Cybersécurité'}
            style={{ width: '100%', marginBottom: 12 }}
          />

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="form-label">Points / question</label>
              <input type="number" className="form-input" min="1" max="50" value={pointsPerQuestion} onChange={(e) => setPointsPerQuestion(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="form-label">Temps / question (s)</label>
              <input type="number" className="form-input" min="10" max="180" value={timerSeconds} onChange={(e) => setTimerSeconds(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="form-label">Score minimum (%)</label>
              <input type="number" className="form-input" min="0" max="100" value={passingScore} onChange={(e) => setPassingScore(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          {questions.map((q, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
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
        </div>

        <button type="button" className="btn btn-ghost btn-sm" onClick={addQuestion} style={{ marginBottom: 16 }}>
          <Plus size={14} /> Ajouter une question
        </button>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {saved && (
          <div className="alert" style={{ marginBottom: 12, background: '#F0FDF4', borderLeft: '3px solid #22C55E', padding: 12, color: '#15803D', display: 'flex', gap: 8, alignItems: 'center' }}>
            <CheckCircle size={16} /> {scopeLabel} enregistré.
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={saving}>
          <Save size={15} /> {saving ? 'Enregistrement…' : 'Enregistrer le QCM'}
        </button>
      </form>
    </Layout>
  );
}
