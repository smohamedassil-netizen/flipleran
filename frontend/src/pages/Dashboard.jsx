import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import {
  BookOpen, BarChart2, Award, Zap,
  ChevronRight, Video, Brain,
  MessageSquare, Trophy, Swords,
} from 'lucide-react';

/* ─── Quick action card ──────────────────────────────────────────────── */
function QuickAction({ icon: Icon, label, description, to, color }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="course-card"
      style={{
        width: '100%', textAlign: 'left', border: '1px solid var(--color-border)',
        background: 'none', padding: 16, display: 'flex', alignItems: 'center', gap: 14,
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 'var(--radius-md)', flexShrink: 0,
        backgroundColor: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)', margin: 0 }}>{label}</p>
        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>{description}</p>
      </div>
      <ChevronRight size={14} color="var(--color-text-disabled)" />
    </button>
  );
}

export default function Dashboard() {
  const { user, refreshMe } = useAuth();
  const navigate       = useNavigate();

  // Sync user points/badges from server on mount
  useEffect(() => { refreshMe(); }, [refreshMe]);

  const [courses,    setCourses]    = useState([]);
  const [progresses, setProgresses] = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/courses'),
      api.get('/progress'),
    ])
      .then(([coursesRes, progressRes]) => {
        setCourses(coursesRes.data ?? []);
        setProgresses(Array.isArray(progressRes.data) ? progressRes.data : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* ── Computed stats ────────────────────────────────────────────────── */
  const completedVideos = progresses.reduce((s, p) => s + (p.videosCompleted?.length ?? 0), 0);
  const totalAvailable  = progresses.reduce((s, p) => s + (p.totalVideos ?? p.videosCompleted?.length ?? 0), 0);
  const allQcm          = progresses.flatMap((p) => p.qcmScores ?? []);
  const videosLabel     = totalAvailable > 0
    ? `${completedVideos} / ${totalAvailable}`
    : `${completedVideos}`;

  const displayName = user?.prenom
    ? `${user.prenom} ${user.nom ?? ''}`
    : user?.name ?? 'Utilisateur';

  const stats = [
    { label: 'Points XP',         value: user?.points ?? 0, icon: Zap,       color: 'var(--color-accent)' },
    { label: 'Cours inscrits',    value: courses.length,    icon: BookOpen,  color: 'var(--color-primary)' },
    { label: 'Vidéos terminées',  value: videosLabel,       icon: Video,     color: '#3B82F6', sub: '(à 80%+)' },
    { label: 'QCM complétés',     value: allQcm.length,     icon: BarChart2, color: '#10B981' },
  ];

  return (
    <Layout title="Tableau de bord">
      {/* ── Welcome header ─────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          padding: '28px 32px',
          marginBottom: 24,
          background: 'linear-gradient(135deg, #1B4F72 0%, #2874A6 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>
            Bonjour, {displayName} !
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '14px', opacity: 0.85 }}>
            Voici un aperçu de votre activité sur FlipLearn.
          </p>
        </div>
        <Brain size={48} style={{ opacity: 0.3, flexShrink: 0 }} />
      </div>

      {/* ── Stats row (responsive) ────────────────────────────────── */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {stats.map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="stat-card-label">{label}</span>
              <div style={{
                width: 32, height: 32, borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={16} color={color} />
              </div>
            </div>
            <div className="stat-card-value">{loading ? '...' : value}</div>
            {sub && <div style={{ fontSize: 10, color: 'var(--color-text-disabled)', marginTop: 2 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Mes cours (pleine largeur, focus principal) ─────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title">Mes cours</span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/courses')} aria-label="Voir tous mes cours">
            Voir tout <ChevronRight size={14} />
          </button>
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 48, width: '100%' }} />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="empty-state" style={{ padding: 32 }}>
            <BookOpen size={28} className="empty-state-icon" />
            <p className="empty-state-title">Aucun cours</p>
            <p className="empty-state-desc">Les cours apparaîtront ici une fois disponibles.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 0 8px' }}>
            {courses.slice(0, 5).map((c) => (
              <button
                key={c._id}
                onClick={() => navigate(`/courses/${c._id}`)}
                className="video-row"
                style={{ border: 'none', background: 'none', padding: '10px 16px' }}
                aria-label={`Ouvrir le cours ${c.titre}`}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <BookOpen size={16} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.titre}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
                    {c.filiere} · {c.promotion}
                  </p>
                </div>
                <ChevronRight size={14} color="var(--color-text-disabled)" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick actions ─────────────────────────────────────────── */}
      <div>
        <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 14 }}>
          Accès rapide
        </h2>
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <QuickAction icon={Trophy} label="Classement" description="Voir votre rang" to="/leaderboard" color="var(--color-accent)" />
          <QuickAction icon={Swords} label="Quiz Battle" description="Défier un camarade" to="/quiz-battle" color="var(--color-error)" />
          <QuickAction icon={MessageSquare} label="Messages" description="Discuter avec vos contacts" to="/chat" color="var(--color-primary)" />
          <QuickAction icon={Award} label="Mon profil" description="Voir mes badges" to="/profile" color="var(--color-success)" />
        </div>
      </div>
    </Layout>
  );
}
