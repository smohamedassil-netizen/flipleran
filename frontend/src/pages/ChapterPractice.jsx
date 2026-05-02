import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  Sparkles, ArrowLeft, ArrowRight, CheckCircle2, XCircle,
  RefreshCw, AlertCircle, Award, BookOpen,
} from 'lucide-react';

/**
 * ChapterPractice — page d'entraînement libre sur un chapitre.
 *
 * Pédagogie : test-enhanced learning (Roediger & Karpicke 2006).
 * L'étudiant s'auto-teste sur le chapitre via un tirage aléatoire de
 * questions issues des QCM des vidéos du chapitre. Pas noté, pas chronométré
 * — pure préparation cognitive (retrieval practice).
 *
 * Le mode est désactivable par le prof via Chapter.practiceMode.enabled.
 */
export default function ChapterPractice() {
  const { id: chapterId } = useParams();
  const navigate = useNavigate();

  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [currentIdx, setIdx]    = useState(0);
  const [answers, setAnswers]   = useState({}); // { questionId: { selected, correct } }
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    api.get(`/chapters/${chapterId}/practice`)
      .then(({ data }) => {
        setData(data);
        setIdx(0);
        setAnswers({});
        setRevealed(false);
        setFinished(false);
      })
      .catch((err) => setError(err.response?.data?.message || 'Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [chapterId]);

  const handleAnswer = (q, optIndex) => {
    if (revealed) return;
    const correct = optIndex === q.correctAnswer;
    setAnswers((a) => ({ ...a, [q._id]: { selected: optIndex, correct } }));
    setRevealed(true);
  };

  const next = () => {
    if (!data) return;
    if (currentIdx + 1 >= data.questions.length) {
      setFinished(true);
    } else {
      setIdx(currentIdx + 1);
      setRevealed(false);
    }
  };

  if (loading) {
    return <Layout title="Entraînement"><div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Chargement…</div></Layout>;
  }

  if (error || !data) {
    return (
      <Layout title="Entraînement">
        <div style={{ maxWidth: 540, margin: '40px auto', padding: 24, background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12, textAlign: 'center' }}>
          <AlertCircle size={32} color="#DC2626" style={{ marginBottom: 8 }} />
          <p style={{ margin: 0, fontSize: 14, color: '#991B1B' }}>{error || 'Données indisponibles.'}</p>
          <button type="button" onClick={() => navigate(-1)} style={{ marginTop: 16, padding: '8px 14px', background: 'white', border: '1px solid #FCA5A5', borderRadius: 8, color: '#991B1B', cursor: 'pointer', fontWeight: 600 }}>
            Retour
          </button>
        </div>
      </Layout>
    );
  }

  // ─── Écran de fin : récap ─────────────────────────────────────────────
  if (finished) {
    const correct = Object.values(answers).filter(a => a.correct).length;
    const total = data.questions.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const palette = pct >= 80
      ? { bg: '#F0FDF4', border: '#BBF7D0', accent: '#15803D', label: 'Excellent !' }
      : pct >= 60
        ? { bg: '#EFF6FF', border: '#BFDBFE', accent: '#1B4F72', label: 'Bon score' }
        : pct >= 40
          ? { bg: '#FEF3C7', border: '#FDE68A', accent: '#B45309', label: 'À retravailler' }
          : { bg: '#FEF2F2', border: '#FCA5A5', accent: '#B91C1C', label: 'Reprends les vidéos' };

    return (
      <Layout title="Entraînement terminé">
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>
          <div style={{
            background: palette.bg,
            border: `2px solid ${palette.border}`,
            borderRadius: 16,
            padding: 32,
            textAlign: 'center',
          }}>
            <Sparkles size={42} color={palette.accent} style={{ marginBottom: 8 }} />
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: palette.accent }}>
              {palette.label}
            </h1>
            <p style={{ margin: '8px 0 16px', fontSize: 38, fontWeight: 800, color: palette.accent }}>
              {correct}/{total}
            </p>
            <p style={{ margin: '0 auto 20px', fontSize: 14, color: '#475569', maxWidth: 440, lineHeight: 1.6 }}>
              {pct >= 80
                ? 'Tu maîtrises bien ce chapitre. Tu peux passer au suivant.'
                : pct >= 60
                  ? 'Tu as les bases. Quelques notions à consolider.'
                  : pct >= 40
                    ? 'Reprends les vidéos clés et refais l\'exercice.'
                    : 'Il vaut mieux revoir le chapitre depuis le début.'}
            </p>
            <p style={{ margin: '0 0 16px', fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>
              Cet entraînement n'est pas noté — c'est de la préparation active
              (Roediger &amp; Karpicke 2006).
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" onClick={load} style={{
                padding: '10px 18px', background: palette.accent,
                color: 'white', border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <RefreshCw size={14} /> Refaire un autre tirage
              </button>
              <button type="button" onClick={() => navigate(-1)} style={{
                padding: '10px 18px', background: 'white',
                color: palette.accent, border: `1px solid ${palette.border}`, borderRadius: 10,
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <ArrowLeft size={14} /> Retour au module
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ─── Question courante ───────────────────────────────────────────────
  const q = data.questions[currentIdx];
  const myAnswer = answers[q._id];

  return (
    <Layout title="Entraînement chapitre">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
          border: '1px solid #C4B5FD',
          borderRadius: 14, padding: 20, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Sparkles size={18} color="#9333EA" />
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#7C3AED', letterSpacing: 0.5 }}>
              MODE ENTRAÎNEMENT — NON NOTÉ
            </p>
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1B4F72' }}>
            {data.chapter.titre}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>
            Question {currentIdx + 1} / {data.questions.length}
            {' · '}
            <span style={{ color: '#9333EA' }}>{data.questions.length} questions tirées sur {data.pool} disponibles</span>
          </p>

          {/* Barre progression */}
          <div style={{ marginTop: 10, height: 6, background: 'white', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${((currentIdx + (revealed ? 1 : 0)) / data.questions.length) * 100}%`,
              height: '100%', background: 'linear-gradient(90deg, #9333EA, #C084FC)',
              transition: 'width 300ms ease',
            }} />
          </div>
        </div>

        {/* Carte question */}
        <div style={{
          background: 'white', border: '1px solid #E2E8F0',
          borderRadius: 14, padding: 22, marginBottom: 16,
        }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>
            <BookOpen size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Issu de : {q.videoTitle || '—'}
          </p>
          <h2 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700, color: '#1B4F72', lineHeight: 1.5 }}>
            {q.texte}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {q.options.map((opt, i) => {
              const isSelected = myAnswer?.selected === i;
              const isCorrect = i === q.correctAnswer;
              let style = {
                padding: '10px 14px',
                border: '2px solid #E2E8F0',
                borderRadius: 10,
                background: 'white',
                cursor: revealed ? 'default' : 'pointer',
                fontSize: 14, color: '#1B4F72',
                textAlign: 'left',
                transition: 'all 150ms',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 10,
              };
              if (revealed) {
                if (isCorrect) style = { ...style, border: '2px solid #15803D', background: '#F0FDF4' };
                else if (isSelected) style = { ...style, border: '2px solid #DC2626', background: '#FEF2F2' };
                else style = { ...style, opacity: 0.6 };
              } else if (isSelected) {
                style = { ...style, border: '2px solid #1B4F72', background: '#EFF6FF' };
              }
              return (
                <button key={i} type="button" disabled={revealed} onClick={() => handleAnswer(q, i)} style={style}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: '#F1F5F9', display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: '#64748B', flexShrink: 0,
                  }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ flex: 1 }}>{opt}</span>
                  {revealed && isCorrect && <CheckCircle2 size={16} color="#15803D" />}
                  {revealed && isSelected && !isCorrect && <XCircle size={16} color="#DC2626" />}
                </button>
              );
            })}
          </div>

          {/* Explication après réponse */}
          {revealed && q.explanation && (
            <div style={{
              marginTop: 14, padding: 12,
              background: myAnswer?.correct ? '#F0FDF4' : '#FEF3C7',
              border: `1px solid ${myAnswer?.correct ? '#BBF7D0' : '#FDE68A'}`,
              borderRadius: 8,
              fontSize: 13, color: myAnswer?.correct ? '#15803D' : '#92400E',
              lineHeight: 1.5,
            }}>
              <strong>{myAnswer?.correct ? '✅ Bonne réponse' : '💡 Explication'} :</strong> {q.explanation}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" onClick={() => navigate(-1)} style={{
            padding: '8px 14px', background: 'white', color: '#64748B',
            border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <ArrowLeft size={14} /> Quitter
          </button>
          <button
            type="button"
            disabled={!revealed}
            onClick={next}
            style={{
              padding: '10px 20px',
              background: revealed ? 'linear-gradient(135deg, #9333EA, #C084FC)' : '#E2E8F0',
              color: revealed ? 'white' : '#94A3B8',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
              cursor: revealed ? 'pointer' : 'not-allowed',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            {currentIdx + 1 >= data.questions.length ? 'Voir le résultat' : 'Question suivante'}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </Layout>
  );
}
