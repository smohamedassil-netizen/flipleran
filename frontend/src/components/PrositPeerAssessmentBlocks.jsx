import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api.js';
import {
  Star, Clock, Trophy, EyeOff, Users,
} from 'lucide-react';

/**
 * Composants d'affichage liés à l'évaluation par les pairs sur PrositDetail.
 *
 * Sortis de `PrositDetail.jsx` (qui dépasse 500 lignes) pour respecter la
 * limite de tailles. Couvre :
 *   - PeerAssessmentBanner : encart étudiant phase retour avec bouton CTA
 *   - FinalScoreCard       : carte note finale individualisée phase evalue
 *   - PeerAssessmentMonitor: tableau de bord prof (compteur, deadline, scores)
 *
 * Ancrage théorique : Falchikov (2005) et Topping (1998).
 */

/* ─── Encart Peer Assessment (étudiant, phase retour) ─────────────────────── */
export function PeerAssessmentBanner({ prosit, navigate }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api.get(`/prosits/${prosit._id}/my-assessments-status`)
      .then(({ data }) => setStatus(data))
      .catch(() => setStatus(null));
  }, [prosit._id]);

  const deadline = prosit.peerAssessmentDeadline;
  const passed = deadline && new Date(deadline) < new Date();
  const total = (status?.totalTeammates ?? 0) + 1;
  const done  = (status?.evaluatedCount ?? 0) + (status?.selfDone ? 1 : 0);

  return (
    <section style={{
      padding: 14, marginBottom: 14, borderRadius: 12,
      background: passed ? '#FEF2F2' : 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
      border: `2px solid ${passed ? '#FECACA' : '#F59E0B'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: passed ? '#991B1B' : '#92400E', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={16} /> Évaluation par les pairs {passed ? 'fermée' : 'ouverte'}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#78350F', lineHeight: 1.5 }}>
            {passed
              ? `La deadline (${new Date(deadline).toLocaleString('fr-FR')}) est dépassée. Contacte ton prof si nécessaire.`
              : <>Note tes coéquipiers et auto-évalue-toi avant le <strong>{new Date(deadline).toLocaleString('fr-FR')}</strong>.</>}
          </p>
          {status && (
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#78350F' }}>
              Progression : <strong>{done}/{total}</strong> formulaire{total > 1 ? 's' : ''} soumis{done > 1 ? 's' : ''}.
            </p>
          )}
        </div>
        <button
          onClick={() => navigate(`/prosits/${prosit._id}/peer-assessment`)}
          disabled={passed}
          style={{
            padding: '10px 18px', borderRadius: 8,
            background: passed ? '#94A3B8' : '#D97706',
            color: 'white', border: 'none', fontWeight: 700, fontSize: 13,
            cursor: passed ? 'not-allowed' : 'pointer',
          }}
        >
          {done >= total && total > 0 ? 'Modifier mes évaluations' : 'Évaluer mes camarades'}
        </button>
      </div>
    </section>
  );
}

/* ─── Carte note finale (étudiant, phase evalue) ──────────────────────────── */
function ScorePill({ label, value, weight, highlight, accent }) {
  return (
    <div style={{
      padding: '8px 12px', borderRadius: 8,
      background: highlight ? '#10B981' : accent ? '#F59E0B' : 'white',
      color: highlight || accent ? 'white' : '#1E293B',
      border: highlight || accent ? 'none' : '1px solid #D1FAE5',
    }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.85 }}>
        {label}{weight && <span> ({weight})</span>}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800 }}>{value}</p>
    </div>
  );
}

export function FinalScoreCard({ groupe, userId }) {
  const myScore = (groupe.finalIndividualScores || []).find(
    (s) => s.userId?.toString?.() === userId?.toString?.()
  );

  if (!myScore) {
    if (groupe.evaluation?.noteGlobale != null) {
      return (
        <section style={{ padding: 14, marginBottom: 14, borderRadius: 12, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#78350F' }}>
            <Clock size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Note du groupe : <strong>{groupe.evaluation.noteGlobale}/20</strong>. Les notes
            individuelles seront publiées à la clôture des évaluations par les pairs.
          </p>
        </section>
      );
    }
    return null;
  }

  return (
    <section style={{
      padding: 16, marginBottom: 14, borderRadius: 12,
      background: 'linear-gradient(135deg, #ECFDF5, #F0FDF4)',
      border: '2px solid #10B981',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <Trophy size={18} color="#059669" />
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#065F46' }}>Ma note finale</h3>
        {myScore.isMvc && (
          <span style={{ padding: '2px 10px', borderRadius: 999, background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 700 }}>
            ⭐ MVC du groupe
          </span>
        )}
        {myScore.isFreeRider && (
          <span style={{ padding: '2px 10px', borderRadius: 999, background: '#FEE2E2', color: '#991B1B', fontSize: 11, fontWeight: 700 }}>
            ⚠️ Free-rider détecté
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 8 }}>
        <ScorePill label="Note du groupe (prof)" value={`${myScore.profGroupScore?.toFixed(1)}/20`} weight="70%" />
        <ScorePill label="Pairs (anonyme)" value={myScore.peerAverageScore != null ? `${myScore.peerAverageScore.toFixed(1)}/20` : '—'} weight="30%" />
        <ScorePill label="Note finale" value={`${myScore.finalScore?.toFixed(1)}/20`} highlight />
        <ScorePill label="XP attribuée" value={`+${myScore.xpAwarded}`} accent />
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 11, color: '#475569', fontStyle: 'italic' }}>
        <EyeOff size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
        Les pairs qui t'ont noté restent anonymes. Pondération 70% prof + 30% pairs (Falchikov, 2005).
      </p>
    </section>
  );
}

/* ─── Suivi Peer Assessment (prof) ────────────────────────────────────────── */
function ProgressLine({ label, value, pct }) {
  const color = pct >= 80 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ color: '#64748B' }}>{label}</span>
        <strong style={{ color }}>{value}</strong>
      </div>
      <div style={{ height: 5, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

function FinalScoresOverview({ prosit }) {
  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #E5E7EB' }}>
      <h4 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#1B4F72', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        Notes finales par membre
      </h4>
      {(prosit.groupes || []).map((g, gi) => (
        <div key={gi} style={{ marginBottom: 8 }}>
          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#1E293B' }}>
            {g.nom} — note de groupe : {g.evaluation?.noteGlobale ?? '—'}/20
          </p>
          {(g.finalIndividualScores || []).length === 0 ? (
            <p style={{ fontSize: 11, fontStyle: 'italic', color: '#94A3B8', margin: 0 }}>Notes individuelles non encore calculées.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
              {g.finalIndividualScores.map((s, i) => {
                const m = (g.membres || []).find((mm) => {
                  const id = typeof mm.userId === 'object' ? mm.userId._id : mm.userId;
                  return id?.toString() === s.userId?.toString();
                });
                const u = m && typeof m.userId === 'object' ? m.userId : null;
                return (
                  <div key={i} style={{ padding: 8, background: s.isFreeRider ? '#FEE2E2' : s.isMvc ? '#FEF3C7' : '#F8FAFC', borderRadius: 6, fontSize: 11 }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#1E293B' }}>
                      {u ? `${u.prenom} ${u.nom}` : 'Membre'}
                      {s.isMvc && ' ⭐'}
                      {s.isFreeRider && ' ⚠️'}
                    </p>
                    <p style={{ margin: '2px 0 0', color: '#475569' }}>
                      Final : <strong>{s.finalScore?.toFixed(1)}/20</strong> · XP : +{s.xpAwarded}
                    </p>
                    <p style={{ margin: '2px 0 0', color: '#94A3B8', fontSize: 10 }}>
                      Pairs : {s.peerAverageScore != null ? `${s.peerAverageScore.toFixed(1)}/20` : 'aucun'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function PeerAssessmentMonitor({ prosit, onUpdated }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [newDeadline, setNewDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/prosits/${prosit._id}/peer-assessments/summary`)
      .then(({ data }) => {
        setSummary(data);
        if (data.deadline) {
          const d = new Date(data.deadline);
          const pad = (n) => String(n).padStart(2, '0');
          setNewDeadline(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
        }
      })
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [prosit._id]);

  useEffect(() => { load(); }, [load]);

  const saveDeadline = async () => {
    if (!newDeadline) return;
    setSaving(true);
    try {
      await api.put(`/prosits/${prosit._id}/peer-assessments/deadline`, { deadline: new Date(newDeadline).toISOString() });
      setEditingDeadline(false);
      load();
      onUpdated?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur deadline');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !summary) return null;

  const deadline = summary.deadline ? new Date(summary.deadline) : null;
  const passed = deadline && deadline < new Date();
  const totalCompleted = summary.summary.reduce((s, g) => s + g.completed, 0);
  const totalExpected  = summary.summary.reduce((s, g) => s + g.expected,  0);

  return (
    <section style={{ background: 'white', borderRadius: 12, padding: 16, border: '1px solid #E5E7EB', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1B4F72', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={15} /> Suivi des évaluations par les pairs
        </h3>
        <span style={{ padding: '3px 10px', background: '#EBF3FA', color: '#1B4F72', fontSize: 11, fontWeight: 700, borderRadius: 999 }}>
          {totalCompleted}/{totalExpected} faites
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12, padding: 10, background: passed ? '#FEE2E2' : '#FFFBEB', borderRadius: 8 }}>
        <Clock size={14} color={passed ? '#991B1B' : '#92400E'} />
        <span style={{ fontSize: 12, color: passed ? '#991B1B' : '#92400E' }}>
          Deadline : <strong>{deadline ? deadline.toLocaleString('fr-FR') : '—'}</strong>
          {passed && ' (dépassée)'}
        </span>
        {!editingDeadline ? (
          <button onClick={() => setEditingDeadline(true)} style={{ padding: '4px 10px', background: 'white', border: '1px solid #FDE68A', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#92400E', cursor: 'pointer' }}>
            Modifier
          </button>
        ) : (
          <>
            <input
              type="datetime-local"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              style={{ padding: '4px 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12 }}
            />
            <button onClick={saveDeadline} disabled={saving} style={{ padding: '4px 10px', background: '#10B981', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? '…' : 'Sauver'}
            </button>
            <button onClick={() => setEditingDeadline(false)} style={{ padding: '4px 10px', background: 'white', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              Annuler
            </button>
          </>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {summary.summary.map((g) => {
          const peerPct = g.expected > 0 ? Math.round((g.completed / g.expected) * 100) : 0;
          const selfPct = g.selfExpected > 0 ? Math.round((g.selfDone / g.selfExpected) * 100) : 0;
          return (
            <div key={g.groupIndex} style={{ padding: 10, background: '#F8FAFC', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                <strong style={{ fontSize: 13, color: '#1E293B' }}>{g.nom}</strong>
                <span style={{ fontSize: 11, color: '#64748B' }}>{g.memberCount} membres</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, fontSize: 11 }}>
                <ProgressLine label="Peer assessments" value={`${g.completed}/${g.expected}`} pct={peerPct} />
                <ProgressLine label="Auto-évaluations"   value={`${g.selfDone}/${g.selfExpected}`} pct={selfPct} />
              </div>
            </div>
          );
        })}
      </div>

      {prosit.status === 'evalue' && <FinalScoresOverview prosit={prosit} />}
    </section>
  );
}
