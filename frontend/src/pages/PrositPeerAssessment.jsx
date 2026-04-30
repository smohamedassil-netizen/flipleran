import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  ArrowLeft, Lightbulb, CheckCircle, Clock, Send, AlertTriangle,
  Star, Users, MessageCircle, EyeOff, Eye,
} from 'lucide-react';

/**
 * PrositPeerAssessment — Page d'auto-évaluation + évaluation des coéquipiers.
 *
 * Ouverte en phase Retour (et accessible jusqu'à la deadline configurée par
 * le prof — par défaut dateRetour + 3 jours). L'étudiant note ses pairs sur
 * 5 critères (1-5) et lui-même sur 3 critères, complétés par une réflexion
 * métacognitive.
 *
 * Ancrage théorique :
 *   - Falchikov, N. (2005). *Improving Assessment through Student
 *     Involvement*. RoutledgeFalmer. Démontre que la combinaison auto-éval
 *     + peer-éval améliore significativement la fiabilité de l'évaluation.
 *   - Topping, K. (1998). Peer Assessment Between Students. *Review of
 *     Educational Research*, 68(3), 249–276. Anonymat par défaut pour
 *     réduire le biais de complaisance.
 */

const SELF_CRITERIA = [
  { key: 'effort',        label: 'Effort fourni',  help: 'À quel point t\'es-tu investi(e) dans le travail ?' },
  { key: 'quality',       label: 'Qualité',        help: 'La rigueur et la profondeur de ce que tu as produit.' },
  { key: 'communication', label: 'Communication',  help: 'Ta capacité à partager tes idées avec le groupe.' },
];

const PEER_CRITERIA = [
  { key: 'participation',   label: 'Participation' },
  { key: 'contribution',    label: 'Contribution' },
  { key: 'teamSpirit',      label: 'Esprit d\'équipe' },
  { key: 'deadlineRespect', label: 'Respect des délais' },
  { key: 'listening',       label: 'Écoute' },
];

/* ─── Slider 1-5 (étoiles cliquables) ─────────────────────────────────────── */
function StarSlider({ value, onChange, disabled = false }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {stars.map((n) => {
        const active = value >= n;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            style={{
              background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
              padding: 2, lineHeight: 0,
              opacity: disabled ? 0.6 : 1,
            }}
            aria-label={`${n}/5`}
          >
            <Star size={22} color={active ? '#F59E0B' : '#E5E7EB'} fill={active ? '#F59E0B' : 'transparent'} />
          </button>
        );
      })}
      <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 6 }}>{value || '—'}/5</span>
    </div>
  );
}

/* ─── Bloc auto-évaluation ────────────────────────────────────────────────── */
function SelfAssessmentSection({ form, setForm, done, disabled }) {
  return (
    <section style={{
      background: 'white', borderRadius: 12, border: `2px solid ${done ? '#10B981' : '#F59E0B'}`,
      padding: 18, marginBottom: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1B4F72', margin: 0 }}>
          1. Auto-évaluation
        </h2>
        {done && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', background: '#D1FAE5', color: '#065F46', fontSize: 11, fontWeight: 700, borderRadius: 999 }}>
            <CheckCircle size={11} /> Soumise
          </span>
        )}
      </div>
      <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 14px', lineHeight: 1.5 }}>
        Évalue ton propre travail sur ce Prosit. Sois honnête : ce n'est pas une note, c'est un
        outil de réflexion métacognitive (Falchikov, 2005).
      </p>

      <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
        {SELF_CRITERIA.map((c) => (
          <div key={c.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ minWidth: 180 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{c.label}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>{c.help}</p>
            </div>
            <StarSlider
              value={form.criteria[c.key] || 0}
              onChange={(v) => setForm({ ...form, criteria: { ...form.criteria, [c.key]: v } })}
              disabled={disabled}
            />
          </div>
        ))}
      </div>

      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
        Qu'as-tu appris en travaillant sur ce Prosit ?
      </label>
      <textarea
        value={form.reflection}
        onChange={(e) => setForm({ ...form, reflection: e.target.value.slice(0, 1000) })}
        rows={3}
        disabled={disabled}
        placeholder="Une réflexion personnelle sur tes apprentissages, tes difficultés, ce que tu ferais différemment la prochaine fois…"
        style={{
          width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB',
          borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
          resize: 'vertical', opacity: disabled ? 0.6 : 1,
        }}
      />
      <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'right', margin: '4px 0 0' }}>
        {(form.reflection || '').length}/1000
      </p>
    </section>
  );
}

