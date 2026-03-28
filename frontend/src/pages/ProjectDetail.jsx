import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import {
  Home, FolderKanban, Users, Calendar, Clock, FileText, Upload,
  Star, Send, CheckCircle, AlertCircle, ChevronDown, ChevronRight,
  Sparkles, Edit3, Shuffle, Plus, Trash2, Link as LinkIcon, Video, X,
} from 'lucide-react';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const TYPE_BADGE = {
  prosit: { label: 'Prosit', bg: '#EBF3FA', color: '#1B4F72' },
  projet: { label: 'Projet', bg: '#E8F5E9', color: '#2E7D32' },
};
const STATUS_BADGE = {
  brouillon: { label: 'Brouillon', bg: '#F1F5F9', color: '#64748B' },
  actif:     { label: 'Actif',     bg: '#E8F5E9', color: '#2E7D32' },
  termine:   { label: 'Termin\u00e9', bg: '#FEE2E2', color: '#DC2626' },
};
const PHASE_STATUS_COLOR = {
  a_faire:  { bg: '#F1F5F9', border: '#94A3B8', text: '#64748B' },
  en_cours: { bg: '#EBF3FA', border: '#1B4F72', text: '#1B4F72' },
  termine:  { bg: '#E8F5E9', border: '#2E7D32', text: '#2E7D32' },
};
const ROLE_CONFIG = {
  chef_projet: {
    label: 'Chef de projet', color: '#1B4F72', bg: '#EBF3FA', emoji: '\u{1F451}',
    icon: '\u{1F451}', border: '#2980B9',
    description: "Le capitaine du navire. Il coordonne l'\u00e9quipe, r\u00e9partit les t\u00e2ches et prend les d\u00e9cisions importantes.",
  },
  scribe: {
    label: 'Scribe', color: '#2E7D32', bg: '#E8F5E9', emoji: '\u{1F4DD}',
    icon: '\u{1F4DD}', border: '#27AE60',
    description: "La m\u00e9moire du groupe. Il prend des notes, r\u00e9dige les comptes rendus et le livrable final.",
  },
  animateur: {
    label: 'Animateur', color: '#E67E22', bg: '#FEF6E7', emoji: '\u{1F3A4}',
    icon: '\u{1F3A4}', border: '#F39C12',
    description: "Le ma\u00eetre de c\u00e9r\u00e9monie. Il g\u00e8re les tours de parole, relance les discussions et garde le groupe motiv\u00e9.",
  },
  chrono: {
    label: 'Chrono', color: '#DC2626', bg: '#FEE2E2', emoji: '\u{23F1}',
    icon: '\u{23F1}', border: '#E74C3C',
    description: "Le gardien du temps. Il chronom\u00e8tre les \u00e9tapes et s'assure que le groupe respecte le planning.",
  },
  analyste: {
    label: 'Analyste', color: '#7C3AED', bg: '#F3E8FF', emoji: '\u{1F50D}',
    icon: '\u{1F50D}', border: '#8E44AD',
    description: "Le d\u00e9tective. Il analyse le sujet en profondeur, identifie les mots-cl\u00e9s et formule la probl\u00e9matique.",
  },
};

/* ─── RoleBadge Component (style Loup-Garou) ───────────────────────────── */
function RoleBadge({ role, size = 'normal', showDescription = false }) {
  const cfg = ROLE_CONFIG[role] ?? { label: role, color: '#64748B', bg: '#F1F5F9', icon: '\u{2753}', border: '#94A3B8', description: '' };
  const isLarge = size === 'large';
  return (
    <div style={{
      display: 'inline-flex', flexDirection: isLarge ? 'column' : 'row',
      alignItems: 'center', gap: isLarge ? 8 : 6,
      padding: isLarge ? '16px 20px' : '4px 12px',
      borderRadius: isLarge ? 16 : 20,
      background: `linear-gradient(135deg, ${cfg.bg}, white)`,
      border: `2px solid ${cfg.border}`,
      boxShadow: isLarge ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.06)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: showDescription ? 'default' : 'pointer',
      minWidth: isLarge ? 130 : 'auto',
    }}
    title={cfg.description}
    >
      <span style={{ fontSize: isLarge ? 32 : 16, lineHeight: 1 }}>{cfg.icon}</span>
      <span style={{
        fontWeight: 700, fontSize: isLarge ? 13 : 11,
        color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.5px',
        textAlign: 'center',
      }}>
        {cfg.label}
      </span>
      {showDescription && (
        <span style={{ fontSize: 11, color: '#64748B', textAlign: 'center', lineHeight: 1.4, maxWidth: 160 }}>
          {cfg.description}
        </span>
      )}
    </div>
  );
}
const EVAL_CRITERIA = [
  'Participation',
  'Qualit\u00e9 du travail',
  'Respect des d\u00e9lais',
  'Communication',
];
const LIVRABLE_ICONS = {
  document: FileText,
  video:    Video,
  lien:     LinkIcon,
};

