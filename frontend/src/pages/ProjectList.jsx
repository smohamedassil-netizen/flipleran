import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import {
  FolderKanban, Plus, Search, Users, Calendar,
  ChevronRight, Layers,
} from 'lucide-react';
import { logError } from '../utils/logger.js';

/* ─── Type & status config ────────────────────────────────────────────────── */
const STATUS_BADGE = {
  brouillon: { label: 'Brouillon', bg: '#F1F5F9', color: '#64748B' },
  actif:     { label: 'Actif',     bg: '#E8F5E9', color: '#2E7D32' },
  termine:   { label: 'Termin\u00e9', bg: '#FEE2E2', color: '#DC2626' },
};

/* ─── Project card ────────────────────────────────────────────────────────── */
function ProjectCard({ project, onClick }) {
  const statusCfg = STATUS_BADGE[project.status] ?? STATUS_BADGE.brouillon;

  const groupCount = project.groupes?.length ?? 0;
  const phaseCount = project.phases?.length ?? 0;
  const description = project.description
    ? project.description.length > 120
      ? project.description.slice(0, 120) + '...'
      : project.description
    : '';

  // Modules rattachés (1 pour mono, N pour groupé)
  const linkedModules = project.type === 'groupe'
    ? (project.modules || [])
    : (project.courseId ? [project.courseId] : []);

  return (
    <div className="course-card" onClick={onClick}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
        <div
          style={{
            width: 44, height: 44, flexShrink: 0,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #1B4F72 0%, #2874A6 100%)',
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

      {/* Badges : statut + modules rattachés */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '2px 10px',
          borderRadius: 'var(--radius-sm)', backgroundColor: statusCfg.bg, color: statusCfg.color,
        }}>
          {statusCfg.label}
        </span>
        {linkedModules
          .filter((m) => m && typeof m === 'object' && m._id && m.titre)
          .slice(0, 2)
          .map((m) => (
            <span key={m._id} className="badge" style={{ fontSize: 11 }}>{m.titre}</span>
          ))}
        {linkedModules.length > 2 && (
          <span className="badge" style={{ fontSize: 11 }}>+{linkedModules.length - 2}</span>
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
        {project.dateSoutenance && (
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

  const courseId = searchParams.get('courseId');

  useEffect(() => {
    const url = courseId ? `/projects?courseId=${courseId}` : '/projects';
    api.get(url)
      .then(({ data }) => setProjects(data))
      .catch(logError)
      .finally(() => setLoading(false));
  }, [courseId]);

  /* ── Recherche (sur titre, description, modules) ──────────────────────── */
  const filtered = projects.filter((p) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const moduleNames = (p.modules || []).map(m => m.titre?.toLowerCase() || '').join(' ');
    return (
      p.titre?.toLowerCase().includes(s) ||
      p.description?.toLowerCase().includes(s) ||
      p.courseId?.titre?.toLowerCase().includes(s) ||
      moduleNames.includes(s)
    );
  });

  return (
    <Layout title="Projets">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">
              Projets {' '}
              <span style={{ fontSize: 13, fontWeight: 500, color: '#D97706', marginLeft: 8 }}>
                {'\ud83d\ude80 \u00c9tape 4 \u2014 Production'}
              </span>
            </h1>
            <p className="page-subtitle">
              {role === 'professeur'
                ? '\u00c9tape 4 du Cycle CAI : production originale par les \u00e9tudiants. Mono-module, multi-modules ou PFE.'
                : '\u00c9tape 4 du Cycle CAI \u2014 cr\u00e9er une production originale qui prolonge ce que tu as appris.'}
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

        {/* Encart pédagogique sobre : visible uniquement pour les étudiants débutants
            (aucun projet) ou pour les profs. Disparaît pour un étudiant qui a déjà
            au moins 1 projet — il connaît le concept. */}
        {(role !== 'etudiant' || projects.length === 0) && !loading && (
          <div style={{
            marginBottom: 20, padding: '12px 16px', borderRadius: 10,
            background: '#F8FAFC',
            borderLeft: '3px solid #1B4F72',
            fontSize: 13, color: '#1E293B', lineHeight: 1.5,
          }}>
            <strong style={{ color: '#1B4F72' }}>Qu'est-ce qu'un projet&nbsp;?</strong>
            {' '}Un travail en groupe pour <strong>créer une production originale</strong> rattachée à un ou plusieurs cours.
            Phases, livrables et rôles (animateur, scribe, membre — ou rôles spécialisés en PFE).
            Différent du <strong>cas pratique</strong> qui consiste à <em>résoudre</em> un problème donné.
          </div>
        )}

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
              {search ? 'Aucun projet trouv\u00e9' : 'Aucun projet actif'}
            </p>
            <p className="empty-state-desc">
              {search
                ? 'Essayez un autre terme de recherche.'
                : role === 'professeur'
                  ? 'Cr\u00e9ez votre premier projet pour commencer.'
                  : 'Votre professeur en publiera bient\u00f4t.'}
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