/* ─── Bloc évaluation d'un coéquipier ─────────────────────────────────────── */
function PeerCard({ teammate, form, setForm, disabled }) {
  const update = (patch) => setForm(teammate.userId, { ...form, ...patch });
  const updateCriterion = (key, v) => update({ criteria: { ...form.criteria, [key]: v } });

  const displayName = form.isAnonymous
    ? `Camarade ${teammate.role}`
    : `${teammate.prenom} ${teammate.nom}`;

  return (
    <div style={{
      background: 'white', borderRadius: 12, border: `2px solid ${teammate.evaluated ? '#10B981' : '#E5E7EB'}`,
      padding: 16, marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: '#EBF3FA',
          color: '#1B4F72', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          flexShrink: 0,
        }}>
          {form.isAnonymous ? '?' : (teammate.prenom?.[0] || '?')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1E293B' }}>{displayName}</p>
          <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>Rôle : {teammate.role}</p>
        </div>
        {teammate.evaluated && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', background: '#D1FAE5', color: '#065F46', fontSize: 11, fontWeight: 700, borderRadius: 999 }}>
            <CheckCircle size={11} /> Soumise
          </span>
        )}
        <button
          type="button"
          onClick={() => update({ isAnonymous: !form.isAnonymous })}
          disabled={disabled}
          title={form.isAnonymous ? 'Cliquer pour révéler ton identité (déconseillé)' : 'Cliquer pour rester anonyme (recommandé)'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', background: form.isAnonymous ? '#F1F5F9' : '#FEF3C7',
            color: form.isAnonymous ? '#475569' : '#92400E',
            border: 'none', borderRadius: 999, fontSize: 11, fontWeight: 600,
            cursor: disabled ? 'default' : 'pointer',
          }}
        >
          {form.isAnonymous ? <><EyeOff size={11} /> Anonyme</> : <><Eye size={11} /> Identifié</>}
        </button>
      </div>

      <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
        {PEER_CRITERIA.map((c) => (
          <div key={c.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#1E293B' }}>{c.label}</span>
            <StarSlider
              value={form.criteria[c.key] || 0}
              onChange={(v) => updateCriterion(c.key, v)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>

      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
        Commentaire (optionnel)
      </label>
      <textarea
        value={form.comment}
        onChange={(e) => update({ comment: e.target.value.slice(0, 500) })}
        rows={2}
        disabled={disabled}
        placeholder="Un retour constructif pour ton/ta camarade…"
        style={{
          width: '100%', padding: '6px 10px', border: '1px solid #E5E7EB',
          borderRadius: 8, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box',
          resize: 'vertical', opacity: disabled ? 0.6 : 1,
        }}
      />
      <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'right', margin: '4px 0 0' }}>
        {(form.comment || '').length}/500
      </p>
    </div>
  );
}

/* ─── Page principale ─────────────────────────────────────────────────────── */
export default function PrositPeerAssessment() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [status, setStatus]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const [selfForm, setSelfForm] = useState({
    criteria: { effort: 0, quality: 0, communication: 0 },
    reflection: '',
  });
  const [peerForms, setPeerForms] = useState({}); // userId → { criteria, comment, isAnonymous }

  /* ── Chargement ────────────────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/prosits/${id}/my-assessments-status`);
        setStatus(data);

        // Init formulaires peer pour chaque coéquipier non encore évalué
        const init = {};
        for (const t of (data.teammates || [])) {
          init[t.userId] = {
            criteria: PEER_CRITERIA.reduce((acc, c) => ({ ...acc, [c.key]: 0 }), {}),
            comment: '',
            isAnonymous: true,
          };
        }
        setPeerForms(init);
      } catch (err) {
        setError(err.response?.data?.message || 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const updatePeerForm = (userId, next) =>
    setPeerForms((prev) => ({ ...prev, [userId]: next }));

  /* ── Validation ────────────────────────────────────────────────────── */
  const isSelfValid = useMemo(() => {
    const c = selfForm.criteria;
    return [c.effort, c.quality, c.communication].every((v) => v >= 1 && v <= 5);
  }, [selfForm]);

  const isPeerFormValid = (form) => {
    if (!form?.criteria) return false;
    return PEER_CRITERIA.every((c) => form.criteria[c.key] >= 1 && form.criteria[c.key] <= 5);
  };

  /* ── Soumission ────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!status?.canSubmit) return;
    setSubmitting(true); setError(''); setFeedback('');

    try {
      const tasks = [];

      // Soumet l'auto-évaluation si remplie et pas encore soumise (ou réenvoie)
      if (isSelfValid) {
        tasks.push(
          api.post(`/prosits/${id}/groupes/${status.groupIndex}/self-assessment`, {
            criteria: selfForm.criteria,
            reflection: selfForm.reflection,
          })
        );
      }

      // Soumet chaque peer assessment qui a tous les critères remplis
      for (const teammate of status.teammates) {
        const form = peerForms[teammate.userId];
        if (!isPeerFormValid(form)) continue;
        tasks.push(
          api.post(`/prosits/${id}/groupes/${status.groupIndex}/peer-assessment`, {
            targetId: teammate.userId,
            criteria: form.criteria,
            comment: form.comment,
            isAnonymous: form.isAnonymous,
          })
        );
      }

      if (tasks.length === 0) {
        setError('Remplis au moins un formulaire avant de soumettre.');
        setSubmitting(false);
        return;
      }

      await Promise.all(tasks);
      setFeedback(`${tasks.length} évaluation${tasks.length > 1 ? 's' : ''} soumise${tasks.length > 1 ? 's' : ''}.`);

      // Recharger le statut pour rafraîchir les ✓
      const { data } = await api.get(`/prosits/${id}/my-assessments-status`);
      setStatus(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la soumission.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Render ────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <Layout title="Évaluation par les pairs">
        <p style={{ color: '#94A3B8', textAlign: 'center', padding: 40 }}>Chargement…</p>
      </Layout>
    );
  }

  if (!status?.enabled) {
    return (
      <Layout title="Évaluation par les pairs">
        <div style={{ maxWidth: 700, margin: '40px auto', textAlign: 'center', padding: 30, background: 'white', borderRadius: 12, border: '1px solid #E5E7EB' }}>
          <p style={{ color: '#475569' }}>L'évaluation par les pairs n'est pas activée pour ce Prosit.</p>
        </div>
      </Layout>
    );
  }

  if (!status?.inGroup) {
    return (
      <Layout title="Évaluation par les pairs">
        <div style={{ maxWidth: 700, margin: '40px auto', textAlign: 'center', padding: 30, background: 'white', borderRadius: 12, border: '1px solid #FECACA' }}>
          <AlertTriangle size={32} color="#DC2626" />
          <p style={{ color: '#DC2626', fontWeight: 600 }}>Tu n'es membre d'aucun groupe sur ce Prosit.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Évaluation par les pairs">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <button onClick={() => navigate(`/prosits/${id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
          <ArrowLeft size={18} /> Retour au Prosit
        </button>

        <div style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B4F72', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lightbulb size={26} color="#F59E0B" />
            Évaluation par les pairs
          </h1>
          <p style={{ color: '#64748B', margin: '6px 0 0', fontSize: 14, lineHeight: 1.5 }}>
            Note ton propre travail puis chacun de tes coéquipiers. Tes évaluations sont prises en
            compte à hauteur de <strong>30%</strong> dans la note finale individualisée
            (les 70% restants étant la note du groupe par le prof).
          </p>
        </div>

        {/* Deadline */}
        {status.deadlinePassed ? (
          <div style={{ padding: 14, marginBottom: 16, background: '#FEE2E2', borderLeft: '3px solid #DC2626', borderRadius: 8, color: '#991B1B' }}>
            <strong>⏰ Trop tard.</strong> La deadline d'évaluation par les pairs ({new Date(status.deadline).toLocaleString('fr-FR')}) est dépassée.
            Contacte ton prof pour qu'il prolonge la deadline si nécessaire.
          </div>
        ) : status.deadline && (
          <div style={{ padding: 12, marginBottom: 16, background: '#FFFBEB', borderLeft: '3px solid #D97706', borderRadius: 8, color: '#78350F', fontSize: 13 }}>
            <Clock size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            <strong>Deadline :</strong> {new Date(status.deadline).toLocaleString('fr-FR')}
          </div>
        )}

        {/* Progression */}
        <div style={{ padding: 12, marginBottom: 16, background: 'white', borderRadius: 10, border: '1px solid #E5E7EB' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: '#64748B', marginBottom: 8 }}>
            <Users size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Progression
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              {status.selfDone ? <CheckCircle size={14} color="#10B981" /> : <Clock size={14} color="#94A3B8" />}
              Auto-évaluation
            </span>
            {status.teammates.map((t) => (
              <span key={t.userId} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                {t.evaluated ? <CheckCircle size={14} color="#10B981" /> : <Clock size={14} color="#94A3B8" />}
                Camarade {t.role}
              </span>
            ))}
          </div>
        </div>

        {/* Feedback / erreurs */}
        {feedback && (
          <div style={{ padding: 12, marginBottom: 14, background: '#D1FAE5', borderLeft: '3px solid #10B981', borderRadius: 8, color: '#065F46', fontSize: 13 }}>
            <CheckCircle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            {feedback}
          </div>
        )}
        {error && (
          <div style={{ padding: 12, marginBottom: 14, background: '#FEE2E2', borderLeft: '3px solid #DC2626', borderRadius: 8, color: '#991B1B', fontSize: 13 }}>
            <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            {error}
          </div>
        )}

        {/* Section 1 : Auto-évaluation */}
        <SelfAssessmentSection
          form={selfForm}
          setForm={setSelfForm}
          done={status.selfDone}
          disabled={status.deadlinePassed}
        />

        {/* Section 2 : coéquipiers */}
        <section style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1B4F72', margin: '0 0 12px' }}>
            2. Mes coéquipiers ({status.teammates.length})
          </h2>
          {status.teammates.length === 0 ? (
            <p style={{ fontSize: 13, fontStyle: 'italic', color: '#94A3B8' }}>
              Tu es seul(e) dans ton groupe — pas de peer assessment à faire.
            </p>
          ) : (
            status.teammates.map((t) => (
              <PeerCard
                key={t.userId}
                teammate={t}
                form={peerForms[t.userId] || { criteria: {}, comment: '', isAnonymous: true }}
                setForm={updatePeerForm}
                disabled={status.deadlinePassed}
              />
            ))
          )}
        </section>

        {/* Bouton soumission */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
          <button
            onClick={handleSubmit}
            disabled={submitting || status.deadlinePassed || !status.canSubmit}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 10,
              background: status.deadlinePassed ? '#94A3B8' : 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: 'white', border: 'none', fontWeight: 700, fontSize: 14,
              cursor: submitting || status.deadlinePassed ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            <Send size={15} /> {submitting ? 'Envoi…' : 'Soumettre mes évaluations'}
          </button>
        </div>

        {/* Citations académiques */}
        <div style={{
          padding: 16, marginTop: 24,
          background: '#F8FAFC', borderRadius: 10,
          fontSize: 12, color: '#64748B', fontStyle: 'italic', lineHeight: 1.6,
          borderLeft: '3px solid #1B4F72',
        }}>
          <p style={{ margin: 0 }}>
            <MessageCircle size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            « L'évaluation par les pairs, lorsqu'elle est conduite avec rigueur, augmente
            sensiblement la fiabilité de l'évaluation collaborative et constitue un puissant levier
            d'apprentissage métacognitif. »
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 11 }}>
            — Falchikov, N. (2005). <em>Improving Assessment through Student Involvement</em>.
            RoutledgeFalmer.<br />
            — Topping, K. (1998). Peer Assessment Between Students in Colleges and Universities.
            <em> Review of Educational Research</em>, 68(3), 249–276.
          </p>
        </div>
      </div>
    </Layout>
  );
}
