import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVideoProgress } from '../hooks/useVideoProgress.js';
import {
  Play, Pause, Volume2, VolumeX,
  Maximize, CheckCircle, ChevronRight, Loader,
} from 'lucide-react';

const THRESHOLD = 80; // % pour débloquer le QCM

/* ─── formatage mm:ss ────────────────────────────────────────────────────── */
const fmt = (s) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = String(Math.floor(s % 60)).padStart(2, '0');
  return `${m}:${sec}`;
};

/**
 * VideoPlayer
 * @param {string}  videoId        ID MongoDB de la vidéo
 * @param {string}  src            URL Cloudinary
 * @param {string}  titre
 * @param {number}  initialPercent progression déjà enregistrée (0-100)
 * @param {string}  nextPath       route vers le QCM ou la vidéo suivante
 * @param {string}  courseId       utilisé pour le bouton "Retour au cours"
 */
export default function VideoPlayer({
  videoId,
  src,
  titre,
  initialPercent = 0,
  nextPath,
  courseId,
  onPointsEarned,
}) {
  const videoRef  = useRef(null);
  const navigate  = useNavigate();

  const [playing,  setPlaying]  = useState(false);
  const [muted,    setMuted]    = useState(false);
  const [volume,   setVolume]   = useState(1);
  const [duration, setDuration] = useState(0);
  const [current,  setCurrent]  = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef(null);

  const { watchedPercent, completed, onTimeUpdate, sendProgress } =
    useVideoProgress(videoId, initialPercent, { onPointsEarned });

  /* ── auto-hide controls ─────────────────────────────────────────────────── */
  const resetHideTimer = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  };

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  /* ── sync volume ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  /* ── event handlers ──────────────────────────────────────────────────────── */
  const handleLoadedMetadata = () => {
    setDuration(videoRef.current.duration);
    setLoading(false);
    // Reprendre depuis la progression sauvegardée
    if (initialPercent > 0 && initialPercent < THRESHOLD) {
      videoRef.current.currentTime =
        (initialPercent / 100) * videoRef.current.duration;
    }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrent(v.currentTime);

    // Buffered
    if (v.buffered.length > 0) {
      setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
    }

    onTimeUpdate(v.currentTime, v.duration);
  };

  const handleEnded = () => {
    setPlaying(false);
    sendProgress(100);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else          { v.pause(); setPlaying(false); }
    resetHideTimer();
  };

  const seek = (e) => {
    const rect  = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const v     = videoRef.current;
    if (v) v.currentTime = ratio * v.duration;
    resetHideTimer();
  };

  const fullscreen = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.requestFullscreen) v.requestFullscreen();
  };

  const progressPercent = duration ? (current / duration) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ── Player container ─────────────────────────────────────────────── */}
      <div
        onMouseMove={resetHideTimer}
        onClick={togglePlay}
        style={{
          position: 'relative',
          backgroundColor: '#000',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          cursor: 'pointer',
          aspectRatio: '16/9',
          width: '100%',
        }}
      >
        <video
          ref={videoRef}
          src={src}
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onWaiting={() => setLoading(true)}
          onCanPlay={() => setLoading(false)}
          onEnded={handleEnded}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          preload="metadata"
        />

        {/* Loading spinner */}
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <Loader size={36} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {/* Completed badge */}
        {completed && (
          <div
            style={{
              position: 'absolute', top: 12, right: 12,
              display: 'flex', alignItems: 'center', gap: 6,
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              fontFamily: 'var(--font-family)',
            }}
          >
            <CheckCircle size={13} />
            Complété
          </div>
        )}

        {/* Controls overlay */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '32px 16px 12px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
            opacity: showControls || !playing ? 1 : 0,
            transition: 'opacity 300ms',
          }}
        >
          {/* Progress bar */}
          <div
            onClick={seek}
            style={{
              position: 'relative', height: 4, backgroundColor: 'rgba(255,255,255,0.25)',
              borderRadius: 2, marginBottom: 10, cursor: 'pointer',
            }}
          >
            {/* Buffered */}
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${buffered}%`, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2 }} />
            {/* Played */}
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${progressPercent}%`, backgroundColor: 'var(--color-accent)', borderRadius: 2, transition: 'width 0.2s' }} />
            {/* Thumb */}
            <div style={{ position: 'absolute', top: '50%', left: `${progressPercent}%`, width: 12, height: 12, borderRadius: '50%', backgroundColor: 'var(--color-accent)', transform: 'translate(-50%, -50%)' }} />
          </div>

          {/* Buttons row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', padding: 0 }}
            >
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>

            {/* Volume */}
            <button
              onClick={() => setMuted((m) => !m)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', padding: 0 }}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range" min={0} max={1} step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => { setVolume(Number(e.target.value)); setMuted(false); }}
              style={{ width: 64, accentColor: 'var(--color-accent)', cursor: 'pointer' }}
            />

            {/* Time */}
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: 'var(--font-family)', marginLeft: 'auto' }}>
              {fmt(current)} / {fmt(duration)}
            </span>

            {/* Fullscreen */}
            <button
              onClick={fullscreen}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', padding: 0 }}
            >
              <Maximize size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Info + actions ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
            {titre}
          </h2>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {watchedPercent}% visionné
            {completed && (
              <span style={{ marginLeft: 8, color: 'var(--color-primary)', fontWeight: 600 }}>
                · Complété
              </span>
            )}
          </p>
        </div>

        {/* Bouton Suivant — débloqué après 80% */}
        {nextPath && (
          <button
            disabled={!completed}
            onClick={() => navigate(nextPath)}
            className={completed ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ flexShrink: 0, opacity: completed ? 1 : 0.45 }}
            title={completed ? undefined : `Regardez au moins ${THRESHOLD}% pour continuer`}
          >
            {completed ? <CheckCircle size={15} /> : <ChevronRight size={15} />}
            {completed ? 'Faire le QCM' : `Continuer (${watchedPercent}%)`}
          </button>
        )}
      </div>

      {/* ── Barre de progression visible ─────────────────────────────────── */}
      <div
        style={{
          height: 6,
          backgroundColor: 'var(--color-border)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${watchedPercent}%`,
            backgroundColor: completed ? 'var(--color-primary)' : 'var(--color-accent)',
            borderRadius: 3,
            transition: 'width 0.5s ease',
          }}
        />
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
