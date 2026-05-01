import { Lock, CheckCircle2 } from 'lucide-react';

/**
 * CycleDiagram — visualisation des 5 étapes du Cycle d'Apprentissage Inversé.
 *
 * Pas de lib externe : SVG natif pour les flèches, divs pour les cercles.
 * Animations CSS inline (pulse pour les étapes in-progress).
 *
 * Props :
 *   - steps : { preparation, rendezvous, application, production, consolidation }
 *     (mêmes objets que renvoie /api/journey/me/:courseId)
 */

const STEPS_META = [
  { key: 'preparation',   icon: '📚', short: 'Préparation',  tooltip: 'Avant le cours : regarde la vidéo et teste-toi avec le QCM.' },
  { key: 'rendezvous',    icon: '👥', short: 'Rendez-vous',  tooltip: 'Le cours en présentiel : viens préparé pour les activités ciblées.' },
  { key: 'application',   icon: '🧩', short: 'Application',  tooltip: 'Apprendre en faisant : le Prosit en groupe (méthode CESI).' },
  { key: 'production',    icon: '🚀', short: 'Production',   tooltip: 'Crée quelque chose d\'original qui synthétise tout le module.' },
  { key: 'consolidation', icon: '🔁', short: 'Consolidation', tooltip: 'Révision espacée pour ancrer les acquis dans la mémoire long terme.' },
];

function statusColors(status) {
  if (status === 'completed') return { bg: '#22C55E', border: '#15803D', text: 'white' };
  if (status === 'in-progress' || status === 'active' || status === 'upcoming')
    return { bg: '#F59E0B', border: '#B45309', text: 'white', pulse: true };
  return { bg: '#E2E8F0', border: '#CBD5E1', text: '#94A3B8' };
}

export default function CycleDiagram({ steps }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      padding: 18,
    }}>
      <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>
        Cycle d'Apprentissage Inversé
      </p>

      {/* Cercles + flèches en ligne (responsive : wrap en colonne sur petit écran) */}
      <div className="cycle-diagram-row" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        flexWrap: 'wrap',
      }}>
        {STEPS_META.map((meta, i) => {
          const step = steps[meta.key];
          const status = step?.status || 'locked';
          const colors = statusColors(status);
          const isCompleted = status === 'completed';
          const isLocked = status === 'locked' || status === 'unknown' || status === 'not-started';

          return (
            <div key={meta.key} style={{ display: 'flex', alignItems: 'center', flex: '1 1 auto', minWidth: 0 }}>
              {/* Le cercle + le label en dessous */}
              <div title={meta.tooltip} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 70 }}>
                <div
                  className={colors.pulse ? 'cycle-pulse' : ''}
                  style={{
                    width: 52, height: 52,
                    borderRadius: '50%',
                    background: colors.bg,
                    border: `2px solid ${colors.border}`,
                    color: colors.text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    position: 'relative',
                    transition: 'transform 200ms',
                  }}
                >
                  {isCompleted ? <CheckCircle2 size={22} /> : isLocked ? <Lock size={18} /> : <span aria-hidden="true">{meta.icon}</span>}
                </div>
                <p style={{
                  margin: 0,
                  fontSize: 10,
                  fontWeight: 700,
                  color: isLocked ? '#94A3B8' : '#1E293B',
                  textAlign: 'center',
                }}>
                  {i + 1}. {meta.short}
                </p>
              </div>

              {/* Flèche vers la suivante (sauf après la dernière) */}
              {i < STEPS_META.length - 1 && (
                <div className="cycle-arrow" style={{
                  flex: '0 0 auto',
                  margin: '0 4px',
                  marginTop: -18, // alignement vertical sur le cercle (label en dessous compense)
                  color: '#CBD5E1',
                  fontSize: 18,
                  fontWeight: 700,
                }} aria-hidden="true">→</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Animations + responsive */}
      <style>{`
        @keyframes cyclePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.45); }
          50%      { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
        }
        .cycle-pulse { animation: cyclePulse 1.6s ease-in-out infinite; }

        @media (max-width: 640px) {
          .cycle-diagram-row { flex-direction: column; align-items: stretch; }
          .cycle-arrow { display: none; }
        }
      `}</style>
    </div>
  );
}
