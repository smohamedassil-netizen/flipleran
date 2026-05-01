import { useState } from 'react';
import api from '../utils/api.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import {
  CheckSquare, Square, Plus, Trash2, Lightbulb, X, Target,
  Zap, BookOpen, Hammer, Sparkles, ChevronDown, ChevronUp, TrendingUp,
  Info,
} from 'lucide-react';

const IDEA_TYPE_META = {
  exercice:  { label: 'Exercice',    Icon: Target,    color: '#0EA5E9', bg: '#E0F2FE' },
  workshop:  { label: 'Workshop',    Icon: Hammer,    color: '#7C3AED', bg: '#EDE9FE' },
  recherche: { label: 'Recherche',   Icon: BookOpen,  color: '#059669', bg: '#D1FAE5' },
  livrable:  { label: 'Livrable',    Icon: Zap,       color: '#D97706', bg: '#FEF3C7' },
  autre:     { label: 'Autre',       Icon: Sparkles,  color: '#64748B', bg: '#F1F5F9' },
};

const DIFFICULTE_META = {
  facile:    { label: 'Facile',    color: '#059669' },
  moyen:     { label: 'Moyen',     color: '#D97706' },
  difficile: { label: 'Difficile', color: '#DC2626' },
};

function computeProgress(project) {
  const phases = project.phases || [];
  if (phases.length === 0) return { percent: 0, details: { phases: 0, checklist: 0, livrables: 0 } };

  const phasesDone = phases.filter(p => p.statut === 'termine').length;
  const phasesPct = phases.length ? (phasesDone / phases.length) * 100 : 0;

  const allItems = phases.flatMap(p => p.checklist || []);
  const itemsDone = allItems.filter(i => i.done).length;
  const checklistPct = allItems.length ? (itemsDone / allItems.length) * 100 : (phasesDone > 0 ? 100 : 0);

  // Livrables : proportion des groupes ayant déposé au moins un livrable.
  // Si pas de groupes : on retombe sur l'ancien comportement (≥1 livrable = 100 %).
  const livrables = project.livrables || [];
  const groupesCount = project.groupes?.length || 0;
  let livrablesPct;
  if (groupesCount > 0) {
    const groupesAvecLivrable = new Set(livrables.map(l => l.groupeIndex)).size;
    livrablesPct = (groupesAvecLivrable / groupesCount) * 100;
  } else {
    livrablesPct = livrables.length > 0 ? 100 : 0;
  }

  // Moyenne pondérée : phases 40%, checklist 40%, livrables 20%
  const weighted = phasesPct * 0.4 + checklistPct * 0.4 + livrablesPct * 0.2;
  return {
    percent: Math.round(weighted),
    details: {
      phases: Math.round(phasesPct),
      checklist: Math.round(checklistPct),
      livrables: Math.round(livrablesPct),
      phasesCount: phases.length,
      phasesDone,
      itemsCount: allItems.length,
      itemsDone,
      livrablesCount: livrables.length,
      groupesCount,
    },
  };
}

/* ─── Progress widget ─────────────────────────────────────────────── */
function ProgressBar({ percent, color = '#1B4F72', height = 10 }) {
  return (
    <div style={{ width: '100%', height, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{
        width: `${percent}%`, height: '100%',
        background: `linear-gradient(90deg, ${color}, ${color}dd)`,
        borderRadius: 999, transition: 'width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }} />
    </div>
  );
}

export function ProjectProgressWidget({ project }) {
  const progress = computeProgress(project);
  const { details } = progress;
  const [showFormula, setShowFormula] = useState(false);
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <TrendingUp size={18} color="#1B4F72" />
        <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, margin: 0 }}>Progression globale</h3>
        <button
          type="button"
          onClick={() => setShowFormula(s => !s)}
          aria-label="Afficher le calcul de la progression"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, color: '#94A3B8', display: 'flex',
          }}
          title="Comment ce % est-il calculé ?"
        >
          <Info size={14} />
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 24, fontWeight: 800, color: '#1B4F72' }}>{progress.percent}%</span>
      </div>

      {showFormula && (
        <div style={{
          padding: '10px 12px', marginBottom: 12,
          background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8,
          fontSize: 11, color: '#475569', lineHeight: 1.5,
        }}>
          <strong style={{ color: '#1E293B' }}>Comment ce % est calculé :</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            <li><strong>Phases (40%)</strong> — proportion de phases au statut « terminé ».</li>
            <li><strong>Tâches (40%)</strong> — proportion d'éléments cochés dans les checklists des phases.</li>
            <li><strong>Livrables (20%)</strong> — proportion de groupes ayant déposé au moins un livrable.</li>
          </ul>
          <p style={{ margin: '6px 0 0', fontStyle: 'italic' }}>
            Score = 0.4 × phases + 0.4 × tâches + 0.2 × livrables
          </p>
        </div>
      )}

      <ProgressBar percent={progress.percent} height={10} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16, fontSize: 12 }}>
        <div>
          <div style={{ color: '#94A3B8', fontWeight: 600, marginBottom: 4 }} title="40% du score global">PHASES (40%)</div>
          <ProgressBar percent={details.phases} color="#7C3AED" height={6} />
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{details.phasesDone}/{details.phasesCount}</div>
        </div>
        <div>
          <div style={{ color: '#94A3B8', fontWeight: 600, marginBottom: 4 }} title="40% du score global">TÂCHES (40%)</div>
          <ProgressBar percent={details.checklist} color="#059669" height={6} />
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{details.itemsDone}/{details.itemsCount}</div>
        </div>
        <div>
          <div style={{ color: '#94A3B8', fontWeight: 600, marginBottom: 4 }} title="20% du score global">LIVRABLES (20%)</div>
          <ProgressBar percent={details.livrables} color="#D97706" height={6} />
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
            {details.groupesCount > 0
              ? `${details.livrables}% des groupes`
              : `${details.livrablesCount} déposé${details.livrablesCount > 1 ? 's' : ''}`}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Checklist par phase ───────────────────────────────────────────── */
