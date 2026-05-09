import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Medal, Trophy, Users, Zap, Calendar, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { logError } from '../utils/logger.js';

/* ─── Medal colours for top 3 ─────────────────────────────────────────────── */
const PODIUM = [
  { color: '#F59E0B', bg: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', label: '2e', size: 80, order: 1 },
  { color: '#1B4F72', bg: 'linear-gradient(135deg,#EFF6FF,#BFDBFE)', label: '1er', size: 100, order: 0 },
  { color: '#9CA3AF', bg: 'linear-gradient(135deg,#F9FAFB,#E5E7EB)', label: '3e', size: 68, order: 2 },
];

function Avatar({ name, size = 40, color = '#1B4F72' }) {
  const initials = name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '?';
  return (
    <div
      style={{
        width:          size,
        height:         size,
        borderRadius:   '50%',
        background:     color,
        color:          '#fff',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontWeight:     700,
        fontSize:       size * 0.35,
        flexShrink:     0,
      }}
    >
      {initials}
    </div>
  );
}

function PodiumCard({ entry, meta }) {
  if (!entry) return <div style={{ flex: 1 }} />;
  return (
    <div
      style={{
        flex:          1,
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           '8px',
        order:         meta.order,
      }}
    >
      <Avatar
        name={`${entry.prenom} ${entry.nom}`}
        size={meta.size}
        color={meta.color}
      />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
          {entry.prenom} {entry.nom}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {entry.points} pts
        </div>
      </div>
      <div
        style={{
          background:   meta.bg,
          border:       `2px solid ${meta.color}`,
          borderRadius: '8px',
          padding:      '8px 20px',
          display:      'flex',
          flexDirection:'column',
          alignItems:   'center',
          minHeight:    meta.order === 0 ? '80px' : meta.order === 1 ? '60px' : '45px',
          justifyContent:'center',
          width:        '100%',
        }}
      >
        <span style={{ fontSize: '22px', fontWeight: 800, color: meta.color }}>
          {meta.label}
        </span>
      </div>
    </div>
  );
}

/* ─── F11B — Onglet Personal best : graphique XP cumulés sur 30 jours ─── */
function PersonalBestView({ data }) {
  const series = data?.series || [];
  const total = data?.totalLast30Days || 0;
  const max = Math.max(...series.map((p) => p.xpCumul), 1);

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
        padding: '14px 18px', borderRadius: 10,
        background: 'linear-gradient(135deg, #faf5ff, #eff6ff)',
        border: '1px solid #e9d5ff',
      }}>
        <TrendingUp size={20} color="#7c3aed" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>30 DERNIERS JOURS</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#7c3aed' }}>+{total} XP</div>
        </div>
      </div>

      {series.length > 0 && max > 1 ? (
        <div style={{ height: 280, background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#7c3aed" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(d) => d.slice(5)}
                interval={Math.ceil(series.length / 8)}
              />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                labelFormatter={(d) => new Date(d).toLocaleDateString('fr-FR')}
                formatter={(value, name) => [`${value} XP`, name === 'xpCumul' ? 'Cumul' : 'Gagné']}
              />
              <Area type="monotone" dataKey="xpCumul" stroke="#7c3aed" strokeWidth={2} fill="url(#xpGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{
          padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13,
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
        }}>
          📈 Pas encore d'activité enregistrée. Regarde des capsules pour cumuler des XP visibles ici !
        </div>
      )}
    </div>
  );
}

