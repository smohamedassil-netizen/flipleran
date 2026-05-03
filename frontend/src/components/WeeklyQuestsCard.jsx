import { useEffect, useState } from 'react';
import api from '../utils/api.js';
import { Target, CheckCircle, Clock, RefreshCw, Loader, Sparkles } from 'lucide-react';

/**
 * WeeklyQuestsCard — Card "🎯 Tes 3 quêtes de la semaine" pour le Dashboard
 * étudiant (F11A sprint-final).
 *
 * @see Csikszentmihalyi (1990) Flow + Locke & Latham (2002) Goal-setting.
 *
 * Quand pas encore générées (étudiant qui découvre F11A), un fetch GET
 * /api/quests déclenche la génération paresseuse côté backend.
 */

const DIFFICULTY_META = {
  easy:   { label: 'Facile',    color: '#10b981', bg: '#ecfdf5' },
  medium: { label: 'Moyen',     color: '#f59e0b', bg: '#fffbeb' },
  hard:   { label: 'Difficile', color: '#dc2626', bg: '#fef2f2' },
};

function timeUntilDeadline(deadline) {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return 'expirée';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms / 3600000) % 24);
  if (days >= 1) return `${days}j ${hours}h`;
  return `${hours}h`;
}

export default function WeeklyQuestsCard({ onUpdated }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/quests')
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const refresh = async () => {
    if (!confirm('Régénérer les quêtes de la semaine ? Tes progrès actuels seront perdus.')) return;
    setRefreshing(true);
    try {
      const { data: fresh } = await api.post('/quests/refresh');
      setData(fresh);
      onUpdated?.();
    } catch (err) {
      logError(err);
    } finally { setRefreshing(false); }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: 16, color: '#64748b', fontSize: 13 }}>
        Chargement des quêtes…
      </div>
    );
  }

  const quests = data?.quests || [];
  const completedCount = quests.filter((q) => q.completed).length;

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Target size={15} color="#7c3aed" /> Tes quêtes de la semaine
          {data?.source === 'ai-generated' && (
            <span title="Personnalisées par l'IA" style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#faf5ff', padding: '2px 6px', borderRadius: 999 }}>
              ✨ IA
            </span>
          )}
        </h3>
        <button
          onClick={refresh}
          disabled={refreshing}
          title="Régénérer (perd la progression actuelle)"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}
        >
          {refreshing ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={11} />}
          Régénérer
        </button>
      </div>

      {quests.length === 0 ? (
        <div style={{ padding: 14, background: '#f8fafc', borderRadius: 10, fontSize: 12.5, color: '#64748b' }}>
          Aucune quête active. Reviens lundi (régénération auto chaque semaine) ou clique "Régénérer" pour en avoir tout de suite.
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 10, fontSize: 12, color: '#64748b' }}>
            <strong style={{ color: '#1e293b' }}>{completedCount}/{quests.length}</strong> complétées · réinitialisation lundi
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quests.map((q, i) => {
              const meta = DIFFICULTY_META[q.difficulty] || DIFFICULTY_META.medium;
              const pct = q.target > 0 ? Math.min(100, Math.round((q.current / q.target) * 100)) : 0;
              return (
                <div key={q._id || i} style={{
                  padding: 12,
                  background: q.completed ? '#ecfdf5' : 'white',
                  border: `1px solid ${q.completed ? '#bbf7d0' : '#e2e8f0'}`,
                  borderRadius: 10,
                  opacity: q.completed ? 0.85 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 13, color: '#1e293b' }}>{q.title}</strong>
                        <span style={{ padding: '1px 7px', fontSize: 10, fontWeight: 700, color: meta.color, background: meta.bg, borderRadius: 999 }}>
                          {meta.label.toUpperCase()}
                        </span>
                        {q.completed && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#059669' }}>
                            <CheckCircle size={10} /> FAIT
                          </span>
                        )}
                      </div>
                      {q.description && <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{q.description}</div>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>+{q.xpReward} XP</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                        <Clock size={9} /> {timeUntilDeadline(q.deadline)}
                      </div>
                    </div>
                  </div>
                  {/* Progression */}
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%',
                        background: q.completed ? '#10b981' : meta.color,
                        transition: 'width 300ms',
                      }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                      {q.current}/{q.target}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
