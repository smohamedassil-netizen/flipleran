import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import PrositPhaseStepper from '../components/PrositPhaseStepper.jsx';
import PrositGroupCard from '../components/PrositGroupCard.jsx';
import {
  ArrowLeft, Lightbulb, Edit2, Trash2, ChevronRight, Calendar, Send,
  CheckCircle, Save, FileText, Hash, Sparkles, BookOpen, Trophy, AlertTriangle,
} from 'lucide-react';

const STATUS_META = {
  brouillon: { label: 'Brouillon',    color: '#94A3B8', bg: '#F1F5F9' },
  aller:     { label: 'Phase Aller',  color: '#1B4F72', bg: '#DBEAFE' },
  recherche: { label: 'Recherche',    color: '#9333EA', bg: '#F3E8FF' },
  retour:    { label: 'Phase Retour', color: '#D97706', bg: '#FEF3C7' },
  evalue:    { label: 'Évalué',       color: '#059669', bg: '#D1FAE5' },
  archive:   { label: 'Archivé',      color: '#64748B', bg: '#E2E8F0' },
};

const NEXT_PHASE_LABEL = {
  brouillon: 'Publier (→ Phase Aller)',
  aller:     'Clôturer Aller (→ Recherche)',
  recherche: 'Ouvrir Retour',
  retour:    'Marquer comme évalué',
  evalue:    'Archiver',
};

