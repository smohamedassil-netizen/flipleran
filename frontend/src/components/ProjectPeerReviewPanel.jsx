import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api.js';
import {
  Users, Star, Send, Loader, CheckCircle, AlertCircle, Award, Eye, EyeOff,
} from 'lucide-react';

/**
 * ProjectPeerReviewPanel — Panel de peer-review pour un projet (F9 sprint-final).
 *
 * Cadre théorique : Topping (1998), Falchikov (2005), Boud-Falchikov (2007).
 * La peer-review formative ciblée sur les livrables est un levier
 * d'apprentissage métacognitif puissant.
 *
 * Comportement adapté au rôle :
 *  - Étudiant : voit ses assignations (pending + done), peut soumettre.
 *  - Prof : peut activer la peer-review (auto-pairing 2 reviewers/livrable),
 *    voit la summary anonymisée par livrable.
 *
 * Props :
 *  - projectId
 *  - userRole : 'etudiant' | 'professeur' | 'admin'
 *  - livrables : (pour le prof) liste des livrables disponibles à peer-reviewer
 */

const CRITERIA_LABELS = {
  clarte:      { label: 'Clarté',     hint: 'Le livrable est-il facile à comprendre ?' },
  rigueur:     { label: 'Rigueur',    hint: 'La démarche est-elle argumentée et justifiée ?' },
  originalite: { label: 'Originalité', hint: 'Y a-t-il une vraie réflexion personnelle ?' },
  utilite:     { label: 'Utilité',    hint: 'Le travail est-il exploitable ou inspirant ?' },
};

