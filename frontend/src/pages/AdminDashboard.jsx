import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users, BookOpen, Video, MessageSquare, Shield, Activity,
  ToggleLeft, ToggleRight, Trash2, PlusCircle, AlertCircle,
  Search, Check, X, Edit2, BarChart2, UserPlus, ChevronDown,
  Clock, TrendingUp, TrendingDown, Eye, Mail, Filter,
  MoreHorizontal, RefreshCw, Download, HelpCircle,
  Ticket, Send, ShieldCheck, User as UserIcon, Inbox, Flag,
  Gift, Award, Package, UserCheck, Sparkles,
} from 'lucide-react';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import { formatFullName } from '../utils/format.js';

/* ─── Constants ────────────────────────────────────────────────────────── */
const PRIMARY = '#1B4F72';
const SHADOW = '0 1px 3px rgba(0,0,0,0.08)';
const SHADOW_MD = '0 4px 12px rgba(0,0,0,0.08)';
const RADIUS = 12;
const RADIUS_SM = 8;

const SECTIONS = [
  { id: 'overview',  label: "Vue d'ensemble", icon: BarChart2 },
  { id: 'users',     label: 'Utilisateurs',   icon: Users },
  { id: 'courses',   label: 'Cours',          icon: BookOpen },
  { id: 'messages',  label: 'Messages',       icon: MessageSquare },
  { id: 'activity',  label: 'Activité',       icon: Activity },
  { id: 'pending',   label: 'Inscriptions',   icon: UserCheck },
  { id: 'support',   label: 'Support',        icon: HelpCircle },
  { id: 'rewards',   label: 'Récompenses',    icon: Gift },
];

const ROLE_COLORS = {
  admin:      { bg: '#DBEAFE', text: '#1E40AF', label: 'Admin' },
  professeur: { bg: '#EDE9FE', text: '#6D28D9', label: 'Professeur' },
  etudiant:   { bg: '#D1FAE5', text: '#065F46', label: 'Étudiant' },
};

const STATUS_COLORS = {
  active:   { bg: '#D1FAE5', text: '#065F46' },
  inactive: { bg: '#FEE2E2', text: '#991B1B' },
};

/* ─── Shared styles ────────────────────────────────────────────────────── */
const cardStyle = {
  background: '#fff', borderRadius: RADIUS, boxShadow: SHADOW,
  padding: '20px', border: '1px solid #F1F5F9',
};

const modalOverlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  backdropFilter: 'blur(2px)',
};

const modalCard = {
  ...cardStyle, width: '480px', maxWidth: '95vw', maxHeight: '90vh',
  overflowY: 'auto', boxShadow: SHADOW_MD, padding: '28px',
};

const btnPrimary = {
  background: PRIMARY, color: '#fff', border: 'none', borderRadius: RADIUS_SM,
  padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit',
};

const btnGhost = {
  background: 'transparent', color: '#64748B', border: '1px solid #E2E8F0',
  borderRadius: RADIUS_SM, padding: '8px 16px', fontSize: '13px', fontWeight: 500,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit',
};

const btnDanger = {
  ...btnPrimary, background: '#EF4444',
};

const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0',
  borderRadius: RADIUS_SM, fontSize: '13px', fontFamily: 'inherit',
  outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block', fontSize: '12px', fontWeight: 600,
  color: '#475569', marginBottom: '4px',
};

