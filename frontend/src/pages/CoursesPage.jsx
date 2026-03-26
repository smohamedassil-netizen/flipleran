import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import {
  BookOpen, Users, Video, ChevronRight, Search,
  Plus, Upload, BarChart2, FileText,
  ArrowLeft,
} from 'lucide-react';

/* ─── Course card ──────────────────────────────────────────────────────────── */
function CourseCard({ course, role, onOpen }) {
  const navigate = useNavigate();
  const prof = course.professorId;

  return (
    <div
      className="course-card"
      onClick={() => onOpen(course)}
    >
      {/* Header with icon */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <div
          style={{
            width: 44, height: 44, flexShrink: 0,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #1B4F72 0%, #2874A6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <BookOpen size={20} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 700,
            color: 'var(--color-text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {course.titre}
          </h3>
          {course.description && (
            <p style={{
              margin: '4px 0 0', fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {course.description}
            </p>
          )}
        </div>
        <ChevronRight size={16} color="var(--color-text-disabled)" style={{ flexShrink: 0, marginTop: 4 }} />
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <span className="badge badge-primary">{course.filiere}</span>
        <span className="badge">{course.promotion}</span>
      </div>

      {/* Footer info */}
      <div style={{ display: 'flex', gap: 16, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
        {prof && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={12} />
            {prof.prenom} {prof.nom}
          </span>
        )}
        {course.videoCount !== undefined && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Video size={12} />
            {course.videoCount} vidéo{course.videoCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Professor actions */}
      {role === 'professeur' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => { e.stopPropagation(); navigate(`/professor/courses/${course._id}/upload`); }}
          >
            <Upload size={13} /> Ajouter vidéo
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => { e.stopPropagation(); navigate(`/professor/dashboard/${course._id}`); }}
          >
            <BarChart2 size={13} /> Statistiques
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => { e.stopPropagation(); navigate(`/courses/${course._id}/resources`); }}
          >
            <FileText size={13} /> Ressources
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CoursesPage
═══════════════════════════════════════════════════════════════════════════ */
export default function CoursesPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const role = user?.role ?? 'etudiant';

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  /* ── Create course modal state ───────────────────────────────────────── */
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [newCourse, setNewCourse]   = useState({ titre: '', description: '', filiere: '', promotion: '' });

  useEffect(() => {
    api.get('/courses')
      .then(({ data }) => setCourses(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* ── Filter ──────────────────────────────────────────────────────────────── */
  const filtered = courses.filter((c) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      c.titre?.toLowerCase().includes(s) ||
      c.filiere?.toLowerCase().includes(s) ||
      c.promotion?.toLowerCase().includes(s) ||
      c.description?.toLowerCase().includes(s)
    );
  });

  const handleOpen = (course) => {
    navigate(`/courses/${course._id}`);
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.titre.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/courses', newCourse);
      setCourses((prev) => [data, ...prev]);
      setNewCourse({ titre: '', description: '', filiere: '', promotion: '' });
      setShowCreate(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message ?? 'Erreur lors de la création du cours');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Layout title="Mes cours">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <button onClick={() => navigate('/')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
          <ArrowLeft size={18} /> Retour
        </button>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 className="page-title">Mes cours</h1>
            <p className="page-subtitle">
              {role === 'professeur'
                ? 'Gérez vos cours, ajoutez des vidéos et des QCM.'
                : 'Retrouvez tous vos cours et continuez votre apprentissage.'}
            </p>
          </div>
          {role === 'professeur' && (
            <button
              className="btn btn-primary"
              onClick={() => setShowCreate(true)}
              style={{ flexShrink: 0 }}
            >
              <Plus size={15} /> Cr&eacute;er un nouveau cours
            </button>
          )}
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
            placeholder="Rechercher un cours..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="empty-state" style={{ padding: 40 }}>
            <p className="text-small">Chargement des cours...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="empty-state" style={{ padding: 60 }}>
            <BookOpen size={40} className="empty-state-icon" />
            <p className="empty-state-title">
              {search ? 'Aucun cours trouvé' : 'Aucun cours disponible'}
            </p>
            <p className="empty-state-desc">
              {search
                ? 'Essayez un autre terme de recherche.'
                : role === 'professeur'
                  ? "Créez votre premier cours pour commencer."
                  : "Aucun cours n'a encore été publié."}
            </p>
          </div>
        )}

        {/* Courses grid */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {filtered.map((course) => (
              <CourseCard
                key={course._id}
                course={course}
                role={role}
                onOpen={handleOpen}
              />
            ))}
          </div>
        )}

        {/* ── Create course modal ─────────────────────────────────────── */}
        {showCreate && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.4)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => setShowCreate(false)}
          >
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleCreateCourse}
              className="card"
              style={{ width: 460, padding: 28 }}
            >
              <h2 style={{ margin: '0 0 20px', fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text)' }}>
                Cr&eacute;er un nouveau cours
              </h2>

              <label className="text-label" style={{ display: 'block', marginBottom: 4 }}>Titre *</label>
              <input
                className="form-input"
                style={{ marginBottom: 14, width: '100%' }}
                value={newCourse.titre}
                onChange={(e) => setNewCourse({ ...newCourse, titre: e.target.value })}
                required
                placeholder="Ex : Algorithmique avancée"
              />

              <label className="text-label" style={{ display: 'block', marginBottom: 4 }}>Description</label>
              <textarea
                className="form-input"
                style={{ marginBottom: 14, width: '100%', minHeight: 70, resize: 'vertical' }}
                value={newCourse.description}
                onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                placeholder="Description du cours..."
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: 4 }}>Fili&egrave;re</label>
                  <input
                    className="form-input"
                    style={{ width: '100%' }}
                    value={newCourse.filiere}
                    onChange={(e) => setNewCourse({ ...newCourse, filiere: e.target.value })}
                    placeholder="Ex : Informatique"
                  />
                </div>
                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: 4 }}>Promotion</label>
                  <input
                    className="form-input"
                    style={{ width: '100%' }}
                    value={newCourse.promotion}
                    onChange={(e) => setNewCourse({ ...newCourse, promotion: e.target.value })}
                    placeholder="Ex : L3 2024"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Cr\u00e9ation...' : 'Cr\u00e9er le cours'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
