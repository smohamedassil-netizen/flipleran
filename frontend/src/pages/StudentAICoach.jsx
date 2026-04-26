import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  ArrowLeft, BookOpen, BrainCircuit, CheckCircle2, ChevronRight,
  Home, Loader2, PlayCircle, RefreshCw, Sparkles, Target,
  TrendingUp, AlertTriangle, Zap, Calendar,
} from 'lucide-react';

/* ─── Couleurs & styles selon niveau de risque ─────────────────────────── */
const LEVEL_STYLE = {
  'faible':   { color: '#16a34a', bg: '#f0fdf4', accent: '#bbf7d0', emoji: '🌟', label: 'Excellent profil', mood: 'Tu gères ! Continue comme ça.' },
  'modéré':   { color: '#ca8a04', bg: '#fefce8', accent: '#fde68a', emoji: '💪', label: 'Bonne dynamique', mood: 'Quelques points à consolider, mais tu es sur la bonne voie.' },
  'élevé':    { color: '#ea580c', bg: '#fff7ed', accent: '#fed7aa', emoji: '⚡', label: 'Attention',       mood: 'Tu as pris un peu de retard — rattrapons ça ensemble.' },
  'critique': { color: '#dc2626', bg: '#fef2f2', accent: '#fecaca', emoji: '🚨', label: 'Urgent',          mood: 'Besoin de reprendre les bases. On t\'aide, step by step.' },
  'inconnu':  { color: '#64748b', bg: '#f1f5f9', accent: '#e2e8f0', emoji: '🎯', label: 'Profil en cours', mood: 'On apprend à te connaître, continue à étudier pour débloquer ton analyse.' },
};

/* ─── Jauge circulaire du score ────────────────────────────────────────── */
function ScoreGauge({ score, levelColor, size = 180 }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const dash = (pct / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#e2e8f0" strokeWidth="12"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={levelColor} strokeWidth="12"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.2s ease-out' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 42, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
          {score != null ? Math.round(score) : '—'}
        </span>
        <span style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>/ 100 prédit</span>
      </div>
    </div>
  );
}

