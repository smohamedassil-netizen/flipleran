import { Video as VideoIcon, FileText, BellRing } from 'lucide-react';

/**
 * ReadinessRow — affiche 1 ressource (vidéo + son QCM) avec les compteurs
 * d'étudiants ready / partial / missing pour la page prof "Préparation classe".
 *
 * Props :
 *   - resource : { type, _id, titre, order, hasQuiz, ready, partial, missing, missingStudents }
 *   - onRemind(resource) : callback pour ouvrir la modal rappel groupé
 */
export default function ReadinessRow({ resource, onRemind }) {
  const Icon = resource.type === 'video' ? VideoIcon : FileText;
  const total = resource.ready + resource.partial + resource.missing;

  return (
    <div style={{
      background: 'white',
      border: '1px solid #E2E8F0',
      borderRadius: 10,
      padding: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      marginBottom: 10,
    }}>
      {/* Header ressource */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: '#EBF5FB', color: '#1B4F72',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {resource.order != null ? `${resource.order + 1}. ` : ''}{resource.titre}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B' }}>
            Vidéo {resource.hasQuiz ? '+ QCM associé' : '(pas de QCM)'} · {total} étudiants
          </p>
        </div>
      </div>

      {/* Pastilles compteurs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{
          padding: '4px 10px', borderRadius: 999,
          background: '#F0FDF4', color: '#15803D',
          fontSize: 12, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          🟢 {resource.ready} prêt{resource.ready > 1 ? 's' : ''}
        </span>
        <span style={{
          padding: '4px 10px', borderRadius: 999,
          background: '#FEF3C7', color: '#B45309',
          fontSize: 12, fontWeight: 700,
        }}>
          🟡 {resource.partial} partiel{resource.partial > 1 ? 's' : ''}
        </span>
        <span style={{
          padding: '4px 10px', borderRadius: 999,
          background: '#FEE2E2', color: '#B91C1C',
          fontSize: 12, fontWeight: 700,
        }}>
          🔴 {resource.missing} non préparé{resource.missing > 1 ? 's' : ''}
        </span>

        {resource.missing > 0 && onRemind && (
          <button
            type="button"
            onClick={() => onRemind(resource)}
            style={{
              marginLeft: 'auto',
              background: '#1B4F72',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <BellRing size={13} /> Envoyer rappel aux {resource.missing} non préparés
          </button>
        )}
      </div>
    </div>
  );
}
