import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import { ArrowLeft, FileText, Download, Search, FolderOpen, File, Presentation, FileSpreadsheet, Plus, Upload, X, Video, ClipboardList, ExternalLink } from 'lucide-react';

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
  const [showVideoUpload, setShowVideoUpload] = useState(false);
  const [videoForm, setVideoForm] = useState({ titre: '', description: '', courseId: '', ordre: 1 });
  const [videoFile, setVideoFile] = useState(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoError, setVideoError] = useState('');
  const [videoUploaded, setVideoUploaded] = useState(null);
  const [uploadForm, setUploadForm] = useState({ titre: '', description: '', courseId: '' });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  const loadResources = async () => {
    try {
      // 2 requêtes parallèles au lieu de 1 + N : un appel cours + un appel batch ressources
      const [{ data: coursesData }, { data: allResources }] = await Promise.all([
        api.get('/courses'),
        api.get('/resources/me'),
      ]);
      setCourses(coursesData);

      // Regrouper les ressources par cours côté client (la réponse populate déjà courseId)
      const resourceMap = {};
      const courseById = new Map(coursesData.map(c => [c._id, c]));
      for (const r of allResources) {
        const cid = (r.courseId && r.courseId._id) || r.courseId;
        if (!cid) continue;
        const course = courseById.get(cid.toString()) || (typeof r.courseId === 'object' ? r.courseId : null);
        if (!course) continue;
        if (!resourceMap[cid]) resourceMap[cid] = { course, resources: [] };
        resourceMap[cid].resources.push(r);
      }
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

  const handleVideoUpload = async (e) => {
    e.preventDefault();
    if (!videoFile || !videoForm.titre || !videoForm.courseId) return;
    setVideoUploading(true); setVideoProgress(0); setVideoError('');
    const fd = new FormData();
    fd.append('video', videoFile);
    fd.append('titre', videoForm.titre);
    fd.append('description', videoForm.description);
    fd.append('courseId', videoForm.courseId);
    fd.append('ordre', videoForm.ordre);
    try {
      const { data } = await api.post('/videos/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 5 * 60 * 1000,
        onUploadProgress: (e) => e.total && setVideoProgress(Math.round((e.loaded * 100) / e.total)),
      });
      setVideoUploaded({ videoId: data._id, titre: data.titre });
    } catch (err) {
      setVideoError(err.response?.data?.message || "Erreur lors de l'upload vidéo");
    } finally { setVideoUploading(false); }
  };

  function getDownloadUrl(url) {
    if (!url) return '#';
    if (url.includes('cloudinary.com') && url.includes('/raw/upload/')) {
      return url.replace('/raw/upload/', '/raw/upload/fl_attachment/');
    }
    return url;
  }

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
            <p style={{ color: '#94A3B8', fontSize: 12, margin: '6px 0 0' }}>
              Pour les ressources d'un cours précis, ouvrez le cours puis « Bibliothèque » —{' '}
              <button
                type="button"
                onClick={() => navigate('/courses')}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: '#1B4F72', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', textDecoration: 'underline',
                }}
              >
                voir mes cours →
              </button>
            </p>
          </div>
          {isProf && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowVideoUpload(true)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                borderRadius: 10, background: '#059669', color: 'white', border: 'none',
                cursor: 'pointer', fontWeight: 600, fontSize: 13,
              }}>
                <Video size={15} /> Ajouter une vidéo
              </button>
              <button onClick={() => setShowUpload(true)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                borderRadius: 10, background: '#1B4F72', color: 'white', border: 'none',
                cursor: 'pointer', fontWeight: 600, fontSize: 13,
              }}>
                <Plus size={15} /> Ajouter un fichier
              </button>
            </div>
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

        {/* ── Video Upload Modal ─────────────────────────────────────────────── */}
        {showVideoUpload && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
            onClick={e => e.target === e.currentTarget && !videoUploading && (setShowVideoUpload(false), setVideoUploaded(null))}>
            <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, position: 'relative' }}>
              {!videoUploaded ? (
                <>
                  <button onClick={() => { setShowVideoUpload(false); setVideoError(''); setVideoFile(null); }}
                    style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                    <X size={20} />
                  </button>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#059669', marginBottom: 20 }}>
                    <Video size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                    Ajouter une vidéo
                  </h2>
                  <form onSubmit={handleVideoUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Cours *</label>
                      <select required value={videoForm.courseId} onChange={e => setVideoForm({ ...videoForm, courseId: e.target.value })} style={inputStyle}>
                        <option value="">-- Sélectionner un cours --</option>
                        {courses.map(c => <option key={c._id} value={c._id}>{c.titre}</option>)}
                      </select>
                      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                        Cours non listé ? <button type="button" onClick={() => { setShowVideoUpload(false); navigate('/courses'); }} style={{ background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontWeight: 600, fontSize: 11, textDecoration: 'underline', padding: 0 }}>Créer un nouveau cours</button>
                      </p>
                    </div>
                    <div>
                      <label style={labelStyle}>Titre de la vidéo *</label>
                      <input required value={videoForm.titre} onChange={e => setVideoForm({ ...videoForm, titre: e.target.value })} style={inputStyle} placeholder="ex: Introduction aux algorithmes" />
                    </div>
                    <div>
                      <label style={labelStyle}>Description</label>
                      <textarea value={videoForm.description} onChange={e => setVideoForm({ ...videoForm, description: e.target.value })} style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} placeholder="Description optionnelle" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
                      <div>
                        <label style={labelStyle}>Fichier vidéo * (MP4, WebM — max 100 Mo)</label>
                        <input type="file" accept="video/mp4,video/webm,.mp4,.webm,.mov" onChange={e => { setVideoFile(e.target.files[0] ?? null); setVideoError(''); }} style={{ fontSize: 13 }} />
                      </div>
                      <div>
                        <label style={labelStyle}>Ordre</label>
                        <input type="number" min={1} value={videoForm.ordre} onChange={e => setVideoForm({ ...videoForm, ordre: Number(e.target.value) })} style={{ ...inputStyle, width: 70 }} />
                      </div>
                    </div>
                    {videoUploading && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}><span>Upload en cours...</span><span>{videoProgress}%</span></div>
                        <div style={{ width: '100%', background: '#e5e7eb', borderRadius: 8, overflow: 'hidden', height: 8 }}>
                          <div style={{ width: `${videoProgress}%`, height: '100%', background: '#059669', borderRadius: 8, transition: 'width 0.3s' }} />
                        </div>
                      </div>
                    )}
                    {videoError && <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 500, margin: 0 }}>{videoError}</p>}
                    <button type="submit" disabled={videoUploading || !videoFile} style={{
                      padding: '12px 0', borderRadius: 10, background: '#059669', color: 'white',
                      border: 'none', fontWeight: 600, fontSize: 15, cursor: videoUploading || !videoFile ? 'not-allowed' : 'pointer',
                      opacity: videoUploading || !videoFile ? 0.7 : 1,
                    }}>
                      {videoUploading ? 'Upload en cours...' : 'Uploader la vidéo'}
                    </button>
                  </form>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Video size={24} color="#22c55e" />
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Vidéo uploadée !</h3>
                  <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>"{videoUploaded.titre}" a été ajoutée au cours.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 300, margin: '0 auto' }}>
                    <button onClick={() => { setShowVideoUpload(false); setVideoUploaded(null); navigate(`/professor/videos/${videoUploaded.videoId}/qcm`); }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 10, background: '#1B4F72', color: 'white', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                      <ClipboardList size={15} /> Créer un QCM pour cette vidéo
                    </button>
                    <button onClick={() => { setShowVideoUpload(false); setVideoUploaded(null); }}
                      style={{ padding: '10px 0', borderRadius: 10, background: 'transparent', color: '#64748b', border: '1px solid #e5e7eb', fontWeight: 500, fontSize: 14, cursor: 'pointer' }}>
                      Fermer
                    </button>
                  </div>
                </div>
              )}
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
                    <a href={getDownloadUrl(r.url)} target="_blank" rel="noopener noreferrer" download
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
