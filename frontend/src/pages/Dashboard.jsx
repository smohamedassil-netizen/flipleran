import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDecks } from '../hooks/useDecks.js';
import api from '../utils/api.js';
import {
  BookOpen, BarChart2, TrendingUp, Award, Zap,
  ChevronRight, Play, Video, Users, Brain,
  MessageSquare, Trophy, Swords, Library,
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
  const { user }      = useAuth();
  const navigate       = useNavigate();
  const { decks, loading: decksLoading } = useDecks();

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
  const totalVideos = progresses.reduce((s, p) => s + (p.videosCompleted?.length ?? 0), 0);
  const allQcm      = progresses.flatMap((p) => p.qcmScores ?? []);

  const displayName = user?.prenom
    ? `${user.prenom} ${user.nom ?? ''}`
    : user?.name ?? 'Utilisateur';

  const stats = [
    { label: 'Points XP',        value: user?.points ?? 0,  icon: Zap,       color: '#E8A838' },
    { label: 'Cours inscrits',   value: courses.length,     icon: BookOpen,  color: '#1B4F72' },
    { label: 'Vidéos terminées', value: totalVideos,         icon: Video,     color: '#3B82F6' },
    { label: 'QCM complétés',    value: allQcm.length,      icon: BarChart2, color: '#10B981' },
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
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="stat-card-label">{label}</span>
              <div style={{
                width: 32, height: 32, borderRadius: 'var(--radius-md)',
                backgroundColor: color + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={16} color={color} />
              </div>
            </div>
            <div className="stat-card-value">{loading ? '...' : value}</div>
          </div>
        ))}
      </div>

      {/* ── Main content (responsive grid) ────────────────────────── */}
      <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Mes cours */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">Mes cours</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/courses')}>
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
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, #1B4F72, #2874A6)',
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

        {/* Mes decks */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">Mes decks</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/decks')}>
              Voir tout <ChevronRight size={14} />
            </button>
          </div>
          {decksLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 16 }}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 70, width: '100%' }} />)}
            </div>
          ) : decks.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <Library size={28} className="empty-state-icon" />
              <p className="empty-state-title">Aucun deck</p>
              <p className="empty-state-desc">Créez votre premier deck pour réviser.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: '0 16px 12px' }}>
              {decks.slice(0, 4).map((deck) => (
                <div
                  key={deck._id}
                  className="course-card"
                  style={{ padding: 14 }}
                  onClick={() => navigate(`/study/${deck._id}`)}
                >
                  <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)', margin: 0 }}>
                    {deck.title}
                  </p>
                  <p className="text-small" style={{ marginTop: 4 }}>
                    {deck.cardCount} cartes · {deck.category}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick actions ─────────────────────────────────────────── */}
      <div>
        <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 14 }}>
          Accès rapide
        </h2>
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <QuickAction icon={Trophy} label="Classement" description="Voir votre rang" to="/leaderboard" color="#E8A838" />
          <QuickAction icon={Swords} label="Quiz Battle" description="Défier un camarade" to="/quiz-battle" color="#EF4444" />
          <QuickAction icon={MessageSquare} label="Messages" description="Discuter avec vos contacts" to="/chat" color="#3B82F6" />
          <QuickAction icon={Award} label="Mon profil" description="Voir mes badges" to="/profile" color="#10B981" />
        </div>
      </div>
    </Layout>
  );
}
