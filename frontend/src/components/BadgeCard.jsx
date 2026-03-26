import {
  Award, BookOpen, CheckCircle, Crown, Play, Star, Trophy, Zap, Lock,
} from 'lucide-react';

/* Map Lucide icon name strings → components */
const ICON_MAP = { Award, BookOpen, CheckCircle, Crown, Play, Star, Trophy, Zap, Lock };

const RARITY_LABEL = { common: 'Commun', rare: 'Rare', epic: 'Épique' };
const RARITY_BG    = {
  common: 'linear-gradient(135deg,#F4F6F8 0%,#E8ECEF 100%)',
  rare:   'linear-gradient(135deg,#EEF2FF 0%,#DDD6FE 100%)',
  epic:   'linear-gradient(135deg,#FEF3C7 0%,#FDE68A 100%)',
};

/**
 * Props:
 *   badge   { nom, description, icon, color, rarity, condition } — badge object (may be null for locked)
 *   locked  {boolean}  — show as greyed-out / locked
 *   size    'sm' | 'md' (default 'md')
 */
export default function BadgeCard({ badge, locked = false, size = 'md' }) {
  if (!badge) return null;

  const IconComp = ICON_MAP[badge.icon] ?? Award;
  const isSmall  = size === 'sm';

  return (
    <div
      title={badge.condition}
      style={{
        background:    locked ? '#F4F6F8' : RARITY_BG[badge.rarity] ?? RARITY_BG.common,
        border:        `1.5px solid ${locked ? 'var(--border)' : badge.color ?? '#E8A838'}`,
        borderRadius:  '8px',
        padding:       isSmall ? '10px' : '16px',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           isSmall ? '6px' : '10px',
        textAlign:     'center',
        opacity:       locked ? 0.55 : 1,
        transition:    'transform 0.15s, box-shadow 0.15s',
        cursor:        'default',
        position:      'relative',
        minWidth:      isSmall ? '90px' : '120px',
      }}
      onMouseEnter={(e) => {
        if (!locked) {
          e.currentTarget.style.transform  = 'translateY(-2px)';
          e.currentTarget.style.boxShadow  = '0 4px 12px rgba(0,0,0,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      {/* Rarity ribbon */}
      {!locked && badge.rarity !== 'common' && (
        <span
          style={{
            position:     'absolute',
            top:          '-1px',
            right:        '-1px',
            background:   badge.color ?? '#E8A838',
            color:        '#fff',
            fontSize:     '9px',
            fontWeight:   700,
            padding:      '2px 6px',
            borderRadius: '0 8px 0 6px',
            textTransform:'uppercase',
            letterSpacing:'0.4px',
          }}
        >
          {RARITY_LABEL[badge.rarity]}
        </span>
      )}

      {/* Icon circle */}
      <div
        style={{
          width:          isSmall ? '36px' : '52px',
          height:         isSmall ? '36px' : '52px',
          borderRadius:   '50%',
          background:     locked ? '#D1D5DB' : badge.color ?? '#E8A838',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexShrink:     0,
        }}
      >
        {locked
          ? <Lock size={isSmall ? 14 : 20} color="#fff" />
          : <IconComp size={isSmall ? 16 : 24} color="#fff" />
        }
      </div>

      {/* Text */}
      <div>
        <div
          style={{
            fontSize:   isSmall ? '11px' : '13px',
            fontWeight: 700,
            color:      locked ? 'var(--text-muted)' : 'var(--text-primary)',
            lineHeight: 1.2,
          }}
        >
          {badge.nom}
        </div>
        {!isSmall && (
          <div
            style={{
              fontSize:  '11px',
              color:     'var(--text-muted)',
              marginTop: '3px',
              lineHeight: 1.3,
            }}
          >
            {badge.description}
          </div>
        )}
      </div>
    </div>
  );
}
