import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import { capitalizeWords } from '../utils/format.js';
import StreakFlame from '../components/StreakFlame.jsx';
import LevelBadge from '../components/LevelBadge.jsx';
import WeeklyQuestsCard from '../components/WeeklyQuestsCard.jsx';
import CycleDiagram from '../components/CycleDiagram.jsx';
import {
  BookOpen, BarChart2, Award, Zap,
  ChevronRight, Video, Brain,
  MessageSquare, Trophy, Swords,
  Calendar, Clock, FileText, CheckCircle, AlertCircle,
  Layers,
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

/* ─── Bloc "Cette semaine" ───────────────────────────────────────────── */
const DAYS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function fmtDeadline(date) {
  const d = new Date(date);
  return `${DAYS_FR[d.getDay()].charAt(0).toUpperCase() + DAYS_FR[d.getDay()].slice(1)} ${String(d.getDate()).padStart(2, '0')} ${MONTHS_FR[d.getMonth()]}`;
}

function hoursUntil(date) {
  return (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60);
}

function UpcomingDeadlines({ items, loading }) {
  const navigate = useNavigate();

  return (
    <div className="card" style={{ padding: 20, marginBottom: 24 }}>
      <h2 style={{
        fontSize: 'var(--font-size-md)', fontWeight: 700,
        color: 'var(--color-text)',
        margin: '0 0 14px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Calendar size={18} color="var(--color-primary)" />
        Cette semaine
      </h2>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 52, borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.4s infinite',
            }} />
          ))}
          <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div style={{
          padding: '14px 16px',
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: 'var(--radius-md)',
          color: '#15803D',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <CheckCircle size={18} />
          <span>Tout est à jour ! Aucune deadline cette semaine. ✅</span>
        </div>
      )}

      {!loading && items.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item) => {
            const hours = hoursUntil(item.deadline);
            const imminent = !item.done && hours <= 24;
            const TypeIcon = item.type === 'video' ? Video : FileText;
            return (
              <li
                key={`${item.type}-${item.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px',
                  background: 'white',
                  border: `1px solid ${imminent ? '#FCA5A5' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  transition: 'border-color 150ms',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-md)',
                  background: item.type === 'video' ? '#EBF5FB' : '#FEF6E7',
                  color: item.type === 'video' ? '#1B4F72' : '#B45309',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <TypeIcon size={18} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.titre || (item.type === 'video' ? 'Vidéo' : 'QCM')}
                  </div>
                  <div style={{
                    fontSize: 11, color: 'var(--color-text-secondary)',
                    display: 'flex', alignItems: 'center', gap: 6, marginTop: 2,
                    flexWrap: 'wrap',
                  }}>
                    {item.cours && <span>{item.cours} ·</span>}
                    <Clock size={11} style={{ display: 'inline-block' }} />
                    <span>{fmtDeadline(item.deadline)}</span>
                  </div>
                </div>

                {/* Badge statut */}
                {item.done ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 10px', borderRadius: 999,
                    background: '#F0FDF4', color: '#16A34A',
                    fontSize: 11, fontWeight: 700,
                  }}>
                    <CheckCircle size={11} /> Fait
                  </span>
                ) : (
                  <span
                    className={imminent ? 'pulse-urgent' : undefined}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 999,
                      background: imminent ? '#FEE2E2' : '#FEF3C7',
                      color: imminent ? '#DC2626' : '#92400E',
                      fontSize: 11, fontWeight: 700,
                    }}
                  >
                    <AlertCircle size={11} /> À faire
                  </span>
                )}

                <button
                  onClick={() => navigate(item.link)}
                  style={{
                    padding: '6px 12px', borderRadius: 'var(--radius-md)',
                    background: 'var(--color-primary)', color: 'white',
                    border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    flexShrink: 0,
                  }}
                >
                  Voir <ChevronRight size={12} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Animation pulse pour les deadlines imminentes (< 24h) */}
      <style>{`
        @keyframes pulse-urgent-anim {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.5); }
          50%      { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
        }
        .pulse-urgent { animation: pulse-urgent-anim 1.6s ease-in-out infinite; }
      `}</style>
    </div>
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
  const [upcoming,   setUpcoming]   = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [dueCards, setDueCards] = useState(null); // F6 — { count, decks }
  // CAI — diagramme cycle pour le 1er cours par défaut + dropdown switch
  const [cycleSelectedCourseId, setCycleSelectedCourseId] = useState(null);
  const [cycleSteps, setCycleSteps] = useState(null);
  // Bandeau d'accueil CAI dismissible (1 seule fois par utilisateur via localStorage)
  const [showCaiBanner, setShowCaiBanner] = useState(() => {
    try { return !localStorage.getItem('cai-banner-seen'); } catch { return false; }
  });

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

  // F6 — Cartes à réviser aujourd'hui (SM-2). Étudiant uniquement.
  useEffect(() => {
    if (user?.role && user.role !== 'etudiant') return;
    api.get('/decks/due-today')
      .then((r) => setDueCards(r.data || { count: 0, decks: [] }))
      .catch(() => setDueCards(null));
  }, [user?.role]);

  // CAI — sélectionner par défaut le 1er cours dès qu'ils sont chargés
  useEffect(() => {
    if (!cycleSelectedCourseId && courses.length > 0 && user?.role === 'etudiant') {
      setCycleSelectedCourseId(courses[0]._id);
    }
  }, [courses, cycleSelectedCourseId, user?.role]);

  // CAI — charger le journey du cours sélectionné
  useEffect(() => {
    if (!cycleSelectedCourseId || user?.role !== 'etudiant') return;
    api.get(`/journey/me/${cycleSelectedCourseId}`)
      .then(({ data }) => setCycleSteps(data.steps))
      .catch(() => setCycleSteps(null));
  }, [cycleSelectedCourseId, user?.role]);

  const dismissCaiBanner = () => {
    try { localStorage.setItem('cai-banner-seen', '1'); } catch { /* private mode */ }
    setShowCaiBanner(false);
  };

  // Section "Cette semaine" : deadlines J+0 à J+7. Réservé aux étudiants
  // (l'endpoint backend renvoie 403 sinon — fail silently côté UI).
  useEffect(() => {
    if (user?.role && user.role !== 'etudiant') {
      setUpcomingLoading(false);
      return;
    }
    api.get('/progress/upcoming')
      .then(r => setUpcoming(Array.isArray(r.data) ? r.data : []))
      .catch(() => setUpcoming([]))
      .finally(() => setUpcomingLoading(false));
  }, [user?.role]);

  /* ── Computed stats ────────────────────────────────────────────────── */
  const completedVideos = progresses.reduce((s, p) => s + (p.videosCompleted?.length ?? 0), 0);
  const totalAvailable  = progresses.reduce((s, p) => s + (p.totalVideos ?? p.videosCompleted?.length ?? 0), 0);
  const allQcm          = progresses.flatMap((p) => p.qcmScores ?? []);
  const videosLabel     = totalAvailable > 0
    ? `${completedVideos} / ${totalAvailable}`
    : `${completedVideos}`;

  // Le bonjour utilise uniquement le prénom (capitalisé) — plus chaleureux et cohérent.
  const displayName = user?.prenom
    ? capitalizeWords(user.prenom)
    : user?.name ?? 'Utilisateur';

  const stats = [
    { label: 'Points XP',         value: user?.points ?? 0, icon: Zap,       color: 'var(--color-accent)' },
    { label: 'Cours inscrits',    value: courses.length,    icon: BookOpen,  color: 'var(--color-primary)' },
    { label: 'Vidéos terminées',  value: videosLabel,       icon: Video,     color: '#3B82F6', sub: '(à 80%+)' },
    { label: 'QCM complétés',     value: allQcm.length,     icon: BarChart2, color: '#10B981' },
  ];

  /* ── Message d'accueil contextuel basé sur les deadlines ───────────── */
  const pendingTasks = upcoming.filter(i => !i.done).length;
  let welcomeSubtitle;
  if (upcomingLoading) {
    welcomeSubtitle = 'Voici un aperçu de votre activité sur FlipLearn.';
  } else if (user?.role === 'etudiant') {
    welcomeSubtitle = pendingTasks > 0
      ? `Vous avez ${pendingTasks} tâche${pendingTasks > 1 ? 's' : ''} à faire cette semaine.`
      : 'Tout est à jour ! Continuez comme ça. 🎉';
  } else {
    welcomeSubtitle = 'Voici un aperçu de votre activité sur FlipLearn.';
  }

  return (
    <Layout title="Tableau de bord">
      {/* ── Bandeau d'accueil CAI (étudiant, 1× max) ───────────────── */}
      {showCaiBanner && user?.role === 'etudiant' && (
        <div style={{
          background: 'linear-gradient(135deg, #9333EA 0%, #7C3AED 100%)',
          color: 'white',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 24, flexShrink: 0 }} aria-hidden="true">👋</span>
          <p style={{ margin: 0, flex: 1, fontSize: 13, lineHeight: 1.5, minWidth: 240 }}>
            <strong>Nouveau :</strong> ton parcours dans FlipLearn suit maintenant le{' '}
            <strong>Cycle d'Apprentissage Inversé</strong> en 5 étapes — préparation,
            rendez-vous, application, production, consolidation.
          </p>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => navigate('/my-journey')}
              style={{
                background: 'white', color: '#7C3AED',
                border: 'none', borderRadius: 6,
                padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Voir mon parcours →
            </button>
            <button
              type="button"
              onClick={dismissCaiBanner}
              aria-label="Fermer le message"
              style={{
                background: 'transparent', color: 'white',
                border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6,
                padding: '8px 12px', fontSize: 16, cursor: 'pointer', lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ── Cycle d'Apprentissage Inversé (étudiant, si au moins 1 cours) ─ */}
      {user?.role === 'etudiant' && courses.length > 0 && cycleSteps && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Mon cycle pour
            </p>
            <select
              value={cycleSelectedCourseId || ''}
              onChange={(e) => setCycleSelectedCourseId(e.target.value)}
              style={{
                padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1',
                background: 'white', fontSize: 13, fontWeight: 600, color: '#1B4F72', cursor: 'pointer',
              }}
            >
              {courses.map((c) => (
                <option key={c._id} value={c._id}>{c.titre}</option>
              ))}
            </select>
          </div>
          <CycleDiagram steps={cycleSteps} />
        </div>
      )}

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
            {welcomeSubtitle}
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

      {/* ── F11A — Bandeau STATUS étudiant : streak / niveau / flashcards ─── */}
      {user?.role === 'etudiant' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StreakFlame mode="card" />
          <LevelBadge mode="card" />
        </div>
      )}

      {/* ── F11A — Quêtes hebdomadaires IA ────────────────────────── */}
      {user?.role === 'etudiant' && (
        <div style={{ marginBottom: 24 }}>
          <WeeklyQuestsCard />
        </div>
      )}

      {/* ── Cette semaine — deadlines J+0 à J+7 ─────────────────────── */}
      {user?.role === 'etudiant' && (
        <UpcomingDeadlines items={upcoming} loading={upcomingLoading} />
      )}

      {/* ── F6 — Widget flashcards à réviser aujourd'hui (SM-2) ─────── */}
      {user?.role === 'etudiant' && dueCards !== null && (
        <button
          onClick={() => navigate('/decks')}
          aria-label="Voir mes flashcards à réviser"
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px 20px',
            marginBottom: 24,
            border: 'none',
            borderRadius: 'var(--radius-md)',
            background: dueCards.count > 0
              ? 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)'
              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            cursor: 'pointer',
            textAlign: 'left',
            boxShadow: '0 2px 8px rgba(124, 58, 237, 0.15)',
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)',
            background: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Layers size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {dueCards.count > 0
                ? `🃏 ${dueCards.count} carte${dueCards.count > 1 ? 's' : ''} à réviser aujourd'hui`
                : '✅ Tu es à jour sur tes révisions'}
            </div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
              {dueCards.count > 0
                ? `Méthode SM-2 (Wozniak, 1990) — ${dueCards.decks.length} deck${dueCards.decks.length > 1 ? 's' : ''} concerné${dueCards.decks.length > 1 ? 's' : ''}. Démarre une session de révision !`
                : 'Reviens demain pour de nouvelles cartes prêtes selon la courbe de l\'oubli.'}
            </div>
          </div>
          <ChevronRight size={18} style={{ opacity: 0.8, flexShrink: 0 }} />
        </button>
      )}

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
