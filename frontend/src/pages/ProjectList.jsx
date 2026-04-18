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
        {project.isMultiModule ? (
          <span title={project.modules?.map(m => m.titre).join(' • ')} style={{
            fontSize: 11, fontWeight: 700, padding: '2px 10px',
            borderRadius: 'var(--radius-sm)', backgroundColor: '#fef3c7', color: '#92400e',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            🌐 Multi-modules ({project.modules?.length || 0})
          </span>
        ) : (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 10px',
            borderRadius: 'var(--radius-sm)', backgroundColor: '#e0e7ff', color: '#3730a3',
          }}>
            📘 Mono-module
          </span>
        )}
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
  const [filter, setFilter]     = useState('tous'); // tous | prosit | projet | mono | multi
  const [showPrositInfo, setShowPrositInfo] = useState(false);

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
    if (filter === 'prosit'    && p.type !== 'prosit') return false;
    if (filter === 'projet'    && p.type !== 'projet') return false;
    if (filter === 'mono'      && p.isMultiModule)     return false;
    if (filter === 'multi'     && !p.isMultiModule)    return false;
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
    { key: 'mono',   label: '📘 Mono-module' },
    { key: 'multi',  label: '🌐 Collaboratifs' },
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

        {/* Encart explicatif Prosit vs Projet */}
        <div style={{
          marginBottom: 20, padding: 16, borderRadius: 12,
          background: 'linear-gradient(135deg, #EBF3FA, #F0F9FF)',
          border: '1px solid #BFDBFE', position: 'relative',
        }}>
          <button
            onClick={() => setShowPrositInfo(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left',
            }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #1B4F72, #2874A6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
              💡
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1B4F72' }}>
                Qu'est-ce qu'un Prosit ? Quelle différence avec un Projet ?
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                {showPrositInfo ? 'Cliquer pour replier' : 'Cliquer pour voir la méthodologie pédagogique'}
              </div>
            </div>
            <span style={{ fontSize: 18, color: '#1B4F72', transform: showPrositInfo ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>⌄</span>
          </button>

          {showPrositInfo && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #BFDBFE', fontSize: 13, color: '#1E293B', lineHeight: 1.6 }}>
              <p style={{ margin: 0, marginBottom: 10 }}>
                <strong>Prosit</strong> (PROblème SITuation) est une méthode pédagogique issue du PBL (apprentissage par problème). Tu apprends en résolvant un problème concret, en 3 phases :
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 10 }}>
                <div style={{ padding: 10, background: 'white', borderRadius: 8, borderLeft: '3px solid #1B4F72' }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: '#1B4F72', marginBottom: 3 }}>① Prosit Aller</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>Découverte du problème, mots-clés, questions.</div>
                </div>
                <div style={{ padding: 10, background: 'white', borderRadius: 8, borderLeft: '3px solid #D97706' }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: '#D97706', marginBottom: 3 }}>② Recherche</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>Travail individuel, documentation, réflexion.</div>
                </div>
                <div style={{ padding: 10, background: 'white', borderRadius: 8, borderLeft: '3px solid #059669' }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: '#059669', marginBottom: 3 }}>③ Prosit Retour</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>Mise en commun, synthèse, livrable.</div>
                </div>
              </div>
              <p style={{ margin: 0, marginBottom: 8 }}>
                <strong>Projet</strong> = travail plus long (plusieurs semaines/mois) avec des phases personnalisées, groupes avec rôles (chef de projet, scribe, animateur, chrono, analyste), livrables, soutenance.
              </p>
              <div style={{ marginTop: 10, padding: 10, background: '#FFFBEB', borderRadius: 8, fontSize: 12, color: '#92400E' }}>
                📘 <strong>Mono-module</strong> : lié à un seul cours · 🌐 <strong>Collaboratif multi-modules</strong> : plusieurs filières/cours travaillent ensemble (ex: projet Marketing×Finance×Dev).
              </div>
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
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
