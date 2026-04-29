import { Mic, FileText, PenTool, Clock3, User as UserIcon } from 'lucide-react';

export const ROLE_META = {
  animateur:    { label: 'Animateur',    Icon: Mic,      color: '#9333EA', bg: '#F3E8FF', desc: 'Conduit la discussion, gère le temps de parole.' },
  secretaire:   { label: 'Secrétaire',   Icon: FileText, color: '#0EA5E9', bg: '#E0F2FE', desc: 'Prend les notes, structure les idées par écrit.' },
  scribe:       { label: 'Scribe',       Icon: PenTool,  color: '#10B981', bg: '#D1FAE5', desc: 'Écrit/synthétise au tableau ce qui est partagé.' },
  gestionnaire: { label: 'Gestionnaire', Icon: Clock3,   color: '#D97706', bg: '#FEF3C7', desc: 'Surveille l\'avancement et les deadlines.' },
  membre:       { label: 'Membre',       Icon: UserIcon, color: '#64748B', bg: '#F1F5F9', desc: 'Participe activement à l\'analyse et la résolution.' },
};

/**
 * Badge visuel d'un rôle CESI.
 * Props : role (string), size ('sm' | 'md'), showLabel (boolean)
 */
export default function PrositRoleBadge({ role, size = 'md', showLabel = true }) {
  const meta = ROLE_META[role] || ROLE_META.membre;
  const Icon = meta.Icon;
  const padding = size === 'sm' ? '2px 8px' : '4px 10px';
  const iconSize = size === 'sm' ? 11 : 13;
  const fontSize = size === 'sm' ? 10 : 12;

  return (
    <span
      title={meta.desc}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding, borderRadius: 999,
        background: meta.bg, color: meta.color,
        fontSize, fontWeight: 700,
        lineHeight: 1,
      }}
    >
      <Icon size={iconSize} />
      {showLabel && meta.label}
    </span>
  );
}
