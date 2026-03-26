import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  Upload, FileVideo, X, CheckCircle, AlertCircle, ArrowLeft,
} from 'lucide-react';

const MAX_SIZE_MB = 100; // Limite Cloudinary gratuit

export default function ProfessorUpload() {
  const { courseId } = useParams();           // /professor/courses/:courseId/upload
  const navigate     = useNavigate();
  const inputRef     = useRef(null);

  const [file,     setFile]     = useState(null);
  const [form,     setForm]     = useState({ titre: '', description: '', order: '' });
  const [progress, setProgress] = useState(0);   // 0-100
  const [status,   setStatus]   = useState('idle'); // idle | uploading | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);

  /* ── File selection ─────────────────────────────────────────────────────── */
  const acceptFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith('video/')) {
      setErrorMsg('Seuls les fichiers vidéo sont acceptés.');
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMsg(`Fichier trop volumineux (max ${MAX_SIZE_MB} MB).`);
      return;
    }
    setFile(f);
    setErrorMsg('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    acceptFile(e.dataTransfer.files[0]);
  };

  /* ── Submit ─────────────────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file)       return setErrorMsg('Veuillez sélectionner un fichier.');
    if (!form.titre) return setErrorMsg('Le titre est obligatoire.');

    setStatus('uploading');
    setProgress(0);
    setErrorMsg('');

    const fd = new FormData();
    fd.append('video',       file);
    fd.append('titre',       form.titre);
    fd.append('description', form.description);
    fd.append('courseId',    courseId ?? '');
    fd.append('order',       form.order || '0');

    try {
      await api.post('/videos/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 5 * 60 * 1000, // 5 minutes pour les gros fichiers
        onUploadProgress: (evt) => {
          const pct = evt.total
            ? Math.round((evt.loaded / evt.total) * 100)
            : 0;
          setProgress(pct);
        },
      });
      setStatus('success');
      setProgress(100);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.response?.data?.message ?? "Erreur lors de l'upload.");
    }
  };

  const reset = () => {
    setFile(null);
    setForm({ titre: '', description: '', order: '' });
    setProgress(0);
    setStatus('idle');
    setErrorMsg('');
  };

  /* ── Helpers ─────────────────────────────────────────────────────────────── */
  const fmtSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Layout title="Ajouter une vidéo">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={15} />
        </button>
        <div>
          <h1 className="page-title">Ajouter une vidéo</h1>
          <p className="page-subtitle">La vidéo sera uploadée directement vers Cloudinary.</p>
        </div>
      </div>

      <div style={{ maxWidth: 640 }}>
        {/* ── Success state ─────────────────────────────────────────────── */}
        {status === 'success' ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
            <CheckCircle size={40} color="var(--color-primary)" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 8 }}>
              Vidéo uploadée avec succès
            </p>
            <p className="text-small" style={{ marginBottom: 28 }}>
              La vidéo est maintenant disponible dans le cours.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={reset}>
                <Upload size={15} /> Ajouter une autre vidéo
              </button>
              <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                Retour au cours
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Error */}
            {errorMsg && (
              <div className="alert alert-error" style={{ marginBottom: 20 }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ── Drop zone ──────────────────────────────────────────────── */}
            {!file ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: dragOver ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  padding: '48px 32px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 150ms, background-color 150ms',
                  marginBottom: 20,
                }}
              >
                <FileVideo
                  size={36}
                  color={dragOver ? 'var(--color-primary)' : 'var(--color-text-disabled)'}
                  style={{ margin: '0 auto 12px' }}
                />
                <p style={{ fontWeight: 600, fontSize: 'var(--font-size-md)', color: 'var(--color-text)', marginBottom: 4 }}>
                  Glissez votre vidéo ici
                </p>
                <p className="text-small" style={{ marginBottom: 16 }}>
                  ou cliquez pour parcourir — MP4, WebM, MOV (max {MAX_SIZE_MB} MB)
                </p>
                <span className="btn btn-secondary btn-sm" style={{ pointerEvents: 'none' }}>
                  <Upload size={13} /> Choisir un fichier
                </span>
                <input
                  ref={inputRef}
                  type="file"
                  accept="video/*"
                  style={{ display: 'none' }}
                  onChange={(e) => acceptFile(e.target.files[0])}
                />
              </div>
            ) : (
              /* ── File preview ───────────────────────────────────────────── */
              <div
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}
              >
                <div
                  style={{
                    width: 44, height: 44, flexShrink: 0,
                    backgroundColor: 'var(--color-primary-light)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <FileVideo size={22} color="var(--color-primary)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </p>
                  <p className="text-small">{fmtSize(file.size)}</p>
                </div>
                {status !== 'uploading' && (
                  <button
                    type="button"
                    onClick={reset}
                    className="btn btn-ghost btn-sm"
                    style={{ flexShrink: 0 }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            )}

            {/* ── Metadata fields ────────────────────────────────────────── */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
              <div>
                <label className="form-label" htmlFor="titre">
                  Titre <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  id="titre"
                  className="form-input"
                  placeholder="Ex: Introduction aux dérivées"
                  value={form.titre}
                  onChange={(e) => setForm((p) => ({ ...p, titre: e.target.value }))}
                  required
                  disabled={status === 'uploading'}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="description">Description</label>
                <textarea
                  id="description"
                  className="form-input"
                  style={{ minHeight: 80, resize: 'vertical' }}
                  placeholder="Contenu abordé dans cette vidéo..."
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  disabled={status === 'uploading'}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="order">Ordre dans le cours</label>
                <input
                  id="order"
                  type="number"
                  className="form-input"
                  style={{ width: 100 }}
                  placeholder="1"
                  min={0}
                  value={form.order}
                  onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))}
                  disabled={status === 'uploading'}
                />
                <p className="form-hint">Les vidéos sont triées par ordre croissant.</p>
              </div>
            </div>

            {/* ── Upload progress ─────────────────────────────────────────── */}
            {status === 'uploading' && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                    Upload en cours...
                  </span>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    {progress}%
                  </span>
                </div>
                <div style={{ height: 8, backgroundColor: 'var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${progress}%`,
                      backgroundColor: 'var(--color-primary)',
                      borderRadius: 4,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <p className="form-hint" style={{ marginTop: 6 }}>
                  Ne fermez pas cette page pendant l'upload.
                </p>
              </div>
            )}

            {/* ── Submit ──────────────────────────────────────────────────── */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!file || !form.titre || status === 'uploading'}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Upload size={16} />
              {status === 'uploading' ? `Upload... ${progress}%` : 'Uploader la vidéo'}
            </button>
          </form>
        )}
      </div>
    </Layout>
  );
}
