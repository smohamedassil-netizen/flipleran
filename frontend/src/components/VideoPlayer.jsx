import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { useVideoProgress } from '../hooks/useVideoProgress.js';
import InVideoQuestionOverlay from './InVideoQuestionOverlay.jsx';
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

/* ─── Hook : déclenche la modale QCM la 1ère fois que THRESHOLD est atteint ─
   Réservé aux étudiants — un prof qui prévisualise sa vidéo ne doit pas être
   invité à passer le QCM (il l'a créé). */
function useQcmPrompt(videoId, watchedPercent, qcmPath, userRole) {
  const [showPrompt, setShowPrompt] = useState(false);
  useEffect(() => {
    if (userRole !== 'etudiant') return;
    if (!qcmPath || !videoId) return;
    if (watchedPercent < THRESHOLD) return;
    const key = `fliplearn_qcm_prompt_${videoId}`;
    if (typeof window !== 'undefined' && window.sessionStorage?.getItem(key)) return;
    if (typeof window !== 'undefined') window.sessionStorage?.setItem(key, '1');
    setShowPrompt(true);
  }, [videoId, watchedPercent, qcmPath, userRole]);
  return [showPrompt, () => setShowPrompt(false)];
}

/* ─── Modale "QCM disponible !" ─────────────────────────────────────────── */
function QcmPromptModal({ qcmPath, onClose }) {
  const navigate = useNavigate();
  if (!qcmPath) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, zIndex: 9999,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'white', borderRadius: 14, padding: 28,
        maxWidth: 440, width: '100%',
        boxShadow: '0 20px 50px rgba(0,0,0,.25)',
      }}>
        <div style={{ fontSize: 44, marginBottom: 12, textAlign: 'center' }}>📝</div>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1B4F72', textAlign: 'center', marginBottom: 8 }}>
          QCM disponible !
        </h3>
        <p style={{ fontSize: 14, color: '#475569', textAlign: 'center', marginBottom: 20, lineHeight: 1.5 }}>
          Tu as visionné suffisamment de la vidéo pour débloquer le QCM associé. Veux-tu le passer maintenant pour gagner des points ?
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onClose} style={{
            padding: '10px 18px', borderRadius: 8,
            border: '1px solid #E5E7EB', background: 'white',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#475569',
          }}>Plus tard</button>
          <button onClick={() => { onClose(); navigate(qcmPath); }} style={{
            padding: '10px 18px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #D97706, #F59E0B)',
            color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>📝 Lancer le QCM</button>
        </div>
      </div>
    </div>
  );
}

/**
 * VideoPlayer
 * @param {string}  videoId        ID MongoDB de la vidéo
 * @param {string}  src            URL Cloudinary
 * @param {string}  titre
 * @param {number}  initialPercent progression déjà enregistrée (0-100)
 * @param {string}  nextVideoPath  route vers la vidéo suivante (null si dernière)
 * @param {string}  qcmPath        route vers le QCM de cette vidéo
 * @param {string}  courseId       utilisé pour le bouton "Retour au cours"
 */
/* ─── Charge le script YouTube IFrame API une seule fois ───────────────── */
function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id  = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      resolve(window.YT);
    };
  });
}

