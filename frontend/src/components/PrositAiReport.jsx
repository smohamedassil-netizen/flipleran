import { useState, useEffect } from 'react';
import api from '../utils/api.js';
import {
  Shield, AlertTriangle, CheckCircle, Eye, EyeOff, RefreshCw, Info,
} from 'lucide-react';

/**
 * PrositAiReport — Onglet "Intégrité IA" sur PrositDetail (vue prof).
 *
 * Affiche, par groupe, le score de probabilité IA (0-100) de chaque
 * contribution étudiante avec ses flags linguistiques. Le prof voit
 * un classement décroissant (cas suspects en haut), avec un extrait
 * tronqué (200 chars) — le texte intégral n'est JAMAIS exposé ici par
 * design (Mitchell et al., 2023 ; respect de la vie privée étudiante).
 *
 * Le score est un SIGNAL au prof, pas une accusation automatique :
 * < 30  → vert (probablement humain)
 * 30-70 → orange (ambigu, mérite d'être lu)
 * ≥ 70  → rouge (très probablement IA, lire et confronter l'étudiant)
 */

function scoreColor(score) {
  if (score === null || score === undefined) return { color: '#94A3B8', bg: '#F1F5F9', label: 'Non analysé' };
  if (score >= 70) return { color: '#DC2626', bg: '#FEE2E2', label: 'Suspect IA' };
  if (score >= 30) return { color: '#D97706', bg: '#FEF3C7', label: 'Ambigu' };
  return { color: '#15803D', bg: '#DCFCE7', label: 'Probable humain' };
}

function MemberRow({ member, expanded, onToggle }) {
  const meta = scoreColor(member.aiProbability);
  return (
    <div style={{
      padding: 12, marginBottom: 8, borderRadius: 10,
      background: '#FAFCFE', border: `1px solid ${meta.color}33`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: meta.bg, color: meta.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, flexShrink: 0,
        }}>
          {member.aiProbability ?? '—'}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
            {member.prenom} {member.nom}
            <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 999, background: '#EBF3FA', color: '#1B4F72', fontSize: 10, fontWeight: 600 }}>
              {member.role}
            </span>
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B' }}>
            {member.hasContribution ? (
              member.checkedAt
                ? <>Analysé le {new Date(member.checkedAt).toLocaleString('fr-FR')}</>
                : <>Contribution soumise, analyse en cours…</>
            ) : (
              <em>Contribution trop courte ou absente.</em>
            )}
          </p>
        </div>
        <span style={{
          padding: '4px 12px', borderRadius: 999,
          background: meta.bg, color: meta.color,
          fontSize: 12, fontWeight: 700, flexShrink: 0,
        }}>
          {meta.label}
        </span>
        {(member.flags?.length > 0 || member.reasons?.length > 0 || member.textPreview) && (
          <button
            type="button"
            onClick={onToggle}
            className="btn btn-ghost btn-sm"
            style={{ flexShrink: 0 }}
          >
            {expanded ? <><EyeOff size={13} /> Masquer</> : <><Eye size={13} /> Détails</>}
          </button>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #E5E7EB' }}>
          {/* Scores détaillés */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 10 }}>
            <div style={{ padding: 6, background: '#F8FAFC', borderRadius: 6, fontSize: 11 }}>
              <p style={{ margin: 0, color: '#64748B', fontWeight: 600 }}>Heuristique</p>
              <p style={{ margin: 0, fontWeight: 800, color: '#1E293B' }}>{member.heuristicScore ?? '—'}/100</p>
            </div>
            <div style={{ padding: 6, background: '#F8FAFC', borderRadius: 6, fontSize: 11 }}>
              <p style={{ margin: 0, color: '#64748B', fontWeight: 600 }}>IA Groq</p>
              <p style={{ margin: 0, fontWeight: 800, color: '#1E293B' }}>{member.groqScore ?? '—'}/100</p>
            </div>
          </div>

          {/* Flags heuristiques */}
          {member.flags?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Indices linguistiques détectés
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {member.flags.map((f, i) => (
                  <span key={i} style={{ padding: '2px 8px', borderRadius: 999, background: '#FFFBEB', color: '#92400E', fontSize: 11, fontWeight: 600 }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Raisons IA */}
          {member.reasons?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Analyse Groq
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                {member.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {/* Extrait */}
          {member.textPreview && (
            <div style={{
              padding: 10, background: '#F8FAFC', borderRadius: 8,
              fontSize: 12, fontStyle: 'italic', color: '#475569',
              borderLeft: '3px solid #94A3B8',
            }}>
              <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4, fontStyle: 'normal' }}>
                Extrait (200 premiers caractères)
              </p>
              « {member.textPreview}… »
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PrositAiReport({ prositId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});  // { 'gIdx-userId': true }

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/prosits/${prositId}/ai-report`);
      setReport(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [prositId]);

  if (loading) {
    return <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: 20 }}>Chargement du rapport…</p>;
  }
  if (error) {
    return (
      <div style={{ padding: 12, background: '#FEE2E2', borderRadius: 8, color: '#991B1B', fontSize: 13 }}>
        <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
        {error}
      </div>
    );
  }
  if (!report) return null;

  const totalSuspects = (report.groups || []).reduce((s, g) => s + (g.suspectsCount || 0), 0);

  return (
    <section>
      {/* En-tête + disclaimer */}
      <div style={{
        padding: 14, marginBottom: 14, borderRadius: 12,
        background: 'linear-gradient(135deg, #EBF3FA, #F8FAFC)',
        border: '1px solid #1B4F72',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          <Shield size={18} color="#1B4F72" />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1B4F72' }}>
            Rapport d'intégrité IA
          </h3>
          <span style={{
            padding: '3px 12px', borderRadius: 999,
            background: totalSuspects > 0 ? '#FEE2E2' : '#DCFCE7',
            color: totalSuspects > 0 ? '#991B1B' : '#15803D',
            fontSize: 12, fontWeight: 700,
          }}>
            {totalSuspects > 0 ? `${totalSuspects} cas suspect${totalSuspects > 1 ? 's' : ''}` : 'Aucun cas suspect'}
          </span>
          <button onClick={load} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
            <RefreshCw size={13} /> Rafraîchir
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
          <Info size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
          Ce rapport est un <strong>signal</strong>, pas une preuve auto-incriminante. Les heuristiques
          (patterns ChatGPT, variabilité, structure) et la confirmation Groq donnent une probabilité
          que le texte ait été généré par IA. À toi de lire et de confronter l'étudiant si besoin.
          Citations : Mitchell et al. (2023) DetectGPT, Krishna et al. (2023) Paraphrase evasion.
        </p>
      </div>

      {/* Groupes */}
      {(report.groups || []).map((g) => (
        <div key={g.groupIndex} style={{
          padding: 14, marginBottom: 12, borderRadius: 12,
          background: 'white', border: '1px solid #E5E7EB',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1B4F72' }}>{g.nom}</h4>
            {g.suspectsCount > 0 && (
              <span style={{ padding: '2px 10px', borderRadius: 999, background: '#FEE2E2', color: '#991B1B', fontSize: 11, fontWeight: 700 }}>
                {g.suspectsCount} suspect{g.suspectsCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {g.members.map((m, i) => {
            const key = `${g.groupIndex}-${m.userId || i}`;
            return (
              <MemberRow
                key={key}
                member={m}
                expanded={!!expanded[key]}
                onToggle={() => setExpanded((p) => ({ ...p, [key]: !p[key] }))}
              />
            );
          })}
        </div>
      ))}
    </section>
  );
}
