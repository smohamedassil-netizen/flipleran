import { useNavigate } from 'react-router-dom';
import {
  Play, FileText, Lightbulb, BookOpen,
  Lock, CheckCircle, Clock, RotateCcw,
} from 'lucide-react';

/**
 * LearningPathTimeline — Affichage du parcours pédagogique scénarisé
 * (Lebrun, 2007) sous forme de timeline verticale pour l'étudiant.
 *
 * Chaque étape se déverrouille séquentiellement quand la précédente est
 * complétée selon les critères configurés par le professeur (visionnage
 * minimum vidéo, score minimum QCM…).
 */

const TYPE_ICON = {
  video:   Play,
  qcm:     FileText,
  prosit:  Lightbulb,
  reading: BookOpen,
};

const TYPE_LABEL = {
  video:   'Capsule',
  qcm:     'QCM',
  prosit:  'Prosit',
  reading: 'Lecture',
};

const STATUS_STYLE = {
  locked: {
    color: 'var(--color-text-disabled)',
    bg:    'var(--color-bg)',
    border:'var(--color-border)',
    label: 'Verrouillé',
  },
  available: {
    color: 'var(--color-primary)',
    bg:    'var(--color-primary-light)',
    border:'var(--color-primary)',
    label: 'Disponible',
  },
  inprogress: {
    color: '#D4952A',
    bg:    '#FFFBEB',
    border:'#D4952A',
    label: 'En cours',
  },
  completed: {
    color: '#276749',
    bg:    '#F0FFF4',
    border:'#276749',
    label: 'Complété',
  },
};

