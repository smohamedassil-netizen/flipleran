import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  ArrowLeft, Send, Bot, Sparkles, BookOpen, Settings, X, Save, Loader2,
} from 'lucide-react';

const TON_OPTIONS = [
  { value: 'pedagogue', label: 'Pédagogue (patient, bienveillant)' },
  { value: 'strict',    label: 'Strict (exigeant, rigoureux)' },
  { value: 'fun',       label: 'Fun (dynamique, amical)' },
  { value: 'expert',    label: 'Expert (technique, précis)' },
];

const AVATAR_OPTIONS = ['🤖', '🧠', '🎓', '📚', '💻', '🧪', '🔬', '⚙️', '🧮', '🎨'];

function Bubble({ message, persona }) {
  const isBot = message.type === 'bot';
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexDirection: isBot ? 'row' : 'row-reverse', alignItems: 'flex-start' }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: isBot ? persona.couleur : '#e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, color: 'white',
      }}>
        {isBot ? persona.avatar : '👤'}
      </div>
      <div style={{
        maxWidth: '75%',
        background: isBot ? 'white' : persona.couleur,
        color: isBot ? '#1e293b' : 'white',
        padding: '10px 14px',
        borderRadius: isBot ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
        border: isBot ? '1px solid #e5e7eb' : 'none',
        fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {message.content}
      </div>
    </div>
  );
}

function PersonaEditor({ persona, courseId, onClose, onSaved }) {
  const [form, setForm] = useState({
    nom: persona.nom || '',
    specialite: persona.specialite || '',
    avatar: persona.avatar || '🤖',
    ton: persona.ton || 'pedagogue',
    description: persona.description || '',
    couleur: persona.couleur || '#1B4F72',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/courses/${courseId}/ai-persona`, form);
      onSaved(form);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1B4F72', margin: 0 }}>Configurer l'assistant IA</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} color="#64748b" />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Nom de l'assistant</label>
            <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Algo-Bot, Web-Master..." style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Spécialité</label>
            <input value={form.specialite} onChange={(e) => setForm({ ...form, specialite: e.target.value })} placeholder="Ex: Algorithmique, Développement Web..." style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Avatar</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {AVATAR_OPTIONS.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setForm({ ...form, avatar: a })}
                  style={{ width: 40, height: 40, fontSize: 20, borderRadius: 8, border: form.avatar === a ? `2px solid ${form.couleur}` : '1px solid #e5e7eb', background: form.avatar === a ? '#f0f9ff' : 'white', cursor: 'pointer' }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Ton</label>
            <select value={form.ton} onChange={(e) => setForm({ ...form, ton: e.target.value })} style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, background: 'white' }}>
              {TON_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Couleur</label>
            <input type="color" value={form.couleur} onChange={(e) => setForm({ ...form, couleur: e.target.value })} style={{ width: 60, height: 40, border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Description d'accueil</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Message affiché aux étudiants à leur premier contact..." style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Annuler</button>
          <button onClick={save} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: 'none', borderRadius: 8, background: '#1B4F72', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Sauvegarde…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ModuleAssistant() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const messagesEndRef = useRef(null);

  const [persona, setPersona] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const user = (() => {
    try { return JSON.parse(sessionStorage.getItem('fliplearn_user') || 'null'); }
    catch { return null; }
  })();
  const canConfigure = user && (user.role === 'professeur' || user.role === 'admin');

  useEffect(() => {
    loadAssistant();
  }, [courseId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadAssistant = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/chatbot/module/${courseId}`);
      setPersona(data.persona);
      setMessages(data.history || []);
      if ((data.history || []).length === 0 && data.persona?.description) {
        setMessages([{ _id: 'welcome', type: 'bot', content: data.persona.description, createdAt: new Date().toISOString() }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const userMsg = { _id: `u_${Date.now()}`, type: 'text', content: text, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);
    try {
      const { data } = await api.post(`/chatbot/module/${courseId}/message`, { message: text });
      setMessages(prev => [...prev, {
        _id: data.messageId,
        type: 'bot',
        content: data.response,
        createdAt: new Date().toISOString(),
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        _id: `err_${Date.now()}`,
        type: 'bot',
        content: "Désolé, je rencontre un problème. Réessaie dans un instant.",
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (loading) {
    return (
      <Layout title="Assistant IA du module">
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
          <Loader2 size={32} style={{ margin: '0 auto 12px' }} /> Chargement de l'assistant…
        </div>
      </Layout>
    );
  }

  if (!persona) {
    return (
      <Layout title="Assistant IA du module">
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
          Module introuvable.
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`Assistant — ${persona.courseTitle}`}>
      <div style={{ maxWidth: 900, margin: '0 auto', height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
          <ArrowLeft size={18} /> Retour
        </button>

        {/* En-tête persona */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: 20,
          background: `linear-gradient(135deg, ${persona.couleur}, ${persona.couleur}dd)`,
          borderRadius: 14, color: 'white', marginBottom: 16, flexShrink: 0,
        }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
            {persona.avatar}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Sparkles size={14} />
              <span style={{ fontSize: 12, opacity: .9, textTransform: 'uppercase', letterSpacing: 1 }}>
                {canConfigure ? 'Assistant IA dédié' : 'Assistant IA configuré par votre professeur'}
              </span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 2 }}>{persona.nom}</h2>
            <div style={{ fontSize: 13, opacity: .9, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <BookOpen size={12} /> {persona.specialite}
              {persona.ton && (
                <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,.2)', borderRadius: 10, fontSize: 11 }}>
                  ton {persona.ton}
                </span>
              )}
            </div>
          </div>
          {canConfigure && (
            <button
              onClick={() => setShowEditor(true)}
              title="Configurer l'assistant"
              aria-label="Configurer le persona de l'assistant IA"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 8, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              <Settings size={14} /> Configurer
            </button>
          )}
        </div>

        {/* Encart description (visible étudiant pour comprendre le contexte) */}
        {!canConfigure && persona.description && (
          <div style={{
            padding: '10px 14px', marginBottom: 12, borderRadius: 10,
            background: 'var(--color-primary-light)',
            borderLeft: `3px solid ${persona.couleur}`,
            fontSize: 12, color: 'var(--color-text)', lineHeight: 1.5, flexShrink: 0,
          }}>
            <strong>À propos de {persona.nom} :</strong> {persona.description}
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          {messages.map(m => <Bubble key={m._id} message={m} persona={persona} />)}
          {sending && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: persona.couleur, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'white' }}>
                {persona.avatar}
              </div>
              <div style={{ padding: '10px 14px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px 12px 12px 2px', fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>
                <span className="typing">réfléchit</span>…
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: 8, padding: 12, background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, marginTop: 12, flexShrink: 0 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder={`Pose une question à ${persona.nom}…`}
            rows={1}
            style={{ flex: 1, padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'none', minHeight: 40, maxHeight: 120 }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            style={{
              padding: '10px 16px',
              background: input.trim() && !sending ? persona.couleur : '#cbd5e1',
              color: 'white', border: 'none', borderRadius: 8,
              cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600,
            }}
          >
            <Send size={16} /> Envoyer
          </button>
        </div>

        {showEditor && (
          <PersonaEditor
            persona={persona}
            courseId={courseId}
            onClose={() => setShowEditor(false)}
            onSaved={(updated) => setPersona({ ...persona, ...updated })}
          />
        )}
      </div>
    </Layout>
  );
}
