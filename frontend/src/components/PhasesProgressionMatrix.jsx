import { useMemo } from 'react';
import {
  CheckCircle2, AlertTriangle, Loader2, Unlock, Lock, ChevronRight, Users,
} from 'lucide-react';
import { formatFullName } from '../utils/format.js';

/**
 * PhasesProgressionMatrix — vue prof : où en est chaque étudiant inscrit
 * sur les phases du projet (cycle locked → unlocked → in-progress → submitted
 * → validated défini par projectMilestoneService côté backend).
 *
 * Lecture seule : ne déclenche aucune mutation. Pour drill-down, le parent
 * fournit `onClickStudent(studentId)` (optionnel).
 *
 * Props :
 *   - project    : { phases[], groupes[] }
 *   - onClickStudent? : (studentId) => void
 */

const STATUS_META = {
  validated:     { icon: CheckCircle2, label: 'Validée',    color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', emoji: '✅' },
  submitted:     { icon: AlertTriangle, label: 'Soumise',   color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', emoji: '⚠️' },
  'in-progress': { icon: Loader2,      label: 'En cours',   color: '#A16207', bg: '#FEFCE8', border: '#FDE68A', emoji: '🟡' },
  unlocked:      { icon: Unlock,       label: 'Débloquée',  color: '#1B4F72', bg: '#EFF6FF', border: '#BFDBFE', emoji: '🔓' },
  locked:        { icon: Lock,         label: 'Verrouillée',color: '#64748B', bg: '#F1F5F9', border: '#CBD5E1', emoji: '🔒' },
};

function statusFor(phase, studentId) {
  const target = String(studentId);
  const sp = (phase.studentProgress || []).find((s) => String(s.studentId) === target);
  return sp?.status || 'locked';
}

function StatusCell({ status, compact = false }) {
  const meta = STATUS_META[status] || STATUS_META.locked;
  return (
    <div
      title={meta.label}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: compact ? '4px 8px' : '5px 10px',
        borderRadius: 6,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        color: meta.color,
        fontSize: 11, fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden="true">{meta.emoji}</span>
      {!compact && meta.label}
    </div>
  );
}

export default function PhasesProgressionMatrix({ project, onClickStudent }) {
  // Construit la liste des étudiants inscrits (déduplication via Map)
  const students = useMemo(() => {
    const map = new Map();
    (project?.groupes || []).forEach((g) => {
      (g.membres || []).forEach((m) => {
        const u = m.userId;
        const id = String(u?._id || u);
        if (!id || id === 'undefined') return;
        if (!map.has(id)) {
          map.set(id, {
            _id: id,
            user: typeof u === 'object' ? u : null,
            groupeNom: g.nom,
            role: m.role,
          });
        }
      });
    });
    return Array.from(map.values());
  }, [project?.groupes]);

  const phases = project?.phases || [];

  // Comptage de l'engagement global (combien d'étudiants ont au moins commencé une phase)
  const startedCount = useMemo(() => {
    let count = 0;
    for (const s of students) {
      const hasAny = phases.some((p) => {
        const st = statusFor(p, s._id);
        return st !== 'locked';
      });
      if (hasAny) count += 1;
    }
    return count;
  }, [students, phases]);

  if (phases.length === 0) {
    return (
      <div style={{
        padding: '14px 16px', borderRadius: 10,
        background: '#F8FAFC', border: '1px dashed #CBD5E1',
        fontSize: 13, color: '#64748B',
      }}>
        Ce projet n'a aucune phase configurée.
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div style={{
        padding: '14px 16px', borderRadius: 10,
        background: '#F8FAFC', border: '1px dashed #CBD5E1',
        fontSize: 13, color: '#64748B',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Users size={16} />
        Aucun étudiant inscrit n'a encore commencé. Crée des groupes pour démarrer le suivi.
      </div>
    );
  }

  return (
    <section
      className="card"
      style={{ padding: 20, marginTop: 20 }}
      aria-label="Progression des étudiants par phase"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1B4F72' }}>
            Progression des étudiants
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>
            {students.length} étudiant{students.length > 1 ? 's' : ''} inscrit{students.length > 1 ? 's' : ''} ·
            &nbsp;{startedCount} actif{startedCount > 1 ? 's' : ''} sur {phases.length} phase{phases.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Légende */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <span key={key} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10.5, color: meta.color, fontWeight: 500,
            }}>
              <span aria-hidden="true">{meta.emoji}</span>
              {meta.label}
            </span>
          ))}
        </div>
      </div>

      {/* Matrix desktop : table avec scroll horizontal si beaucoup de phases */}
      <div className="matrix-desktop" style={{ overflowX: 'auto', display: 'block' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 13, minWidth: 480 }}>
          <thead>
            <tr>
              <th style={{
                padding: '8px 10px',
                textAlign: 'left',
                position: 'sticky', left: 0, zIndex: 1,
                background: '#F8FAFC',
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: '#64748B',
                borderBottom: '1.5px solid #E2E8F0',
              }}>
                Étudiant
              </th>
              {phases.map((p, i) => (
                <th key={p._id || i} style={{
                  padding: '8px 10px',
                  textAlign: 'center',
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: '#64748B',
                  borderBottom: '1.5px solid #E2E8F0',
                  minWidth: 110,
                }}>
                  P{i + 1}
                  <div style={{
                    fontWeight: 500, textTransform: 'none', letterSpacing: 0,
                    color: '#94A3B8', fontSize: 10, marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120,
                  }}>
                    {p.titre}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const name = formatFullName(s.user) || s._id;
              return (
                <tr
                  key={s._id}
                  onClick={() => onClickStudent?.(s._id)}
                  style={{
                    cursor: onClickStudent ? 'pointer' : 'default',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{
                    padding: '10px',
                    position: 'sticky', left: 0, zIndex: 1,
                    background: 'inherit',
                    borderBottom: '1px solid #F1F5F9',
                  }}>
                    <div style={{ fontWeight: 600, color: '#1E293B', fontSize: 13 }}>{name}</div>
                    {s.groupeNom && (
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                        {s.groupeNom}{s.role ? ` · ${s.role}` : ''}
                      </div>
                    )}
                  </td>
                  {phases.map((p, i) => (
                    <td
                      key={p._id || i}
                      style={{
                        padding: '8px 10px',
                        textAlign: 'center',
                        borderBottom: '1px solid #F1F5F9',
                      }}
                    >
                      <StatusCell status={statusFor(p, s._id)} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vue mobile : 1 carte par étudiant, phases en colonnes (revue manuelle) */}
      <div className="matrix-mobile" style={{ display: 'none', flexDirection: 'column', gap: 10 }}>
        {students.map((s) => {
          const name = formatFullName(s.user) || s._id;
          return (
            <div
              key={`m-${s._id}`}
              onClick={() => onClickStudent?.(s._id)}
              style={{
                padding: 12, borderRadius: 10, border: '1px solid #E2E8F0',
                background: '#fff',
                cursor: onClickStudent ? 'pointer' : 'default',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#1E293B', fontSize: 14 }}>{name}</div>
                  {s.groupeNom && (
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>
                      {s.groupeNom}{s.role ? ` · ${s.role}` : ''}
                    </div>
                  )}
                </div>
                {onClickStudent && <ChevronRight size={16} color="#94A3B8" />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {phases.map((p, i) => (
                  <div
                    key={p._id || i}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                  >
                    <span style={{ fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      P{i + 1} · {p.titre}
                    </span>
                    <StatusCell status={statusFor(p, s._id)} compact />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bascule responsive via media query inline */}
      <style>{`
        @media (max-width: 720px) {
          [aria-label="Progression des étudiants par phase"] .matrix-desktop { display: none !important; }
          [aria-label="Progression des étudiants par phase"] .matrix-mobile  { display: flex !important; }
        }
      `}</style>
    </section>
  );
}
