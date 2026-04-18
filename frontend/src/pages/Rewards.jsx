import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  ArrowLeft, Gift, Star, Lock, Check, Award, Zap, Ticket, ShoppingBag,
  Trophy, Crown, X, Loader2, Clock, AlertCircle, Sparkles, Package,
} from 'lucide-react';

const TYPE_META = {
  certificat: { label: 'Certificat',  Icon: Award,       color: '#1B4F72', bg: '#DBEAFE' },
  reduction:  { label: 'Réduction',   Icon: Ticket,      color: '#D97706', bg: '#FEF3C7' },
  premium:    { label: 'Premium',     Icon: Crown,       color: '#9333EA', bg: '#F5F3FF' },
  formation:  { label: 'Formation',   Icon: Zap,         color: '#059669', bg: '#D1FAE5' },
  cadeau:     { label: 'Cadeau',      Icon: Package,     color: '#EC4899', bg: '#FCE7F3' },
  autre:      { label: 'Bonus',       Icon: Sparkles,    color: '#64748B', bg: '#F1F5F9' },
};

const CLAIM_STATUS = {
  pending:   { label: 'En attente', color: '#D97706', bg: '#FEF3C7', Icon: Clock },
  approved:  { label: 'Approuvé',   color: '#0EA5E9', bg: '#E0F2FE', Icon: Check },
  delivered: { label: 'Livré',      color: '#059669', bg: '#D1FAE5', Icon: Check },
  rejected:  { label: 'Refusé',     color: '#DC2626', bg: '#FEE2E2', Icon: X },
};

