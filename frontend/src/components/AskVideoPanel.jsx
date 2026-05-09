import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import {
  X, Send, MessageCircle, Loader, AlertTriangle, ArrowRight, Bot, Target,
} from 'lucide-react';

/**
 * AskVideoPanel — Panneau latéral 350px qui s'ouvre depuis WatchVideo.
 *
 * @description L'étudiant pose une question pendant qu'il regarde une
 * vidéo. Le tuteur IA répond en utilisant le transcript Whisper comme
 * contexte (RAG) et cite les timestamps pertinents (mm:ss) au format
 * cliquable — un clic seek la vidéo HTML5 native à ce moment.
 *
 * Persistance : historique de questions/réponses par videoId dans
 * localStorage (jusqu'à 20 derniers échanges).
 *
 * Quota : 5 questions / vidéo / jour / utilisateur (vérifié backend).
 *
 * Confidence < 50% → badge "Hors sujet de la vidéo" + suggestion de
 * passer au tuteur général (/my-tutor).
 *
 * Cohérent avec Mazur (1997) Peer Instruction et Bergmann & Sams
 * (2012) Flip Your Classroom : la vidéo n'est plus passive, elle
 * permet le dialogue contextuel.
 */

const STORAGE_PREFIX = 'fliplearn_ask_video_history_';
const MAX_HISTORY    = 20;

/* ─── helpers ─────────────────────────────────────────────────────────── */
function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function loadHistory(videoId) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + videoId);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(videoId, history) {
  try {
    const trimmed = history.slice(-MAX_HISTORY);
    localStorage.setItem(STORAGE_PREFIX + videoId, JSON.stringify(trimmed));
  } catch {}
}

function seekVideo(seconds) {
  const v = document.querySelector('video');
  if (v) {
    v.currentTime = seconds;
    if (v.paused) v.play().catch(() => {});
  }
}

function getCurrentVideoTime() {
  const v = document.querySelector('video');
  return v?.currentTime || 0;
}