export default function PrositDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [user] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('fliplearn_user')); } catch { return null; }
  });
  const isProf = user?.role === 'professeur' || user?.role === 'admin';

  const [prosit, setProsit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transitioning, setTransitioning] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/prosits/${id}`)
      .then(({ data }) => setProsit(data))
      .catch((err) => setError(err.response?.data?.message || 'Erreur chargement Prosit'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const transitionPhase = async () => {
    if (!confirm('Confirmer la transition de phase ? Cette action peut verrouiller les modifications.')) return;
    try {
      setTransitioning(true);
      await api.post(`/prosits/${id}/transition`);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur transition');
    } finally {
      setTransitioning(false);
    }
  };

  const deleteProsit = async () => {
    if (!confirm('Supprimer définitivement ce Prosit ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/prosits/${id}`);
      navigate('/prosits');
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur suppression');
    }
  };

  if (loading) {
    return <Layout title="Prosit"><p style={{ color: '#94A3B8', textAlign: 'center', padding: 40 }}>Chargement…</p></Layout>;
  }

  if (error || !prosit) {
    return (
      <Layout title="Prosit">
        <div style={{ maxWidth: 700, margin: '40px auto', textAlign: 'center', padding: 30, background: 'white', borderRadius: 12, border: '1px solid #FECACA' }}>
          <AlertTriangle size={32} color="#DC2626" />
          <p style={{ color: '#DC2626', fontWeight: 600, marginTop: 8 }}>{error || 'Prosit introuvable'}</p>
          <button onClick={() => navigate('/prosits')} style={{ marginTop: 12, padding: '8px 16px', background: '#1B4F72', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Retour à la liste
          </button>
        </div>
      </Layout>
    );
  }

  const meta = STATUS_META[prosit.status] || STATUS_META.brouillon;
  const myGroupIndex = typeof prosit.myGroupIndex === 'number' ? prosit.myGroupIndex : -1;
  const myGroup = myGroupIndex >= 0 ? prosit.groupes[myGroupIndex] : null;
  const canTransition = isProf && prosit.status !== 'archive' && (prosit.status !== 'brouillon' || (prosit.groupes?.length > 0));

  return (
    <Layout title={prosit.titre}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <button onClick={() => navigate('/prosits')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
          <ArrowLeft size={18} /> Retour aux Prosits
        </button>

        {/* En-tête */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <Lightbulb size={26} color="#F59E0B" />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B4F72', margin: 0, flex: 1 }}>{prosit.titre}</h1>
            <span style={{ padding: '4px 12px', background: meta.bg, color: meta.color, fontSize: 11, fontWeight: 700, borderRadius: 999, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {meta.label}
            </span>
          </div>
          {prosit.description && <p style={{ color: '#64748B', margin: 0, fontSize: 14, lineHeight: 1.5 }}>{prosit.description}</p>}
        </div>

        {/* Stepper */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 18 }}>
          <PrositPhaseStepper status={prosit.status} />
        </div>

        {/* Actions prof */}
        {isProf && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {canTransition && NEXT_PHASE_LABEL[prosit.status] && (
              <button
                onClick={transitionPhase}
                disabled={transitioning}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '9px 16px', borderRadius: 8,
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: 'white', border: 'none', fontWeight: 700, fontSize: 13,
                  cursor: transitioning ? 'not-allowed' : 'pointer',
                  opacity: transitioning ? 0.7 : 1,
                }}
              >
                <ChevronRight size={14} /> {NEXT_PHASE_LABEL[prosit.status]}
              </button>
            )}
            {prosit.status === 'brouillon' && (
              <>
                <button
                  onClick={() => alert('Composition manuelle des groupes : à implémenter en V1.5 (UI dédiée).')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, background: 'white', color: '#475569', border: '1px solid #E5E7EB', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  <Edit2 size={13} /> Composer les groupes
                </button>
                <button
                  onClick={deleteProsit}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, background: 'white', color: '#DC2626', border: '1px solid #FECACA', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  <Trash2 size={13} /> Supprimer
                </button>
              </>
            )}
          </div>
        )}

        {/* Énoncé */}
        <section style={{ background: 'white', borderRadius: 12, padding: 18, border: '1px solid #E5E7EB', marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1B4F72', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={15} /> Énoncé
          </h2>
          <p style={{ fontSize: 14, color: '#1E293B', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
            {prosit.enonce}
          </p>
          {prosit.caseEntreprise && (
            <p style={{ fontSize: 12, color: '#64748B', margin: '10px 0 0', fontStyle: 'italic' }}>
              Cas d'entreprise : <strong>{prosit.caseEntreprise}</strong>
            </p>
          )}
          {(prosit.motsCles?.length > 0) && (
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Hash size={11} /> Mots-clés :
              </span>
              {prosit.motsCles.map((m, i) => (
                <span key={i} style={{ padding: '2px 8px', background: '#EBF3FA', color: '#1B4F72', fontSize: 11, fontWeight: 600, borderRadius: 999 }}>
                  {m}
                </span>
              ))}
            </div>
          )}
          {(prosit.objectifsApprentissage?.length > 0) && (
            <div style={{ marginTop: 14, padding: 12, background: '#FFFBEB', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={12} /> Objectifs d'apprentissage
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#78350F', lineHeight: 1.6 }}>
                {prosit.objectifsApprentissage.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </div>
          )}
        </section>

        {/* Calendrier + bilan */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 14, border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
              <Calendar size={11} style={{ display: 'inline', marginRight: 4 }} /> Calendrier
            </div>
            <div style={{ fontSize: 13, color: '#1E293B', lineHeight: 1.6 }}>
              <strong>Aller :</strong> {new Date(prosit.dateAller).toLocaleDateString('fr-FR')}<br/>
              <strong>Retour :</strong> {new Date(prosit.dateRetour).toLocaleDateString('fr-FR')}<br/>
              <span style={{ fontSize: 11, color: '#94A3B8' }}>Recherche : {prosit.dureeRechercheJours} jours</span>
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: 14, border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
              <BookOpen size={11} style={{ display: 'inline', marginRight: 4 }} /> Contexte
            </div>
            <div style={{ fontSize: 13, color: '#1E293B', lineHeight: 1.6 }}>
              <strong>{prosit.filiere} {prosit.promotion}</strong>
              {prosit.courseId && (typeof prosit.courseId === 'object' ? <><br/>{prosit.courseId.titre}</> : null)}
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: 14, border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
              <Trophy size={11} style={{ display: 'inline', marginRight: 4 }} /> XP par membre évalué
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#F59E0B' }}>+150 XP</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>attribué à la phase Évaluée</div>
          </div>
        </section>

        {/* Encart visibilité */}
        {!isProf && prosit.status !== 'evalue' && prosit.status !== 'archive' && (
          <div style={{ padding: 12, marginBottom: 14, background: '#EFF6FF', borderLeft: '3px solid #3B82F6', borderRadius: 6, fontSize: 12, color: '#1E40AF', lineHeight: 1.5 }}>
            ℹ️ Pendant les phases en cours, tu ne vois <strong>que ton groupe</strong>. Les travaux des autres groupes deviendront visibles une fois que le prof aura publié les évaluations.
          </div>
        )}

        {/* Groupes */}
        <section style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1B4F72', margin: '0 0 12px' }}>
            Groupe{(prosit.groupes?.length || 0) > 1 ? 's' : ''} ({prosit.groupes?.length || 0})
          </h2>
          {(prosit.groupes?.length || 0) === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', background: 'white', borderRadius: 12, border: '1px dashed #CBD5E1', color: '#94A3B8' }}>
              {isProf ? 'Aucun groupe formé. Composez les groupes avant de publier.' : 'Aucun groupe disponible.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {prosit.groupes.map((g, i) => (
                <PrositGroupCard
                  key={g._id || i}
                  groupe={g}
                  isMyGroup={myGroupIndex === i}
                >
                  {/* Espace collaboratif visible uniquement pour mon groupe ou prof */}
                  {(isProf || myGroupIndex === i) && (
                    <div style={{ fontSize: 11, color: '#64748B' }}>
                      {g.problematiqueReformulee ? (
                        <p style={{ margin: 0 }}><strong>Problématique :</strong> {g.problematiqueReformulee.slice(0, 80)}{g.problematiqueReformulee.length > 80 ? '…' : ''}</p>
                      ) : (
                        <p style={{ margin: 0, fontStyle: 'italic', color: '#94A3B8' }}>Espace collaboratif vide</p>
                      )}
                    </div>
                  )}
                </PrositGroupCard>
              ))}
            </div>
          )}
        </section>

        {/* Espace collaboratif détaillé pour mon groupe (étudiant) */}
        {!isProf && myGroup && ['aller', 'recherche', 'retour'].includes(prosit.status) && (
          <CollaborativeWorkspace prosit={prosit} groupe={myGroup} groupeIndex={myGroupIndex} userId={user?._id} onUpdated={load} />
        )}

        {/* Vue prof : évaluation par groupe en phase retour */}
        {isProf && prosit.status === 'retour' && (
          <ProfEvaluationPanel prosit={prosit} onUpdated={load} />
        )}

        {/* Grille d'évaluation visible */}
        {(prosit.grilleEvaluation?.length > 0) && (
          <section style={{ background: 'white', borderRadius: 12, padding: 18, border: '1px solid #E5E7EB', marginBottom: 18 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1B4F72', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trophy size={15} /> Grille d'évaluation
            </h2>
            <p style={{ fontSize: 11, color: '#64748B', margin: '0 0 10px', fontStyle: 'italic' }}>
              Évaluation par le professeur uniquement (V1). L'auto-évaluation et l'évaluation par les pairs sont des perspectives d'évolution.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {prosit.grilleEvaluation.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#F8FAFC', borderRadius: 6 }}>
                  <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 600, flex: 1 }}>{c.critere}</span>
                  {c.description && <span style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic', flex: 2 }}>{c.description}</span>}
                  <span style={{ padding: '2px 8px', background: '#EBF3FA', color: '#1B4F72', fontSize: 11, fontWeight: 700, borderRadius: 999 }}>
                    {c.poids} pts
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Espace collaboratif (étudiant — son groupe uniquement)
───────────────────────────────────────────────────────────────────────── */

function CollaborativeWorkspace({ prosit, groupe, groupeIndex, userId, onUpdated }) {
  const [motsClesText, setMotsClesText]                 = useState((groupe.motsClesIdentifies || []).join(', '));
  const [problematique, setProblematique]               = useState(groupe.problematiqueReformulee || '');
  const [hypothesesText, setHypothesesText]             = useState((groupe.hypotheses || []).join('\n'));
  const [planAction, setPlanAction]                     = useState(groupe.planAction || '');
  const [solutionTexte, setSolutionTexte]               = useState(groupe.solutionTexte || '');
  const [contributionTexte, setContributionTexte]       = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  const myMember = (groupe.membres || []).find(m => {
    const id = typeof m.userId === 'object' ? m.userId._id : m.userId;
    return id?.toString() === userId?.toString();
  });

  useEffect(() => {
    setContributionTexte(myMember?.contributionTexte || '');
  }, [myMember?.contributionTexte]);

  const saveWorkspace = async () => {
    try {
      setSaving(true);
      const payload = {
        motsClesIdentifies: motsClesText.split(',').map(s => s.trim()).filter(Boolean),
        problematiqueReformulee: problematique,
        hypotheses: hypothesesText.split('\n').map(s => s.trim()).filter(Boolean),
        planAction,
      };
      if (prosit.status === 'retour') payload.solutionTexte = solutionTexte;
      await api.put(`/prosits/${prosit._id}/groupes/${groupeIndex}`, payload);
      setSavedAt(new Date());
      onUpdated?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const submitContribution = async () => {
    try {
      setSaving(true);
      await api.post(`/prosits/${prosit._id}/groupes/${groupeIndex}/contribution`, { contributionTexte });
      setSavedAt(new Date());
      onUpdated?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur contribution');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8,
    fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
  };
  const labelStyle = { display: 'block', fontSize: 11, color: '#475569', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 };

  return (
    <section style={{ background: 'white', borderRadius: 12, padding: 18, border: '2px solid #F59E0B', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1B4F72', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Edit2 size={15} /> Espace collaboratif (mon groupe)
        </h2>
        {savedAt && (
          <span style={{ fontSize: 11, color: '#10B981', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle size={11} /> Sauvegardé à {savedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Phase Aller */}
      {prosit.status === 'aller' && (
        <>
          <label style={labelStyle}>Mots-clés identifiés (séparés par virgules)</label>
          <input value={motsClesText} onChange={(e) => setMotsClesText(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />

          <label style={labelStyle}>Problématique reformulée</label>
          <textarea value={problematique} onChange={(e) => setProblematique(e.target.value)} rows={2} style={{ ...inputStyle, marginBottom: 10, resize: 'vertical' }} />

          <label style={labelStyle}>Hypothèses (1 par ligne)</label>
          <textarea value={hypothesesText} onChange={(e) => setHypothesesText(e.target.value)} rows={3} style={{ ...inputStyle, marginBottom: 10, resize: 'vertical' }} />

          <label style={labelStyle}>Plan d'action</label>
          <textarea value={planAction} onChange={(e) => setPlanAction(e.target.value)} rows={3} style={{ ...inputStyle, marginBottom: 14, resize: 'vertical' }} />

          <button onClick={saveWorkspace} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#F59E0B', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            <Save size={13} /> {saving ? 'Sauvegarde…' : 'Sauvegarder l\'espace de travail'}
          </button>
        </>
      )}

      {/* Phase Recherche */}
      {prosit.status === 'recherche' && (
        <>
          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px', lineHeight: 1.5 }}>
            Phase de recherche autonome. Documente ta partie de la solution selon ton rôle ({myMember?.role || 'membre'}).
            L'espace collaboratif (mots-clés, hypothèses, plan d'action) est verrouillé.
          </p>
          <label style={labelStyle}>Ma contribution individuelle</label>
          <textarea
            value={contributionTexte}
            onChange={(e) => setContributionTexte(e.target.value)}
            rows={6}
            style={{ ...inputStyle, marginBottom: 14, resize: 'vertical' }}
            placeholder="Documente ta partie : ce que tu as recherché, les sources consultées, tes apprentissages…"
          />
          <button onClick={submitContribution} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#9333EA', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            <Send size={13} /> {saving ? 'Envoi…' : 'Soumettre ma contribution'}
          </button>
          {myMember?.contributionAt && (
            <p style={{ fontSize: 11, color: '#10B981', margin: '8px 0 0' }}>
              <CheckCircle size={11} style={{ display: 'inline', marginRight: 4 }} />
              Dernière contribution : {new Date(myMember.contributionAt).toLocaleString('fr-FR')}
            </p>
          )}
        </>
      )}

      {/* Phase Retour */}
      {prosit.status === 'retour' && (
        <>
          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px', lineHeight: 1.5 }}>
            Phase Retour. Présentation de la solution finale au tuteur (en classe).
          </p>
          <label style={labelStyle}>Solution finale du groupe</label>
          <textarea value={solutionTexte} onChange={(e) => setSolutionTexte(e.target.value)} rows={6} style={{ ...inputStyle, marginBottom: 14, resize: 'vertical' }} placeholder="Synthèse de la solution, conclusions, livrables…" />
          <button onClick={saveWorkspace} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#D97706', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            <Save size={13} /> {saving ? 'Sauvegarde…' : 'Sauvegarder la solution'}
          </button>
        </>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Panneau d'évaluation (prof — phase retour)
───────────────────────────────────────────────────────────────────────── */

function ProfEvaluationPanel({ prosit, onUpdated }) {
  const [editing, setEditing] = useState(null); // groupeIndex
  const [noteGlobale, setNoteGlobale] = useState(15);
  const [commentaire, setCommentaire] = useState('');
  const [saving, setSaving] = useState(false);

  const evaluate = async (gIdx) => {
    try {
      setSaving(true);
      await api.put(`/prosits/${prosit._id}/groupes/${gIdx}/evaluation`, {
        noteGlobale: Number(noteGlobale),
        commentaire,
      });
      setEditing(null);
      setCommentaire('');
      onUpdated?.();
      alert('Évaluation enregistrée. +150 XP attribués à chaque membre du groupe.');
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur évaluation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={{ background: 'white', borderRadius: 12, padding: 18, border: '2px solid #D97706', marginBottom: 18 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1B4F72', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Trophy size={15} /> Évaluation des groupes (phase Retour)
      </h2>
      <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 14px', lineHeight: 1.5 }}>
        En enregistrant une note, <strong>+150 XP sont attribués automatiquement à chaque membre du groupe</strong>,
        et la rotation obligatoire des rôles est mise à jour.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(prosit.groupes || []).map((g, i) => {
          const noted = g.evaluation?.noteGlobale != null;
          return (
            <div key={g._id || i} style={{ padding: 12, background: noted ? '#F0FDF4' : '#FEF3C7', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 13, color: '#1E293B' }}>{g.nom}</strong>
                {noted ? (
                  <span style={{ padding: '4px 12px', background: '#D1FAE5', color: '#065F46', fontSize: 12, fontWeight: 800, borderRadius: 999 }}>
                    {g.evaluation.noteGlobale}/20 ✓
                  </span>
                ) : (
                  <button
                    onClick={() => { setEditing(i); setNoteGlobale(15); setCommentaire(''); }}
                    style={{ padding: '6px 12px', background: '#D97706', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Évaluer
                  </button>
                )}
              </div>

              {editing === i && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #FDE68A' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Note globale (0-20)</label>
                  <input type="number" min={0} max={20} value={noteGlobale} onChange={(e) => setNoteGlobale(e.target.value)} style={{ width: 80, padding: '6px 10px', border: '1px solid #E5E7EB', borderRadius: 6, marginBottom: 10 }} />
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Commentaire</label>
                  <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} rows={3} style={{ width: '100%', padding: '6px 10px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 13, marginBottom: 10, resize: 'vertical', boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => evaluate(i)} disabled={saving} style={{ padding: '6px 12px', background: '#10B981', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                      {saving ? 'Envoi…' : 'Valider l\'évaluation'}
                    </button>
                    <button onClick={() => setEditing(null)} style={{ padding: '6px 12px', background: 'white', color: '#475569', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {noted && g.evaluation.commentaire && (
                <p style={{ fontSize: 12, color: '#475569', margin: '8px 0 0', fontStyle: 'italic' }}>
                  💬 {g.evaluation.commentaire}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
