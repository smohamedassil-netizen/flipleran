import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import {
  Bot, Lightbulb, FileSearch, Library, MessageCircle,
  Loader, X, CheckCircle, AlertTriangle, AlertCircle,
  BookOpen, ScrollText, FileText,
} from 'lucide-react';

/**
 * CoachAIPanel — Encart latéral réutilisable "🤖 Coach IA" pour Prosit /
 * Projet (vue étudiant). Affiche le statut de blockage en temps réel + 4
 * actions IA (next steps / review / sources / parler au tuteur).
 *
 * Cadre théorique :
 *  - Vygotsky (1978) : le coach intervient dans la ZPD de l'étudiant.
 *  - Bandura (1977) : actions concrètes 30min pour restaurer l'auto-efficacité.
 *  - Mazur (1997) : méthode socratique, jamais de réponse directe.
 *
 * Props :
 *  - kind : 'prosit' | 'project'
 *  - id : id de l'entité (req.params.id côté API)
 *  - userPrenom : pour l'affichage personnalisé (optionnel)
 *  - prositContext : { titre } passé au tuteur en deeplink
 */
const SEVERITY_META = {
  none:   { label: 'Tout va bien', color: '#10b981', bg: '#ecfdf5', Icon: CheckCircle, hint: 'Tu es sur les bons rails. Continue !' },
  low:    { label: 'Petit signal',  color: '#f59e0b', bg: '#fffbeb', Icon: AlertTriangle, hint: 'Une zone à renforcer — tu peux faire encore mieux.' },
  medium: { label: 'Tu sembles bloqué', color: '#f97316', bg: '#fff7ed', Icon: AlertTriangle, hint: 'Le coach IA peut t\'aider à débloquer la situation.' },
  high:   { label: 'Besoin d\'aide',   color: '#dc2626', bg: '#fef2f2', Icon: AlertCircle, hint: 'Plusieurs symptômes détectés. Le coach a des suggestions concrètes.' },
};

const SYMPTOM_LABELS = {
  'no-contribution':     'Aucune contribution écrite',
  'short-contribution':  'Contribution trop courte (<50 mots)',
  'fear-blank-page':     'Page blanche depuis 24h+',
  'inactivity-48h':      'Pas de mise à jour depuis 48h',
  'phase-deadline-near': 'Phase qui se termine bientôt sans livrable',
};

/* ─── Modal générique ──────────────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, padding: 16,
      }}
    >
      <div style={{
        background: 'white', borderRadius: 14, padding: 24,
        width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bot size={18} color="#7c3aed" /> {title}
          </h3>
          <button onClick={onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Composant principal ──────────────────────────────────────────────── */
