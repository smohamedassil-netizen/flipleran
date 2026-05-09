import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import {
  Sparkles, AlertTriangle, Lightbulb, TrendingUp, RefreshCw, ArrowRight, Bot,
} from 'lucide-react';

/**
 * TeacherInsightsWidget — Widget "Insights IA" en haut du ProfessorDashboard.
 *
 * @description Affiche 3-5 insights actionnables générés par l'IA à partir
 * des métriques du cours (Hattie 2009 *Visible Learning* ; Black & Wiliam
 * 1998 *Inside the Black Box*). Chaque insight a un type (attention rouge,
 * success vert, suggestion jaune), un titre, une description chiffrée et
 * une action concrète. Refresh manuel disponible (cache 1h côté backend).
 */

const TYPE_META = {
  attention:  { color: '#DC2626', bg: '#FEE2E2', border: '#FECACA', Icon: AlertTriangle, label: 'Urgent' },
  success:    { color: '#15803D', bg: '#DCFCE7', border: '#BBF7D0', Icon: TrendingUp,    label: 'Succès' },
  suggestion: { color: '#D97706', bg: '#FEF3C7', border: '#FDE68A', Icon: Lightbulb,     label: 'Suggestion' },
};

export default function TeacherInsightsWidget({ courseId }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/courses/${courseId}/insights${refresh ? '?refresh=true' : ''}`);
      setData(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (courseId) load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  if (loading) {
    return (
      <div style={{
        padding: 16, marginBottom: 18, borderRadius: 12,
        background: 'linear-gradient(135deg, #F3E8FF, #FDF4FF)',
        border: '1px solid #E9D5FF',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={18} color="#9333EA" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
          <p style={{ margin: 0, fontSize: 13, color: '#6B21A8' }}>L'IA analyse les données de ton module…</p>
        </div>
        <style>{`@keyframes pulse { 50% { transform: scale(1.15); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 12, marginBottom: 18, borderRadius: 8, background: '#FEE2E2', color: '#991B1B', fontSize: 13 }}>
        <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
        {error}
      </div>
    );
  }

  if (!data || !data.insights?.length) return null;

  const { insights, metrics, generatedAt, source, fromCache } = data;

  return (
    <section style={{
      padding: 16, marginBottom: 18, borderRadius: 12,
      background: 'linear-gradient(135deg, #F3E8FF, #FDF4FF)',
      border: '1px solid #E9D5FF',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #9333EA, #C084FC)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Bot size={18} color="#fff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#6B21A8' }}>
              Insights IA
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#7E22CE' }}>
              {metrics?.totalStudents || 0} étudiants · engagement moyen {metrics?.overallEngagement || 0}%
              {fromCache && ' · (cache)'}
              {source === 'heuristic' && ' · règles'}
            </p>
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="btn btn-ghost btn-sm"
          title="Forcer un rafraîchissement (bypass le cache 1h)"
        >
          <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          {' '}{refreshing ? 'Analyse…' : 'Rafraîchir'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
        {insights.map((ins, i) => {
          const meta = TYPE_META[ins.type] || TYPE_META.suggestion;
          const Icon = meta.Icon;
          return (
            <div key={i} style={{
              padding: 14, borderRadius: 10,
              background: 'white', border: `1px solid ${meta.border}`,
              borderLeft: `4px solid ${meta.color}`,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon size={14} color={meta.color} />
                <span style={{ padding: '1px 8px', borderRadius: 999, background: meta.bg, color: meta.color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {meta.label}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1E293B', lineHeight: 1.3 }}>
                {ins.title}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                {ins.description}
              </p>
              {ins.action && (
                <div style={{ marginTop: 4, padding: '8px 10px', background: meta.bg, borderRadius: 6, fontSize: 11, color: meta.color, fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <ArrowRight size={11} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{ins.action}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 10, color: '#9333EA', fontStyle: 'italic', textAlign: 'right' }}>
        Généré {generatedAt ? new Date(generatedAt).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''} ·
        {' '}<button onClick={() => navigate('/professor/tracking/' + courseId)} style={{ background: 'none', border: 'none', color: '#9333EA', textDecoration: 'underline', cursor: 'pointer', fontSize: 10, padding: 0 }}>
          Voir le suivi détaillé
        </button>
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </section>
  );
}
