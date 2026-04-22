import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  Activity, AlertTriangle, BrainCircuit, CheckCircle2, Cpu,
  GraduationCap, Loader2, RefreshCw, Target, TrendingUp, Users,
} from 'lucide-react';

const COLORS = {
  primary: '#1B4F72',
  secondary: '#2874A6',
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#dc2626',
  purple: '#7c3aed',
  surface: '#ffffff',
  border: '#e2e8f0',
  mutedBg: '#f1f5f9',
  text: '#0f172a',
  textMuted: '#64748b',
};

const RISK_COLOR = {
  'critique': COLORS.danger,
  'élevé':    '#ea580c',
  'modéré':   COLORS.warning,
  'faible':   COLORS.success,
};

const CATEGORY_COLOR = {
  'excellent':  COLORS.success,
  'bon':        COLORS.secondary,
  'moyen':      COLORS.warning,
  'à risque':   COLORS.danger,
};

/* ─── Sous-composants ─────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, suffix, color, hint }) {
  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
      borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: color + '1A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={color} />
        </div>
        <span style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: COLORS.text, lineHeight: 1 }}>
        {value}
        {suffix && <span style={{ fontSize: 14, color: COLORS.textMuted, fontWeight: 500, marginLeft: 4 }}>{suffix}</span>}
      </div>
      {hint && <div style={{ fontSize: 12, color: COLORS.textMuted }}>{hint}</div>}
    </div>
  );
}

function RiskBadge({ level }) {
  const color = RISK_COLOR[level] || COLORS.textMuted;
  return (
    <span style={{
      padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
      background: color + '1A', color, textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {level}
    </span>
  );
}

function ProbaBar({ value, color }) {
  return (
    <div style={{ width: 80, height: 6, background: COLORS.mutedBg, borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: `${Math.round(value * 100)}%`, height: '100%', background: color }} />
    </div>
  );
}

function ModelMetricsCard({ title, icon: Icon, metrics, color }) {
  if (!metrics) {
    return (
      <div style={{
        background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14,
        padding: 20, display: 'flex', alignItems: 'center', gap: 12, color: COLORS.textMuted,
      }}>
        <AlertTriangle size={18} /> {title} : non entraîné
      </div>
    );
  }
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Icon size={18} color={color} /> <strong style={{ color: COLORS.text }}>{title}</strong>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {Object.entries(metrics).map(([k, v]) => (
          <div key={k} style={{
            background: COLORS.mutedBg, padding: '8px 12px', borderRadius: 8,
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            <span style={{ fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {k}
            </span>
            <strong style={{ color: COLORS.text, fontSize: 14 }}>{String(v)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Page principale ─────────────────────────────────────────────────── */
