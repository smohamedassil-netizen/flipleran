import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  ArrowLeft, Plus, Send, Clock, CheckCircle, AlertCircle, MessageSquare,
  User as UserIcon, ShieldCheck, X, Loader2, Filter,
} from 'lucide-react';

const STATUS_META = {
  pending:  { label: 'En attente', color: '#d97706', bg: '#fef3c7', Icon: Clock },
  accepted: { label: 'En cours',   color: '#0284c7', bg: '#dbeafe', Icon: MessageSquare },
  resolved: { label: 'Résolu',     color: '#059669', bg: '#d1fae5', Icon: CheckCircle },
  closed:   { label: 'Fermé',      color: '#64748b', bg: '#f1f5f9', Icon: X },
};

const PRIORITY_META = {
  urgent: { label: '🔴 Urgent',     color: '#dc2626' },
  high:   { label: '⚡ Important',  color: '#d97706' },
  normal: { label: 'Normale',       color: '#64748b' },
  low:    { label: 'Faible',        color: '#94a3b8' },
};

const CATEGORIES = [
  { value: 'technique',   label: 'Technique' },
  { value: 'pedagogique', label: 'Pédagogique' },
  { value: 'compte',      label: 'Compte' },
  { value: 'autre',       label: 'Autre' },
];

function Status({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.Icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: meta.bg, color: meta.color, fontSize: 12, fontWeight: 600, borderRadius: 999 }}>
      <Icon size={11} /> {meta.label}
    </span>
  );
}

