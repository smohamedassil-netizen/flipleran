import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import {
  Search, MessageSquare, User, Users,
  BookOpen, GraduationCap, ChevronRight,
  ArrowLeft,
} from 'lucide-react';

/* ─── Role config ──────────────────────────────────────────────────────── */
const ROLE_CONFIG = {
  etudiant:   { label: 'Étudiant',   color: '#10B981', bg: '#F0FFF4', icon: GraduationCap },
  professeur: { label: 'Professeur', color: '#E8A838', bg: '#FEF6E7', icon: BookOpen },
  admin:      { label: 'Admin',      color: '#EF4444', bg: '#FFF5F5', icon: User },
};

/* ─── Contact card ─────────────────────────────────────────────────────── */
function ContactCard({ contact, onClick }) {
  const cfg = ROLE_CONFIG[contact.role] ?? ROLE_CONFIG.etudiant;
  const initials = `${contact.prenom?.[0] ?? ''}${contact.nom?.[0] ?? ''}`.toUpperCase();

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color 120ms, box-shadow 120ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-bg)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-surface)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 42, height: 42, flexShrink: 0,
          borderRadius: '50%',
          backgroundColor: cfg.bg,
          border: `2px solid ${cfg.color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 14, color: cfg.color,
        }}
      >
        {initials || '?'}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)', margin: 0 }}>
          {contact.prenom} {contact.nom}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 8px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: cfg.bg, color: cfg.color,
          }}>
            {cfg.label}
          </span>
          {contact.filiere && (
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              {contact.filiere}
            </span>
          )}
        </div>
        {contact.lastMessage && (
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {contact.lastMessage.isMe ? 'Vous : ' : ''}{contact.lastMessage.content}
          </p>
        )}
      </div>

      <MessageSquare size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ChatContacts
═══════════════════════════════════════════════════════════════════════════ */
export default function ChatContacts() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');

  useEffect(() => {
    api.get('/messages/contacts')
      .then(({ data }) => setContacts(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* ── Filtered contacts ──────────────────────────────────────────────── */
  const filtered = contacts.filter((c) => {
    if (filter !== 'all' && c.role !== filter) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      c.nom?.toLowerCase().includes(s) ||
      c.prenom?.toLowerCase().includes(s) ||
      c.email?.toLowerCase().includes(s)
    );
  });

  const profCount = contacts.filter(c => c.role === 'professeur').length;
  const stuCount  = contacts.filter(c => c.role === 'etudiant').length;

  return (
    <Layout title="Messages">
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <button onClick={() => navigate('/')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
          <ArrowLeft size={18} /> Retour
        </button>
        <div className="page-header">
          <h1 className="page-title">Messages</h1>
          <p className="page-subtitle">Discutez avec vos camarades et professeurs. Pour une aide IA spécifique à un cours, ouvrez le cours et utilisez son Assistant Module.</p>
        </div>

        {/* ── Search + filters ────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-disabled)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 36 }}
              placeholder="Rechercher un contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { key: 'all', label: 'Tous' },
              { key: 'professeur', label: `Professeurs (${profCount})` },
              { key: 'etudiant', label: `Étudiants (${stuCount})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${filter === key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  backgroundColor: filter === key ? 'var(--color-primary-light)' : 'transparent',
                  color: filter === key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Contacts list ───────────────────────────────────────────── */}
        {loading && (
          <div className="empty-state" style={{ padding: 40 }}>
            <p className="text-small">Chargement des contacts...</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="empty-state" style={{ padding: 40 }}>
            <Users size={32} className="empty-state-icon" />
            <p className="empty-state-title">Aucun contact trouvé</p>
            <p className="empty-state-desc">
              {search ? 'Essayez un autre terme de recherche.' : 'Aucun contact disponible.'}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((contact) => (
              <ContactCard
                key={contact._id}
                contact={contact}
                onClick={() => navigate(`/chat/private/${contact._id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
