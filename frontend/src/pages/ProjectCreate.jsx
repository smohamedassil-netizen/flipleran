import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import {
  ArrowLeft, Plus, Trash2, Save, AlertCircle, X, BookOpen, Wand2,
  ChevronDown, ChevronRight, Lock, Lightbulb,
} from 'lucide-react';
import { logError } from '../utils/logger.js';

/* Phases par défaut (utilisé en fallback si l'API templates est indisponible) */
const DEFAULT_PHASES = [
  'Lancement',
  'Recherche',
  'Développement',
  'Livrable',
  'Soutenance',
];

/* F8 — Métadonnées des 3 types pour le toggle (refonte 2026-05 : labels clarifiés) */
const TYPE_META = [
  { key: 'mono',   label: 'Projet d\'application',  hint: '1 module · 3 phases · 3 rôles (animateur/scribe/membre)' },
  { key: 'groupe', label: 'Projet multi-modules',   hint: '≥2 modules · 5 phases · 3 rôles' },
  { key: 'pfe',    label: 'Projet de fin d\'études', hint: '7 phases · 5 rôles spécialisés (chef_projet/scribe/animateur/chrono/analyste)' },
];

export default function ProjectCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [type, setType]               = useState('mono'); // 'mono' | 'groupe' | 'pfe'
  const [titre, setTitre]             = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId]       = useState('');         // pour mono
  const [moduleIds, setModuleIds]     = useState([]);          // pour groupé
  const [courses, setCourses]         = useState([]);

  const [enonce, setEnonce]         = useState('');
  const [motsCles, setMotsCles]     = useState([]);
  const [motCleInput, setMotCleInput] = useState('');

  const [dateDebut, setDateDebut]           = useState('');
  const [dateFin, setDateFin]               = useState('');
  const [dateSoutenance, setDateSoutenance] = useState('');

  const [phases, setPhases] = useState(DEFAULT_PHASES.map(t => ({ titre: t })));
  const [phasesTouched, setPhasesTouched] = useState(false); // F8 : si l'utilisateur a édité, on n'écrase plus
  const [rubricFromTemplate, setRubricFromTemplate] = useState([]); // F8 : payload envoyé au backend
  const [fromTemplateName, setFromTemplateName] = useState(''); // F10 : badge "Issu de template X"

  // Refonte 2026-05 : lien optionnel CAI étape 3 → étape 4
  const [linkedCasPratiqueId, setLinkedCasPratiqueId] = useState('');
  const [casPratiques, setCasPratiques] = useState([]);

  // Phase 3 (2026-05) — déblocage progressif :
  // chapitres + cas pratiques disponibles pour le module sélectionné, qui
  // alimentent les multi-selects de chaque phase.unlockRules.
  const [chaptersByCourse, setChaptersByCourse]         = useState([]);
  const [casPratiquesByCourse, setCasPratiquesByCourse] = useState([]);
  // index → boolean pour replier/déplier les sections "Conditions de déblocage"
  const [expandedUnlock, setExpandedUnlock]             = useState({});

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    api.get('/courses')
      .then(({ data }) => setCourses(data))
      .catch(logError);
    // Charger les cas pratiques évalués pour permettre le rattachement
    api.get('/cas-pratiques', { params: { statut: 'evalue' } })
      .then(({ data }) => setCasPratiques(Array.isArray(data) ? data : []))
      .catch(() => setCasPratiques([]));
  }, []);

  /* F10 — Pré-remplissage depuis ProjectTemplateLibrary via sessionStorage */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('projectCreate.prefill');
      if (!raw) return;
      const tpl = JSON.parse(raw);
      sessionStorage.removeItem('projectCreate.prefill');
      // Pré-remplit les champs principaux. Le user reste libre d'éditer.
      if (tpl.title) setTitre(tpl.title);
      if (tpl.description) setDescription(tpl.description);
      if (tpl.enonce) setEnonce(tpl.enonce);
      if (Array.isArray(tpl.motsCles)) setMotsCles(tpl.motsCles);
      if (tpl.type) setType(tpl.type);
      if (Array.isArray(tpl.phases) && tpl.phases.length) {
        setPhases(tpl.phases.map((p) => ({
          titre: p.titre,
          description: p.description || '',
          weight: p.weight,
          livrableSpec: p.livrableSpec || null,
        })));
        // empêche le useEffect F8 de réécrire ces phases avec le template générique
        setPhasesTouched(true);
      }
      if (Array.isArray(tpl.rubric) && tpl.rubric.length) {
        setRubricFromTemplate(tpl.rubric);
      }
      setFromTemplateName(tpl.title || '');
    } catch (e) { logError('prefill error:', e); }
  }, []);

  /* Phase 3 — Charger chapitres + cas pratiques du module sélectionné pour
     alimenter les multi-selects de phase.unlockRules. Si pas de courseId
     (projet groupe/pfe), on charge le 1er module sélectionné dans moduleIds.
     Toléré silencieusement si endpoints indisponibles. */
  useEffect(() => {
    const cid = type === 'mono' ? courseId : moduleIds[0] || '';
    if (!cid) {
      setChaptersByCourse([]);
      setCasPratiquesByCourse([]);
      return;
    }
    api.get(`/courses/${cid}/chapters`)
      .then(({ data }) => {
        // listChapters renvoie { chapters, orphans } — on garde chapters
        const list = Array.isArray(data?.chapters) ? data.chapters : (Array.isArray(data) ? data : []);
        setChaptersByCourse(list);
      })
      .catch(() => setChaptersByCourse([]));
    api.get('/cas-pratiques', { params: { courseId: cid } })
      .then(({ data }) => setCasPratiquesByCourse(Array.isArray(data) ? data : []))
      .catch(() => setCasPratiquesByCourse([]));
  }, [type, courseId, moduleIds]);

  /* F8 — Charge le template phases + rubric à chaque changement de type,
     SAUF si l'utilisateur a déjà touché manuellement à la liste des phases. */
  useEffect(() => {
    if (phasesTouched) return;
    api.get(`/projects/templates/${type}`)
      .then(({ data }) => {
        if (Array.isArray(data?.phases)) {
          setPhases(data.phases.map((p) => ({
            titre: p.titre,
            description: p.description || '',
            weight: p.weight,
            livrableSpec: p.livrableSpec || null,
          })));
        }
        if (Array.isArray(data?.rubric)) setRubricFromTemplate(data.rubric);
      })
      .catch(() => {
        // Fallback : phases génériques anciennes
        setPhases(DEFAULT_PHASES.map(t => ({ titre: t })));
      });
  }, [type, phasesTouched]);

  const toggleModule = (id) => {
    setModuleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const addMotCle = () => {
    const mc = motCleInput.trim();
    if (mc && !motsCles.includes(mc)) {
      setMotsCles(prev => [...prev, mc]);
    }
    setMotCleInput('');
  };
  const removeMotCle = (index) => {
    setMotsCles(prev => prev.filter((_, i) => i !== index));
  };

  const addPhase = () => {
    setPhasesTouched(true);
    setPhases(prev => [...prev, { titre: '' }]);
  };
  const removePhase = (index) => {
    setPhasesTouched(true);
    setPhases(prev => prev.filter((_, i) => i !== index));
  };
  const updatePhase = (index, value) => {
    setPhasesTouched(true);
    setPhases(prev => {
      const updated = [...prev];
      // Conserve les autres champs (description, weight, livrableSpec) du template
      updated[index] = { ...updated[index], titre: value };
      return updated;
    });
  };

  /* Phase 3 — Helpers unlockRules + sourceCasPratiqueId par phase */
  const ensureUnlockRules = (phase) => phase.unlockRules || {
    chapterIds: [],
    casPratiqueIds: [],
    requiresAllChapters: true,
    requiresAllCasPratiques: true,
  };

  const togglePhaseUnlockChapter = (phaseIndex, chapterId) => {
    setPhasesTouched(true);
    setPhases((prev) => {
      const updated = [...prev];
      const rules = ensureUnlockRules(updated[phaseIndex]);
      const list = rules.chapterIds || [];
      const next = list.includes(chapterId)
        ? list.filter((id) => id !== chapterId)
        : [...list, chapterId];
      updated[phaseIndex] = { ...updated[phaseIndex], unlockRules: { ...rules, chapterIds: next } };
      return updated;
    });
  };

  const togglePhaseUnlockCasPratique = (phaseIndex, casPratiqueId) => {
    setPhasesTouched(true);
    setPhases((prev) => {
      const updated = [...prev];
      const rules = ensureUnlockRules(updated[phaseIndex]);
      const list = rules.casPratiqueIds || [];
      const next = list.includes(casPratiqueId)
        ? list.filter((id) => id !== casPratiqueId)
        : [...list, casPratiqueId];
      updated[phaseIndex] = { ...updated[phaseIndex], unlockRules: { ...rules, casPratiqueIds: next } };
      return updated;
    });
  };

  const setPhaseRequiresAll = (phaseIndex, key, value) => {
    setPhasesTouched(true);
    setPhases((prev) => {
      const updated = [...prev];
      const rules = ensureUnlockRules(updated[phaseIndex]);
      updated[phaseIndex] = { ...updated[phaseIndex], unlockRules: { ...rules, [key]: value } };
      return updated;
    });
  };

  const setPhaseSourceCasPratique = (phaseIndex, value) => {
    setPhasesTouched(true);
    setPhases((prev) => {
      const updated = [...prev];
      updated[phaseIndex] = { ...updated[phaseIndex], sourceCasPratiqueId: value || null };
      return updated;
    });
  };

  /* Validation locale : si sourceCasPratiqueId est défini, il doit être inclus
     dans unlockRules.casPratiqueIds — sinon l'étudiant ne pourrait jamais
     atteindre la phase pour utiliser le bouton "Importer livrable". */
  const phasesValidationErrors = useMemo(() => {
    return phases.map((p) => {
      if (!p.sourceCasPratiqueId) return null;
      const list = (p.unlockRules?.casPratiqueIds || []).map(String);
      if (!list.includes(String(p.sourceCasPratiqueId))) {
        return 'Le cas pratique source doit aussi être listé dans les "Études de cas requises".';
      }
      return null;
    });
  }, [phases]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!titre.trim()) return setError('Le titre est obligatoire.');
    if (type === 'mono' && !courseId) {
      return setError('Sélectionnez le module rattaché au projet.');
    }
    if (['groupe', 'pfe'].includes(type) && moduleIds.length < 2) {
      return setError(`Un projet ${type === 'pfe' ? 'PFE' : 'multi-modules'} doit être rattaché à au moins deux modules.`);
    }
    if (phases.length === 0) return setError('Ajoutez au moins une phase.');
    if (phases.some(p => !p.titre.trim())) return setError('Toutes les phases doivent avoir un titre.');

    // Phase 3 — Validation cohérence sourceCasPratiqueId / unlockRules
    const firstInvalid = phasesValidationErrors.findIndex((e) => e);
    if (firstInvalid !== -1) {
      setExpandedUnlock((prev) => ({ ...prev, [firstInvalid]: true }));
      return setError(`Phase ${firstInvalid + 1} : ${phasesValidationErrors[firstInvalid]}`);
    }

    setSaving(true);
    try {
      const payload = {
        type,
        titre: titre.trim(),
        description: description.trim(),
        enonce: enonce.trim(),
        motsCles,
        // F8 : on envoie phases enrichies (avec description/weight/livrableSpec quand fournies par le template)
        // Phase 3 : on ajoute unlockRules + sourceCasPratiqueId si configurés
        phases: phases.map(p => {
          const out = {
            titre: p.titre.trim(),
            description: p.description || '',
            weight: p.weight ?? 0,
            livrableSpec: p.livrableSpec || null,
            statut: 'a_faire',
          };
          const rules = p.unlockRules;
          if (rules && ((rules.chapterIds?.length || 0) + (rules.casPratiqueIds?.length || 0) > 0)) {
            out.unlockRules = {
              chapterIds: rules.chapterIds || [],
              casPratiqueIds: rules.casPratiqueIds || [],
              requiresAllChapters: rules.requiresAllChapters !== false,
              requiresAllCasPratiques: rules.requiresAllCasPratiques !== false,
            };
          }
          if (p.sourceCasPratiqueId) {
            out.sourceCasPratiqueId = p.sourceCasPratiqueId;
          }
          return out;
        }),
        // F8 : la rubric est issue du template (modifiable plus tard via PUT /rubric)
        rubric: rubricFromTemplate,
      };

      if (type === 'mono') {
        payload.courseId = courseId;
      } else {
        payload.modules = moduleIds;
      }
      if (dateDebut) payload.dateDebut = dateDebut;
      if (dateFin) payload.dateFin = dateFin;
      if (dateSoutenance) payload.dateSoutenance = dateSoutenance;
      if (linkedCasPratiqueId) payload.linkedCasPratiqueId = linkedCasPratiqueId;

      const { data } = await api.post('/projects', payload);
      navigate(`/projects/${data._id}`);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erreur lors de la création du projet.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Nouveau projet">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
              <ArrowLeft size={15} />
            </button>
            <h1 className="page-title" style={{ margin: 0 }}>Créer un nouveau projet</h1>
          </div>
          {/* F10 — bouton "Partir d'un template" */}
          <button
            type="button"
            onClick={() => navigate('/professor/templates')}
            className="btn btn-sm"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)',
              color: 'white', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <BookOpen size={13} /> Partir d'un template
          </button>
        </div>

        {/* F10 — bandeau "Issu d'un template" */}
        {fromTemplateName && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', marginBottom: 16,
            background: 'linear-gradient(135deg, #faf5ff 0%, #eff6ff 100%)',
            border: '1px solid #e9d5ff', borderRadius: 10,
            fontSize: 12.5, color: '#1e1b4b',
          }}>
            <Wand2 size={14} color="#7c3aed" />
            <span>
              <strong>Pré-rempli depuis le template :</strong> {fromTemplateName}.
              Tu peux tout éditer librement avant de publier.
            </span>
          </div>
        )}

        {/* Bandeau pédagogique CAI — Étape 4 Production */}
        <div style={{
          padding: '12px 16px', marginBottom: 16,
          background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10,
          fontSize: 13, color: '#78350F', display: 'flex', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>🚀</span>
          <div>
            <strong>Étape 4 du Cycle CAI — Production</strong>
            <div style={{ marginTop: 4 }}>
              Un <strong>projet</strong> = créer quelque chose d'original (livrable productif).
              C'est différent du <strong>cas pratique</strong> (résoudre un problème donné en groupe court).
              Vise une production qui prolonge ce que les étudiants ont appris.
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Common fields */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Informations générales
            </p>

            <div style={{ marginBottom: 14 }}>
              <label className="form-label">
                Titre <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                className="form-input"
                style={{ width: '100%' }}
                placeholder="Titre du projet"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                style={{ width: '100%', minHeight: 70, resize: 'vertical' }}
                placeholder="Description du projet..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Refonte 2026-05 : lien optionnel vers cas pratique précédent */}
            {casPratiques.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label className="form-label">
                  Prolonger un cas pratique <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(facultatif)</span>
                </label>
                <select
                  className="form-input"
                  style={{ width: '100%' }}
                  value={linkedCasPratiqueId}
                  onChange={(e) => setLinkedCasPratiqueId(e.target.value)}
                >
                  <option value="">— Aucun (projet autonome) —</option>
                  {casPratiques.map((cp) => (
                    <option key={cp._id} value={cp._id}>{cp.titre}</option>
                  ))}
                </select>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  Lie ce projet à un cas pratique évalué pour souligner la continuité Étape 3 (Application) → Étape 4 (Production) du Cycle CAI.
                </div>
              </div>
            )}

            {/* Rattachement : 1 module ou plusieurs */}
            <div>
              <label className="form-label">
                Rattachement <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>

              {/* Toggle 3 types : module unique / multi-modules / PFE (F8) */}
              <div style={{ display: 'inline-flex', gap: 0, marginBottom: 10, padding: 2, border: '1px solid var(--color-border)', borderRadius: 8, background: '#F8FAFC', flexWrap: 'wrap' }}>
                {TYPE_META.map(({ key, label, hint }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setType(key); setPhasesTouched(false); }}
                    title={hint}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: 'none',
                      background: type === key ? 'var(--color-primary)' : 'transparent',
                      color: type === key ? '#fff' : 'var(--color-text-secondary)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: -2, marginBottom: 8 }}>
                {TYPE_META.find((t) => t.key === type)?.hint} — les phases et la rubric sont pré-remplies, tu peux tout éditer en bas.
              </p>

              {type === 'mono' ? (
                <select
                  className="form-input"
                  style={{ width: '100%' }}
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  required
                >
                  <option value="">Sélectionner un module</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>{c.titre}</option>
                  ))}
                </select>
              ) : (
                <>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 6px' }}>
                    Sélectionner au moins 2 modules. Le projet sera {type === 'pfe' ? 'un PFE multi-disciplines' : 'transverse'}.
                  </p>
                  <div style={{
                    border: '1px solid var(--color-border)', borderRadius: 8,
                    maxHeight: 220, overflowY: 'auto', padding: 4,
                  }}>
                    {courses.length === 0 && (
                      <p style={{ padding: 12, color: 'var(--color-text-secondary)', fontSize: 13, margin: 0 }}>Aucun module disponible.</p>
                    )}
                    {courses.map((c) => {
                      const checked = moduleIds.includes(c._id);
                      return (
                        <label key={c._id} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 10px', borderRadius: 6,
                          background: checked ? '#EBF3FA' : 'transparent',
                          cursor: 'pointer',
                        }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleModule(c._id)} />
                          <span style={{ fontSize: 13, color: 'var(--color-text)' }}>
                            {c.titre} <span style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>({c.filiere || '?'})</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {moduleIds.length > 0 && (
                    <p style={{ marginTop: 6, fontSize: 12, color: '#1B4F72' }}>
                      {moduleIds.length} module{moduleIds.length > 1 ? 's' : ''} sélectionné{moduleIds.length > 1 ? 's' : ''}.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Énoncé + mots-clés (commun à mono et groupé) */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Énoncé et mots-clés
            </p>

            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Énoncé / contexte</label>
              <textarea
                className="form-input"
                style={{ width: '100%', minHeight: 100, resize: 'vertical' }}
                placeholder="Décrivez le sujet, le contexte ou la situation problème..."
                value={enonce}
                onChange={(e) => setEnonce(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Mots-clés</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="Ajouter un mot-clé..."
                  value={motCleInput}
                  onChange={(e) => setMotCleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addMotCle();
                    }
                  }}
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={addMotCle}>
                  <Plus size={14} /> Ajouter
                </button>
              </div>
              {motsCles.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {motsCles.map((mc, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', fontSize: 12, fontWeight: 600,
                      borderRadius: 20, backgroundColor: '#EBF3FA', color: '#1B4F72',
                    }}>
                      {mc}
                      <button type="button" onClick={() => removeMotCle(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#1B4F72' }}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Calendrier */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Calendrier (optionnel)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">Date début</label>
                <input type="date" className="form-input" style={{ width: '100%' }} value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Date fin</label>
                <input type="date" className="form-input" style={{ width: '100%' }} value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Date soutenance</label>
                <input type="date" className="form-input" style={{ width: '100%' }} value={dateSoutenance} onChange={(e) => setDateSoutenance(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Phases */}
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', margin: 0 }}>
                Phases ({phases.length})
              </p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addPhase} style={{ fontSize: 'var(--font-size-xs)' }}>
                <Plus size={13} /> Ajouter une phase
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {phases.map((phase, i) => {
                const isExpanded = !!expandedUnlock[i];
                const rules = phase.unlockRules || {};
                const chapterCount = (rules.chapterIds || []).length;
                const cpCount = (rules.casPratiqueIds || []).length;
                const hasRules = chapterCount + cpCount > 0;
                const hasImport = !!phase.sourceCasPratiqueId;
                const validationErr = phasesValidationErrors[i];
                const cidForLookup = type === 'mono' ? courseId : moduleIds[0] || '';

                return (
                  <div
                    key={i}
                    style={{
                      borderRadius: 10,
                      border: `1px solid ${validationErr ? '#FCA5A5' : '#E2E8F0'}`,
                      overflow: 'hidden',
                      background: validationErr ? '#FFF5F5' : '#FFFFFF',
                    }}
                  >
                    {/* Ligne principale : numéro + titre + bouton supprimer */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 10 }}>
                      <div style={{
                        width: 28, height: 28, flexShrink: 0,
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--color-primary-light)',
                        color: 'var(--color-primary)',
                        fontWeight: 700, fontSize: 'var(--font-size-xs)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {i + 1}
                      </div>
                      <input
                        className="form-input"
                        style={{ flex: 1 }}
                        placeholder={`Phase ${i + 1}`}
                        value={phase.titre}
                        onChange={(e) => updatePhase(i, e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => removePhase(i)}
                        style={{ color: '#e74c3c', padding: '4px 8px' }}
                        disabled={phases.length <= 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Toggle "Conditions de déblocage" */}
                    <button
                      type="button"
                      onClick={() => setExpandedUnlock((prev) => ({ ...prev, [i]: !prev[i] }))}
                      aria-expanded={isExpanded}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                        padding: '8px 12px', background: '#F8FAFC',
                        border: 'none', borderTop: '1px solid #E2E8F0',
                        cursor: 'pointer', textAlign: 'left',
                        fontSize: 12, color: '#475569', fontWeight: 600,
                      }}
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <Lock size={13} color="#1B4F72" />
                      <span>Conditions de déblocage</span>
                      {hasRules && (
                        <span style={{
                          marginLeft: 6, padding: '1px 8px', borderRadius: 999,
                          background: '#EFF6FF', color: '#1B4F72',
                          fontSize: 11, fontWeight: 700,
                        }}>
                          {chapterCount > 0 && `${chapterCount} chap.`}
                          {chapterCount > 0 && cpCount > 0 && ' · '}
                          {cpCount > 0 && `${cpCount} cas`}
                        </span>
                      )}
                      {hasImport && (
                        <span style={{
                          marginLeft: 4, padding: '1px 8px', borderRadius: 999,
                          background: '#FEF3C7', color: '#92400E',
                          fontSize: 11, fontWeight: 700,
                        }}>
                          import livrable
                        </span>
                      )}
                      {validationErr && (
                        <span style={{ marginLeft: 'auto', color: '#DC2626', fontSize: 11, fontWeight: 700 }}>
                          ⚠ erreur
                        </span>
                      )}
                    </button>

                    {/* Contenu replié */}
                    {isExpanded && (
                      <div style={{ padding: 14, borderTop: '1px solid #E2E8F0', background: '#FCFCFD' }}>
                        {!cidForLookup ? (
                          <p style={{ fontSize: 12.5, color: '#94A3B8', fontStyle: 'italic', margin: 0 }}>
                            Sélectionne d'abord un module pour configurer les prérequis.
                          </p>
                        ) : (
                          <>
                            {/* Chapitres requis */}
                            <div style={{ marginBottom: 14 }}>
                              <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', margin: '0 0 6px' }}>
                                Chapitres requis (
                                {chaptersByCourse.length === 0
                                  ? 'aucun chapitre dans ce module'
                                  : `${chaptersByCourse.length} disponibles`}
                                )
                              </p>
                              {chaptersByCourse.length === 0 ? (
                                <p style={{ fontSize: 11.5, color: '#94A3B8', fontStyle: 'italic', margin: 0 }}>
                                  Crée des chapitres dans ce module pour les utiliser comme prérequis.
                                </p>
                              ) : (
                                <div style={{
                                  display: 'flex', flexDirection: 'column', gap: 4,
                                  maxHeight: 180, overflowY: 'auto',
                                  border: '1px solid #E2E8F0', borderRadius: 6, padding: 4, background: '#fff',
                                }}>
                                  {chaptersByCourse.map((ch) => {
                                    const checked = (rules.chapterIds || []).map(String).includes(String(ch._id));
                                    return (
                                      <label
                                        key={ch._id}
                                        style={{
                                          display: 'flex', alignItems: 'center', gap: 8,
                                          padding: '5px 8px', borderRadius: 4,
                                          background: checked ? '#EFF6FF' : 'transparent',
                                          cursor: 'pointer', fontSize: 12.5, color: '#1E293B',
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => togglePhaseUnlockChapter(i, ch._id)}
                                        />
                                        <span>{ch.titre}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                              {chapterCount > 1 && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11.5, color: '#64748B' }}>
                                  <input
                                    type="checkbox"
                                    checked={rules.requiresAllChapters !== false}
                                    onChange={(e) => setPhaseRequiresAll(i, 'requiresAllChapters', e.target.checked)}
                                  />
                                  Toutes les conditions (sinon : au moins un chapitre suffit)
                                </label>
                              )}
                            </div>

                            {/* Cas pratiques requis */}
                            <div style={{ marginBottom: 14 }}>
                              <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', margin: '0 0 6px' }}>
                                Études de cas requises (
                                {casPratiquesByCourse.length === 0
                                  ? 'aucune disponible'
                                  : `${casPratiquesByCourse.length} disponibles`}
                                )
                              </p>
                              {casPratiquesByCourse.length === 0 ? (
                                <p style={{ fontSize: 11.5, color: '#94A3B8', fontStyle: 'italic', margin: 0 }}>
                                  Crée et évalue des études de cas dans ce module pour les utiliser comme prérequis.
                                </p>
                              ) : (
                                <div style={{
                                  display: 'flex', flexDirection: 'column', gap: 4,
                                  maxHeight: 180, overflowY: 'auto',
                                  border: '1px solid #E2E8F0', borderRadius: 6, padding: 4, background: '#fff',
                                }}>
                                  {casPratiquesByCourse.map((cp) => {
                                    const checked = (rules.casPratiqueIds || []).map(String).includes(String(cp._id));
                                    return (
                                      <label
                                        key={cp._id}
                                        style={{
                                          display: 'flex', alignItems: 'center', gap: 8,
                                          padding: '5px 8px', borderRadius: 4,
                                          background: checked ? '#FEF3C7' : 'transparent',
                                          cursor: 'pointer', fontSize: 12.5, color: '#1E293B',
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => togglePhaseUnlockCasPratique(i, cp._id)}
                                        />
                                        <span>{cp.titre}</span>
                                        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94A3B8' }}>
                                          {cp.statut || '-'}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                              {cpCount > 1 && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11.5, color: '#64748B' }}>
                                  <input
                                    type="checkbox"
                                    checked={rules.requiresAllCasPratiques !== false}
                                    onChange={(e) => setPhaseRequiresAll(i, 'requiresAllCasPratiques', e.target.checked)}
                                  />
                                  Toutes les conditions (sinon : au moins un cas pratique suffit)
                                </label>
                              )}
                            </div>

                            {/* Réutilisation livrable */}
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Lightbulb size={13} color="#D97706" />
                                Réutilisation du livrable (optionnel)
                              </p>
                              <select
                                className="form-input"
                                style={{ width: '100%', fontSize: 12.5 }}
                                value={phase.sourceCasPratiqueId || ''}
                                onChange={(e) => setPhaseSourceCasPratique(i, e.target.value)}
                                disabled={casPratiquesByCourse.length === 0}
                              >
                                <option value="">— Aucun (l'étudiant repart de zéro) —</option>
                                {casPratiquesByCourse.map((cp) => (
                                  <option key={cp._id} value={cp._id}>{cp.titre}</option>
                                ))}
                              </select>
                              <p style={{ fontSize: 11, color: '#64748B', margin: '4px 0 0' }}>
                                Si défini, l'étudiant verra un bouton « Importer mon livrable » pour reprendre son travail du cas pratique.
                              </p>
                              {validationErr && (
                                <p style={{ fontSize: 11.5, color: '#DC2626', margin: '6px 0 0', fontWeight: 600 }}>
                                  ⚠ {validationErr}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} />
              {saving ? 'Création...' : 'Créer le projet'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
