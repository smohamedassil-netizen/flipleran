import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  ArrowLeft, FileText, Users, ClipboardCheck, BookOpen, Award,
  Mic, PenTool, User as UserIcon, Calendar, CheckCircle, Clock,
  Send, Plus, Trash2, Link as LinkIcon, Save, AlertCircle,
} from 'lucide-react';

const STATUT_META = {
  planifie:           { label: 'Planifié',          color: '#94A3B8', bg: '#F1F5F9' },
  cadrage_en_cours:   { label: 'Cadrage en cours',  color: '#1B4F72', bg: '#DBEAFE' },
  travail_individuel: { label: 'Travail individuel',color: '#9333EA', bg: '#F3E8FF' },
  bilan_en_cours:     { label: 'Bilan en cours',    color: '#D97706', bg: '#FEF3C7' },
  evalue:             { label: 'Évalué',            color: '#059669', bg: '#D1FAE5' },
};

const ROLE_META = {
  animateur: { label: 'Animateur', Icon: Mic,      color: '#9333EA' },
  scribe:    { label: 'Scribe',    Icon: PenTool,  color: '#10B981' },
  membre:    { label: 'Membre',    Icon: UserIcon, color: '#64748B' },
};

const RESOURCE_TYPES = {
  pdf:     { label: 'PDF',     Icon: FileText },
  link:    { label: 'Lien',    Icon: LinkIcon },
  article: { label: 'Article', Icon: BookOpen },
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getCurrentUser() {
  try { return JSON.parse(sessionStorage.getItem('fliplearn_user')); }
  catch { return null; }
}

export default function CasPratiqueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isProf = user?.role === 'professeur' || user?.role === 'admin';

  const [cp, setCp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('enonce');

  async function reload() {
    try {
      const { data } = await api.get(`/cas-pratiques/${id}`);
      setCp(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, [id]);

  // Mon rôle dans le groupe (étudiant uniquement)
  const myRole = useMemo(() => {
    if (!cp || isProf) return null;
    const me = (cp.groupMembers || []).find((m) =>
      String(m.studentId?._id || m.studentId) === user?._id
    );
    return me?.role || null;
  }, [cp, isProf, user]);

  // Mon livrable (étudiant)
  const myLivrable = useMemo(() => {
    if (!cp || isProf) return null;
    return (cp.livrables || []).find((l) =>
      String(l.studentId?._id || l.studentId) === user?._id
    ) || null;
  }, [cp, isProf, user]);

  // Mes notes (étudiant, après évaluation)
  const myNote = useMemo(() => {
    if (!cp || isProf) return null;
    return (cp.notes || []).find((n) =>
      String(n.studentId?._id || n.studentId) === user?._id
    ) || null;
  }, [cp, isProf, user]);

  if (loading) return <Layout><div style={{ padding: '2rem', textAlign: 'center' }}>Chargement…</div></Layout>;
  if (error || !cp) return <Layout><div style={{ padding: '2rem', color: '#DC2626' }}>{error || 'Cas pratique introuvable'}</div></Layout>;

  const statut = cp.statut || 'planifie';
  const statutMeta = STATUT_META[statut] || STATUT_META.planifie;

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
        <button onClick={() => navigate('/cas-pratiques')} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
          background: 'none', border: 'none', color: 'var(--color-primary)',
          cursor: 'pointer', marginBottom: '1rem',
        }}>
          <ArrowLeft size={16} /> Retour aux cas pratiques
        </button>

        {/* ─── Header ─── */}
        <div style={{
          padding: '1.5rem', background: 'white', border: '1px solid #E2E8F0',
          borderRadius: 12, marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 4 }}>{cp.titre}</h1>
              {cp.description && (
                <p style={{ color: '#64748B', marginBottom: 8 }}>{cp.description}</p>
              )}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: '#64748B' }}>
                {cp.courseId && <span><BookOpen size={14} style={{ verticalAlign: 'middle' }} /> {cp.courseId.titre}</span>}
                {cp.phaseCadrageDate && <span><Calendar size={14} style={{ verticalAlign: 'middle' }} /> Cadrage : {fmtDate(cp.phaseCadrageDate)}</span>}
                {cp.phaseBilanDate && <span><Calendar size={14} style={{ verticalAlign: 'middle' }} /> Bilan : {fmtDate(cp.phaseBilanDate)}</span>}
              </div>
            </div>
            <span style={{
              padding: '6px 14px', background: statutMeta.bg, color: statutMeta.color,
              borderRadius: 999, fontSize: 13, fontWeight: 600,
            }}>
              {statutMeta.label}
            </span>
          </div>

          {/* Bandeau étudiant : mon rôle + phase actuelle */}
          {!isProf && myRole && (
            <div style={{
              marginTop: '1rem', padding: '12px 16px', background: '#F0F9FF',
              borderLeft: `4px solid ${ROLE_META[myRole].color}`, borderRadius: 6,
            }}>
              <div style={{ fontSize: 14 }}>
                Tu es <strong style={{ color: ROLE_META[myRole].color }}>{ROLE_META[myRole].label}</strong> dans ce cas pratique.
              </div>
            </div>
          )}
        </div>

        {/* ─── Onglets prof / vue étudiant adaptive ─── */}
        {isProf ? (
          <ProfView cp={cp} reload={reload} activeTab={activeTab} setActiveTab={setActiveTab} />
        ) : (
          <StudentView cp={cp} reload={reload} myRole={myRole} myLivrable={myLivrable} myNote={myNote} userId={user?._id} />
        )}
      </div>
    </Layout>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   VUE PROF — onglets
   ═════════════════════════════════════════════════════════════════════ */

