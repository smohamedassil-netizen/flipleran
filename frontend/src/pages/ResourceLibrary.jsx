import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, Download, Trash2, Upload, BookOpen,
  File, Presentation, Archive, AlertCircle, Video,
  Play, Plus,
} from 'lucide-react';
import Layout from '../components/Layout.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import api    from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const TYPE_META = {
  pdf:   { icon: FileText,     color: '#EF4444', bg: '#FEF2F2', label: 'PDF' },
  pptx:  { icon: Presentation, color: '#F97316', bg: '#FFF7ED', label: 'PPTX' },
  docx:  { icon: File,         color: '#3B82F6', bg: '#EFF6FF', label: 'DOCX' },
  zip:   { icon: Archive,      color: '#8B5CF6', bg: '#F5F3FF', label: 'ZIP' },
  autre: { icon: File,         color: '#6B7280', bg: '#F9FAFB', label: 'Fichier' },
};

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)        return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ─── ResourceCard ───────────────────────────────────────────────────────── */
function ResourceCard({ resource, canDelete, onDelete }) {
  const meta  = TYPE_META[resource.type] ?? TYPE_META.autre;
  const Icon  = meta.icon;
  return (
    <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ width: 48, height: 48, borderRadius: '8px', background: meta.bg, border: `1px solid ${meta.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={22} color={meta.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{resource.titre}</div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <span className="badge" style={{ padding: '1px 6px', fontSize: '10px', background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}>{meta.label}</span>
          {resource.size > 0 && <span>{formatSize(resource.size)}</span>}
          <span>par {resource.uploadedBy?.prenom} {resource.uploadedBy?.nom}</span>
          <span>{formatDate(resource.createdAt)}</span>
        </div>
        {resource.description && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{resource.description}</div>}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Download size={13} /> Télécharger
        </a>
        {canDelete && (
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(resource._id)}><Trash2 size={13} /></button>
        )}
      </div>
    </div>
  );
}

/* ─── VideoCard ──────────────────────────────────────────────────────────── */
function VideoCard({ video, isProf, onWatch }) {
  return (
    <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ width: 48, height: 48, borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d030', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Video size={22} color="#22c55e" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{video.titre}</div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
          {video.description && <span>{video.description.slice(0, 80)}{video.description.length > 80 ? '…' : ''}</span>}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        {!isProf && (
          <button onClick={() => onWatch(video._id)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Play size={13} /> Regarder
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── UploadModal ────────────────────────────────────────────────────────── */
function UploadModal({ courseId, onSuccess, onClose }) {
  const [file, setFile] = useState(null);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !titre.trim()) { setError('Titre et fichier requis.'); return; }
    setUploading(true); setError('');
    const fd = new FormData();
    fd.append('file', file); fd.append('titre', titre.trim());
    fd.append('description', description.trim()); fd.append('courseId', courseId);
    try {
      const { data } = await api.post('/resources/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 100)),
      });
      onSuccess(data);
    } catch (err) {
      setError(err.response?.data?.message ?? "Erreur lors de l'upload.");
    } finally { setUploading(false); setProgress(0); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '24px' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 700 }}>Ajouter un fichier</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div><label className="form-label">Titre *</label><input className="form-input" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="ex: Cours Chapitre 3" /></div>
          <div><label className="form-label">Description (optionnel)</label><input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brève description..." /></div>
          <div><label className="form-label">Fichier * (PDF, PPTX, DOCX, ZIP — max 50 Mo)</label><input ref={fileRef} type="file" accept=".pdf,.pptx,.ppt,.docx,.doc,.zip" onChange={(e) => setFile(e.target.files[0] ?? null)} className="form-input" /></div>
          {error && <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><AlertCircle size={14} /> {error}</div>}
          {uploading && <div style={{ background: '#f1f5f9', borderRadius: '8px', height: '8px', overflow: 'hidden' }}><div style={{ height: '100%', background: '#1B4F72', width: `${progress}%`, transition: 'width 0.3s' }} /></div>}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={uploading}><Upload size={14} />{uploading ? `${progress}%…` : 'Uploader'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page principale
═══════════════════════════════════════════════════════════════════════════ */
export default function ResourceLibrary() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canUpload = user?.role === 'professeur' || user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('fichiers');
  const [resources, setResources] = useState([]);
  const [videos, setVideos] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    Promise.all([
      api.get(`/resources/course/${courseId}`),
      api.get(`/decks/${courseId}`).catch(() => ({ data: null })),
      api.get(`/courses/${courseId}`).catch(() => ({ data: null })),
    ]).then(([rRes, , cRes]) => {
      setResources(rRes.data);
      if (cRes.data) setCourse(cRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    if (activeTab !== 'videos') return;
    setLoadingVideos(true);
    api.get(`/videos/course/${courseId}`)
      .then(({ data }) => setVideos(data))
      .catch(console.error)
      .finally(() => setLoadingVideos(false));
  }, [activeTab, courseId]);

  const handleAdd = (r) => setResources((prev) => [r, ...prev]);
  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette ressource ?')) return;
    await api.delete(`/resources/${id}`).catch(console.error);
    setResources((prev) => prev.filter((r) => r._id !== id));
  };

  const filtered = filterType === 'all' ? resources : resources.filter((r) => r.type === filterType);

  return (
    <Layout title="Bibliothèque">
      <Breadcrumb items={[
        { label: 'Accueil', to: '/' },
        { label: 'Mes cours', to: '/courses' },
        { label: course?.titre || 'Cours', to: `/courses/${courseId}` },
        { label: 'Bibliothèque' },
      ]} />

      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} color="#1B4F72" />
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>Bibliothèque de ressources</h1>
          </div>
          {canUpload && activeTab === 'fichiers' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}>
              <Upload size={14} /> Ajouter un fichier
            </button>
          )}
          {canUpload && activeTab === 'videos' && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/professor/courses/${courseId}/upload`)}>
              <Plus size={14} /> Ajouter une vidéo
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
          {[
            { id: 'fichiers', label: `Fichiers (${resources.length})`, icon: FileText },
            { id: 'videos',   label: `Vidéos${videos.length > 0 ? ` (${videos.length})` : ''}`, icon: Video },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: activeTab === id ? 600 : 400,
                color: activeTab === id ? '#1B4F72' : '#64748b',
                borderBottom: `2px solid ${activeTab === id ? '#1B4F72' : 'transparent'}`,
                marginBottom: '-2px', transition: 'all 0.15s',
              }}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* FICHIERS TAB */}
        {activeTab === 'fichiers' && (
          <>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {['all', 'pdf', 'pptx', 'docx', 'zip'].map((t) => (
                <button key={t} onClick={() => setFilterType(t)} className={filterType === t ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}>
                  {t === 'all' ? 'Tout' : t.toUpperCase()}
                </button>
              ))}
            </div>
            {loading && <div className="empty-state">Chargement…</div>}
            {!loading && filtered.length === 0 && (
              <div className="empty-state">
                <BookOpen size={32} />
                <p>Aucun fichier disponible{filterType !== 'all' ? ` de type ${filterType.toUpperCase()}` : ''}.</p>
                {canUpload && <button className="btn btn-primary" onClick={() => setShowUpload(true)}><Upload size={14} /> Ajouter le premier fichier</button>}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filtered.map((r) => <ResourceCard key={r._id} resource={r} canDelete={canUpload} onDelete={handleDelete} />)}
            </div>
          </>
        )}

        {/* VIDEOS TAB */}
        {activeTab === 'videos' && (
          <>
            {loadingVideos && <div className="empty-state">Chargement des vidéos…</div>}
            {!loadingVideos && videos.length === 0 && (
              <div className="empty-state">
                <Video size={32} />
                <p>Aucune vidéo dans ce cours.</p>
                {canUpload && (
                  <button className="btn btn-primary" onClick={() => navigate(`/professor/courses/${courseId}/upload`)}>
                    <Plus size={14} /> Ajouter une vidéo
                  </button>
                )}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {videos.map((v) => (
                <VideoCard
                  key={v._id}
                  video={v}
                  isProf={canUpload}
                  onWatch={(id) => navigate(`/watch/${id}`)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {showUpload && (
        <UploadModal
          courseId={courseId}
          onSuccess={(r) => { handleAdd(r); setShowUpload(false); }}
          onClose={() => setShowUpload(false)}
        />
      )}
    </Layout>
  );
}
