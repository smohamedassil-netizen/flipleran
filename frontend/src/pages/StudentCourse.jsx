import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import LearningPathTimeline from '../components/LearningPathTimeline.jsx';
import PedagogicalHeader from '../components/PedagogicalHeader.jsx';
import HonorBoard from '../components/HonorBoard.jsx';
import ModuleParcoursPanel from '../components/ModuleParcoursPanel.jsx';
import ChaptersView from '../components/ChaptersView.jsx';
import {
  Play, CheckCircle, Clock, Lock, Home,
  BookOpen, AlertCircle, ChevronRight, MessageSquare,
  ArrowLeft, Upload, FileText, PenTool, Edit3, Trash2,
  HelpCircle, Route, Settings as SettingsIcon, Target, Sparkles,
  BarChart2,
} from 'lucide-react';

/* ─── Status helpers ──────────────────────────────────────────────────────── */
const getStatus = (progress) => {
  if (!progress) return 'unseen';
  if (progress.completed || progress.watchedPercent >= 80) return 'completed';
  if (progress.watchedPercent > 0) return 'inprogress';
  return 'unseen';
};

const STATUS_CONFIG = {
  completed:  { label: 'Vu',       color: 'var(--color-primary)',        bg: 'var(--color-primary-light)', Icon: CheckCircle },
  inprogress: { label: 'En cours', color: 'var(--color-accent-hover)',   bg: 'var(--color-accent-light)',  Icon: Clock },
  unseen:     { label: 'Non vu',   color: 'var(--color-text-disabled)',  bg: 'var(--color-bg)',            Icon: Play },
};