function RewardCard({ reward, userPoints, onClaim, claiming }) {
  const meta = TYPE_META[reward.type] || TYPE_META.autre;
  const TypeIcon = meta.Icon;
  const canAfford = userPoints >= reward.pointsRequired;
  const outOfStock = reward.stock !== -1 && reward.claimed >= reward.stock;
  const locked = !canAfford || outOfStock;
  const missing = reward.pointsRequired - userPoints;

  return (
    <div style={{
      background: 'white', borderRadius: 14,
      border: reward.highlight ? `2px solid ${meta.color}` : '1px solid #E5E7EB',
      padding: 18, display: 'flex', flexDirection: 'column', gap: 10,
      position: 'relative', overflow: 'hidden',
      boxShadow: reward.highlight ? `0 8px 24px ${meta.color}20` : '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'transform .2s, box-shadow .2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 12px 32px rgba(0,0,0,.08)`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = reward.highlight ? `0 8px 24px ${meta.color}20` : '0 1px 3px rgba(0,0,0,0.05)'; }}
    >
      {reward.highlight && (
        <div style={{ position: 'absolute', top: 8, right: 8, padding: '2px 8px', background: 'linear-gradient(135deg, #F59E0B, #FBBF24)', color: 'white', borderRadius: 999, fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <Star size={10} /> Top
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, background: meta.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, flexShrink: 0,
        }}>
          {reward.emoji || '🎁'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: meta.bg, color: meta.color, fontSize: 10, fontWeight: 700, borderRadius: 6 }}>
            <TypeIcon size={10} /> {meta.label}
          </span>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginTop: 4, lineHeight: 1.3 }}>{reward.titre}</div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, flex: 1 }}>{reward.description}</div>

      {reward.sponsor && (
        <div style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>
          Offert par <strong>{reward.sponsor}</strong>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #F1F5F9', marginTop: 'auto' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: canAfford ? meta.color : '#94A3B8' }}>{reward.pointsRequired}</span>
            <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>pts</span>
          </div>
          {reward.stock !== -1 && (
            <div style={{ fontSize: 10, color: outOfStock ? '#DC2626' : '#94A3B8', fontWeight: 600, marginTop: 2 }}>
              {outOfStock ? 'Rupture' : `${reward.stock - reward.claimed} restants`}
            </div>
          )}
        </div>
        <button
          onClick={() => !locked && onClaim(reward)}
          disabled={locked || claiming}
          style={{
            padding: '9px 16px', borderRadius: 10,
            background: locked ? '#F1F5F9' : `linear-gradient(135deg, ${meta.color}, ${meta.color}dd)`,
            color: locked ? '#94A3B8' : 'white',
            border: 'none', fontWeight: 700, fontSize: 13,
            cursor: locked ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            transition: 'transform .15s',
          }}
          title={outOfStock ? 'Rupture de stock' : !canAfford ? `Il te manque ${missing} points` : 'Réclamer'}
        >
          {locked ? <Lock size={13} /> : <Gift size={13} />}
          {outOfStock ? 'Rupture' : canAfford ? 'Réclamer' : `-${missing} pts`}
        </button>
      </div>
    </div>
  );
}

function ClaimConfirmModal({ reward, onClose, onConfirm, confirming }) {
  const [message, setMessage] = useState('');
  const meta = TYPE_META[reward.type] || TYPE_META.autre;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: 14, padding: 24, width: '100%', maxWidth: 440, boxShadow: '0 20px 50px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
            {reward.emoji}
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Confirmer réclamation</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1E293B' }}>{reward.titre}</div>
          </div>
        </div>

        <div style={{ padding: 14, background: '#FEF3C7', borderRadius: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: '#92400E' }}>
            ⚠️ <strong>{reward.pointsRequired} points</strong> seront débités immédiatement. Un admin validera ta réclamation sous quelques jours.
          </div>
        </div>

        <label style={{ display: 'block', fontSize: 12, color: '#475569', fontWeight: 600, marginBottom: 6 }}>
          Message pour l'admin (optionnel)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ex: taille XL pour le t-shirt, livraison Alger..."
          rows={3}
          style={{ width: '100%', padding: 10, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', marginBottom: 14 }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} disabled={confirming} style={{ padding: '9px 14px', border: '1px solid #E5E7EB', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Annuler
          </button>
          <button onClick={() => onConfirm(message)} disabled={confirming} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: 'none', borderRadius: 8, background: `linear-gradient(135deg, ${meta.color}, ${meta.color}dd)`, color: 'white', cursor: confirming ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}>
            {confirming ? <Loader2 size={14} /> : <Gift size={14} />}
            Réclamer (-{reward.pointsRequired} pts)
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Rewards() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'catalog';

  const [rewards, setRewards] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [claimModal, setClaimModal] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [user, setUser] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [{ data: rs }, { data: claims }] = await Promise.all([
        api.get('/rewards'),
        api.get('/rewards/mine'),
      ]);
      setRewards(rs);
      setMyClaims(claims);
      try {
        const u = JSON.parse(sessionStorage.getItem('fliplearn_user') || 'null');
        setUser(u);
      } catch { /* ignore */ }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const userPoints = user?.points || 0;

  const claimReward = async (reward) => {
    setClaimModal(reward);
  };

  const confirmClaim = async (message) => {
    if (!claimModal) return;
    setClaiming(true);
    try {
      await api.post(`/rewards/${claimModal._id}/claim`, { userMessage: message });
      await loadAll();
      setClaimModal(null);
      setSearchParams({ tab: 'mine' });
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    } finally {
      setClaiming(false);
    }
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return rewards;
    if (filter === 'affordable') return rewards.filter(r => userPoints >= r.pointsRequired);
    return rewards.filter(r => r.type === filter);
  }, [rewards, filter, userPoints]);

  const nextGoal = rewards.filter(r => r.pointsRequired > userPoints).sort((a, b) => a.pointsRequired - b.pointsRequired)[0];
  const progressToNext = nextGoal ? Math.min(100, (userPoints / nextGoal.pointsRequired) * 100) : 100;

  return (
    <Layout title="Boutique récompenses">
      <div style={{ maxWidth: 1150, margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
          <ArrowLeft size={18} /> Retour
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <Gift size={28} color="#1B4F72" />
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B4F72', margin: 0 }}>Boutique récompenses</h1>
            </div>
            <p style={{ color: '#64748b', margin: 0 }}>Échange tes points contre de vraies récompenses : certificats, réductions, cadeaux !</p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 18px', background: 'linear-gradient(135deg, #1B4F72, #2874A6)',
            borderRadius: 12, color: 'white', boxShadow: '0 4px 14px rgba(27,79,114,.25)',
          }}>
            <Trophy size={18} />
            <div>
              <div style={{ fontSize: 11, opacity: .85, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Mes points</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{userPoints.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Prochain objectif */}
        {nextGoal && (
          <div style={{ padding: 14, background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Sparkles size={14} color="#D97706" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                Prochain objectif : <strong>{nextGoal.titre}</strong>
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8' }}>
                {userPoints}/{nextGoal.pointsRequired} pts
              </span>
            </div>
            <div style={{ height: 6, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${progressToNext}%`, height: '100%', background: 'linear-gradient(90deg, #D97706, #F59E0B)', borderRadius: 999, transition: 'width 0.5s' }} />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '2px solid #E5E7EB' }}>
          <button onClick={() => setSearchParams({ tab: 'catalog' })} style={{
            padding: '10px 18px', background: 'none', border: 'none',
            borderBottom: tab === 'catalog' ? '3px solid #1B4F72' : '3px solid transparent',
            marginBottom: -2, cursor: 'pointer', fontSize: 14,
            fontWeight: tab === 'catalog' ? 700 : 500,
            color: tab === 'catalog' ? '#1B4F72' : '#64748B',
          }}>
            <ShoppingBag size={14} style={{ display: 'inline', marginRight: 6 }} /> Catalogue
          </button>
          <button onClick={() => setSearchParams({ tab: 'mine' })} style={{
            padding: '10px 18px', background: 'none', border: 'none',
            borderBottom: tab === 'mine' ? '3px solid #1B4F72' : '3px solid transparent',
            marginBottom: -2, cursor: 'pointer', fontSize: 14,
            fontWeight: tab === 'mine' ? 700 : 500,
            color: tab === 'mine' ? '#1B4F72' : '#64748B',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Award size={14} /> Mes réclamations
            {myClaims.filter(c => c.status === 'pending' || c.status === 'approved').length > 0 && (
              <span style={{ padding: '1px 6px', background: '#DC2626', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 999 }}>
                {myClaims.filter(c => c.status === 'pending' || c.status === 'approved').length}
              </span>
            )}
          </button>
        </div>

        {loading && <p style={{ color: '#94A3B8', textAlign: 'center', padding: 40 }}>Chargement…</p>}

        {/* Catalog */}
        {!loading && tab === 'catalog' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {[
                { id: 'all',        label: 'Toutes' },
                { id: 'affordable', label: '✅ Accessibles' },
                { id: 'certificat', label: '🎓 Certificats' },
                { id: 'reduction',  label: '🎟️ Réductions' },
                { id: 'premium',    label: '⭐ Premium' },
                { id: 'formation',  label: '🚀 Formations' },
                { id: 'cadeau',     label: '🎁 Cadeaux' },
              ].map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)} style={{
                  padding: '7px 14px', borderRadius: 999,
                  border: `1px solid ${filter === f.id ? '#1B4F72' : '#E5E7EB'}`,
                  background: filter === f.id ? '#1B4F72' : 'white',
                  color: filter === f.id ? 'white' : '#475569',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  {f.label}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
                <Package size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                <p>Aucune récompense dans ce filtre.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {filtered.map(r => (
                  <RewardCard key={r._id} reward={r} userPoints={userPoints} onClaim={claimReward} claiming={claiming} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Mes claims */}
        {!loading && tab === 'mine' && (
          <>
            {myClaims.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8', background: 'white', borderRadius: 12, border: '1px dashed #CBD5E1' }}>
                <Gift size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                <p style={{ marginBottom: 14 }}>Tu n'as pas encore réclamé de récompense.</p>
                <button onClick={() => setSearchParams({ tab: 'catalog' })} style={{ padding: '9px 16px', background: '#1B4F72', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Voir le catalogue
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {myClaims.map(claim => {
                  if (!claim.rewardId) return null;
                  const meta = TYPE_META[claim.rewardId.type] || TYPE_META.autre;
                  const st = CLAIM_STATUS[claim.status] || CLAIM_STATUS.pending;
                  const StIcon = st.Icon;
                  return (
                    <div key={claim._id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, background: 'white', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                        {claim.rewardId.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', marginBottom: 3 }}>{claim.rewardId.titre}</div>
                        <div style={{ fontSize: 12, color: '#94A3B8' }}>
                          {claim.pointsSpent} pts dépensés · {new Date(claim.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                        {claim.code && (
                          <div style={{ marginTop: 6, padding: '5px 10px', background: '#D1FAE5', color: '#065F46', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', display: 'inline-block' }}>
                            🎫 Code : <strong>{claim.code}</strong>
                          </div>
                        )}
                        {claim.adminNote && (
                          <div style={{ marginTop: 4, fontSize: 12, color: '#475569', fontStyle: 'italic' }}>
                            📋 {claim.adminNote}
                          </div>
                        )}
                      </div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: st.bg, color: st.color, fontSize: 12, fontWeight: 700, borderRadius: 999 }}>
                        <StIcon size={12} /> {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {claimModal && (
          <ClaimConfirmModal
            reward={claimModal}
            onClose={() => !claiming && setClaimModal(null)}
            onConfirm={confirmClaim}
            confirming={claiming}
          />
        )}
      </div>
    </Layout>
  );
}
