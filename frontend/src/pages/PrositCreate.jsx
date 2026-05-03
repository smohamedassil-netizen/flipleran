import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import { logWarn } from '../utils/logger.js';
import {
  ArrowLeft, Lightbulb, Save, X, Plus, Trash2, BookOpen, Calendar, Users, Target, Sparkles,
} from 'lucide-react';

const FORMATION_MODES = [
  { id: 'random',         label: 'Aléatoire automatique', desc: 'Le système forme les groupes au hasard et attribue les rôles selon la rotation obligatoire CESI.' },
  { id: 'manual',         label: 'Composition manuelle', desc: 'Vous formez vous-même les groupes après publication du Prosit.' },
  { id: 'student_choice', label: 'Choix des étudiants',  desc: 'Les étudiants forment leurs propres groupes (validation possible avant phase Aller).' },
];

const FILIERES = ['ISIL', 'Management', 'Finance'];
const PROMOTIONS = ['L1', 'L2', 'L3'];

export default function PrositCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [aiPrefilled, setAiPrefilled] = useState(false);

  // Champs principaux
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [enonce, setEnonce] = useState('');
  const [motsClesText, setMotsClesText] = useState('');           // séparés par virgule
  const [objectifsText, setObjectifsText] = useState('');         // 1 par ligne
  const [caseEntreprise, setCaseEntreprise] = useState('');

  const [courseId, setCourseId] = useState('');
  const [filiere, setFiliere] = useState('ISIL');
  const [promotion, setPromotion] = useState('L3');

  const [dateAller, setDateAller] = useState('');
  const [dateRetour, setDateRetour] = useState('');
  const [dureeRecherche, setDureeRecherche] = useState(7);

  // Configuration des groupes
  const [minMembres, setMinMembres] = useState(4);
  const [maxMembres, setMaxMembres] = useState(8);
  const [formationMode, setFormationMode] = useState('random');

  // Grille d'évaluation
  const [grille, setGrille] = useState([
    { critere: 'Pertinence des hypothèses', poids: 25, description: 'Qualité et plausibilité des hypothèses formulées en phase Aller' },
    { critere: 'Profondeur de la recherche', poids: 25, description: 'Sources, rigueur, citations' },
    { critere: 'Qualité de la solution',     poids: 30, description: 'Exhaustivité, faisabilité, créativité' },
    { critere: 'Présentation orale',         poids: 20, description: 'Clarté, structure, gestion du temps' },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/courses')
      .then(({ data }) => setCourses(Array.isArray(data) ? data : []))
      .catch(() => setCourses([]));
  }, []);

  // Pré-remplissage depuis la suggestion IA (?prefill=<json>&courseId=<id>)
  // Lien généré par AutoPrepReview après acceptation de la suggestion Prosit.
  useEffect(() => {
    const prefillParam = searchParams.get('prefill');
    const courseIdParam = searchParams.get('courseId');
    if (!prefillParam) return;
    try {
      const data = JSON.parse(prefillParam);
      if (data.titre)         setTitre(String(data.titre));
      if (data.enonce)        setEnonce(String(data.enonce));
      if (data.problematique) setDescription(String(data.problematique));
      if (Array.isArray(data.motsCles) && data.motsCles.length > 0) {
        setMotsClesText(data.motsCles.join(', '));
      }
      if (courseIdParam) setCourseId(courseIdParam);
      setAiPrefilled(true);
    } catch (err) {
      logWarn('[PrositCreate] prefill parse error:', err.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const updateGrille = (i, field, value) => {
    setGrille(g => g.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };
  const addCritere = () => setGrille(g => [...g, { critere: '', poids: 10, description: '' }]);
  const removeCritere = (i) => setGrille(g => g.filter((_, idx) => idx !== i));

  const totalPoids = grille.reduce((s, c) => s + (Number(c.poids) || 0), 0);

  const submit = async (e) => {
    e?.preventDefault?.();
    setError('');

    if (!titre.trim() || !enonce.trim() || !dateAller || !dateRetour) {
      setError('Champs obligatoires manquants : titre, énoncé, dates Aller et Retour.');
      return;
    }
    if (new Date(dateAller) >= new Date(dateRetour)) {
      setError('La date Retour doit être postérieure à la date Aller.');
      return;
    }
    if (minMembres > maxMembres) {
      setError('Le minimum de membres ne peut pas dépasser le maximum.');
      return;
    }
    if (totalPoids !== 100) {
      setError(`Le total des poids de la grille doit être 100 (actuel : ${totalPoids}).`);
      return;
    }

    const payload = {
      titre: titre.trim(),
      description: description.trim(),
      enonce: enonce.trim(),
      motsCles: motsClesText.split(',').map(s => s.trim()).filter(Boolean),
      objectifsApprentissage: objectifsText.split('\n').map(s => s.trim()).filter(Boolean),
      caseEntreprise: caseEntreprise.trim(),
      courseId: courseId || null,
      filiere, promotion,
      dateAller, dateRetour,
      dureeRechercheJours: Number(dureeRecherche),
      groupesConfig: {
        minMembres: Number(minMembres),
        maxMembres: Number(maxMembres),
        formationMode,
      },
      grilleEvaluation: grille.filter(c => c.critere.trim()),
    };

    try {
      setSubmitting(true);
      const { data } = await api.post('/prosits', payload);
      navigate(`/prosits/${data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8,
    fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
  };
  const labelStyle = { display: 'block', fontSize: 12, color: '#475569', fontWeight: 600, marginBottom: 6 };

  return (
    <Layout title="Nouveau Prosit">
      <form onSubmit={submit} style={{ maxWidth: 900, margin: '0 auto' }}>
        <button type="button" onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
          <ArrowLeft size={18} /> Retour
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <Lightbulb size={26} color="#F59E0B" />
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1B4F72', margin: 0 }}>Nouveau Prosit</h1>
        </div>

        {aiPrefilled && (
          <div style={{
            padding: '12px 16px', marginBottom: 14, borderRadius: 10,
            background: 'linear-gradient(135deg, #F3E8FF, #FDF4FF)',
            border: '1px solid #C084FC',
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <Sparkles size={16} color="#9333EA" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#6B21A8', flex: 1 }}>
              <strong>Brouillon pré-rempli par l'IA.</strong> Vérifie le titre, l'énoncé et les mots-clés,
              ajuste les dates et la grille d'évaluation, puis publie.
            </span>
          </div>
        )}

        {error && (
          <div role="alert" style={{ padding: '10px 14px', marginBottom: 14, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Section : Informations générales */}
        <section style={{ background: 'white', borderRadius: 12, padding: 18, border: '1px solid #E5E7EB', marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1B4F72', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={16} /> Informations générales
          </h2>

          <label htmlFor="titre" style={labelStyle}>Titre du Prosit *</label>
          <input id="titre" value={titre} onChange={(e) => setTitre(e.target.value)} required style={{ ...inputStyle, marginBottom: 12 }} placeholder="Ex : Sécuriser une application web contre les attaques courantes" />

          <label htmlFor="description" style={labelStyle}>Description courte (pitch)</label>
          <input id="description" value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} placeholder="Une phrase pour résumer le contexte" />

          <label htmlFor="enonce" style={labelStyle}>Énoncé complet *</label>
          <textarea id="enonce" value={enonce} onChange={(e) => setEnonce(e.target.value)} required rows={6} style={{ ...inputStyle, marginBottom: 12, resize: 'vertical' }} placeholder="Décris la situation, le contexte, les livrables attendus…" />

          <label htmlFor="case" style={labelStyle}>Cas d'entreprise (contexte algérien)</label>
          <input id="case" value={caseEntreprise} onChange={(e) => setCaseEntreprise(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} placeholder="Sonatrach, Cevital, PME locale…" />

          <label htmlFor="motscles" style={labelStyle}>Mots-clés (séparés par virgules)</label>
          <input id="motscles" value={motsClesText} onChange={(e) => setMotsClesText(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} placeholder="OWASP, XSS, JWT, bcrypt, HTTPS" />

          <label htmlFor="objectifs" style={labelStyle}>Objectifs d'apprentissage (1 par ligne)</label>
          <textarea id="objectifs" value={objectifsText} onChange={(e) => setObjectifsText(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder={'Comprendre les vulnérabilités OWASP\nMettre en place une authentification sécurisée'} />
        </section>

        {/* Section : Contexte pédagogique */}
        <section style={{ background: 'white', borderRadius: 12, padding: 18, border: '1px solid #E5E7EB', marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1B4F72', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={16} /> Contexte pédagogique
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label htmlFor="course" style={labelStyle}>Cours associé (optionnel)</label>
              <select id="course" value={courseId} onChange={(e) => setCourseId(e.target.value)} style={inputStyle}>
                <option value="">— Aucun (Prosit autonome) —</option>
                {courses.map(c => <option key={c._id} value={c._id}>{c.titre}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="filiere" style={labelStyle}>Filière *</label>
              <select id="filiere" value={filiere} onChange={(e) => setFiliere(e.target.value)} style={inputStyle}>
                {FILIERES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="promotion" style={labelStyle}>Promotion *</label>
              <select id="promotion" value={promotion} onChange={(e) => setPromotion(e.target.value)} style={inputStyle}>
                {PROMOTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Section : Calendrier */}
        <section style={{ background: 'white', borderRadius: 12, padding: 18, border: '1px solid #E5E7EB', marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1B4F72', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} /> Calendrier
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label htmlFor="dAller" style={labelStyle}>Date Aller (séance 1) *</label>
              <input id="dAller" type="date" value={dateAller} onChange={(e) => setDateAller(e.target.value)} required style={inputStyle} />
            </div>
            <div>
              <label htmlFor="dRetour" style={labelStyle}>Date Retour (séance 2) *</label>
              <input id="dRetour" type="date" value={dateRetour} onChange={(e) => setDateRetour(e.target.value)} required style={inputStyle} />
            </div>
            <div>
              <label htmlFor="duree" style={labelStyle}>Durée recherche (jours)</label>
              <input id="duree" type="number" min={1} max={30} value={dureeRecherche} onChange={(e) => setDureeRecherche(e.target.value)} style={inputStyle} />
            </div>
          </div>
        </section>

        {/* Section : Configuration des groupes */}
        <section style={{ background: 'white', borderRadius: 12, padding: 18, border: '1px solid #E5E7EB', marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1B4F72', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} /> Configuration des groupes
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
            <div>
              <label htmlFor="minM" style={labelStyle}>Min membres / groupe</label>
              <input id="minM" type="number" min={2} max={12} value={minMembres} onChange={(e) => setMinMembres(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label htmlFor="maxM" style={labelStyle}>Max membres / groupe</label>
              <input id="maxM" type="number" min={2} max={12} value={maxMembres} onChange={(e) => setMaxMembres(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={labelStyle}>Mode de formation des groupes</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {FORMATION_MODES.map(m => (
              <label
                key={m.id}
                htmlFor={`mode-${m.id}`}
                style={{
                  padding: 12, border: `2px solid ${formationMode === m.id ? '#F59E0B' : '#E5E7EB'}`,
                  borderRadius: 10, cursor: 'pointer',
                  background: formationMode === m.id ? '#FFFBEB' : 'white',
                }}
              >
                <input
                  id={`mode-${m.id}`}
                  type="radio"
                  name="formationMode"
                  value={m.id}
                  checked={formationMode === m.id}
                  onChange={() => setFormationMode(m.id)}
                  style={{ marginRight: 8 }}
                />
                <strong style={{ fontSize: 13, color: '#1B4F72' }}>{m.label}</strong>
                <p style={{ fontSize: 11, color: '#64748B', margin: '4px 0 0', lineHeight: 1.5 }}>{m.desc}</p>
              </label>
            ))}
          </div>
        </section>

        {/* Section : Grille d'évaluation */}
        <section style={{ background: 'white', borderRadius: 12, padding: 18, border: '1px solid #E5E7EB', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1B4F72', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={16} /> Grille d'évaluation
            </h2>
            <span style={{ fontSize: 12, fontWeight: 700, color: totalPoids === 100 ? '#059669' : '#DC2626' }}>
              Total : {totalPoids} / 100
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 14px', lineHeight: 1.5 }}>
            Définissez les critères d'évaluation et leur poids (somme = 100). Cette grille sera appliquée à chaque groupe en phase Retour.
            <br />
            <strong>Mode V1 :</strong> évaluation par le professeur uniquement. (Auto-évaluation et évaluation par les pairs en perspective.)
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {grille.map((c, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 3fr auto', gap: 8, alignItems: 'center', padding: 10, background: '#F8FAFC', borderRadius: 8 }}>
                <input
                  aria-label={`Critère ${i + 1}`}
                  value={c.critere}
                  onChange={(e) => updateGrille(i, 'critere', e.target.value)}
                  placeholder="Nom du critère"
                  style={{ ...inputStyle, padding: '6px 10px' }}
                />
                <input
                  aria-label={`Poids critère ${i + 1}`}
                  type="number"
                  min={0}
                  max={100}
                  value={c.poids}
                  onChange={(e) => updateGrille(i, 'poids', Number(e.target.value))}
                  style={{ ...inputStyle, padding: '6px 10px' }}
                />
                <input
                  aria-label={`Description critère ${i + 1}`}
                  value={c.description}
                  onChange={(e) => updateGrille(i, 'description', e.target.value)}
                  placeholder="Description (optionnel)"
                  style={{ ...inputStyle, padding: '6px 10px' }}
                />
                <button
                  type="button"
                  onClick={() => removeCritere(i)}
                  aria-label={`Supprimer le critère ${i + 1}`}
                  style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addCritere} style={{ marginTop: 10, padding: '7px 12px', background: 'white', border: '1px dashed #CBD5E1', borderRadius: 8, fontSize: 12, color: '#475569', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} /> Ajouter un critère
          </button>
        </section>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={() => navigate(-1)} style={{ padding: '10px 18px', background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <X size={14} /> Annuler
          </button>
          <button type="submit" disabled={submitting} style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: submitting ? 0.7 : 1 }}>
            <Save size={14} /> {submitting ? 'Création…' : 'Créer le Prosit (brouillon)'}
          </button>
        </div>
      </form>
    </Layout>
  );
}