function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ objet: '', message: '', priority: 'normal', category: 'autre' });
  const [sending, setSending] = useState(false);
  const user = JSON.parse(sessionStorage.getItem('fliplearn_user') || 'null');

  const submit = async () => {
    if (!form.objet.trim() || !form.message.trim()) return;
    setSending(true);
    try {
      await api.post('/support', {
        ...form,
        nom: `${user?.prenom || ''} ${user?.nom || ''}`.trim() || 'Utilisateur',
        email: user?.email || '',
      });
      onCreated();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    } finally {
      setSending(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1B4F72', margin: 0 }}>Nouveau ticket</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} color="#64748b" />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Objet *</label>
            <input value={form.objet} onChange={(e) => setForm({ ...form, objet: e.target.value })} placeholder="Résumé en une phrase" style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Catégorie</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, background: 'white' }}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Priorité</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, background: 'white' }}>
                <option value="low">Faible</option>
                <option value="normal">Normale</option>
                <option value="high">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Description *</label>
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} placeholder="Décris ton problème en détail..." style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} disabled={sending} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Annuler</button>
          <button onClick={submit} disabled={sending || !form.objet.trim() || !form.message.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: 'none', borderRadius: 8, background: '#1B4F72', color: 'white', cursor: sending ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
            {sending ? <Loader2 size={14} /> : <Send size={14} />}
            {sending ? 'Envoi…' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TicketDetail({ ticket, onClose, onRefresh }) {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/support/${ticket._id}/message`, { message: reply });
      setReply('');
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    } finally {
      setSending(false);
    }
  };

  const canReply = ticket.status !== 'closed';

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1B4F72', margin: 0 }}>{ticket.objet}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={18} color="#64748b" />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Status status={ticket.status} />
            {ticket.priority !== 'normal' && (
              <span style={{ fontSize: 12, fontWeight: 600, color: PRIORITY_META[ticket.priority]?.color }}>
                {PRIORITY_META[ticket.priority]?.label}
              </span>
            )}
            <span style={{ fontSize: 12, color: '#64748b' }}>{new Date(ticket.createdAt).toLocaleString('fr-FR')}</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* Message initial */}
          <div style={{ marginBottom: 16, padding: 14, background: '#f8fafc', borderRadius: 10, borderLeft: '3px solid #1B4F72' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', marginBottom: 6 }}>
              <UserIcon size={12} /> <strong>{ticket.nom}</strong>
            </div>
            <div style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{ticket.message}</div>
          </div>

          {/* Messages conversation */}
          {ticket.conversation?.map((msg, i) => {
            const isAdmin = msg.from === 'admin';
            return (
              <div key={msg._id || i} style={{
                marginBottom: 12, padding: 12, borderRadius: 10,
                background: isAdmin ? '#e0f2fe' : '#f8fafc',
                borderLeft: `3px solid ${isAdmin ? '#0284c7' : '#64748b'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                  {isAdmin ? <ShieldCheck size={12} color="#0284c7" /> : <UserIcon size={12} />}
                  <strong>{msg.authorId ? `${msg.authorId.prenom || ''} ${msg.authorId.nom || ''}`.trim() : (isAdmin ? 'Admin' : ticket.nom)}</strong>
                  <span style={{ marginLeft: 'auto' }}>{new Date(msg.createdAt).toLocaleString('fr-FR')}</span>
                </div>
                <div style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.message}</div>
              </div>
            );
          })}

          {ticket.status === 'resolved' && (
            <div style={{ padding: 12, background: '#d1fae5', borderRadius: 10, fontSize: 13, color: '#065f46', textAlign: 'center' }}>
              ✅ Ce ticket a été marqué comme résolu. Tu peux toujours répondre pour le rouvrir.
            </div>
          )}
        </div>

        {canReply && (
          <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Ta réponse…"
              rows={2}
              style={{ flex: 1, padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'none' }}
            />
            <button onClick={sendReply} disabled={sending || !reply.trim()} style={{ padding: '10px 16px', background: reply.trim() ? '#1B4F72' : '#cbd5e1', color: 'white', border: 'none', borderRadius: 8, cursor: sending || !reply.trim() ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
              <Send size={16} /> Envoyer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyTickets() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/support/mine');
      setTickets(data);
      // Rafraîchir le ticket sélectionné si ouvert
      if (selected) {
        const fresh = await api.get(`/support/${selected._id}`);
        setSelected(fresh.data);
      }
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = tickets.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'open') return t.status === 'pending' || t.status === 'accepted';
    if (filter === 'resolved') return t.status === 'resolved';
    return true;
  });

  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'pending' || t.status === 'accepted').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  const FilterBtn = ({ value, label, count }) => (
    <button onClick={() => setFilter(value)} style={{
      padding: '8px 14px', borderRadius: 999,
      border: `1px solid ${filter === value ? '#1B4F72' : '#e5e7eb'}`,
      background: filter === value ? '#1B4F72' : 'white',
      color: filter === value ? 'white' : '#1e293b',
      fontSize: 13, fontWeight: 600, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      {label}
      <span style={{ background: filter === value ? 'rgba(255,255,255,.25)' : '#f1f5f9', color: filter === value ? 'white' : '#64748b', padding: '1px 8px', borderRadius: 999, fontSize: 11 }}>{count}</span>
    </button>
  );

  return (
    <Layout title="Mes tickets">
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
          <ArrowLeft size={18} /> Retour
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <MessageSquare size={28} color="#1B4F72" />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B4F72', margin: 0, flex: 1 }}>Mes tickets de support</h1>
          <button onClick={() => setShowCreate(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: '#1B4F72', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <Plus size={14} /> Nouveau ticket
          </button>
        </div>
        <p style={{ color: '#64748b', marginBottom: 20 }}>Suis l'avancement de tes demandes et dialogue avec l'équipe support.</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <FilterBtn value="all"      label="Toutes"  count={counts.all} />
          <FilterBtn value="open"     label="Ouverts" count={counts.open} />
          <FilterBtn value="resolved" label="Résolus" count={counts.resolved} />
        </div>

        {loading && <p style={{ color: '#64748b' }}>Chargement…</p>}

        {!loading && filtered.length === 0 && (
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 48, textAlign: 'center' }}>
            <MessageSquare size={36} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <p style={{ color: '#64748b', marginBottom: 16 }}>Aucun ticket pour ce filtre.</p>
            <button onClick={() => setShowCreate(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#1B4F72', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              <Plus size={14} /> Créer un ticket
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(t => (
            <button key={t._id} onClick={() => setSelected(t)} style={{
              background: 'white', border: '1px solid #e5e7eb', borderRadius: 10,
              padding: 16, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
              transition: 'transform .15s, box-shadow .15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Status status={t.status} />
                  {t.priority !== 'normal' && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: PRIORITY_META[t.priority]?.color }}>
                      {PRIORITY_META[t.priority]?.label}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{t.objet}</div>
                <div style={{ fontSize: 13, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.message}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>Créé le {new Date(t.createdAt).toLocaleDateString('fr-FR')}</span>
                  {t.acceptedBy && <span>• Pris en charge par {t.acceptedBy.prenom} {t.acceptedBy.nom}</span>}
                  {t.conversation?.length > 0 && <span>• {t.conversation.length} message{t.conversation.length > 1 ? 's' : ''}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>

        {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={load} />}
        {selected && <TicketDetail ticket={selected} onClose={() => setSelected(null)} onRefresh={load} />}
      </div>
    </Layout>
  );
}
