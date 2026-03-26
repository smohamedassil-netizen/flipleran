import { useEffect, useState } from 'react';
import { Zap, Award } from 'lucide-react';

/**
 * Floating toast that animates in from the bottom-right,
 * shows earned points + any new badges, then fades out.
 *
 * Props:
 *   earned    {number}  — points gained
 *   newBadges {Array}   — badge objects { nom, icon, color, rarity }
 *   onDone    {()=>void}
 */
export default function PointsNotification({ earned = 0, newBadges = [], onDone }) {
  const [phase, setPhase] = useState('enter'); // enter → visible → leave

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 50);
    const t2 = setTimeout(() => setPhase('leave'),   2800);
    const t3 = setTimeout(() => onDone?.(),          3400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const translateY = phase === 'enter' ? '40px' : phase === 'leave' ? '40px' : '0px';
  const opacity    = phase === 'visible' ? 1 : 0;

  return (
    <div
      style={{
        pointerEvents: 'auto',
        transform:     `translateY(${translateY})`,
        opacity,
        transition:    'transform 0.35s cubic-bezier(.22,.68,0,1.2), opacity 0.3s ease',
        display:       'flex',
        flexDirection: 'column',
        gap:           '8px',
        minWidth:      '220px',
        maxWidth:      '300px',
      }}
    >
      {/* Points toast */}
      {earned > 0 && (
        <div
          style={{
            background:   'linear-gradient(135deg, #1B4F72 0%, #2874A6 100%)',
            color:        '#fff',
            borderRadius: '8px',
            padding:      '10px 16px',
            display:      'flex',
            alignItems:   'center',
            gap:          '10px',
            boxShadow:    '0 4px 16px rgba(27,79,114,0.35)',
          }}
        >
          <div
            style={{
              background:   'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              width:        '32px',
              height:       '32px',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              flexShrink:   0,
            }}
          >
            <Zap size={16} fill="#E8A838" stroke="#E8A838" />
          </div>
          <div>
            <div style={{ fontSize: '11px', opacity: 0.8, lineHeight: 1 }}>Points gagnés</div>
            <div style={{ fontSize: '20px', fontWeight: 700, lineHeight: 1.3 }}>+{earned} pts</div>
          </div>
        </div>
      )}

      {/* Badge toasts */}
      {newBadges?.map((badge, i) => (
        <div
          key={i}
          style={{
            background:   '#fff',
            border:       `2px solid ${badge.color ?? '#E8A838'}`,
            borderRadius: '8px',
            padding:      '10px 16px',
            display:      'flex',
            alignItems:   'center',
            gap:          '10px',
            boxShadow:    '0 4px 16px rgba(0,0,0,0.12)',
          }}
        >
          <div
            style={{
              background:   badge.color ?? '#E8A838',
              borderRadius: '50%',
              width:        '32px',
              height:       '32px',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              flexShrink:   0,
            }}
          >
            <Award size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Badge débloqué !
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {badge.nom}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
