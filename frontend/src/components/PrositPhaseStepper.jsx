import { Check } from 'lucide-react';

const PHASES = [
  { id: 'aller',     label: 'Aller',     desc: 'Analyse en groupe' },
  { id: 'recherche', label: 'Recherche', desc: 'Travail individuel' },
  { id: 'retour',    label: 'Retour',    desc: 'Présentation' },
  { id: 'evalue',    label: 'Évalué',    desc: 'Note publiée' },
];

/**
 * Stepper visuel des phases d'un Prosit.
 * Props : status (brouillon | aller | recherche | retour | evalue | archive)
 */
export default function PrositPhaseStepper({ status }) {
  // brouillon = avant aller (rien complété)
  // archive = tout complété
  const orderedStatuses = ['brouillon', 'aller', 'recherche', 'retour', 'evalue', 'archive'];
  const currentIdx = orderedStatuses.indexOf(status);

  return (
    <div
      role="list"
      aria-label="Progression des phases du Prosit"
      style={{
        display: 'flex', alignItems: 'center',
        padding: '14px 4px', overflowX: 'auto',
      }}
    >
      {PHASES.map((phase, i) => {
        const phaseIdx = orderedStatuses.indexOf(phase.id);
        const done = currentIdx > phaseIdx;
        const active = currentIdx === phaseIdx;
        const upcoming = currentIdx < phaseIdx;

        return (
          <div key={phase.id} role="listitem" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 80 }}>
              <div
                aria-current={active ? 'step' : undefined}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: done ? '#10B981' : active ? '#F59E0B' : '#E5E7EB',
                  color: done || active ? 'white' : '#94A3B8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800,
                  border: active ? '3px solid #FCD34D' : 'none',
                  transition: 'all .3s',
                }}
              >
                {done ? <Check size={14} /> : i + 1}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  color: active ? '#D97706' : done ? '#10B981' : '#94A3B8',
                }}>
                  {phase.label}
                </div>
                <div style={{ fontSize: 9, color: upcoming ? '#94A3B8' : '#64748B' }}>
                  {phase.desc}
                </div>
              </div>
            </div>

            {i < PHASES.length - 1 && (
              <div
                aria-hidden="true"
                style={{
                  width: 32, height: 2,
                  background: done ? '#10B981' : '#E5E7EB',
                  margin: '0 4px',
                  marginBottom: 22, // align with circles
                  transition: 'background .3s',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
