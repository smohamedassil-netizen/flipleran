import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api.js';
import {
  CheckCircle, XCircle, Clock, ChevronRight,
  Award, RotateCcw, AlertCircle,
} from 'lucide-react';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

/* ─── Option button ──────────────────────────────────────────────────────── */
function OptionBtn({ label, text, selected, disabled, onClick, isMultiple }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '13px 16px',
        backgroundColor: selected ? 'var(--color-primary-light)' : 'var(--color-surface)',
        border: `1.5px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left',
        transition: 'border-color 120ms, background-color 120ms, transform 80ms',
        transform: selected ? 'scale(1.01)' : 'scale(1)',
      }}
    >
      <span
        style={{
          width: 26, height: 26, flexShrink: 0,
          borderRadius: isMultiple ? 'var(--radius-sm)' : '50%',
          backgroundColor: selected ? 'var(--color-primary)' : 'var(--color-bg)',
          border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 'var(--font-size-xs)',
          color: selected ? '#fff' : 'var(--color-text-secondary)',
          transition: 'background-color 120ms',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: selected ? 600 : 400,
          color: selected ? 'var(--color-primary)' : 'var(--color-text)',
          lineHeight: 1.5,
          paddingTop: 2,
        }}
      >
        {text}
      </span>
    </button>
  );
}

/* ─── Review option ───────────────────────────────────────────────────── */
function ReviewOption({ label, text, isCorrect, isGiven }) {
  const highlight =
    isCorrect ? 'var(--color-primary)'
    : isGiven  ? 'var(--color-error)'
    : 'var(--color-border)';

  const bg =
    isCorrect ? 'var(--color-primary-light)'
    : isGiven  ? 'var(--color-error-bg)'
    : 'var(--color-surface)';

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '11px 14px',
        backgroundColor: bg,
        border: `1.5px solid ${highlight}`,
        borderRadius: 'var(--radius-md)',
        opacity: (!isCorrect && !isGiven) ? 0.5 : 1,
      }}
    >
      <span
        style={{
          width: 24, height: 24, flexShrink: 0,
          borderRadius: 'var(--radius-sm)',
          backgroundColor: highlight,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 'var(--font-size-xs)', color: '#fff',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', flex: 1, paddingTop: 2, lineHeight: 1.5 }}>
        {text}
      </span>
      {isCorrect && <CheckCircle size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} />}
      {isGiven && !isCorrect && <XCircle size={16} color="var(--color-error)" style={{ flexShrink: 0, marginTop: 2 }} />}
    </div>
  );
}

/* ─── Timer bar ──────────────────────────────────────────────────────── */
function TimerBar({ seconds, total, urgent }) {
  const pct = (seconds / total) * 100;
  return (
    <div style={{ height: 5, backgroundColor: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          backgroundColor: urgent ? 'var(--color-error)' : 'var(--color-primary)',
          borderRadius: 3,
          transition: 'width 1s linear, background-color 300ms',
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   QCMPlayer
═══════════════════════════════════════════════════════════════════════════ */
export default function QCMPlayer({ qcm, onFinish }) {
  const TIMER_TOTAL = qcm.timerSeconds ?? 30;

  const [phase,         setPhase]         = useState('playing');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers,       setAnswers]       = useState([]);
  const [selected,      setSelected]      = useState(null);     // string for single
  const [multiSelected, setMultiSelected] = useState([]);       // array for multiple
  const [timeLeft,      setTimeLeft]      = useState(TIMER_TOTAL);
  const [animKey,       setAnimKey]       = useState(0);
  const [shake,         setShake]         = useState(false);
  const [result,        setResult]        = useState(null);
  const [error,         setError]         = useState('');

  const timerRef = useRef(null);

  const currentQuestion = qcm.questions[questionIndex];
  const isLast          = questionIndex === qcm.questions.length - 1;
  const isMultiple      = currentQuestion?.questionType === 'multiple';

  /* ── Timer countdown ──────────────────────────────────────────────── */
  const advanceQuestion = useCallback((timedOut = false) => {
    clearInterval(timerRef.current);
    const entry = isMultiple
      ? { questionId: currentQuestion._id, answer: null, answers: timedOut ? [] : multiSelected, timedOut }
      : { questionId: currentQuestion._id, answer: timedOut ? null : selected, answers: [], timedOut };

    if (isLast) {
      setAnswers((prev) => {
        const final = [...prev, entry];
        submitAnswers(final);
        return final;
      });
    } else {
      setAnswers((prev) => [...prev, entry]);
      setSelected(null);
      setMultiSelected([]);
      setTimeLeft(TIMER_TOTAL);
      setAnimKey((k) => k + 1);
      setQuestionIndex((i) => i + 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, selected, multiSelected, isLast, isMultiple]);

  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setShake(true);
          setTimeout(() => setShake(false), 500);
          setTimeout(() => advanceQuestion(true), 400);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, questionIndex, advanceQuestion]);

  /* ── Handle option select ───────────────────────────────────────── */
  const handleSelect = (opt) => {
    if (phase !== 'playing') return;
    if (isMultiple) {
      setMultiSelected((prev) =>
        prev.includes(opt) ? prev.filter((a) => a !== opt) : [...prev, opt]
      );
    } else {
      setSelected(opt);
    }
  };

  /* ── Handle next / submit ───────────────────────────────────────── */
  const handleNext = () => {
    const hasAnswer = isMultiple ? multiSelected.length > 0 : !!selected;
    if (!hasAnswer) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    advanceQuestion(false);
  };

  /* ── Submit to API ──────────────────────────────────────────────── */
  const submitAnswers = async (finalAnswers) => {
    setPhase('submitting');
    try {
      const { data } = await api.post('/qcm/submit', {
        qcmId:   qcm._id,
        answers: finalAnswers,
      });
      setResult(data);
      setPhase('result');
      if (onFinish) onFinish(data);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erreur lors de la soumission.');
      setPhase('playing');
    }
  };

  /* ── PHASE: submitting ──────────────────────────────────────────── */
  if (phase === 'submitting') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 16 }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Correction en cours...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  /* ── PHASE: result ──────────────────────────────────────────────── */
  if (phase === 'result' && result) {
    const pct     = result.score;
    const passed  = pct >= 50;
    const perfect = pct === 100;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Score card */}
        <div className="card pop-in" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <div
            style={{
              width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px',
              border: `5px solid ${passed ? 'var(--color-primary)' : 'var(--color-error)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: passed ? 'var(--color-primary)' : 'var(--color-error)' }}>
              {pct}%
            </span>
          </div>

          <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
            {perfect ? 'Parfait !' : passed ? 'Bien joué !' : 'Continuez vos efforts'}
          </p>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 20 }}>
            {result.correctCount} bonne{result.correctCount > 1 ? 's' : ''} réponse{result.correctCount > 1 ? 's' : ''} sur {result.total}
          </p>

          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              backgroundColor: 'var(--color-accent-light)',
              border: '1px solid rgba(232,168,56,.25)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 14px',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 700,
              color: 'var(--color-accent-hover)',
            }}
          >
            <Award size={16} />
            +{result.pointsEarned} points gagnés
          </div>
        </div>

        {/* Detailed review */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--color-text)' }}>
            Correction détaillée
          </h3>
          {result.review.map((q, idx) => {
            const correctSet  = new Set(q.correctAnswers ?? [q.correctAnswer]);
            const givenSet    = new Set(q.givenAnswers?.length ? q.givenAnswers : (q.givenAnswer ? [q.givenAnswer] : []));
            const qType       = q.questionType ?? 'single';

            return (
              <div
                key={q._id}
                className="card qcm-reveal"
                style={{ animationDelay: `${idx * 60}ms`, padding: '18px 20px' }}
              >
                {/* Question header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                  <div
                    style={{
                      width: 24, height: 24, flexShrink: 0, borderRadius: 'var(--radius-sm)',
                      backgroundColor: q.correct ? 'var(--color-primary-light)' : q.timedOut ? 'var(--color-warning-bg)' : 'var(--color-error-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {q.correct
                      ? <CheckCircle size={14} color="var(--color-primary)" />
                      : q.timedOut
                        ? <Clock size={14} color="var(--color-warning)" />
                        : <XCircle size={14} color="var(--color-error)" />
                    }
                  </div>
                  <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', lineHeight: 1.5, flex: 1 }}>
                    {idx + 1}. {q.texte}
                  </p>
                  {qType === 'multiple' && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: '#EBF3FA', color: '#1B4F72', flexShrink: 0 }}>
                      Multiple
                    </span>
                  )}
                  {q.timedOut && (
                    <span className="badge badge-warning" style={{ flexShrink: 0 }}>Temps</span>
                  )}
                </div>

                {/* Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: q.explanation ? 14 : 0 }}>
                  {OPTION_LABELS.map((opt) => (
                    <ReviewOption
                      key={opt}
                      label={opt}
                      text={q.options[opt]}
                      isCorrect={correctSet.has(opt)}
                      isGiven={givenSet.has(opt) && !correctSet.has(opt)}
                    />
                  ))}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div
                    style={{
                      backgroundColor: 'var(--color-primary-light)',
                      borderLeft: '3px solid var(--color-primary)',
                      borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                      padding: '10px 14px',
                      marginTop: 10,
                    }}
                  >
                    <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Explication
                    </p>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', lineHeight: 1.6 }}>
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setPhase('playing');
              setQuestionIndex(0);
              setAnswers([]);
              setSelected(null);
              setMultiSelected([]);
              setTimeLeft(TIMER_TOTAL);
              setAnimKey((k) => k + 1);
              setResult(null);
            }}
            title="Refaire le QCM en mode entraînement (le score ne sera pas comptabilisé une 2e fois)"
          >
            <RotateCcw size={14} /> S'entraîner sur ces questions
          </button>
          <p style={{ fontSize: 11, color: 'var(--color-text-disabled)', textAlign: 'center', maxWidth: 380, margin: 0 }}>
            Seul votre <strong>premier essai</strong> compte pour les points et le classement.
            Refaire le QCM permet juste de réviser.
          </p>
        </div>
      </div>
    );
  }

  /* ── PHASE: playing ─────────────────────────────────────────────── */
  const urgent    = timeLeft <= 10;
  const hasAnswer = isMultiple ? multiSelected.length > 0 : !!selected;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Question {questionIndex + 1} / {qcm.questions.length}
            </span>
            {isMultiple && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: '#EBF3FA', color: '#1B4F72' }}>
                Choix multiple
              </span>
            )}
          </div>
          <span
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 'var(--font-size-sm)', fontWeight: 700,
              color: urgent ? 'var(--color-error)' : 'var(--color-text-secondary)',
              transition: 'color 300ms',
            }}
          >
            <Clock size={14} />
            {timeLeft}s
          </span>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {qcm.questions.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1, height: 4, borderRadius: 2,
                backgroundColor: i < questionIndex
                  ? 'var(--color-primary)'
                  : i === questionIndex
                    ? urgent ? 'var(--color-error)' : 'var(--color-accent)'
                    : 'var(--color-border)',
                transition: 'background-color 300ms',
              }}
            />
          ))}
        </div>

        <TimerBar seconds={timeLeft} total={TIMER_TOTAL} urgent={urgent} />
      </div>

      {/* Question card */}
      <div
        key={animKey}
        className={`card qcm-enter ${shake ? 'shake' : ''}`}
        style={{ padding: '24px 22px' }}
      >
        <p style={{
          fontSize: 'var(--font-size-md)',
          fontWeight: 600,
          color: 'var(--color-text)',
          lineHeight: 1.6,
          marginBottom: 20,
        }}>
          {currentQuestion.texte}
        </p>

        {isMultiple && (
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 12 }}>
            Plusieurs réponses possibles — cochez toutes les bonnes réponses.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {OPTION_LABELS.map((opt) => (
            <OptionBtn
              key={opt}
              label={opt}
              text={currentQuestion.options[opt]}
              selected={isMultiple ? multiSelected.includes(opt) : selected === opt}
              disabled={false}
              isMultiple={isMultiple}
              onClick={() => handleSelect(opt)}
            />
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary"
          onClick={handleNext}
          style={{ minWidth: 160, justifyContent: 'center' }}
        >
          {isLast ? 'Terminer le QCM' : 'Question suivante'}
          <ChevronRight size={15} />
        </button>
      </div>

      {!hasAnswer && (
        <p style={{ textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)' }}>
          Sélectionnez {isMultiple ? 'au moins une réponse' : 'une réponse'} avant de continuer
        </p>
      )}
    </div>
  );
}
