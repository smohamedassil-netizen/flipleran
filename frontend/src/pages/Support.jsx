import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  ArrowLeft, HelpCircle, ChevronDown, ChevronUp, Send, Plus, Clock,
  CheckCircle, MessageSquare, X, Loader2, User as UserIcon, ShieldCheck,
  Mail, MapPin, Phone, Ticket, AlertCircle,
} from 'lucide-react';

/* ─── FAQ ────────────────────────────────────────────────────────────── */
const FAQ_ITEMS = [
  { q: "Comment accéder à mes modules ?", a: "Connectez-vous avec votre compte étudiant, puis cliquez sur 'Mes modules' dans le menu latéral. Vous verrez tous les cours auxquels vous êtes inscrit." },
  { q: "Comment passer un QCM ?", a: "Allez sur un cours, sélectionnez une capsule, regardez-la jusqu'à au moins 80%, puis cliquez sur 'Passer le QCM' qui apparaîtra." },
  { q: "Comment contacter mon professeur ?", a: "Utilisez la messagerie intégrée. Allez dans 'Messages' dans le menu, puis sélectionnez votre professeur pour démarrer une conversation privée." },
  { q: "Comment gagner des badges ?", a: "Les badges sont attribués automatiquement selon vos performances : complétion de capsules, scores aux QCM, régularité, etc. Consultez votre profil pour voir vos badges." },
  { q: "Le professeur peut-il voir ma progression ?", a: "Oui, le professeur a accès à un tableau de bord avec les statistiques de progression de chaque étudiant : capsules regardées, scores QCM, temps passé." },
  { q: "Comment utiliser le chatbot IA ?", a: "Chaque cours a son propre assistant IA spécialisé. Ouvrez un cours et cliquez sur '🤖 Assistant IA du module' — il connaît le contenu de ce module." },
];

/* ─── Meta ───────────────────────────────────────────────────────────── */
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
  { value: 'technique',   label: '🛠️ Technique' },
  { value: 'pedagogique', label: '📚 Pédagogique' },
  { value: 'compte',      label: '👤 Compte' },
  { value: 'autre',       label: '📌 Autre' },
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