/* ─── Composant ───────────────────────────────────────────────────────── */
export default function AskVideoPanel({ videoId, videoTitre, onClose }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(() => loadHistory(videoId));
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [quota, setQuota] = useState(null); // { used, limit, ok }
  const messagesEndRef = useRef(null);

  /* ── Suggestions contextuelles basées sur le timestamp courant ───── */
  const [suggestions] = useState(() => {
    const t = fmtTime(getCurrentVideoTime());
    return [
      `Que veut dire ce concept (à ${t}) ?`,
      `Peux-tu me donner un exemple concret ?`,
      `Pourquoi c'est important ?`,
    ];
  });

  /* ── Charge le quota au montage ──────────────────────────────────── */
  useEffect(() => {
    api.get(`/tutor/ask-video/quota?videoId=${videoId}`)
      .then(({ data }) => setQuota(data))
      .catch(() => {});
  }, [videoId]);

  /* ── Auto-scroll ──────────────────────────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── Envoi d'une question ────────────────────────────────────────── */
  const ask = async (text) => {
    const q = (text ?? input).trim();
    if (!q || sending) return;
    setInput('');
    setError('');

    const currentTimestamp = getCurrentVideoTime();
    const userMsg = { role: 'user', content: q, at: Date.now(), timestamp: currentTimestamp };
    const next = [...messages, userMsg];
    setMessages(next);
    saveHistory(videoId, next);
    setSending(true);

    try {
      const { data } = await api.post('/tutor/ask-video', {
        videoId,
        question: q,
        currentTimestamp,
      });
      const aiMsg = {
        role: 'assistant',
        content: data.answer,
        citedTimestamps: Array.isArray(data.citedTimestamps) ? data.citedTimestamps : [],
        confidence: typeof data.confidence === 'number' ? data.confidence : null,
        at: Date.now(),
      };
      const updated = [...next, aiMsg];
      setMessages(updated);
      saveHistory(videoId, updated);
      if (data.quota) setQuota(data.quota);
    } catch (err) {
      if (err.response?.status === 429) {
        setError(err.response.data.message || 'Limite par capsule atteinte (5/jour).');
        if (err.response.data) {
          setQuota({ used: err.response.data.used, limit: err.response.data.limit, ok: false });
        }
      } else {
        setError(err.response?.data?.message || 'Le tuteur n\'a pas pu répondre.');
      }
    } finally {
      setSending(false);
    }
  };

  const clearHistory = () => {
    if (!confirm('Effacer l\'historique de cette capsule ?')) return;
    setMessages([]);
    saveHistory(videoId, []);
  };

  const remaining = quota ? Math.max(0, quota.limit - quota.used) : 5;
  const reachedLimit = quota?.ok === false;

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <aside style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 350,
      maxWidth: '90vw', zIndex: 60,
      background: 'white', borderLeft: '1px solid #E5E7EB',
      boxShadow: '-4px 0 16px rgba(0,0,0,0.08)',
      display: 'flex', flexDirection: 'column',
      animation: 'slideInRight 0.25s ease',
    }}>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <header style={{
        padding: 14, borderBottom: '1px solid #E5E7EB',
        background: 'linear-gradient(135deg, #9333EA, #C084FC)', color: 'white',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MessageCircle size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Demande à la capsule</p>
          <p style={{ margin: 0, fontSize: 10, opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {videoTitre || 'RAG sur transcript'}
          </p>
        </div>
        <button onClick={onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}>
          <X size={18} />
        </button>
      </header>

      {/* Quota */}
      <div style={{
        padding: '8px 14px', borderBottom: '1px solid #F1F5F9',
        background: reachedLimit ? '#FEE2E2' : '#F8FAFC',
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, color: reachedLimit ? '#991B1B' : '#64748B',
      }}>
        <Target size={11} />
        <span>
          Questions restantes : <strong>{remaining}</strong>/{quota?.limit ?? 5} aujourd'hui
        </span>
        {messages.length > 0 && (
          <button onClick={clearHistory} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#64748B', fontSize: 10, cursor: 'pointer', textDecoration: 'underline' }}>
            Effacer historique
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ padding: 12, fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
            <p style={{ margin: '0 0 8px' }}>
              <Bot size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              Pose une question sur cette capsule. Le tuteur connaît le transcript et te citera les
              moments pertinents (clic pour aller à ce timestamp).
            </p>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Suggestions
            </p>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => ask(s)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 10px', marginBottom: 6, borderRadius: 8,
                  background: '#F3E8FF', border: '1px solid #E9D5FF',
                  fontSize: 12, color: '#1E293B', cursor: 'pointer', lineHeight: 1.4,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i}>
            {m.role === 'user' ? (
              <div style={{
                alignSelf: 'flex-end', maxWidth: '90%',
                marginLeft: 'auto',
                padding: '8px 12px', borderRadius: 10,
                background: '#1B4F72', color: 'white',
                fontSize: 13, lineHeight: 1.4, whiteSpace: 'pre-wrap',
              }}>
                {m.content}
                {typeof m.timestamp === 'number' && m.timestamp > 0 && (
                  <span style={{ display: 'block', marginTop: 4, fontSize: 10, opacity: 0.75 }}>
                    posée à {fmtTime(m.timestamp)}
                  </span>
                )}
              </div>
            ) : (
              <div style={{
                maxWidth: '90%',
                padding: '8px 12px', borderRadius: 10,
                background: '#F3E8FF', color: '#1E293B',
                fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
              }}>
                {m.content}

                {/* Confidence < 50% : signal hors-sujet */}
                {typeof m.confidence === 'number' && m.confidence < 50 && (
                  <div style={{
                    marginTop: 8, padding: '6px 8px',
                    background: '#FEF3C7', borderLeft: '3px solid #D97706',
                    borderRadius: 4, fontSize: 11, color: '#78350F',
                    display: 'flex', alignItems: 'flex-start', gap: 6,
                  }}>
                    <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      Hors sujet de la capsule (confiance {m.confidence}%).{' '}
                      <button
                        onClick={() => { onClose?.(); navigate('/my-tutor'); }}
                        style={{ background: 'none', border: 'none', padding: 0, color: '#9333EA', textDecoration: 'underline', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}
                      >
                        Demande à ton tuteur général
                      </button>
                    </span>
                  </div>
                )}

                {/* Citations timestamp cliquables */}
                {Array.isArray(m.citedTimestamps) && m.citedTimestamps.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {m.citedTimestamps.map((t, j) => (
                      <button
                        key={j}
                        onClick={() => seekVideo(t)}
                        title={`Aller à ${fmtTime(t)} dans la capsule`}
                        style={{
                          padding: '3px 10px', borderRadius: 999,
                          background: '#9333EA', color: 'white',
                          border: 'none', cursor: 'pointer',
                          fontSize: 10, fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        🎯 {fmtTime(t)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div style={{ alignSelf: 'flex-start', padding: '8px 12px', borderRadius: 10, background: '#F3E8FF', color: '#9333EA', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Loader size={11} style={{ animation: 'spin 0.8s linear infinite' }} />
            Le tuteur lit le transcript…
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Erreur */}
      {error && (
        <div style={{ padding: '8px 14px', background: '#FEE2E2', color: '#991B1B', fontSize: 12, borderTop: '1px solid #FECACA' }}>
          <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); ask(); }} style={{ padding: 10, borderTop: '1px solid #E5E7EB', display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={reachedLimit ? 'Limite atteinte pour aujourd\'hui' : 'Pose une question sur la capsule…'}
          disabled={sending || reachedLimit}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 8,
            border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'inherit',
            opacity: reachedLimit ? 0.5 : 1,
          }}
        />
        <button
          type="submit"
          disabled={sending || reachedLimit || !input.trim()}
          aria-label="Envoyer"
          style={{
            padding: '8px 12px', borderRadius: 8,
            background: '#9333EA', color: 'white', border: 'none',
            cursor: (sending || reachedLimit || !input.trim()) ? 'not-allowed' : 'pointer',
            opacity: (sending || reachedLimit || !input.trim()) ? 0.5 : 1,
            display: 'inline-flex', alignItems: 'center',
          }}
        >
          <Send size={14} />
        </button>
      </form>
    </aside>
  );
}
