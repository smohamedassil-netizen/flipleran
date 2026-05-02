import { useEffect, useState } from 'react';
import api from '../utils/api.js';
import {
  HelpCircle, CheckCircle2, XCircle, Clock, MessageSquare,
} from 'lucide-react';

/**
 * InlineQuestionsList — affiche les questions inline d'une vidéo dans un
 * panneau dépliable. L'étudiant peut cliquer sur une question pour y
 * répondre directement (feedback immédiat).
 *
 * Pédagogie : retrieval practice (Roediger & Karpicke 2006) — l'étudiant
 * récupère activement l'information juste vue, ce qui consolide la mémoire
 * 3× mieux qu'une simple relecture.
 *
 * Format API (videoQuestionController) :
 *   - options : { A, B, C, D } (objet, pas array)
 *   - correctAnswer : 'A' | 'B' | 'C' | 'D'
 *   - previousAnswer : null OU { answer, isCorrect, correctAnswer, explanation }
 */
const LETTERS = ['A', 'B', 'C', 'D'];

export default function InlineQuestionsList({ videoId }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [openId, setOpenId]       = useState(null);
  const [answers, setAnswers]     = useState({}); // { questionId: { answer, isCorrect, correctAnswer, explanation } }

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    setLoading(true);
    api.get(`/video-questions/video/${videoId}`)
      .then(({ data }) => { if (!cancelled) setQuestions(Array.isArray(data) ? data : []); })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [videoId]);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const seekTo = (timestamp) => {
    const videoEl = document.querySelector('video');
    if (videoEl) {
      videoEl.currentTime = timestamp;
      videoEl.play().catch(() => {});
    }
  };

  const submitAnswer = async (q, letter) => {
    if (answers[q._id] || q.previousAnswer) return; // déjà répondu
    try {
      const { data } = await api.post(`/video-questions/${q._id}/answer`, { answer: letter });
      setAnswers((a) => ({
        ...a,
        [q._id]: {
          answer: data.answer,
          isCorrect: data.isCorrect,
          correctAnswer: data.correctAnswer,
          explanation: data.explanation,
        },
      }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de la soumission';
      alert(msg);
    }
  };

  if (loading) return null;
  if (questions.length === 0) return null;

  return (
    <div className="card" style={{ padding: 16, marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <HelpCircle size={18} color="#9333EA" />
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1B4F72' }}>
          Questions actives ({questions.length})
        </h3>
        <span style={{ fontSize: 11, color: '#9333EA', fontWeight: 600, marginLeft: 'auto' }}>
          Test-enhanced learning
        </span>
      </div>

      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
        Réponds aux questions ci-dessous pendant ou après la vidéo. Clique sur l'horloge
        pour aller au moment correspondant. Chaque bonne réponse consolide ta mémoire
        à long terme (Roediger &amp; Karpicke 2006).
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {questions.map((q, idx) => {
          const isOpen = openId === q._id;
          const finalAnswer = answers[q._id] || q.previousAnswer;
          const isAnswered = !!finalAnswer;

          return (
            <div key={q._id} style={{
              border: '1px solid ' + (isAnswered ? (finalAnswer.isCorrect ? '#BBF7D0' : '#FCA5A5') : '#E2E8F0'),
              borderRadius: 10,
              background: isAnswered ? (finalAnswer.isCorrect ? '#F0FDF4' : '#FEF2F2') : 'white',
              overflow: 'hidden',
            }}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : q._id)}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: '#F1F5F9',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#64748B', flexShrink: 0,
                }}>
                  {idx + 1}
                </span>
                <span style={{ flex: 1, fontSize: 13, color: '#1B4F72', fontWeight: 500, lineHeight: 1.4 }}>
                  {q.texte}
                </span>
                {q.timestamp !== undefined && q.timestamp !== null && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); seekTo(q.timestamp); }}
                    style={{
                      padding: '2px 8px', background: 'white',
                      border: '1px solid #BFDBFE', borderRadius: 999,
                      fontSize: 10, color: '#1E40AF', fontWeight: 600,
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3,
                      flexShrink: 0,
                    }}
                    title="Aller au moment de la vidéo"
                  >
                    <Clock size={10} /> {fmt(q.timestamp)}
                  </button>
                )}
                {isAnswered && (
                  finalAnswer.isCorrect
                    ? <CheckCircle2 size={16} color="#15803D" />
                    : <XCircle size={16} color="#DC2626" />
                )}
              </button>

              {isOpen && (
                <div style={{ padding: '0 12px 12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {LETTERS.map((letter) => {
                      const optText = q.options?.[letter];
                      if (!optText) return null;
                      const sel = finalAnswer?.answer === letter;
                      const isCorrect = finalAnswer?.correctAnswer === letter;
                      let bg = 'white', border = '#E2E8F0', color = '#1B4F72';
                      if (isAnswered) {
                        if (isCorrect) { bg = '#F0FDF4'; border = '#BBF7D0'; color = '#15803D'; }
                        else if (sel)  { bg = '#FEF2F2'; border = '#FCA5A5'; color = '#B91C1C'; }
                      } else if (sel) {
                        bg = '#EFF6FF'; border = '#BFDBFE'; color = '#1E40AF';
                      }
                      return (
                        <button
                          key={letter}
                          type="button"
                          disabled={isAnswered}
                          onClick={() => submitAnswer(q, letter)}
                          style={{
                            padding: '8px 10px',
                            background: bg, border: `1px solid ${border}`, borderRadius: 8,
                            fontSize: 13, color, textAlign: 'left',
                            cursor: isAnswered ? 'default' : 'pointer',
                            fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', gap: 8,
                          }}
                        >
                          <span style={{ fontWeight: 700, opacity: 0.6 }}>{letter}.</span>
                          <span style={{ flex: 1 }}>{optText}</span>
                          {isAnswered && isCorrect && <CheckCircle2 size={14} color="#15803D" />}
                          {isAnswered && sel && !isCorrect && <XCircle size={14} color="#DC2626" />}
                        </button>
                      );
                    })}
                  </div>

                  {isAnswered && finalAnswer.explanation && (
                    <div style={{
                      marginTop: 10, padding: 10,
                      background: 'white', border: '1px solid #E2E8F0', borderRadius: 8,
                      fontSize: 12, color: '#475569', lineHeight: 1.5,
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                    }}>
                      <MessageSquare size={13} color="#9333EA" style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{finalAnswer.explanation}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
