import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import { ArrowLeft, FileText, Download, Search, FolderOpen, File, Presentation, FileSpreadsheet } from 'lucide-react';

const FILE_ICONS = {
  pdf: FileText,
  pptx: Presentation,
  docx: File,
  zip: FolderOpen,
  autre: FileSpreadsheet,
};

export default function ResourcesHub() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [resources, setResources] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        // Get all courses user has access to
        const { data: coursesData } = await api.get('/courses');
        setCourses(coursesData);

        // Get resources for each course
        const resourceMap = {};
        await Promise.all(
          coursesData.map(async (course) => {
            try {
              const { data } = await api.get(`/resources/course/${course._id}`);
              if (data.length > 0) {
                resourceMap[course._id] = { course, resources: data };
              }
            } catch { /* no resources for this course */ }
          })
        );
        setResources(resourceMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const allResources = Object.values(resources).flatMap(({ course, resources: res }) =>
    res.map(r => ({ ...r, courseTitre: course.titre }))
  );

  const filtered = allResources.filter(r => {
    const matchSearch = !search || r.titre.toLowerCase().includes(search.toLowerCase()) || r.courseTitre.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || r.type === filter;
    return matchSearch && matchFilter;
  });

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Layout title="Ressources">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
          <ArrowLeft size={18} /> Retour
        </button>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B4F72', marginBottom: 4 }}>Bibliothèque de ressources</h1>
        <p style={{ color: '#64748b', marginBottom: 24 }}>Tous les fichiers et documents de vos cours</p>

        {/* Search + Filter */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text" placeholder="Rechercher un fichier ou un cours..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'pdf', 'pptx', 'docx', 'zip'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  border: filter === f ? '2px solid #1B4F72' : '1px solid #d1d5db',
                  background: filter === f ? '#EBF5FB' : 'white',
                  color: filter === f ? '#1B4F72' : '#64748b'
                }}>
                {f === 'all' ? 'Tous' : f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <FolderOpen size={48} color="#d1d5db" />
            <p style={{ color: '#64748b', marginTop: 12 }}>Aucune ressource trouvée</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((r) => {
              const Icon = FILE_ICONS[r.type] || FileText;
              return (
                <div key={r._id} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                  background: 'white', borderRadius: 10, border: '1px solid #e5e7eb',
                  transition: 'box-shadow 0.15s',
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: r.type === 'pdf' ? '#FEF2F2' : r.type === 'pptx' ? '#FFF7ED' : r.type === 'docx' ? '#EFF6FF' : '#F0FDF4',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Icon size={20} color={r.type === 'pdf' ? '#DC2626' : r.type === 'pptx' ? '#EA580C' : r.type === 'docx' ? '#2563EB' : '#16A34A'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{r.titre}</div>
                    <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                      {r.courseTitre} • {r.type?.toUpperCase()} {r.size ? `• ${formatSize(r.size)}` : ''}
                    </div>
                  </div>
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                        borderRadius: 8, background: '#1B4F72', color: 'white', textDecoration: 'none',
                        fontSize: 13, fontWeight: 500
                      }}>
                      <Download size={14} /> Télécharger
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
