import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, AlertTriangle, Loader2, Unlock, Lock,
  Lightbulb, Sparkles, FileText, Send, Save, X,
  PlayCircle, ExternalLink, Info,
} from 'lucide-react';
import api from '../utils/api.js';

/**
 * StudentPhaseCard — vue étudiant d'une phase de projet (refonte 2026-05).
 *
 * Reçoit la phase enrichie par projectMilestoneService.computePhaseStatus :
 *   { _id, titre, description, status, studentProgress, details:{ chapterChecks, casPratiqueChecks } }
 *
 * Cinq rendus visuels distincts selon `status` :
 *   validated   ✅  card verte, lecture seule + voir livrable
 *   submitted   ⚠️  card orange, en attente validation, lecture seule
 *   in-progress 🟡  card jaune, formulaire éditable + Soumettre
 *   unlocked    🔓  card bleue, formulaire OU bouton "Importer livrable" (+ "Repartir de zéro")
 *   locked      🔒  card grise, prérequis listés avec actions de rattrapage
 *
 * Brouillon : on persiste localement (localStorage) en attendant un futur
 * endpoint /draft (non-bloquant pour la soutenance).
 *
 * Props :
 *   - phase, projectId, index (0-based), onRefresh (callback re-fetch /my-phases)
 */

const STATUS_CONFIG = {
  validated: {
    bg: '#F0FDF4', border: '#86EFAC', accent: '#15803D',
    icon: CheckCircle2, emoji: '✅', label: 'Validée',
  },
  submitted: {
    bg: '#FFFBEB', border: '#FDE68A', accent: '#B45309',
    icon: AlertTriangle, emoji: '⚠️', label: 'Soumise',
  },
  'in-progress': {
    bg: '#FEFCE8', border: '#FACC15', accent: '#A16207',
    icon: Loader2, emoji: '🟡', label: 'En cours',
  },
  unlocked: {
    bg: '#EFF6FF', border: '#93C5FD', accent: '#1B4F72',
    icon: Unlock, emoji: '🔓', label: 'Débloquée',
  },
  locked: {
    bg: '#F8FAFC', border: '#CBD5E1', accent: '#64748B',
    icon: Lock, emoji: '🔒', label: 'Verrouillée',
  },
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Carte d'en-tête commune à tous les états.
 */
function PhaseHeader({ index, phase, cfg }) {
  const Icon = cfg.icon;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
      <span style={{
        padding: '3px 10px', borderRadius: 999,
        background: cfg.accent, color: '#fff',
        fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
      }}>
        ÉTAPE {index + 1}
      </span>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1E293B', flex: 1 }}>
        {phase.titre}
      </h3>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: cfg.accent, fontWeight: 600, fontSize: 12 }}>
        <Icon size={14} /> {cfg.emoji} {cfg.label}
      </span>
    </div>
  );
}

/**
 * Modal "Voir mon livrable" (lecture seule).
 */