/* ─── Player YouTube via IFrame API : vrai tracking du temps regardé ────── */
function YouTubeEmbedPlayer({
  videoId, youtubeId, initialPercent, nextVideoPath, qcmPath, courseId, titre, userRole, onPointsEarned,
}) {
  const navigate = useNavigate();
  const isStudent = userRole === 'etudiant';
  const { watchedPercent, completed, onTimeUpdate, sendProgress } =
    useVideoProgress(videoId, initialPercent, { onPointsEarned });

  const playerRef    = useRef(null);
  const ytReady      = useRef(false);
  const containerId  = `yt-${videoId}`;

  // Initialise le YT.Player une fois que l'API est chargée.
  useEffect(() => {
    let mounted = true;
    let pollInterval;
    loadYouTubeAPI().then((YT) => {
      if (!mounted) return;
      playerRef.current = new YT.Player(containerId, {
        videoId: youtubeId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            ytReady.current = true;
            // Restaurer la position si progression sauvegardée
            const dur = playerRef.current.getDuration();
            if (initialPercent > 0 && initialPercent < THRESHOLD && dur > 0) {
              playerRef.current.seekTo((initialPercent / 100) * dur, true);
            }
          },
          onStateChange: (e) => {
            // 1 = playing : démarrer le polling du temps
            if (e.data === 1) {
              clearInterval(pollInterval);
              pollInterval = setInterval(() => {
                const p = playerRef.current;
                if (!p || !ytReady.current) return;
                const cur = p.getCurrentTime?.() ?? 0;
                const dur = p.getDuration?.() ?? 0;
                if (dur > 0) onTimeUpdate(cur, dur);
              }, 2000);
            } else {
              clearInterval(pollInterval);
            }
            // 0 = ended
            if (e.data === 0) sendProgress(100);
          },
        },
      });
    });
    return () => {
      mounted = false;
      clearInterval(pollInterval);
      try { playerRef.current?.destroy?.(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeId]);

  const markAsWatched = () => {
    sendProgress(100);
  };

  const thresholdReached = watchedPercent >= 80;
  const [showQcmPrompt, closeQcmPrompt] = useQcmPrompt(videoId, watchedPercent, qcmPath, userRole);

  return (
    <div>
      <div style={{
        position: 'relative', width: '100%',
        aspectRatio: '16 / 9',
        background: '#000', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,.1)',
      }}>
        {/* Le YT.Player remplace ce div par l'iframe officielle, on récupère le vrai temps via API */}
        <div id={containerId} style={{ width: '100%', height: '100%' }} title={titre} />
      </div>

      {/* Barre progression + actions */}
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ flex: 1, height: 6, background: 'var(--color-border)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${watchedPercent}%`, height: '100%',
              background: completed ? 'linear-gradient(90deg, var(--color-success), #10B981)' : 'linear-gradient(90deg, var(--color-primary), var(--color-primary-hover))',
              transition: 'width 0.5s',
            }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: completed ? 'var(--color-success)' : 'var(--color-primary)', minWidth: 40 }}>
            {Math.round(watchedPercent)}%
          </span>
          {completed && <CheckCircle size={16} color="var(--color-success)" />}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {!isStudent && (
            <span style={{ padding: '3px 10px', background: '#FEF3C7', color: '#92400E', borderRadius: 6, fontSize: 11, fontWeight: 700, marginLeft: 8 }}>
              Mode prévisualisation prof
            </span>
          )}
          {isStudent && !completed && (
            <button
              onClick={markAsWatched}
              style={{
                padding: '7px 14px', background: thresholdReached ? '#059669' : '#1B4F72',
                color: 'white', border: 'none', borderRadius: 8,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 4,
                marginLeft: 'auto',
              }}
            >
              <CheckCircle size={12} /> J'ai terminé la vidéo
            </button>
          )}
          {(isStudent && completed) && (
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              {qcmPath && (
                <button onClick={() => navigate(qcmPath)} style={{ padding: '7px 14px', background: 'linear-gradient(135deg, #D97706, #F59E0B)', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  📝 Passer le QCM
                </button>
              )}
              {nextVideoPath && (
                <button onClick={() => navigate(nextVideoPath)} style={{ padding: '7px 14px', background: '#1B4F72', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Vidéo suivante <ChevronRight size={12} />
                </button>
              )}
            </div>
          )}
          {!isStudent && qcmPath && (
            <button onClick={() => navigate(`/professor/videos/${videoId}/qcm`)} style={{ padding: '7px 14px', background: 'white', color: '#1B4F72', border: '1.5px solid #1B4F72', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
              ⚙ Gérer le QCM
            </button>
          )}
        </div>
      </div>
      {showQcmPrompt && <QcmPromptModal qcmPath={qcmPath} onClose={closeQcmPrompt} />}
    </div>
  );
}

export default function VideoPlayer({
  videoId,
  src,
  provider,
  youtubeId,
  titre,
  initialPercent = 0,
  nextVideoPath,
  qcmPath,
  courseId,
  userRole,
  onPointsEarned,
}) {
  const isStudent = userRole === 'etudiant';

  // Route vers player YouTube si provider = youtube
  if (provider === 'youtube' && youtubeId) {
    return (
      <YouTubeEmbedPlayer
        videoId={videoId}
        youtubeId={youtubeId}
        titre={titre}
        initialPercent={initialPercent}
        nextVideoPath={nextVideoPath}
        qcmPath={qcmPath}
        courseId={courseId}
        userRole={userRole}
        onPointsEarned={onPointsEarned}
      />
    );
  }

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

  const [showQcmPrompt, closeQcmPrompt] = useQcmPrompt(videoId, watchedPercent, qcmPath, userRole);

  /* ── Questions in-video (classe inversée Type 2 — Bergmann & Sams 2012,
        Mazur 1997 ConcepTest) ─────────────────────────────────────────── */
  const [videoQuestions,    setVideoQuestions]    = useState([]);
  const [answeredIds,       setAnsweredIds]       = useState(() => new Set());
  const [activeQuestion,    setActiveQuestion]    = useState(null);

  // Charge les questions au montage. Pour les étudiants, le serveur
  // sanitize la réponse (pas de correctAnswer ni explanation tant que
  // la question n'est pas répondue).
  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    api.get(`/video-questions/video/${videoId}`)
      .then(({ data }) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setVideoQuestions(list);
        const already = new Set(
          list.filter(q => q.previousAnswer).map(q => q._id)
        );
        setAnsweredIds(already);
      })
      .catch(() => { /* fail silent — pas de questions = comportement vidéo classique */ });
    return () => { cancelled = true; };
  }, [videoId]);

  // Trouve la question à déclencher : la première (par timestamp croissant)
  // dont le timestamp <= currentTime, qui n'est pas encore répondue, et
  // qui demande une pause. Les profs ne sont jamais interrompus.
  const findTriggerableQuestion = (t) => {
    if (!isStudent || !videoQuestions.length) return null;
    return videoQuestions.find(q =>
      q.pauseVideo
      && t >= q.timestamp
      && !answeredIds.has(q._id)
    ) || null;
  };

  const handleQuestionAnswered = (questionId) => {
    setAnsweredIds(prev => {
      const next = new Set(prev);
      next.add(questionId);
      return next;
    });
    setActiveQuestion(null);
    // Reprise de la lecture
    const v = videoRef.current;
    if (v) {
      v.play().catch(() => { /* autoplay parfois bloqué — l'utilisateur cliquera */ });
    }
  };

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

    // Déclenche une question interactive si on en croise une non-répondue.
    if (!activeQuestion) {
      const q = findTriggerableQuestion(v.currentTime);
      if (q) {
        v.pause();
        setPlaying(false);
        setActiveQuestion(q);
      }
    }
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
    if (!v) return;
    let target = ratio * v.duration;

    // Empêche un étudiant de sauter par-dessus une question non répondue.
    // On clamp le seek à juste avant le timestamp de la première question
    // pertinente (entre la position actuelle et la cible).
    if (isStudent) {
      const blocking = videoQuestions
        .filter(q => q.pauseVideo && !answeredIds.has(q._id))
        .filter(q => q.timestamp > v.currentTime && q.timestamp < target)
        .sort((a, b) => a.timestamp - b.timestamp)[0];
      if (blocking) {
        target = Math.max(0, blocking.timestamp - 0.1);
      }
    }
    v.currentTime = target;
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
            {/* Marqueurs des questions in-video : vert=répondu, orange=à venir.
                Pour les profs, le marqueur ouvre l'éditeur. */}
            {duration > 0 && videoQuestions.map(q => {
              const left = Math.min(100, Math.max(0, (q.timestamp / duration) * 100));
              const answered = answeredIds.has(q._id);
              return (
                <button
                  key={q._id}
                  type="button"
                  title={!isStudent
                    ? `Question à ${Math.floor(q.timestamp)}s — cliquez pour éditer`
                    : answered ? `Question (${Math.floor(q.timestamp)}s) — déjà répondue` : `Question à venir (${Math.floor(q.timestamp)}s)`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isStudent) {
                      navigate(`/professor/videos/${videoId}/questions`);
                    }
                  }}
                  aria-label={`Marqueur question ${Math.floor(q.timestamp)}s`}
                  style={{
                    position: 'absolute',
                    top: '50%', left: `${left}%`,
                    width: 10, height: 10, borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: answered ? '#16A34A' : '#F59E0B',
                    border: '2px solid #fff',
                    cursor: isStudent ? 'default' : 'pointer',
                    padding: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,.3)',
                  }}
                />
              );
            })}
          </div>

          {/* Buttons row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              aria-label={playing ? 'Mettre en pause' : 'Lire la vidéo'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', padding: 0 }}
            >
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>

            {/* Volume */}
            <button
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? 'Réactiver le son' : 'Couper le son'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', padding: 0 }}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range" min={0} max={1} step={0.05}
              value={muted ? 0 : volume}
              aria-label="Volume"
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
              aria-label="Passer en plein écran"
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

        {/* Boutons — étudiant : débloqués après 80% / prof : gérer le QCM */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
          {!isStudent && (
            <span style={{ padding: '4px 10px', background: '#FEF3C7', color: '#92400E', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
              Mode prévisualisation prof
            </span>
          )}
          {isStudent && qcmPath && (
            <button
              disabled={!completed}
              onClick={() => navigate(qcmPath)}
              className={completed ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ opacity: completed ? 1 : 0.45 }}
              title={completed ? 'Passer le QCM de cette vidéo' : `Regardez au moins ${THRESHOLD}% pour débloquer le QCM`}
            >
              {completed ? <CheckCircle size={15} /> : <ChevronRight size={15} />}
              {completed ? 'Faire le QCM' : `QCM (${watchedPercent}%)`}
            </button>
          )}
          {!isStudent && qcmPath && (
            <button
              onClick={() => navigate(`/professor/videos/${videoId}/qcm`)}
              className="btn btn-secondary"
              title="Modifier le QCM associé à cette vidéo"
            >
              ⚙ Gérer le QCM
            </button>
          )}
          {nextVideoPath && (isStudent ? completed : true) && (
            <button
              onClick={() => navigate(nextVideoPath)}
              className="btn btn-secondary"
            >
              <ChevronRight size={15} />
              Vidéo suivante
            </button>
          )}
        </div>
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

      {showQcmPrompt && <QcmPromptModal qcmPath={qcmPath} onClose={closeQcmPrompt} />}

      {/* Question interactive in-video — bloque la lecture jusqu'à réponse */}
      {activeQuestion && (
        <InVideoQuestionOverlay
          question={activeQuestion}
          onContinue={() => handleQuestionAnswered(activeQuestion._id)}
        />
      )}
    </div>
  );
}
