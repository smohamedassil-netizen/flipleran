import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import {
  ChevronDown, ChevronRight, BookOpen, Play, CheckCircle,
  Lock, Plus, Pencil, Trash2, Sparkles, GraduationCap,
} from 'lucide-react';

/**
 * ChaptersView — affiche les capsules d'un cours regroupées par chapitre.
 * Hiérarchie : Module (Course) → Chapitre (Chapter) → Capsules.
 *
 * Mastery learning (Bloom 1968) : un chapitre est verrouillé tant que le
 * précédent n'est pas complété à `completionThreshold` % (default 80%).
 * Le prof peut désactiver via `unlockedByDefault: true`.
 *
 * Côté prof : affiche les boutons CRUD chapitre + ré-assignation des capsules.
 * Côté étudiant : juste consultation + déblocage progressif.
 */
export default function ChaptersView({ courseId, isProfOrAdmin, onVideoClick }) {
  const navigate = useNavigate();
  const [data, setData]       = useState({ chapters: [], orphans: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [expanded, setExpanded] = useState({});  // { chapterId: boolean }
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const load = () => {
    if (!courseId) return;
    setLoading(true);
    api.get(`/courses/${courseId}/chapters`)
      .then(({ data }) => {
        setData(data);
        // Auto-expand le 1er chapitre
        if (data.chapters?.[0]) setExpanded({ [data.chapters[0]._id]: true });
      })
      .catch((err) => setError(err.response?.data?.message || 'Erreur chargement chapitres'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [courseId]);

  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const createChapter = async () => {
    if (!newTitle.trim()) return;
    try {
      await api.post(`/courses/${courseId}/chapters`, { titre: newTitle.trim() });
      setNewTitle('');
      setCreating(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur création');
    }
  };

  const renameChapter = async (id) => {
    if (!editTitle.trim()) return;
    try {
      await api.put(`/chapters/${id}`, { titre: editTitle.trim() });
      setEditingId(null);
      setEditTitle('');
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur renommage');
    }
  };

  const removeChapter = async (id) => {
    if (!confirm('Supprimer ce chapitre ? Les capsules seront détachées (non supprimées).')) return;
    try {
      await api.delete(`/chapters/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur suppression');
    }
  };

  const assignVideoToChapter = async (chapterId, videoId) => {
    try {
      await api.post(`/chapters/${chapterId}/assign-video`, { videoId });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur assignation');
    }
  };

  const completionOf = (chapter, currentUserId) => {
    if (!chapter.videos.length) return 0;
    const completed = chapter.videos.filter((v) =>
      (v.watchedBy || []).some((w) => w.userId?.toString() === currentUserId && w.completed === true)
    ).length;
    return Math.round((completed / chapter.videos.length) * 100);
  };

  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#94A3B8' }}>Chargement des chapitres…</div>;
  }
  if (error) {
    return <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>;
  }

  const { chapters, orphans } = data;

  // Calcul du déblocage chapitre (mastery learning)
  const myId = JSON.parse(sessionStorage.getItem('fliplearn_user') || '{}')?._id || '';
  const chaptersWithLock = chapters.map((c, i) => {
    const completionPct = completionOf(c, myId);
    let locked = false;
    if (!isProfOrAdmin && i > 0 && !c.unlockedByDefault) {
      const prev = chapters[i - 1];
      const prevPct = completionOf(prev, myId);
      locked = prevPct < (prev.completionThreshold ?? 80);
    }
    return { ...c, completionPct, locked };
  });

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1B4F72', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <BookOpen size={16} /> Chapitres du module ({chapters.length})
        </h3>
        {isProfOrAdmin && !creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            style={btnSecondary}
          >
            <Plus size={13} /> Nouveau chapitre
          </button>
        )}
      </div>

      {/* Form création chapitre */}
      {creating && (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Titre du chapitre (ex : Cryptographie symétrique)"
            style={{ flex: 1, minWidth: 200, padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') createChapter(); if (e.key === 'Escape') { setCreating(false); setNewTitle(''); } }}
          />
          <button type="button" onClick={createChapter} style={btnPrimary}>Créer</button>
          <button type="button" onClick={() => { setCreating(false); setNewTitle(''); }} style={btnGhost}>Annuler</button>
        </div>
      )}

      {/* Liste des chapitres */}
      {chaptersWithLock.length === 0 && orphans.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', color: '#94A3B8', background: '#F8FAFC', borderRadius: 10, border: '1px dashed #CBD5E1' }}>
          {isProfOrAdmin ? 'Aucun chapitre ni capsule. Crée un chapitre puis ajoute des capsules.' : 'Ce module n\'a pas encore de contenu.'}
        </div>
      )}

      {chaptersWithLock.map((ch, idx) => {
        const isExpanded = !!expanded[ch._id];
        const palette = ch.locked
          ? { bg: '#F8FAFC', border: '#E2E8F0', text: '#94A3B8' }
          : ch.completionPct >= (ch.completionThreshold ?? 80)
            ? { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' }
            : { bg: 'white', border: '#E2E8F0', text: '#1B4F72' };

        return (
          <div key={ch._id} style={{
            background: palette.bg,
            border: `1.5px solid ${palette.border}`,
            borderRadius: 12,
            marginBottom: 10,
            overflow: 'hidden',
            opacity: ch.locked ? 0.7 : 1,
          }}>
            {/* Header chapitre */}
            <div
              onClick={() => !ch.locked && toggle(ch._id)}
              style={{
                padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
                cursor: ch.locked ? 'not-allowed' : 'pointer',
                userSelect: 'none',
              }}
            >
              {ch.locked
                ? <Lock size={16} color="#94A3B8" />
                : isExpanded
                  ? <ChevronDown size={16} color={palette.text} />
                  : <ChevronRight size={16} color={palette.text} />
              }

              <div style={{ flex: 1, minWidth: 0 }}>
                {editingId === ch._id ? (
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') renameChapter(ch._id);
                      if (e.key === 'Escape') { setEditingId(null); setEditTitle(''); }
                    }}
                    style={{ width: '100%', padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 14, fontWeight: 700, fontFamily: 'inherit' }}
                    autoFocus
                  />
                ) : (
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: palette.text }}>
                    Chapitre {idx + 1} — {ch.titre}
                  </p>
                )}
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B' }}>
                  {ch.videos.length} capsule{ch.videos.length > 1 ? 's' : ''}
                  {ch.locked
                    ? <span style={{ marginLeft: 8, fontStyle: 'italic' }}>🔒 Termine le chapitre précédent à {chaptersWithLock[idx - 1]?.completionThreshold ?? 80}%</span>
                    : ` · ${ch.completionPct}% complété`
                  }
                </p>
              </div>

              {/* Mode prof : rename / delete */}
              {isProfOrAdmin && editingId !== ch._id && (
                <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => { setEditingId(ch._id); setEditTitle(ch.titre); }} style={iconBtn} title="Renommer">
                    <Pencil size={13} />
                  </button>
                  <button type="button" onClick={() => removeChapter(ch._id)} style={{ ...iconBtn, color: '#DC2626' }} title="Supprimer">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
              {isProfOrAdmin && editingId === ch._id && (
                <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => renameChapter(ch._id)} style={btnPrimary}>OK</button>
                  <button type="button" onClick={() => { setEditingId(null); setEditTitle(''); }} style={btnGhost}>×</button>
                </div>
              )}
            </div>

            {/* Liste des capsules du chapitre */}
            {isExpanded && !ch.locked && (
              <div style={{ padding: '0 14px 12px', borderTop: '1px solid ' + palette.border }}>
                {ch.videos.length === 0 ? (
                  <p style={{ margin: '12px 0 0', fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
                    Pas encore de capsule dans ce chapitre.
                    {isProfOrAdmin && ' Ajoute une capsule via "Ajouter capsule" puis assigne-la au chapitre.'}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                    {ch.videos.map((v, vi) => {
                      const watched = (v.watchedBy || []).some((w) => w.userId?.toString() === myId && w.completed === true);
                      return (
                        <div
                          key={v._id}
                          onClick={() => onVideoClick ? onVideoClick(v) : navigate(`/watch/${v._id}`)}
                          style={{
                            padding: '8px 10px',
                            background: 'white',
                            border: '1px solid #E2E8F0',
                            borderRadius: 8,
                            display: 'flex', alignItems: 'center', gap: 10,
                            cursor: 'pointer',
                          }}
                        >
                          {watched
                            ? <CheckCircle size={14} color="#22C55E" />
                            : <Play size={14} color="#1B4F72" />
                          }
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#1B4F72' }}>
                            {idx + 1}.{vi + 1} — {v.titre}
                          </span>
                          {v.duration > 0 && (
                            <span style={{ fontSize: 11, color: '#94A3B8' }}>
                              {Math.floor(v.duration / 60)}:{String(v.duration % 60).padStart(2, '0')}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Bouton entraînement chapitre (étudiant) */}
                {!isProfOrAdmin && ch.practiceMode?.enabled && ch.videos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => navigate(`/chapters/${ch._id}/practice`)}
                    style={{
                      marginTop: 12, width: '100%',
                      padding: '8px 10px',
                      background: 'linear-gradient(135deg, #9333EA, #C084FC)',
                      color: 'white', border: 'none', borderRadius: 8,
                      fontSize: 12, fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <Sparkles size={13} /> S'entraîner sur ce chapitre ({ch.practiceMode.questionCount} questions)
                  </button>
                )}

                {/* QCM noté de fin de chapitre — étudiant : visible quand chapitre ≥ 80% */}
                {!isProfOrAdmin && ch.videos.length > 0 && ch.completionPct >= 80 && (
                  <button
                    type="button"
                    onClick={() => navigate(`/qcm/chapter/${ch._id}`)}
                    style={{
                      marginTop: 8, width: '100%',
                      padding: '10px 12px',
                      background: 'linear-gradient(135deg, #1B4F72, #2874A6)',
                      color: 'white', border: 'none', borderRadius: 8,
                      fontSize: 13, fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 2px 8px rgba(27, 79, 114, 0.25)',
                    }}
                    title="Examen sommatif de fin de chapitre — score noté"
                  >
                    🎯 QCM de fin de chapitre
                  </button>
                )}

                {/* Bouton "Créer / éditer QCM de chapitre" — prof uniquement */}
                {isProfOrAdmin && (
                  <button
                    type="button"
                    onClick={() => navigate(`/professor/chapter/${ch._id}/qcm`)}
                    style={{
                      marginTop: 12, width: '100%',
                      padding: '8px 10px',
                      background: '#F8FAFC',
                      color: '#1B4F72',
                      border: '1.5px dashed #1B4F72', borderRadius: 8,
                      fontSize: 12, fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <GraduationCap size={13} /> Créer / éditer le QCM de fin de chapitre
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Capsules orphelines (rétrocompat — pas encore migrées dans un chapitre) */}
      {orphans.length > 0 && (
        <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 12, padding: 14, marginTop: 10 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#92400E' }}>
            Capsules sans chapitre ({orphans.length})
          </p>
          {isProfOrAdmin && (
            <p style={{ margin: '0 0 8px', fontSize: 11, color: '#78350F' }}>
              Assigne ces capsules à un chapitre via le menu déroulant.
            </p>
          )}
          {orphans.map((v) => (
            <div key={v._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', flexWrap: 'wrap' }}>
              <span style={{ flex: 1, minWidth: 200, fontSize: 13, color: '#78350F' }}>{v.titre}</span>
              {isProfOrAdmin && chapters.length > 0 && (
                <select
                  defaultValue=""
                  onChange={(e) => e.target.value && assignVideoToChapter(e.target.value, v._id)}
                  style={{ padding: '4px 8px', border: '1px solid #FDE68A', borderRadius: 6, fontSize: 12, background: 'white' }}
                >
                  <option value="">Assigner à…</option>
                  {chapters.map((c) => (
                    <option key={c._id} value={c._id}>{c.titre}</option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => onVideoClick ? onVideoClick(v) : navigate(`/watch/${v._id}`)}
                style={btnGhost}
              >
                Voir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const btnPrimary = {
  padding: '6px 12px', background: 'linear-gradient(135deg, #1B4F72, #2874A6)',
  color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit',
  display: 'inline-flex', alignItems: 'center', gap: 4,
};
const btnSecondary = {
  padding: '6px 12px', background: 'white', color: '#1B4F72',
  border: '1px solid #1B4F72', borderRadius: 6, fontSize: 12, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
  display: 'inline-flex', alignItems: 'center', gap: 4,
};
const btnGhost = {
  padding: '6px 10px', background: 'transparent', color: '#64748B',
  border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12, fontWeight: 500,
  cursor: 'pointer', fontFamily: 'inherit',
};
const iconBtn = {
  padding: 4, background: 'transparent', color: '#64748B',
  border: 'none', borderRadius: 4, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};
