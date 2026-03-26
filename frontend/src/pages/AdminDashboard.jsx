import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users, BookOpen, Video, MessageSquare, Shield, Activity,
  ToggleLeft, ToggleRight, Trash2, PlusCircle, AlertCircle,
  Search, Check, X, Edit2, BarChart2, UserPlus, ChevronDown,
  Clock, TrendingUp, TrendingDown, Eye, Mail, Filter,
  MoreHorizontal, RefreshCw, Download,
} from 'lucide-react';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';

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
        <button style={btnPrimary} onClick={() => setCreateModal(true)}>
          <UserPlus size={15} /> Créer un utilisateur
        </button>
      </div>

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
            <div style={{ fontWeight: 600, color: '#1E293B' }}>{user.prenom} {user.nom}</div>
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
      </div>
    </Layout>
  );
}
