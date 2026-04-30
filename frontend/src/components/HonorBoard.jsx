import { useEffect, useState } from 'react';
import api from '../utils/api.js';
import { Trophy, Crown } from 'lucide-react';

/**
 * HonorBoard — Top 3 étudiants du mois pour un cours donné (F11B).
 *
 * Affichable depuis n'importe où (cours détail prof, dashboard,
 * leaderboard…). Top 3 calculé sur les XP gagnés sur le mois courant
 * (StudyStreak.history).
 *
 * @see Werbach & Hunter (2012). Public recognition is a powerful gamification
 *      lever — visible top performers create aspirational drive.
 */

const PODIUM_META = [
  { color: '#F59E0B', bg: '#FEF3C7', emoji: '🥇' },
  { color: '#94a3b8', bg: '#f1f5f9', emoji: '🥈' },
  { color: '#a16207', bg: '#fef3c7', emoji: '🥉' },
];

export default function HonorBoard({ courseId, compact = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    api.get(`/leaderboard/honor-board/${courseId}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading || !data) {
    return compact ? null : (
      <div className="card" style={{ padding: 14, color: '#64748b', fontSize: 13 }}>
        Chargement du tableau d'honneur…
      </div>
    );
  }

  const top3 = data.top3 || [];

  if (top3.length === 0) {
    return compact ? null : (
      <div className="card" style={{ padding: 14, color: '#64748b', fontSize: 13, textAlign: 'center' }}>
        🏛 Le tableau d'honneur du mois s'affichera dès qu'un étudiant gagnera ses premiers XP ce mois-ci.
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{
        padding: compact ? 12 : 16,
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        border: '1px solid #fcd34d',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Trophy size={compact ? 13 : 15} color="#92400e" />
        <strong style={{ fontSize: compact ? 12 : 13.5, color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.4 }}>
          🏛 Tableau d'honneur · {new Date(data.monthPrefix + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </strong>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {top3.map((e) => {
          const meta = PODIUM_META[e.rank - 1] || PODIUM_META[2];
          const initials = `${e.prenom?.[0] || ''}${e.nom?.[0] || ''}`.toUpperCase();
          return (
            <div
              key={e.userId}
              style={{
                flex: 1, minWidth: 140,
                padding: 10,
                background: 'white',
                border: `1px solid ${meta.color}55`,
                borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <div style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{meta.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.prenom} {e.nom?.[0] || ''}.
                </div>
                <div style={{ fontSize: 10.5, color: meta.color, fontWeight: 600 }}>
                  +{e.xpThisMonth} XP ce mois
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