/* ─── Carte de tâche du plan d'action ─────────────────────────────────── */
function ActionCard({ icon: Icon, title, description, cta, onAction, tone = 'primary' }) {
  const tones = {
    primary: { bg: '#eef2ff', color: '#4338ca', hover: '#4f46e5' },
    warning: { bg: '#fff7ed', color: '#c2410c', hover: '#ea580c' },
    success: { bg: '#f0fdf4', color: '#15803d', hover: '#16a34a' },
  };
  const t = tones[tone];

  return (
    <div style={{
      background: 'white', border: '1px solid #e2e8f0', borderRadius: 14,
      padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, background: t.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={22} color={t.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{title}</h4>
        <p style={{ margin: '4px 0 10px', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
          {description}
        </p>
        {cta && (
          <button
            onClick={onAction}
            style={{
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: t.hover, color: 'white', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            {cta} <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Page QCM interactive ─────────────────────────────────────────────── */
function InlineQcm({ questions }) {
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);

  if (!questions || questions.length === 0) {
    return (
      <div style={{ padding: 20, background: '#f1f5f9', borderRadius: 12, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
        Les exercices personnalisés seront disponibles dès que tu auras tenté au moins un QCM du cours.
      </div>
    );
  }

  const q = questions[idx];
  const correct = q.correctAnswer;
  const letterColor = (L) => {
    if (!revealed) return chosen === L ? '#4f46e5' : '#cbd5e1';
    if (L === correct) return '#16a34a';
    if (L === chosen && chosen !== correct) return '#dc2626';
    return '#cbd5e1';
  };

  const next = () => {
    if (idx < questions.length - 1) {
      setIdx(idx + 1);
      setChosen(null);
      setRevealed(false);
    }
  };

  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{
        padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
          Question {idx + 1} / {questions.length}
        </span>
        <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 700 }}>
          {score} ✓ sur {idx + (revealed ? 1 : 0)}
        </span>
      </div>

      <div style={{ padding: 20 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>
          {q.texte}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['A', 'B', 'C', 'D'].map((L) => (
            <button
              key={L}
              disabled={revealed}
              onClick={() => setChosen(L)}
              style={{
                textAlign: 'left', padding: '11px 14px', borderRadius: 10,
                border: `2px solid ${letterColor(L)}`,
                background: chosen === L && !revealed ? '#eef2ff' : 'white',
                color: '#0f172a', fontSize: 14, cursor: revealed ? 'default' : 'pointer',
                display: 'flex', gap: 10, alignItems: 'center',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <strong style={{ color: letterColor(L) }}>{L}.</strong>
              <span>{q.options?.[L]}</span>
            </button>
          ))}
        </div>

        {!revealed ? (
          <button
            disabled={!chosen}
            onClick={() => { setRevealed(true); if (chosen === correct) setScore((s) => s + 1); }}
            style={{
              marginTop: 14, padding: '10px 20px', borderRadius: 10, border: 'none',
              background: chosen ? '#4f46e5' : '#cbd5e1', color: 'white',
              fontWeight: 600, fontSize: 14, cursor: chosen ? 'pointer' : 'not-allowed',
            }}
          >
            Valider ma réponse
          </button>
        ) : (
          <>
            <div style={{
              marginTop: 14, padding: 14, borderRadius: 10,
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
            {idx < questions.length - 1 && (
              <button
                onClick={next}
                style={{
                  marginTop: 12, padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: '#4f46e5', color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                Question suivante <ChevronRight size={14} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── PAGE PRINCIPALE ──────────────────────────────────────────────────── */
export default function StudentAICoach() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [courseRes, reviewRes] = await Promise.all([
        api.get(`/courses/${courseId}`),
        api.get(`/ai/personalized-review/${courseId}`),
      ]);
      setCourse(courseRes.data);
      setData(reviewRes.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Impossible de charger ton coach IA.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const level = data?.prediction?.dropout_risk_level || 'inconnu';
  const style = LEVEL_STYLE[level];
  const predictedScore = data?.prediction?.predicted_score;
  const dropoutProba = data?.prediction?.dropout_probability;
  const weakVideos = data?.weakVideos || [];
  const generatedQcm = data?.generatedQcm || [];

  if (loading) {
    return (
      <Layout title="Mon coach IA">
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={32} className="spin" style={{ marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 14 }}>Analyse de ton profil en cours...</p>
        </div>
        <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}</style>
      </Layout>
    );
  }

  return (
    <Layout title={course ? `Coach IA — ${course.titre}` : 'Mon coach IA'}>
      <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <Breadcrumb items={[
          { label: 'Accueil', to: '/', icon: Home },
          { label: 'Mes cours', to: '/courses' },
          { label: course?.titre || 'Cours', to: `/courses/${courseId}` },
          { label: 'Mon coach IA' },
        ]} />

        {/* Header héros */}
        <div style={{
          background: `linear-gradient(135deg, ${style.color}, #4f46e5)`,
          borderRadius: 20, padding: '24px 28px', marginBottom: 24,
          color: 'white', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            fontSize: 36,
          }}>
            {style.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
              Salut {user?.prenom || 'toi'} !
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 15, opacity: 0.95, lineHeight: 1.5 }}>
              {style.mood} <br />
              <span style={{ opacity: 0.85, fontSize: 13 }}>
                Analyse basée sur {course?.titre}
              </span>
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
              color: 'white', padding: '10px 14px', borderRadius: 10,
              display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
            }}
          >
            {refreshing ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
            Actualiser
          </button>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: 10, marginBottom: 20,
            background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 14,
          }}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {/* Ligne 1 : Jauge + Niveau */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, marginBottom: 20,
          background: 'white', border: '1px solid #e2e8f0', borderRadius: 18,
          padding: 24, alignItems: 'center',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ScoreGauge score={predictedScore} levelColor={style.color} />
          </div>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 999,
              background: style.bg, color: style.color,
              border: `1px solid ${style.accent}`,
              fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
              marginBottom: 14,
            }}>
              <span>{style.emoji}</span> {style.label}
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
              {predictedScore != null ? `Ton score prédit : ${Math.round(predictedScore)}/100` : 'Profil en apprentissage'}
            </h2>
            <p style={{ margin: '8px 0 16px', fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
              {data?.motivation || 'On analyse ton parcours pour te donner un feedback personnalisé.'}
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {dropoutProba != null && (
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                    Risque d'abandon
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: style.color }}>
                    {Math.round(dropoutProba * 100)}%
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                  Chapitres à retravailler
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  {weakVideos.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Points faibles détectés */}
        {weakVideos.length > 0 && (
          <div style={{
            background: 'white', border: '1px solid #e2e8f0', borderRadius: 18,
            padding: 24, marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Target size={20} color="#4f46e5" />
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                Tes {weakVideos.length} priorités de révision
              </h3>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              L'IA a analysé tes résultats de QCM. Concentre-toi sur ces chapitres pour progresser vite.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {weakVideos.map((v, i) => {
                const hasScore = v.avgScore != null;
                const urgency = hasScore ? (v.avgScore < 40 ? 'critique' : v.avgScore < 60 ? 'important' : 'à consolider') : 'à découvrir';
                const urgencyColor = hasScore ? (v.avgScore < 40 ? '#dc2626' : v.avgScore < 60 ? '#ea580c' : '#ca8a04') : '#4f46e5';

                return (
                  <div
                    key={v.videoId}
                    onClick={() => navigate(`/watch/${v.videoId}`)}
                    style={{
                      display: 'flex', gap: 14, alignItems: 'center', padding: 14,
                      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12,
                      cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, background: urgencyColor,
                      color: 'white', fontWeight: 800, fontSize: 15,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                        {v.title}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {hasScore
                          ? `Ton score : ${v.avgScore}/100 · ${v.attempts} tentative${v.attempts > 1 ? 's' : ''}`
                          : 'Tu n\'as pas encore tenté cette partie'}
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 10px', borderRadius: 999, fontSize: 11,
                      background: urgencyColor + '22', color: urgencyColor,
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, whiteSpace: 'nowrap',
                    }}>
                      {urgency}
                    </span>
                    <PlayCircle size={22} color="#4f46e5" style={{ flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Plan d'action de la semaine */}
        <div style={{
          background: 'white', border: '1px solid #e2e8f0', borderRadius: 18,
          padding: 24, marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Calendar size={20} color="#16a34a" />
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
              Ton plan d'action cette semaine
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            <ActionCard
              icon={PlayCircle}
              title="Revoir ta priorité n°1"
              description={weakVideos[0] ? `Reprends « ${weakVideos[0].title} » pendant 20 min.` : 'Commence par visionner la première vidéo du cours.'}
              cta="Revoir maintenant"
              tone="primary"
              onAction={() => weakVideos[0] ? navigate(`/watch/${weakVideos[0].videoId}`) : navigate(`/courses/${courseId}`)}
            />
            <ActionCard
              icon={Zap}
              title="T'entraîner 10 min"
              description={generatedQcm.length > 0 ? `${generatedQcm.length} questions générées rien que pour toi — juste en-dessous.` : 'Fais un QCM pour débloquer tes exercices personnalisés.'}
              cta={generatedQcm.length > 0 ? 'Faire les QCM' : 'Voir les QCM du cours'}
              tone="warning"
              onAction={() => {
                if (generatedQcm.length > 0) document.getElementById('qcm-zone')?.scrollIntoView({ behavior: 'smooth' });
                else navigate(`/courses/${courseId}`);
              }}
            />
            <ActionCard
              icon={BookOpen}
              title="Continuer le cours"
              description={`Retourne sur ${course?.titre || 'ton cours'} et progresse sur la prochaine vidéo.`}
              cta="Aller au cours"
              tone="success"
              onAction={() => navigate(`/courses/${courseId}`)}
            />
          </div>
        </div>

        {/* Zone QCM personnalisé */}
        <div id="qcm-zone" style={{
          background: 'white', border: '1px solid #e2e8f0', borderRadius: 18,
          padding: 24, marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Sparkles size={20} color="#7c3aed" />
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
              Tes exercices personnalisés
            </h3>
            {generatedQcm.length > 0 && (
              <span style={{
                padding: '3px 10px', borderRadius: 999, fontSize: 11,
                background: '#ede9fe', color: '#7c3aed', fontWeight: 700,
              }}>
                {generatedQcm.length} question{generatedQcm.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
            Questions créées par l'IA d'après tes points faibles. Cliquable, avec correction immédiate.
          </p>
          <InlineQcm questions={generatedQcm} />
        </div>

        {/* Retour au cours */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <Link
            to={`/courses/${courseId}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              color: '#4f46e5', fontSize: 14, fontWeight: 600, textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} /> Retour au cours
          </Link>
        </div>
      </div>

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}
