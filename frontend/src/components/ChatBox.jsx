import { useEffect, useRef, useState, useCallback } from 'react';
import { Send, Users, Wifi, WifiOff, Bot } from 'lucide-react';
import { useChat } from '../hooks/useChat.js';
import { useAuth } from '../context/AuthContext.jsx';

/* ─── Suggestions de questions rapides pour le chatbot ──────────────────── */
const QUICK_SUGGESTIONS = [
  { label: 'Explique-moi ce module',         icon: '📖' },
  { label: 'Génère un exercice',            icon: '✏️' },
  { label: 'Je n\'ai pas compris la vidéo', icon: '🎬' },
  { label: 'Résume les points clés',        icon: '📝' },
  { label: 'Donne-moi un exemple de code',  icon: '💻' },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function initials(nom, prenom) {
  return `${(prenom?.[0] ?? '').toUpperCase()}${(nom?.[0] ?? '').toUpperCase()}`;
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  const d     = new Date(dateStr);
  const today = new Date();
  const diff  = new Date(today).setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0);
  if (diff === 0)         return "Aujourd'hui";
  if (diff === 86400000)  return 'Hier';
  return d.toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long' });
}

/* ─── Avatar ─────────────────────────────────────────────────────────────── */
function Avatar({ nom, prenom, size = 32, isOwn = false, isBot = false }) {
  if (isBot) {
    return (
      <div
        style={{
          width:          size,
          height:         size,
          borderRadius:   '50%',
          background:     '#EBF2FA',
          border:         '2px solid #1B4F72',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexShrink:     0,
          userSelect:     'none',
        }}
      >
        <Bot size={size * 0.52} color="#1B4F72" />
      </div>
    );
  }

  return (
    <div
      style={{
        width:          size,
        height:         size,
        borderRadius:   '50%',
        background:     isOwn ? '#1B4F72' : '#6B7280',
        color:          '#fff',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       size * 0.36,
        fontWeight:     700,
        flexShrink:     0,
        userSelect:     'none',
      }}
    >
      {initials(nom, prenom)}
    </div>
  );
}

