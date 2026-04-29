import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api.js';
import {
  Sparkles, Brain, BookOpen, Network, Loader2,
  ChevronDown, ChevronRight, RefreshCw, AlertCircle,
  FileText, Lightbulb, RotateCcw,
} from 'lucide-react';

/* ─── Carte mentale récursive ────────────────────────────────────────────── */
function MindMapNode({ node, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  const colors = [
    'var(--color-primary)',
    '#8b5cf6',
    '#f59e0b',
    '#10b981',
    '#ef4444',
    '#3b82f6)',
  ];
  const color = colors[depth % colors.length];

  return (
    <div style={{ marginLeft: depth > 0 ? 20 : 0 }}>
      <button
        onClick={() => hasChildren && setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          margin: '3px 0',
          borderRadius: 'var(--radius-md)',
          border: `1.5px solid ${depth === 0 ? color : 'var(--color-border)'}`,
          backgroundColor: depth === 0 ? color : 'var(--color-surface)',
          color: depth === 0 ? '#fff' : 'var(--color-text)',
          cursor: hasChildren ? 'pointer' : 'default',
          fontWeight: depth === 0 ? 700 : depth === 1 ? 600 : 400,
          fontSize: depth === 0 ? 'var(--font-size-base)' : 'var(--font-size-sm)',
          textAlign: 'left',
          transition: 'all 150ms',
          width: 'fit-content',
          maxWidth: '100%',
        }}
      >
        {hasChildren && (
          open
            ? <ChevronDown size={14} style={{ flexShrink: 0 }} />
            : <ChevronRight size={14} style={{ flexShrink: 0 }} />
        )}
        {!hasChildren && depth > 0 && (
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            backgroundColor: color, flexShrink: 0,
          }} />
        )}
        <span>{node.label}</span>
      </button>

      {open && hasChildren && (
        <div style={{ borderLeft: `2px solid ${color}20`, marginLeft: 12, paddingLeft: 4 }}>
          {node.children.map((child, i) => (
            <MindMapNode key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Status badge ───────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    pending:      { label: 'En attente',     color: '#94a3b8', bg: '#f1f5f9' },
    transcribing: { label: 'Transcription...', color: '#f59e0b', bg: '#fef3c7' },
    analyzing:    { label: 'Analyse GPT-4o...', color: '#8b5cf6', bg: '#ede9fe' },
    completed:    { label: 'Terminé',         color: '#10b981', bg: '#d1fae5' },
    error:        { label: 'Erreur',           color: '#ef4444', bg: '#fee2e2' },
  };
  const s = map[status] || map.pending;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '3px 10px',
      borderRadius: 'var(--radius-full, 9999px)',
      backgroundColor: s.bg,
      color: s.color,
      fontSize: 'var(--font-size-xs)',
      fontWeight: 600,
    }}>
      {(status === 'transcribing' || status === 'analyzing') && (
        <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
      )}
      {s.label}
    </span>
  );
}