/* ─── Video row ───────────────────────────────────────────────────────────── */
function VideoRow({ video, index, onSelect, isActive, isProfOrAdmin, navigate, onEdit, onDelete, questionCount = 0 }) {
  const progress = video.myProgress;
  const status   = getStatus(progress);
  const cfg      = STATUS_CONFIG[status];
  const Icon     = cfg.Icon;
  const pct      = progress?.watchedPercent ?? 0;
  const locked   = false; // à activer si logique de pré-requis

  return (
    <button
      onClick={() => !locked && onSelect(video)}
      disabled={locked}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        backgroundColor: isActive ? 'var(--color-primary-light)' : 'var(--color-surface)',
        border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        cursor: locked ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        transition: 'background-color 150ms, border-color 150ms',
        opacity: locked ? 0.5 : 1,
      }}
    >
      {/* Index / icon */}
      <div
        style={{
          width: 36, height: 36, flexShrink: 0,
          borderRadius: 'var(--radius-md)',
          backgroundColor: isActive ? 'var(--color-primary)' : cfg.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {locked
          ? <Lock size={16} color="var(--color-text-disabled)" />
          : <Icon size={16} color={isActive ? '#fff' : cfg.color} />
        }
      </div>

      {/* Title + progress */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontWeight: 600,
            fontSize: 'var(--font-size-sm)',
            color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {index + 1}. {video.titre}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          {/* Mini progress bar */}
          <div style={{ flex: 1, height: 3, backgroundColor: 'var(--color-border)', borderRadius: 2, overflow: 'hidden', maxWidth: 140 }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              backgroundColor: status === 'completed' ? 'var(--color-primary)' : 'var(--color-accent)',
              borderRadius: 2, transition: 'width 0.3s',
            }} />
          </div>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
            {pct}%
          </span>
          <span
            style={{
              fontSize: 'var(--font-size-xs)', fontWeight: 600,
              color: cfg.color, flexShrink: 0,
            }}
          >
            {cfg.label}
          </span>
          {/* Badge questions interactives in-video */}
          {questionCount > 0 && (
            <span
              title={`${questionCount} question(s) interactive(s) déclenchée(s) pendant la vidéo`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '1px 7px', borderRadius: 999,
                background: '#FEF3C7', color: '#92400E',
                fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}
            >
              <HelpCircle size={10} /> {questionCount} question{questionCount > 1 ? 's' : ''} interactive{questionCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons for professors */}
      {isProfOrAdmin && (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            className="btn btn-sm"
            title="Préparer ce cours avec l'IA (questions, QCM, outcomes, Prosit, flashcards)"
            onClick={(e) => { e.stopPropagation(); navigate(`/professor/courses/${video.courseId}/videos/${video._id}/auto-prep`); }}
            style={{
              background: 'linear-gradient(135deg, #9333EA, #C084FC)',
              color: '#fff', border: 'none', fontWeight: 700,
              padding: '4px 10px',
            }}
          >
            <Sparkles size={13} /> IA
          </button>
          <button
            className="btn btn-ghost btn-sm"
            title="Créer / Modifier QCM"
            onClick={(e) => { e.stopPropagation(); navigate(`/professor/videos/${video._id}/qcm`); }}
          >
            <PenTool size={13} /> QCM
          </button>
          <button
            className="btn btn-ghost btn-sm"
            title="Questions interactives in-video"
            onClick={(e) => { e.stopPropagation(); navigate(`/professor/videos/${video._id}/questions`); }}
          >
            <HelpCircle size={13} /> Questions
          </button>
          <button
            className="btn btn-ghost btn-sm"
            title="Découper la vidéo en parties pédagogiques (microlearning)"
            onClick={(e) => { e.stopPropagation(); navigate(`/professor/videos/${video._id}/parts`); }}
            style={{ color: '#9333EA' }}
          >
            <Sparkles size={13} /> Parts
          </button>
          <button
            className="btn btn-ghost btn-sm"
            title="Modifier la vidéo"
            onClick={(e) => { e.stopPropagation(); onEdit?.(video); }}
            style={{ color: 'var(--color-accent)' }}
          >
            <Edit3 size={13} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            title="Supprimer la vidéo"
            onClick={(e) => { e.stopPropagation(); onDelete?.(video); }}
            style={{ color: '#e74c3c' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}

      <ChevronRight size={15} color="var(--color-text-disabled)" style={{ flexShrink: 0 }} />
    </button>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function StudentCourse() {
  const { courseId } = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const isProfOrAdmin = user?.role === 'professeur' || user?.role === 'admin';

  const [course,  setCourse]  = useState(null);
  const [videos,  setVideos]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [editingVideo, setEditingVideo] = useState(null);
  const [editForm, setEditForm] = useState({ titre: '', description: '', order: 0, chapters: [] });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [questionCounts, setQuestionCounts] = useState({});  // { videoId: count }
  const [learningPath, setLearningPath] = useState(null);    // null = pas chargé, false = aucun
  const [freeMode, setFreeMode] = useState(false);            // toggle prof : vue libre
  const [outcomesData, setOutcomesData] = useState({ learningOutcomes: [], pedagogicalContract: '' });

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };
  const parseTime = (str) => {
    const parts = str.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + (parts[1] || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
    return Number(str) || 0;
  };

  const handleEditVideo = (video) => {
    setEditingVideo(video);
    setEditForm({
      titre: video.titre,
      description: video.description || '',
      order: video.order || 0,
      chapters: video.chapters || [],
    });
  };

  const addChapter = () => {
    setEditForm({
      ...editForm,
      chapters: [...editForm.chapters, { title: '', timestamp: 0 }],
    });
  };
  const removeChapter = (i) => {
    setEditForm({
      ...editForm,
      chapters: editForm.chapters.filter((_, idx) => idx !== i),
    });
  };
  const updateChapter = (i, field, value) => {
    const chs = [...editForm.chapters];
    chs[i] = { ...chs[i], [field]: value };
    setEditForm({ ...editForm, chapters: chs });
  };

  const handleSaveEdit = async () => {
    try {
      await api.put(`/videos/${editingVideo._id}`, editForm);
      setVideos(videos.map(v => v._id === editingVideo._id ? { ...v, ...editForm } : v));
      setEditingVideo(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la modification');
    }
  };

  const handleDeleteVideo = async (video) => {
    try {
      await api.delete(`/videos/${video._id}`);
      setVideos(videos.filter(v => v._id !== video._id));
      setDeleteConfirm(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  // Chargement du parcours pédagogique (peut être absent → fallback liste de vidéos)
  const fetchLearningPath = async (useFreeMode = freeMode) => {
    try {
      const url = `/learning-paths/course/${courseId}${useFreeMode ? '?free=true' : ''}`;
      const { data } = await api.get(url);
      setLearningPath(data);
    } catch (err) {
      // 404 = pas de parcours configuré → on garde le fallback liste de vidéos
      setLearningPath(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseRes, videosRes] = await Promise.all([
          api.get(`/courses/${courseId}`),
          api.get(`/videos/course/${courseId}`),
        ]);
        setCourse(courseRes.data);
        setVideos(videosRes.data);

        // Compte les questions in-video par vidéo (en parallèle, fail silencieux)
        const counts = {};
        await Promise.all((videosRes.data || []).map(async (v) => {
          try {
            const { data } = await api.get(`/video-questions/video/${v._id}`);
            counts[v._id] = Array.isArray(data) ? data.length : 0;
          } catch { counts[v._id] = 0; }
        }));
        setQuestionCounts(counts);

        await fetchLearningPath(false);

        // Objectifs Bloom + contrat pédagogique (silencieux si endpoint absent)
        try {
          const { data } = await api.get(`/courses/${courseId}/outcomes`);
          setOutcomesData({
            learningOutcomes: data.learningOutcomes || [],
            pedagogicalContract: data.pedagogicalContract || '',
          });
        } catch { /* ignore */ }
      } catch (err) {
        setError(err.response?.data?.message ?? 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId, isProfOrAdmin]);

  const handleToggleFreeMode = async (next) => {
    setFreeMode(next);
    await fetchLearningPath(next);
  };

  /* ── Stats ────────────────────────────────────────────────────────────────── */
  const completed   = videos.filter((v) => getStatus(v.myProgress) === 'completed').length;
  const inProgress  = videos.filter((v) => getStatus(v.myProgress) === 'inprogress').length;
  const totalPct    = videos.length
    ? Math.round(videos.reduce((s, v) => s + (v.myProgress?.watchedPercent ?? 0), 0) / videos.length)
    : 0;

  if (loading) {
    return (
      <Layout title="Cours">
        <p className="text-small">Chargement...</p>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Cours">
        <div className="alert alert-error">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={course?.titre ?? 'Cours'}>
      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <Breadcrumb items={[
        { label: 'Accueil', to: '/', icon: Home },
        { label: 'Mes cours', to: '/courses' },
        { label: course?.titre ?? 'Cours' },
      ]} />

      {/* F11B — Tableau d'honneur du mois (top 3 XP) */}
      {courseId && !isProfOrAdmin && (
        <div style={{ marginBottom: 20 }}>
          <HonorBoard courseId={courseId} />
        </div>
      )}

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">{course?.titre}</h1>
            <p className="page-subtitle">
              {course?.filiere} · {course?.promotion}
            </p>
          </div>
          {/* Professor action buttons */}
          {isProfOrAdmin && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/professor/courses/${courseId}/outcomes`)}>
                <Target size={14} /> Objectifs Bloom
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/professor/courses/${courseId}/path-builder`)}>
                <Route size={14} /> Parcours pédagogique
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/professor/courses/${courseId}/upload`)}>
                <Upload size={14} /> Ajouter vidéo
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/courses/${courseId}/resources`)}>
                <FileText size={14} /> Ressources
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/courses/${courseId}/grades`)}>
                <BarChart2 size={14} /> Notes CC
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Contrat pédagogique + Objectifs Bloom (Biggs 1996, Anderson & Krathwohl 2001) ── */}
      {(outcomesData.pedagogicalContract || outcomesData.learningOutcomes.length > 0) && (
        <PedagogicalHeader
          contract={outcomesData.pedagogicalContract}
          outcomes={outcomesData.learningOutcomes}
          videos={videos}
          isProfOrAdmin={isProfOrAdmin}
        />
      )}

      {/* ── Parcours pédagogique CAI (étudiants seulement) — Lebrun 2007 ── */}
      {!isProfOrAdmin && courseId && (
        <ModuleParcoursPanel courseId={courseId} />
      )}

      <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

        {/* ── Path scénarisé OU fallback liste de vidéos ───────────────── */}
        <div>
          {learningPath ? (
            <LearningPathTimeline
              path={learningPath}
              freeMode={freeMode}
              canToggleFreeMode={isProfOrAdmin}
              onToggleFreeMode={handleToggleFreeMode}
            />
          ) : (
            <>
              {/* Encart prof : invite à configurer le parcours */}
              {isProfOrAdmin && (
                <div style={{
                  padding: '12px 14px', marginBottom: 16, borderRadius: 10,
                  background: 'linear-gradient(135deg, #FFFBEB, #FFFEFA)',
                  borderLeft: '3px solid #D4952A', fontSize: 13, color: '#1E293B',
                }}>
                  <strong style={{ color: '#D4952A' }}>📚 Parcours pédagogique non configuré</strong> —
                  vous pouvez organiser les vidéos, QCM et Prosits en une séquence guidée pour vos étudiants.
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ marginLeft: 8, color: '#D4952A', fontWeight: 600 }}
                    onClick={() => navigate(`/professor/courses/${courseId}/path-builder`)}
                  >
                    Configurer le parcours →
                  </button>
                </div>
              )}
              {!isProfOrAdmin && (
                <div style={{
                  padding: '12px 14px', marginBottom: 16, borderRadius: 10,
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  fontSize: 13, color: 'var(--color-text-secondary)',
                  fontStyle: 'italic',
                }}>
                  Le prof n'a pas encore configuré de parcours pour ce cours. Voici la liste des vidéos disponibles.
                </div>
              )}

              {/* Vue par chapitres (Mastery learning Bloom 1968) — pédagogique */}
              <ChaptersView
                courseId={courseId}
                isProfOrAdmin={isProfOrAdmin}
                onVideoClick={(v) => navigate(`/watch/${v._id}`)}
              />
            </>
          )}
        </div>

        {/* ── Progress sidebar ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Global progress card */}
          <div className="card">
            <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', marginBottom: 12 }}>
              Ma progression
            </p>

            {/* Circle-like indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  width: 60, height: 60, borderRadius: '50%',
                  border: `5px solid ${totalPct === 100 ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                <span style={{ fontWeight: 800, fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
                  {totalPct}%
                </span>
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 'var(--font-size-md)', color: 'var(--color-text)' }}>
                  {totalPct === 100 ? 'Cours terminé !' : 'En cours'}
                </p>
                <p className="text-small">
                  {completed}/{videos.length} vidéos complétées
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 6, backgroundColor: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${totalPct}%`,
                backgroundColor: 'var(--color-primary)',
                borderRadius: 3,
                transition: 'width 0.5s',
              }} />
            </div>
          </div>

          {/* Stats breakdown */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
              Détail
            </p>
            {[
              { label: 'Complétées',  value: completed,                     color: 'var(--color-primary)',       Icon: CheckCircle },
              { label: 'En cours',    value: inProgress,                    color: 'var(--color-accent-hover)',  Icon: Clock },
              { label: 'Non vues',    value: videos.length - completed - inProgress, color: 'var(--color-text-disabled)', Icon: Play },
            ].map(({ label, value, color, Icon }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={14} color={color} />
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>{label}</span>
                </div>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          {videos.length > 0 && (
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                // Reprendre depuis la première vidéo non terminée
                const next = videos.find((v) => getStatus(v.myProgress) !== 'completed');
                navigate(`/watch/${(next ?? videos[0])._id}`);
              }}
            >
              <Play size={15} />
              {completed === videos.length ? 'Revoir le cours' : 'Continuer le cours'}
            </button>
          )}
          {/* Chat du cours */}
          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
            onClick={() => navigate(`/chat/course/${courseId}`)}
          >
            <MessageSquare size={15} />
            Chat du cours
          </button>
          {/* Assistant IA du module */}
          <button
            className="btn btn-ghost"
            style={{
              width: '100%', justifyContent: 'center', marginTop: '6px',
              background: 'linear-gradient(135deg, #1B4F72, #2874A6)',
              color: 'white', border: 'none',
            }}
            onClick={() => navigate(`/courses/${courseId}/assistant`)}
          >
            🤖 Assistant IA du module
          </button>
        </div>
      </div>

      {/* ── Modal édition vidéo ─────────────────────────────────────────── */}
      {editingVideo && (
        <div className="modal-overlay" onClick={() => setEditingVideo(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h3 style={{ marginBottom: 16, fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>
              <Edit3 size={18} style={{ marginRight: 8 }} />
              Modifier la vidéo
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Titre</label>
                <input
                  className="input"
                  value={editForm.titre}
                  onChange={(e) => setEditForm({ ...editForm, titre: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Ordre dans le cours</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={editForm.order}
                  onChange={(e) => setEditForm({ ...editForm, order: Number(e.target.value) })}
                  style={{ width: 100 }}
                />
              </div>

              {/* Chapitres */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                    Chapitres ({editForm.chapters.length})
                  </label>
                  <button className="btn btn-ghost btn-sm" onClick={addChapter} style={{ fontSize: 'var(--font-size-xs)' }}>
                    + Ajouter un chapitre
                  </button>
                </div>
                {editForm.chapters.length === 0 && (
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                    Aucun chapitre. Ajoutez des chapitres pour diviser la vidéo en parties.
                  </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                  {editForm.chapters.map((ch, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        className="input"
                        placeholder="mm:ss"
                        value={typeof ch.timestamp === 'number' ? formatTime(ch.timestamp) : ch.timestamp}
                        onChange={(e) => updateChapter(i, 'timestamp', parseTime(e.target.value))}
                        style={{ width: 70, textAlign: 'center', fontSize: 'var(--font-size-xs)' }}
                      />
                      <input
                        className="input"
                        placeholder="Titre du chapitre"
                        value={ch.title}
                        onChange={(e) => updateChapter(i, 'title', e.target.value)}
                        style={{ flex: 1, fontSize: 'var(--font-size-xs)' }}
                      />
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => removeChapter(i)}
                        style={{ color: '#e74c3c', padding: '2px 6px' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setEditingVideo(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmation suppression ──────────────────────────────── */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h3 style={{ marginBottom: 12, color: '#e74c3c', fontWeight: 700 }}>
              <Trash2 size={18} style={{ marginRight: 8 }} />
              Supprimer cette vidéo ?
            </h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
              Vous allez supprimer <strong>"{deleteConfirm.titre}"</strong>. Cette action est irréversible.
              La vidéo sera supprimée de Cloudinary et toutes les progressions des étudiants seront perdues.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Annuler</button>
              <button
                className="btn"
                style={{ backgroundColor: '#e74c3c', color: '#fff' }}
                onClick={() => handleDeleteVideo(deleteConfirm)}
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