function getInitials(user) {
  if (!user) return '?';
  const p = user.prenom?.[0] ?? '';
  const n = user.nom?.[0] ?? '';
  return (p + n).toUpperCase() || '?';
}

/* ═══════════════════════════════════════════════════════════════════════════
   ProjectDetail
═══════════════════════════════════════════════════════════════════════════ */
export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ?? 'etudiant';
  const isProfOrAdmin = role === 'professeur' || role === 'admin';

  const [project, setProject]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  /* Livrables upload */
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ titre: '', type: 'document', file: null });
  const [uploading, setUploading]   = useState(false);

  /* Auto-evaluation */
  const [evaluations, setEvaluations]   = useState({});
  const [evalComment, setEvalComment]   = useState('');
  const [evalSubmitted, setEvalSubmitted] = useState(false);
  const [submittingEval, setSubmittingEval] = useState(false);

  /* AI Help */
  const [aiResponse, setAiResponse]   = useState('');
  const [aiLoading, setAiLoading]     = useState(false);

  /* Prof: group creation */
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupMode, setGroupMode]           = useState('random');
  const [groupSize, setGroupSize]           = useState(4);
  const [creatingGroups, setCreatingGroups] = useState(false);

  /* Prof: show all evaluations */
  const [showAllEvals, setShowAllEvals] = useState(false);
  const [allEvals, setAllEvals]         = useState([]);

  /* Prof: edit project */
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    api.get(`/projects/${projectId}`)
      .then(({ data }) => {
        setProject(data);
        /* Check if already evaluated */
        if (data.evaluations?.some(ev => ev.evaluateurId === user?._id)) {
          setEvalSubmitted(true);
        }
      })
      .catch((err) => setError(err.response?.data?.message ?? 'Erreur de chargement.'))
      .finally(() => setLoading(false));
  }, [projectId, user?._id]);

  /* ── Derived data ──────────────────────────────────────────────────────── */
  const myGroup = project?.groupes?.find(g =>
    g.membres?.some(m => (m.userId?._id ?? m.userId) === user?._id)
  );
  const myMember = myGroup?.membres?.find(m => (m.userId?._id ?? m.userId) === user?._id);
  const typeCfg = TYPE_BADGE[project?.type] ?? TYPE_BADGE.projet;
  const statusCfg = STATUS_BADGE[project?.status] ?? STATUS_BADGE.brouillon;

  const soutenancePhase = project?.phases?.find(p => p.titre?.toLowerCase().includes('soutenance'));
  const canEvaluate = !isProfOrAdmin && (
    project?.status === 'termine' ||
    soutenancePhase?.statut === 'termine'
  );

  /* ── Handlers ──────────────────────────────────────────────────────────── */
  const handleUploadLivrable = async (e) => {
    e.preventDefault();
    if (!uploadForm.titre.trim() || (!uploadForm.file && uploadForm.type !== 'lien')) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('titre', uploadForm.titre);
      formData.append('type', uploadForm.type);
      if (uploadForm.file) formData.append('file', uploadForm.file);
      if (uploadForm.lien) formData.append('lien', uploadForm.lien);

      const { data } = await api.post(`/projects/${projectId}/livrables`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setProject(data);
      setShowUpload(false);
      setUploadForm({ titre: '', type: 'document', file: null });
    } catch (err) {
      alert(err.response?.data?.message ?? 'Erreur lors de l\'envoi du livrable.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitEvaluation = async () => {
    setSubmittingEval(true);
    try {
      const notes = Object.entries(evaluations).map(([etudiantId, criteria]) => ({
        etudiantId,
        criteres: criteria,
        commentaire: evalComment,
      }));
      await api.post(`/projects/${projectId}/evaluations`, { notes });
      setEvalSubmitted(true);
    } catch (err) {
      alert(err.response?.data?.message ?? 'Erreur lors de la soumission.');
    } finally {
      setSubmittingEval(false);
    }
  };

  const handleAiHelp = async () => {
    setAiLoading(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/ai-help`);
      setAiResponse(data.response ?? data.message ?? 'Aucune r\u00e9ponse.');
    } catch (err) {
      setAiResponse('Erreur : ' + (err.response?.data?.message ?? 'Service IA indisponible.'));
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateGroups = async () => {
    setCreatingGroups(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/groupes/random`, { taille: groupSize });
      setProject(data);
      setShowGroupModal(false);
    } catch (err) {
      alert(err.response?.data?.message ?? 'Erreur lors de la cr\u00e9ation des groupes.');
    } finally {
      setCreatingGroups(false);
    }
  };

  const handlePhaseStatusChange = async (phaseIndex, newStatut) => {
    try {
      const { data } = await api.put(`/projects/${projectId}/phases/${phaseIndex}`, { statut: newStatut });
      setProject(data);
    } catch (err) {
      alert(err.response?.data?.message ?? 'Erreur.');
    }
  };

  const handleSaveEdit = async () => {
    try {
      const { data } = await api.put(`/projects/${projectId}`, editForm);
      setProject(data);
      setEditing(false);
    } catch (err) {
      alert(err.response?.data?.message ?? 'Erreur lors de la modification.');
    }
  };

  const handleFetchAllEvals = async () => {
    try {
      const { data } = await api.get(`/projects/${projectId}/evaluations`);
      setAllEvals(data);
      setShowAllEvals(true);
    } catch (err) {
      alert(err.response?.data?.message ?? 'Erreur.');
    }
  };

  /* ── Rating component ──────────────────────────────────────────────────── */
  function StarRating({ value, onChange }) {
    return (
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 2,
              color: s <= value ? '#F59E0B' : '#D1D5DB',
              transition: 'color 120ms',
            }}
          >
            <Star size={18} fill={s <= value ? '#F59E0B' : 'none'} />
          </button>
        ))}
      </div>
    );
  }

  /* ── Loading / error ───────────────────────────────────────────────────── */
  if (loading) {
    return (
      <Layout title="Projet">
        <p className="text-small">Chargement...</p>
      </Layout>
    );
  }
  if (error) {
    return (
      <Layout title="Projet">
        <div className="alert alert-error">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={project?.titre ?? 'Projet'}>
      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <Breadcrumb items={[
        { label: 'Accueil', to: '/', icon: Home },
        { label: 'Projets', to: '/projects' },
        { label: project?.titre ?? 'Projet' },
      ]} />

      {/* ── Header section ──────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <h1 className="page-title" style={{ margin: 0 }}>{project.titre}</h1>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 10px',
                borderRadius: 'var(--radius-sm)', backgroundColor: typeCfg.bg, color: typeCfg.color,
              }}>
                {typeCfg.label}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 10px',
                borderRadius: 'var(--radius-sm)', backgroundColor: statusCfg.bg, color: statusCfg.color,
              }}>
                {statusCfg.label}
              </span>
            </div>

            {/* Dates */}
            <div style={{ display: 'flex', gap: 16, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
              {project.dateDebut && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={12} /> Début : {new Date(project.dateDebut).toLocaleDateString('fr-FR')}
                </span>
              )}
              {project.dateFin && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> Fin : {new Date(project.dateFin).toLocaleDateString('fr-FR')}
                </span>
              )}
              {project.dateSoutenance && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={12} /> Soutenance : {new Date(project.dateSoutenance).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>

            {project.description && (
              <p style={{ marginTop: 12, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', maxWidth: 700, lineHeight: 1.6 }}>
                {project.description}
              </p>
            )}
          </div>

          {/* Prof actions */}
          {isProfOrAdmin && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowGroupModal(true)}>
                <Shuffle size={14} /> Créer les groupes
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                setEditForm({
                  titre: project.titre,
                  description: project.description,
                  status: project.status,
                });
                setEditing(true);
              }}>
                <Edit3 size={14} /> Modifier
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleFetchAllEvals}>
                <Star size={14} /> Évaluations
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Prosit: Énoncé & Mots-clés ──────────────────────────────────── */}
      {project.type === 'prosit' && project.enonce && (
        <div className="card" style={{ marginBottom: 20, padding: 20 }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 12, color: 'var(--color-text)' }}>
            Énoncé du prosit
          </h3>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {project.enonce}
          </p>
          {project.motsCles?.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', marginRight: 4 }}>
                Mots-clés :
              </span>
              {project.motsCles.map((mc, i) => (
                <span key={i} style={{
                  padding: '3px 10px', fontSize: 11, fontWeight: 600,
                  borderRadius: 20, backgroundColor: '#EBF3FA', color: '#1B4F72',
                }}>
                  {mc}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* ── Left column ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Timeline ─────────────────────────────────────────────────── */}
          {project.phases?.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 16, color: 'var(--color-text)' }}>
                Phases du projet
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
                {project.phases.map((phase, i) => {
                  const pcfg = PHASE_STATUS_COLOR[phase.statut] ?? PHASE_STATUS_COLOR.a_faire;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90 }}>
                        <div
                          style={{
                            width: 32, height: 32, borderRadius: '50%',
                            border: `2.5px solid ${pcfg.border}`,
                            backgroundColor: pcfg.bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, color: pcfg.text,
                            cursor: isProfOrAdmin ? 'pointer' : 'default',
                          }}
                          title={isProfOrAdmin ? 'Cliquer pour changer le statut' : phase.statut}
                          onClick={() => {
                            if (!isProfOrAdmin) return;
                            const order = ['a_faire', 'en_cours', 'termine'];
                            const next = order[(order.indexOf(phase.statut) + 1) % order.length];
                            handlePhaseStatusChange(i, next);
                          }}
                        >
                          {phase.statut === 'termine' ? <CheckCircle size={16} /> : i + 1}
                        </div>
                        <span style={{
                          marginTop: 6, fontSize: 11, fontWeight: 600, color: pcfg.text,
                          textAlign: 'center', maxWidth: 90, lineHeight: 1.3,
                        }}>
                          {phase.titre}
                        </span>
                      </div>
                      {i < project.phases.length - 1 && (
                        <div style={{
                          width: 40, height: 2, backgroundColor: pcfg.border,
                          flexShrink: 0, marginBottom: 20,
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Livrables ────────────────────────────────────────────────── */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                Livrables
              </h3>
              {!isProfOrAdmin && myGroup && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}>
                  <Upload size={14} /> Ajouter un livrable
                </button>
              )}
            </div>

            {(!project.livrables || project.livrables.length === 0) ? (
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                Aucun livrable soumis pour le moment.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {project.livrables.map((liv, i) => {
                  const Icon = LIVRABLE_ICONS[liv.type] ?? FileText;
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                    }}>
                      <Icon size={18} color="var(--color-primary)" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', margin: 0 }}>
                          {liv.titre}
                        </p>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
                          {liv.uploadePar?.prenom ?? 'Inconnu'} {liv.uploadePar?.nom ?? ''} {'·'} {new Date(liv.date ?? liv.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Auto-évaluation (students only) ──────────────────────────── */}
          {!isProfOrAdmin && canEvaluate && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 14, color: 'var(--color-text)' }}>
                Auto-évaluation
              </h3>

              {evalSubmitted ? (
                <div className="alert alert-success">
                  <CheckCircle size={14} />
                  <span>Évaluation soumise avec succès.</span>
                </div>
              ) : myGroup ? (
                <>
                  {myGroup.membres
                    .filter(m => (m.userId?._id ?? m.userId) !== user?._id)
                    .map((membre) => {
                      const etu = membre.userId;
                      const etuId = etu?._id ?? etu;
                      const etuName = etu?.prenom ? `${etu.prenom} ${etu.nom ?? ''}` : 'Membre';
                      return (
                        <div key={etuId} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
                          <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 8, color: 'var(--color-text)' }}>
                            {etuName}
                          </p>
                          {EVAL_CRITERIA.map((critere) => (
                            <div key={critere} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>{critere}</span>
                              <StarRating
                                value={evaluations[etuId]?.[critere] ?? 0}
                                onChange={(val) => setEvaluations(prev => ({
                                  ...prev,
                                  [etuId]: { ...(prev[etuId] ?? {}), [critere]: val },
                                }))}
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })}

                  <div style={{ marginBottom: 14 }}>
                    <label className="form-label">Commentaire</label>
                    <textarea
                      className="form-input"
                      style={{ minHeight: 60, resize: 'vertical' }}
                      placeholder="Commentaire général sur le travail de groupe..."
                      value={evalComment}
                      onChange={(e) => setEvalComment(e.target.value)}
                    />
                  </div>

                  <button
                    className="btn btn-primary"
                    disabled={submittingEval}
                    onClick={handleSubmitEvaluation}
                  >
                    <Send size={14} />
                    {submittingEval ? 'Envoi...' : "Soumettre l'évaluation"}
                  </button>
                </>
              ) : (
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  Vous n'êtes dans aucun groupe.
                </p>
              )}
            </div>
          )}

          {/* ── Aide IA ──────────────────────────────────────────────────── */}
          <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, #EBF3FA 0%, #FEF6E7 100%)' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 10, color: 'var(--color-primary)' }}>
              <Sparkles size={18} style={{ marginRight: 6 }} />
              Aide IA
            </h3>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 12 }}>
              L'IA peut vous fournir des pistes de réflexion et des ressources pour avancer dans votre projet.
            </p>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAiHelp}
              disabled={aiLoading}
            >
              <Sparkles size={14} />
              {aiLoading ? 'Réflexion en cours...' : "Demander de l'aide à l'IA"}
            </button>
            {aiResponse && (
              <div style={{
                marginTop: 14, padding: 14, borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}>
                {aiResponse}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Mon groupe ───────────────────────────────────────────────── */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{
              fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--color-text-secondary)', marginBottom: 12,
            }}>
              {isProfOrAdmin ? 'Groupes' : 'Mon groupe'}
            </h3>

            {!isProfOrAdmin && myGroup ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
                  {myGroup.nom ?? `Groupe ${myGroup.numero ?? ''}`}
                </p>
                {myGroup.membres?.map((membre, i) => {
                  const etu = membre.userId;
                  const name = etu?.prenom ? `${etu.prenom} ${etu.nom ?? ''}` : 'Membre';
                  const roleCfg = ROLE_CONFIG[membre.role] ?? {};
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 'var(--radius-md)',
                      backgroundColor: (etu?._id ?? etu) === user?._id ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #1B4F72, #2874A6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>
                        {getInitials(etu)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', margin: 0 }}>
                          {name}
                        </p>
                      </div>
                      {membre.role && <RoleBadge role={membre.role} />}
                    </div>
                  );
                })}
              </div>
            ) : !isProfOrAdmin ? (
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                Vous n'avez pas encore été assigné à un groupe.
              </p>
            ) : (
              /* Prof: list all groups */
              project.groupes?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {project.groupes.map((g, gi) => (
                    <div key={gi} style={{ padding: 10, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                      <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 6 }}>
                        {g.nom ?? `Groupe ${g.numero ?? gi + 1}`}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {g.membres?.map((m, mi) => {
                          const etu = m.userId;
                          const name = etu?.prenom ? `${etu.prenom} ${etu.nom ?? ''}` : 'Membre';
                          return (
                            <div key={mi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', minWidth: 100 }}>{name}</span>
                              <RoleBadge role={m.role} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  Aucun groupe créé pour le moment.
                </p>
              )
            )}
          </div>

          {/* ── Project info summary ─────────────────────────────────────── */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 20 }}>
            <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
              Informations
            </p>
            {[
              { label: 'Type', value: typeCfg.label },
              { label: 'Statut', value: statusCfg.label },
              { label: 'Groupes', value: project.groupes?.length ?? 0 },
              { label: 'Phases', value: project.phases?.length ?? 0 },
              { label: 'Livrables', value: project.livrables?.length ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{label}</span>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text)' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* ── Légende des rôles (style Loup-Garou) ──────────────────────── */}
          {project.groupes?.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <p style={{
                fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: 'var(--color-text-secondary)', marginBottom: 12,
              }}>
                Les rôles
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.keys(ROLE_CONFIG).map(roleKey => (
                  <RoleBadge key={roleKey} role={roleKey} size="large" showDescription />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
         Modals
      ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Upload livrable modal ────────────────────────────────────────── */}
      {showUpload && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.4)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowUpload(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleUploadLivrable}
            className="card"
            style={{ width: 460, padding: 28 }}
          >
            <h2 style={{ margin: '0 0 20px', fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text)' }}>
              Ajouter un livrable
            </h2>

            <label className="text-label" style={{ display: 'block', marginBottom: 4 }}>Titre *</label>
            <input
              className="form-input"
              style={{ marginBottom: 14, width: '100%' }}
              value={uploadForm.titre}
              onChange={(e) => setUploadForm({ ...uploadForm, titre: e.target.value })}
              required
              placeholder="Titre du livrable"
            />

            <label className="text-label" style={{ display: 'block', marginBottom: 4 }}>Type</label>
            <select
              className="form-input"
              style={{ marginBottom: 14, width: '100%' }}
              value={uploadForm.type}
              onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
            >
              <option value="document">Document</option>
              <option value="video">Vidéo</option>
              <option value="lien">Lien</option>
            </select>

            {uploadForm.type === 'lien' ? (
              <>
                <label className="text-label" style={{ display: 'block', marginBottom: 4 }}>URL</label>
                <input
                  className="form-input"
                  style={{ marginBottom: 14, width: '100%' }}
                  value={uploadForm.lien ?? ''}
                  onChange={(e) => setUploadForm({ ...uploadForm, lien: e.target.value })}
                  placeholder="https://..."
                />
              </>
            ) : (
              <>
                <label className="text-label" style={{ display: 'block', marginBottom: 4 }}>Fichier</label>
                <input
                  type="file"
                  className="form-input"
                  style={{ marginBottom: 14, width: '100%', padding: 8 }}
                  onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                />
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowUpload(false)}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={uploading}>
                {uploading ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Group creation modal (prof) ──────────────────────────────────── */}
      {showGroupModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.4)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowGroupModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ width: 420, padding: 28 }}
          >
            <h2 style={{ margin: '0 0 20px', fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text)' }}>
              Créer les groupes
            </h2>

            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {[
                { key: 'random', label: 'Al\u00e9atoire' },
                { key: 'manuel', label: 'Manuel' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setGroupMode(key)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: `1.5px solid ${groupMode === key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    backgroundColor: groupMode === key ? 'var(--color-primary-light)' : 'transparent',
                    color: groupMode === key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    fontSize: 'var(--font-size-sm)', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {groupMode === 'random' && (
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Taille des groupes</label>
                <input
                  type="number"
                  className="form-input"
                  min={2} max={10}
                  value={groupSize}
                  onChange={(e) => setGroupSize(Number(e.target.value))}
                  style={{ width: 100 }}
                />
              </div>
            )}

            {groupMode === 'manuel' && (
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                La création manuelle sera disponible prochainement. Utilisez le mode aléatoire pour le moment.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setShowGroupModal(false)}>
                Annuler
              </button>
              <button
                className="btn btn-primary"
                disabled={creatingGroups || groupMode === 'manuel'}
                onClick={handleCreateGroups}
              >
                {creatingGroups ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit project modal (prof) ────────────────────────────────────── */}
      {editing && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.4)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setEditing(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ width: 460, padding: 28 }}
          >
            <h2 style={{ margin: '0 0 20px', fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text)' }}>
              Modifier le projet
            </h2>

            <label className="text-label" style={{ display: 'block', marginBottom: 4 }}>Titre</label>
            <input
              className="form-input"
              style={{ marginBottom: 14, width: '100%' }}
              value={editForm.titre ?? ''}
              onChange={(e) => setEditForm({ ...editForm, titre: e.target.value })}
            />

            <label className="text-label" style={{ display: 'block', marginBottom: 4 }}>Description</label>
            <textarea
              className="form-input"
              style={{ marginBottom: 14, width: '100%', minHeight: 70, resize: 'vertical' }}
              value={editForm.description ?? ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />

            <label className="text-label" style={{ display: 'block', marginBottom: 4 }}>Statut</label>
            <select
              className="form-input"
              style={{ marginBottom: 20, width: '100%' }}
              value={editForm.statut ?? 'brouillon'}
              onChange={(e) => setEditForm({ ...editForm, statut: e.target.value })}
            >
              <option value="brouillon">Brouillon</option>
              <option value="actif">Actif</option>
              <option value="termine">Terminé</option>
            </select>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── All evaluations modal (prof) ─────────────────────────────────── */}
      {showAllEvals && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.4)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowAllEvals(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ width: 600, maxHeight: '80vh', padding: 28, overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text)' }}>
                Toutes les évaluations
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAllEvals(false)}>
                <X size={16} />
              </button>
            </div>

            {allEvals.length === 0 ? (
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                Aucune évaluation soumise pour le moment.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {allEvals.map((ev, i) => (
                  <div key={i} style={{ padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 6 }}>
                      Évaluateur : {ev.evaluateur?.prenom ?? 'Inconnu'} {ev.evaluateur?.nom ?? ''}
                    </p>
                    {ev.notes?.map((note, ni) => (
                      <div key={ni} style={{ marginLeft: 12, marginBottom: 4 }}>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                          {note.etudiant?.prenom ?? 'Membre'} : {' '}
                        </span>
                        {Object.entries(note.criteres ?? {}).map(([c, v]) => (
                          <span key={c} style={{ fontSize: 11, marginRight: 8 }}>
                            {c}: {v}/5
                          </span>
                        ))}
                      </div>
                    ))}
                    {ev.commentaire && (
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginTop: 4 }}>
                        {ev.commentaire}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
