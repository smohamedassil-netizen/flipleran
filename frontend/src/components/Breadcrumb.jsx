import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Breadcrumb — Fil d'Ariane réutilisable.
 * @param {{ items: Array<{label: string, to?: string, icon?: any}> }} props
 *
 * Usage:
 *   <Breadcrumb items={[
 *     { label: 'Accueil', to: '/', icon: Home },
 *     { label: 'Mes modules', to: '/courses' },
 *     { label: 'Algorithmique' },
 *   ]} />
 */
export default function Breadcrumb({ items = [] }) {
  return (
    <nav className="breadcrumb" aria-label="Fil d'Ariane">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const Icon   = item.icon;

        return (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <ChevronRight size={12} className="breadcrumb-sep" />}

            {isLast ? (
              <span className="breadcrumb-current">
                {Icon && <Icon size={13} style={{ marginRight: 4 }} />}
                {item.label}
              </span>
            ) : item.to ? (
              <Link to={item.to}>
                {Icon && <Icon size={13} />}
                {item.label}
              </Link>
            ) : (
              <span>
                {Icon && <Icon size={13} style={{ marginRight: 4 }} />}
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
