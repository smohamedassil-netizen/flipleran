import { useState } from 'react';
import {
  Trash2, GripVertical, Play, FileText, Lightbulb, BookOpen,
  ChevronDown, ChevronUp,
} from 'lucide-react';

const TYPE_INFO = {
  video:   { label: 'Vidéo',   Icon: Play },
  qcm:     { label: 'QCM',     Icon: FileText },
  prosit:  { label: 'Prosit',  Icon: Lightbulb },
  reading: { label: 'Lecture', Icon: BookOpen },
};

/**
 * PathBuilderStepCard — Carte d'édition inline d'une étape du parcours
 * pédagogique. Sortie de LearningPathBuilder pour respecter la limite
 * de 500 lignes par composant.
 */
export default function PathBuilderStepCard({
  step, index, total,
  onUpdate, onRemove, onMove,
  onDragStart, onDragOver, onDrop, isDragging,
}) {
  const [expanded, setExpanded] = useState(false);
  const Info = TYPE_INFO[step.type] || TYPE_INFO.video;
  const Icon = Info.Icon;

  const update = (patch) => onUpdate({ ...step, ...patch });
  const updateCriteria = (patch) => update({ unlockCriteria: { ...step.unlockCriteria, ...patch } });

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: `1px solid ${isDragging ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        marginBottom: 10,
        opacity: isDragging ? 0.5 : 1,
        transition: 'border-color 200ms, opacity 150ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ cursor: 'grab', color: 'var(--color-text-disabled)', flexShrink: 0 }} title="Glisser pour réordonner">
          <GripVertical size={18} />
        </span>

        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          backgroundColor: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, flexShrink: 0,
        }}>
          {index + 1}
        </div>

        <Icon size={16} color="var(--color-primary)" />

        <input
          className="input"
          placeholder={`Titre (par défaut : ${step.resource?.titre || step.resource?.title || Info.label})`}
          value={step.title || ''}
          onChange={(e) => update({ title: e.target.value })}
          style={{ flex: 1, fontSize: 'var(--font-size-sm)' }}
        />

        <button className="btn btn-ghost btn-sm" onClick={() => onMove(index, index - 1)} disabled={index === 0} title="Monter">↑</button>
        <button className="btn btn-ghost btn-sm" onClick={() => onMove(index, index + 1)} disabled={index === total - 1} title="Descendre">↓</button>

        <button className="btn btn-ghost btn-sm" onClick={() => setExpanded((v) => !v)} title={expanded ? 'Replier' : 'Déplier'}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <button className="btn btn-ghost btn-sm" onClick={() => onRemove(index)} style={{ color: '#9B2335' }} title="Supprimer cette étape">
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)', display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            Ressource liée : <strong>{step.resource?.titre || step.resource?.title || step.resourceId}</strong>
            <span style={{ marginLeft: 8 }}>({Info.label})</span>
          </div>

          <div>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, marginBottom: 4, display: 'block' }}>
              Message personnalisé du prof (max 500 car.)
            </label>
            <textarea
              className="input"
              rows={2}
              value={step.customMessage || ''}
              onChange={(e) => update({ customMessage: e.target.value.slice(0, 500) })}
              placeholder="Ex : 'Concentre-toi sur les exemples 2 et 3, ils reviennent au QCM.'"
              style={{ width: '100%', resize: 'vertical', fontSize: 'var(--font-size-sm)' }}
            />
            <p style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {(step.customMessage || '').length}/500
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <label style={{ fontSize: 'var(--font-size-xs)' }}>
              <input
                type="checkbox"
                checked={step.unlockCriteria?.previousCompleted !== false}
                onChange={(e) => updateCriteria({ previousCompleted: e.target.checked })}
                style={{ marginRight: 6 }}
              />
              Verrouillage séquentiel
            </label>
            {step.type === 'qcm' && (
              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Score min (%)</label>
                <input
                  type="number" min={0} max={100}
                  className="input"
                  value={step.unlockCriteria?.minScore ?? 50}
                  onChange={(e) => updateCriteria({ minScore: Number(e.target.value) })}
                  style={{ width: '100%', fontSize: 'var(--font-size-sm)' }}
                />
              </div>
            )}
            {step.type === 'video' && (
              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Visionné min (%)</label>
                <input
                  type="number" min={0} max={100}
                  className="input"
                  value={step.unlockCriteria?.minWatchPercent ?? 70}
                  onChange={(e) => updateCriteria({ minWatchPercent: Number(e.target.value) })}
                  style={{ width: '100%', fontSize: 'var(--font-size-sm)' }}
                />
              </div>
            )}
            <div>
              <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Durée estimée (min)</label>
              <input
                type="number" min={0}
                className="input"
                value={step.estimatedMinutes ?? 0}
                onChange={(e) => update({ estimatedMinutes: Number(e.target.value) })}
                style={{ width: '100%', fontSize: 'var(--font-size-sm)' }}
              />
            </div>
          </div>

          <label style={{ fontSize: 'var(--font-size-xs)' }}>
            <input
              type="checkbox"
              checked={step.isRequired !== false}
              onChange={(e) => update({ isRequired: e.target.checked })}
              style={{ marginRight: 6 }}
            />
            Étape obligatoire (sinon optionnelle, ne bloque pas la progression)
          </label>
        </div>
      )}
    </div>
  );
}
