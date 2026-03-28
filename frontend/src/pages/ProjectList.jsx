import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import {
  FolderKanban, Plus, Search, Users, Calendar, Clock,
  ChevronRight, Layers,
} from 'lucide-react';

/* ─── Type & status config ────────────────────────────────────────────────── */
const TYPE_BADGE = {
  prosit: { label: 'Prosit', bg: '#EBF3FA', color: '#1B4F72' },
  projet: { label: 'Projet', bg: '#E8F5E9', color: '#2E7D32' },
};

const STATUS_BADGE = {
  brouillon: { label: 'Brouillon', bg: '#F1F5F9', color: '#64748B' },
  actif:     { label: 'Actif',     bg: '#E8F5E9', color: '#2E7D32' },
  termine:   { label: 'Termin\u00e9', bg: '#FEE2E2', color: '#DC2626' },
};

/* ─── Project card ────────────────────────────────────────────────────────── */
function ProjectCard({ project, onClick }) {
  const typeCfg   = TYPE_BADGE[project.type] ?? TYPE_BADGE.projet;
  const statusCfg = STATUS_BADGE[project.statut] ?? STATUS_BADGE.brouillon;

  const groupCount = project.groupes?.length ?? 0;
  const phaseCount = project.phases?.length ?? 0;
  const description = project.description
    ? project.description.length > 120
      ? project.description.slice(0, 120) + '...'
      : project.description
    : '';

  return (
    <div className="course-card" onClick={onClick}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <div
          style={{
            width: 44, height: 44, flexShrink: 0,
            borderRadius: 'var(--radius-md)',
            background: project.type === 'prosit'
              ? 'linear-gradient(135deg, #1B4F72 0%, #2874A6 100%)'
              : 'linear-gradient(135deg, #2E7D32 0%, #43A047 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <FolderKanban size={20} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 700,
            color: 'var(--color-text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {project.titre}
          </h3>
          {description && (
            <p style={{
              margin: '4px 0 0', fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {description}
            </p>
          )}
        </div>
        <ChevronRight size={16} color="var(--color-text-disabled)" style={{ flexShrink: 0, marginTop: 4 }} />
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '2px 10px',
          borderRadius: 'var(--radius-sm)', backgroundColor: typeCfg.bg, color: typeCfg.color,
        }}>
          {typeCfg.label}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '2px 10px',
          borderRadius: 'var(--radius-sm)', backgroundColor: statusCfg.bg, color: statusCfg.color,
        }}>
          {statusCfg.label}
        </span>
        {project.coursId?.titre && (
          <span className="badge">{project.coursId.titre}</span>
        )}
      </div>

      {/* Footer info */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Users size={12} />
          {groupCount} groupe{groupCount !== 1 ? 's' : ''}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Layers size={12} />
          {phaseCount} phase{phaseCount !== 1 ? 's' : ''}
        </span>
        {project.type === 'projet' && project.dateSoutenance && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={12} />
            Soutenance : {new Date(project.dateSoutenance).toLocaleDateString('fr-FR')}
          </span>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ProjectList
═══════════════════════════════════════════════════════════════════════════ */
export default function ProjectList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = user?.role ?? 'etudiant';

  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('tous'); // tous | prosit | projet

  const courseId = searchParams.get('courseId');

  useEffect(() => {
    const url = courseId ? `/projects?courseId=${courseId}` : '/projects';
    api.get(url)
      .then(({ data }) => setProjects(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseId]);

  /* ── Filter & search ──────────────────────────────────────────────────── */
  const filtered = projects.filter((p) => {
    if (filter === 'prosit' && p.type !== 'prosit') return false;
    if (filter === 'projet' && p.type !== 'projet') return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      p.titre?.toLowerCase().includes(s) ||
      p.description?.toLowerCase().includes(s) ||
      p.coursId?.titre?.toLowerCase().includes(s)
    );
  });

  const TABS = [
    { key: 'tous',   label: 'Tous' },
    { key: 'prosit', label: 'Prosits' },
    { key: 'projet', label: 'Projets' },
  ];

  return (
    <Layout title="Projets">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Projets</h1>
            <p className="page-subtitle">
              {role === 'professeur'
                ? 'G\u00e9rez vos prosits et projets de groupe.'
                : 'D\u00e9couvrez et participez aux prosits et projets.'}
            </p>
          </div>
          {(role === 'professeur' || role === 'admin') && (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/professor/projects/create')}
              style={{ flexShrink: 0 }}
            >
              <Plus size={15} /> Nouveau projet
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '6px 16px',
                borderRadius: 'var(--radius-sm)',
                border: `1.5px solid ${filter === key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                backgroundColor: filter === key ? 'var(--color-primary-light)' : 'transparent',
                color: filter === key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 120ms',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <Search
            size={15}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-disabled)' }}
          />
          <input
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Rechercher un projet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="empty-state" style={{ padding: 40 }}>
            <p className="text-small">Chargement des projets...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="empty-state" style={{ padding: 60 }}>
            <FolderKanban size={40} className="empty-state-icon" />
            <p className="empty-state-title">
              {search ? 'Aucun projet trouv\u00e9' : 'Aucun projet disponible'}
            </p>
            <p className="empty-state-desc">
              {search
                ? 'Essayez un autre terme de recherche.'
                : role === 'professeur'
                  ? 'Cr\u00e9ez votre premier projet pour commencer.'
                  : 'Aucun projet n\'a encore \u00e9t\u00e9 publi\u00e9.'}
            </p>
          </div>
        )}

        {/* Projects grid */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {filtered.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                onClick={() => navigate(`/projects/${project._id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
