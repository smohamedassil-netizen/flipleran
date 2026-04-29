import { Users } from 'lucide-react';
import PrositRoleBadge from './PrositRoleBadge.jsx';

/**
 * Carte d'affichage d'un groupe Prosit avec ses membres et leurs rôles.
 * Props : groupe, isMyGroup (boolean), highlight (boolean)
 */
export default function PrositGroupCard({ groupe, isMyGroup = false, highlight = false, children }) {
  if (!groupe) return null;

  const noteGlobale = groupe.evaluation?.noteGlobale ?? null;

  return (
    <div
      style={{
        padding: 14,
        background: 'white',
        borderRadius: 12,
        border: `2px solid ${highlight || isMyGroup ? '#F59E0B' : '#E5E7EB'}`,
        boxShadow: isMyGroup ? '0 4px 14px rgba(245,158,11,.15)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={16} color="#1B4F72" />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1B4F72', margin: 0 }}>
            {groupe.nom}
          </h3>
          {isMyGroup && (
            <span style={{ padding: '2px 8px', background: '#FEF3C7', color: '#92400E', fontSize: 10, fontWeight: 700, borderRadius: 999, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Mon groupe
            </span>
          )}
        </div>
        {noteGlobale !== null && (
          <span style={{
            padding: '4px 12px', borderRadius: 999,
            background: noteGlobale >= 18 ? '#D1FAE5' : noteGlobale >= 10 ? '#DBEAFE' : '#FEE2E2',
            color: noteGlobale >= 18 ? '#065F46' : noteGlobale >= 10 ? '#1B4F72' : '#991B1B',
            fontSize: 12, fontWeight: 800,
          }}>
            {noteGlobale}/20
          </span>
        )}
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(groupe.membres || []).map((m, i) => {
          const u = m.userId || {};
          const name = typeof u === 'object' ? `${u.prenom || ''} ${u.nom || ''}`.trim() : 'Membre';
          return (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: '#EBF3FA', color: '#1B4F72',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
              }}>
                {(name[0] || '?').toUpperCase()}
              </div>
              <span style={{ fontSize: 13, color: '#1E293B', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </span>
              <PrositRoleBadge role={m.role} size="sm" />
            </li>
          );
        })}
      </ul>

      {children && <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>{children}</div>}
    </div>
  );
}
