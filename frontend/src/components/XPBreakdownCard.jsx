import { useEffect, useState } from 'react';
import api from '../utils/api.js';
import {
  TrendingUp, Video, ClipboardCheck, Lightbulb, FolderKanban,
  GraduationCap, Swords, Zap, Sparkles, Award,
} from 'lucide-react';

/**
 * XPBreakdownCard — affiche le total XP, le niveau, la décomposition par source
 * et les 10 dernières transactions XP de l'utilisateur connecté.
 *
 * Source : GET /api/users/me/xp-breakdown
 *
 * Pédagogie : la transparence sur l'origine des points (Hattie 2009) augmente
 * la perception d'équité et l'engagement intrinsèque.
 */
const SOURCE_META = {
  video:      { label: 'Vidéos vues',     Icon: Video,           color: '#3B82F6' },
  qcm:        { label: 'QCM',             Icon: ClipboardCheck,  color: '#8B5CF6' },
  prosit:     { label: 'Prosits',         Icon: Lightbulb,       color: '#F59E0B' },
  project:    { label: 'Projets',         Icon: FolderKanban,    color: '#0EA5E9' },
  module:     { label: 'Modules validés', Icon: GraduationCap,   color: '#15803D' },
  battle:     { label: 'Quiz Battle',     Icon: Swords,          color: '#EF4444' },
  quest:      { label: 'Quêtes',          Icon: Zap,             color: '#D97706' },
  streak:     { label: 'Streak',          Icon: Zap,             color: '#F97316' },
  ai:         { label: 'IA',              Icon: Sparkles,        color: '#9333EA' },
  admin:      { label: 'Ajustement',      Icon: Award,           color: '#6B7280' },
  other:      { label: 'Autres',          Icon: Award,           color: '#94A3B8' },
};

export default function XPBreakdownCard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get('/users/me/xp-breakdown')
      .then(({ data }) => { if (!cancelled) setData(data); })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading || !data) return null;
  const { totalPoints, level, bySource } = data;
  const progressPct = level.levelSize > 0 ? (level.progressInLevel / level.levelSize) * 100 : 0;

  // Trie les sources par total décroissant
  const sources = Object.entries(bySource)
    .filter(([, v]) => v.total > 0)
    .sort((a, b) => b[1].total - a[1].total);

  return (
    <div style={{
      background: 'white',
      border: '1px solid #E2E8F0',
      borderRadius: 14,
      padding: 18,
      marginBottom: 18,
    }}>
      {/* Header — total + niveau */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 14, flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1B4F72, #2874A6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 18,
          }}>
            {level.level}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: 0.5 }}>
              NIVEAU {level.level}
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1B4F72' }}>
              {totalPoints} XP au total
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>
            Encore <strong>{level.toNext} XP</strong> pour le niveau {level.level + 1}
          </p>
        </div>
      </div>

      {/* Barre de progression vers le niveau suivant */}
      <div style={{
        height: 8, background: '#F1F5F9', borderRadius: 999,
        overflow: 'hidden', marginBottom: 16,
      }}>
        <div style={{
          width: `${Math.min(100, progressPct)}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
          transition: 'width 400ms ease',
        }} />
      </div>

      {/* Décomposition par source */}
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: 0.5 }}>
        D'OÙ VIENT TON XP ?
      </p>

      {sources.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>
          Pas encore de points. Commence par regarder une vidéo !
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sources.map(([key, v]) => {
            const meta = SOURCE_META[key] || SOURCE_META.other;
            const pct = totalPoints > 0 ? (v.total / totalPoints) * 100 : 0;
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, flexShrink: 0,
                  borderRadius: 6, background: meta.color + '15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <meta.Icon size={14} color={meta.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1B4F72' }}>
                      {meta.label}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>
                      +{v.total} XP
                    </span>
                  </div>
                  <div style={{ height: 4, background: '#F1F5F9', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%',
                      background: meta.color, transition: 'width 400ms ease',
                    }} />
                  </div>
                </div>
                <span style={{ fontSize: 10, color: '#94A3B8', minWidth: 40, textAlign: 'right' }}>
                  {v.count} action{v.count > 1 ? 's' : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Note explicative */}
      <p style={{ margin: '14px 0 0', fontSize: 10, color: '#94A3B8', fontStyle: 'italic', lineHeight: 1.5 }}>
        Note : les XP sont une mesure d'<strong>engagement</strong> (gamification).
        Les <strong>notes officielles</strong> de contrôle continu sont calculées séparément
        dans chaque module — clique sur "Mes cours" pour les voir.
      </p>
    </div>
  );
}