/* ─── Helpers ──────────────────────────────────────────────────────────── */
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function timeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Il y a ${days}j`;
}
function initials(prenom, nom) {
  return ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase();
}

/* ─── Spinner ──────────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
      <RefreshCw size={24} color={PRIMARY} style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── RoleBadge ────────────────────────────────────────────────────────── */
function RoleBadge({ role }) {
  const c = ROLE_COLORS[role] || { bg: '#F1F5F9', text: '#475569', label: role };
  return (
    <span style={{
      background: c.bg, color: c.text, padding: '3px 10px',
      borderRadius: 20, fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  );
}

/* ─── StatusBadge ──────────────────────────────────────────────────────── */
function StatusBadge({ active }) {
  const c = active ? STATUS_COLORS.active : STATUS_COLORS.inactive;
  return (
    <span style={{
      background: c.bg, color: c.text, padding: '3px 10px',
      borderRadius: 20, fontSize: '11px', fontWeight: 600,
    }}>
      {active ? 'Actif' : 'Inactif'}
    </span>
  );
}

/* ─── Avatar ───────────────────────────────────────────────────────────── */
function Avatar({ prenom, nom, size = 36 }) {
  const colors = ['#1B4F72', '#6D28D9', '#059669', '#DC2626', '#D97706', '#2563EB'];
  const idx = ((prenom || '').charCodeAt(0) + (nom || '').charCodeAt(0)) % colors.length;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: colors[idx],
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
    }}>
      {initials(prenom, nom)}
    </div>
  );
}

/* ─── ConfirmModal ─────────────────────────────────────────────────────── */
function ConfirmModal({ title, message, onConfirm, onCancel, danger = true }) {
  return (
    <div style={modalOverlay} onClick={onCancel}>
      <div style={{ ...modalCard, width: '400px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <AlertCircle size={36} color={danger ? '#EF4444' : PRIMARY} style={{ margin: '0 auto 12px' }} />
        <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700 }}>{title}</h3>
        <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '24px' }}>{message}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button style={btnGhost} onClick={onCancel}>Annuler</button>
          <button style={danger ? btnDanger : btnPrimary} onClick={onConfirm}>Confirmer</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: VUE D'ENSEMBLE
═══════════════════════════════════════════════════════════════════════════ */
function OverviewSection({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/activity'),
    ]).then(([s, a]) => {
      setStats(s.data);
      setActivity(a.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!stats) return <div style={{ textAlign: 'center', color: '#64748B', padding: 40 }}>Erreur de chargement.</div>;

  const cards = [
    { icon: Users, label: 'Utilisateurs', value: stats.totalUsers, color: PRIMARY, trend: '+12%', up: true },
    { icon: BookOpen, label: 'Cours', value: stats.totalCourses, color: '#6D28D9', trend: '+8%', up: true },
    { icon: Video, label: 'Vidéos', value: stats.totalVideos, color: '#2563EB', trend: '+15%', up: true },
    { icon: MessageSquare, label: 'Messages', value: stats.totalMessages, color: '#059669', trend: '+23%', up: true },
  ];

  const byRole = (role) => stats.byRole?.find(r => r._id === role)?.count ?? 0;

  // Fake bar chart data for registrations
  const barData = [
    { label: 'Lun', value: 4 }, { label: 'Mar', value: 7 },
    { label: 'Mer', value: 3 }, { label: 'Jeu', value: 9 },
    { label: 'Ven', value: 6 }, { label: 'Sam', value: 2 },
    { label: 'Dim', value: 5 },
  ];
  const maxBar = Math.max(...barData.map(b => b.value));

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {cards.map((c, i) => {
          const Icon = c.icon;
          const Trend = c.up ? TrendingUp : TrendingDown;
          return (
            <div key={i} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: c.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={c.color} />
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: c.up ? '#059669' : '#DC2626' }}>
                  <Trend size={14} /> {c.trend}
                </span>
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#1E293B' }}>{c.value}</div>
                <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>{c.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Bar chart */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>Inscriptions cette semaine</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px' }}>
            {barData.map((b, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>{b.value}</span>
                <div style={{
                  width: '100%', background: `${PRIMARY}20`, borderRadius: 6, position: 'relative',
                  height: `${(b.value / maxBar) * 100}px`, minHeight: 8,
                }}>
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: '100%', background: PRIMARY, borderRadius: 6,
                    opacity: 0.85, transition: 'height 0.3s',
                  }} />
                </div>
                <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 500 }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Role distribution */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>Répartition par rôle</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { role: 'etudiant', count: byRole('etudiant'), color: '#059669' },
              { role: 'professeur', count: byRole('professeur'), color: '#6D28D9' },
              { role: 'admin', count: byRole('admin'), color: '#DC2626' },
            ].map(r => {
              const pct = stats.totalUsers > 0 ? Math.round((r.count / stats.totalUsers) * 100) : 0;
              return (
                <div key={r.role}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>{ROLE_COLORS[r.role].label}</span>
                    <span style={{ fontSize: '13px', color: '#94A3B8' }}>{r.count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: r.color, borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button style={btnPrimary} onClick={() => onNavigate('users')}>
          <UserPlus size={15} /> Créer un utilisateur
        </button>
        <button style={{ ...btnPrimary, background: '#6D28D9' }} onClick={() => onNavigate('courses')}>
          <PlusCircle size={15} /> Créer un cours
        </button>
        <button style={btnGhost} onClick={() => onNavigate('messages')}>
          <MessageSquare size={15} /> Voir les messages
        </button>
      </div>

      {/* Recent activity */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>Activité récente</h3>
        {activity.length === 0 && <p style={{ color: '#94A3B8', fontSize: '13px' }}>Aucune activité récente.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {activity.slice(0, 10).map((a, i) => {
            const iconMap = { UserPlus, BookOpen, Video };
            const Icon = iconMap[a.icon] || Activity;
            const colorMap = { user: '#059669', course: '#6D28D9', video: '#2563EB' };
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 0', borderBottom: i < activity.slice(0, 10).length - 1 ? '1px solid #F1F5F9' : 'none',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: (colorMap[a.type] || '#64748B') + '15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={15} color={colorMap[a.type] || '#64748B'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: '#1E293B', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.message}
                  </div>
                </div>
                <span style={{ fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {timeAgo(a.date)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: UTILISATEURS
═══════════════════════════════════════════════════════════════════════════ */
function UsersSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [expandedRow, setExpandedRow] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [seedingL3, setSeedingL3] = useState(false);
  const [seedResult, setSeedResult] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    api.get(`/admin/users?${params}`)
      .then(({ data }) => setUsers(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => users, [users]);

  const roleCounts = useMemo(() => {
    const counts = { '': users.length, admin: 0, professeur: 0, etudiant: 0 };
    users.forEach(u => { if (counts[u.role] !== undefined) counts[u.role]++; });
    return counts;
  }, [users]);

  const toggle = async (id) => {
    const { data } = await api.put(`/admin/users/${id}/toggle`).catch(() => ({ data: null }));
    if (data) setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: data.isActive } : u));
  };

  const remove = async (id) => {
    await api.delete(`/admin/users/${id}`).catch(console.error);
    setUsers(prev => prev.filter(u => u._id !== id));
    setConfirmDelete(null);
    setSelectedUsers(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const saveEdit = async (userData) => {
    const { _id, ...fields } = userData;
    const { data } = await api.put(`/admin/users/${_id}`, fields).catch(() => ({ data: null }));
    if (data) {
      setUsers(prev => prev.map(u => u._id === data._id ? data : u));
      setEditModal(null);
    }
  };

  const createUser = async (userData) => {
    const { data } = await api.post('/admin/users', userData).catch(err => {
      alert(err.response?.data?.message || 'Erreur');
      return { data: null };
    });
    if (data) {
      setUsers(prev => [data, ...prev]);
      setCreateModal(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filtered.length) setSelectedUsers(new Set());
    else setSelectedUsers(new Set(filtered.map(u => u._id)));
  };

  const toggleSelect = (id) => {
    setSelectedUsers(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const bulkDelete = async () => {
    for (const id of selectedUsers) {
      const u = users.find(x => x._id === id);
      if (u?.role !== 'admin') await api.delete(`/admin/users/${id}`).catch(() => {});
    }
    setUsers(prev => prev.filter(u => !selectedUsers.has(u._id) || u.role === 'admin'));
    setSelectedUsers(new Set());
  };

  const seedL3Isil = async () => {
    if (!confirm("Cette action va créer 3 profs, 10 étudiants et 8 modules ISIL L3 (idempotent — sans doublons). Continuer ?")) return;
    setSeedingL3(true);
    setSeedResult(null);
    try {
      const { data } = await api.post('/admin/seed/l3-isil');
      setSeedResult({ ok: true, ...data });
      load(); // recharge la liste pour voir les nouveaux comptes
    } catch (err) {
      setSeedResult({ ok: false, message: err.response?.data?.message || 'Erreur' });
    } finally {
      setSeedingL3(false);
    }
  };

  const roleButtons = [
    { value: '', label: 'Tous' },
    { value: 'admin', label: 'Admins' },
    { value: 'professeur', label: 'Professeurs' },
    { value: 'etudiant', label: 'Étudiants' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1E293B' }}>
          Gestion des utilisateurs
          <span style={{ fontSize: '13px', fontWeight: 400, color: '#94A3B8', marginLeft: 8 }}>({users.length})</span>
        </h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            style={{ ...btnGhost, borderColor: '#9333EA', color: '#9333EA' }}
            onClick={seedL3Isil}
            disabled={seedingL3}
            title="Crée 3 profs, 10 étudiants et 8 modules ISIL L3 d'un coup. Idempotent."
          >
            {seedingL3
              ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <Sparkles size={14} />}
            {seedingL3 ? 'Seed en cours…' : 'Seed L3 ISIL (démo)'}
          </button>
          <button style={btnPrimary} onClick={() => setCreateModal(true)}>
            <UserPlus size={15} /> Créer un utilisateur
          </button>
        </div>
      </div>

      {/* Résultat seed L3 ISIL */}
      {seedResult && (
        <div style={{
          padding: '12px 16px',
          marginBottom: 14,
          borderRadius: 8,
          background: seedResult.ok ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${seedResult.ok ? '#BBF7D0' : '#FCA5A5'}`,
          fontSize: 13,
          color: seedResult.ok ? '#15803D' : '#991B1B',
        }}>
          {seedResult.ok ? (
            <>
              <strong>Seed L3 ISIL terminé.</strong>{' '}
              {seedResult.summary.profsCreated} prof(s) créé(s) sur {seedResult.summary.profsTotal},{' '}
              {seedResult.summary.studentsCreated} étudiant(s) créé(s) sur {seedResult.summary.studentsTotal},{' '}
              {seedResult.summary.coursesCreated} module(s) créé(s) sur {seedResult.summary.coursesTotal}.
            </>
          ) : (
            <><strong>Erreur :</strong> {seedResult.message}</>
          )}
          <button
            style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', textDecoration: 'underline' }}
            onClick={() => setSeedResult(null)}
          >
            Fermer
          </button>
        </div>
      )}

      {/* Search + Role filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            style={{ ...inputStyle, paddingLeft: '36px' }}
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '4px', background: '#F8FAFC', borderRadius: RADIUS_SM, padding: '3px' }}>
          {roleButtons.map(rb => (
            <button key={rb.value} onClick={() => setRoleFilter(rb.value)} style={{
              ...btnGhost, border: 'none', padding: '6px 12px', fontSize: '12px',
              background: roleFilter === rb.value ? '#fff' : 'transparent',
              color: roleFilter === rb.value ? PRIMARY : '#64748B',
              boxShadow: roleFilter === rb.value ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              borderRadius: 6, fontWeight: roleFilter === rb.value ? 700 : 500,
            }}>
              {rb.label}
              <span style={{
                background: roleFilter === rb.value ? PRIMARY + '15' : '#E2E8F0',
                color: roleFilter === rb.value ? PRIMARY : '#64748B',
                padding: '1px 6px', borderRadius: 10, fontSize: '10px', fontWeight: 700, marginLeft: 4,
              }}>
                {roleCounts[rb.value] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      {selectedUsers.size > 0 && (
        <div style={{
          ...cardStyle, padding: '10px 16px', marginBottom: '12px',
          display: 'flex', alignItems: 'center', gap: '12px',
          background: PRIMARY + '08', borderColor: PRIMARY + '20',
        }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: PRIMARY }}>
            {selectedUsers.size} utilisateur{selectedUsers.size > 1 ? 's' : ''} sélectionné{selectedUsers.size > 1 ? 's' : ''}
          </span>
          <button style={{ ...btnDanger, padding: '5px 12px', fontSize: '12px' }} onClick={bulkDelete}>
            <Trash2 size={13} /> Supprimer la sélection
          </button>
          <button style={{ ...btnGhost, padding: '5px 12px', fontSize: '12px' }} onClick={() => setSelectedUsers(new Set())}>
            Désélectionner
          </button>
        </div>
      )}

      {loading && <Spinner />}

      {/* Table */}
      {!loading && (
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', width: 40 }}>
                    <input type="checkbox" checked={selectedUsers.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                  </th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Utilisateur</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rôle</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filière</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Promotion</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Points</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statut</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inscription</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, idx) => (
                  <UserTableRow key={u._id} user={u} idx={idx}
                    selected={selectedUsers.has(u._id)}
                    onToggleSelect={() => toggleSelect(u._id)}
                    expanded={expandedRow === u._id}
                    onToggleExpand={() => setExpandedRow(expandedRow === u._id ? null : u._id)}
                    onEdit={() => setEditModal(u)}
                    onToggle={() => toggle(u._id)}
                    onDelete={() => setConfirmDelete(u._id)}
                    onSaveInline={(fields) => saveEdit({ _id: u._id, ...fields })}
                    actionMenuOpen={actionMenu === u._id}
                    onToggleActionMenu={() => setActionMenu(actionMenu === u._id ? null : u._id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
              <Users size={32} style={{ marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: '14px' }}>Aucun utilisateur trouvé.</p>
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <UserEditModal user={editModal} onSave={saveEdit} onClose={() => setEditModal(null)} />
      )}

      {/* Create modal */}
      {createModal && (
        <UserCreateModal onCreate={createUser} onClose={() => setCreateModal(false)} />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <ConfirmModal
          title="Supprimer cet utilisateur ?"
          message="Cette action est irréversible. L'utilisateur sera définitivement supprimé."
          onConfirm={() => remove(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

/* ─── User table row ───────────────────────────────────────────────────── */
function UserTableRow({ user: u, idx, selected, onToggleSelect, expanded, onToggleExpand, onEdit, onToggle, onDelete, onSaveInline, actionMenuOpen, onToggleActionMenu }) {
  const [inlineForm, setInlineForm] = useState({ nom: u.nom, prenom: u.prenom, filiere: u.filiere || '', promotion: u.promotion || '' });

  const rowBg = selected ? PRIMARY + '08' : idx % 2 === 0 ? '#fff' : '#FAFBFC';

  return (
    <>
      <tr style={{ background: rowBg, borderBottom: '1px solid #F1F5F9', transition: 'background 0.1s', cursor: 'pointer' }}
        onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#F8FAFC'; }}
        onMouseLeave={e => { if (!selected) e.currentTarget.style.background = rowBg; }}
      >
        <td style={{ padding: '12px 16px' }}>
          <input type="checkbox" checked={selected} onChange={onToggleSelect} style={{ cursor: 'pointer' }} onClick={e => e.stopPropagation()} />
        </td>
        <td style={{ padding: '12px 8px' }} onClick={onToggleExpand}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Avatar prenom={u.prenom} nom={u.nom} size={34} />
            <div>
              <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '13px' }}>{u.prenom} {u.nom}</div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>{u.email}</div>
            </div>
          </div>
        </td>
        <td style={{ padding: '12px 8px' }}><RoleBadge role={u.role} /></td>
        <td style={{ padding: '12px 8px', color: '#475569', fontSize: '13px' }}>{u.filiere || '—'}</td>
        <td style={{ padding: '12px 8px', color: '#475569', fontSize: '13px' }}>{u.promotion || '—'}</td>
        <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, color: '#1E293B' }}>{u.points ?? 0}</td>
        <td style={{ padding: '12px 8px', textAlign: 'center' }}><StatusBadge active={u.isActive !== false} /></td>
        <td style={{ padding: '12px 8px', fontSize: '12px', color: '#94A3B8' }}>{formatDate(u.createdAt)}</td>
        <td style={{ padding: '12px 16px', textAlign: 'center', position: 'relative' }}>
          <button onClick={(e) => { e.stopPropagation(); onToggleActionMenu(); }}
            style={{ ...btnGhost, padding: '4px 8px', border: 'none' }}>
            <MoreHorizontal size={16} />
          </button>
          {actionMenuOpen && (
            <div style={{
              position: 'absolute', right: 16, top: '100%', zIndex: 50,
              background: '#fff', borderRadius: RADIUS_SM, boxShadow: SHADOW_MD,
              border: '1px solid #E2E8F0', minWidth: 180, overflow: 'hidden',
            }}>
              <button onClick={() => { onEdit(); onToggleActionMenu(); }} style={menuItemStyle}>
                <Edit2 size={13} /> Modifier
              </button>
              <button onClick={() => { onToggle(); onToggleActionMenu(); }} style={menuItemStyle} disabled={u.role === 'admin'}>
                {u.isActive !== false ? <ToggleLeft size={13} /> : <ToggleRight size={13} />}
                {u.isActive !== false ? 'Désactiver' : 'Activer'}
              </button>
              <div style={{ height: 1, background: '#F1F5F9' }} />
              <button onClick={() => { onDelete(); onToggleActionMenu(); }} style={{ ...menuItemStyle, color: '#DC2626' }} disabled={u.role === 'admin'}>
                <Trash2 size={13} /> Supprimer
              </button>
            </div>
          )}
        </td>
      </tr>
      {/* Expanded inline edit */}
      {expanded && (
        <tr style={{ background: '#F8FAFC' }}>
          <td colSpan={9} style={{ padding: '16px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', alignItems: 'end' }}>
              <div>
                <label style={labelStyle}>Prénom</label>
                <input style={inputStyle} value={inlineForm.prenom} onChange={e => setInlineForm(p => ({ ...p, prenom: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Nom</label>
                <input style={inputStyle} value={inlineForm.nom} onChange={e => setInlineForm(p => ({ ...p, nom: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Filière</label>
                <input style={inputStyle} value={inlineForm.filiere} onChange={e => setInlineForm(p => ({ ...p, filiere: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{ ...btnPrimary, fontSize: '12px', padding: '8px 14px' }} onClick={() => { onSaveInline(inlineForm); onToggleExpand(); }}>
                  <Check size={13} /> Enregistrer
                </button>
                <button style={{ ...btnGhost, fontSize: '12px', padding: '8px 14px' }} onClick={onToggleExpand}>
                  <X size={13} />
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const menuItemStyle = {
  display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
  padding: '9px 14px', border: 'none', background: 'none',
  fontSize: '13px', color: '#475569', cursor: 'pointer',
  textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.1s',
};

/* ─── User Edit Modal ──────────────────────────────────────────────────── */
function UserEditModal({ user, onSave, onClose }) {
  const [form, setForm] = useState({
    _id: user._id, nom: user.nom, prenom: user.prenom,
    role: user.role, filiere: user.filiere || '', promotion: user.promotion || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalCard} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>Modifier l'utilisateur</h3>
          <button onClick={onClose} style={{ ...btnGhost, border: 'none', padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '12px', background: '#F8FAFC', borderRadius: RADIUS_SM }}>
          <Avatar prenom={user.prenom} nom={user.nom} size={42} />
          <div>
            <div style={{ fontWeight: 600, color: '#1E293B' }}>{formatFullName(user)}</div>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>{user.email}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Prénom</label>
            <input style={inputStyle} value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Nom</label>
            <input style={inputStyle} value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Rôle</label>
            <select style={inputStyle} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="etudiant">Étudiant</option>
              <option value="professeur">Professeur</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Filière</label>
            <input style={inputStyle} value={form.filiere} onChange={e => setForm(p => ({ ...p, filiere: e.target.value }))} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Promotion</label>
            <input style={inputStyle} value={form.promotion} onChange={e => setForm(p => ({ ...p, promotion: e.target.value }))} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button style={btnGhost} onClick={onClose}>Annuler</button>
          <button style={btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── User Create Modal ────────────────────────────────────────────────── */
function UserCreateModal({ onCreate, onClose }) {
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', password: '',
    role: 'etudiant', filiere: '', promotion: '',
  });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.nom || !form.prenom || !form.email || !form.password) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setSaving(true);
    await onCreate(form);
    setSaving(false);
  };

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalCard} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>Créer un utilisateur</h3>
          <button onClick={onClose} style={{ ...btnGhost, border: 'none', padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Prénom *</label>
            <input style={inputStyle} value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} placeholder="Jean" />
          </div>
          <div>
            <label style={labelStyle}>Nom *</label>
            <input style={inputStyle} value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="Dupont" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Email *</label>
            <input style={inputStyle} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="jean.dupont@email.com" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Mot de passe *</label>
            <input style={inputStyle} type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Minimum 6 caractères" />
          </div>
          <div>
            <label style={labelStyle}>Rôle</label>
            <select style={inputStyle} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="etudiant">Étudiant</option>
              <option value="professeur">Professeur</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Filière</label>
            <input style={inputStyle} value={form.filiere} onChange={e => setForm(p => ({ ...p, filiere: e.target.value }))} placeholder="Informatique" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Promotion</label>
            <input style={inputStyle} value={form.promotion} onChange={e => setForm(p => ({ ...p, promotion: e.target.value }))} placeholder="L3 2024" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button style={btnGhost} onClick={onClose}>Annuler</button>
          <button style={btnPrimary} onClick={handleCreate} disabled={saving}>
            {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={14} />}
            {saving ? 'Création...' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: COURS
═══════════════════════════════════════════════════════════════════════════ */
function CoursesSection() {
  const [courses, setCourses] = useState([]);
  const [profs, setProfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [detailPanel, setDetailPanel] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/admin/courses'),
      api.get('/admin/professors'),
    ]).then(([c, p]) => { setCourses(c.data); setProfs(p.data); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const toggleActive = async (id, current) => {
    const { data } = await api.put(`/admin/courses/${id}`, { isActive: !current }).catch(() => ({ data: null }));
    if (data) setCourses(p => p.map(c => c._id === id ? { ...c, isActive: data.isActive } : c));
  };

  const remove = async (id) => {
    await api.delete(`/admin/courses/${id}`).catch(console.error);
    setCourses(p => p.filter(c => c._id !== id));
    setConfirmDelete(null);
  };

  const handleCreate = async (form) => {
    const { data } = await api.post('/admin/courses', form).catch(err => {
      alert(err.response?.data?.message || 'Erreur');
      return { data: null };
    });
    if (data) {
      setCourses(p => [{ ...data, studentCount: 0, videoCount: 0 }, ...p]);
      setCreateModal(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1E293B' }}>
          Gestion des cours
          <span style={{ fontSize: '13px', fontWeight: 400, color: '#94A3B8', marginLeft: 8 }}>({courses.length})</span>
        </h2>
        <button style={btnPrimary} onClick={() => setCreateModal(true)}>
          <PlusCircle size={15} /> Nouveau cours
        </button>
      </div>

      {loading && <Spinner />}

      {!loading && (
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {['Titre', 'Professeur', 'Filière', 'Promotion', 'Vidéos', 'Étudiants', 'Statut', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 12px', textAlign: h === 'Actions' ? 'center' : 'left', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courses.map((c, idx) => (
                  <tr key={c._id} style={{ background: idx % 2 === 0 ? '#fff' : '#FAFBFC', borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#FAFBFC'}
                    onClick={() => setDetailPanel(detailPanel?._id === c._id ? null : c)}
                  >
                    <td style={{ padding: '12px', fontWeight: 600, color: '#1E293B' }}>{c.titre}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>
                      {c.professorId ? `${c.professorId.prenom} ${c.professorId.nom}` : '—'}
                    </td>
                    <td style={{ padding: '12px', color: '#475569' }}>{c.filiere || '—'}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{c.promotion || '—'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>{c.videoCount ?? 0}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>{c.studentCount ?? 0}</td>
                    <td style={{ padding: '12px' }}><StatusBadge active={c.isActive !== false} /></td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#94A3B8' }}>{formatDate(c.createdAt)}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button onClick={() => toggleActive(c._id, c.isActive !== false)} style={{ ...btnGhost, padding: '4px 8px', border: 'none' }}
                          title={c.isActive !== false ? 'Désactiver' : 'Activer'}>
                          {c.isActive !== false ? <ToggleRight size={15} color="#059669" /> : <ToggleLeft size={15} color="#DC2626" />}
                        </button>
                        <button onClick={() => setConfirmDelete(c._id)} style={{ ...btnGhost, padding: '4px 8px', border: 'none', color: '#DC2626' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {courses.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
              <BookOpen size={32} style={{ marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: '14px' }}>Aucun cours.</p>
            </div>
          )}
        </div>
      )}

      {/* Detail panel */}
      {detailPanel && (
        <div style={{ ...cardStyle, marginTop: '16px', borderLeft: `4px solid ${PRIMARY}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>{detailPanel.titre}</h3>
            <button style={{ ...btnGhost, padding: '4px', border: 'none' }} onClick={() => setDetailPanel(null)}><X size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <div><span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Professeur</span><div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginTop: 2 }}>{detailPanel.professorId ? `${detailPanel.professorId.prenom} ${detailPanel.professorId.nom}` : '—'}</div></div>
            <div><span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Filière</span><div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginTop: 2 }}>{detailPanel.filiere}</div></div>
            <div><span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Promotion</span><div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginTop: 2 }}>{detailPanel.promotion}</div></div>
            <div><span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Vidéos</span><div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginTop: 2 }}>{detailPanel.videoCount ?? 0}</div></div>
            <div><span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Étudiants</span><div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginTop: 2 }}>{detailPanel.studentCount ?? 0}</div></div>
            <div><span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Créé le</span><div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginTop: 2 }}>{formatDate(detailPanel.createdAt)}</div></div>
          </div>
          {detailPanel.description && (
            <div style={{ marginTop: '12px', padding: '10px', background: '#F8FAFC', borderRadius: RADIUS_SM }}>
              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Description</span>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#475569' }}>{detailPanel.description}</p>
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      {createModal && (
        <CourseCreateModal profs={profs} onCreate={handleCreate} onClose={() => setCreateModal(false)} />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <ConfirmModal
          title="Supprimer ce cours ?"
          message="Cette action est irréversible. Toutes les vidéos associées resteront orphelines."
          onConfirm={() => remove(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

/* ─── Course Create Modal ──────────────────────────────────────────────── */
function CourseCreateModal({ profs, onCreate, onClose }) {
  const [form, setForm] = useState({ titre: '', description: '', professorId: '', filiere: '', promotion: '' });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.titre || !form.professorId || !form.filiere || !form.promotion) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setSaving(true);
    await onCreate(form);
    setSaving(false);
  };

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalCard} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>Créer un cours</h3>
          <button onClick={onClose} style={{ ...btnGhost, border: 'none', padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Titre *</label>
            <input style={inputStyle} value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))} placeholder="Algorithmes et structures de données" />
          </div>
          <div>
            <label style={labelStyle}>Professeur *</label>
            <select style={inputStyle} value={form.professorId} onChange={e => setForm(p => ({ ...p, professorId: e.target.value }))}>
              <option value="">Sélectionner...</option>
              {profs.map(p => <option key={p._id} value={p._id}>{p.prenom} {p.nom}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Filière *</label>
            <input style={inputStyle} value={form.filiere} onChange={e => setForm(p => ({ ...p, filiere: e.target.value }))} placeholder="Informatique" />
          </div>
          <div>
            <label style={labelStyle}>Promotion *</label>
            <input style={inputStyle} value={form.promotion} onChange={e => setForm(p => ({ ...p, promotion: e.target.value }))} placeholder="L3 2024" />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <input style={inputStyle} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description du cours..." />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button style={btnGhost} onClick={onClose}>Annuler</button>
          <button style={btnPrimary} onClick={handleCreate} disabled={saving}>
            {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <PlusCircle size={14} />}
            {saving ? 'Création...' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: MESSAGES
═══════════════════════════════════════════════════════════════════════════ */
function MessagesSection() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/admin/messages')
      .then(({ data }) => setMessages(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search) return messages;
    const q = search.toLowerCase();
    return messages.filter(m =>
      m.content?.toLowerCase().includes(q) ||
      m.senderId?.nom?.toLowerCase().includes(q) ||
      m.senderId?.prenom?.toLowerCase().includes(q) ||
      m.senderId?.email?.toLowerCase().includes(q)
    );
  }, [messages, search]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1E293B' }}>
          Messages
          <span style={{ fontSize: '13px', fontWeight: 400, color: '#94A3B8', marginLeft: 8 }}>({messages.length})</span>
        </h2>
      </div>

      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
        <input style={{ ...inputStyle, paddingLeft: '36px' }}
          placeholder="Rechercher dans les messages..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading && <Spinner />}

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
              <MessageSquare size={32} style={{ marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: '14px' }}>Aucun message trouvé.</p>
            </div>
          )}
          {filtered.map(m => (
            <div key={m._id} style={{ ...cardStyle, padding: '14px 18px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <Avatar
                prenom={m.senderId?.prenom || m.senderName || '?'}
                nom={m.senderId?.nom || ''}
                size={36}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#1E293B' }}>
                    {m.senderId ? `${m.senderId.prenom} ${m.senderId.nom}` : m.senderName || 'Inconnu'}
                  </span>
                  {m.senderId?.role && <RoleBadge role={m.senderId.role} />}
                  {m.receiverId && (
                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                      &rarr; {m.receiverId.prenom} {m.receiverId.nom}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5, wordBreak: 'break-word' }}>
                  {m.content}
                </p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '11px', color: '#94A3B8' }}>
                  <span>{timeAgo(m.createdAt)}</span>
                  <span>Salon: {m.roomId}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: ACTIVITÉ
═══════════════════════════════════════════════════════════════════════════ */
function ActivitySection() {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/activity')
      .then(({ data }) => setActivity(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const iconMap = { UserPlus, BookOpen, Video };
  const colorMap = { user: '#059669', course: '#6D28D9', video: '#2563EB' };

  return (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700, color: '#1E293B' }}>
        Journal d'activité
      </h2>

      {loading && <Spinner />}

      {!loading && activity.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
          <Activity size={32} style={{ marginBottom: 8 }} />
          <p style={{ margin: 0, fontSize: '14px' }}>Aucune activité récente.</p>
        </div>
      )}

      {!loading && activity.length > 0 && (
        <div style={{ position: 'relative', paddingLeft: '32px' }}>
          {/* Vertical line */}
          <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 2, background: '#E2E8F0' }} />

          {activity.map((a, i) => {
            const Icon = iconMap[a.icon] || Activity;
            const color = colorMap[a.type] || '#64748B';
            return (
              <div key={i} style={{ position: 'relative', marginBottom: '20px' }}>
                {/* Dot */}
                <div style={{
                  position: 'absolute', left: -24, top: 4, width: 20, height: 20,
                  borderRadius: '50%', background: color + '20', border: `2px solid ${color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={10} color={color} />
                </div>
                {/* Card */}
                <div style={{ ...cardStyle, padding: '14px 18px', marginLeft: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: '#1E293B', fontWeight: 500 }}>{a.message}</span>
                    <span style={{ fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap' }}>{formatDateTime(a.date)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN: AdminDashboard
═══════════════════════════════════════════════════════════════════════════ */
/* ─── SupportSection ──────────────────────────────────────────────────── */
const TICKET_STATUS = {
  pending:  { bg: '#FEF3C7', color: '#92400E', label: 'En attente', dot: '#F59E0B' },
  accepted: { bg: '#DBEAFE', color: '#1E40AF', label: 'En cours',   dot: '#2563EB' },
  resolved: { bg: '#D1FAE5', color: '#065F46', label: 'Résolu',    dot: '#10B981' },
  closed:   { bg: '#F1F5F9', color: '#475569', label: 'Fermé',     dot: '#64748B' },
};

const TICKET_PRIORITY = {
  urgent: { label: 'Urgent',    color: '#DC2626', bg: '#FEE2E2', emoji: '🔴' },
  high:   { label: 'Important', color: '#D97706', bg: '#FEF3C7', emoji: '⚡' },
  normal: { label: 'Normale',   color: '#64748B', bg: '#F1F5F9', emoji: '•'  },
  low:    { label: 'Faible',    color: '#94A3B8', bg: '#F8FAFC', emoji: '🔽' },
};

const TICKET_CATEGORY = {
  technique:   { label: 'Technique',   emoji: '🛠️', color: '#0EA5E9' },
  pedagogique: { label: 'Pédagogique', emoji: '📚', color: '#8B5CF6' },
  compte:      { label: 'Compte',      emoji: '👤', color: '#EC4899' },
  autre:       { label: 'Autre',       emoji: '📌', color: '#64748B' },
};

function PriorityPill({ priority }) {
  const p = TICKET_PRIORITY[priority] || TICKET_PRIORITY.normal;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', background: p.bg, color: p.color,
      fontSize: 11, fontWeight: 700, borderRadius: 6,
    }}>
      <span>{p.emoji}</span> {p.label}
    </span>
  );
}

function StatusPill({ status }) {
  const s = TICKET_STATUS[status] || TICKET_STATUS.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700, borderRadius: 999,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
      {s.label}
    </span>
  );
}

function TicketConversationModal({ ticket, currentUserId, onClose, onRefresh }) {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [priority, setPriority] = useState(ticket.priority || 'normal');
  const [category, setCategory] = useState(ticket.category || 'autre');

  const assignedToMe = ticket.acceptedBy?._id === currentUserId || ticket.acceptedBy === currentUserId;
  const canAct = ticket.status !== 'closed';

  const accept = async () => {
    setSending(true);
    try {
      await api.put(`/support/${ticket._id}/accept`);
      onRefresh();
    } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
    finally { setSending(false); }
  };

  const sendReply = async (markResolved = false) => {
    if (!reply.trim() && !markResolved) return;
    setSending(true);
    try {
      if (reply.trim()) {
        await api.post(`/support/${ticket._id}/message`, { message: reply });
      }
      if (markResolved) {
        await api.put(`/support/${ticket._id}/resolve`, { response: reply || 'Résolu' });
      }
      setReply('');
      onRefresh();
    } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
    finally { setSending(false); }
  };

  const updateMeta = async (newPriority, newCategory) => {
    try {
      await api.put(`/support/${ticket._id}/priority`, {
        priority: newPriority, category: newCategory,
      });
      setPriority(newPriority);
      setCategory(newCategory);
      onRefresh();
    } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <div onClick={onClose} style={{ ...modalOverlay }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: SHADOW_MD }}>
        {/* Header */}
        <div style={{ padding: 20, borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1E293B' }}>{ticket.objet}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={18} color="#64748B" />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <StatusPill status={ticket.status} />
            <PriorityPill priority={priority} />
            <span style={{ fontSize: 12, color: '#64748B' }}>
              {TICKET_CATEGORY[category]?.emoji} {TICKET_CATEGORY[category]?.label}
            </span>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>•</span>
            <span style={{ fontSize: 12, color: '#64748B' }}>
              <UserIcon size={11} style={{ display: 'inline', marginRight: 4 }} />
              {ticket.userId?.prenom} {ticket.userId?.nom} ({ticket.userId?.role})
            </span>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>•</span>
            <span style={{ fontSize: 12, color: '#64748B' }}>
              {new Date(ticket.createdAt).toLocaleString('fr-FR')}
            </span>
          </div>
          {ticket.acceptedBy && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ShieldCheck size={12} color="#0EA5E9" />
              Pris en charge par <strong>{ticket.acceptedBy.prenom} {ticket.acceptedBy.nom}</strong>
              {assignedToMe && <span style={{ color: '#0EA5E9', fontWeight: 700 }}>(vous)</span>}
            </div>
          )}

          {/* Meta editors (admin only) */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <select value={priority} onChange={(e) => updateMeta(e.target.value, category)} style={{ padding: '5px 10px', fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 6, background: 'white', cursor: 'pointer' }}>
              <option value="low">🔽 Faible</option>
              <option value="normal">• Normale</option>
              <option value="high">⚡ Important</option>
              <option value="urgent">🔴 Urgent</option>
            </select>
            <select value={category} onChange={(e) => updateMeta(priority, e.target.value)} style={{ padding: '5px 10px', fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 6, background: 'white', cursor: 'pointer' }}>
              <option value="technique">🛠️ Technique</option>
              <option value="pedagogique">📚 Pédagogique</option>
              <option value="compte">👤 Compte</option>
              <option value="autre">📌 Autre</option>
            </select>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#F8FAFC' }}>
          <div style={{ marginBottom: 14, padding: 14, background: '#fff', borderRadius: 10, borderLeft: '3px solid #1B4F72', boxShadow: SHADOW }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B', marginBottom: 6 }}>
              <UserIcon size={12} /> <strong>{ticket.nom}</strong>
              <span style={{ marginLeft: 'auto' }}>{new Date(ticket.createdAt).toLocaleString('fr-FR')}</span>
            </div>
            <div style={{ fontSize: 13, color: '#1E293B', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{ticket.message}</div>
          </div>

          {ticket.conversation?.map((msg, i) => {
            const isAdmin = msg.from === 'admin';
            return (
              <div key={msg._id || i} style={{
                marginBottom: 12, padding: 12, borderRadius: 10,
                background: isAdmin ? '#EFF6FF' : '#fff',
                borderLeft: `3px solid ${isAdmin ? '#0EA5E9' : '#64748B'}`,
                boxShadow: SHADOW,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B', marginBottom: 6 }}>
                  {isAdmin ? <ShieldCheck size={12} color="#0EA5E9" /> : <UserIcon size={12} />}
                  <strong>
                    {msg.authorId ? `${msg.authorId.prenom || ''} ${msg.authorId.nom || ''}`.trim() : (isAdmin ? 'Admin' : ticket.nom)}
                  </strong>
                  <span style={{ marginLeft: 'auto' }}>{new Date(msg.createdAt).toLocaleString('fr-FR')}</span>
                </div>
                <div style={{ fontSize: 13, color: '#1E293B', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.message}</div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        {canAct && (
          <div style={{ padding: 16, borderTop: '1px solid #E2E8F0', background: '#fff' }}>
            {ticket.status === 'pending' && !ticket.acceptedBy && (
              <button onClick={accept} disabled={sending} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', marginBottom: 10 }}>
                <Check size={14} /> Prendre en charge
              </button>
            )}
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={ticket.status === 'resolved' ? "Ajouter un message (réouvre le ticket)…" : "Votre réponse…"}
              rows={3}
              style={{ width: '100%', padding: 10, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', marginBottom: 8 }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => sendReply(false)} disabled={sending || !reply.trim()} style={{ ...btnGhost, opacity: sending || !reply.trim() ? 0.5 : 1 }}>
                <Send size={13} /> Répondre
              </button>
              {ticket.status !== 'resolved' && (
                <button onClick={() => sendReply(true)} disabled={sending} style={{ ...btnPrimary, background: '#059669' }}>
                  <Check size={13} /> Résoudre
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SupportSection() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('free'); // free | mine | all | resolved
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    try {
      const u = JSON.parse(sessionStorage.getItem('fliplearn_user') || 'null');
      setCurrentUserId(u?._id);
    } catch { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/support');
      setTickets(data);
      if (selected) {
        const fresh = data.find(t => t._id === selected._id);
        if (fresh) setSelected(fresh);
      }
    } catch { setTickets([]); }
    finally { setLoading(false); }
  }, [selected]);

  useEffect(() => { load(); /* eslint-disable-line */ }, []);

  const counts = useMemo(() => ({
    free:     tickets.filter(t => t.status === 'pending' && !t.acceptedBy).length,
    mine:     tickets.filter(t => (t.acceptedBy?._id === currentUserId || t.acceptedBy === currentUserId) && t.status !== 'resolved').length,
    all:      tickets.filter(t => t.status !== 'resolved').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    urgent:   tickets.filter(t => t.priority === 'urgent' && t.status !== 'resolved').length,
  }), [tickets, currentUserId]);

  const filtered = useMemo(() => {
    let list = tickets;
    if (tab === 'free') {
      list = list.filter(t => t.status === 'pending' && !t.acceptedBy);
    } else if (tab === 'mine') {
      list = list.filter(t => (t.acceptedBy?._id === currentUserId || t.acceptedBy === currentUserId) && t.status !== 'resolved');
    } else if (tab === 'all') {
      list = list.filter(t => t.status !== 'resolved');
    } else if (tab === 'resolved') {
      list = list.filter(t => t.status === 'resolved');
    }
    if (priorityFilter !== 'all') list = list.filter(t => t.priority === priorityFilter);
    if (categoryFilter !== 'all') list = list.filter(t => t.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.objet?.toLowerCase().includes(q) ||
        t.message?.toLowerCase().includes(q) ||
        t.nom?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q)
      );
    }
    // Trier : urgent d'abord, puis high, puis par date
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    return [...list].sort((a, b) => {
      const pa = priorityOrder[a.priority ?? 'normal'] ?? 2;
      const pb = priorityOrder[b.priority ?? 'normal'] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [tickets, tab, priorityFilter, categoryFilter, search, currentUserId]);

  const TabBtn = ({ id, label, count, icon: Icon, badge }) => {
    const active = tab === id;
    return (
      <button onClick={() => setTab(id)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', borderRadius: 8,
        border: `1px solid ${active ? PRIMARY : '#E2E8F0'}`,
        background: active ? PRIMARY : 'white',
        color: active ? 'white' : '#475569',
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        transition: 'all .15s',
      }}>
        <Icon size={14} /> {label}
        <span style={{ padding: '1px 8px', borderRadius: 999, fontSize: 11, background: active ? 'rgba(255,255,255,.22)' : '#F1F5F9', color: active ? 'white' : '#64748B' }}>
          {count}
        </span>
        {badge > 0 && (
          <span style={{ padding: '1px 6px', borderRadius: 999, fontSize: 10, background: '#DC2626', color: 'white', fontWeight: 700 }}>
            {badge} 🔴
          </span>
        )}
      </button>
    );
  };

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Header + stats */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E293B', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Ticket size={20} color={PRIMARY} /> Tickets support
          </h2>
          <button onClick={load} style={btnGhost}>
            <RefreshCw size={13} /> Rafraîchir
          </button>
        </div>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div style={{ ...cardStyle, padding: 14 }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Libres</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', marginTop: 2 }}>{counts.free}</div>
          </div>
          <div style={{ ...cardStyle, padding: 14 }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Mes tickets</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: PRIMARY, marginTop: 2 }}>{counts.mine}</div>
          </div>
          <div style={{ ...cardStyle, padding: 14 }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Urgents ouverts</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#DC2626', marginTop: 2 }}>{counts.urgent}</div>
          </div>
          <div style={{ ...cardStyle, padding: 14 }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Résolus</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#059669', marginTop: 2 }}>{counts.resolved}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <TabBtn id="free"     label="Libres"     count={counts.free}     icon={Inbox} badge={counts.urgent} />
          <TabBtn id="mine"     label="Mes tickets" count={counts.mine}    icon={ShieldCheck} />
          <TabBtn id="all"      label="Tous ouverts" count={counts.all}    icon={Ticket} />
          <TabBtn id="resolved" label="Résolus"    count={counts.resolved} icon={Check} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un ticket…"
              style={{ width: '100%', padding: '8px 10px 8px 30px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}
            />
          </div>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: 'white', cursor: 'pointer' }}>
            <option value="all">Toutes priorités</option>
            <option value="urgent">🔴 Urgent</option>
            <option value="high">⚡ Important</option>
            <option value="normal">• Normale</option>
            <option value="low">🔽 Faible</option>
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: 'white', cursor: 'pointer' }}>
            <option value="all">Toutes catégories</option>
            <option value="technique">🛠️ Technique</option>
            <option value="pedagogique">📚 Pédagogique</option>
            <option value="compte">👤 Compte</option>
            <option value="autre">📌 Autre</option>
          </select>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: '#94A3B8' }}>
          <Inbox size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
          <div>Aucun ticket dans cette vue.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(ticket => {
            const isUrgent = ticket.priority === 'urgent';
            const catMeta = TICKET_CATEGORY[ticket.category] || TICKET_CATEGORY.autre;
            return (
              <div
                key={ticket._id}
                onClick={() => setSelected(ticket)}
                style={{
                  ...cardStyle,
                  padding: 16,
                  cursor: 'pointer',
                  borderLeft: `4px solid ${isUrgent ? '#DC2626' : catMeta.color}`,
                  transition: 'transform .15s, box-shadow .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = SHADOW_MD; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = SHADOW; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <StatusPill status={ticket.status} />
                  <PriorityPill priority={ticket.priority || 'normal'} />
                  <span style={{ fontSize: 11, color: catMeta.color, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    {catMeta.emoji} {catMeta.label}
                  </span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>{ticket.objet}</div>
                <div style={{ fontSize: 13, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>{ticket.message}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#94A3B8', flexWrap: 'wrap' }}>
                  <span><UserIcon size={10} style={{ display: 'inline', marginRight: 3 }} />{ticket.nom} ({ticket.userId?.role || '—'})</span>
                  <span>•</span>
                  <span><Clock size={10} style={{ display: 'inline', marginRight: 3 }} />{new Date(ticket.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  {ticket.acceptedBy && (
                    <>
                      <span>•</span>
                      <span><ShieldCheck size={10} color="#0EA5E9" style={{ display: 'inline', marginRight: 3 }} />{ticket.acceptedBy.prenom} {ticket.acceptedBy.nom}</span>
                    </>
                  )}
                  {ticket.conversation?.length > 0 && (
                    <>
                      <span>•</span>
                      <span><MessageSquare size={10} style={{ display: 'inline', marginRight: 3 }} />{ticket.conversation.length} message{ticket.conversation.length > 1 ? 's' : ''}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <TicketConversationModal
          ticket={selected}
          currentUserId={currentUserId}
          onClose={() => setSelected(null)}
          onRefresh={load}
        />
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const section = searchParams.get('section') || 'overview';

  const setSection = (s) => {
    if (s === 'overview') setSearchParams({});
    else setSearchParams({ section: s });
  };

  return (
    <Layout title="Administration">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: PRIMARY + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color={PRIMARY} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1E293B' }}>Administration</h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>Panneau de gestion FlipLearn</p>
          </div>
        </div>

        {/* Tab navigation */}
        <div style={{
          display: 'flex', gap: '2px', marginBottom: '24px', marginTop: '16px',
          borderBottom: '2px solid #E2E8F0', overflowX: 'auto',
        }}>
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <button key={s.id} onClick={() => setSection(s.id)} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 18px', background: 'none', border: 'none',
                borderBottom: active ? `2px solid ${PRIMARY}` : '2px solid transparent',
                marginBottom: '-2px', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '13px', fontWeight: active ? 700 : 500,
                color: active ? PRIMARY : '#64748B', transition: 'color 0.15s',
                whiteSpace: 'nowrap',
              }}>
                <Icon size={15} />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {section === 'overview' && <OverviewSection onNavigate={setSection} />}
        {section === 'users' && <UsersSection />}
        {section === 'courses' && <CoursesSection />}
        {section === 'messages' && <MessagesSection />}
        {section === 'activity' && <ActivitySection />}
        {section === 'support' && <SupportSection />}
        {section === 'rewards' && <RewardsAdminSection />}
        {section === 'pending' && <PendingUsersSection />}
      </div>
    </Layout>
  );
}

/* ─── PendingUsersSection ──────────────────────────────────────────── */
function PendingUsersSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(null);

  const FILIERE_META = {
    ISIL:                    { label: 'ISIL',       color: '#1B4F72', bg: '#DBEAFE' },
    Management:              { label: 'Management', color: '#D97706', bg: '#FEF3C7' },
    'Finance & Comptabilité':{ label: 'Finance',    color: '#059669', bg: '#D1FAE5' },
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/pending');
      setUsers(data);
    } catch {
      setUsers([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (userId) => {
    setProcessing(userId);
    try {
      await api.put(`/auth/users/${userId}/approve`);
      await load();
    } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
    finally { setProcessing(null); }
  };

  const reject = async () => {
    if (!rejectModal) return;
    setProcessing(rejectModal);
    try {
      await api.put(`/auth/users/${rejectModal}/reject`, { reason });
      setRejectModal(null); setReason('');
      await load();
    } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
    finally { setProcessing(null); }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E293B', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <UserCheck size={20} color={PRIMARY} /> Inscriptions en attente
          {users.length > 0 && (
            <span style={{ padding: '2px 10px', background: '#FEF3C7', color: '#92400E', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
              {users.length}
            </span>
          )}
        </h2>
        <button onClick={load} style={btnGhost}>
          <RefreshCw size={13} /> Rafraîchir
        </button>
      </div>

      {users.length === 0 ? (
        <div style={{ ...cardStyle, padding: 48, textAlign: 'center', color: '#94A3B8' }}>
          <UserCheck size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div style={{ fontSize: 14 }}>Aucune inscription en attente. 🎉</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.map(u => {
            const filiereMeta = FILIERE_META[u.filiere] || { label: u.filiere || '—', color: '#64748B', bg: '#F1F5F9' };
            return (
              <div key={u._id} style={{ ...cardStyle, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${filiereMeta.color}, ${filiereMeta.color}dd)`,
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, flexShrink: 0,
                }}>
                  {(u.prenom?.[0] || '') + (u.nom?.[0] || '')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginBottom: 3 }}>
                    {u.prenom} {u.nom}
                    <span style={{
                      marginLeft: 8, padding: '2px 10px',
                      background: u.role === 'professeur' ? '#EDE9FE' : '#D1FAE5',
                      color: u.role === 'professeur' ? '#6D28D9' : '#065F46',
                      fontSize: 11, fontWeight: 700, borderRadius: 6,
                    }}>
                      {u.role === 'professeur' ? 'Prof' : 'Étudiant'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
                    <Mail size={11} style={{ display: 'inline', marginRight: 4 }} /> {u.email}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ padding: '2px 10px', background: filiereMeta.bg, color: filiereMeta.color, fontSize: 11, fontWeight: 700, borderRadius: 6 }}>
                      {filiereMeta.label}
                    </span>
                    <span style={{ fontSize: 11, color: '#64748B' }}>{u.promotion || '—'}</span>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>
                      • Inscrit le {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => approve(u._id)}
                    disabled={processing === u._id}
                    style={{ ...btnPrimary, background: '#059669', opacity: processing === u._id ? 0.6 : 1 }}
                  >
                    <Check size={13} /> Valider
                  </button>
                  <button
                    onClick={() => setRejectModal(u._id)}
                    disabled={processing === u._id}
                    style={{ ...btnGhost, color: '#DC2626', borderColor: '#FCA5A5' }}
                  >
                    <X size={13} /> Refuser
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rejectModal && (
        <div onClick={() => !processing && setRejectModal(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalCard, padding: 24 }}>
            <h3 style={{ margin: 0, marginBottom: 14, fontSize: 17, fontWeight: 700, color: '#1E293B' }}>
              Refuser cette inscription
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0, marginBottom: 14 }}>
              L'utilisateur recevra un email avec la raison du refus. Il ne pourra pas se connecter.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Raison du refus (optionnel mais recommandé)…"
              rows={3}
              style={{ width: '100%', padding: 10, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', marginBottom: 12 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setRejectModal(null)} disabled={processing} style={btnGhost}>Annuler</button>
              <button onClick={reject} disabled={processing} style={{ ...btnPrimary, background: '#DC2626' }}>
                <X size={13} /> Refuser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── RewardsAdminSection ──────────────────────────────────────────── */
const REWARD_CLAIM_STATUS = {
  pending:   { label: 'En attente', color: '#D97706', bg: '#FEF3C7' },
  approved:  { label: 'Approuvé',   color: '#0EA5E9', bg: '#E0F2FE' },
  delivered: { label: 'Livré',      color: '#059669', bg: '#D1FAE5' },
  rejected:  { label: 'Refusé',     color: '#DC2626', bg: '#FEE2E2' },
};

function RewardsAdminSection() {
  const [claims, setClaims] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processing, setProcessing] = useState(null);
  const [code, setCode] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: cs }, { data: rs }] = await Promise.all([
        api.get('/rewards/claims'),
        api.get('/rewards'),
      ]);
      setClaims(cs); setRewards(rs);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const processClaim = async (claimId, status) => {
    try {
      await api.put(`/rewards/claims/${claimId}`, { status, adminNote: note, code });
      setProcessing(null);
      setCode(''); setNote('');
      await load();
    } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
  };

  const filtered = filter === 'all' ? claims : claims.filter(c => c.status === filter);

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E293B', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Gift size={20} color={PRIMARY} /> Récompenses & réclamations
        </h2>
        <button onClick={load} style={btnGhost}>
          <RefreshCw size={13} /> Rafraîchir
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ ...cardStyle, padding: 14 }}>
          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Catalogue</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', marginTop: 2 }}>{rewards.length}</div>
        </div>
        <div style={{ ...cardStyle, padding: 14 }}>
          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>En attente</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#D97706', marginTop: 2 }}>
            {claims.filter(c => c.status === 'pending').length}
          </div>
        </div>
        <div style={{ ...cardStyle, padding: 14 }}>
          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Approuvés</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0EA5E9', marginTop: 2 }}>
            {claims.filter(c => c.status === 'approved').length}
          </div>
        </div>
        <div style={{ ...cardStyle, padding: 14 }}>
          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Livrés</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#059669', marginTop: 2 }}>
            {claims.filter(c => c.status === 'delivered').length}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['pending', 'approved', 'delivered', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 12px', borderRadius: 999,
            border: `1px solid ${filter === f ? PRIMARY : '#E2E8F0'}`,
            background: filter === f ? PRIMARY : 'white',
            color: filter === f ? 'white' : '#475569',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {f === 'all' ? 'Toutes' : REWARD_CLAIM_STATUS[f]?.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: '#94A3B8' }}>
          <Package size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
          <div>Aucune réclamation dans ce filtre.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(claim => {
            const st = REWARD_CLAIM_STATUS[claim.status];
            const isProcessing = processing === claim._id;
            return (
              <div key={claim._id} style={{ ...cardStyle, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                    {claim.rewardId?.emoji || '🎁'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, borderRadius: 999 }}>
                        {st.label}
                      </span>
                      <span style={{ fontSize: 12, color: '#64748B' }}>
                        {new Date(claim.createdAt).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>{claim.rewardId?.titre}</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                      <UserIcon size={11} style={{ display: 'inline', marginRight: 3 }} />
                      {claim.userId?.prenom} {claim.userId?.nom} ({claim.userId?.email})
                      — {claim.pointsSpent} pts
                    </div>
                    {claim.userMessage && (
                      <div style={{ marginTop: 6, padding: 8, background: '#F8FAFC', borderRadius: 6, fontSize: 12, color: '#475569' }}>
                        💬 {claim.userMessage}
                      </div>
                    )}
                    {claim.code && (
                      <div style={{ marginTop: 4, fontSize: 12, fontFamily: 'monospace', color: '#059669' }}>
                        🎫 Code : <strong>{claim.code}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {claim.status === 'pending' && !isProcessing && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button onClick={() => { setProcessing(claim._id); setCode(''); setNote(''); }} style={btnPrimary}>
                      <Check size={13} /> Traiter
                    </button>
                    <button onClick={() => processClaim(claim._id, 'rejected')} style={{ ...btnGhost, color: '#DC2626', borderColor: '#FCA5A5' }}>
                      <X size={13} /> Refuser (rembourser)
                    </button>
                  </div>
                )}

                {claim.status === 'approved' && !isProcessing && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setProcessing(claim._id); setCode(''); setNote(''); }} style={{ ...btnPrimary, background: '#059669' }}>
                      <Check size={13} /> Marquer livré
                    </button>
                  </div>
                )}

                {isProcessing && (
                  <div style={{ marginTop: 10, padding: 12, background: '#F8FAFC', borderRadius: 8 }}>
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Code de réduction / lien / numéro (optionnel)"
                      style={{ width: '100%', padding: 8, fontSize: 13, border: '1px solid #E2E8F0', borderRadius: 6, marginBottom: 8, fontFamily: 'monospace' }}
                    />
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Note pour l'étudiant (optionnel)"
                      style={{ width: '100%', padding: 8, fontSize: 13, border: '1px solid #E2E8F0', borderRadius: 6, marginBottom: 8 }}
                    />
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => setProcessing(null)} style={btnGhost}>Annuler</button>
                      {claim.status === 'pending' && (
                        <button onClick={() => processClaim(claim._id, 'approved')} style={btnPrimary}>
                          ✅ Approuver
                        </button>
                      )}
                      <button onClick={() => processClaim(claim._id, 'delivered')} style={{ ...btnPrimary, background: '#059669' }}>
                        🎁 Livrer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
