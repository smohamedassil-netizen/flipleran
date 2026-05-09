import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  ArrowLeft, Save, Plus, Trash2, Calendar, Users, FileText,
  Link as LinkIcon, BookOpen, Sparkles, Mic, PenTool, User as UserIcon,
} from 'lucide-react';

const RESOURCE_TYPES = [
  { id: 'pdf',     label: 'Document PDF', Icon: FileText },
  { id: 'link',    label: 'Lien externe', Icon: LinkIcon },
  { id: 'article', label: 'Article',      Icon: BookOpen },
];

const ROLE_META = {
  animateur: { label: 'Animateur', Icon: Mic,        color: '#9333EA' },
  scribe:    { label: 'Scribe',    Icon: PenTool,    color: '#10B981' },
  membre:    { label: 'Membre',    Icon: UserIcon,   color: '#64748B' },
};

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function CasPratiqueCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [courses, setCourses] = useState([]);
  const [chapters, setChapters] = useState([]);

  // Champs principaux
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [contexte, setContexte] = useState('');
  const [problematique, setProblematique] = useState('');
  const [courseId, setCourseId] = useState('');
  const [chapterIds, setChapterIds] = useState([]);

  // Ressources
  const [resources, setResources] = useState([]);

  // Calendrier
  const [phaseCadrageDate, setPhaseCadrageDate] = useState(todayPlus(2));
  const [phaseBilanDate, setPhaseBilanDate] = useState(todayPlus(9));

  // Groupe
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]); // [{studentId, role}]
  const [draftId, setDraftId] = useState(null); // ID du brouillon créé pour appeler /eligible-students

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/courses')
      .then(({ data }) => setCourses(Array.isArray(data) ? data : []))
      .catch(() => setCourses([]));
    const cid = searchParams.get('courseId');
    if (cid) setCourseId(cid);
  }, [searchParams]);

  // Charger chapitres + étudiants éligibles quand le cours change
  useEffect(() => {
    if (!courseId) {
      setChapters([]);
      setEligibleStudents([]);
      return;
    }
    api.get(`/courses/${courseId}/chapters`)
      .then(({ data }) => setChapters(Array.isArray(data) ? data : []))
      .catch(() => setChapters([]));

    // Pour récupérer eligibleStudents on doit avoir un cas pratique. On utilise
    // un endpoint alternatif : récupérer tous les étudiants du cours via /api/users
    api.get('/users', { params: { role: 'etudiant' } })
      .then(({ data }) => {
        const users = Array.isArray(data) ? data : (data.users || []);
        // Filtrer par filière+promo du cours si possible
        const course = courses.find((c) => c._id === courseId);
        const filtered = course?.filiere && course?.promotion
          ? users.filter((u) => u.filiere === course.filiere && u.promotion === course.promotion)
          : users;
        setEligibleStudents(filtered);
      })
      .catch(() => setEligibleStudents([]));
  }, [courseId, courses]);

  // Calendrier : validation Bilan ≥ Cadrage + 5j
  const calendarError = useMemo(() => {
    if (!phaseCadrageDate || !phaseBilanDate) return '';
    const c = new Date(phaseCadrageDate);
    const b = new Date(phaseBilanDate);
    const diff = (b - c) / (1000 * 60 * 60 * 24);
    if (diff < 5) return 'La date du Bilan doit être au moins 5 jours après le Cadrage.';
    return '';
  }, [phaseCadrageDate, phaseBilanDate]);

  // Composition groupe
  function toggleStudent(sid) {
    setSelectedStudents((prev) => {
      const existing = prev.find((m) => m.studentId === sid);
      if (existing) return prev.filter((m) => m.studentId !== sid);
      // Auto-rôle : 1er = animateur, 2e = scribe, reste = membre
      const role = prev.length === 0 ? 'animateur'
                 : prev.length === 1 ? 'scribe'
                 : 'membre';
      return [...prev, { studentId: sid, role }];
    });
  }

  function setMemberRole(sid, role) {
    setSelectedStudents((prev) => prev.map((m) => m.studentId === sid ? { ...m, role } : m));
  }

  async function suggestAutoRotation() {
    if (selectedStudents.length < 3) {
      setError('Sélectionne au moins 3 étudiants avant de demander une rotation.');
      return;
    }
    if (!courseId) {
      setError('Choisis d\'abord un module.');
      return;
    }
    setError('');
    try {
      // Créer un brouillon temporaire pour appeler /role-rotation/suggest
      // (on utilisera ce brouillon comme base si l'utilisateur soumet ensuite)
      let cpId = draftId;
      if (!cpId) {
        const { data } = await api.post('/cas-pratiques', {
          titre: titre || '[Brouillon rotation]',
          contexte: contexte || '[Brouillon rotation]',
          problematique: problematique || '[Brouillon rotation]',
          courseId,
        });
        cpId = data._id;
        setDraftId(cpId);
      }
      const studentIds = selectedStudents.map((m) => m.studentId);
      const { data } = await api.post(`/cas-pratiques/${cpId}/role-rotation/suggest`, { studentIds });
      const suggested = data.members || [];
      setSelectedStudents(suggested.map((s) => ({ studentId: s.studentId, role: s.role })));
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur suggestion rotation');
    }
  }

  // Ressources
  function addResource() {
    if (resources.length >= 5) return;
    setResources([...resources, { type: 'link', title: '', url: '', description: '' }]);
  }
  function updateResource(i, patch) {
    setResources((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }
  function removeResource(i) {
    setResources((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Validations frontend
    if (!titre.trim()) return setError('Le titre est requis.');
    if (!contexte.trim()) return setError('Le contexte du cas est requis.');
    if (!problematique.trim()) return setError('La problématique est requise.');
    if (!courseId) return setError('Choisis un module.');
    if (calendarError) return setError(calendarError);

    if (selectedStudents.length > 0) {
      if (selectedStudents.length < 3) {
        return setError('Le groupe doit contenir au moins 3 étudiants.');
      }
      const counts = { animateur: 0, scribe: 0, membre: 0 };
      selectedStudents.forEach((m) => counts[m.role]++);
      if (counts.animateur !== 1 || counts.scribe !== 1) {
        return setError('Le groupe doit avoir exactement 1 animateur et 1 scribe.');
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        titre: titre.trim(),
        description,
        contexte,
        problematique,
        courseId,
        chapterIds,
        resources,
        phaseCadrageDate,
        phaseBilanDate,
        groupMembers: selectedStudents,
      };
      let cpId;
      if (draftId) {
        // Le brouillon existe déjà (créé pour rotation auto) — on le met à jour
        await api.put(`/cas-pratiques/${draftId}`, payload);
        if (selectedStudents.length > 0) {
          await api.post(`/cas-pratiques/${draftId}/group`, { members: selectedStudents });
        }
        cpId = draftId;
      } else {
        const { data } = await api.post('/cas-pratiques', payload);
        cpId = data._id;
      }
      navigate(`/cas-pratiques/${cpId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur création cas pratique');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
        <button
          onClick={() => navigate('/cas-pratiques')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            background: 'none', border: 'none', color: 'var(--color-primary)',
            cursor: 'pointer', marginBottom: '1rem',
          }}
        >
          <ArrowLeft size={16} /> Retour aux cas pratiques
        </button>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Créer un cas pratique
        </h1>
        <p style={{ color: '#64748B', marginBottom: '2rem' }}>
          Pose un problème concret à tes étudiants. Ils proposeront une solution en groupe en
          3 phases : Cadrage, Travail individuel, Bilan.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* ─── Module + chapitres ─── */}
          <section style={cardStyle}>
            <h2 style={sectionTitle}>1. Module pédagogique</h2>
            <div style={fieldGroup}>
              <label style={labelStyle}>Module <span style={{ color: '#DC2626' }}>*</span></label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                style={inputStyle}
                required
              >
                <option value="">— Choisir un module —</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>{c.titre}</option>
                ))}
              </select>
            </div>

            {chapters.length > 0 && (
              <div style={fieldGroup}>
                <label style={labelStyle}>Chapitres couverts (facultatif)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {chapters.map((ch) => {
                    const checked = chapterIds.includes(ch._id);
                    return (
                      <button
                        type="button"
                        key={ch._id}
                        onClick={() => setChapterIds((prev) =>
                          checked ? prev.filter((id) => id !== ch._id) : [...prev, ch._id]
                        )}
                        style={{
                          padding: '6px 12px', borderRadius: 999,
                          border: `1px solid ${checked ? 'var(--color-primary)' : '#CBD5E1'}`,
                          background: checked ? 'var(--color-primary)' : 'white',
                          color: checked ? 'white' : '#475569',
                          fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        {ch.titre || ch.title || 'Chapitre'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* ─── Énoncé ─── */}
          <section style={cardStyle}>
            <h2 style={sectionTitle}>2. Énoncé du cas</h2>
            <div style={fieldGroup}>
              <label style={labelStyle}>Titre <span style={{ color: '#DC2626' }}>*</span></label>
              <input
                type="text" value={titre} onChange={(e) => setTitre(e.target.value)}
                placeholder="Ex : Sécurisation d'une plateforme e-commerce algérienne"
                style={inputStyle} required
              />
            </div>
            <div style={fieldGroup}>
              <label style={labelStyle}>Description courte</label>
              <input
                type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="1 phrase qui résume le cas"
                style={inputStyle}
              />
            </div>
            <div style={fieldGroup}>
              <label style={labelStyle}>
                Contexte <span style={{ color: '#DC2626' }}>*</span>
                <span style={hintStyle}> — 200 à 500 mots, raconte la situation</span>
              </label>
              <textarea
                value={contexte} onChange={(e) => setContexte(e.target.value)}
                rows={8}
                placeholder="Une PME algérienne du secteur du e-commerce subit depuis 6 mois des incidents de sécurité..."
                style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
                required
              />
            </div>
            <div style={fieldGroup}>
              <label style={labelStyle}>
                Problématique <span style={{ color: '#DC2626' }}>*</span>
                <span style={hintStyle}> — la question centrale du cas</span>
              </label>
              <textarea
                value={problematique} onChange={(e) => setProblematique(e.target.value)}
                rows={3}
                placeholder="Comment durcir le SI de cette PME en 2 semaines avec un budget limité ?"
                style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
                required
              />
            </div>
          </section>

          {/* ─── Ressources ─── */}
          <section style={cardStyle}>
            <h2 style={sectionTitle}>
              3. Ressources documentaires
              <span style={{ ...hintStyle, marginLeft: 8 }}>({resources.length}/5)</span>
            </h2>
            {resources.map((r, i) => (
              <div key={i} style={{
                display: 'flex', gap: 8, marginBottom: 8,
                padding: 12, border: '1px solid #E2E8F0', borderRadius: 8,
              }}>
                <select
                  value={r.type}
                  onChange={(e) => updateResource(i, { type: e.target.value })}
                  style={{ ...inputStyle, width: 140 }}
                >
                  {RESOURCE_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <input
                  type="text" placeholder="Titre" value={r.title}
                  onChange={(e) => updateResource(i, { title: e.target.value })}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <input
                  type="url" placeholder="URL" value={r.url}
                  onChange={(e) => updateResource(i, { url: e.target.value })}
                  style={{ ...inputStyle, flex: 2 }}
                />
                <button type="button" onClick={() => removeResource(i)} style={{
                  background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer',
                }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {resources.length < 5 && (
              <button type="button" onClick={addResource} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', background: '#F1F5F9', border: '1px dashed #94A3B8',
                borderRadius: 8, color: '#475569', cursor: 'pointer', fontSize: 14,
              }}>
                <Plus size={14} /> Ajouter une ressource
              </button>
            )}
          </section>

          {/* ─── Calendrier ─── */}
          <section style={cardStyle}>
            <h2 style={sectionTitle}><Calendar size={18} style={{ verticalAlign: 'middle' }} /> 4. Calendrier</h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ ...fieldGroup, flex: 1 }}>
                <label style={labelStyle}>Date séance Cadrage</label>
                <input
                  type="date" value={phaseCadrageDate}
                  onChange={(e) => setPhaseCadrageDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ ...fieldGroup, flex: 1 }}>
                <label style={labelStyle}>Date séance Bilan</label>
                <input
                  type="date" value={phaseBilanDate}
                  onChange={(e) => setPhaseBilanDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            {calendarError && (
              <div style={{ color: '#DC2626', fontSize: 13, marginTop: 8 }}>⚠ {calendarError}</div>
            )}
          </section>

          {/* ─── Groupe ─── */}
          <section style={cardStyle}>
            <h2 style={sectionTitle}>
              <Users size={18} style={{ verticalAlign: 'middle' }} /> 5. Composition du groupe
              <span style={{ ...hintStyle, marginLeft: 8 }}>(facultatif — peut se faire après création)</span>
            </h2>

            {eligibleStudents.length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: 14 }}>
                {courseId ? 'Aucun étudiant éligible pour ce module.' : 'Choisis un module pour voir les étudiants.'}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 12, fontSize: 13, color: '#64748B' }}>
                  {selectedStudents.length} étudiant(s) sélectionné(s) — clique pour cocher/décocher.
                </div>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 8, maxHeight: 280, overflowY: 'auto', padding: 4,
                  border: '1px solid #E2E8F0', borderRadius: 8,
                }}>
                  {eligibleStudents.map((s) => {
                    const member = selectedStudents.find((m) => m.studentId === s._id);
                    const checked = !!member;
                    return (
                      <div key={s._id} style={{
                        padding: 8, border: `1px solid ${checked ? 'var(--color-primary)' : '#E2E8F0'}`,
                        borderRadius: 6, background: checked ? '#EEF2FF' : 'white',
                      }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input
                            type="checkbox" checked={checked}
                            onChange={() => toggleStudent(s._id)}
                          />
                          <span style={{ fontSize: 13, fontWeight: 500 }}>
                            {s.prenom} {s.nom}
                          </span>
                        </label>
                        {checked && (
                          <select
                            value={member.role}
                            onChange={(e) => setMemberRole(s._id, e.target.value)}
                            style={{ marginTop: 6, width: '100%', padding: 4, fontSize: 12, borderRadius: 4 }}
                          >
                            {Object.entries(ROLE_META).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedStudents.length >= 3 && (
                  <div style={{ marginTop: 12 }}>
                    <button type="button" onClick={suggestAutoRotation} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', background: '#F0F9FF', border: '1px solid #0EA5E9',
                      borderRadius: 8, color: '#0369A1', cursor: 'pointer', fontSize: 14,
                    }}>
                      <Sparkles size={14} /> Suggérer une rotation auto
                    </button>
                    <div style={{ ...hintStyle, marginTop: 4 }}>
                      Le système attribue les rôles en fonction de l'historique des cas pratiques précédents.
                    </div>
                  </div>
                )}

                {selectedStudents.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedStudents.map((m) => {
                      const s = eligibleStudents.find((es) => es._id === m.studentId);
                      const meta = ROLE_META[m.role];
                      const Icon = meta.Icon;
                      return (
                        <span key={m.studentId} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', background: meta.color + '22',
                          color: meta.color, fontSize: 12, fontWeight: 500, borderRadius: 999,
                        }}>
                          <Icon size={12} /> {s?.prenom} {s?.nom} — {meta.label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>

          {error && (
            <div style={{
              padding: 12, background: '#FEE2E2', border: '1px solid #FCA5A5',
              borderRadius: 8, color: '#991B1B',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => navigate('/cas-pratiques')} style={{
              padding: '10px 20px', background: '#F1F5F9', border: 'none',
              borderRadius: 8, color: '#475569', cursor: 'pointer', fontWeight: 500,
            }}>
              Annuler
            </button>
            <button type="submit" disabled={submitting || !!calendarError} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', background: 'var(--color-primary)', border: 'none',
              borderRadius: 8, color: 'white', cursor: submitting ? 'wait' : 'pointer',
              fontWeight: 500, opacity: submitting || calendarError ? 0.6 : 1,
            }}>
              <Save size={16} /> {submitting ? 'Création…' : 'Créer le cas pratique'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

const cardStyle = {
  padding: '1.5rem',
  background: 'white',
  border: '1px solid #E2E8F0',
  borderRadius: 12,
};
const sectionTitle = {
  fontSize: '1.1rem',
  fontWeight: 600,
  marginBottom: '1rem',
  color: '#0F172A',
};
const fieldGroup = { marginBottom: '1rem' };
const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#475569',
  marginBottom: 6,
};
const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #CBD5E1',
  borderRadius: 6,
  fontSize: 14,
  background: 'white',
  outline: 'none',
};
const hintStyle = { fontSize: 12, color: '#94A3B8', fontWeight: 400 };