export default function AIDashboard() {
  const [overview, setOverview] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [healthRes, overviewRes] = await Promise.allSettled([
        api.get('/ai/health'),
        api.get('/ai/overview'),
      ]);
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value.data);
      else setHealth(null);

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
      const { data } = await api.post('/ai/train', { rebuildDataset: true });
      setInfo(`Entraînement terminé. MAE=${data.success_model?.mae}, AUC=${data.dropout_model?.roc_auc}`);
      await fetchAll();
    } catch (err) {
      setError(err?.response?.data?.message || 'Échec de l\'entraînement. Vérifiez que le microservice Python tourne.');
    } finally {
      setTraining(false);
    }
  };

  const modelsReady = health?.success_model_ready && health?.dropout_model_ready;

  const atRiskRows = useMemo(() => overview?.topAtRisk || [], [overview]);

  return (
    <Layout>
      <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.purple})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BrainCircuit size={22} color="#fff" />
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: COLORS.text, margin: 0 }}>
                Intelligence Artificielle pédagogique
              </h1>
            </div>
            <p style={{ color: COLORS.textMuted, fontSize: 14, margin: 0, maxWidth: 720 }}>
              Modèles TensorFlow entraînés sur les données de la plateforme pour anticiper les difficultés
              des étudiants et détecter les risques de décrochage.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={fetchAll}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10,
                border: `1px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.text,
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <RefreshCw size={16} /> Rafraîchir
            </button>
            <button
              onClick={handleTrain}
              disabled={training}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10,
                border: 'none', background: COLORS.primary, color: '#fff',
                fontSize: 14, fontWeight: 700, cursor: training ? 'not-allowed' : 'pointer',
                opacity: training ? 0.7 : 1,
              }}
            >
              {training ? <Loader2 size={16} className="spin" /> : <Cpu size={16} />}
              {training ? 'Entraînement...' : (modelsReady ? 'Ré-entraîner' : 'Entraîner les modèles')}
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            marginBottom: 16, padding: '12px 16px', borderRadius: 10,
            background: '#fef2f2', border: '1px solid #fecaca', color: COLORS.danger,
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 14,
          }}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}
        {info && (
          <div style={{
            marginBottom: 16, padding: '12px 16px', borderRadius: 10,
            background: '#f0fdf4', border: '1px solid #bbf7d0', color: COLORS.success,
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 14,
          }}>
            <CheckCircle2 size={16} /> {info}
          </div>
        )}

        {/* Status modèles */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16, marginBottom: 24,
        }}>
          <StatCard
            icon={Users}
            label="Étudiants actifs"
            value={overview?.totalStudents ?? '—'}
            color={COLORS.primary}
          />
          <StatCard
            icon={GraduationCap}
            label="Cours actifs"
            value={overview?.totalCourses ?? '—'}
            color={COLORS.secondary}
          />
          <StatCard
            icon={Target}
            label="Score moyen promotion"
            value={overview?.averageScore ?? '—'}
            suffix="/100"
            color={COLORS.success}
          />
          <StatCard
            icon={AlertTriangle}
            label="Étudiants à risque (IA)"
            value={overview?.atRiskCount ?? '—'}
            color={COLORS.danger}
            hint="Prédiction du modèle de décrochage"
          />
        </div>

        {/* Métriques modèles */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16, marginBottom: 24,
        }}>
          <ModelMetricsCard
            title="Modèle prédictif de réussite"
            icon={TrendingUp}
            metrics={health?.success_metrics}
            color={COLORS.primary}
          />
          <ModelMetricsCard
            title="Modèle détecteur de décrochage"
            icon={Activity}
            metrics={health?.dropout_metrics}
            color={COLORS.danger}
          />
        </div>

        {/* Tableau étudiants à risque */}
        <div style={{
          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 14, overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px', borderBottom: `1px solid ${COLORS.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: COLORS.text, fontWeight: 700 }}>
                Étudiants à surveiller
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
                Classés par probabilité de décrochage prédite par l'IA
              </p>
            </div>
            {!modelsReady && (
              <span style={{ fontSize: 12, color: COLORS.warning, fontWeight: 600 }}>
                Entraînez les modèles pour activer
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: COLORS.textMuted }}>
              <Loader2 size={24} className="spin" /> Chargement...
            </div>
          ) : atRiskRows.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: COLORS.textMuted }}>
              {modelsReady
                ? 'Aucun étudiant à risque détecté. 🎉'
                : 'Les prédictions apparaîtront une fois les modèles entraînés.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead style={{ background: COLORS.mutedBg }}>
                  <tr>
                    <th style={th}>Étudiant</th>
                    <th style={th}>Filière</th>
                    <th style={th}>Score prédit</th>
                    <th style={th}>Catégorie</th>
                    <th style={th}>Probabilité décrochage</th>
                    <th style={th}>Niveau de risque</th>
                  </tr>
                </thead>
                <tbody>
                  {atRiskRows.map((s, i) => {
                    const fullName = [s.prenom, s.nom].filter(Boolean).join(' ') || s.email || s.user_id;
                    const category = s.score_category || '—';
                    return (
                      <tr key={s.user_id || i} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                        <td style={td}>
                          <div style={{ fontWeight: 600, color: COLORS.text }}>{fullName}</div>
                          {s.email && <div style={{ fontSize: 12, color: COLORS.textMuted }}>{s.email}</div>}
                        </td>
                        <td style={td}>{s.filiere || '—'}</td>
                        <td style={td}>
                          <strong style={{ color: COLORS.text }}>
                            {s.predicted_score !== undefined ? `${s.predicted_score}/100` : '—'}
                          </strong>
                        </td>
                        <td style={td}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                            background: (CATEGORY_COLOR[category] || COLORS.textMuted) + '1A',
                            color: CATEGORY_COLOR[category] || COLORS.textMuted,
                            textTransform: 'capitalize',
                          }}>
                            {category}
                          </span>
                        </td>
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ProbaBar value={s.dropout_probability || 0} color={RISK_COLOR[s.dropout_risk_level] || COLORS.textMuted} />
                            <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                              {Math.round((s.dropout_probability || 0) * 100)}%
                            </span>
                          </div>
                        </td>
                        <td style={td}><RiskBadge level={s.dropout_risk_level || 'faible'} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <style>{`
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </Layout>
  );
}

const th = { textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 };
const td = { padding: '14px 16px', color: COLORS.text, verticalAlign: 'middle' };
