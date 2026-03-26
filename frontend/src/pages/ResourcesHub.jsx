import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import { ArrowLeft, FileText, Download, Search, FolderOpen, File, Presentation, FileSpreadsheet, Plus, Upload, X } from 'lucide-react';

const FILE_ICONS = {
  pdf: FileText,
  pptx: Presentation,
  docx: File,
  zip: FolderOpen,
  autre: FileSpreadsheet,
};

const ACCEPTED_TYPES = '.pdf,.pptx,.docx,.zip';
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export default function ResourcesHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isProf = user?.role === 'professeur' || user?.role === 'admin';

  const [courses, setCourses] = useState([]);
  const [resources, setResources] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  // Upload modal state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ titre: '', description: '', courseId: '' });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  const loadResources = async () => {
    try {
      const { data: coursesData } = await api.get('/courses');
      setCourses(coursesData);

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
  };

  useEffect(() => { loadResources(); }, []);

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_SIZE) {
      setUploadError('Le fichier dépasse la taille maximale de 50 MB.');
      setUploadFile(null);
      return;
    }
    setUploadError('');
    setUploadFile(file);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadForm.titre || !uploadForm.courseId) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadError('');

    const formData = new FormData();
    formData.append('titre', uploadForm.titre);
    formData.append('description', uploadForm.description);
    formData.append('courseId', uploadForm.courseId);
    formData.append('file', uploadFile);

    try {
      await api.post('/resources/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      setShowUpload(false);
      setUploadForm({ titre: '', description: '', courseId: '' });
      setUploadFile(null);
      setUploadProgress(0);
      // Refresh resources
      setLoading(true);
      await loadResources();
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout title="Ressources">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
          <ArrowLeft size={18} /> Retour
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B4F72', marginBottom: 4 }}>Bibliothèque de ressources</h1>
            <p style={{ color: '#64748b' }}>Tous les fichiers et documents de vos cours</p>
          </div>
          {isProf && (
            <button onClick={() => setShowUpload(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
              borderRadius: 10, background: '#1B4F72', color: 'white', border: 'none',
              cursor: 'pointer', fontWeight: 600, fontSize: 14,
            }}>
              <Plus size={16} /> Ajouter une ressource
            </button>
          )}
        </div>

        {/* ── Upload Modal ───────────────────────────────────────────────────── */}
        {showUpload && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 500, position: 'relative' }}>
              <button onClick={() => { setShowUpload(false); setUploadError(''); setUploadFile(null); setUploadProgress(0); }} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1B4F72', marginBottom: 20 }}>
                <Upload size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Ajouter une ressource
              </h2>
              <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Cours</label>
                  <select required value={uploadForm.courseId} onChange={e => setUploadForm({ ...uploadForm, courseId: e.target.value })} style={inputStyle}>
                    <option value="">-- Sélectionner un cours --</option>
                    {courses.map(c => <option key={c._id} value={c._id}>{c.titre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Titre</label>
                  <input required value={uploadForm.titre} onChange={e => setUploadForm({ ...uploadForm, titre: e.target.value })} style={inputStyle} placeholder="Nom du fichier" />
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea value={uploadForm.description} onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="Description optionnelle" />
                </div>
                <div>
                  <label style={labelStyle}>Fichier (PDF, PPTX, DOCX, ZIP - max 50 MB)</label>
                  <input type="file" accept={ACCEPTED_TYPES} onChange={handleFileChange} style={{ fontSize: 14 }} />
                  {uploadFile && <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{uploadFile.name} ({formatSize(uploadFile.size)})</p>}
                </div>

                {/* Progress bar */}
                {uploading && (
                  <div style={{ width: '100%', background: '#e5e7eb', borderRadius: 8, overflow: 'hidden', height: 8 }}>
                    <div style={{
                      width: `${uploadProgress}%`, height: '100%', background: '#1B4F72',
                      borderRadius: 8, transition: 'width 0.3s',
                    }} />
                  </div>
                )}
                {uploading && <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center', margin: 0 }}>{uploadProgress}%</p>}

                {uploadError && <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 500, margin: 0 }}>{uploadError}</p>}

                <button type="submit" disabled={uploading || !uploadFile} style={{
                  padding: '12px 0', borderRadius: 10, background: '#1B4F72', color: 'white',
                  border: 'none', fontWeight: 600, fontSize: 15, cursor: uploading || !uploadFile ? 'not-allowed' : 'pointer',
                  opacity: uploading || !uploadFile ? 0.7 : 1,
                }}>
                  {uploading ? 'Upload en cours...' : 'Uploader'}
                </button>
              </form>
            </div>
          </div>
        )}

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
                      {r.courseTitre} &bull; {r.type?.toUpperCase()} {r.size ? `\u2022 ${formatSize(r.size)}` : ''}
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

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 };
const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
};