export default function Leaderboard() {
  const { courseId } = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  // F11B — Onglets : 'cohort' | 'monthly' | 'personal' (par défaut cohort).
  // Si on arrive avec un courseId (legacy), on utilise le mode 'course'.
  const [mode,    setMode]    = useState(courseId ? 'course' : 'cohort');

  useEffect(() => {
    setLoading(true);
    let url;
    if (mode === 'course' && courseId) {
      url = `/leaderboard/course/${courseId}`;
    } else if (['cohort', 'monthly', 'personal'].includes(mode)) {
      url = `/leaderboard?scope=${mode}`;
    } else {
      url = '/leaderboard/global';
    }

    api.get(url)
      .then((r) => setData(r.data))
      .catch(logError)
      .finally(() => setLoading(false));
  }, [mode, courseId]);

  // Pour les modes cohort/monthly, le score peut être "points" (legacy) ou "score" (F11B)
  const entries = data?.entries ?? [];
  const normalizeEntry = (e) => ({ ...e, points: e.score ?? e.points });
  const top3    = entries.slice(0, 3).map(normalizeEntry);
  const rest    = entries.slice(3).map(normalizeEntry);
  const myRank  = data?.myRank;
  const isPersonal = mode === 'personal';

  return (
    <Layout title="Classement">
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 0 40px' }}>

      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={15} /> Retour</button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Trophy size={22} color="var(--accent)" />
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Classement</h1>
        </div>
        {courseId && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {['course', 'global'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={mode === m ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
              >
                {m === 'course' ? 'Ce module' : 'Global'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* F11B — Onglets 3 scopes (uniquement quand pas de courseId) */}
      {!courseId && (
        <div style={{
          display: 'flex', gap: 0, marginBottom: 20, padding: 3,
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
          flexWrap: 'wrap',
        }}>
          {[
            { k: 'cohort',   label: 'Ma promotion',  Icon: Users },
            { k: 'monthly',  label: 'Top du mois',   Icon: Calendar },
            { k: 'personal', label: 'Ma progression', Icon: TrendingUp },
          ].map(({ k, label, Icon }) => (
            <button
              key={k}
              onClick={() => setMode(k)}
              style={{
                flex: 1, minWidth: 120,
                padding: '8px 14px', borderRadius: 7, border: 'none',
                background: mode === k ? 'white' : 'transparent',
                color: mode === k ? '#1e293b' : '#64748b',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: mode === k ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 120ms',
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      )}

      {/* F11B — Vue personal : graphique 30j (avant les vues classement) */}
      {!loading && isPersonal && <PersonalBestView data={data} />}

      {loading && !isPersonal && (
        <div className="empty-state">Chargement du classement…</div>
      )}

      {!loading && !isPersonal && entries.length === 0 && (
        <div className="empty-state">
          <Users size={32} />
          <p>
            {mode === 'monthly'
              ? "Personne n'a encore gagné d'XP ce mois-ci. Sois le premier !"
              : 'Aucun étudiant inscrit pour l\'instant.'}
          </p>
        </div>
      )}

      {!loading && !isPersonal && entries.length > 0 && (
        <>
          {/* My rank banner */}
          {myRank && (
            <div
              style={{
                background:   'linear-gradient(135deg,#1B4F72,#2874A6)',
                borderRadius: '8px',
                padding:      '12px 20px',
                marginBottom: '24px',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'space-between',
                color:        '#fff',
              }}
            >
              <span style={{ fontSize: '14px', opacity: 0.85 }}>Votre classement</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} fill="#E8A838" stroke="#E8A838" />
                <span style={{ fontWeight: 700, fontSize: '18px' }}>#{myRank}</span>
              </div>
            </div>
          )}

          {/* Podium */}
          {top3.length >= 1 && (
            <div
              style={{
                display:        'flex',
                gap:            '12px',
                alignItems:     'flex-end',
                marginBottom:   '32px',
                padding:        '24px',
                background:     'var(--surface)',
                borderRadius:   '8px',
                border:         '1px solid var(--border)',
              }}
            >
              <PodiumCard entry={top3[1]} meta={PODIUM[0]} />
              <PodiumCard entry={top3[0]} meta={PODIUM[1]} />
              <PodiumCard entry={top3[2]} meta={PODIUM[2]} />
            </div>
          )}

          {/* Rest of leaderboard */}
          {rest.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {rest.map((entry) => {
                const isMe = entry.userId?.toString() === user?._id?.toString();
                return (
                  <div
                    key={entry.userId}
                    style={{
                      display:      'flex',
                      alignItems:   'center',
                      gap:          '12px',
                      padding:      '12px 16px',
                      background:   isMe ? 'rgba(27,79,114,0.06)' : 'var(--surface)',
                      borderRadius: '8px',
                      border:       `1px solid ${isMe ? 'var(--primary)' : 'var(--border)'}`,
                    }}
                  >
                    <span
                      style={{
                        width:      '28px',
                        textAlign:  'center',
                        fontWeight: 700,
                        color:      'var(--text-muted)',
                        fontSize:   '14px',
                        flexShrink: 0,
                      }}
                    >
                      #{entry.rank}
                    </span>
                    <Avatar
                      name={`${entry.prenom} ${entry.nom}`}
                      size={36}
                      color={isMe ? '#1B4F72' : '#9CA3AF'}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight:   isMe ? 700 : 500,
                          fontSize:     '14px',
                          color:        'var(--text-primary)',
                          whiteSpace:   'nowrap',
                          overflow:     'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {entry.prenom} {entry.nom}
                        {isMe && <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>(vous)</span>}
                      </div>
                      {entry.badgesCount > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {entry.badgesCount} badge{entry.badgesCount > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Zap size={13} color="var(--accent)" fill="var(--accent)" />
                      <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                        {entry.points}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
    </Layout>
  );
}