/* ─── Modal création ticket ─────────────────────────────────────────── */
function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ objet: '', message: '', priority: 'normal', category: 'autre' });
  const [sending, setSending] = useState(false);
  const user = (() => { try { return JSON.parse(sessionStorage.getItem('fliplearn_user') || 'null'); } catch { return null; } })();

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
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: 14, padding: 24, width: '100%', maxWidth: 520, boxShadow: '0 20px 50px rgba(0,0,0,.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1B4F72', margin: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Ticket size={20} /> Nouveau ticket
          </h3>
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
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} placeholder="Décris ton problème en détail. Plus c'est précis, plus vite on te répond !" style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} disabled={sending} style={{ padding: '9px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Annuler</button>
          <button onClick={submit} disabled={sending || !form.objet.trim() || !form.message.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', border: 'none', borderRadius: 8, background: '#1B4F72', color: 'white', cursor: sending || !form.objet.trim() || !form.message.trim() ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: sending || !form.objet.trim() || !form.message.trim() ? 0.6 : 1 }}>
            {sending ? <Loader2 size={14} /> : <Send size={14} />}
            {sending ? 'Envoi…' : 'Créer le ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal détail ticket ───────────────────────────────────────────── */
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
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,.15)' }}>
        <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1B4F72', margin: 0 }}>{ticket.objet}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={18} color="#64748b" />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Status status={ticket.status} />
            {ticket.priority !== 'normal' && (
              <span style={{ fontSize: 12, fontWeight: 600, color: PRIORITY_META[ticket.priority]?.color }}>
                {PRIORITY_META[ticket.priority]?.label}
              </span>
            )}
            <span style={{ fontSize: 12, color: '#94a3b8' }}>•</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>{new Date(ticket.createdAt).toLocaleString('fr-FR')}</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div style={{ marginBottom: 16, padding: 14, background: '#f8fafc', borderRadius: 10, borderLeft: '3px solid #1B4F72' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', marginBottom: 6 }}>
              <UserIcon size={12} /> <strong>{ticket.nom}</strong>
            </div>
            <div style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{ticket.message}</div>
          </div>

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
            <div style={{ padding: 12, background: '#d1fae5', borderRadius: 10, fontSize: 13, color: '#065f46', textAlign: 'center', display: 'inline-flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center' }}>
              <CheckCircle size={14} /> Ce ticket a été résolu. Tu peux toujours répondre pour le rouvrir.
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
            <button onClick={sendReply} disabled={sending || !reply.trim()} style={{ padding: '10px 16px', background: reply.trim() && !sending ? '#1B4F72' : '#cbd5e1', color: 'white', border: 'none', borderRadius: 8, cursor: sending || !reply.trim() ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
              <Send size={16} /> Envoyer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Page principale ────────────────────────────────────────────────── */
export default function Support() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const { data } = await api.get('/support/mine');
      setTickets(data);
      if (selected) {
        const fresh = await api.get(`/support/${selected._id}`);
        setSelected(fresh.data);
      }
    } catch {
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => { loadTickets(); }, []);

  const filtered = tickets.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'open') return t.status === 'pending' || t.status === 'accepted';
    if (filter === 'resolved') return t.status === 'resolved';
    return true;
  });

  const counts = {
    all:      tickets.length,
    open:     tickets.filter(t => t.status === 'pending' || t.status === 'accepted').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  const FilterPill = ({ value, label, count }) => (
    <button onClick={() => setFilter(value)} style={{
      padding: '7px 14px', borderRadius: 999,
      border: `1px solid ${filter === value ? '#1B4F72' : '#e5e7eb'}`,
      background: filter === value ? '#1B4F72' : 'white',
      color: filter === value ? 'white' : '#1e293b',
      fontSize: 13, fontWeight: 600, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      {label}
      <span style={{ background: filter === value ? 'rgba(255,255,255,.22)' : '#f1f5f9', color: filter === value ? 'white' : '#64748b', padding: '1px 8px', borderRadius: 999, fontSize: 11 }}>{count}</span>
    </button>
  );

  return (
    <Layout title="Aide & Support">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
          <ArrowLeft size={18} /> Retour
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <HelpCircle size={28} color="#1B4F72" />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B4F72', margin: 0 }}>Aide & Support</h1>
        </div>
        <p style={{ color: '#64748b', marginBottom: 24 }}>
          Trouve des réponses aux questions courantes, ou crée un ticket pour discuter avec l'équipe.
        </p>

        {/* ─── Section 1 : FAQ ───────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1B4F72', marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <HelpCircle size={18} /> Questions fréquentes
          </h2>
          <div>
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderTop: i > 0 ? 'none' : '1px solid #e5e7eb',
                borderRadius: i === 0
                  ? '12px 12px 0 0'
                  : i === FAQ_ITEMS.length - 1 ? '0 0 12px 12px' : 0,
                overflow: 'hidden',
              }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}>
                  <span style={{ fontWeight: 500, color: '#1e293b', fontSize: 14 }}>{item.q}</span>
                  {openFaq === i ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 20px 14px', color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ─── Section 2 : Mes tickets (ex-Contact) ──────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1B4F72', margin: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Ticket size={18} /> Mes tickets
            </h2>
            <button onClick={() => setShowCreate(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#1B4F72', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, boxShadow: '0 2px 8px rgba(27,79,114,.25)' }}>
              <Plus size={14} /> Nouveau ticket
            </button>
          </div>

          {tickets.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <FilterPill value="all"      label="Tous"     count={counts.all} />
              <FilterPill value="open"     label="Ouverts"  count={counts.open} />
              <FilterPill value="resolved" label="Résolus"  count={counts.resolved} />
            </div>
          )}

          {loadingTickets && <p style={{ color: '#94a3b8', fontSize: 14 }}>Chargement…</p>}

          {!loadingTickets && tickets.length === 0 && (
            <div style={{ background: 'white', border: '1px dashed #cbd5e1', borderRadius: 12, padding: 32, textAlign: 'center' }}>
              <Ticket size={32} color="#cbd5e1" style={{ marginBottom: 10 }} />
              <p style={{ color: '#64748b', fontSize: 14, margin: 0, marginBottom: 14 }}>
                Aucun ticket pour le moment. Besoin d'aide ? Crée-en un !
              </p>
              <button onClick={() => setShowCreate(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#1B4F72', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <Plus size={14} /> Créer un ticket
              </button>
            </div>
          )}

          {!loadingTickets && filtered.length === 0 && tickets.length > 0 && (
            <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: 24 }}>
              Aucun ticket pour ce filtre.
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(t => (
              <button key={t._id} onClick={() => setSelected(t)} style={{
                background: 'white', border: '1px solid #e5e7eb', borderRadius: 10,
                padding: 14, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                transition: 'transform .15s, box-shadow .15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <Status status={t.status} />
                    {t.priority !== 'normal' && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: PRIORITY_META[t.priority]?.color }}>
                        {PRIORITY_META[t.priority]?.label}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 3 }}>{t.objet}</div>
                  <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.message}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span>Créé le {new Date(t.createdAt).toLocaleDateString('fr-FR')}</span>
                    {t.acceptedBy && <span>• Pris par {t.acceptedBy.prenom} {t.acceptedBy.nom}</span>}
                    {t.conversation?.length > 0 && <span>• {t.conversation.length} message{t.conversation.length > 1 ? 's' : ''}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Section 3 : Coordonnées discrètes ─────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 32 }}>
          <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mail size={16} color="#1B4F72" />
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Email</div>
              <div style={{ fontSize: 13, color: '#1e293b' }}>support@fliplearn.dz</div>
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Phone size={16} color="#1B4F72" />
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Téléphone</div>
              <div style={{ fontSize: 13, color: '#1e293b' }}>+213 (0) 23 XX XX XX</div>
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <MapPin size={16} color="#1B4F72" />
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Adresse</div>
              <div style={{ fontSize: 13, color: '#1e293b' }}>EM Alger — Alger, Algérie</div>
            </div>
          </div>
        </div>

        {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={loadTickets} />}
        {selected && <TicketDetail ticket={selected} onClose={() => setSelected(null)} onRefresh={loadTickets} />}
      </div>
    </Layout>
  );
}
