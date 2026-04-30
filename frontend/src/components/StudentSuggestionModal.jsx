import { useState, useEffect } from 'react';
import api from '../utils/api.js';
import {
  X, Sparkles, AlertCircle, CheckCircle, Loader,
} from 'lucide-react';

/**
 * StudentSuggestionModal — Mini-plan d'action IA personnalisé pour un étudiant.
 *
 * @description S'ouvre depuis ProfessorTracking quand le prof clique sur le
 * bouton « ✨ Suggestion IA » d'un étudiant. Affiche un résumé court + 1 à 3
 * actions concrètes en 1 semaine, classées selon le profil (à risque / moyen
 * / top performer). Ancrage théorique : Hattie (2009) sur l'effet du feedback
 * personnalisé, Black & Wiliam (1998) sur l'évaluation formative actionnable.
 */
export default function StudentSuggestionModal({ courseId, userId, studentName, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.get(`/courses/${courseId}/insights/student/${userId}`)
      .then(({ data }) => { if (alive) setData(data); })
      .catch((err) => { if (alive) setError(err.response?.data?.message || 'Erreur de chargement.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [courseId, userId]);

  const profileBadge = (engagement) => {
    if (engagement === undefined || engagement === null) return null;
    if (engagement >= 80) return { label: 'Top performer', color: '#15803D', bg: '#DCFCE7' };
    if (engagement < 30)  return { label: 'À risque',     color: '#DC2626', bg: '#FEE2E2' };
    return { label: 'Moyen', color: '#D97706', bg: '#FEF3C7' };
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="#9333EA" />
            Suggestion IA — {studentName}
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>

        {loading && (
          <div style={{ padding: 30, textAlign: 'center' }}>
            <Loader size={18} style={{ animation: 'spin 0.8s linear infinite', color: '#9333EA' }} />
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748B' }}>L'IA analyse le profil de cet étudiant…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {error && (
          <div style={{ padding: 12, background: '#FEE2E2', borderRadius: 8, color: '#991B1B', fontSize: 13 }}>
            <AlertCircle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Profil */}
            <div style={{ padding: 12, marginBottom: 14, background: '#F8FAFC', borderRadius: 10 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                {(() => {
                  const b = profileBadge(data.student?.engagement);
                  if (!b) return null;
                  return (
                    <span style={{ padding: '3px 12px', borderRadius: 999, background: b.bg, color: b.color, fontSize: 11, fontWeight: 700 }}>
                      {b.label}
                    </span>
                  );
                })()}
                <span style={{ fontSize: 11, color: '#64748B' }}>
                  Engagement <strong>{data.student?.engagement ?? '—'}%</strong>
                  {' · '}Vidéos <strong>{data.student?.avgVideoPercent ?? 0}%</strong>
                  {data.student?.avgQCMScore !== null && data.student?.avgQCMScore !== undefined && (
                    <>{' · '}QCM <strong>{data.student.avgQCMScore}%</strong></>
                  )}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#1E293B', lineHeight: 1.5 }}>
                {data.summary}
              </p>
            </div>

            {/* Actions */}
            {data.actions?.length > 0 && (
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  Actions recommandées (cette semaine)
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.actions.map((a, i) => (
                    <div key={i} style={{
                      padding: '10px 12px', borderRadius: 8,
                      background: '#F3E8FF', borderLeft: '3px solid #9333EA',
                      fontSize: 13, color: '#1E293B', lineHeight: 1.5,
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                    }}>
                      <CheckCircle size={14} color="#9333EA" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p style={{ margin: '14px 0 0', fontSize: 10, color: '#9333EA', fontStyle: 'italic', textAlign: 'right' }}>
              Source : {data.source === 'groq' ? 'Groq Llama 3.3' : 'règles heuristiques (fallback)'}
            </p>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
