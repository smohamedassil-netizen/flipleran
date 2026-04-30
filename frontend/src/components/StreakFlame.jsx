import { useEffect, useState } from 'react';
import api from '../utils/api.js';
import { Flame, Shield } from 'lucide-react';

/**
 * StreakFlame — Indicateur compact "🔥 X jours" pour le header / Layout
 * étudiant (F11A sprint-final).
 *
 * Cadre théorique :
 * @see Werbach & Hunter (2012). For the Win — gamification.
 * @see Deci & Ryan (1985). SDT — visualiser une régularité active la
 *      motivation autodéterminée (besoin de compétence).
 *
 * Comportement :
 *  - Mode 'compact'  : flamme + chiffre cliquable (header).
 *  - Mode 'card'     : card complète avec longest, savedDays (Dashboard).
 *  - Animation flame se balance subtilement quand isActiveToday.
 *  - Refresh : le composant fetch /api/streak au mount (ne re-poll pas, le
 *    parent peut le forcer avec un key= prop).
 */

export default function StreakFlame({ mode = 'compact', onClick }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/streak')
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return null;

  const days = data.currentStreak;
  const active = data.isActiveToday;
  const flameColor = days >= 30 ? '#dc2626' : days >= 7 ? '#f59e0b' : days >= 1 ? '#fb923c' : '#94a3b8';

  if (mode === 'compact') {
    return (
      <button
        type="button"
        onClick={onClick}
        title={`Streak ${days} jour${days > 1 ? 's' : ''} · longest ${data.longestStreak}${data.savedDays > 0 ? ` · ${data.savedDays} freeze${data.savedDays > 1 ? 's' : ''}` : ''}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'transparent', border: 'none', cursor: onClick ? 'pointer' : 'default',
          padding: '4px 8px', borderRadius: 6,
          transition: 'background 120ms',
        }}
        onMouseEnter={(e) => onClick && (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Flame
          size={15}
          color={flameColor}
          style={{ animation: active && days > 0 ? 'flame-flicker 1.4s ease-in-out infinite' : 'none' }}
        />
        <span style={{ fontSize: 13, fontWeight: 700, color: days > 0 ? flameColor : '#94a3b8' }}>
          {days}
        </span>
        <style>{`
          @keyframes flame-flicker {
            0%, 100% { transform: rotate(-2deg) scale(1); }
            50%      { transform: rotate(2deg)  scale(1.06); }
          }
        `}</style>
      </button>
    );
  }

  // mode='card'
  return (
    <div
      style={{
        background: days >= 7 ? 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)' : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
        border: `1px solid ${days >= 7 ? '#fde68a' : '#cbd5e1'}`,
        borderRadius: 12,
        padding: 16,
        display: 'flex', alignItems: 'center', gap: 14,
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: 'rgba(255,255,255,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Flame
          size={22}
          color={flameColor}
          style={{ animation: active && days > 0 ? 'flame-flicker 1.4s ease-in-out infinite' : 'none' }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: flameColor }}>{days}</span>
          <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
            jour{days > 1 ? 's' : ''} d'affilée
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
          Plus long : <strong>{data.longestStreak}</strong>
          {data.savedDays > 0 && (
            <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 3, color: '#0891b2' }}>
              <Shield size={10} /> {data.savedDays} freeze{data.savedDays > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {!active && days > 0 && (
          <div style={{ fontSize: 10.5, color: '#dc2626', marginTop: 3, fontWeight: 600 }}>
            ⚠️ Pas d'activité aujourd'hui — fais une vidéo pour ne pas perdre ta série !
          </div>
        )}
      </div>
    </div>
  );
}
