import { useEffect, useState } from 'react';
import api from '../utils/api.js';
import { CheckCircle, XCircle, Play, AlertCircle } from 'lucide-react';

/**
 * InVideoQuestionOverlay — modal centré qui apparaît à un timestamp donné
 * pendant le visionnage de la vidéo. L'étudiant doit répondre pour pouvoir
 * reprendre la lecture (cf. modèle EdPuzzle / classe inversée Type 2).
 *
 * Cycle :
 *   1. Affichage de la question + 4 options.
 *   2. L'étudiant clique → POST /api/video-questions/:id/answer.
 *   3. Affichage du feedback (correct/incorrect + explanation).
 *   4. Bouton "Continuer la vidéo" — onContinue() relance le player.
 *
 * Si la question a déjà été répondue (props.previousAnswer fourni), on
 * passe directement à l'étape 3 — pas de re-soumission possible (modèle
 * ConcepTest, Mazur 1997).
 */
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function InVideoQuestionOverlay({ question, onContinue }) {
  const previous = question.previousAnswer || null;

  const [selected,  setSelected]  = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error,     setError]     = useState('');
  const [result,    setResult]    = useState(previous);  // { answer, isCorrect, correctAnswer, explanation }
  const [startedAt] = useState(() => Date.now());

  // Si la question change, réinitialiser l'état (cas où plusieurs questions
  // s'enchaînent sur la même page sans démontage de l'overlay).
  useEffect(() => {
    setSelected(null);
    setError('');
    setResult(question.previousAnswer || null);
  }, [question._id, question.previousAnswer]);

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post(`/video-questions/${question._id}/answer`, {
        answer: selected,
        timeTaken: Date.now() - startedAt,
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erreur lors de la soumission.');
    } finally {
      setSubmitting(false);
    }
  };

  const showResult = !!result;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: 16,
      }}
    >
      <div
        className="card"
        style={{
          width: '100%', maxWidth: 540,
          padding: 28,
          background: 'var(--color-surface)',
          borderRadius: 14,
          boxShadow: '0 20px 50px rgba(0,0,0,.3)',
        }}
      >
        {/* En-tête */}
        <div style={{ marginBottom: 18 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
            color: 'var(--color-primary)', margin: 0, marginBottom: 6,
          }}>
            Question interactive · {fmtTimestamp(question.timestamp)}
          </p>
          <h3 style={{
            fontSize: 'var(--font-size-md)', fontWeight: 700,
            color: 'var(--color-text)', margin: 0, lineHeight: 1.4,
          }}>
            {question.texte}
          </h3>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {OPTION_LABELS.map(opt => {
            const isSelected   = selected === opt;
            const isCorrect    = showResult && result.correctAnswer === opt;
            const isMyWrong    = showResult && result.answer === opt && !result.isCorrect;
            const disabled     = showResult || submitting;

            let borderColor = 'var(--color-border)';
            let bg          = 'var(--color-surface)';
            if (showResult) {
              if (isCorrect)         { borderColor = '#16A34A'; bg = '#F0FDF4'; }
              else if (isMyWrong)    { borderColor = '#DC2626'; bg = '#FEF2F2'; }
            } else if (isSelected)   { borderColor = 'var(--color-primary)'; bg = 'var(--color-primary-light)'; }

            return (
              <button
                key={opt}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setSelected(opt)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px',
                  border: `1.5px solid ${borderColor}`,
                  background: bg,
                  borderRadius: 10,
                  cursor: disabled ? 'default' : 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 120ms, background 120ms',
                }}
              >
                <span style={{
                  width: 26, height: 26, flexShrink: 0,
                  borderRadius: '50%',
                  background: isSelected && !showResult ? 'var(--color-primary)'
                            : isCorrect                  ? '#16A34A'
                            : isMyWrong                   ? '#DC2626'
                            : 'var(--color-bg)',
                  border: `1px solid ${borderColor}`,
                  color: (isSelected && !showResult) || isCorrect || isMyWrong ? '#fff' : 'var(--color-text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 12,
                }}>
                  {opt}
                </span>
                <span style={{
                  flex: 1,
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text)',
                  lineHeight: 1.5,
                }}>
                  {question.options[opt]}
                </span>
                {showResult && isCorrect    && <CheckCircle size={16} color="#16A34A" />}
                {showResult && isMyWrong    && <XCircle    size={16} color="#DC2626" />}
              </button>
            );
          })}
        </div>

        {/* Erreur de soumission */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Feedback résultat */}
        {showResult && (
          <div style={{
            padding: '12px 14px',
            background: result.isCorrect ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${result.isCorrect ? '#BBF7D0' : '#FECACA'}`,
            borderRadius: 10, marginBottom: 14,
          }}>
            <p style={{
              margin: 0, fontSize: 13, fontWeight: 700,
              color: result.isCorrect ? '#15803D' : '#991B1B',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {result.isCorrect
                ? <><CheckCircle size={14} /> Bonne réponse</>
                : <><XCircle    size={14} /> Réponse incorrecte</>
              }
            </p>
            {result.explanation && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-text)', lineHeight: 1.5 }}>
                {result.explanation}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {!showResult ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!selected || submitting}
              onClick={submit}
              style={{ opacity: !selected || submitting ? 0.55 : 1 }}
            >
              {submitting ? 'Envoi…' : 'Valider'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onContinue}
            >
              <Play size={14} /> Continuer la vidéo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function fmtTimestamp(s) {
  const sec = Math.floor(s ?? 0);
  const m = Math.floor(sec / 60);
  const r = String(sec % 60).padStart(2, '0');
  return `${m}:${r}`;
}
