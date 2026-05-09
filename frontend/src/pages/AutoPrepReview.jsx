import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  Sparkles, ArrowLeft, AlertCircle, CheckCircle, Loader, Send,
} from 'lucide-react';
import {
  InVideoQuestionsSection,
  QCMSection,
  OutcomesSection,
  ProsiSuggestionSection,
  FlashcardsSection,
} from '../components/AutoPrepSections.jsx';

/**
 * AutoPrepReview — Page de revue & validation des résultats de l'agent
 * d'auto-préparation IA.
 *
 * Route : /professor/courses/:courseId/videos/:videoId/auto-prep
 *
 * Flow :
 * 1. Si paramètre ?jobId=... fourni : poll directement ce job.
 * 2. Sinon : appelle POST /auto-prep, récupère un nouveau jobId, poll.
 * 3. Pendant le polling (toutes les 3 s) : affiche un loader animé.
 * 4. Quand status === 'completed' : 5 sections collapsibles (toggle keep/reject).
 * 5. Footer sticky : bouton « Publier » qui appelle POST /:jobId/publish.
 *
 * Pédagogie : conformément à Lebrun (2007), l'IA propose et le prof
 * dispose. Aucune création en DB sans validation explicite via cette page.
 */

const POLL_INTERVAL = 3000;
const POLL_MAX_DURATION = 5 * 60 * 1000; // 5 minutes