/* ─── Bulle de message ───────────────────────────────────────────────────── */
function MessageBubble({ msg, isOwn, showSender }) {
  const isBot   = msg.type === 'bot';
  const sender  = msg.senderId;
  const nom     = sender?.nom    ?? '';
  const prenom  = sender?.prenom ?? '';
  const name    = isBot ? 'Assistant FlipLearn' : isOwn ? 'Vous' : `${prenom} ${nom}`;

  /* Texte enrichi : remplace les blocs code */
  const renderContent = (text) => {
    if (!text) return null;
    const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const code = part.slice(3, -3).replace(/^[a-z]+\n/, '');
        return (
          <pre
            key={i}
            style={{
              background:   '#1E293B',
              color:        '#E2E8F0',
              borderRadius: '6px',
              padding:      '10px 12px',
              margin:       '6px 0 0',
              fontSize:     '12px',
              overflowX:    'auto',
              fontFamily:   'monospace',
              whiteSpace:   'pre-wrap',
              wordBreak:    'break-all',
            }}
          >
            {code.trim()}
          </pre>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            style={{
              background:   'rgba(27,79,114,0.1)',
              borderRadius: '3px',
              padding:      '1px 5px',
              fontSize:     '12.5px',
              fontFamily:   'monospace',
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div
      className="msg-in"
      style={{
        display:       'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        alignItems:    'flex-end',
        gap:           '8px',
        maxWidth:      isBot ? '85%' : '75%',
        alignSelf:     isOwn ? 'flex-end' : 'flex-start',
      }}
    >
      {/* Avatar */}
      {showSender
        ? <Avatar nom={nom} prenom={prenom} isOwn={isOwn} isBot={isBot} />
        : <div style={{ width: 32, flexShrink: 0 }} />
      }

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
        {/* Nom + heure */}
        {showSender && (
          <div
            style={{
              display:    'flex',
              gap:        '6px',
              alignItems: 'baseline',
              flexDirection: isOwn ? 'row-reverse' : 'row',
            }}
          >
            <span
              style={{
                fontSize:   '11px',
                fontWeight: 600,
                color:      isBot ? '#1B4F72' : 'var(--text-primary)',
              }}
            >
              {name}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {formatTime(msg.createdAt)}
            </span>
          </div>
        )}

        {/* Badge urgent */}
        {msg.priority === 'urgent' && (
          <span style={{
            display: 'inline-block', background: '#DC2626', color: 'white',
            padding: '1px 8px', borderRadius: '4px', fontSize: '10px',
            fontWeight: 700, letterSpacing: '0.5px', marginBottom: '2px',
          }}>
            URGENT
          </span>
        )}

        {/* Contenu */}
        <div
          style={{
            background:   msg.priority === 'urgent' ? '#FEF2F2'
                        : isOwn  ? '#EBF2FA'
                        : isBot  ? 'linear-gradient(135deg,#F0F7FF 0%,#E8F0FE 100%)'
                        :          '#fff',
            border:       msg.priority === 'urgent' ? '2px solid #DC2626'
                        : `1px solid ${isOwn ? '#C5D9EF' : isBot ? '#BFDBFE' : 'var(--border)'}`,
            borderRadius: '8px',
            padding:      '9px 13px',
            fontSize:     '13.5px',
            lineHeight:   '1.6',
            color:        'var(--text-primary)',
            wordBreak:    'break-word',
          }}
        >
          {renderContent(msg.content)}
        </div>

        {/* Heure seule si pas showSender */}
        {!showSender && (
          <span
            style={{
              fontSize:  '10px',
              color:     'var(--text-muted)',
              textAlign: isOwn ? 'right' : 'left',
              padding:   isOwn ? '0 4px 0 0' : '0 0 0 4px',
            }}
          >
            {formatTime(msg.createdAt)}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Séparateur de date ─────────────────────────────────────────────────── */
function DateSeparator({ dateStr }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '12px 0 4px', userSelect: 'none' }}>
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
        {formatDate(dateStr)}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
    </div>
  );
}

/* ─── Indicateur typing humain ───────────────────────────────────────────── */
function TypingIndicator({ users }) {
  if (!users.length) return null;
  const label = users.length === 1
    ? `${users[0].prenom} est en train d'écrire`
    : `${users[0].prenom} et ${users.length - 1} autre${users.length > 2 ? 's' : ''} écrivent`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', alignSelf: 'flex-start' }}>
      <div style={{ display: 'flex', gap: '3px' }}>
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        {label}…
      </span>
    </div>
  );
}

/* ─── Indicateur bot thinking ────────────────────────────────────────────── */
function BotThinkingIndicator() {
  return (
    <div
      className="msg-in"
      style={{
        display:    'flex',
        alignItems: 'flex-end',
        gap:        '8px',
        alignSelf:  'flex-start',
        maxWidth:   '60%',
      }}
    >
      <Avatar isBot size={32} />
      <div
        style={{
          background:   'linear-gradient(135deg,#F0F7FF,#E8F0FE)',
          border:       '1px solid #BFDBFE',
          borderRadius: '8px',
          padding:      '10px 16px',
          display:      'flex',
          alignItems:   'center',
          gap:          '10px',
        }}
      >
        <div style={{ display: 'flex', gap: '3px' }}>
          <span className="typing-dot" style={{ background: '#1B4F72' }} />
          <span className="typing-dot" style={{ background: '#1B4F72' }} />
          <span className="typing-dot" style={{ background: '#1B4F72' }} />
        </div>
        <span style={{ fontSize: '12px', color: '#1B4F72', fontWeight: 500 }}>
          FlipLearn pense…
        </span>
      </div>
    </div>
  );
}

/* ─── Message de bienvenue bot ───────────────────────────────────────────── */
function BotWelcome() {
  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        gap:            '12px',
        padding:        '32px 24px',
        textAlign:      'center',
        flex:           1,
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width:          64,
          height:         64,
          borderRadius:   '50%',
          background:     '#EBF2FA',
          border:         '2px solid #1B4F72',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}
      >
        <Bot size={32} color="#1B4F72" />
      </div>
      <div>
        <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Assistant FlipLearn
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', maxWidth: '320px', lineHeight: 1.5 }}>
          Posez vos questions sur vos modules d'informatique. Je réponds en français, de façon concise et pédagogique.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ChatBox — composant principal
═══════════════════════════════════════════════════════════════════════════ */
/**
 * Props:
 *   roomId      {string}
 *   roomLabel   {string}
 *   roomType    {'course'|'private'|'bot'}
 *   receiverId  {string}  — pour salles privées
 *   height      {string}
 */
export default function ChatBox({
  roomId,
  roomLabel = 'Chat',
  roomType  = 'course',
  receiverId,
  height    = 'calc(100vh - 120px)',
}) {
  const { user }    = useAuth();
  const {
    messages, typingUsers, roomUsers, connected,
    botThinking, sendMessage, handleTyping,
  } = useChat(roomId);

  const isBot = roomType === 'bot';

  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  const canSendUrgent = user?.role === 'professeur' || user?.role === 'admin';

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  /* ── Scroll automatique vers le bas ────────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers, botThinking]);

  /* ── Envoi ─────────────────────────────────────────────────────────── */
  const handleSend = useCallback((text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || !connected) return;
    setSending(true);
    sendMessage(trimmed, receiverId ?? null, isUrgent ? 'urgent' : 'normal');
    setInput('');
    setIsUrgent(false);
    inputRef.current?.focus();
    setTimeout(() => setSending(false), 300);
  }, [input, connected, sendMessage, receiverId, isUrgent]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── Grouper les messages (séparateurs de date + regroupement) ──────── */
  const grouped = [];
  let lastDate     = null;
  let lastSenderId = null;

  for (const msg of messages) {
    const msgDate = new Date(msg.createdAt).toDateString();

    if (msgDate !== lastDate) {
      grouped.push({ type: 'date', dateStr: msg.createdAt });
      lastDate     = msgDate;
      lastSenderId = null;
    }

    const senderId   = msg.type === 'bot' ? 'bot' : (msg.senderId?._id ?? msg.senderId)?.toString();
    const showSender = senderId !== lastSenderId;
    grouped.push({ type: 'msg', msg, showSender });
    lastSenderId = senderId;
  }

  const onlineCount = roomUsers.length;

  return (
    <div
      style={{
        display:       'flex',
        flexDirection: 'column',
        height,
        background:    'var(--surface)',
        border:        '1px solid var(--border)',
        borderRadius:  '8px',
        overflow:      'hidden',
      }}
    >
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '11px 16px',
          borderBottom:   '1px solid var(--border)',
          background:     isBot ? 'linear-gradient(135deg,#F0F7FF,#EBF2FA)' : '#fff',
          flexShrink:     0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isBot && <Bot size={16} color="#1B4F72" />}
          <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
            {roomLabel}
          </span>
          {!isBot && onlineCount > 0 && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Users size={11} />
              {onlineCount} en ligne
            </span>
          )}
          {isBot && (
            <span
              style={{
                fontSize:     '10px',
                fontWeight:   600,
                color:        '#1B4F72',
                background:   '#BFDBFE',
                borderRadius: '4px',
                padding:      '1px 6px',
              }}
            >
              Llama 3 · Groq
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {connected
            ? <><Wifi size={13} color="#10B981" /><span style={{ fontSize: '11px', color: '#10B981' }}>Connecté</span></>
            : <><WifiOff size={13} color="#EF4444" /><span style={{ fontSize: '11px', color: '#EF4444' }}>Déconnecté</span></>
          }
        </div>
      </div>

      {/* ── Zone messages ────────────────────────────────────────────── */}
      <div
        style={{
          flex:          1,
          overflowY:     'auto',
          padding:       '12px 16px',
          display:       'flex',
          flexDirection: 'column',
          gap:           '4px',
          background:    'var(--bg)',
        }}
      >
        {/* Bienvenue bot */}
        {isBot && messages.length === 0 && connected && <BotWelcome />}

        {/* Chargement */}
        {!connected && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px', gap: '6px' }}>
            <WifiOff size={16} /> Connexion au chat en cours…
          </div>
        )}

        {/* Messages vide (chat normal) */}
        {!isBot && messages.length === 0 && connected && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <span style={{ fontSize: '28px' }}>💬</span>
            <span>Aucun message pour l'instant. Soyez le premier à écrire !</span>
          </div>
        )}

        {/* Liste des messages */}
        {grouped.map((item, i) =>
          item.type === 'date' ? (
            <DateSeparator key={`d-${i}`} dateStr={item.dateStr} />
          ) : (
            <MessageBubble
              key={item.msg._id ?? i}
              msg={item.msg}
              isOwn={
                item.msg.type !== 'bot' &&
                (item.msg.senderId?._id ?? item.msg.senderId)?.toString() === user?._id?.toString()
              }
              showSender={item.showSender}
            />
          )
        )}

        {/* Indicateurs */}
        {isBot && botThinking && <BotThinkingIndicator />}
        {!isBot && <TypingIndicator users={typingUsers} />}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Suggestions rapides (bot only, avant le 1er message) ─────── */}
      {isBot && messages.length === 0 && connected && (
        <div
          style={{
            padding:    '0 12px 10px',
            display:    'flex',
            gap:        '6px',
            flexWrap:   'wrap',
            background: 'var(--bg)',
            flexShrink: 0,
          }}
        >
          {QUICK_SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => handleSend(s.label)}
              disabled={!connected || botThinking}
              style={{
                background:   '#fff',
                border:       '1px solid #BFDBFE',
                borderRadius: '8px',
                padding:      '5px 10px',
                fontSize:     '12px',
                cursor:       'pointer',
                color:        '#1B4F72',
                fontWeight:   500,
                display:      'flex',
                alignItems:   'center',
                gap:          '5px',
                transition:   'background 0.15s',
                fontFamily:   'inherit',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#EBF2FA'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Saisie ───────────────────────────────────────────────────── */}
      <div
        style={{
          display:    'flex',
          alignItems: 'flex-end',
          gap:        '8px',
          padding:    '10px 12px',
          borderTop:  '1px solid var(--border)',
          background: '#fff',
          flexShrink: 0,
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (!isBot) handleTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            !connected       ? 'Connexion…'
            : isBot && botThinking ? 'L\'assistant répond…'
            : isBot          ? 'Posez votre question…'
            :                  'Écrivez un message… (Entrée pour envoyer)'
          }
          disabled={!connected || (isBot && botThinking)}
          rows={1}
          style={{
            flex:        1,
            resize:      'none',
            border:      '1px solid var(--border)',
            borderRadius:'8px',
            padding:     '8px 12px',
            fontSize:    '13.5px',
            fontFamily:  'inherit',
            lineHeight:  '1.5',
            outline:     'none',
            background:  (!connected || (isBot && botThinking)) ? 'var(--bg)' : '#fff',
            color:       'var(--text-primary)',
            maxHeight:   '120px',
            overflowY:   'auto',
            transition:  'border-color 0.15s',
          }}
          onFocus={(e)  => { e.target.style.borderColor = 'var(--primary)'; }}
          onBlur={(e)   => { e.target.style.borderColor = 'var(--border)'; }}
        />
        {/* Bouton urgent (professeur/admin seulement) */}
        {canSendUrgent && !isBot && (
          <button
            onClick={() => setIsUrgent(!isUrgent)}
            title={isUrgent ? 'Message urgent (cliquer pour annuler)' : 'Marquer comme urgent'}
            style={{
              width: '40px', height: '40px', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, border: 'none', borderRadius: '8px', cursor: 'pointer',
              background: isUrgent ? '#FEE2E2' : 'transparent',
              color: isUrgent ? '#DC2626' : '#9CA3AF',
              transition: 'all 0.2s',
              fontSize: '18px',
            }}
          >
            {isUrgent ? '🔴' : '⚠️'}
          </button>
        )}
        {isUrgent && (
          <span style={{ position: 'absolute', top: '-28px', right: '60px', background: '#DC2626', color: 'white', padding: '2px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
            MESSAGE URGENT
          </span>
        )}
        <button
          onClick={() => handleSend()}
          disabled={!connected || !input.trim() || sending || (isBot && botThinking)}
          className="btn btn-primary"
          style={{
            width: '40px', height: '40px', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            background: isUrgent ? '#DC2626' : undefined,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
