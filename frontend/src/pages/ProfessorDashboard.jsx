import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import TeacherInsightsWidget from '../components/TeacherInsightsWidget.jsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import {
  Users, Video, CheckCircle, BarChart2,
  AlertTriangle, ChevronUp, RefreshCw, Upload,
  BookOpen, ArrowLeft, HelpCircle, Route,
} from 'lucide-react';

/* ══════════════════════════════════════════════════════════
   CONSTANTES & HELPERS
══════════════════════════════════════════════════════════ */
const C_PRIMARY   = '#1B4F72';
const C_ACCENT    = '#E8A838';
const C_SUCCESS   = '#276749';
const C_WARNING   = '#D4952A';
const C_ERROR     = '#9B2335';
const C_BORDER    = '#E2E8F0';

const completionColor = (rate) => {
  if (rate >= 80) return C_SUCCESS;
  if (rate >= 40) return C_WARNING;
  return C_ERROR;
};

const completionBg = (rate) => {
  if (rate >= 80) return '#F0FFF4';
  if (rate >= 40) return '#FFFBEB';
  return '#FFF5F5';
};

/* ══════════════════════════════════════════════════════════
   SOUS-COMPOSANTS
══════════════════════════════════════════════════════════ */

/* ── Stat card ──────────────────────────────────────────── */
function StatCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span className="stat-card-label">{label}</span>
        <div style={{
          width: 32, height: 32, borderRadius: 'var(--radius-md)',
          backgroundColor: accent ? 'var(--color-accent-light)' : 'var(--color-primary-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color={accent ? C_ACCENT : C_PRIMARY} />
        </div>
      </div>
      <p className="stat-card-value">
        {value === null || value === undefined ? '—' : value}
      </p>
      {sub && <p className="stat-card-sub" style={{ marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

/* ── Video completion row ───────────────────────────────── */
function VideoRow({ video }) {
  const navigate = useNavigate();
  const rate  = video.completionRate;
  const color = completionColor(rate);
  const bg    = completionBg(rate);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '28px 1fr 160px 80px 64px auto',
      gap: 12,
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: `1px solid ${C_BORDER}`,
    }}>
      {/* Order */}
      <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-disabled)', textAlign: 'center' }}>
        {video.order + 1}
      </span>

      {/* Title */}
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {video.titre}
        </p>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
          {video.watchedCount} étudiant{video.watchedCount !== 1 ? 's' : ''} ont commencé
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
            {video.completedCount}/{video.totalStudents} terminé
          </span>
        </div>
        <div style={{ height: 8, backgroundColor: C_BORDER, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${rate}%`,
            backgroundColor: color,
            borderRadius: 4,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* Avg watch */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text)' }}>
          {video.avgPercent}%
        </p>
        <p style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>moy.</p>
      </div>

      {/* Rate badge */}
      <div style={{
        textAlign: 'center',
        padding: '3px 8px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: bg,
        border: `1px solid ${color}22`,
      }}>
        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color }}>
          {rate}%
        </span>
      </div>

      {/* Lien éditeur des questions in-video */}
      <button
        type="button"
        onClick={() => navigate(`/professor/videos/${video._id}/questions`)}
        title="Questions interactives in-video"
        className="btn btn-ghost btn-sm"
        style={{ padding: '4px 8px' }}
      >
        <HelpCircle size={13} /> Questions
      </button>
    </div>
  );
}

/* ── QCM question bar (recharts custom tooltip) ─────────── */
const QCMTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: `1px solid ${C_BORDER}`,
      borderRadius: 'var(--radius-md)',
      padding: '10px 14px',
      fontSize: 'var(--font-size-xs)',
      maxWidth: 220,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}>
      <p style={{ fontWeight: 700, color: 'var(--color-text)', marginBottom: 4, lineHeight: 1.4 }}>
        {d.texte}
      </p>
      <p style={{ color: d.needsReview ? C_WARNING : C_SUCCESS, fontWeight: 600 }}>
        {d.correctRate === null ? 'Aucune donnée' : `${d.correctRate}% de réussite`}
      </p>
      {d.needsReview && (
        <p style={{ color: C_WARNING, marginTop: 4 }}>Notion à revoir</p>
      )}
    </div>
  );
};

/* La liste détaillée des étudiants est désormais sur /professor/tracking (Suivi individuel). */

/* ══════════════════════════════════════════════════════════
   PAGE PRINCIPALE
══════════════════════════════════════════════════════════ */
export default function ProfessorDashboard() {
  const { courseId } = useParams();
  const navigate     = useNavigate();

  const [data,      setData]      = useState(null);
  const [courses,   setCourses]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [error,     setError]     = useState('');
  const [alerts,    setAlerts]    = useState([]);
  const [alertsExpanded, setAlertsExpanded] = useState(false);

  /* ── Load course list for selector ─────────────────── */
  useEffect(() => {
    api.get('/professor/courses').then(({ data }) => setCourses(data)).catch(() => {});
  }, []);

  /* ── Load global alerts (independent of selected course) ── */
  useEffect(() => {
    api.get('/tracking/alerts').then(r => setAlerts(r.data ?? [])).catch(() => {});
  }, []);

  /* ── Bloc d'alertes : barre compacte par défaut, dépliable au clic ── */
  const alertsBlock = alerts.length > 0 && (
    <div style={{
      backgroundColor: alertsExpanded ? '#FFFBEB' : '#FFFEFA',
      border: `1px solid ${C_WARNING}33`,
      borderRadius: 10,
      marginBottom: 16,
      overflow: 'hidden',
      transition: 'background-color 200ms',
    }}>
      <button
        type="button"
        onClick={() => setAlertsExpanded(v => !v)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: 'none', border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <AlertTriangle size={16} color={C_WARNING} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: C_WARNING }}>
          {alerts.length} alerte{alerts.length > 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
          — cours sous 50% de complétion
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-xs)', color: C_WARNING, fontWeight: 600 }}>
          {alertsExpanded ? 'Masquer ▴' : 'Voir le détail ▾'}
        </span>
      </button>

      {alertsExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 14px 14px' }}>
          {alerts.map((alert, i) => (
            <div
              key={`${alert.courseId}-${alert.resourceId}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                backgroundColor: '#fff',
                borderRadius: 8,
                border: `1px solid ${C_BORDER}`,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 220 }}>
                <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                  {alert.courseTitre}
                </p>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
                  {alert.type === 'video' ? '🎥 ' : '📝 '}{alert.resourceTitre}
                </p>
              </div>

              <span style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#FFF5F5',
                border: `1px solid ${C_ERROR}33`,
                fontSize: 'var(--font-size-xs)',
                fontWeight: 700,
                color: C_ERROR,
                flexShrink: 0,
              }}>
                {alert.completionRate}% de complétion
              </span>

              <button
                onClick={() => navigate(alert.link)}
                className="btn btn-ghost btn-sm"
                style={{ flexShrink: 0 }}
              >
                Voir le suivi →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ── Load dashboard data ────────────────────────────── */
  const load = async (cid, isRefresh = false) => {
    if (!cid) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const { data: d } = await api.get(`/professor/dashboard/${cid}`);
      setData(d);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erreur de chargement.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(courseId); }, [courseId]);

  /* ── Redirect to first course if no courseId ────────── */
  useEffect(() => {
    if (!courseId && courses.length > 0) {
      navigate(`/professor/dashboard/${courses[0]._id}`, { replace: true });
    }
  }, [courses, courseId]);

  /* ─────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <Layout title="Tableau de bord professeur">
        {alertsBlock}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
          <div style={{ width: 24, height: 24, border: `2px solid ${C_BORDER}`, borderTopColor: C_PRIMARY, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span className="text-small">Chargement...</span>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Tableau de bord professeur">
        {alertsBlock}
        <div className="alert alert-error" style={{ maxWidth: 480 }}>
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      </Layout>
    );
  }

  if (!data) return null;

  const { course, globalStats, videoStats, qcmAnalysis } = data;

  /* ── Weak questions (tous QCMs confondus) ──────────────── */
  const weakQuestions = qcmAnalysis.flatMap((qcm) =>
    qcm.questions
      .filter((q) => q.needsReview)
      .map((q) => ({ ...q, videoTitre: qcm.videoTitre, qcmTitre: qcm.qcmTitre }))
  );

  return (
    <Layout title="Synthèse de classe">
      <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
        <ArrowLeft size={18} /> Retour
      </button>
      {/* ── Bandeau explicatif distinguant Synthèse / Suivi individuel ── */}
      <div style={{
        padding: '10px 14px', marginBottom: 16, borderRadius: 10,
        background: 'linear-gradient(135deg, #EBF3FA, #F8FAFC)',
        borderLeft: '3px solid #1B4F72', fontSize: 13, color: '#1E293B',
      }}>
        <strong style={{ color: '#1B4F72' }}>📊 Synthèse de classe</strong> — vue d'ensemble par cours :
        statistiques agrégées, alertes, classement.
        <Link to="/professor/tracking" style={{ marginLeft: 8, color: '#1B4F72', fontWeight: 600, textDecoration: 'underline' }}>
          Voir le suivi individuel par étudiant →
        </Link>
      </div>

      {/* ── Alertes urgentes (visibles sans sélection de cours) ── */}
      {alertsBlock}

      {/* ── Insights IA (F3 sprint-final, Hattie 2009 + Black & Wiliam 1998) ── */}
      <TeacherInsightsWidget courseId={courseId} />

      {/* ── Header ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">{course.titre}</h1>
          <p className="page-subtitle">{course.filiere} · {course.promotion}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Course selector */}
          {courses.length > 1 && (
            <select
              className="form-input"
              style={{ fontSize: 'var(--font-size-sm)', paddingRight: 32, cursor: 'pointer', width: 'auto' }}
              value={courseId}
              onChange={(e) => navigate(`/professor/dashboard/${e.target.value}`)}
            >
              {courses.map((c) => (
                <option key={c._id} value={c._id}>{c.titre}</option>
              ))}
            </select>
          )}

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => load(courseId, true)}
            disabled={refreshing}
            title="Rafraîchir"
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          </button>

          <Link
            to={`/professor/courses/${courseId}/path-builder`}
            className="btn btn-secondary btn-sm"
            title="Organiser les capsules, QCM et Prosits en parcours guidé"
          >
            <Route size={14} /> Parcours pédagogique
          </Link>
          <Link
            to={`/professor/courses/${courseId}/upload`}
            className="btn btn-primary btn-sm"
          >
            <Upload size={14} /> Ajouter une capsule
          </Link>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION 1 — STATS GLOBALES
      ══════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard
          label="Étudiants inscrits"
          value={globalStats.totalStudents}
          sub="dans ce module"
          icon={Users}
        />
        <StatCard
          label="Complétion capsules"
          value={globalStats.avgVideoCompletion !== null ? `${globalStats.avgVideoCompletion}%` : '—'}
          sub="moyenne cours"
          icon={Video}
        />
        <StatCard
          label="Réussite QCM"
          value={globalStats.avgQCMScore !== null ? `${globalStats.avgQCMScore}%` : '—'}
          sub={globalStats.avgQCMScore === null ? 'Aucune tentative' : 'score moyen'}
          icon={CheckCircle}
          accent={globalStats.avgQCMScore !== null && globalStats.avgQCMScore >= 70}
        />
        <StatCard
          label="Capsules publiées"
          value={globalStats.totalVideos}
          sub={`${globalStats.totalQCMs} QCM associé${globalStats.totalQCMs > 1 ? 's' : ''}`}
          icon={BarChart2}
        />
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — SUIVI PAR VIDÉO (preuve classe inversée)
      ══════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span className="card-title">Suivi de visionnage par capsule</span>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Indicateur de préparation avant le module en présentiel
            </p>
          </div>

          {/* Légende */}
          <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
            {[
              { label: 'Prêts (≥80%)', color: C_SUCCESS },
              { label: 'Partiel (40-80%)', color: C_WARNING },
              { label: 'Non prêts (<40%)', color: C_ERROR },
            ].map(({ label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
                <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {videoStats.length === 0 ? (
          <div className="empty-state">
            <Video size={28} className="empty-state-icon" />
            <p className="empty-state-title">Aucune capsule publiée</p>
            <p className="empty-state-desc">Ajoutez des capsules pour voir le suivi des étudiants.</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 160px 80px 64px', gap: 12, padding: '6px 0 10px', borderBottom: `1px solid ${C_BORDER}`, marginBottom: 2 }}>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-disabled)', textAlign: 'center' }}>#</span>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Capsule</span>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Progression</span>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', textAlign: 'center' }}>Moy.</span>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', textAlign: 'center' }}>Taux</span>
            </div>

            {videoStats.map((v) => <VideoRow key={v._id} video={v} />)}

            {/* Résumé */}
            <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C_BORDER}` }}>
              {[
                { label: 'Prêts pour le cours',     count: videoStats.filter((v) => v.completionRate >= 80).length, total: videoStats.length, color: C_SUCCESS },
                { label: 'En cours de préparation', count: videoStats.filter((v) => v.completionRate >= 40 && v.completionRate < 80).length, total: videoStats.length, color: C_WARNING },
                { label: 'Non encore regardés',     count: videoStats.filter((v) => v.completionRate < 40).length,  total: videoStats.length, color: C_ERROR },
              ].map(({ label, count, total, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                    <strong style={{ color: 'var(--color-text)' }}>{count}</strong>/{total} capsule{total > 1 ? 's' : ''} — {label}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION 3 — ANALYSE QCM
      ══════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">Analyse des QCM</span>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Taux de réussite par question — questions &lt;50% à revoir en présentiel
          </p>
        </div>

        {qcmAnalysis.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={28} className="empty-state-icon" />
            <p className="empty-state-title">Aucun QCM créé</p>
            <p className="empty-state-desc">Associez un QCM à vos capsules pour voir l'analyse.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {qcmAnalysis.map((qcm) => {
              const chartData = qcm.questions.map((q, i) => ({
                name:         `Q${i + 1}`,
                texte:        q.texte.length > 50 ? q.texte.slice(0, 50) + '…' : q.texte,
                correctRate:  q.correctRate ?? 0,
                needsReview:  q.needsReview,
                timedOutRate: q.timedOutRate,
              }));

              return (
                <div key={qcm.qcmId}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text)' }}>
                      {qcm.qcmTitre}
                    </span>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                      · {qcm.videoTitre}
                    </span>
                    {qcm.avgScore !== null && (
                      <span className="badge badge-primary" style={{ marginLeft: 'auto' }}>
                        Score moy. {qcm.avgScore}%
                      </span>
                    )}
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                      {qcm.totalAttempts} tentative{qcm.totalAttempts !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {qcm.totalAttempts === 0 ? (
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontStyle: 'italic', padding: '8px 0' }}>
                      Aucun étudiant n'a encore passé ce QCM.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C_BORDER} vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}
                          axisLine={false} tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                          tick={{ fontSize: 10, fill: 'var(--color-text-disabled)', fontFamily: 'var(--font-family)' }}
                          axisLine={false} tickLine={false}
                        />
                        <Tooltip content={<QCMTooltip />} cursor={{ fill: 'rgba(27,79,114,0.05)' }} />
                        <ReferenceLine y={50} stroke={C_WARNING} strokeDasharray="4 3" strokeWidth={1.5} />
                        <Bar dataKey="correctRate" radius={[4, 4, 0, 0]} maxBarSize={40}>
                          {chartData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.needsReview ? C_WARNING : C_PRIMARY}
                              fillOpacity={entry.needsReview ? 1 : 0.85}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {/* Weak questions list */}
                  {qcm.hasWeakQuestions && (
                    <div style={{
                      marginTop: 14,
                      backgroundColor: '#FFFBEB',
                      border: `1px solid rgba(212,149,42,0.3)`,
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <AlertTriangle size={14} color={C_WARNING} />
                        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: C_WARNING }}>
                          Ces notions méritent d'être reprises en présentiel
                        </span>
                      </div>
                      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {qcm.questions.filter((q) => q.needsReview).map((q, i) => (
                          <li key={q._id} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text)', display: 'flex', gap: 8 }}>
                            <span style={{ fontWeight: 700, color: C_WARNING, flexShrink: 0 }}>Q{qcm.questions.indexOf(q) + 1}</span>
                            <span style={{ flex: 1 }}>{q.texte}</span>
                            <span style={{ fontWeight: 700, color: C_ERROR, flexShrink: 0 }}>{q.correctRate}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Alerte globale si plusieurs QCMs ont des questions faibles */}
        {weakQuestions.length > 0 && qcmAnalysis.length > 1 && (
          <div style={{
            marginTop: 20, paddingTop: 20,
            borderTop: `1px solid ${C_BORDER}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <AlertTriangle size={16} color={C_WARNING} style={{ flexShrink: 0 }} />
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
              <strong>{weakQuestions.length} question{weakQuestions.length > 1 ? 's' : ''}</strong> sur l'ensemble du cours ont un taux de réussite inférieur à 50%.
              Ces points nécessitent une attention particulière en séance.
            </p>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION 4 — CTA vers Suivi individuel
      ══════════════════════════════════════════════════════ */}
      <div
        style={{
          marginBottom: 24, padding: '20px 24px', borderRadius: 12,
          background: 'linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)',
          border: '1px solid #F59E0B33',
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: 'linear-gradient(135deg, #D97706, #F59E0B)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Users size={22} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <p style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: '#92400E', margin: 0 }}>
            Suivi individuel des {globalStats.totalStudents} étudiant{globalStats.totalStudents > 1 ? 's' : ''}
          </p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: '#78350F', margin: '4px 0 0' }}>
            Voir le détail par étudiant (capsules manquantes, QCM non passés, dernière activité) et envoyer des rappels ciblés.
          </p>
        </div>
        <Link
          to={`/professor/tracking/${courseId}`}
          className="btn btn-primary btn-sm"
          style={{ flexShrink: 0 }}
        >
          Ouvrir le suivi <ChevronUp size={14} style={{ transform: 'rotate(90deg)' }} />
        </Link>
      </div>
    </Layout>
  );
}
