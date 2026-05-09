import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api.js';
import { Bot, X, Send, Loader, ArrowUpRight } from 'lucide-react';

/**
 * TutorBubble — Bouton flottant en bas à droite (visible sur toutes les
 * pages étudiant). Cliqué, ouvre une mini-fenêtre chat (320×420px) avec
 * un contexte automatique selon la page courante.
 *
 * Visible uniquement pour le rôle 'etudiant'.
 */
export default function TutorBubble() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Récupère le user depuis sessionStorage
  useEffect(() => {
    try {
      const u = JSON.parse(sessionStorage.getItem('fliplearn_user') || 'null');
      setUser(u);
    } catch {}
    const handler = () => {
      try { setUser(JSON.parse(sessionStorage.getItem('fliplearn_user') || 'null')); }
      catch { setUser(null); }
    };
    window.addEventListener('fliplearn:user-changed', handler);
    return () => window.removeEventListener('fliplearn:user-changed', handler);
  }, []);

  // Message d'accueil contextuel selon la page actuelle
  useEffect(() => {
    if (!open) return;
    if (messages.length > 0) return;

    let welcome = `Salut ${user?.prenom || ''} 👋 Une question ?`;
    if (location.pathname.startsWith('/watch/')) {
      welcome = `Tu regardes une capsule ? Pose-moi une question dessus, je vais essayer d'y répondre en me basant sur le transcript.`;
    } else if (location.pathname.startsWith('/courses/')) {
      welcome = `Tu es sur un module. Une question sur le contenu ou ce qu'il faut faire maintenant ?`;
    } else if (location.pathname.startsWith('/prosits/')) {
      welcome = `Tu travailles sur un Prosit ? Je peux t'aider à structurer tes idées sans te donner la réponse directe.`;
    } else if (location.pathname.startsWith('/qcm/')) {
      welcome = `Le QCM te bloque ? Je ne peux pas te donner les réponses, mais je peux t'aider à comprendre les concepts.`;
    } else if (location.pathname === '/' || location.pathname === '/dashboard') {
      welcome = `Bonjour ${user?.prenom || ''} ! Tu cherches par où commencer aujourd'hui ?`;
    }
    setMessages([{ role: 'assistant', content: welcome }]);
  }, [open, location.pathname, user, messages.length]);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const sendMessage = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput('');
    const next = [...messages, { role: 'user', content: msg }];
    setMessages(next);
    setSending(true);
    try {
      const { data } = await api.post('/tutor/chat', {
        message: msg,
        history: next.slice(-9, -1),
      });
      setMessages([...next, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      const errorMsg = err.response?.status === 429
        ? 'Tu as atteint ta limite quotidienne (30 messages). Reviens demain.'
        : 'Le tuteur n\'a pas pu répondre. Réessaie.';
      setMessages([...next, { role: 'assistant', content: errorMsg }]);
    } finally {
      setSending(false);
    }
  };

  // Affiche uniquement pour les étudiants connectés, et pas sur /my-tutor (déjà la grande page)
  if (!user || user.role !== 'etudiant' || location.pathname === '/my-tutor' ||
      location.pathname === '/login' || location.pathname === '/welcome' ||
      location.pathname === '/register') return null;

  return (
    <>
      {/* Bouton flottant */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le chat tuteur IA"
          style={{
            position: 'fixed', bottom: 20, right: 20, zIndex: 100,
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, #9333EA, #C084FC)',
            color: '#fff', border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(147,51,234,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 200ms',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Bot size={26} />
        </button>
      )}

      {/* Mini-fenêtre chat */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 100,
          width: 340, height: 480, maxWidth: 'calc(100vw - 40px)',
          background: 'white', borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          border: '1px solid #E5E7EB',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: 12, background: 'linear-gradient(135deg, #9333EA, #C084FC)', color: 'white',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Tuteur IA</p>
              <p style={{ margin: 0, fontSize: 10, opacity: 0.85 }}>Méthode socratique</p>
            </div>
            <button
              onClick={() => navigate('/my-tutor')}
              title="Ouvrir la page complète"
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}
            >
              <ArrowUpRight size={16} />
            </button>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '8px 12px', borderRadius: 10,
                background: m.role === 'user' ? '#1B4F72' : '#F3E8FF',
                color: m.role === 'user' ? 'white' : '#1E293B',
                fontSize: 13, lineHeight: 1.4, whiteSpace: 'pre-wrap',
              }}>
                {m.content}
              </div>
            ))}
            {sending && (
              <div style={{ alignSelf: 'flex-start', padding: '8px 12px', borderRadius: 10, background: '#F3E8FF', color: '#9333EA', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Loader size={11} style={{ animation: 'spin 0.8s linear infinite' }} /> …
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} style={{ padding: 10, borderTop: '1px solid #E5E7EB', display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pose une question…"
              disabled={sending}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'inherit' }}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              style={{
                padding: '8px 12px', borderRadius: 8,
                background: '#9333EA', color: 'white', border: 'none',
                cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.6 : 1,
                display: 'inline-flex', alignItems: 'center',
              }}
            >
              <Send size={14} />
            </button>
          </form>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </>
  );
}