/* ─── Form review étudiant (1 review à soumettre) ──────────────────────── */
function ReviewForm({ review, projectId, onSubmitted }) {
  const [scores, setScores] = useState(() => {
    const initial = {};
    Object.keys(CRITERIA_LABELS).forEach((k) => initial[k] = review.criteria?.find((c) => c.name === k)?.score ?? 3);
    return initial;
  });
  const [comment, setComment] = useState(review.comment || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      const criteriaArr = Object.entries(scores).map(([name, score]) => ({ name, score }));
      await api.post(`/projects/${projectId}/peer-reviews/${review._id}/submit`, {
        criteria: criteriaArr,
        comment: comment.trim(),
      });
      onSubmitted?.();
    } catch (e) {
      setErr(e.response?.data?.message || 'Erreur lors de l\'envoi.');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Tu reviewes :</span>
        <span style={{ padding: '2px 8px', background: '#0891b2', color: 'white', fontSize: 11, fontWeight: 700, borderRadius: 999 }}>
          {review.livrableTitre}
        </span>
        {review.livrableUrl && (
          <a href={review.livrableUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#0891b2', fontWeight: 600 }}>
            🔗 Ouvrir le livrable
          </a>
        )}
      </div>

      {/* 4 critères */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {Object.entries(CRITERIA_LABELS).map(([key, meta]) => (
          <div key={key} style={{ padding: 10, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div>
                <strong style={{ fontSize: 12.5, color: '#1e293b' }}>{meta.label}</strong>
                <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>{meta.hint}</div>
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setScores((s) => ({ ...s, [key]: n }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: n <= scores[key] ? '#f59e0b' : '#cbd5e1', padding: 0 }}
                    aria-label={`${n} étoiles ${meta.label}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Commentaire constructif (1 chose à garder, 1 chose à améliorer)…"
        rows={3}
        style={{ width: '100%', padding: 8, fontSize: 12.5, border: '1px solid #e2e8f0', borderRadius: 6, resize: 'vertical', fontFamily: 'inherit', marginBottom: 8 }}
      />

      {err && <div style={{ marginBottom: 8, fontSize: 11, color: '#dc2626' }}>{err}</div>}

      <button onClick={submit} disabled={busy} className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {busy ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={12} />} Envoyer la review
      </button>
      {review.isAnonymous && (
        <span style={{ marginLeft: 10, fontSize: 11, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <EyeOff size={11} /> Review anonyme — l'auteur ne saura pas que c'est toi
        </span>
      )}
    </div>
  );
}

/* ─── Vue étudiant : mes assignations ───────────────────────────────────── */
function StudentReviewsView({ projectId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/projects/${projectId}/peer-reviews/mine`);
      setReviews(data.reviews || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const pending  = reviews.filter((r) => r.status === 'assigned');
  const done     = reviews.filter((r) => r.status === 'submitted');

  if (loading) return <div style={{ padding: 14, fontSize: 13, color: '#64748b' }}>Chargement…</div>;

  if (reviews.length === 0) {
    return (
      <div style={{ padding: 16, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, color: '#0369a1', fontSize: 13 }}>
        Aucune peer-review assignée pour l'instant. Le prof n'a pas encore activé cette fonctionnalité.
      </div>
    );
  }

  return (
    <div>
      {pending.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={14} /> À faire ({pending.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pending.map((r) => (
              <ReviewForm key={r._id} review={r} projectId={projectId} onSubmitted={load} />
            ))}
          </div>
        </div>
      )}

      {done.length > 0 && (
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#059669', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={14} /> Terminées ({done.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {done.map((r) => (
              <div key={r._id} style={{ padding: 10, background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12.5, color: '#1e293b' }}>
                ✅ Review du livrable <strong>{r.livrableTitre}</strong> envoyée le {new Date(r.submittedAt).toLocaleDateString('fr-FR')}.
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Vue prof : assignation + summary ──────────────────────────────────── */
function ProfReviewsView({ projectId, livrables }) {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/projects/${projectId}/peer-reviews/summary`);
      setSummary(data.summary || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const assignAll = async () => {
    if (!confirm('Activer la peer-review pour TOUS les livrables actuels ? Chaque livrable recevra 2 reviewers étudiants.')) return;
    setAssigning(true);
    setAssignMsg('');
    try {
      const { data } = await api.post(`/projects/${projectId}/peer-reviews/assign`, { isAnonymous });
      setAssignMsg(`✅ ${data.assignedCount} reviews créées (${data.totalPairings} paires calculées).`);
      loadSummary();
    } catch (err) {
      setAssignMsg(`❌ ${err.response?.data?.message || 'Erreur'}`);
    } finally { setAssigning(false); }
  };

  return (
    <div>
      {/* Toolbar prof */}
      <div style={{ padding: 12, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={assignAll} disabled={assigning || !livrables?.length} className="btn btn-primary btn-sm">
            {assigning ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Award size={12} />}
            {' '}Activer la peer-review (auto-pairing)
          </button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#92400e', cursor: 'pointer' }}>
            <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
            {isAnonymous ? <EyeOff size={11} /> : <Eye size={11} />}
            Anonyme (recommandé — Topping 1998)
          </label>
        </div>
        {!livrables?.length && (
          <div style={{ marginTop: 6, fontSize: 11, color: '#92400e' }}>
            Aucun livrable à reviewer pour l'instant. Les étudiants doivent d'abord en déposer.
          </div>
        )}
        {assignMsg && <div style={{ marginTop: 8, fontSize: 12, color: '#1e293b' }}>{assignMsg}</div>}
      </div>

      {/* Summary par livrable */}
      {loading && <div style={{ padding: 14, fontSize: 13, color: '#64748b' }}>Chargement summary…</div>}
      {!loading && summary.length === 0 && (
        <div style={{ padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, color: '#64748b', fontSize: 13 }}>
          Aucune review soumise pour l'instant. Les reviews apparaîtront ici dès que les étudiants auront répondu.
        </div>
      )}
      {!loading && summary.map((s) => {
        const submittedCount = s.reviews.length;
        return (
          <div key={s.livrableId} style={{ padding: 12, background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong style={{ fontSize: 13, color: '#1e293b' }}>{s.livrableTitre}</strong>
              <span style={{ fontSize: 11, color: '#64748b' }}>{submittedCount} review{submittedCount !== 1 ? 's' : ''} reçue{submittedCount !== 1 ? 's' : ''}</span>
            </div>
            {submittedCount > 0 && (
              <>
                {/* Moyennes par critère */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                  {Object.entries(CRITERIA_LABELS).map(([k, m]) => (
                    <div key={k} style={{ fontSize: 11, color: '#64748b' }}>
                      <strong style={{ color: '#0891b2' }}>{m.label}</strong> : {s.averages[k] ? `${s.averages[k]}/5` : '—'}
                    </div>
                  ))}
                </div>
                {/* Commentaires */}
                {s.reviews.map((r, i) => (
                  <div key={i} style={{ padding: 8, background: '#f8fafc', borderRadius: 6, marginBottom: 4 }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                      <span style={{ fontWeight: 700 }}>{r.reviewerLabel}</span> — {new Date(r.submittedAt).toLocaleDateString('fr-FR')}
                    </div>
                    <div style={{ fontSize: 12.5, color: '#1e293b', lineHeight: 1.4 }}>{r.comment || <em style={{ color: '#94a3b8' }}>(pas de commentaire)</em>}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Composant principal ──────────────────────────────────────────────── */
export default function ProjectPeerReviewPanel({ projectId, userRole, livrables }) {
  const isStudent = userRole === 'etudiant';
  const isProfOrAdmin = userRole === 'professeur' || userRole === 'admin';

  return (
    <section className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={17} color="#7c3aed" />
          Peer Review
        </h3>
        <span style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
          Topping 1998, Falchikov 2005
        </span>
      </div>
      {isStudent && <StudentReviewsView projectId={projectId} />}
      {isProfOrAdmin && <ProfReviewsView projectId={projectId} livrables={livrables} />}
    </section>
  );
}
