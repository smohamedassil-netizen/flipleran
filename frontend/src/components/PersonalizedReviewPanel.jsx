import { useEffect, useState } from 'react';
import api from '../utils/api.js';
import {
  AlertTriangle, BookOpen, BrainCircuit, CheckCircle2, Loader2,
  Sparkles, Target, TrendingDown, X,
} from 'lucide-react';

const RISK_STYLE = {
  'critique': { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: AlertTriangle },
  'élevé':    { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', icon: TrendingDown },
  'modéré':   { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: Target },
  'faible':   { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: CheckCircle2 },
  'inconnu':  { color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0', icon: BrainCircuit },
};

function RiskCard({ prediction, motivation }) {
  const level = prediction?.dropout_risk_level || 'inconnu';
  const style = RISK_STYLE[level];
  const Icon = style.icon;

  return (
    <div style={{
      background: style.bg, border: `1px solid ${style.border}`,
      borderRadius: 12, padding: 18, display: 'flex', gap: 14, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 10, background: style.color + '1A',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={22} color={style.color} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
          <strong style={{ color: style.color, fontSize: 15, textTransform: 'capitalize' }}>
            Niveau : {level}
          </strong>
          {prediction?.predicted_score != null && (
            <span style={{ fontSize: 13, color: '#334155' }}>
              Score prédit : <strong>{prediction.predicted_score}/100</strong>
            </span>
          )}
          {prediction?.dropout_probability != null && (
            <span style={{ fontSize: 13, color: '#334155' }}>
              Proba de décrochage : <strong>{Math.round(prediction.dropout_probability * 100)}%</strong>
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.5 }}>{motivation}</p>
      </div>
    </div>
  );
}

function WeakVideoCard({ video, index }) {
  const hasScore = video.avgScore != null;
  return (
    <div style={{
      background: 'white', border: '1px solid #e2e8f0', borderRadius: 10,
      padding: 14, display: 'flex', gap: 12, alignItems: 'center',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: '#1B4F72',
        color: 'white', fontWeight: 700, fontSize: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {video.title}
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          {hasScore
            ? `Score actuel : ${video.avgScore}/100 · ${video.attempts} tentative(s)`
            : 'Pas encore tenté'}
        </div>
      </div>
      {hasScore && (
        <div style={{
          padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
          background: video.avgScore < 40 ? '#fef2f2' : video.avgScore < 60 ? '#fffbeb' : '#f0fdf4',
          color: video.avgScore < 40 ? '#dc2626' : video.avgScore < 60 ? '#f59e0b' : '#16a34a',
        }}>
          {video.avgScore}
        </div>
      )}
    </div>
  );
}

function QcmPreview({ questions }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [revealed, setRevealed] = useState(false);

  if (!questions || questions.length === 0) {
    return (
      <div style={{ padding: 16, background: '#f1f5f9', borderRadius: 10, fontSize: 14, color: '#64748b', textAlign: 'center' }}>
        Aucun QCM généré pour cette session — le service Groq était peut-être indisponible.
      </div>
    );
  }

  const q = questions[activeIdx];
  const correct = q.correctAnswer;

  const letterColor = (letter) => {
    if (!revealed) return chosen === letter ? '#1B4F72' : '#cbd5e1';
    if (letter === correct) return '#16a34a';
    if (letter === chosen && chosen !== correct) return '#dc2626';
    return '#cbd5e1';
  };

  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 10, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => { setActiveIdx(i); setChosen(null); setRevealed(false); }}
            style={{
              width: 32, height: 32, borderRadius: 8, border: 'none',
              background: i === activeIdx ? '#1B4F72' : 'white',
              color: i === activeIdx ? 'white' : '#64748b',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div style={{ padding: 18 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 14 }}>
          {q.texte}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['A', 'B', 'C', 'D'].map((letter) => (
            <button
              key={letter}
              disabled={revealed}
              onClick={() => setChosen(letter)}
              style={{
                textAlign: 'left', padding: '10px 14px', borderRadius: 8,
                border: `2px solid ${letterColor(letter)}`,
                background: chosen === letter && !revealed ? '#e0ecff' : 'white',
                color: '#0f172a', fontSize: 14, cursor: revealed ? 'default' : 'pointer',
                display: 'flex', gap: 10, alignItems: 'center',
              }}
            >
              <strong style={{ color: letterColor(letter) }}>{letter}.</strong>
              <span>{q.options?.[letter]}</span>
            </button>
          ))}
        </div>

        {!revealed ? (
          <button
            disabled={!chosen}
            onClick={() => setRevealed(true)}
            style={{
              marginTop: 14, padding: '10px 18px', borderRadius: 8, border: 'none',
              background: chosen ? '#1B4F72' : '#cbd5e1', color: 'white',
              fontWeight: 600, fontSize: 14, cursor: chosen ? 'pointer' : 'not-allowed',
            }}
          >
            Vérifier ma réponse
          </button>
        ) : (
          <div style={{
            marginTop: 14, padding: 12, borderRadius: 8,
            background: chosen === correct ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${chosen === correct ? '#bbf7d0' : '#fecaca'}`,
          }}>
            <strong style={{ color: chosen === correct ? '#16a34a' : '#dc2626', fontSize: 14 }}>
              {chosen === correct ? '✓ Bonne réponse !' : `✗ La bonne réponse était ${correct}`}
            </strong>
            {q.explanation && (
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                {q.explanation}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PersonalizedReviewPanel({ courseId, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !courseId) return;
    setLoading(true);
    setError('');
    setData(null);
    api.get(`/ai/personalized-review/${courseId}`)
      .then(({ data }) => setData(data))
      .catch((err) => setError(err?.response?.data?.message || 'Impossible de générer le plan.'))
      .finally(() => setLoading(false));
  }, [open, courseId]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', zIndex: 1000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 16px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#f8fafc', borderRadius: 18, width: '100%', maxWidth: 760,
          boxShadow: '0 30px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px', background: 'linear-gradient(135deg, #1B4F72, #7c3aed)',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrainCircuit size={24} />
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Plan de rattrapage personnalisé</h3>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.85 }}>
                Généré par nos modèles IA (TensorFlow + Groq) selon ton profil
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'white',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={28} className="spin" style={{ marginBottom: 10 }} />
              <p style={{ margin: 0, fontSize: 14 }}>
                Analyse de ton profil et génération du plan...
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                (Cela peut prendre jusqu'à 10 secondes)
              </p>
            </div>
          )}

          {error && (
            <div style={{
              padding: 14, background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center', color: '#dc2626',
            }}>
              <AlertTriangle size={18} />
              <span style={{ fontSize: 14 }}>{error}</span>
            </div>
          )}

          {data && (
            <>
              <RiskCard prediction={data.prediction} motivation={data.motivation} />

              {data.weakVideos && data.weakVideos.length > 0 && (
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <BookOpen size={16} color="#1B4F72" />
                    Chapitres à revoir en priorité
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {data.weakVideos.map((v, i) => <WeakVideoCard key={v.videoId} video={v} index={i} />)}
                  </div>
                </div>
              )}

              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Sparkles size={16} color="#7c3aed" />
                  Exercices générés pour toi
                  {data.generatedQcm?.length > 0 && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: '#7c3aed',
                      background: '#ede9fe', padding: '2px 8px', borderRadius: 999,
                    }}>
                      {data.generatedQcm.length} question{data.generatedQcm.length > 1 ? 's' : ''}
                    </span>
                  )}
                </h4>
                <QcmPreview questions={data.generatedQcm} />
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
