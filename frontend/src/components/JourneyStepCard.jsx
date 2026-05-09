import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, CircleDashed, ArrowRight, Info } from 'lucide-react';

/**
 * JourneyStepCard — affiche 1 des 5 étapes du Cycle d'Apprentissage Inversé.
 *
 * Couleurs :
 *   - completed  → vert plein
 *   - in-progress / active / upcoming → orange
 *   - not-started / locked / unknown → gris
 *
 * Props :
 *   - icon      : emoji
 *   - title     : intitulé court (PRÉPARATION, RENDEZ-VOUS, …)
 *   - subtitle  : phrase d'aide pédagogique courte (tooltip-friendly)
 *   - status    : 'completed' | 'in-progress' | 'not-started' | 'active' | 'locked' | 'upcoming' | 'unknown'
 *   - detail    : string courte (ex: "Capsules : 2/4 · QCM : 1/3")
 *   - actionLabel : libellé du bouton (ex: "Continuer")
 *   - actionTo    : route React Router
 *   - lockedReason : tooltip si locked
 */
export default function JourneyStepCard({
  icon, title, subtitle, status, detail, actionLabel, actionTo, lockedReason,
}) {
  const navigate = useNavigate();

  const isCompleted   = status === 'completed';
  const isInProgress  = status === 'in-progress' || status === 'active' || status === 'upcoming';
  const isLocked      = status === 'locked';
  const isUnknown     = status === 'unknown';

  // Palette cohérente avec le reste de l'app
  const palette = isCompleted ? {
    bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', accent: '#22C55E',
  } : isInProgress ? {
    bg: '#FEF3C7', border: '#FDE68A', text: '#B45309', accent: '#F59E0B',
  } : {
    bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B', accent: '#94A3B8',
  };

  const StatusIcon = isCompleted ? CheckCircle2 : (isLocked ? Lock : CircleDashed);
  const showAction = actionLabel && actionTo && !isLocked && !isUnknown;
  const buttonDisabled = isLocked;

  return (
    <div
      style={{
        background: palette.bg,
        border: `1.5px solid ${palette.border}`,
        borderRadius: 10,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 180,
        opacity: isLocked ? 0.7 : 1,
        transition: 'transform 120ms, box-shadow 120ms',
      }}
      onMouseEnter={(e) => { if (!isLocked) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; } }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
      title={isLocked ? lockedReason : subtitle}
    >
      {/* Header : icône + statut + info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 24 }} aria-hidden="true">{icon}</span>
        <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
          <span title={subtitle} style={{ display: 'inline-flex', cursor: 'help' }}>
            <Info size={13} color={palette.accent} style={{ opacity: 0.7 }} />
          </span>
          <StatusIcon size={16} color={palette.accent} />
        </div>
      </div>

      {/* Titre */}
      <div>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: palette.text, letterSpacing: 0.5 }}>
          {title}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 10, color: palette.text, opacity: 0.75, lineHeight: 1.3 }}>
          {subtitle}
        </p>
      </div>

      {/* Détail dynamique (compteurs) */}
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: palette.text }}>
          {detail}
        </p>
      </div>

      {/* CTA */}
      {showAction && (
        <button
          type="button"
          onClick={() => navigate(actionTo)}
          disabled={buttonDisabled}
          style={{
            background: palette.accent,
            color: 'white',
            border: 'none',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 12,
            fontWeight: 600,
            cursor: buttonDisabled ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          {actionLabel} <ArrowRight size={12} />
        </button>
      )}

      {isLocked && (
        <p style={{ margin: 0, fontSize: 10, color: '#94A3B8', fontStyle: 'italic' }}>
          🔒 {lockedReason}
        </p>
      )}

      {isUnknown && (
        <p style={{ margin: 0, fontSize: 10, color: '#94A3B8', fontStyle: 'italic' }}>
          Calendrier non renseigné
        </p>
      )}
    </div>
  );
}
