import { useEffect, useState } from 'react';
import api from '../utils/api.js';
import { Award } from 'lucide-react';

/**
 * LevelBadge — Indicateur de niveau (Débutant → Maître) avec barre de
 * progression. F11A sprint-final.
 *
 * Modes :
 *  - 'compact' : badge texte coloré (header).
 *  - 'card'    : card avec barre de progression vers niveau suivant.
 */

export default function LevelBadge({ mode = 'compact' }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/levels/me')
      .then((r) => setData(r.data))
      .catch(() => setData(null));
  }, []);

  if (!data) return null;

  if (mode === 'compact') {
    return (
      <span
        title={`${data.title} · ${data.current} XP${data.next ? ` · ${data.pointsToNext} XP pour ${data.next}` : ''}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 8px',
          background: data.color + '22',
          color: data.color,
          fontSize: 11, fontWeight: 700,
          borderRadius: 999,
          border: `1px solid ${data.color}55`,
        }}
      >
        <Award size={11} /> {data.title}
      </span>
    );
  }

  // mode='card'
  return (
    <div
      style={{
        background: data.color + '11',
        border: `1px solid ${data.color}44`,
        borderRadius: 12,
        padding: 16,
        display: 'flex', alignItems: 'center', gap: 14,
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: data.color, color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontWeight: 800,
      }}>
        <Award size={22} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: data.color }}>{data.title}</span>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{data.current} XP</span>
        </div>
        {/* Barre de progression */}
        {data.next && (
          <>
            <div style={{
              marginTop: 6, height: 6,
              background: 'rgba(0,0,0,0.06)', borderRadius: 999, overflow: 'hidden',
            }}>
              <div style={{
                width: `${data.progressPercent}%`,
                height: '100%', background: data.color,
                transition: 'width 300ms',
              }} />
            </div>
            <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 4 }}>
              {data.pointsToNext} XP pour atteindre <strong style={{ color: data.color }}>{data.next}</strong>
            </div>
          </>
        )}
        {!data.next && (
          <div style={{ fontSize: 10.5, color: '#92400e', marginTop: 4, fontWeight: 600 }}>
            🏆 Niveau maximum atteint !
          </div>
        )}
      </div>
    </div>
  );
}
