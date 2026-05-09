import { useState, useEffect } from 'react';
import api from '../utils/api.js';
import {
  Plus, X, Play, FileText, Lightbulb, BookOpen,
} from 'lucide-react';

const TYPE_OPTIONS = [
  { value: 'video',   label: 'Capsule',   Icon: Play,      model: 'Video' },
  { value: 'qcm',     label: 'QCM',     Icon: FileText,  model: 'QCM' },
  { value: 'prosit',  label: 'Prosit',  Icon: Lightbulb, model: 'Prosit' },
  { value: 'reading', label: 'Lecture', Icon: BookOpen,  model: 'Resource' },
];

const TYPE_INFO = TYPE_OPTIONS.reduce((acc, t) => { acc[t.value] = t; return acc; }, {});

/**
 * PathBuilderAddStep — Modal de sélection d'une nouvelle étape (type +
 * ressource) pour le LearningPathBuilder. Charge dynamiquement les
 * capsules / QCM / Prosits / Resources rattachés au cours courant.
 */
export default function PathBuilderAddStep({ courseId, onClose, onAdd }) {
  const [type, setType] = useState('video');
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true); setError(''); setResources([]); setSelectedId('');
      try {
        let list = [];
        if (type === 'video') {
          const { data } = await api.get(`/videos/course/${courseId}`);
          list = data || [];
        } else if (type === 'qcm') {
          const { data: vids } = await api.get(`/videos/course/${courseId}`);
          const qcms = await Promise.all((vids || []).map(async (v) => {
            try {
              const { data } = await api.get(`/qcm/video/${v._id}`);
              return data?._id ? { ...data, videoTitre: v.titre } : null;
            } catch { return null; }
          }));
          list = qcms.filter(Boolean);
        } else if (type === 'prosit') {
          const { data } = await api.get('/prosits');
          list = (data || []).filter((p) => {
            const cid = p.courseId?._id || p.courseId;
            return cid?.toString() === courseId;
          });
        } else if (type === 'reading') {
          const { data } = await api.get(`/resources/course/${courseId}`);
          list = data || [];
        }
        setResources(list);
      } catch (err) {
        setError(err.response?.data?.message || 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    };
    fetchResources();
  }, [type, courseId]);

  const handleAdd = () => {
    const resource = resources.find((r) => r._id === selectedId);
    if (!resource) return;
    onAdd({
      type,
      resourceId: resource._id,
      resourceModel: TYPE_INFO[type].model,
      title: resource.titre || resource.title || '',
      isRequired: true,
      unlockCriteria: { previousCompleted: true, minScore: 50, minWatchPercent: 70 },
      estimatedMinutes: type === 'video' && resource.duration ? Math.ceil(resource.duration / 60) : 0,
      customMessage: '',
      resource,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>
            <Plus size={18} style={{ marginRight: 6 }} /> Ajouter une étape
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 6, display: 'block' }}>
            Type d'étape
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {TYPE_OPTIONS.map((t) => {
              const Icon = t.Icon;
              const active = type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={active ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '10px 4px',
                  }}
                >
                  <Icon size={18} />
                  <span style={{ fontSize: 'var(--font-size-xs)' }}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 6, display: 'block' }}>
            Ressource à associer
          </label>
          {loading ? (
            <p className="text-small">Chargement…</p>
          ) : error ? (
            <p className="text-small" style={{ color: '#9B2335' }}>{error}</p>
          ) : resources.length === 0 ? (
            <p style={{ fontSize: 'var(--font-size-sm)', fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
              Aucune ressource de ce type disponible. Créez-en d'abord depuis le module.
            </p>
          ) : (
            <select
              className="form-input"
              style={{ width: '100%' }}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">— Choisir —</option>
              {resources.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.titre || r.title || `${TYPE_INFO[type].label} sans titre`}
                  {r.videoTitre ? ` (capsule : ${r.videoTitre})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={!selectedId}>
            <Plus size={14} /> Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