export default function CoachAIPanel({ kind, id, prositContext }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);     // { isBlocked, severity, symptoms, contextSummary }
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState('');

  const [activeAction, setActiveAction] = useState(null);  // 'suggest' | 'review' | 'sources' | null
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [actionError, setActionError] = useState('');

  const baseUrl = `/${kind}s/${id}/coach`;

  useEffect(() => {
    if (!kind || !id) return;
    setStatusLoading(true);
    api.get(`${baseUrl}/status`)
      .then((r) => setStatus(r.data))
      .catch((err) => setStatusError(err.response?.data?.message || 'Coach indisponible'))
      .finally(() => setStatusLoading(false));
  }, [kind, id, baseUrl]);

  const runAction = async (action) => {
    setActiveAction(action);
    setActionResult(null);
    setActionError('');
    setActionLoading(true);
    try {
      const url = `${baseUrl}/${action === 'sources' ? 'sources' : action}`;
      const { data } = action === 'sources'
        ? await api.get(url)
        : await api.post(url);
      setActionResult(data);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Erreur lors de la requête au coach.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSpeak = () => {
    // Deeplink vers le tuteur avec contexte pré-rempli (le tuteur lira
    // sessionStorage 'tutor.prefill' à son mount). Voir MyTutor.jsx.
    try {
      const prefill = prositContext?.titre
        ? `Aide-moi sur ${kind === 'prosit' ? 'mon Prosit' : 'mon Projet'} "${prositContext.titre}". Je bloque sur cette étape.`
        : `Aide-moi sur ${kind === 'prosit' ? 'mon Prosit' : 'mon Projet'}.`;
      sessionStorage.setItem('tutor.prefill', prefill);
    } catch { /* localStorage indispo */ }
    navigate('/my-tutor');
  };

  // En statut "Tout va bien" on inactive Review (pas de contribution longue souvent)
  const sev = status?.severity || 'none';
  const meta = SEVERITY_META[sev] || SEVERITY_META.none;
  const StatusIcon = meta.Icon;
  const wordsCount = status?.contextSummary?.wordsInContribution ?? null;
  const reviewDisabled = kind === 'project' || (wordsCount !== null && wordsCount < 50);

  return (
    <section
      style={{
        background: 'linear-gradient(135deg, #faf5ff 0%, #eff6ff 100%)',
        border: '1px solid #e9d5ff',
        borderRadius: 14,
        padding: '18px 20px',
        marginBottom: 18,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Bot size={20} color="white" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e1b4b' }}>
            🤖 Coach IA — anti-blocage
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
            Méthode socratique (Vygotsky · Bandura · Mazur). Jamais de réponse clé en main, juste les bonnes questions.
          </p>
        </div>
      </div>

      {/* Status badge */}
      {statusLoading && (
        <div style={{ padding: '10px 14px', background: 'white', borderRadius: 10, fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Diagnostic en cours…
        </div>
      )}

      {statusError && !statusLoading && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', borderRadius: 10, fontSize: 12, color: '#dc2626', border: '1px solid #fecaca' }}>
          {statusError}
        </div>
      )}

      {!statusLoading && !statusError && status && (
        <div
          style={{
            padding: '10px 14px',
            background: meta.bg,
            border: `1px solid ${meta.color}33`,
            borderRadius: 10,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}
        >
          <StatusIcon size={16} color={meta.color} style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.label}</div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{status.note || meta.hint}</div>
            {status.symptoms?.length > 0 && (
              <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 11, color: '#64748b' }}>
                {status.symptoms.map((s) => (
                  <li key={s}>{SYMPTOM_LABELS[s] || s}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* 4 actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 8, marginTop: 14 }}>
        <CoachActionButton
          icon={Lightbulb}
          label="Que faire maintenant ?"
          onClick={() => runAction('suggest')}
          color="#7c3aed"
        />
        <CoachActionButton
          icon={FileSearch}
          label="Relis ma contribution"
          onClick={() => runAction('review')}
          color="#0891b2"
          disabled={reviewDisabled}
          tooltip={reviewDisabled ? (kind === 'project' ? 'Disponible sur les Prosits uniquement' : 'Écris au moins 50 mots avant') : undefined}
        />
        <CoachActionButton
          icon={Library}
          label="Trouve-moi des sources"
          onClick={() => runAction('sources')}
          color="#059669"
        />
        <CoachActionButton
          icon={MessageCircle}
          label="Parle-moi"
          onClick={handleSpeak}
          color="#f59e0b"
        />
      </div>

      {/* Modals */}
      {activeAction && (
        <Modal
          title={
            activeAction === 'suggest' ? '💡 3 prochaines étapes pour débloquer' :
            activeAction === 'review'  ? '📝 Relecture de ta contribution' :
            activeAction === 'sources' ? '📚 3 sources fiables' : 'Coach IA'
          }
          onClose={() => { setActiveAction(null); setActionResult(null); setActionError(''); }}
        >
          {actionLoading && (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              <Loader size={20} style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginBottom: 8 }} />
              <div>Le coach réfléchit…</div>
            </div>
          )}

          {actionError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', borderRadius: 10, fontSize: 13, color: '#dc2626', border: '1px solid #fecaca' }}>
              {actionError}
            </div>
          )}

          {!actionLoading && !actionError && actionResult && (
            <CoachActionResult action={activeAction} result={actionResult} />
          )}
        </Modal>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </section>
  );
}

/* ─── Bouton d'action ──────────────────────────────────────────────────── */
function CoachActionButton({ icon: Icon, label, onClick, color, disabled, tooltip }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        gap: 6, padding: '11px 13px',
        background: disabled ? '#f1f5f9' : 'white',
        border: `1px solid ${disabled ? '#e2e8f0' : color + '40'}`,
        borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left', opacity: disabled ? 0.6 : 1,
        transition: 'border-color 120ms, transform 120ms',
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.borderColor = color)}
      onMouseLeave={(e) => !disabled && (e.currentTarget.style.borderColor = color + '40')}
    >
      <Icon size={16} color={disabled ? '#94a3b8' : color} />
      <span style={{ fontSize: 12, fontWeight: 600, color: disabled ? '#94a3b8' : '#1e293b', lineHeight: 1.3 }}>
        {label}
      </span>
    </button>
  );
}

/* ─── Affichage du résultat selon l'action ─────────────────────────────── */
function CoachActionResult({ action, result }) {
  // Soft errors retournés par le service (200 + flag)
  if (result.error === 'too-short') {
    return (
      <div style={{ padding: 14, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 13, color: '#92400e' }}>
        <strong>{result.message}</strong>
        <p style={{ margin: '6px 0 0', fontSize: 12 }}>Continue à écrire et reviens — le coach a besoin de matière pour t'aider !</p>
      </div>
    );
  }
  if (result.error === 'review-only-for-prosit') {
    return (
      <div style={{ padding: 14, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, fontSize: 13, color: '#0369a1' }}>
        {result.message}
      </div>
    );
  }

  if (action === 'suggest') {
    const steps = result.steps || [];
    if (!steps.length) return <p style={{ color: '#64748b', fontSize: 13 }}>Aucune suggestion générée.</p>;
    return (
      <ol style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 0, margin: 0, listStyle: 'none' }}>
        {steps.map((s, i) => (
          <li key={i} style={{ padding: 14, background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#7c3aed', color: 'white', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {i + 1}
              </span>
              <strong style={{ fontSize: 13, color: '#1e1b4b', flex: 1 }}>{s.action}</strong>
              <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>≈ {s.expectedTime} min</span>
            </div>
            {s.hint && (
              <div style={{ fontSize: 12, color: '#475569', fontStyle: 'italic', paddingLeft: 32 }}>
                💭 {s.hint}
              </div>
            )}
          </li>
        ))}
      </ol>
    );
  }

  if (action === 'review') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ReviewBlock label="✅ Force" text={result.force} bg="#ecfdf5" border="#bbf7d0" color="#059669" />
        <ReviewBlock label="🔍 Faiblesse" text={result.faiblesse} bg="#fffbeb" border="#fde68a" color="#92400e" />
        <ReviewBlock label="🚀 Amélioration concrète" text={result.amelioration} bg="#f0f9ff" border="#bae6fd" color="#0369a1" />
        {result.wordsCount && (
          <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>
            Contribution analysée : {result.wordsCount} mots
          </div>
        )}
      </div>
    );
  }

  if (action === 'sources') {
    const sources = result.sources || [];
    if (!sources.length) return <p style={{ color: '#64748b', fontSize: 13 }}>Aucune source proposée.</p>;
    const TYPE_ICON = { livre: BookOpen, article: ScrollText, documentation: FileText };
    const TYPE_LABEL = { livre: 'Livre', article: 'Article scientifique', documentation: 'Documentation officielle' };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sources.map((s, i) => {
          const Icon = TYPE_ICON[s.type] || FileText;
          return (
            <div key={i} style={{ padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Icon size={14} color="#059669" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {TYPE_LABEL[s.type] || s.type}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>{s.titre}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {s.auteur}{s.annee && <> · <em>{s.annee}</em></>}
              </div>
              {s.why && (
                <div style={{ fontSize: 12, color: '#475569', marginTop: 6, fontStyle: 'italic' }}>
                  → {s.why}
                </div>
              )}
            </div>
          );
        })}
        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, textAlign: 'center' }}>
          💡 Le coach évite les URLs (souvent inventées par l'IA). Recherche ces titres sur Google Scholar, ou demande à ton bibliothécaire.
        </p>
      </div>
    );
  }

  return null;
}

function ReviewBlock({ label, text, bg, border, color }) {
  return (
    <div style={{ padding: 12, background: bg, border: `1px solid ${border}`, borderRadius: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}
