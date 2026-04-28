import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Medal, Trophy, Users, Zap } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';

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

export default function Leaderboard() {
  const { courseId } = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode,    setMode]    = useState(courseId ? 'course' : 'global');

  useEffect(() => {
    setLoading(true);
    const url = mode === 'course' && courseId
      ? `/leaderboard/course/${courseId}`
      : '/leaderboard/global';

    api.get(url)
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [mode, courseId]);

  const entries = data?.entries ?? [];
  const top3    = entries.slice(0, 3);
  const rest    = entries.slice(3);
  const myRank  = data?.myRank;

  return (
    <Layout title="Classement">
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 0 40px' }}>

      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={15} /> Retour</button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
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
                {m === 'course' ? 'Ce cours' : 'Global'}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="empty-state">Chargement du classement…</div>
      )}

      {!loading && entries.length === 0 && (
        <div className="empty-state">
          <Users size={32} />
          <p>Aucun étudiant inscrit pour l'instant.</p>
        </div>
      )}

      {!loading && entries.length > 0 && (
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
