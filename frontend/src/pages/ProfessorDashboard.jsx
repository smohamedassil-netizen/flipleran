import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import {
  Users, Video, CheckCircle, BarChart2,
  AlertTriangle, ChevronUp, ChevronDown,
  ChevronsUpDown, Search, RefreshCw, Upload,
  BookOpen, Clock, ArrowLeft,
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

const fmt = (date) => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(date));
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
  const rate  = video.completionRate;
  const color = completionColor(rate);
  const bg    = completionBg(rate);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '28px 1fr 160px 80px 64px',
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

/* ── Student table ──────────────────────────────────────── */
const SORT_FIELDS = {
  nom:            (s) => s.nom.toLowerCase(),
  videosDone:     (s) => s.videosDone,
  avgVideoPercent:(s) => s.avgVideoPercent,
  avgQCMScore:    (s) => s.avgQCMScore ?? -1,
  lastActivity:   (s) => new Date(s.lastActivity ?? 0).getTime(),
};

function SortIcon({ field, sort }) {
  if (sort.field !== field) return <ChevronsUpDown size={13} color="var(--color-text-disabled)" />;
  return sort.dir === 'asc'
    ? <ChevronUp   size={13} color={C_PRIMARY} />
    : <ChevronDown size={13} color={C_PRIMARY} />;
}

function StudentTable({ students }) {
  const [search, setSearch] = useState('');
  const [sort,   setSort]   = useState({ field: 'nom', dir: 'asc' });

  const toggleSort = (field) =>
    setSort((s) => s.field === field
      ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { field, dir: 'asc' }
    );

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = students.filter((s) =>
      `${s.nom} ${s.prenom} ${s.email}`.toLowerCase().includes(q)
    );
    const getter = SORT_FIELDS[sort.field];
    filtered.sort((a, b) => {
      const va = getter(a), vb = getter(b);
      return sort.dir === 'asc'
        ? (typeof va === 'string' ? va.localeCompare(vb) : va - vb)
        : (typeof va === 'string' ? vb.localeCompare(va) : vb - va);
    });
    return filtered;
  }, [students, search, sort]);

  const Th = ({ label, field }) => (
    <th
      onClick={() => toggleSort(field)}
      style={{
        padding: '10px 14px', textAlign: 'left',
        cursor: 'pointer', userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>
        {label} <SortIcon field={field} sort={sort} />
      </span>
    </th>
  );

  return (
    <div>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 14, maxWidth: 300 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-disabled)', pointerEvents: 'none' }} />
        <input
          className="form-input"
          style={{ paddingLeft: 32, fontSize: 'var(--font-size-sm)' }}
          placeholder="Rechercher un étudiant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <Th label="Nom"        field="nom" />
              <th style={{ padding: '10px 14px', fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>
                Filière / Promo
              </th>
              <Th label="Vidéos vues"   field="videosDone" />
              <Th label="Moy. vidéo"    field="avgVideoPercent" />
              <Th label="Score QCM"     field="avgQCMScore" />
              <Th label="Dernière activité" field="lastActivity" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                  Aucun étudiant trouvé.
                </td>
              </tr>
            ) : rows.map((s) => {
              const videoRatio = `${s.videosDone}/${s.totalVideos}`;
              const videoPct   = s.totalVideos > 0
                ? Math.round((s.videosDone / s.totalVideos) * 100) : 0;
              const qcmColor   = s.avgQCMScore === null ? 'var(--color-text-disabled)'
                : s.avgQCMScore >= 70 ? C_SUCCESS
                : s.avgQCMScore >= 50 ? C_WARNING
                : C_ERROR;

              return (
                <tr key={s._id}>
                  {/* Nom + prénom */}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ fontSize: 'var(--font-size-xs)' }}>
                        {s.nom[0]?.toUpperCase()}{s.prenom[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
                          {s.nom} {s.prenom}
                        </p>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                          {s.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Filière */}
                  <td style={{ padding: '12px 14px' }}>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text)' }}>{s.filiere || '—'}</p>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>{s.promotion || ''}</p>
                  </td>

                  {/* Vidéos vues */}
                  <td style={{ padding: '12px 14px' }}>
                    <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
                      {videoRatio}
                      <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 6 }}>
                        ({videoPct}%)
                      </span>
                    </p>
                    <div style={{ height: 4, backgroundColor: C_BORDER, borderRadius: 2, width: 80, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${videoPct}%`, backgroundColor: completionColor(videoPct), borderRadius: 2 }} />
                    </div>
                  </td>

                  {/* Moy. vidéo */}
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: completionColor(s.avgVideoPercent) }}>
                      {s.avgVideoPercent}%
                    </span>
                  </td>

                  {/* Score QCM */}
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    {s.avgQCMScore === null ? (
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)' }}>Non tenté</span>
                    ) : (
                      <div>
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: qcmColor }}>
                          {s.avgQCMScore}%
                        </span>
                        <p style={{ fontSize: 10, color: 'var(--color-text-disabled)' }}>
                          {s.qcmAttempts} tentative{s.qcmAttempts > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </td>

                  {/* Dernière activité */}
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                      {fmt(s.lastActivity)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)', marginTop: 8 }}>
        {rows.length} étudiant{rows.length > 1 ? 's' : ''} affiché{rows.length > 1 ? 's' : ''}
      </p>
    </div>
  );
}

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

  /* ── Load course list for selector ─────────────────── */
  useEffect(() => {
    api.get('/professor/courses').then(({ data }) => setCourses(data)).catch(() => {});
  }, []);

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
        <div className="alert alert-error" style={{ maxWidth: 480 }}>
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      </Layout>
    );
  }

  if (!data) return null;

  const { course, globalStats, videoStats, qcmAnalysis, students } = data;

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
            to={`/professor/courses/${courseId}/upload`}
            className="btn btn-primary btn-sm"
          >
            <Upload size={14} /> Ajouter une vidéo
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
          sub="dans ce cours"
          icon={Users}
        />
        <StatCard
          label="Complétion vidéos"
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
          label="Vidéos publiées"
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
            <span className="card-title">Suivi de visionnage par vidéo</span>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Indicateur de préparation avant le cours en présentiel
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
            <p className="empty-state-title">Aucune vidéo publiée</p>
            <p className="empty-state-desc">Ajoutez des vidéos pour voir le suivi des étudiants.</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 160px 80px 64px', gap: 12, padding: '6px 0 10px', borderBottom: `1px solid ${C_BORDER}`, marginBottom: 2 }}>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-disabled)', textAlign: 'center' }}>#</span>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Vidéo</span>
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
                    <strong style={{ color: 'var(--color-text)' }}>{count}</strong>/{total} vidéo{total > 1 ? 's' : ''} — {label}
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
            <p className="empty-state-desc">Associez un QCM à vos vidéos pour voir l'analyse.</p>
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
          SECTION 4 — LISTE ÉTUDIANTS
      ══════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span className="card-title">Étudiants inscrits</span>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {globalStats.totalStudents} étudiant{globalStats.totalStudents > 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: C_SUCCESS }} />
              <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>≥70%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: C_WARNING }} />
              <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>50-70%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: C_ERROR }} />
              <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>&lt;50%</span>
            </div>
          </div>
        </div>

        {students.length === 0 ? (
          <div className="empty-state">
            <Users size={28} className="empty-state-icon" />
            <p className="empty-state-title">Aucun étudiant inscrit</p>
            <p className="empty-state-desc">Les étudiants apparaissent ici dès qu'ils commencent le cours.</p>
          </div>
        ) : (
          <StudentTable students={students} />
        )}
      </div>
    </Layout>
  );
}