export default function AutoPrepReview() {
  const { courseId, videoId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [jobId, setJobId] = useState(searchParams.get('jobId') || null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [publishing, setPublishing] = useState(false);

  // Selections (par défaut tout est gardé)
  const [selections, setSelections] = useState({
    inVideoQuestions: [],
    qcm: true,
    outcomes: [],
    prositSuggestion: true,
    flashcards: [],
  });

  const pollRef = useRef(null);
  const pollStartRef = useRef(null);

  /* ── Lancement initial : si pas de jobId, on en crée un ──────────── */
  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      if (jobId) {
        await pollJob(jobId);
        return;
      }
      try {
        const { data } = await api.post(`/courses/${courseId}/videos/${videoId}/auto-prep`);
        if (cancelled) return;
        setJobId(data.jobId);
        await pollJob(data.jobId);
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 412) {
          setError('Transcription non disponible. Lance d\'abord l\'analyse IA de la capsule et reviens dans 1-2 minutes.');
        } else if (err.response?.status === 429) {
          setError(err.response?.data?.message || 'Limite quotidienne atteinte (5/jour).');
        } else {
          setError(err.response?.data?.message || 'Erreur lors du lancement de l\'auto-préparation.');
        }
        setLoading(false);
      }
    };
    start();
    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, videoId]);

  /* ── Poll loop ───────────────────────────────────────────────────── */
  const pollJob = async (id) => {
    if (!pollStartRef.current) pollStartRef.current = Date.now();
    try {
      const { data } = await api.get(`/auto-prep-jobs/${id}`);
      setJob(data);
      if (data.status === 'completed' || data.status === 'failed') {
        setLoading(false);
        // Initialiser les sélections à partir des résultats
        const ivq = data.results.find((r) => r.task === 'inVideoQuestions')?.data || [];
        const outcomes = data.results.find((r) => r.task === 'outcomes')?.data || [];
        const flashcards = data.results.find((r) => r.task === 'flashcards')?.data || [];
        setSelections({
          inVideoQuestions: ivq.map(() => true),
          qcm: true,
          outcomes: outcomes.map(() => true),
          prositSuggestion: true,
          flashcards: flashcards.map(() => true),
        });
        return;
      }
      // Timeout sécurité
      if (Date.now() - pollStartRef.current > POLL_MAX_DURATION) {
        setError('Le job met trop de temps. Recharge la page pour voir l\'état actuel.');
        setLoading(false);
        return;
      }
      pollRef.current = setTimeout(() => pollJob(id), POLL_INTERVAL);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du suivi du job.');
      setLoading(false);
    }
  };

  /* ── Helpers selection ───────────────────────────────────────────── */
  const toggleAt = (key, idx, val) => {
    setSelections((prev) => {
      const arr = [...prev[key]];
      arr[idx] = val;
      return { ...prev, [key]: arr };
    });
  };
  const toggleAll = (key, val) => {
    setSelections((prev) => ({ ...prev, [key]: prev[key].map(() => val) }));
  };

  /* ── Compteur d'éléments à publier ───────────────────────────────── */
  const computeCount = () => {
    let n = 0;
    n += selections.inVideoQuestions.filter(Boolean).length;
    if (selections.qcm) n += 1;
    n += selections.outcomes.filter(Boolean).length;
    if (selections.prositSuggestion) n += 1;
    n += selections.flashcards.filter(Boolean).length;
    return n;
  };

  /* ── Publier ─────────────────────────────────────────────────────── */
  const handlePublish = async () => {
    if (!jobId || !job) return;
    setPublishing(true);
    setFeedback('');
    setError('');
    try {
      const { data } = await api.post(`/auto-prep-jobs/${jobId}/publish`, { selections });
      const c = data.created || {};
      const summary = [
        c.questions ? `${c.questions} question${c.questions > 1 ? 's' : ''} in-video` : null,
        c.qcm ? '1 QCM' : null,
        c.outcomes ? `${c.outcomes} outcome${c.outcomes > 1 ? 's' : ''} Bloom` : null,
        c.flashcards ? `${c.flashcards} flashcard${c.flashcards > 1 ? 's' : ''}` : null,
        c.prositDraft ? 'suggestion Prosit' : null,
      ].filter(Boolean).join(' · ');
      setFeedback(`✅ Publié : ${summary || 'rien'}.`);
      // Si Prosit suggéré accepté : redirige vers /prosits/new avec payload pré-rempli
      if (c.prositDraft && data.prositSuggestionPayload) {
        const payload = encodeURIComponent(JSON.stringify(data.prositSuggestionPayload));
        setTimeout(() => navigate(`/prosits/new?prefill=${payload}&courseId=${courseId}`), 1200);
      } else {
        setTimeout(() => navigate(`/courses/${courseId}`), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la publication.');
    } finally {
      setPublishing(false);
    }
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <Layout title="Auto-préparation IA">
        <div style={{ maxWidth: 700, margin: '40px auto', textAlign: 'center', padding: 40, background: 'white', borderRadius: 14, border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 70, height: 70, borderRadius: '50%', background: 'linear-gradient(135deg, #9333EA, #C084FC)', marginBottom: 16 }}>
            <Sparkles size={32} color="#fff" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1B4F72', margin: '0 0 8px' }}>
            ✨ Préparation IA en cours…
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
            5 agents IA travaillent en parallèle pour générer questions in-video, QCM, objectifs Bloom,
            suggestion Prosit et flashcards. Cela prend habituellement 30 secondes à 2 minutes.
          </p>
          <div style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9333EA', fontWeight: 600 }}>
            <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
            {job?.status === 'running' ? 'En cours…' : 'Initialisation…'}
          </div>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes pulse { 50% { transform: scale(1.1); } }
          `}</style>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Auto-préparation IA">
        <div style={{ maxWidth: 700, margin: '40px auto', padding: 24, background: '#FEE2E2', borderRadius: 12, border: '1px solid #FECACA' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <AlertCircle size={20} color="#DC2626" />
            <strong style={{ color: '#991B1B' }}>Erreur</strong>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#7F1D1D' }}>{error}</p>
          <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>
            <ArrowLeft size={14} /> Retour
          </button>
        </div>
      </Layout>
    );
  }

  if (!job) return null;

  const ivq      = job.results.find((r) => r.task === 'inVideoQuestions')?.data || [];
  const qcm      = job.results.find((r) => r.task === 'qcm')?.data || null;
  const outcomes = job.results.find((r) => r.task === 'outcomes')?.data || [];
  const prosit   = job.results.find((r) => r.task === 'prositSuggestion')?.data || null;
  const flashes  = job.results.find((r) => r.task === 'flashcards')?.data || [];

  const failed = job.results.filter((r) => r.status === 'failed');
  const totalCount = computeCount();

  return (
    <Layout title="Auto-préparation IA">
      <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 100 }}>
        <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
          <ArrowLeft size={18} /> Retour
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: 'linear-gradient(135deg, #9333EA, #C084FC)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={24} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1B4F72' }}>
              Préparation IA terminée
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748B' }}>
              Job {job._id?.toString().slice(-6)} · Durée {((job.durationMs || 0) / 1000).toFixed(1)}s ·{' '}
              ~{(job.tokensUsedEstimate || 0).toLocaleString()} tokens
            </p>
          </div>
        </div>

        {/* Erreurs partielles */}
        {failed.length > 0 && (
          <div style={{ padding: 12, marginBottom: 14, background: '#FFFBEB', borderLeft: '3px solid #D97706', borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#78350F' }}>
              <AlertCircle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              {failed.length} sous-tâche{failed.length > 1 ? 's' : ''} a échoué : {failed.map((f) => f.task).join(', ')}.
              Tu peux quand même publier ce qui a réussi.
            </p>
          </div>
        )}

        {feedback && (
          <div style={{ padding: 12, marginBottom: 14, background: '#DCFCE7', borderLeft: '3px solid #15803D', borderRadius: 8 }}>
            <CheckCircle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: '#15803D' }} />
            <span style={{ fontSize: 13, color: '#14532D' }}>{feedback}</span>
          </div>
        )}

        {/* Sections (toutes ouvertes par défaut) */}
        <InVideoQuestionsSection
          items={ivq}
          selections={selections.inVideoQuestions}
          onToggle={(i, v) => toggleAt('inVideoQuestions', i, v)}
        />
        <QCMSection
          qcm={qcm}
          kept={selections.qcm}
          onToggle={(v) => setSelections((p) => ({ ...p, qcm: v }))}
        />
        <OutcomesSection
          items={outcomes}
          selections={selections.outcomes}
          onToggle={(i, v) => toggleAt('outcomes', i, v)}
        />
        <ProsiSuggestionSection
          data={prosit}
          kept={selections.prositSuggestion}
          onToggle={(v) => setSelections((p) => ({ ...p, prositSuggestion: v }))}
        />
        <FlashcardsSection
          items={flashes}
          selections={selections.flashcards}
          onToggle={(i, v) => toggleAt('flashcards', i, v)}
          onToggleAll={(v) => toggleAll('flashcards', v)}
        />
      </div>

      {/* Footer sticky */}
      <div style={{
        position: 'fixed', bottom: 0, left: 'var(--sidebar-width, 0)', right: 0,
        background: 'white', borderTop: '1px solid #E5E7EB',
        padding: '12px 24px', boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, zIndex: 30,
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
            <strong style={{ color: '#1B4F72' }}>{totalCount}</strong> élément{totalCount > 1 ? 's' : ''} à créer
          </p>
        </div>
        <button
          type="button"
          onClick={handlePublish}
          disabled={publishing || totalCount === 0}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 10,
            background: publishing || totalCount === 0 ? '#94A3B8' : 'linear-gradient(135deg, #9333EA, #7E22CE)',
            color: 'white', border: 'none', fontWeight: 700, fontSize: 14,
            cursor: publishing || totalCount === 0 ? 'not-allowed' : 'pointer',
            boxShadow: publishing || totalCount === 0 ? 'none' : '0 2px 8px rgba(147,51,234,0.3)',
          }}
        >
          <Send size={15} /> {publishing ? 'Publication…' : 'Publier les éléments validés'}
        </button>
      </div>
    </Layout>
  );
}
