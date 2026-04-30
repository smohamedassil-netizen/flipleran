import { useState, useEffect } from 'react';
import api from '../utils/api.js';
import {
  X, Users, Shuffle, Save, AlertCircle, Plus, Trash2, ArrowRight,
} from 'lucide-react';

/**
 * PrositGroupComposer — Modal de composition des groupes pour un Prosit.
 *
 * 2 modes :
 *   1) **Aléatoire** (1 clic) : POST /:id/groupes/auto avec tous les étudiants
 *      cochés. Le backend les répartit en respectant min/maxMembres et fait
 *      la rotation obligatoire des rôles CESI.
 *   2) **Manuel** : sélecteur de N groupes + checkboxes pour assigner les
 *      étudiants. POST /:id/groupes/manual.
 */
const ROLES = ['animateur', 'secretaire', 'scribe', 'gestionnaire', 'membre'];

export default function PrositGroupComposer({ prosit, onClose, onUpdated }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving]     = useState(false);
  const [mode, setMode]         = useState('random');     // 'random' | 'manual'

  // Sélection des étudiants à inclure (random + manuel)
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Mode manuel : groupes avec leurs membres assignés
  const [manualGroups, setManualGroups] = useState([]);

  /* ── Chargement ──────────────────────────────────────────────────── */
  useEffect(() => {
    api.get(`/prosits/${prosit._id}/eligible-students`)
      .then(({ data }) => {
        setStudents(data.students || []);
        // Par défaut, sélectionner tous les non-encore-assignés
        const nonAssigned = (data.students || [])
          .filter((s) => !s.alreadyAssigned)
          .map((s) => s._id);
        setSelectedIds(new Set(nonAssigned));
      })
      .catch((err) => setError(err.response?.data?.message || 'Erreur de chargement.'))
      .finally(() => setLoading(false));
  }, [prosit._id]);

  /* ── Mode aléatoire ──────────────────────────────────────────────── */
  const submitRandom = async () => {
    setSaving(true); setError(''); setFeedback('');
    try {
      const studentIds = Array.from(selectedIds);
      if (studentIds.length < (prosit.groupesConfig?.minMembres || 4)) {
        setError(`Sélectionne au moins ${prosit.groupesConfig?.minMembres || 4} étudiants.`);
        return;
      }
      await api.post(`/prosits/${prosit._id}/groupes/auto`, { studentIds });
      setFeedback('Groupes générés aléatoirement avec rotation des rôles.');
      onUpdated?.();
      setTimeout(() => onClose?.(), 800);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur génération groupes.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Mode manuel ─────────────────────────────────────────────────── */
  const initManualGroups = () => {
    if (manualGroups.length === 0) {
      const sel = Array.from(selectedIds);
      const min = prosit.groupesConfig?.minMembres || 4;
      const numGroups = Math.max(1, Math.ceil(sel.length / Math.max(min, 4)));
      setManualGroups(Array.from({ length: numGroups }, (_, i) => ({
        nom: `Groupe ${i + 1}`,
        membres: [],          // [{ userId, role }]
      })));
    }
  };

  const addManualGroup = () => {
    setManualGroups((prev) => [...prev, { nom: `Groupe ${prev.length + 1}`, membres: [] }]);
  };
  const removeManualGroup = (i) => {
    setManualGroups((prev) => prev.filter((_, idx) => idx !== i));
  };
  const renameGroup = (i, nom) => {
    setManualGroups((prev) => prev.map((g, idx) => idx === i ? { ...g, nom } : g));
  };
  const assignMember = (groupIdx, userId, role = 'membre') => {
    setManualGroups((prev) => prev.map((g, idx) => {
      // Retire d'abord l'étudiant des autres groupes
      const cleanedMembres = g.membres.filter((m) => m.userId !== userId);
      if (idx === groupIdx) {
        // Ajoute au nouveau groupe
        return { ...g, membres: [...cleanedMembres, { userId, role }] };
      }
      return { ...g, membres: cleanedMembres };
    }));
  };
  const unassignMember = (userId) => {
    setManualGroups((prev) => prev.map((g) => ({
      ...g, membres: g.membres.filter((m) => m.userId !== userId),
    })));
  };
  const setMemberRole = (userId, role) => {
    setManualGroups((prev) => prev.map((g) => ({
      ...g,
      membres: g.membres.map((m) => m.userId === userId ? { ...m, role } : m),
    })));
  };

  const submitManual = async () => {
    setSaving(true); setError(''); setFeedback('');
    try {
      const validGroups = manualGroups.filter((g) => g.membres.length > 0);
      if (validGroups.length === 0) {
        setError('Aucun étudiant assigné. Glisse au moins quelques étudiants dans un groupe.');
        return;
      }
      const min = prosit.groupesConfig?.minMembres || 4;
      const tooSmall = validGroups.find((g) => g.membres.length < min);
      if (tooSmall) {
        if (!confirm(`Un groupe a moins de ${min} membres. Continuer quand même ?`)) {
          setSaving(false);
          return;
        }
      }
      await api.post(`/prosits/${prosit._id}/groupes/manual`, { groupes: validGroups });
      setFeedback('Groupes enregistrés.');
      onUpdated?.();
      setTimeout(() => onClose?.(), 800);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur enregistrement groupes.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Helpers ─────────────────────────────────────────────────────── */
  const toggleStudent = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAssignedManually = (id) =>
    manualGroups.some((g) => g.membres.some((m) => m.userId === id));

  const getStudent = (id) => students.find((s) => s._id === id);

  /* ── Render ──────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
          <p style={{ color: '#64748B', textAlign: 'center', padding: 30 }}>Chargement des étudiants…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} /> Composer les groupes
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>

        <p style={{ margin: '0 0 14px', fontSize: 12, color: '#64748B' }}>
          Filière <strong>{prosit.filiere}</strong> · Promotion <strong>{prosit.promotion}</strong> ·{' '}
          {students.length} étudiant{students.length > 1 ? 's' : ''} éligible{students.length > 1 ? 's' : ''}.
          Min {prosit.groupesConfig?.minMembres || 4} / Max {prosit.groupesConfig?.maxMembres || 8} par groupe.
        </p>

        {/* Sélecteur de mode */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setMode('random')}
            className={mode === 'random' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            style={{ flex: 1 }}
          >
            <Shuffle size={14} /> Aléatoire (1 clic)
          </button>
          <button
            type="button"
            onClick={() => { setMode('manual'); initManualGroups(); }}
            className={mode === 'manual' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            style={{ flex: 1 }}
          >
            <Users size={14} /> Manuel
          </button>
        </div>

        {error && (
          <div style={{ padding: 10, marginBottom: 12, background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 8, color: '#991B1B', fontSize: 13 }}>
            <AlertCircle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            {error}
          </div>
        )}
        {feedback && (
          <div style={{ padding: 10, marginBottom: 12, background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: 8, color: '#14532D', fontSize: 13 }}>
            ✓ {feedback}
          </div>
        )}

        {/* MODE ALÉATOIRE */}
        {mode === 'random' && (
          <div>
            <p style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
              Coche les étudiants à inclure. Le backend les répartira aléatoirement en groupes
              selon les contraintes min/max + rotation obligatoire des rôles CESI.
            </p>
            <div style={{
              maxHeight: 300, overflowY: 'auto', border: '1px solid #E5E7EB',
              borderRadius: 8, padding: 8, marginBottom: 14,
            }}>
              {students.length === 0 ? (
                <p style={{ fontSize: 13, fontStyle: 'italic', color: '#94A3B8', textAlign: 'center', padding: 20 }}>
                  Aucun étudiant trouvé pour {prosit.filiere} {prosit.promotion}.
                </p>
              ) : (
                students.map((s) => (
                  <label key={s._id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', cursor: 'pointer',
                    borderBottom: '1px solid #F1F5F9',
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s._id)}
                      onChange={() => toggleStudent(s._id)}
                      disabled={s.alreadyAssigned}
                    />
                    <span style={{ flex: 1, fontSize: 13 }}>
                      <strong>{s.prenom} {s.nom}</strong>
                      <span style={{ color: '#94A3B8', marginLeft: 8 }}>{s.email}</span>
                      {s.alreadyAssigned && (
                        <span style={{ marginLeft: 8, padding: '1px 6px', background: '#FEF3C7', color: '#92400E', fontSize: 10, fontWeight: 700, borderRadius: 999 }}>
                          déjà assigné
                        </span>
                      )}
                    </span>
                  </label>
                ))
              )}
            </div>
            <p style={{ fontSize: 12, color: '#64748B', textAlign: 'right', marginBottom: 10 }}>
              {selectedIds.size} étudiant{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
              <button className="btn btn-primary" onClick={submitRandom} disabled={saving || selectedIds.size === 0}>
                <Shuffle size={14} /> {saving ? 'Génération…' : 'Générer aléatoirement'}
              </button>
            </div>
          </div>
        )}

        {/* MODE MANUEL */}
        {mode === 'manual' && (
          <div>
            <p style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
              Crée tes groupes et assigne chaque étudiant. Pour chaque membre, tu peux choisir son rôle CESI.
            </p>

            {/* Étudiants non assignés */}
            <div style={{ marginBottom: 14, padding: 10, background: '#F8FAFC', borderRadius: 8 }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Étudiants non assignés
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {students
                  .filter((s) => !s.alreadyAssigned && !isAssignedManually(s._id))
                  .map((s) => (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => {
                        if (manualGroups.length === 0) return;
                        // Assigner au 1er groupe par défaut
                        assignMember(0, s._id);
                      }}
                      style={{
                        padding: '4px 10px', borderRadius: 999,
                        background: 'white', border: '1px solid #E5E7EB',
                        fontSize: 12, fontWeight: 600, color: '#1E293B',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}
                      title={`Cliquer pour assigner ${s.prenom} ${s.nom} au Groupe 1`}
                    >
                      {s.prenom} {s.nom} <ArrowRight size={11} />
                    </button>
                  ))}
                {students.filter((s) => !s.alreadyAssigned && !isAssignedManually(s._id)).length === 0 && (
                  <span style={{ fontSize: 12, fontStyle: 'italic', color: '#94A3B8' }}>
                    Tous les étudiants sont assignés.
                  </span>
                )}
              </div>
            </div>

            {/* Groupes manuels */}
            {manualGroups.map((g, gIdx) => (
              <div key={gIdx} style={{
                marginBottom: 12, padding: 12, borderRadius: 10,
                background: 'white', border: '1px solid #E5E7EB',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <input
                    value={g.nom}
                    onChange={(e) => renameGroup(gIdx, e.target.value)}
                    style={{ flex: 1, padding: '6px 10px', border: '1px solid #E5E7EB', borderRadius: 6, fontWeight: 700, color: '#1B4F72' }}
                  />
                  <button onClick={() => removeManualGroup(gIdx)} className="btn btn-ghost btn-sm" style={{ color: '#DC2626' }}>
                    <Trash2 size={13} />
                  </button>
                </div>

                {g.membres.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 12, fontStyle: 'italic', color: '#94A3B8' }}>
                    Glisse des étudiants ici (clic dans la zone du haut).
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {g.membres.map((m) => {
                      const s = getStudent(m.userId);
                      if (!s) return null;
                      return (
                        <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: '#F8FAFC', borderRadius: 6, fontSize: 13 }}>
                          <span style={{ flex: 1 }}>{s.prenom} {s.nom}</span>
                          <select
                            value={m.role}
                            onChange={(e) => setMemberRole(m.userId, e.target.value)}
                            style={{ padding: '2px 6px', border: '1px solid #E5E7EB', borderRadius: 4, fontSize: 11 }}
                          >
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button
                            onClick={() => unassignMember(m.userId)}
                            className="btn btn-ghost btn-sm"
                            title="Retirer du groupe"
                            style={{ color: '#DC2626' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            <button onClick={addManualGroup} className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}>
              <Plus size={13} /> Ajouter un groupe
            </button>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
              <button className="btn btn-primary" onClick={submitManual} disabled={saving}>
                <Save size={14} /> {saving ? 'Enregistrement…' : 'Enregistrer les groupes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
