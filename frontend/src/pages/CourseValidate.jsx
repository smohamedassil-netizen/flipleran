import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  Award, ArrowLeft, ArrowRight, CheckCircle2, Lock,
  GraduationCap, BookOpen, Sparkles, AlertCircle,
} from 'lucide-react';

/**
 * CourseValidate — page de validation finale d'un module par l'étudiant.
 *
 * Pédagogie : auto-évaluation métacognitive (Lebrun 2007 ; Tardif 1998).
 * L'étudiant réfléchit sur :
 *   1. Sa confiance perçue (échelle 1-5)
 *   2. Ce qu'il retient d'essentiel (texte libre)
 *   3. Ce qui reste flou (texte libre)
 *
 * À la soumission : badge attribué + points + module marqué validé.
 */
export default function CourseValidate() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse]         = useState(null);
  const [completion, setCompletion] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  // Form fields
  const [confidence, setConfidence] = useState(3);
  const [retained, setRetained]     = useState('');
  const [unclear, setUnclear]       = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get(`/courses/${courseId}`),
      api.get(`/courses/${courseId}/my-completion`),
    ])
      .then(([cr, mc]) => {
        if (cancelled) return;
        setCourse(cr.data);
        setCompletion(mc.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Impossible de charger les données.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [courseId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (retained.trim().length < 10) {
      setError('Décris en quelques phrases ce que tu retiens (minimum 10 caractères).');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post(`/courses/${courseId}/validate`, {
        confidence, retained: retained.trim(), unclear: unclear.trim(),
      });
      setCompletion(data);
    } catch (err) {
      setError(err.response?.data?.message || 'La validation a échoué.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Validation du module">
        <div style={{ textAlign: 'center', padding: 60, color: '#64748B' }}>Chargement…</div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout title="Validation du module">
        <div className="alert alert-error" style={{ margin: 24 }}>
          <AlertCircle size={16} /> {error || 'Cours introuvable.'}
        </div>
      </Layout>
    );
  }

  // ─── Cas 1 : déjà validé → écran "Compétence acquise" ─────────────────
  if (completion?.validated) {
    return (
      <Layout title="Module validé">
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
            border: '2px solid #BBF7D0',
            borderRadius: 16,
            padding: 32,
            textAlign: 'center',
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, #22C55E, #15803D)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
              boxShadow: '0 10px 30px rgba(21, 128, 61, 0.3)',
            }}>
              <Award size={42} color="white" />
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#15803D' }}>
              Compétence acquise !
            </h1>
            <p style={{ margin: '6px 0 16px', fontSize: 16, color: '#475569' }}>
              <strong>{course.titre}</strong>
            </p>
            <p style={{ margin: '0 auto 20px', fontSize: 14, color: '#64748B', maxWidth: 480, lineHeight: 1.6 }}>
              Tu as validé ce module via une auto-évaluation métacognitive le{' '}
              <strong>{new Date(completion.validatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
              Cette compétence apparaît désormais sur ton profil.
            </p>

            {/* Snapshot des conditions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
              <Stat label="Capsules vues"   value={`${completion.snapshot.videosWatched}/${completion.snapshot.videosTotal}`} />
              <Stat label="QCM réussis"   value={`${completion.snapshot.quizzesPassed}/${completion.snapshot.quizzesTotal}`} />
              <Stat label="Prosits faits" value={completion.snapshot.prositsCompleted} />
              <Stat label="Points gagnés" value={`+${completion.pointsAwarded}`} highlight />
            </div>

            {/* Auto-évaluation rappelée */}
            <div style={{ background: 'white', borderRadius: 10, padding: 16, textAlign: 'left', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: 0.5 }}>
                TON AUTO-ÉVALUATION
              </p>
              <p style={{ margin: '6px 0', fontSize: 13, color: '#475569' }}>
                <strong>Confiance :</strong> {completion.selfAssessment.confidence}/5
              </p>
              <p style={{ margin: '6px 0', fontSize: 13, color: '#475569' }}>
                <strong>Ce que tu retiens :</strong> {completion.selfAssessment.retained}
              </p>
              {completion.selfAssessment.unclear && (
                <p style={{ margin: '6px 0', fontSize: 13, color: '#475569' }}>
                  <strong>Ce qui reste flou :</strong> {completion.selfAssessment.unclear}
                </p>
              )}
            </div>

            <Link to={`/courses/${courseId}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #1B4F72, #2874A6)',
              color: 'white', textDecoration: 'none', borderRadius: 10,
              fontWeight: 700, fontSize: 14,
            }}>
              <ArrowLeft size={14} /> Retour au module
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // ─── Cas 2 : pas encore éligible → blocage avec explication ──────────
  if (!completion?.eligibleForValidation) {
    const s = completion?.snapshot || {};
    return (
      <Layout title="Validation du module">
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px' }}>
          <div style={{
            background: '#FEF3C7', border: '2px solid #FDE68A',
            borderRadius: 14, padding: 24, textAlign: 'center',
          }}>
            <Lock size={42} color="#D97706" style={{ marginBottom: 12 }} />
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#92400E' }}>
              Validation pas encore disponible
            </h2>
            <p style={{ margin: '8px 0 16px', fontSize: 14, color: '#78350F' }}>
              Pour valider <strong>{course.titre}</strong>, tu dois d'abord :
            </p>
            <ul style={{ textAlign: 'left', display: 'inline-block', margin: 0, paddingLeft: 20, fontSize: 14, color: '#78350F' }}>
              <li style={{ marginBottom: 4 }}>
                Regarder au moins 80% des capsules
                {' '}<strong>(actuellement {s.videosWatched}/{s.videosTotal})</strong>
              </li>
              <li style={{ marginBottom: 4 }}>
                Réussir au moins 80% des QCM (≥ 60/100)
                {' '}<strong>(actuellement {s.quizzesPassed}/{s.quizzesTotal})</strong>
              </li>
              <li>
                Terminer au moins 1 Prosit du module
                {' '}<strong>(actuellement {s.prositsCompleted})</strong>
              </li>
            </ul>
            <div style={{ marginTop: 20 }}>
              <Link to={`/courses/${courseId}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 20px',
                background: 'white', color: '#92400E',
                border: '1px solid #FDE68A', textDecoration: 'none',
                borderRadius: 10, fontWeight: 700, fontSize: 14,
              }}>
                <ArrowLeft size={14} /> Retour au module
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ─── Cas 3 : éligible → formulaire d'auto-évaluation ─────────────────
  const s = completion.snapshot || {};

  return (
    <Layout title="Validation du module">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>
        <Link to={`/courses/${courseId}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          color: '#64748B', textDecoration: 'none', fontSize: 13,
          marginBottom: 12,
        }}>
          <ArrowLeft size={14} /> Retour au module
        </Link>

        {/* En-tête */}
        <div style={{
          background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)',
          border: '1px solid #BAE6FD',
          borderRadius: 14, padding: 24, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <GraduationCap size={28} color="#1B4F72" />
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1B4F72' }}>
              Validation finale du module
            </h1>
          </div>
          <p style={{ margin: '0 0 4px', fontSize: 15, color: '#475569' }}>
            <strong>{course.titre}</strong>
          </p>
          <p style={{ margin: 0, fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
            Cette dernière étape consiste en une <strong>auto-évaluation métacognitive</strong> : prends quelques
            minutes pour réfléchir sur ce que tu as appris. Cet exercice transforme l'apprentissage de surface
            en compréhension profonde (Lebrun, 2007).
          </p>
        </div>

        {/* Snapshot des conditions remplies */}
        <div style={{
          background: 'white', border: '1px solid #E2E8F0', borderRadius: 12,
          padding: 16, marginBottom: 16,
        }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#15803D', letterSpacing: 0.5 }}>
            ✓ TES PRÉ-REQUIS SONT REMPLIS
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <Stat label="Capsules vues"   value={`${s.videosWatched}/${s.videosTotal}`} />
            <Stat label="QCM réussis"   value={`${s.quizzesPassed}/${s.quizzesTotal}`} />
            <Stat label="Prosits faits" value={s.prositsCompleted} />
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={{
          background: 'white', border: '1px solid #E2E8F0', borderRadius: 12,
          padding: 20,
        }}>
          {/* Q1 — Confiance */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              1. À quel point te sens-tu à l'aise avec ce module ?
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const active = confidence === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setConfidence(n)}
                    style={{
                      flex: 1, padding: '10px 8px',
                      border: `2px solid ${active ? '#1B4F72' : '#E2E8F0'}`,
                      background: active ? '#1B4F72' : 'white',
                      color: active ? 'white' : '#64748B',
                      borderRadius: 10, fontSize: 14, fontWeight: 700,
                      cursor: 'pointer', transition: 'all 150ms',
                      fontFamily: 'inherit',
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#94A3B8' }}>
              <span>Pas du tout à l'aise</span>
              <span>Maîtrise complète</span>
            </div>
          </div>

          {/* Q2 — Ce que tu retiens */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="retained" style={labelStyle}>
              2. Qu'est-ce que tu retiens d'essentiel de ce module ?
              <span style={{ color: '#DC2626', fontWeight: 400, fontSize: 12 }}> *</span>
            </label>
            <textarea
              id="retained"
              value={retained}
              onChange={(e) => setRetained(e.target.value)}
              placeholder="Ex : J'ai compris la différence entre RSA (asymétrique) et AES (symétrique), et pourquoi on combine les deux dans HTTPS…"
              rows={4}
              maxLength={1000}
              required
              style={textareaStyle}
            />
            <p style={hintStyle}>{retained.length}/1000 caractères — minimum 10</p>
          </div>

          {/* Q3 — Ce qui reste flou */}
          <div style={{ marginBottom: 24 }}>
            <label htmlFor="unclear" style={labelStyle}>
              3. Quels concepts te semblent encore flous ?
              <span style={{ color: '#94A3B8', fontWeight: 400, fontSize: 12 }}> (optionnel)</span>
            </label>
            <textarea
              id="unclear"
              value={unclear}
              onChange={(e) => setUnclear(e.target.value)}
              placeholder="Ex : La gestion des certificats X.509, les courbes elliptiques…"
              rows={3}
              maxLength={1000}
              style={textareaStyle}
            />
            <p style={hintStyle}>{unclear.length}/1000 caractères</p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16, fontSize: 13 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Link to={`/courses/${courseId}`} style={{
              padding: '10px 18px', borderRadius: 10,
              background: 'white', color: '#64748B',
              border: '1px solid #E2E8F0', textDecoration: 'none',
              fontSize: 14, fontWeight: 600,
            }}>
              Annuler
            </Link>
            <button
              type="submit"
              disabled={submitting || retained.trim().length < 10}
              style={{
                padding: '10px 22px', borderRadius: 10,
                background: (submitting || retained.trim().length < 10)
                  ? '#94A3B8'
                  : 'linear-gradient(135deg, #15803D, #16A34A)',
                color: 'white', border: 'none',
                fontSize: 14, fontWeight: 700,
                cursor: (submitting || retained.trim().length < 10) ? 'not-allowed' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              {submitting ? 'Validation…' : (
                <>
                  <Award size={15} /> Valider le module <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Note pédagogique */}
        <p style={{ marginTop: 16, fontSize: 11, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.5 }}>
          La métacognition (Lebrun 2007 ; Tardif 1998) est le levier le plus puissant pour transformer
          un apprentissage de surface en compréhension durable. Prends-toi au sérieux.
        </p>
      </div>
    </Layout>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────── */
function Stat({ label, value, highlight }) {
  return (
    <div style={{
      background: highlight ? '#FEF3C7' : '#F8FAFC',
      border: `1px solid ${highlight ? '#FDE68A' : '#E2E8F0'}`,
      borderRadius: 8, padding: '8px 12px', textAlign: 'center',
    }}>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: highlight ? '#B45309' : '#1B4F72' }}>
        {value}
      </p>
      <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>{label}</p>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 14,
  fontWeight: 700,
  color: '#1B4F72',
  marginBottom: 4,
};

const textareaStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  fontSize: 14,
  color: '#1E293B',
  fontFamily: 'inherit',
  lineHeight: 1.5,
  resize: 'vertical',
};

const hintStyle = {
  margin: '4px 0 0',
  fontSize: 11,
  color: '#94A3B8',
  textAlign: 'right',
};