/* ─── Step row ────────────────────────────────────────────────────────────── */
function StepRow({ step, index, total, progress, previousTitle, onAction, freeMode }) {
  const navigate = useNavigate();
  const Icon     = TYPE_ICON[step.type] || BookOpen;
  const status   = freeMode ? (progress?.status === 'locked' ? 'available' : progress?.status || 'available') : (progress?.status || 'locked');
  const style    = STATUS_STYLE[status] || STATUS_STYLE.locked;
  const isLast   = index === total - 1;

  const title    = step.title || step.resource?.titre || step.resource?.title || `Étape ${step.order + 1}`;
  const minutes  = step.estimatedMinutes || step.resource?.duration ? Math.ceil((step.resource?.duration ?? 0) / 60) : 0;
  const duration = step.estimatedMinutes || minutes;

  const lockedTooltip = !freeMode && status === 'locked' && previousTitle
    ? `Termine d'abord : ${previousTitle}`
    : '';

  const handleAction = () => {
    if (status === 'locked' && !freeMode) return;
    onAction?.(step);
  };

  let actionLabel = 'Commencer';
  let ActionIcon = Play;
  if (status === 'completed') { actionLabel = 'Réviser'; ActionIcon = RotateCcw; }
  else if (status === 'inprogress') { actionLabel = 'Reprendre'; ActionIcon = Clock; }
  else if (status === 'locked') { actionLabel = 'Verrouillé'; ActionIcon = Lock; }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '60px 1fr',
      gap: 16,
      position: 'relative',
    }}>
      {/* ── Bullet + connector ──────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div
          style={{
            width: 44, height: 44,
            borderRadius: '50%',
            background: status === 'completed' ? style.color : style.bg,
            border: `2px solid ${style.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            color: status === 'completed' ? '#fff' : style.color,
            fontWeight: 800,
            fontSize: 16,
            boxShadow: status === 'available' ? '0 0 0 4px rgba(27,79,114,0.08)' : 'none',
            transition: 'box-shadow 200ms',
          }}
        >
          {status === 'completed'
            ? <CheckCircle size={20} color="#fff" />
            : status === 'locked'
              ? <Lock size={18} />
              : (step.order + 1)}
        </div>
        {!isLast && (
          <div style={{
            width: 2, flex: 1, minHeight: 40,
            backgroundColor: status === 'completed' ? style.color : 'var(--color-border)',
            transition: 'background-color 300ms',
          }} />
        )}
      </div>

      {/* ── Content card ───────────────────────────────────────────── */}
      <div
        title={lockedTooltip}
        style={{
          backgroundColor: 'var(--color-surface)',
          border: `1px solid ${status === 'available' ? style.border : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          marginBottom: 16,
          opacity: status === 'locked' && !freeMode ? 0.6 : 1,
          transition: 'opacity 200ms, border-color 200ms',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '2px 8px',
            borderRadius: 999,
            backgroundColor: style.bg,
            color: style.color,
            fontSize: 'var(--font-size-xs)', fontWeight: 700,
          }}>
            <Icon size={12} />
            {TYPE_LABEL[step.type] || step.type}
          </div>
          {duration > 0 && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} /> {duration} min
            </span>
          )}
          <span style={{
            marginLeft: 'auto',
            fontSize: 'var(--font-size-xs)', fontWeight: 700,
            color: style.color,
          }}>
            {style.label}
            {progress?.bestScore !== null && progress?.bestScore !== undefined && status === 'completed' && step.type === 'qcm' && (
              <> · {progress.bestScore}%</>
            )}
            {progress?.watchedPercent > 0 && status === 'inprogress' && step.type === 'video' && (
              <> · {progress.watchedPercent}%</>
            )}
          </span>
        </div>

        {/* Title */}
        <p style={{
          fontSize: 'var(--font-size-md)', fontWeight: 700,
          color: 'var(--color-text)', marginBottom: 4,
        }}>
          {title}
        </p>

        {/* Custom message du prof */}
        {step.customMessage && (
          <p style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            fontStyle: 'italic',
            marginBottom: 10,
            paddingLeft: 10,
            borderLeft: `2px solid ${style.border}`,
          }}>
            {step.customMessage}
          </p>
        )}

        {/* Action button */}
        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className={status === 'locked' && !freeMode ? 'btn btn-ghost btn-sm' : 'btn btn-primary btn-sm'}
            onClick={handleAction}
            disabled={status === 'locked' && !freeMode}
            style={{
              backgroundColor: status === 'completed' ? '#276749'
                : status === 'inprogress' ? '#D4952A'
                : status === 'locked' && !freeMode ? undefined
                : undefined,
              color: status === 'completed' || status === 'inprogress' ? '#fff' : undefined,
            }}
          >
            <ActionIcon size={13} /> {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main timeline ───────────────────────────────────────────────────────── */
export default function LearningPathTimeline({ path, freeMode = false, onToggleFreeMode = null, canToggleFreeMode = false }) {
  const navigate = useNavigate();
  const steps    = path?.steps || [];
  const progress = path?.progress || {};

  /* ── Stats ──────────────────────────────────────────────────────────── */
  const completedCount = steps.filter((s) => progress[s._id]?.status === 'completed').length;
  const totalCount     = steps.length;
  const pct            = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  /* ── Action handler ─────────────────────────────────────────────────── */
  const handleStepAction = (step) => {
    if (step.resourceModel === 'Video') {
      navigate(`/watch/${step.resourceId}`);
    } else if (step.resourceModel === 'QCM') {
      // Le QCM est lié à une capsule : on récupère videoId depuis la ressource hydratée
      const videoId = step.resource?.videoId;
      if (videoId) navigate(`/qcm/${videoId}`);
      else if (step.resource?._id) navigate(`/qcm/${step.resource._id}`);
    } else if (step.resourceModel === 'Prosit') {
      navigate(`/prosits/${step.resourceId}`);
    } else if (step.resourceModel === 'Resource') {
      // Ressource statique : on ouvre l'URL directement
      const url = step.resource?.url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div>
      {/* ── Header parcours ──────────────────────────────────────────── */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 18px',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
              Parcours pédagogique
              {path?.isDraft && (
                <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 999, fontSize: 10, backgroundColor: '#FFFBEB', color: '#D4952A', border: '1px solid #D4952A33' }}>
                  Brouillon
                </span>
              )}
            </p>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, color: 'var(--color-text)' }}>
              {path?.title || 'Parcours d\'apprentissage'}
            </h2>
            {path?.description && (
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 6 }}>
                {path.description}
              </p>
            )}
          </div>

          {canToggleFreeMode && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onToggleFreeMode?.(!freeMode)}
              title="Désactive le verrou séquentiel pour prévisualiser le parcours"
              style={{ flexShrink: 0 }}
            >
              {freeMode ? '🔓 Vue libre' : '🔒 Vue étudiant'}
            </button>
          )}
        </div>

        {/* Barre de progression */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
              {completedCount}/{totalCount} étape{totalCount > 1 ? 's' : ''} complétée{completedCount > 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-primary)' }}>
              {pct}%
            </span>
          </div>
          <div style={{ height: 8, backgroundColor: 'var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              backgroundColor: pct === 100 ? '#276749' : 'var(--color-primary)',
              borderRadius: 4,
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      </div>

      {/* ── Timeline ─────────────────────────────────────────────────── */}
      {steps.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={32} className="empty-state-icon" />
          <p className="empty-state-title">Aucune étape configurée</p>
          <p className="empty-state-desc">Le professeur n'a pas encore ajouté d'étape à ce parcours.</p>
        </div>
      ) : (
        <div>
          {steps.map((step, i) => (
            <StepRow
              key={step._id}
              step={step}
              index={i}
              total={steps.length}
              progress={progress[step._id]}
              previousTitle={i > 0 ? (steps[i - 1].title || steps[i - 1].resource?.titre || `Étape ${i}`) : ''}
              onAction={handleStepAction}
              freeMode={freeMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
