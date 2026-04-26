import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  AlertTriangle, BookOpen, BrainCircuit, CheckCircle2, ChevronDown, ChevronUp,
  Cpu, GraduationCap, Lightbulb, Loader2, MessageSquare, RefreshCw,
  TrendingDown, Users, UserSearch,
} from 'lucide-react';

/* ─── Palette & styles risque ─────────────────────────────────────────── */
const RISK = {
  'critique': { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Urgent',      icon: '🚨' },
  'élevé':    { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', label: 'Élevé',       icon: '⚠️' },
  'modéré':   { color: '#ca8a04', bg: '#fefce8', border: '#fde68a', label: 'À surveiller', icon: '👀' },
  'faible':   { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'OK',          icon: '✅' },
};

/* ─── Génère la recommandation concrète selon les données ML ───────────── */
function buildRecommendation(student) {
  const proba = student.dropout_probability ?? 0;
  const score = student.predicted_score ?? 0;

  if (proba >= 0.7) {
    return {
      why: `Score prédit ${Math.round(score)}/100, probabilité d'abandon ${Math.round(proba * 100)}%. Signaux d'inactivité détectés.`,
      action: 'Prends contact direct cette semaine. Propose un rendez-vous individuel ou un plan de rattrapage.',
    };
  }
  if (proba >= 0.4) {
    return {
      why: `Score prédit ${Math.round(score)}/100, décrochage probable à ${Math.round(proba * 100)}%. Progrès irrégulier.`,
      action: 'Envoie un message encourageant et partage les ressources du module — point de vigilance à faire en classe.',
    };
  }
  if (score < 50) {
    return {
      why: `Score prédit ${Math.round(score)}/100 — l'étudiant a du mal avec les notions récentes.`,
      action: 'Suggère un QCM d\'entraînement ciblé et vérifie sa compréhension en début de prochain cours.',
    };
  }
  return {
    why: `Progression correcte (score prédit ${Math.round(score)}/100).`,
    action: 'Continuer le suivi standard.',
  };
}

/* ─── Sous-composants ─────────────────────────────────────────────────── */
function StatTile({ icon: Icon, label, value, color, sub }) {
  return (
    <div style={{
      background: 'white', border: '1px solid #e2e8f0', borderRadius: 14,
      padding: 18, display: 'flex', gap: 14, alignItems: 'center',
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 12, background: color + '1A',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={22} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {label}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
          {value ?? '—'}
        </div>
        {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function StudentActionCard({ student, onMessage, onView }) {
  const level = student.dropout_risk_level || 'faible';
  const rs = RISK[level] || RISK.faible;
  const fullName = [student.prenom, student.nom].filter(Boolean).join(' ') || student.email || 'Étudiant';
  const initials = (student.prenom?.[0] || '') + (student.nom?.[0] || '');
  const rec = buildRecommendation(student);

  return (
    <div style={{
      background: 'white', border: `1px solid ${rs.border}`, borderRadius: 14, padding: 18,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, background: rs.bg, color: rs.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 16, flexShrink: 0, border: `2px solid ${rs.border}`,
        }}>
          {initials.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{fullName}</span>
            <span style={{
              padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
              background: rs.bg, color: rs.color, border: `1px solid ${rs.border}`,
              textTransform: 'uppercase', letterSpacing: 0.3,
            }}>
              {rs.icon} {rs.label}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {student.filiere || '—'} {student.email ? ` · ${student.email}` : ''}
          </div>
        </div>
      </div>

      {/* Pourquoi */}
      <div style={{ background: rs.bg, border: `1px solid ${rs.border}`, borderRadius: 10, padding: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
          <AlertTriangle size={15} color={rs.color} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: rs.color, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Pourquoi
            </div>
            <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, marginTop: 2 }}>{rec.why}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Lightbulb size={15} color="#4f46e5" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Que faire
            </div>
            <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, marginTop: 2 }}>{rec.action}</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onMessage(student)}
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 10, border: 'none',
            background: '#4f46e5', color: 'white', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <MessageSquare size={14} /> Envoyer un message
        </button>
        <button
          onClick={() => onView(student)}
          style={{
            padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1',
            background: 'white', color: '#334155', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <UserSearch size={14} /> Profil
        </button>
      </div>
    </div>
  );
}

function ModelMetrics({ success, dropout }) {
  if (!success && !dropout) {
    return (
      <div style={{ padding: 16, color: '#64748b', fontSize: 13 }}>
        Modèles non entraînés. Lance un entraînement pour voir les métriques.
      </div>
    );
  }
  const Row = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <strong style={{ color: '#0f172a' }}>{value}</strong>
    </div>
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontWeight: 700, color: '#1B4F72' }}>
          <BookOpen size={16} /> Prédiction de réussite (régression)
        </div>
        {success ? (
          <>
            <Row label="MAE (erreur moyenne)" value={success.mae} />
            <Row label="RMSE" value={success.rmse} />
            <Row label="R² (qualité)" value={success.r2} />
            <Row label="Échantillon test" value={success.n_test} />
          </>
        ) : <div style={{ fontSize: 12, color: '#94a3b8' }}>Non entraîné</div>}
      </div>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontWeight: 700, color: '#dc2626' }}>
          <TrendingDown size={16} /> Détection de décrochage (classification)
        </div>
        {dropout ? (
          <>
            <Row label="Accuracy" value={dropout.accuracy} />
            <Row label="Precision" value={dropout.precision} />
            <Row label="Recall" value={dropout.recall} />
            <Row label="F1 score" value={dropout.f1} />
            <Row label="ROC-AUC" value={dropout.roc_auc} />
          </>
        ) : <div style={{ fontSize: 12, color: '#94a3b8' }}>Non entraîné</div>}
      </div>
    </div>
  );
}

/* ─── Page principale ─────────────────────────────────────────────────── */
export default function AIDashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [healthRes, overviewRes] = await Promise.allSettled([
        api.get('/ai/health'),
        api.get('/ai/overview'),
      ]);
      setHealth(healthRes.status === 'fulfilled' ? healthRes.value.data : null);

      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value.data);
      else {
        setOverview(null);
        const msg = overviewRes.reason?.response?.data?.message || overviewRes.reason?.message;
        if (msg) setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleTrain = async () => {
    setTraining(true);
    setError('');
    setInfo('');
    try {
      await api.post('/ai/train', { rebuildDataset: true });
      setInfo('Modèles ré-entraînés avec succès.');
      await fetchAll();
    } catch (err) {
      setError(err?.response?.data?.message || 'Échec de l\'entraînement. Le service Python tourne-t-il ?');
    } finally {
      setTraining(false);
    }
  };

  const handleMessage = (student) => navigate(`/chat/private/${student.user_id}`);
  const handleView = (student) => navigate(`/chat/private/${student.user_id}`);

  const atRiskStudents = useMemo(() => overview?.topAtRisk || [], [overview]);
  const urgentStudents = atRiskStudents.filter((s) => ['critique', 'élevé'].includes(s.dropout_risk_level));
  const watchStudents = atRiskStudents.filter((s) => s.dropout_risk_level === 'modéré');

  const modelsReady = health?.success_model_ready && health?.dropout_model_ready;
  const scopeLabel = overview?.scope === 'admin' ? 'toute la plateforme' : 'tes étudiants';

  return (
    <Layout title="Coach IA — Suivi étudiants">
      <div style={{ padding: '22px 28px', maxWidth: 1300, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'linear-gradient(135deg, #1B4F72, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BrainCircuit size={22} color="#fff" />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Qui a besoin de toi ?
              </h1>
            </div>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 0 56px' }}>
              L'IA analyse {scopeLabel} et te signale où ton aide aura le plus d'impact.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={fetchAll}
              disabled={loading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px',
                borderRadius: 10, border: '1px solid #cbd5e1', background: 'white', color: '#334155',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} /> Rafraîchir
            </button>
            <button
              onClick={handleTrain}
              disabled={training}
              title="Ré-entraîne les modèles IA sur les dernières données"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                borderRadius: 10, border: 'none', background: '#1B4F72', color: 'white',
                fontSize: 13, fontWeight: 700, cursor: training ? 'not-allowed' : 'pointer',
                opacity: training ? 0.7 : 1,
              }}
            >
              {training ? <Loader2 size={14} className="spin" /> : <Cpu size={14} />}
              {training ? 'Entraînement...' : (modelsReady ? 'Ré-entraîner' : 'Entraîner les modèles')}
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            marginBottom: 16, padding: '12px 16px', borderRadius: 10,
            background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
          }}>
            <AlertTriangle size={15} /> {error}
          </div>
        )}
        {info && (
          <div style={{
            marginBottom: 16, padding: '12px 16px', borderRadius: 10,
            background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a',
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
          }}>
            <CheckCircle2 size={15} /> {info}
          </div>
        )}

        {/* Stats top */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 14, marginBottom: 22,
        }}>
          <StatTile
            icon={Users}
            label="Tes étudiants"
            value={overview?.totalStudents}
            color="#1B4F72"
            sub={`dans ${overview?.totalCourses ?? 0} cours`}
          />
          <StatTile
            icon={AlertTriangle}
            label="En difficulté"
            value={urgentStudents.length + watchStudents.length}
            color="#ea580c"
            sub={`${urgentStudents.length} urgents · ${watchStudents.length} à surveiller`}
          />
          <StatTile
            icon={GraduationCap}
            label="Score moyen"
            value={overview?.averageScore != null ? `${overview.averageScore}/100` : '—'}
            color="#16a34a"
            sub="sur les QCM récents"
          />
        </div>

        {/* Pas de modèles entraînés → invite explicite */}
        {!modelsReady && !loading && (
          <div style={{
            background: 'white', border: '2px dashed #cbd5e1', borderRadius: 14,
            padding: 30, textAlign: 'center', marginBottom: 22,
          }}>
            <BrainCircuit size={32} color="#94a3b8" style={{ marginBottom: 10 }} />
            <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#334155' }}>Les modèles IA ne sont pas encore prêts</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              Lance un entraînement pour activer les prédictions. Ça prend 2 à 3 minutes.
            </p>
            <button
              onClick={handleTrain}
              disabled={training}
              style={{
                padding: '10px 20px', borderRadius: 10, border: 'none',
                background: '#1B4F72', color: 'white', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              {training ? <Loader2 size={14} className="spin" /> : <Cpu size={14} />}
              {training ? 'Entraînement...' : 'Entraîner maintenant'}
            </button>
          </div>
        )}

        {/* Section URGENT */}
        {urgentStudents.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>🚨</span>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                À contacter cette semaine ({urgentStudents.length})
              </h2>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14,
            }}>
              {urgentStudents.map((s) => (
                <StudentActionCard
                  key={s.user_id}
                  student={s}
                  onMessage={handleMessage}
                  onView={handleView}
                />
              ))}
            </div>
          </div>
        )}

        {/* Section À SURVEILLER */}
        {watchStudents.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>👀</span>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                À surveiller ({watchStudents.length})
              </h2>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14,
            }}>
              {watchStudents.map((s) => (
                <StudentActionCard
                  key={s.user_id}
                  student={s}
                  onMessage={handleMessage}
                  onView={handleView}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tout le monde va bien */}
        {modelsReady && urgentStudents.length === 0 && watchStudents.length === 0 && !loading && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14,
            padding: 28, textAlign: 'center', marginBottom: 22,
          }}>
            <CheckCircle2 size={32} color="#16a34a" style={{ marginBottom: 10 }} />
            <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#16a34a' }}>Tout va bien 🎉</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#166534' }}>
              Aucun étudiant à risque détecté par l'IA. Continue ton super travail d'encadrement !
            </p>
          </div>
        )}

        {/* Mes cours (prof) */}
        {overview?.myCourses && overview.myCourses.length > 0 && (
          <div style={{
            background: 'white', border: '1px solid #e2e8f0', borderRadius: 14,
            padding: 18, marginBottom: 22,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Mes modules suivis
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                background: '#eef2ff', color: '#4338ca',
              }}>
                {overview.myCourses.length} module{overview.myCourses.length > 1 ? 's' : ''}
              </span>
            </div>
            {overview.myCourses.length > 6 && (
              <div style={{
                marginBottom: 12, padding: '10px 14px', borderRadius: 10,
                background: '#fff7ed', border: '1px solid #fed7aa', fontSize: 12, color: '#9a3412',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <AlertTriangle size={15} color="#ea580c" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  <strong>Anomalie détectée :</strong> tu es assigné·e à {overview.myCourses.length} modules.
                  Règle école : 1 prof = 1 module + 1 promotion. Demande à l'admin de réassigner tes cours.
                </span>
              </div>
            )}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10,
            }}>
              {overview.myCourses.map((c) => (
                <div
                  key={c._id}
                  style={{
                    padding: '10px 14px', borderRadius: 10,
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.titre}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <GraduationCap size={11} /> {c.filiere} · {c.promotion}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accordéon : détails techniques (pour la soutenance) */}
        <div style={{
          background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden',
        }}>
          <button
            onClick={() => setDetailsOpen((v) => !v)}
            style={{
              width: '100%', padding: '14px 18px', background: 'none', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#334155',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <BrainCircuit size={16} color="#7c3aed" />
              Détails techniques des modèles IA
            </span>
            {detailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {detailsOpen && (
            <div style={{ padding: '0 18px 18px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: '#64748b' }}>
                Modèles TensorFlow entraînés sur les données de la plateforme. Métriques calculées sur un set de test.
              </p>
              <ModelMetrics
                success={health?.success_metrics}
                dropout={health?.dropout_metrics}
              />
            </div>
          )}
        </div>

        <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </Layout>
  );
}