export function PhaseChecklist({ projectId, phase, canManage, onUpdate }) {
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null); // item to delete (confirm dialog)

  const items = phase.checklist || [];
  const doneCount = items.filter(i => i.done).length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  const addItem = async () => {
    if (!newText.trim()) return;
    setLoading(true);
    try {
      await api.post(`/projects/${projectId}/phases/${phase._id}/checklist`, { texte: newText });
      setNewText('');
      setAdding(false);
      onUpdate();
    } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
    finally { setLoading(false); }
  };

  const toggle = async (item) => {
    try {
      await api.put(`/projects/${projectId}/phases/${phase._id}/checklist/${item._id}`, { done: !item.done });
      onUpdate();
    } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
  };

  const confirmRemove = async () => {
    if (!pendingDelete) return;
    try {
      await api.delete(`/projects/${projectId}/phases/${phase._id}/checklist/${pendingDelete._id}`);
      setPendingDelete(null);
      onUpdate();
    } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
  };

  if (items.length === 0 && !canManage && !adding) return null;

  return (
    <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: '2px solid #E5E7EB' }}>
      {items.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>
            <CheckSquare size={11} />
            {doneCount}/{items.length} tâches ({pct}%)
          </div>
          <ProgressBar percent={pct} color="#059669" height={4} />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map(item => (
          <div key={item._id} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
            borderRadius: 6, background: item.done ? '#F0FDF4' : 'transparent',
            transition: 'background 0.2s',
          }}>
            <button
              onClick={() => toggle(item)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}
              title={item.done ? 'Marquer comme non fait' : 'Marquer comme fait'}
              aria-label={item.done ? `Marquer comme non fait : ${item.texte}` : `Marquer comme fait : ${item.texte}`}
            >
              {item.done
                ? <CheckSquare size={16} color="#059669" />
                : <Square size={16} color="#94A3B8" />}
            </button>
            <span style={{
              flex: 1, fontSize: 13, color: item.done ? '#94A3B8' : '#1E293B',
              textDecoration: item.done ? 'line-through' : 'none',
            }}>
              {item.texte}
            </span>
            {canManage && (
              <button onClick={() => setPendingDelete(item)} aria-label={`Supprimer la tâche ${item.texte}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', padding: 2 }} title="Supprimer">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {canManage && adding && (
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <input
            autoFocus
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addItem(); if (e.key === 'Escape') { setAdding(false); setNewText(''); } }}
            placeholder="Nouvelle tâche..."
            style={{ flex: 1, padding: '6px 10px', fontSize: 13, border: '1px solid #E2E8F0', borderRadius: 6 }}
          />
          <button onClick={addItem} disabled={loading || !newText.trim()} style={{ padding: '6px 12px', background: '#1B4F72', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Ajouter
          </button>
          <button onClick={() => { setAdding(false); setNewText(''); }} style={{ padding: '6px 10px', background: 'none', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
            <X size={12} />
          </button>
        </div>
      )}

      {canManage && !adding && (
        <button onClick={() => setAdding(true)} style={{
          marginTop: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600,
          border: '1px dashed #CBD5E1', borderRadius: 6, background: 'transparent',
          color: '#64748B', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          <Plus size={12} /> Ajouter une tâche
        </button>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Supprimer cette tâche ?"
        message={pendingDelete ? `"${pendingDelete.texte}" sera supprimée définitivement.` : ''}
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmRemove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

/* ─── Idées / suggestions ──────────────────────────────────────────── */
export function IdeasPanel({ projectId, ideas = [], canManage, onUpdate }) {
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ titre: '', description: '', type: 'exercice', difficulte: 'moyen', estime: '' });
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const submit = async () => {
    if (!form.titre.trim()) return;
    setSaving(true);
    try {
      await api.post(`/projects/${projectId}/ideas`, form);
      setForm({ titre: '', description: '', type: 'exercice', difficulte: 'moyen', estime: '' });
      setAdding(false);
      onUpdate();
    } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const confirmRemove = async () => {
    if (!pendingDelete) return;
    try {
      await api.delete(`/projects/${projectId}/ideas/${pendingDelete._id}`);
      setPendingDelete(null);
      onUpdate();
    } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
  };

  if (ideas.length === 0 && !canManage) return null;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', padding: '16px 20px', background: 'none', border: 'none',
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <Lightbulb size={18} color="#D97706" />
        <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, margin: 0 }}>Idées & suggestions</h3>
        <span style={{ padding: '2px 8px', borderRadius: 999, background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 700 }}>
          {ideas.length}
        </span>
        <div style={{ marginLeft: 'auto' }}>
          {expanded ? <ChevronUp size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />}
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 20px 20px' }}>
          {ideas.length === 0 ? (
            <p style={{ color: '#94A3B8', fontSize: 13, margin: '0 0 12px', fontStyle: 'italic' }}>
              {canManage
                ? "Aucune idée. Ajoute des suggestions pour aider les étudiants à savoir quoi faire !"
                : "Le professeur n'a pas encore ajouté de suggestions."}
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
              {ideas.map(idea => {
                const typeMeta = IDEA_TYPE_META[idea.type] || IDEA_TYPE_META.autre;
                const diffMeta = DIFFICULTE_META[idea.difficulte] || DIFFICULTE_META.moyen;
                const TypeIcon = typeMeta.Icon;
                return (
                  <div key={idea._id} style={{
                    padding: 14, background: 'white', border: '1px solid #E5E7EB',
                    borderRadius: 10, borderLeft: `3px solid ${typeMeta.color}`,
                    position: 'relative',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        padding: '2px 8px', background: typeMeta.bg, color: typeMeta.color,
                        fontSize: 10, fontWeight: 700, borderRadius: 6,
                      }}>
                        <TypeIcon size={10} /> {typeMeta.label}
                      </span>
                      <span style={{ fontSize: 10, color: diffMeta.color, fontWeight: 700 }}>
                        • {diffMeta.label}
                      </span>
                      {idea.estime && (
                        <span style={{ fontSize: 10, color: '#94A3B8', marginLeft: 'auto' }}>⏱️ {idea.estime}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', marginBottom: 4 }}>{idea.titre}</div>
                    {idea.description && (
                      <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>{idea.description}</div>
                    )}
                    {canManage && (
                      <button
                        onClick={() => setPendingDelete(idea)}
                        aria-label={`Supprimer l'idée ${idea.titre}`}
                        style={{
                          position: 'absolute', top: 8, right: 8, background: 'none',
                          border: 'none', cursor: 'pointer', color: '#CBD5E1', padding: 2,
                        }}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {canManage && !adding && (
            <button onClick={() => setAdding(true)} style={{
              marginTop: 12, padding: '8px 14px',
              border: '1px dashed #CBD5E1', borderRadius: 8, background: 'white',
              color: '#1B4F72', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <Plus size={14} /> Ajouter une idée
            </button>
          )}

          {canManage && adding && (
            <div style={{ marginTop: 12, padding: 14, background: '#F8FAFC', borderRadius: 10 }}>
              <div style={{ display: 'grid', gap: 10 }}>
                <input
                  autoFocus
                  value={form.titre}
                  onChange={e => setForm({ ...form, titre: e.target.value })}
                  placeholder="Titre de l'idée (ex: Implémenter le scoring)"
                  style={{ padding: 10, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14 }}
                />
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Description (optionnelle)"
                  style={{ padding: 10, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ padding: 8, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: 'white' }}>
                    <option value="exercice">🎯 Exercice</option>
                    <option value="workshop">🔨 Workshop</option>
                    <option value="recherche">📚 Recherche</option>
                    <option value="livrable">⚡ Livrable</option>
                    <option value="autre">✨ Autre</option>
                  </select>
                  <select value={form.difficulte} onChange={e => setForm({ ...form, difficulte: e.target.value })} style={{ padding: 8, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: 'white' }}>
                    <option value="facile">Facile</option>
                    <option value="moyen">Moyen</option>
                    <option value="difficile">Difficile</option>
                  </select>
                  <input
                    value={form.estime}
                    onChange={e => setForm({ ...form, estime: e.target.value })}
                    placeholder="Durée (ex: 2h)"
                    style={{ padding: 8, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  <button onClick={() => { setAdding(false); setForm({ titre: '', description: '', type: 'exercice', difficulte: 'moyen', estime: '' }); }} style={{ padding: '7px 14px', background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                    Annuler
                  </button>
                  <button onClick={submit} disabled={saving || !form.titre.trim()} style={{ padding: '7px 14px', background: '#1B4F72', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving || !form.titre.trim() ? 'not-allowed' : 'pointer', opacity: saving || !form.titre.trim() ? 0.6 : 1 }}>
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Supprimer cette idée ?"
        message={pendingDelete ? `"${pendingDelete.titre}" sera supprimée définitivement.` : ''}
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmRemove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
