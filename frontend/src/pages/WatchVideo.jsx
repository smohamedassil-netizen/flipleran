import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import VideoPlayer from '../components/VideoPlayer.jsx';
import api from '../utils/api.js';
import { ArrowLeft, AlertCircle, BookOpen, Home, ListOrdered } from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb.jsx';
import VideoAnalysis from '../components/VideoAnalysis.jsx';
import { useGamification } from '../context/GamificationContext.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function WatchVideo() {
  const { videoId } = useParams();
  const navigate    = useNavigate();
  const { notify }  = useGamification();
  const { user }    = useAuth();

  const handlePointsEarned = useCallback((points) => {
    notify({ earned: points.earned, newBadges: points.newBadges ?? [] });
  }, [notify]);

  const [video,   setVideo]   = useState(null);
  const [videos,  setVideos]  = useState([]);   // liste du cours pour navigation
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const seekToChapter = (timestamp) => {
    const videoEl = document.querySelector('video');
    if (videoEl) {
      videoEl.currentTime = timestamp;
      videoEl.play();
    }
  };

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const { data } = await api.get(`/videos/${videoId}`);
        setVideo(data);

        // Charger la liste du cours pour trouver la vidéo suivante
        const listRes = await api.get(`/videos/course/${data.courseId._id ?? data.courseId}`);
        setVideos(listRes.data);
      } catch (err) {
        setError(err.response?.data?.message ?? 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [videoId]);

  if (loading) return <Layout title="Lecture"><p className="text-small">Chargement...</p></Layout>;

  if (error) {
    return (
      <Layout title="Lecture">
        <div className="alert alert-error">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      </Layout>
    );
  }

  // Trouver la vidéo suivante dans le cours
  const currentIndex = videos.findIndex((v) => v._id === video._id);
  const nextVideo    = videos[currentIndex + 1];
  const nextPath     = nextVideo ? `/watch/${nextVideo._id}` : `/qcm/${videoId}`;

  const courseId = video.courseId._id ?? video.courseId;

  return (
    <Layout title={video.titre}>
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Accueil', to: '/', icon: Home },
        { label: 'Mes cours', to: '/courses' },
        { label: video.courseId?.titre ?? 'Cours', to: `/courses/${courseId}` },
        { label: video.titre },
      ]} />

      <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>
        {/* ── Player ─────────────────────────────────────────────────────── */}
        <div>
          <VideoPlayer
            videoId={video._id}
            src={video.url}
            titre={video.titre}
            initialPercent={video.myProgress?.watchedPercent ?? 0}
            nextPath={nextPath}
            courseId={courseId}
            onPointsEarned={handlePointsEarned}
          />

          {/* Description */}
          {video.description && (
            <div className="card" style={{ marginTop: 16 }}>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', lineHeight: 1.7 }}>
                {video.description}
              </p>
            </div>
          )}

          {/* Chapitres */}
          {video.chapters && video.chapters.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <ListOrdered size={16} color="var(--color-primary)" />
                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, margin: 0 }}>
                  Chapitres ({video.chapters.length} parties)
                </h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {video.chapters.map((ch, i) => (
                  <button
                    key={i}
                    onClick={() => seekToChapter(ch.timestamp)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 150ms',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                    }}
                  >
                    <span style={{
                      backgroundColor: 'var(--color-primary)',
                      color: '#fff',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      flexShrink: 0,
                    }}>
                      {formatTime(ch.timestamp)}
                    </span>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', fontWeight: 500 }}>
                      {ch.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Analyse IA */}
          <VideoAnalysis videoId={video._id} userRole={user?.role} />
        </div>

        {/* ── Playlist ───────────────────────────────────────────────────── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 700,
              color: 'var(--color-text)',
            }}
          >
            Videos du cours
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {videos.map((v, i) => {
              const pct     = v.myProgress?.watchedPercent ?? 0;
              const done    = v.myProgress?.completed || pct >= 80;
              const isThis  = v._id === videoId;

              return (
                <button
                  key={v._id}
                  onClick={() => navigate(`/watch/${v._id}`)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 16px',
                    backgroundColor: isThis ? 'var(--color-primary-light)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 150ms',
                  }}
                >
                  {/* Status dot */}
                  <div
                    style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      backgroundColor: done
                        ? 'var(--color-primary)'
                        : pct > 0
                          ? 'var(--color-accent)'
                          : 'var(--color-border)',
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: isThis ? 700 : 500,
                      color: isThis ? 'var(--color-primary)' : 'var(--color-text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {i + 1}. {v.titre}
                  </span>
                  {done && (
                    <span style={{ fontSize: 10, color: 'var(--color-primary)', flexShrink: 0 }}>
                      {pct}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
