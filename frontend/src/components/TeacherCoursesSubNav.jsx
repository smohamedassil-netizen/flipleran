import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../utils/api.js';
import { Target, ChevronDown, ChevronRight } from 'lucide-react';

/**
 * TeacherCoursesSubNav — Sous-menu dynamique de la sidebar prof : pour
 * chaque cours, expose un lien direct vers ses objectifs Bloom (Anderson &
 * Krathwohl, 2001 ; Biggs, 1996).
 *
 * Affiché uniquement si le prof a au moins un cours. Charge la liste une
 * seule fois au montage (silencieux en cas d'échec).
 */
export default function TeacherCoursesSubNav({ collapsed }) {
  const [courses, setCourses] = useState([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get('/courses').then(({ data }) => {
      if (!alive) return;
      setCourses(Array.isArray(data) ? data : []);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (collapsed || courses.length === 0) return null;

  return (
    <div style={{ paddingLeft: 24, marginBottom: 8 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 8px', background: 'none', border: 'none',
          color: 'var(--color-text-secondary)', cursor: 'pointer',
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
        }}
      >
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        Objectifs Bloom
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {courses.map((c) => (
            <NavLink
              key={c._id}
              to={`/professor/courses/${c._id}/outcomes`}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              title={`Objectifs Bloom — ${c.titre}`}
              style={{
                fontSize: 'var(--font-size-xs)',
                padding: '4px 10px',
                marginLeft: 4,
              }}
            >
              <Target size={12} style={{ flexShrink: 0 }} />
              <span style={{
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {c.titre}
              </span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