/* ─── Composant principal ────────────────────────────────────────────────── */
export default function VideoAnalysis({ videoId, userRole }) {
  const [analysis, setAnalysis] = useState(null);
  const [status, setStatus]     = useState('none');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [quota, setQuota]       = useState(null);  // { used, limit, resetAt, premiumActive }

  const canAnalyze = true; // tous les utilisateurs peuvent lancer l'analyse
  const canDelete = userRole === 'professeur' || userRole === 'admin';

  // Charger les quotas IA (mis à jour après chaque analyse lancée)
  const fetchQuota = useCallback(async () => {
    try {
      const { data } = await api.get('/users/me/ai-quota');
      const q = data?.quotas?.videoAnalysis;
      setQuota(q ? {
        used: q.used,
        limit: q.limit,                 // null si Premium actif (illimité)
        resetAt: q.resetAt,
        premiumActive: !!data.premiumActive,
      } : null);
    } catch { /* fail silently */ }
  }, []);

  useEffect(() => { fetchQuota(); }, [fetchQuota]);

  // Charger l'analyse existante
  const fetchAnalysis = useCallback(async () => {
    try {
      const { data } = await api.get(`/videos/${videoId}/analysis`);
      setAnalysis(data);
      setStatus(data.status);
      if (data.status === 'error') {
        setError(data.error || 'Une erreur est survenue lors de l\'analyse.');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setStatus('none');
      }
    }
  }, [videoId]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  // Polling pendant l'analyse
  useEffect(() => {
    if (status !== 'transcribing' && status !== 'analyzing' && status !== 'pending') return;

    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/videos/${videoId}/analysis/status`);
        setStatus(data.status);

        if (data.status === 'completed') {
          fetchAnalysis();
          clearInterval(interval);
        } else if (data.status === 'error') {
          setError(data.error || 'Une erreur est survenue.');
          clearInterval(interval);
        }
      } catch {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [status, videoId, fetchAnalysis]);

  // Lancer l'analyse via le nouvel endpoint étudiant-friendly /request-analysis
  // (passe par le middleware checkAiQuota côté backend → 429 si quota dépassé).
  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post(`/videos/${videoId}/request-analysis`);
      setStatus('pending');
      fetchQuota();  // refresh du compteur
    } catch (err) {
      if (err.response?.status === 429) {
        const r = err.response.data;
        const resetDate = r?.resetAt ? new Date(r.resetAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : 'le 1er du mois';
        setError(`Quota IA atteint (${r?.used ?? '?'} / ${r?.limit ?? '?'} analyses ce mois). Réinitialisation ${resetDate}.`);
      } else {
        setError(err.response?.data?.message || 'Impossible de lancer l\'analyse.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Relancer l'analyse
  const handleReanalyze = async () => {
    try {
      await api.delete(`/videos/${videoId}/analysis`);
      setAnalysis(null);
      setStatus('none');
      handleAnalyze();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  const tabs = [
    { key: 'summary',  label: 'Résumé',          icon: FileText },
    { key: 'mindmap',  label: 'Carte mentale',    icon: Network },
    { key: 'concepts', label: 'Concepts clés',    icon: Lightbulb },
  ];

  const isProcessing = ['pending', 'transcribing', 'analyzing'].includes(status);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Brain size={20} color="var(--color-primary)" />
          <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, margin: 0 }}>
            Agent IA — Analyse de la vidéo
          </h4>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {status !== 'none' && <StatusBadge status={status} />}

          {canAnalyze && status === 'none' && (() => {
            const quotaReached = quota && quota.limit !== null && quota.used >= quota.limit;
            return (
              <button
                onClick={handleAnalyze}
                disabled={loading || quotaReached}
                className="btn btn-primary"
                title={quotaReached ? 'Quota mensuel atteint' : ''}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 'var(--font-size-sm)',
                  opacity: quotaReached ? 0.55 : 1,
                  cursor: quotaReached ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
                Générer le résumé IA
              </button>
            );
          })()}

          {canDelete && status === 'completed' && (
            <button
              onClick={handleReanalyze}
              className="btn btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-size-xs)' }}
            >
              <RotateCcw size={12} />
              Relancer
            </button>
          )}
        </div>
      </div>

      {/* État initial — pas encore analysé */}
      {status === 'none' && !canAnalyze && (
        <div style={{
          textAlign: 'center', padding: 24,
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-sm)',
        }}>
          <Brain size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
          <p>Cette vidéo n'a pas encore été analysée par l'IA.</p>
          <p style={{ fontSize: 'var(--font-size-xs)' }}>Demandez à votre professeur de lancer l'analyse.</p>
        </div>
      )}

      {status === 'none' && canAnalyze && !loading && (
        <div style={{
          textAlign: 'center', padding: 24,
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-sm)',
        }}>
          <Sparkles size={32} style={{ margin: '0 auto 8px', opacity: 0.4, color: 'var(--color-primary)' }} />
          <p>Lancez l'analyse IA pour générer automatiquement :</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            {[
              { icon: FileText, text: 'Résumé structuré' },
              { icon: Network,  text: 'Carte mentale' },
              { icon: Lightbulb, text: 'Concepts clés' },
            ].map(({ icon: Icon, text }) => (
              <span key={text} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                fontSize: 'var(--font-size-xs)', fontWeight: 600,
              }}>
                <Icon size={14} />
                {text}
              </span>
            ))}
          </div>

          {/* Compteur de quota — sous le bouton, ligne sobre */}
          {quota && (
            <p style={{
              marginTop: 14,
              fontSize: 'var(--font-size-xs)',
              color: quota.premiumActive ? '#10b981' : (quota.limit !== null && quota.used >= quota.limit ? '#ef4444' : 'var(--color-text-secondary)'),
              fontWeight: 500,
            }}>
              {quota.premiumActive
                ? '⭐ Premium actif — analyses illimitées'
                : quota.limit !== null && quota.used >= quota.limit
                  ? `⏳ Quota atteint (${quota.used}/${quota.limit}) — réinitialisation le ${quota.resetAt ? new Date(quota.resetAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '1er du mois'}`
                  : `${Math.max(0, (quota.limit ?? 0) - (quota.used ?? 0))} analyse${Math.max(0, (quota.limit ?? 0) - (quota.used ?? 0)) > 1 ? 's' : ''} restante${Math.max(0, (quota.limit ?? 0) - (quota.used ?? 0)) > 1 ? 's' : ''} ce mois`}
            </p>
          )}
        </div>
      )}

      {/* Progression */}
      {isProcessing && (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{
            width: 48, height: 48, margin: '0 auto 16px',
            borderRadius: '50%',
            border: '3px solid var(--color-border)',
            borderTopColor: 'var(--color-primary)',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 4 }}>
            {status === 'pending' && 'Préparation en cours...'}
            {status === 'transcribing' && 'Transcription audio avec Whisper...'}
            {status === 'analyzing' && 'Analyse intelligente avec GPT-4o...'}
          </p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            {status === 'transcribing' && 'Extraction et reconnaissance vocale de la vidéo'}
            {status === 'analyzing' && 'Génération du résumé, carte mentale et concepts clés'}
            {status === 'pending' && 'L\'analyse va démarrer dans quelques secondes'}
          </p>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div style={{ marginTop: 8 }}>
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={14} />
            <span style={{ flex: 1 }}>{error}</span>
          </div>
          {canAnalyze && (
            <button
              onClick={handleReanalyze}
              className="btn btn-primary"
              style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)' }}
            >
              <RefreshCw size={14} />
              Relancer l'analyse
            </button>
          )}
        </div>
      )}

      {/* Résultats */}
      {status === 'completed' && analysis && (
        <>
          {/* Tabs */}
          <div style={{
            display: 'flex', gap: 4, marginBottom: 16,
            borderBottom: '1px solid var(--color-border)', paddingBottom: 4,
          }}>
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                  border: 'none',
                  backgroundColor: activeTab === key ? 'var(--color-primary-light)' : 'transparent',
                  color: activeTab === key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontWeight: activeTab === key ? 700 : 500,
                  fontSize: 'var(--font-size-sm)',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  borderBottom: activeTab === key ? '2px solid var(--color-primary)' : '2px solid transparent',
                }}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab: Résumé */}
          {activeTab === 'summary' && (
            <div style={{
              fontSize: 'var(--font-size-sm)',
              lineHeight: 1.8,
              color: 'var(--color-text)',
              whiteSpace: 'pre-wrap',
            }}>
              {analysis.summary.split('\n').map((line, i) => {
                if (line.startsWith('## ')) {
                  return (
                    <h3 key={i} style={{
                      fontSize: 'var(--font-size-base)', fontWeight: 700,
                      color: 'var(--color-primary)', marginTop: 16, marginBottom: 8,
                    }}>
                      {line.replace('## ', '')}
                    </h3>
                  );
                }
                if (line.trim() === '') return <br key={i} />;
                // Bold text: **text**
                const parts = line.split(/(\*\*[^*]+\*\*)/g);
                return (
                  <p key={i} style={{ margin: '4px 0' }}>
                    {parts.map((part, j) =>
                      part.startsWith('**') && part.endsWith('**')
                        ? <strong key={j} style={{ color: 'var(--color-primary)' }}>{part.slice(2, -2)}</strong>
                        : <span key={j}>{part}</span>
                    )}
                  </p>
                );
              })}
            </div>
          )}

          {/* Tab: Carte mentale */}
          {activeTab === 'mindmap' && analysis.mindMap && (
            <div style={{ padding: '8px 0' }}>
              <MindMapNode node={analysis.mindMap} />
            </div>
          )}

          {/* Tab: Concepts clés */}
          {activeTab === 'concepts' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
            }}>
              {analysis.keyConcepts.map((concept, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                  }}>
                    <span style={{
                      backgroundColor: 'var(--color-primary)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      width: 22, height: 22,
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <span style={{
                      fontWeight: 700,
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text)',
                    }}>
                      {concept.term}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.6,
                    margin: 0,
                  }}>
                    {concept.definition}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Spin animation CSS */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
