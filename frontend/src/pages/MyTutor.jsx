import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  Bot, Send, Mic, MicOff, Sparkles, Target, TrendingUp, AlertTriangle,
  RefreshCw, Loader, ArrowRight, BookOpen, MessageSquare,
} from 'lucide-react';

/**
 * MyTutor — Page de chat avec le tuteur IA personnel (route /my-tutor).
 *
 * Layout 2 colonnes :
 *   - Gauche (300px) : suggestions du jour, points forts, points faibles
 *   - Droite (flex)  : chat (bulles, dictée vocale, boutons rapides)
 *
 * Le tuteur connaît : cours en cours, QCM passés, concepts faibles, prosits
 * actifs, streaks. Méthode socratique (Bandura, Vygotsky, Mazur) — il
 * guide par questions, ne donne JAMAIS la réponse directe à un QCM.
 *
 * Quotas : 30 messages/jour/utilisateur (compté côté backend).
 */

export default function MyTutor() {
  const navigate = useNavigate();
  const [context, setContext] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [messages, setMessages] = useState([]); // [{ role, content }]
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [quotaInfo, setQuotaInfo] = useState(null);
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  /* ── Chargement initial : contexte + suggestions ─────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const [ctxRes, sugRes] = await Promise.all([
          api.get('/tutor/context').catch(() => ({ data: null })),
          api.get('/tutor/suggestions').catch(() => ({ data: { suggestions: [] } })),
        ]);
        if (ctxRes?.data) setContext(ctxRes.data);
        if (sugRes?.data?.suggestions) setSuggestions(sugRes.data.suggestions);
        // Message d'accueil contextualisé
        const prenom = ctxRes?.data?.structured?.user?.prenom || '';
        setMessages([{
          role: 'assistant',
          content: `Bonjour${prenom ? ` ${prenom}` : ''} 👋 Je suis ton tuteur IA. Je connais tes cours, tes derniers QCM et ce qui te bloque encore. Pose-moi une question, ou clique une des suggestions du jour à gauche.`,
        }]);
      } catch (err) {
        setError('Erreur de chargement du contexte.');
      }
    };
    load();
  }, []);

  /* ── Auto-scroll vers le bas ─────────────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── F7 — Pré-remplissage depuis le Coach IA (deeplink) ─────────── */
  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem('tutor.prefill');
      if (prefill) {
        setInput(prefill);
        sessionStorage.removeItem('tutor.prefill');
      }
    } catch { /* sessionStorage indisponible */ }
  }, []);

  /* ── Envoi d'un message ──────────────────────────────────────────── */
  const sendMessage = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput('');
    setError('');
    const newMessages = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    setSending(true);
    try {
      const { data } = await api.post('/tutor/chat', {
        message: msg,
        history: newMessages.slice(-9, -1), // n'envoie que les 8 derniers (sans le current)
      });
      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      if (data.quota) setQuotaInfo(data.quota);
    } catch (err) {
      if (err.response?.status === 429) {
        setError(err.response.data.message || 'Limite quotidienne atteinte.');
        setQuotaInfo({ used: 30, limit: 30 });
      } else {
        setError(err.response?.data?.message || 'Erreur de réponse du tuteur.');
      }
    } finally {
      setSending(false);
    }
  };

  /* ── Suggestions du jour : cliquer pour pré-remplir le chat ──────── */
  const handleSuggestionClick = (s) => {
    if (s.link) {
      navigate(s.link);
      return;
    }
    sendMessage(s.action);
  };

  const refreshSuggestions = async () => {
    try {
      const { data } = await api.get('/tutor/suggestions?refresh=true');
      setSuggestions(data.suggestions || []);
    } catch { /* ignore */ }
  };

  /* ── Web Speech API : dictée vocale (français) ──────────────────── */
  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError('La dictée vocale n\'est pas supportée par ton navigateur (utilise Chrome ou Edge).');
      return;
    }
    if (recording) {
      recognitionRef.current?.stop();
      return;
    }
    const r = new SR();
    r.lang = 'fr-FR';
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (e) => {
      const transcript = Array.from(e.results).map((res) => res[0].transcript).join(' ');
      setInput((prev) => (prev ? prev + ' ' : '') + transcript);
    };
    r.onend = () => setRecording(false);
    r.onerror = (e) => {
      setRecording(false);
      if (e.error === 'not-allowed') {
        setError('Permission micro refusée. Autorise dans les paramètres du navigateur.');
      }
    };
    recognitionRef.current = r;
    setRecording(true);
    r.start();
  };

  /* ── Quick prompts contextualisés ────────────────────────────────── */
  const quickPrompts = (() => {
    const prompts = [];
    const weak = context?.structured?.weakConcepts?.[0];
    if (weak) prompts.push({ label: '💡 Explique-moi ce concept raté', text: `Peux-tu m'aider à comprendre : ${weak}` });
    prompts.push({ label: '📚 Quel cours faire maintenant ?', text: 'Quel cours / quelle vidéo me recommandes-tu de faire maintenant ?' });
    if (context?.structured?.activeProsits?.length) {
      prompts.push({ label: '🛠 Aide sur mon Prosit', text: `J'ai besoin d'aide sur mon Prosit "${context.structured.activeProsits[0].titre}" (phase ${context.structured.activeProsits[0].status}). Par où commencer ?` });
    }
    return prompts.slice(0, 3);
  })();

  /* ── Render ──────────────────────────────────────────────────────── */
  const studentInfo = context?.structured;

  return (
    <Layout title="Mon tuteur IA">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18, alignItems: 'start' }}>

        {/* ═══ COLONNE DROITE (chat) — affichage en premier sur mobile, à droite sur desktop ═══ */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 180px)', order: 0 }}>
          {/* Header */}
          <div style={{ padding: 14, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #9333EA, #C084FC)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={20} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1B4F72' }}>Mon tuteur IA</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B' }}>
                Powered by Groq Llama 3.3 · {quotaInfo ? `${quotaInfo.used}/${quotaInfo.limit} messages aujourd'hui` : '30 messages / jour'}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 'calc(100vh - 380px)', minHeight: 300 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '10px 14px', borderRadius: 12,
                background: m.role === 'user' ? '#1B4F72' : '#F3E8FF',
                color: m.role === 'user' ? 'white' : '#1E293B',
                fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap',
              }}>
                {m.content}
              </div>
            ))}
            {sending && (
              <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 12, background: '#F3E8FF', color: '#9333EA', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Le tuteur réfléchit…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div style={{ padding: '8px 14px', background: '#FEE2E2', color: '#991B1B', fontSize: 12, borderTop: '1px solid #FECACA' }}>
              <AlertTriangle size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              {error}
            </div>
          )}

          {/* Quick prompts */}
          {quickPrompts.length > 0 && messages.length <= 1 && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid #F1F5F9', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {quickPrompts.map((qp, i) => (
                <button key={i} onClick={() => sendMessage(qp.text)} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
                  {qp.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} style={{ padding: 12, borderTop: '1px solid #E5E7EB', display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={toggleVoice}
              title={recording ? 'Arrêter la dictée' : 'Dicter à la voix (Chrome/Edge)'}
              style={{
                padding: 10, borderRadius: 10,
                background: recording ? '#FEE2E2' : '#F1F5F9',
                color: recording ? '#DC2626' : '#475569',
                border: 'none', cursor: 'pointer',
              }}
            >
              {recording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pose ta question…"
              disabled={sending}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 14, fontFamily: 'inherit' }}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              style={{
                padding: '10px 18px', borderRadius: 10,
                background: 'linear-gradient(135deg, #9333EA, #C084FC)',
                color: 'white', border: 'none', fontWeight: 700, fontSize: 13,
                cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.6 : 1,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <Send size={14} /> Envoyer
            </button>
          </form>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>

        {/* ═══ COLONNE GAUCHE (sidebar) ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, order: 1 }}>
          {/* Suggestions du jour */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#1B4F72', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                <Sparkles size={13} /> Suggestions du jour
              </span>
              <button onClick={refreshSuggestions} className="btn btn-ghost btn-sm" title="Rafraîchir"><RefreshCw size={11} /></button>
            </div>
            {suggestions.length === 0 ? (
              <p style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', margin: 0 }}>Pas encore de suggestions.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    style={{
                      padding: 10, borderRadius: 8,
                      background: '#F3E8FF', border: '1px solid #E9D5FF',
                      textAlign: 'left', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 12, color: '#1E293B', lineHeight: 1.4 }}>{s.action}</span>
                    <span style={{ fontSize: 10, color: '#9333EA', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      ~{s.estimatedMinutes} min {s.link && <ArrowRight size={10} />}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Points forts */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              <TrendingUp size={13} /> Tes points forts
            </span>
            <div style={{ marginTop: 8 }}>
              {studentInfo?.courses?.filter((c) => (c.avgQCM || 0) >= 75).slice(0, 3).map((c, i) => (
                <p key={i} style={{ margin: '4px 0', fontSize: 12, color: '#1E293B' }}>
                  ✓ <strong>{c.titre}</strong> — moy. QCM {c.avgQCM}%
                </p>
              ))}
              {(!studentInfo?.courses || studentInfo.courses.filter((c) => (c.avgQCM || 0) >= 75).length === 0) && (
                <p style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', margin: 0 }}>
                  Continue à passer des QCM pour qu'on identifie tes forces.
                </p>
              )}
            </div>
          </div>

          {/* Points à renforcer */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              <Target size={13} /> À renforcer
            </span>
            <div style={{ marginTop: 8 }}>
              {studentInfo?.weakConcepts?.length > 0 ? (
                studentInfo.weakConcepts.slice(0, 3).map((c, i) => (
                  <p key={i} style={{ margin: '4px 0', fontSize: 12, color: '#1E293B', lineHeight: 1.4 }}>
                    • {String(c).slice(0, 80)}{c.length > 80 ? '…' : ''}
                  </p>
                ))
              ) : (
                <p style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', margin: 0 }}>
                  Aucune lacune identifiée pour l'instant.
                </p>
              )}
            </div>
          </div>

          {/* Le tuteur connaît */}
          <div style={{ background: 'linear-gradient(135deg, #F3E8FF, #FDF4FF)', borderRadius: 12, border: '1px solid #E9D5FF', padding: 14 }}>
            <p style={{ margin: 0, fontSize: 11, color: '#6B21A8', fontWeight: 600 }}>
              <Bot size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              Le tuteur te connaît :
            </p>
            {studentInfo && (
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#7E22CE', lineHeight: 1.4 }}>
                {studentInfo.courses?.length || 0} cours · {studentInfo.recentQCM?.length || 0} QCM passés ·{' '}
                {studentInfo.activeProsits?.length || 0} Prosit actif{(studentInfo.activeProsits?.length || 0) > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