function ProfView({ cp, reload, activeTab, setActiveTab }) {
  const TABS = [
    { id: 'enonce',     label: 'Énoncé',      Icon: FileText },
    { id: 'cadrage',    label: 'Cadrage',     Icon: Users },
    { id: 'livrables',  label: 'Livrables',   Icon: ClipboardCheck },
    { id: 'bilan',      label: 'Bilan',       Icon: BookOpen },
    { id: 'evaluation', label: 'Évaluation',  Icon: Award },
  ];

  return (
    <>
      <div style={{
        display: 'flex', gap: 4, borderBottom: '1px solid #E2E8F0',
        marginBottom: '1.5rem', overflowX: 'auto',
      }}>
        {TABS.map((t) => {
          const Icon = t.Icon;
          const active = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 18px', background: 'none', border: 'none',
              borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: active ? 'var(--color-primary)' : '#64748B',
              cursor: 'pointer', fontSize: 14, fontWeight: active ? 600 : 500,
              whiteSpace: 'nowrap',
            }}>
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'enonce' && <ProfEnonceTab cp={cp} />}
      {activeTab === 'cadrage' && <ProfCadrageTab cp={cp} />}
      {activeTab === 'livrables' && <ProfLivrablesTab cp={cp} reload={reload} />}
      {activeTab === 'bilan' && <ProfBilanTab cp={cp} />}
      {activeTab === 'evaluation' && <ProfEvaluationTab cp={cp} reload={reload} />}
    </>
  );
}

