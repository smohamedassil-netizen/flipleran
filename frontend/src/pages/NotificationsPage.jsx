import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import {
  ArrowLeft, Bell, Check, CheckCheck, Trash2, ExternalLink,
  AlertCircle, Info, Video as VideoIcon, FileText, FolderKanban, MessageSquare, Clock,
} from 'lucide-react';

const TYPE_META = {
  reminder_qcm:     { icon: FileText,     color: '#1B4F72', bg: '#dbeafe' },
  reminder_video:   { icon: VideoIcon,    color: '#7c3aed', bg: '#ede9fe' },
  reminder_project: { icon: FolderKanban, color: '#c2410c', bg: '#ffedd5' },
  reminder_manual:  { icon: Bell,         color: '#0284c7', bg: '#e0f2fe' },
  ticket_update:    { icon: AlertCircle,  color: '#0ea5e9', bg: '#e0f2fe' },
  project_status:   { icon: FolderKanban, color: '#059669', bg: '#d1fae5' },
  message:          { icon: MessageSquare,color: '#6366f1', bg: '#e0e7ff' },
  urgent:           { icon: AlertCircle,  color: '#dc2626', bg: '#fee2e2' },
  warning:          { icon: AlertCircle,  color: '#d97706', bg: '#fef3c7' },
  success:          { icon: Check,        color: '#059669', bg: '#d1fae5' },
  info:             { icon: Info,         color: '#0284c7', bg: '#e0f2fe' },
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const {
    notifications, unreadCount, loading,
    fetchNotifications, markAsRead, markAllRead, deleteNotification, clearAll,
  } = useNotifications();
  const [filter, setFilter] = useState('all'); // all | unread | reminder

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const filtered = useMemo(() => {
    if (filter === 'unread') return notifications.filter(n => !n.read);
    if (filter === 'reminder') return notifications.filter(n => (n.type || '').startsWith('reminder_'));
    return notifications;
  }, [notifications, filter]);

  const handleOpen = async (notif) => {
    if (!notif.read) await markAsRead(notif._id);
    if (notif.link) navigate(notif.link);
  };

  const FilterBtn = ({ value, label, count }) => (
    <button
      onClick={() => setFilter(value)}
      style={{
        padding: '8px 14px',
        borderRadius: 999,
        border: `1px solid ${filter === value ? '#1B4F72' : '#e5e7eb'}`,
        background: filter === value ? '#1B4F72' : 'white',
        color: filter === value ? 'white' : '#1e293b',
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}
    >
      {label}
      {count != null && (
        <span style={{
          background: filter === value ? 'rgba(255,255,255,.25)' : '#f1f5f9',
          color: filter === value ? 'white' : '#64748b',
          padding: '1px 8px', borderRadius: 999, fontSize: 11,
        }}>{count}</span>
      )}
    </button>
  );

  return (
    <Layout title="Notifications">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
          <ArrowLeft size={18} /> Retour
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <Bell size={28} color="#1B4F72" />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B4F72', margin: 0, flex: 1 }}>Notifications</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: 'white', color: '#1e293b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <CheckCheck size={14} /> Tout marquer lu
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={clearAll} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #fecaca', borderRadius: 8, background: 'white', color: '#b91c1c', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Trash2 size={14} /> Tout supprimer
              </button>
            )}
          </div>
        </div>
        <p style={{ color: '#64748b', marginBottom: 24 }}>
          {unreadCount > 0 ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}` : 'Aucune notification non lue'}
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <FilterBtn value="all"      label="Toutes"     count={notifications.length} />
          <FilterBtn value="unread"   label="Non lues"   count={unreadCount} />
          <FilterBtn value="reminder" label="Rappels"    count={notifications.filter(n => (n.type || '').startsWith('reminder_')).length} />
        </div>

        {loading && <p style={{ color: '#64748b' }}>Chargement…</p>}

        {!loading && filtered.length === 0 && (
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 48, textAlign: 'center' }}>
            <Bell size={36} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <p style={{ color: '#64748b', margin: 0 }}>{'Aucune notification pour le moment'}</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(notif => {
            const meta = TYPE_META[notif.type] || TYPE_META.info;
            const Icon = meta.icon;
            return (
              <div
                key={notif._id}
                style={{
                  display: 'flex', gap: 12, padding: 16,
                  background: notif.read ? 'white' : '#f8fafc',
                  border: notif.read ? '1px solid #e5e7eb' : '1px solid #bfdbfe',
                  borderLeft: `4px solid ${notif.priority === 'urgent' ? '#dc2626' : notif.priority === 'high' ? '#d97706' : meta.color}`,
                  borderRadius: 10,
                  cursor: notif.link ? 'pointer' : 'default',
                  transition: 'transform .15s',
                }}
                onClick={() => handleOpen(notif)}
                onMouseEnter={e => { if (notif.link) e.currentTarget.style.transform = 'translateX(2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 8, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} color={meta.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {notif.title && <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>{notif.title}</div>}
                  <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.5, wordBreak: 'break-word' }}>{notif.message}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, fontSize: 12, color: '#94a3b8' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> {timeAgo(notif.createdAt)}</span>
                    {notif.priority === 'urgent' && <span style={{ color: '#dc2626', fontWeight: 600 }}>🔴 URGENT</span>}
                    {notif.priority === 'high' && <span style={{ color: '#d97706', fontWeight: 600 }}>⚡ Important</span>}
                    {notif.link && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><ExternalLink size={11} /> Ouvrir</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {!notif.read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markAsRead(notif._id); }}
                      title="Marquer comme lu"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: '#1B4F72' }}
                    >
                      <Check size={14} />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotification(notif._id); }}
                    title="Supprimer"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: '#94a3b8' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