function ViewLivrableModal({ phase, onClose }) {
  const sp = phase.studentProgress || {};
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.4)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: 580, maxHeight: '85vh', padding: 24, overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{phase.titre}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        {sp.submittedAt && (
          <p style={{ fontSize: 12, color: '#64748B', marginTop: 0, marginBottom: 14 }}>
            Soumis le {fmtDate(sp.submittedAt)}
            {sp.validatedAt && ` · Validé le ${fmtDate(sp.validatedAt)}`}
          </p>
        )}

        <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', margin: '0 0 6px' }}>
          Contenu du livrable
        </h4>
        <div style={{
          padding: 12, borderRadius: 8, background: '#F8FAFC',
          border: '1px solid #E2E8F0', fontSize: 13.5, color: '#1E293B',
          whiteSpace: 'pre-wrap', minHeight: 80,
        }}>
          {sp.submission || <em style={{ color: '#94A3B8' }}>Aucun contenu texte</em>}
        </div>

        {sp.fichierUrl && (
          <div style={{ marginTop: 12 }}>
            <a
              href={sp.fichierUrl}
              target="_blank" rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ color: '#1B4F72' }}
            >
              <FileText size={13} /> Ouvrir le fichier joint <ExternalLink size={12} />
            </a>
          </div>
        )}

        {sp.feedback && (
          <>
            <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', margin: '14px 0 6px' }}>
              Retour du professeur
            </h4>
            <div style={{
              padding: 12, borderRadius: 8, background: '#FFFBEB',
              border: '1px solid #FDE68A', fontSize: 13, color: '#78350F',
              whiteSpace: 'pre-wrap',
            }}>
              {sp.feedback}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Sous-bloc "Pourquoi cette phase est verrouillée" : liste des prérequis avec
 * actions de rattrapage. Affiché en état locked (et possiblement dans unlocked
 * pour rappeler ce qui a été acquis).
 */
function UnlockRequirements({ details, courseId, completed = false }) {
  const navigate = useNavigate();
  if (!details?.hasRules) {
    return null;
  }
  const { chapterChecks = [], casPratiqueChecks = [], requiresAllChapters, requiresAllCasPratiques } = details;
  const remainingChapters = chapterChecks.filter((c) => !c.done);
  const remainingCp = casPratiqueChecks.filter((c) => !c.done);

  return (
    <div style={{ marginTop: 8 }}>
      {chapterChecks.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#64748B', margin: '0 0 6px' }}>
            🧩 Chapitres requis {chapterChecks.length > 1 && (requiresAllChapters ? '(tous)' : '(au moins un)')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {chapterChecks.map((c) => (
              <div
                key={c.chapterId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8,
                  background: c.done ? '#F0FDF4' : '#FFFFFF',
                  border: `1px solid ${c.done ? '#BBF7D0' : '#E2E8F0'}`,
                  fontSize: 12.5,
                }}
              >
                {c.done
                  ? <CheckCircle2 size={14} color="#15803D" style={{ flexShrink: 0 }} />
                  : <Loader2 size={14} color="#94A3B8" style={{ flexShrink: 0 }} />
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: '#1E293B', fontWeight: 600 }}>{c.titre}</span>
                  {!c.done && (
                    <span style={{ marginLeft: 6, color: '#64748B' }}>
                      — {c.videoPercent}% capsules
                      {c.hasQcm && c.qcmTotal > 0 ? `, ${c.qcmPercent}% QCM` : ''}
                      {c.videoTotal > 0 && c.videoWatched < c.videoTotal && (
                        <> · il te manque {c.videoTotal - c.videoWatched} capsule{c.videoTotal - c.videoWatched > 1 ? 's' : ''}</>
                      )}
                    </span>
                  )}
                  {c.done && (
                    <span style={{ marginLeft: 6, color: '#15803D' }}>— terminé</span>
                  )}
                </div>
                {!c.done && courseId && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => navigate(`/courses/${courseId}#chapter-${c.chapterId}`)}
                    style={{ flexShrink: 0, fontSize: 11 }}
                    title="Reprendre le chapitre"
                  >
                    <PlayCircle size={12} /> Reprendre
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {casPratiqueChecks.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#64748B', margin: '0 0 6px' }}>
            💡 Études de cas requises {casPratiqueChecks.length > 1 && (requiresAllCasPratiques ? '(toutes)' : '(au moins une)')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {casPratiqueChecks.map((c) => (
              <div
                key={c.casPratiqueId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8,
                  background: c.done ? '#F0FDF4' : '#FFFFFF',
                  border: `1px solid ${c.done ? '#BBF7D0' : '#E2E8F0'}`,
                  fontSize: 12.5,
                }}
              >
                {c.done
                  ? <CheckCircle2 size={14} color="#15803D" style={{ flexShrink: 0 }} />
                  : <Loader2 size={14} color="#94A3B8" style={{ flexShrink: 0 }} />
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: '#1E293B', fontWeight: 600 }}>{c.titre}</span>
                  {c.done && c.noteIndividuelle != null && (
                    <span style={{ marginLeft: 6, color: '#15803D' }}>
                      — note {c.noteIndividuelle}/20
                    </span>
                  )}
                  {!c.done && (
                    <span style={{ marginLeft: 6, color: '#64748B' }}>
                      — {c.statut === 'evalue' ? 'évaluée mais pas pour toi' : `statut : ${c.statut || 'non démarré'}`}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate(`/cas-pratiques/${c.casPratiqueId}`)}
                  style={{ flexShrink: 0, fontSize: 11 }}
                >
                  <ExternalLink size={12} /> Voir
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Formulaire de saisie / soumission. Partagé entre 'unlocked' (vide) et 'in-progress'.
 */
function PhaseForm({ phase, projectId, onRefresh, initialContent = '', initialFichierUrl = null }) {
  const [content, setContent] = useState(initialContent);
  const [fichierUrl, setFichierUrl] = useState(initialFichierUrl || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(null);

  const draftKey = `fliplearn:phaseDraft:${projectId}:${phase._id}`;

  // Hydratation : si on a un brouillon local plus récent, on le propose
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft?.content && draft.content.length > content.length) {
        setContent(draft.content);
        setFichierUrl(draft.fichierUrl || '');
      }
    } catch { /* ignore */ }
  }, [draftKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveDraft = () => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ content, fichierUrl, ts: Date.now() }));
      setSavedAt(new Date());
      setTimeout(() => setSavedAt(null), 2000);
    } catch (e) {
      setError("Impossible de sauvegarder le brouillon localement.");
    }
  };

  const submit = async () => {
    setError('');
    if (!content.trim()) {
      setError('Le contenu du livrable ne peut pas être vide.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/projects/${projectId}/phases/${phase._id}/submit`, {
        submission: content.trim(),
        fichierUrl: fichierUrl || null,
      });
      try { localStorage.removeItem(draftKey); } catch {}
      onRefresh?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la soumission.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      {phase.livrableSpec?.consigne && (
        <div style={{
          padding: '10px 12px', marginBottom: 10,
          background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8,
          fontSize: 12.5, color: '#78350F', display: 'flex', gap: 8,
        }}>
          <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          <span><strong>Livrable attendu : </strong>{phase.livrableSpec.consigne}</span>
        </div>
      )}

      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
        Mon livrable
      </label>
      <textarea
        className="form-input"
        style={{ width: '100%', minHeight: 180, resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Décris ton livrable, colle ton plan, ton diagramme, ton rapport..."
        disabled={submitting}
      />

      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', margin: '10px 0 4px' }}>
        Fichier joint (URL — optionnel)
      </label>
      <input
        className="form-input"
        type="url"
        style={{ width: '100%', fontSize: 13 }}
        value={fichierUrl}
        onChange={(e) => setFichierUrl(e.target.value)}
        placeholder="https:// (lien Cloudinary, Drive, GitHub...)"
        disabled={submitting}
      />

      {error && (
        <div className="alert alert-error" style={{ marginTop: 10 }}>
          <AlertTriangle size={14} /> <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12, flexWrap: 'wrap' }}>
        {savedAt && (
          <span style={{ fontSize: 11, color: '#15803D', alignSelf: 'center', marginRight: 'auto' }}>
            ✓ Brouillon sauvegardé localement
          </span>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={saveDraft}
          disabled={submitting}
        >
          <Save size={14} /> Sauvegarder brouillon
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={submit}
          disabled={submitting}
        >
          <Send size={14} /> {submitting ? 'Envoi…' : 'Soumettre'}
        </button>
      </div>

      <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 8, fontStyle: 'italic' }}>
        ⚠️ Une fois soumis, tu ne pourras plus modifier sans demander au prof.
      </p>
    </div>
  );
}

export default function StudentPhaseCard({ phase, projectId, index, onRefresh, courseId }) {
  const status = phase.status || 'locked';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.locked;
  const sp = phase.studentProgress || {};
  const [showLivrable, setShowLivrable] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [chooseStartFromScratch, setChooseStartFromScratch] = useState(false);

  const hasImportOption = !!phase.sourceCasPratiqueId;
  const cpSource = (phase.details?.casPratiqueChecks || [])
    .find((c) => String(c.casPratiqueId) === String(phase.sourceCasPratiqueId));

  const importLivrable = async () => {
    setImporting(true);
    setImportError('');
    try {
      await api.post(`/projects/${projectId}/phases/${phase._id}/import-livrable`);
      onRefresh?.();
    } catch (err) {
      setImportError(err.response?.data?.message || "Impossible d'importer le livrable.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        opacity: status === 'locked' ? 0.85 : 1,
      }}
    >
      <PhaseHeader index={index} phase={phase} cfg={cfg} />

      {phase.description && status !== 'locked' && (
        <p style={{ margin: '0 0 10px', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
          {phase.description}
        </p>
      )}

      {/* ──────────── ÉTAT VALIDATED ──────────── */}
      {status === 'validated' && (
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: cfg.accent }}>
            Validée le <strong>{fmtDate(sp.validatedAt || sp.submittedAt)}</strong>
            {sp.feedback ? '' : ' — pas de retour écrit du prof.'}
          </p>
          {sp.feedback && (
            <div style={{
              padding: 10, borderRadius: 8, background: '#FFFBEB',
              border: '1px solid #FDE68A', fontSize: 13, color: '#78350F',
              marginBottom: 10, whiteSpace: 'pre-wrap',
            }}>
              <strong>Retour du prof :</strong> {sp.feedback}
            </div>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => setShowLivrable(true)}>
            <FileText size={13} /> Voir mon livrable
          </button>
        </div>
      )}

      {/* ──────────── ÉTAT SUBMITTED ──────────── */}
      {status === 'submitted' && (
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: cfg.accent }}>
            Soumis le <strong>{fmtDate(sp.submittedAt)}</strong> · en attente de validation du prof.
          </p>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowLivrable(true)}>
            <FileText size={13} /> Voir mon livrable
          </button>
        </div>
      )}

      {/* ──────────── ÉTAT IN-PROGRESS ──────────── */}
      {status === 'in-progress' && (
        <div>
          {sp.importedFromCasPratiqueId && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '8px 10px', marginBottom: 10,
              background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8,
              fontSize: 12.5, color: '#78350F',
            }}>
              <Lightbulb size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                <strong>Livrable importé</strong> depuis l'étude de cas
                {cpSource ? ` « ${cpSource.titre} »` : ''} — tu peux l'enrichir ci-dessous.
              </span>
            </div>
          )}
          <PhaseForm
            phase={phase}
            projectId={projectId}
            onRefresh={onRefresh}
            initialContent={sp.submission || ''}
            initialFichierUrl={sp.fichierUrl || null}
          />
        </div>
      )}

      {/* ──────────── ÉTAT UNLOCKED ──────────── */}
      {status === 'unlocked' && (
        <div>
          {/* Récap acquis */}
          {phase.details?.hasRules && (
            <div style={{
              padding: '8px 10px', marginBottom: 12,
              background: '#FFFFFF', border: '1px solid #BFDBFE', borderRadius: 8,
              fontSize: 12.5,
            }}>
              <p style={{ margin: 0, fontWeight: 700, color: '#1B4F72' }}>
                🔗 Concepts mobilisés
              </p>
              <UnlockRequirements details={phase.details} courseId={courseId} completed />
            </div>
          )}

          {hasImportOption && !chooseStartFromScratch && (
            <div style={{
              padding: 10, marginBottom: 12,
              background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8,
              fontSize: 13, color: '#78350F',
            }}>
              <p style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} />
                <strong>
                  Tu as déjà rendu un livrable sur ce sujet
                  {cpSource ? ` (« ${cpSource.titre} »)` : ''}.
                </strong>
              </p>
              <p style={{ margin: '0 0 10px', fontSize: 12.5 }}>
                Tu peux l'importer comme point de départ et l'enrichir, ou repartir d'une page vide.
              </p>
              {importError && (
                <div className="alert alert-error" style={{ marginBottom: 10 }}>
                  <AlertTriangle size={14} /> <span>{importError}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={importLivrable}
                  disabled={importing}
                >
                  <Sparkles size={13} /> {importing ? 'Import…' : 'Importer et enrichir'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setChooseStartFromScratch(true)}
                  disabled={importing}
                >
                  Repartir de zéro
                </button>
              </div>
            </div>
          )}

          {(!hasImportOption || chooseStartFromScratch) && (
            <PhaseForm
              phase={phase}
              projectId={projectId}
              onRefresh={onRefresh}
            />
          )}
        </div>
      )}

      {/* ──────────── ÉTAT LOCKED ──────────── */}
      {status === 'locked' && (
        <div>
          {phase.description && (
            <p style={{ margin: '0 0 10px', fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
              {phase.description}
            </p>
          )}
          <div style={{
            padding: '8px 10px', marginBottom: 6,
            background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8,
            fontSize: 12.5, color: '#1E293B',
          }}>
            <p style={{ margin: '0 0 6px', fontWeight: 700 }}>
              🔓 Pour débloquer cette étape :
            </p>
            <UnlockRequirements details={phase.details} courseId={courseId} />
            {!phase.details?.hasRules && (
              <p style={{ margin: 0, color: '#94A3B8', fontStyle: 'italic' }}>
                Cette étape n'est pas encore disponible. Le prof l'ouvrira à un moment du projet.
              </p>
            )}
          </div>
        </div>
      )}

      {showLivrable && (
        <ViewLivrableModal phase={phase} onClose={() => setShowLivrable(false)} />
      )}
    </div>
  );
}