function ProfEnonceTab({ cp }) {
  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Contexte</h3>
      <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#334155' }}>{cp.contexte || cp.enonce || '—'}</p>

      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '1.5rem 0 1rem' }}>Problématique</h3>
      <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#334155' }}>{cp.problematique || '—'}</p>

      {cp.resources && cp.resources.length > 0 && (
        <>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '1.5rem 0 1rem' }}>Ressources</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {cp.resources.map((r, i) => {
              const meta = RESOURCE_TYPES[r.type] || RESOURCE_TYPES.link;
              const Icon = meta.Icon;
              return (
                <li key={i} style={{
                  padding: '8px 12px', marginBottom: 6, background: '#F8FAFC',
                  border: '1px solid #E2E8F0', borderRadius: 6,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Icon size={16} color="#64748B" />
                  <a href={r.url} target="_blank" rel="noreferrer" style={{
                    color: 'var(--color-primary)', textDecoration: 'none', fontSize: 14,
                  }}>
                    {r.title || r.url}
                  </a>
                  {r.description && <span style={{ color: '#94A3B8', fontSize: 12 }}>— {r.description}</span>}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {cp.groupMembers && cp.groupMembers.length > 0 && (
        <>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '1.5rem 0 1rem' }}>Groupe ({cp.groupMembers.length})</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {cp.groupMembers.map((m, i) => {
              const meta = ROLE_META[m.role] || ROLE_META.membre;
              const Icon = meta.Icon;
              const s = m.studentId;
              return (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', background: meta.color + '22', color: meta.color,
                  fontSize: 12, fontWeight: 500, borderRadius: 999,
                }}>
                  <Icon size={12} /> {s?.prenom} {s?.nom} — {meta.label}
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ProfCadrageTab({ cp }) {
  const doc = cp.cadrageDocument || {};
  const empty = !doc.completedAt && !doc.problematiqueReformulee && !(doc.motsCles?.length);
  if (empty) return <div style={cardStyle}><p style={{ color: '#94A3B8' }}>Le scribe n'a pas encore rédigé le document de cadrage.</p></div>;
  return (
    <div style={cardStyle}>
      {doc.completedAt
        ? <div style={{ marginBottom: '1rem', color: '#059669', fontSize: 13 }}>
            <CheckCircle size={14} style={{ verticalAlign: 'middle' }} /> Soumis le {fmtDate(doc.completedAt)}
            {doc.valideParGroupe && ' — Validé par le groupe'}
          </div>
        : <div style={{ marginBottom: '1rem', color: '#D97706', fontSize: 13 }}>
            <Clock size={14} style={{ verticalAlign: 'middle' }} /> En cours de rédaction
          </div>
      }
      <h4 style={subtitleStyle}>Mots-clés</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1rem' }}>
        {(doc.motsCles || []).map((m, i) => (
          <span key={i} style={chipStyle}>{m}</span>
        ))}
        {!doc.motsCles?.length && <span style={{ color: '#94A3B8' }}>—</span>}
      </div>
      <h4 style={subtitleStyle}>Problématique reformulée</h4>
      <p style={{ marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>{doc.problematiqueReformulee || '—'}</p>
      <h4 style={subtitleStyle}>Plan d'action</h4>
      <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem' }}>
        {(doc.planAction || []).map((p, i) => <li key={i}>{p}</li>)}
        {!doc.planAction?.length && <li style={{ color: '#94A3B8', listStyle: 'none' }}>—</li>}
      </ul>
      <h4 style={subtitleStyle}>Questions ouvertes</h4>
      <ul style={{ paddingLeft: '1.2rem' }}>
        {(doc.questionsOuvertes || []).map((q, i) => <li key={i}>{q}</li>)}
        {!doc.questionsOuvertes?.length && <li style={{ color: '#94A3B8', listStyle: 'none' }}>—</li>}
      </ul>
    </div>
  );
}

function ProfLivrablesTab({ cp, reload }) {
  const total = cp.groupMembers?.length || 0;
  const submitted = cp.livrables?.length || 0;

  async function startBilan() {
    if (!confirm('Basculer vers la phase Bilan ? Les étudiants ne pourront plus modifier leurs livrables.')) return;
    try {
      await api.post(`/cas-pratiques/${cp._id}/phase-bilan`);
      await reload();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur bascule');
    }
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <strong>{submitted}/{total}</strong> étudiants ont soumis leur livrable
        </div>
        {cp.statut === 'travail_individuel' && (
          <button onClick={startBilan} style={primaryBtnStyle}>
            Démarrer la phase Bilan
          </button>
        )}
      </div>
      {(cp.livrables || []).length === 0 ? (
        <p style={{ color: '#94A3B8' }}>Aucun livrable soumis pour le moment.</p>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {cp.livrables.map((l, i) => {
            const s = l.studentId;
            return (
              <div key={i} style={{
                padding: 16, border: '1px solid #E2E8F0', borderRadius: 8, background: '#F8FAFC',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong>{s?.prenom} {s?.nom}</strong>
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    Soumis le {fmtDate(l.submittedAt)}
                  </span>
                </div>
                {l.contenu && (
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, marginBottom: 8 }}>{l.contenu}</p>
                )}
                {l.fichierUrl && (
                  <a href={l.fichierUrl} target="_blank" rel="noreferrer" style={{
                    fontSize: 13, color: 'var(--color-primary)', textDecoration: 'none',
                  }}>
                    📎 Télécharger le fichier
                  </a>
                )}
                {l.aiDetection && l.aiDetection.aiProbability > 50 && (
                  <div style={{
                    marginTop: 8, padding: '6px 10px', background: '#FEE2E2',
                    border: '1px solid #FCA5A5', borderRadius: 4, fontSize: 12, color: '#991B1B',
                  }}>
                    ⚠ Détection IA : {l.aiDetection.aiProbability}% de probabilité
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProfBilanTab({ cp }) {
  const doc = cp.bilanDocument || {};
  const empty = !doc.completedAt && !doc.syntheseSolutions;
  if (empty) return <div style={cardStyle}><p style={{ color: '#94A3B8' }}>Le scribe n'a pas encore rédigé le document de bilan.</p></div>;
  return (
    <div style={cardStyle}>
      {doc.completedAt && (
        <div style={{ marginBottom: '1rem', color: '#059669', fontSize: 13 }}>
          <CheckCircle size={14} style={{ verticalAlign: 'middle' }} /> Soumis le {fmtDate(doc.completedAt)}
        </div>
      )}
      <h4 style={subtitleStyle}>Synthèse des solutions</h4>
      <p style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>{doc.syntheseSolutions || '—'}</p>
      <h4 style={subtitleStyle}>Points accomplis ✓</h4>
      <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem' }}>
        {(doc.pointsAccomplis || []).map((p, i) => <li key={i}>{p}</li>)}
        {!doc.pointsAccomplis?.length && <li style={{ color: '#94A3B8', listStyle: 'none' }}>—</li>}
      </ul>
      <h4 style={subtitleStyle}>Points non accomplis ✗</h4>
      <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem' }}>
        {(doc.pointsNonAccomplis || []).map((p, i) => <li key={i}>{p}</li>)}
        {!doc.pointsNonAccomplis?.length && <li style={{ color: '#94A3B8', listStyle: 'none' }}>—</li>}
      </ul>
      <h4 style={subtitleStyle}>Apprentissages</h4>
      <ul style={{ paddingLeft: '1.2rem' }}>
        {(doc.apprentissages || []).map((a, i) => <li key={i}>{a}</li>)}
        {!doc.apprentissages?.length && <li style={{ color: '#94A3B8', listStyle: 'none' }}>—</li>}
      </ul>
    </div>
  );
}

function ProfEvaluationTab({ cp, reload }) {
  const [noteCollective, setNoteCollective] = useState(
    cp.notes?.[0]?.noteCollective ?? 14
  );
  const [evals, setEvals] = useState(() => {
    const map = new Map((cp.notes || []).map((n) => [String(n.studentId?._id || n.studentId), n]));
    return (cp.groupMembers || []).map((m) => {
      const sid = String(m.studentId?._id || m.studentId);
      const existing = map.get(sid);
      return {
        studentId: sid,
        prenom: m.studentId?.prenom,
        nom: m.studentId?.nom,
        role: m.role,
        noteIndividuelle: existing?.noteIndividuelle ?? 14,
        feedback: existing?.feedback ?? '',
      };
    });
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canEvaluate = cp.statut === 'bilan_en_cours' || cp.statut === 'evalue';

  async function submit() {
    setError('');
    setSubmitting(true);
    try {
      await api.post(`/cas-pratiques/${cp._id}/evaluate`, {
        noteCollective: Number(noteCollective),
        evaluations: evals.map((e) => ({
          studentId: e.studentId,
          noteIndividuelle: Number(e.noteIndividuelle),
          feedback: e.feedback,
        })),
      });
      await reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur évaluation');
    } finally {
      setSubmitting(false);
    }
  }

  if (!canEvaluate) {
    return <div style={cardStyle}><p style={{ color: '#94A3B8' }}>L'évaluation sera possible une fois le bilan rédigé.</p></div>;
  }

  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Évaluation des étudiants</h3>

      <div style={{ marginBottom: '1.5rem', padding: '12px 16px', background: '#F0F9FF', borderRadius: 8 }}>
        <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
          Note collective (sur les 2 documents) — appliquée à tout le groupe
        </label>
        <input
          type="number" min={0} max={20} step={0.5}
          value={noteCollective}
          onChange={(e) => setNoteCollective(e.target.value)}
          style={{ ...inputStyle, width: 100 }}
        />
        <span style={{ marginLeft: 8, color: '#64748B' }}>/ 20</span>
      </div>

      <h4 style={subtitleStyle}>Notes individuelles (sur les livrables)</h4>
      <div style={{ display: 'grid', gap: 12 }}>
        {evals.map((e, i) => (
          <div key={e.studentId} style={{
            padding: 12, border: '1px solid #E2E8F0', borderRadius: 8, background: '#F8FAFC',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>{e.prenom} {e.nom}</strong>
              <span style={{ fontSize: 12, color: ROLE_META[e.role]?.color }}>
                {ROLE_META[e.role]?.label}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input
                type="number" min={0} max={20} step={0.5}
                value={e.noteIndividuelle}
                onChange={(ev) => {
                  const v = ev.target.value;
                  setEvals((prev) => prev.map((x, idx) => idx === i ? { ...x, noteIndividuelle: v } : x));
                }}
                style={{ ...inputStyle, width: 80 }}
              />
              <span style={{ color: '#64748B' }}>/ 20</span>
            </div>
            <textarea
              placeholder="Feedback (facultatif)"
              value={e.feedback}
              onChange={(ev) => {
                const v = ev.target.value;
                setEvals((prev) => prev.map((x, idx) => idx === i ? { ...x, feedback: v } : x));
              }}
              rows={2}
              style={{ ...inputStyle, width: '100%', fontFamily: 'inherit' }}
            />
          </div>
        ))}
      </div>

      {error && <div style={{ color: '#DC2626', marginTop: '1rem' }}>{error}</div>}
      <button onClick={submit} disabled={submitting} style={{ ...primaryBtnStyle, marginTop: '1rem' }}>
        {submitting ? 'Enregistrement…' : (cp.statut === 'evalue' ? 'Modifier les notes' : 'Enregistrer les notes')}
      </button>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   VUE ÉTUDIANT — adaptive selon phase + rôle
   ═════════════════════════════════════════════════════════════════════ */

function StudentView({ cp, reload, myRole, myLivrable, myNote, userId }) {
  if (!myRole) {
    return <div style={cardStyle}>
      <p style={{ color: '#94A3B8' }}>
        Tu ne fais pas partie du groupe de ce cas pratique. Tu peux le consulter en lecture seule
        une fois qu'il sera évalué.
      </p>
    </div>;
  }

  const statut = cp.statut;

  return (
    <>
      {/* Énoncé toujours visible */}
      <ProfEnonceTab cp={cp} />

      {/* Phase Cadrage */}
      {(statut === 'planifie' || statut === 'cadrage_en_cours') && (
        myRole === 'scribe'
          ? <StudentScribeCadrage cp={cp} reload={reload} />
          : <StudentValidateCadrage cp={cp} reload={reload} userId={userId} />
      )}

      {/* Phase Travail individuel */}
      {statut === 'travail_individuel' && (
        <StudentLivrable cp={cp} reload={reload} myLivrable={myLivrable} />
      )}

      {/* Phase Bilan */}
      {statut === 'bilan_en_cours' && (
        myRole === 'scribe'
          ? <StudentScribeBilan cp={cp} reload={reload} />
          : <ReadOnlyBilanWithCadrage cp={cp} />
      )}

      {/* Phase Évalué */}
      {statut === 'evalue' && (
        <StudentEvaluatedView cp={cp} myNote={myNote} />
      )}
    </>
  );
}

function StudentScribeCadrage({ cp, reload }) {
  const initial = cp.cadrageDocument || {};
  const [motsClesText, setMotsClesText] = useState((initial.motsCles || []).join(', '));
  const [problematiqueReformulee, setProblematiqueReformulee] = useState(initial.problematiqueReformulee || '');
  const [planActionText, setPlanActionText] = useState((initial.planAction || []).join('\n'));
  const [questionsText, setQuestionsText] = useState((initial.questionsOuvertes || []).join('\n'));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submitted = !!initial.completedAt;

  async function save(submit) {
    setError(''); setSubmitting(true);
    try {
      await api.put(`/cas-pratiques/${cp._id}/cadrage`, {
        motsCles: motsClesText.split(',').map((s) => s.trim()).filter(Boolean),
        problematiqueReformulee,
        planAction: planActionText.split('\n').map((s) => s.trim()).filter(Boolean),
        questionsOuvertes: questionsText.split('\n').map((s) => s.trim()).filter(Boolean),
        submit,
      });
      await reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur enregistrement');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ ...cardStyle, marginTop: '1.5rem' }}>
      <div style={{
        marginBottom: '1rem', padding: '12px 16px', background: '#F3E8FF',
        borderLeft: '4px solid #9333EA', borderRadius: 6, fontSize: 14,
      }}>
        <strong>📝 C'est à toi de rédiger le document de cadrage.</strong>
        <div style={{ marginTop: 4, color: '#64748B' }}>
          Une fois soumis, les autres membres du groupe valideront pour passer à la phase Travail individuel.
        </div>
      </div>

      <h4 style={subtitleStyle}>Mots-clés (séparés par virgules)</h4>
      <input
        type="text" value={motsClesText} onChange={(e) => setMotsClesText(e.target.value)}
        placeholder="cybersécurité, OWASP, audit, durcissement"
        style={inputStyle}
        disabled={submitted}
      />

      <h4 style={subtitleStyle}>Problématique reformulée</h4>
      <textarea
        value={problematiqueReformulee} onChange={(e) => setProblematiqueReformulee(e.target.value)}
        rows={3}
        placeholder="Reformule la problématique avec tes mots…"
        style={{ ...inputStyle, fontFamily: 'inherit' }}
        disabled={submitted}
      />

      <h4 style={subtitleStyle}>Plan d'action (1 par ligne)</h4>
      <textarea
        value={planActionText} onChange={(e) => setPlanActionText(e.target.value)}
        rows={5}
        placeholder="Audit des vulnérabilités&#10;Mise en place d'un WAF&#10;Formation des équipes…"
        style={{ ...inputStyle, fontFamily: 'inherit' }}
        disabled={submitted}
      />

      <h4 style={subtitleStyle}>Questions ouvertes (1 par ligne)</h4>
      <textarea
        value={questionsText} onChange={(e) => setQuestionsText(e.target.value)}
        rows={3}
        placeholder="Sur quel budget peut-on compter ?&#10;Quelle est la maturité de l'équipe IT ?"
        style={{ ...inputStyle, fontFamily: 'inherit' }}
        disabled={submitted}
      />

      {error && <div style={{ color: '#DC2626', marginTop: '1rem' }}>{error}</div>}
      {submitted ? (
        <div style={{ marginTop: '1rem', color: '#059669', fontSize: 14 }}>
          <CheckCircle size={16} style={{ verticalAlign: 'middle' }} /> Document soumis. En attente de validation par les membres du groupe.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
          <button onClick={() => save(false)} disabled={submitting} style={secondaryBtnStyle}>
            <Save size={14} /> Enregistrer brouillon
          </button>
          <button onClick={() => save(true)} disabled={submitting} style={primaryBtnStyle}>
            <Send size={14} /> Soumettre au groupe pour validation
          </button>
        </div>
      )}
    </div>
  );
}

function StudentValidateCadrage({ cp, reload, userId }) {
  const doc = cp.cadrageDocument || {};
  const validated = (doc.validatedBy || []).some((id) => String(id?._id || id) === userId);
  const [submitting, setSubmitting] = useState(false);

  async function validate() {
    setSubmitting(true);
    try {
      await api.post(`/cas-pratiques/${cp._id}/cadrage/validate`);
      await reload();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur validation');
    } finally {
      setSubmitting(false);
    }
  }

  if (!doc.completedAt) {
    return <div style={{ ...cardStyle, marginTop: '1.5rem' }}>
      <p style={{ color: '#94A3B8' }}>
        En attente que le scribe soumette le document de cadrage.
      </p>
    </div>;
  }

  return (
    <>
      <ProfCadrageTab cp={cp} />
      <div style={{ ...cardStyle, marginTop: '1rem' }}>
        {validated ? (
          <div style={{ color: '#059669' }}>
            <CheckCircle size={16} style={{ verticalAlign: 'middle' }} /> Tu as déjà validé ce cadrage.
          </div>
        ) : (
          <button onClick={validate} disabled={submitting} style={primaryBtnStyle}>
            <CheckCircle size={14} /> Valider le document de cadrage
          </button>
        )}
      </div>
    </>
  );
}

function StudentLivrable({ cp, reload, myLivrable }) {
  const [contenu, setContenu] = useState(myLivrable?.contenu || '');
  const [fichierUrl, setFichierUrl] = useState(myLivrable?.fichierUrl || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError(''); setSubmitting(true);
    try {
      await api.post(`/cas-pratiques/${cp._id}/livrable`, { contenu, fichierUrl });
      await reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur soumission');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <ProfCadrageTab cp={cp} />
      <div style={{ ...cardStyle, marginTop: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
          Mon livrable individuel
          {cp.phaseBilanDate && (
            <span style={{ marginLeft: 8, fontSize: 13, color: '#64748B', fontWeight: 400 }}>
              — à soumettre avant le {fmtDate(cp.phaseBilanDate)}
            </span>
          )}
        </h3>

        {myLivrable && (
          <div style={{ marginBottom: '1rem', color: '#059669', fontSize: 13 }}>
            <CheckCircle size={14} style={{ verticalAlign: 'middle' }} /> Soumis le {fmtDate(myLivrable.submittedAt)}. Tu peux modifier jusqu'à la phase Bilan.
          </div>
        )}

        <textarea
          value={contenu} onChange={(e) => setContenu(e.target.value)}
          rows={8}
          placeholder="Rédige ta proposition individuelle pour résoudre la problématique…"
          style={{ ...inputStyle, fontFamily: 'inherit' }}
        />
        <input
          type="url" value={fichierUrl} onChange={(e) => setFichierUrl(e.target.value)}
          placeholder="URL du fichier PDF (facultatif)"
          style={{ ...inputStyle, marginTop: 8 }}
        />

        {error && <div style={{ color: '#DC2626', marginTop: '1rem' }}>{error}</div>}
        <button onClick={submit} disabled={submitting || (!contenu && !fichierUrl)} style={{ ...primaryBtnStyle, marginTop: '1rem' }}>
          <Send size={14} /> {myLivrable ? 'Mettre à jour' : 'Soumettre mon livrable'}
        </button>
      </div>
    </>
  );
}

function StudentScribeBilan({ cp, reload }) {
  const initial = cp.bilanDocument || {};
  const [synth, setSynth] = useState(initial.syntheseSolutions || '');
  const [accText, setAccText] = useState((initial.pointsAccomplis || []).join('\n'));
  const [nonAccText, setNonAccText] = useState((initial.pointsNonAccomplis || []).join('\n'));
  const [appText, setAppText] = useState((initial.apprentissages || []).join('\n'));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submitted = !!initial.completedAt;

  async function save(submit) {
    setError(''); setSubmitting(true);
    try {
      await api.put(`/cas-pratiques/${cp._id}/bilan`, {
        syntheseSolutions: synth,
        pointsAccomplis: accText.split('\n').map((s) => s.trim()).filter(Boolean),
        pointsNonAccomplis: nonAccText.split('\n').map((s) => s.trim()).filter(Boolean),
        apprentissages: appText.split('\n').map((s) => s.trim()).filter(Boolean),
        submit,
      });
      await reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur enregistrement');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ ...cardStyle, marginTop: '1.5rem' }}>
      <div style={{
        marginBottom: '1rem', padding: '12px 16px', background: '#FEF3C7',
        borderLeft: '4px solid #D97706', borderRadius: 6, fontSize: 14,
      }}>
        <strong>📋 C'est à toi de rédiger le document de bilan</strong>
        <div style={{ marginTop: 4, color: '#64748B' }}>
          Synthétise les livrables individuels du groupe.
        </div>
      </div>

      <h4 style={subtitleStyle}>Synthèse des solutions</h4>
      <textarea value={synth} onChange={(e) => setSynth(e.target.value)} rows={6}
        placeholder="Synthèse des propositions des membres…"
        style={{ ...inputStyle, fontFamily: 'inherit' }} disabled={submitted}
      />

      <h4 style={subtitleStyle}>Points accomplis ✓ (1 par ligne)</h4>
      <textarea value={accText} onChange={(e) => setAccText(e.target.value)} rows={4}
        style={{ ...inputStyle, fontFamily: 'inherit' }} disabled={submitted}
      />

      <h4 style={subtitleStyle}>Points non accomplis ✗ (1 par ligne)</h4>
      <textarea value={nonAccText} onChange={(e) => setNonAccText(e.target.value)} rows={3}
        style={{ ...inputStyle, fontFamily: 'inherit' }} disabled={submitted}
      />

      <h4 style={subtitleStyle}>Apprentissages (1 par ligne)</h4>
      <textarea value={appText} onChange={(e) => setAppText(e.target.value)} rows={3}
        style={{ ...inputStyle, fontFamily: 'inherit' }} disabled={submitted}
      />

      {error && <div style={{ color: '#DC2626', marginTop: '1rem' }}>{error}</div>}
      {submitted ? (
        <div style={{ marginTop: '1rem', color: '#059669', fontSize: 14 }}>
          <CheckCircle size={16} style={{ verticalAlign: 'middle' }} /> Bilan soumis. En attente d'évaluation par le prof.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
          <button onClick={() => save(false)} disabled={submitting} style={secondaryBtnStyle}>
            <Save size={14} /> Enregistrer brouillon
          </button>
          <button onClick={() => save(true)} disabled={submitting} style={primaryBtnStyle}>
            <Send size={14} /> Soumettre le bilan
          </button>
        </div>
      )}
    </div>
  );
}

function ReadOnlyBilanWithCadrage({ cp }) {
  return (
    <>
      <ProfCadrageTab cp={cp} />
      <div style={{ ...cardStyle, marginTop: '1rem' }}>
        <p style={{ color: '#94A3B8' }}>
          Le scribe est en train de rédiger le bilan. Tu pourras le consulter une fois soumis.
        </p>
      </div>
    </>
  );
}

function StudentEvaluatedView({ cp, myNote }) {
  return (
    <>
      <ProfCadrageTab cp={cp} />
      <ProfBilanTab cp={cp} />
      {myNote && (
        <div style={{ ...cardStyle, marginTop: '1rem', borderLeft: '4px solid #059669' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
            <Award size={18} style={{ verticalAlign: 'middle' }} /> Tes notes
          </h3>
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748B' }}>Note individuelle (livrable)</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0F172A' }}>{myNote.noteIndividuelle} / 20</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748B' }}>Note collective (documents)</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0F172A' }}>{myNote.noteCollective} / 20</div>
            </div>
          </div>
          {myNote.feedback && (
            <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 6 }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Feedback du prof :</div>
              <p style={{ whiteSpace: 'pre-wrap' }}>{myNote.feedback}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ─── styles partagés ─── */
const cardStyle = {
  padding: '1.5rem', background: 'white', border: '1px solid #E2E8F0',
  borderRadius: 12, marginBottom: '1.5rem',
};
const subtitleStyle = {
  fontSize: 13, fontWeight: 600, color: '#475569', textTransform: 'uppercase',
  letterSpacing: 0.5, marginTop: '1rem', marginBottom: 6,
};
const chipStyle = {
  padding: '4px 10px', background: '#EEF2FF', color: 'var(--color-primary)',
  fontSize: 12, fontWeight: 500, borderRadius: 999,
};
const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1',
  borderRadius: 6, fontSize: 14, background: 'white', outline: 'none',
};
const primaryBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', background: 'var(--color-primary)', border: 'none',
  borderRadius: 6, color: 'white', cursor: 'pointer', fontWeight: 500, fontSize: 14,
};
const secondaryBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', background: '#F1F5F9', border: '1px solid #CBD5E1',
  borderRadius: 6, color: '#475569', cursor: 'pointer', fontWeight: 500, fontSize: 14,
};
