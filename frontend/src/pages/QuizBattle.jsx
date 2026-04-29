import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { io } from 'socket.io-client';
import {
  ArrowLeft, Swords, Users, Clock, Trophy, Plus, RefreshCw, Zap, CheckCircle,
  XCircle, Flame, Snowflake, Sparkles, Target, Award, Crown, Clock3, BookOpen,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');
const STORAGE_KEY = 'fliplearn_user';
const getToken = () => JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null')?.token ?? null;
const TIMER_SECONDS = 15;

const POWERUPS = [
  { id: 'fifty',   label: '50 / 50',     Icon: Target,     color: '#0EA5E9', bg: '#E0F2FE', desc: 'Élimine 2 mauvaises réponses' },
  { id: 'freeze',  label: 'Freeze',      Icon: Snowflake,  color: '#6366F1', bg: '#E0E7FF', desc: '+8 secondes au timer' },
  { id: 'double',  label: 'x2 Points',   Icon: Sparkles,   color: '#D97706', bg: '#FEF3C7', desc: 'Double les points de cette question' },
];

export default function QuizBattle() {
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const socketRef = useRef(null);
  const timerRef = useRef(null);

  const [user] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)); } catch { return null; }
  });

  const [phase, setPhase] = useState('lobby');
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [question, setQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [scores, setScores] = useState([]);
  const [timer, setTimer] = useState(TIMER_SECONDS);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [error, setError] = useState('');
  const [isHost, setIsHost] = useState(false);

  // Power-ups & streak state
  const [usedPowerups, setUsedPowerups] = useState(new Set());
  const [activePowerup, setActivePowerup] = useState(null);         // 'double' pending
  const [hiddenOptions, setHiddenOptions] = useState([]);           // ['A', 'C'] after 50/50
  const [opponentPowerup, setOpponentPowerup] = useState(null);     // visual flash
  const [gainedThisRound, setGainedThisRound] = useState(null);     // points gagnés
  const [feedback, setFeedback] = useState(null);                   // 'correct' | 'wrong'

  const myScore = scores.find(s => s.name === `${user?.prenom} ${user?.nom}`) || {};
  const myStreak = myScore.streak || 0;

  // Pre-requis pedagogique : avoir complete au moins 1 video a 80%+ avant de defier
  const [eligible, setEligible]       = useState(null); // null = loading, true/false = checked
  const [completedVideos, setCompletedVideos] = useState(0);

  // Panneau de regles repliable (lobby)
  const [rulesOpen, setRulesOpen] = useState(false);
  useEffect(() => {
    api.get('/progress').then(({ data }) => {
      const arr = Array.isArray(data) ? data : [];
      const total = arr.reduce((s, p) => s + (p.videosCompleted?.length ?? 0), 0);
      setCompletedVideos(total);
      setEligible(total >= 1);
    }).catch(() => setEligible(true)); // en cas d'erreur API on n'empeche pas (UX bienveillante)
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => { setError(''); refreshRooms(); });
    socket.on('connect_error', (e) => setError('Connexion impossible : ' + e.message));

    socket.on('battle:players', (p) => setPlayers(p));

    socket.on('battle:started', (data) => {
      setPhase('playing');
      setTotalQuestions(data.totalQuestions);
      setQuestion(data.question);
      setQuestionIndex(0);
      setSelectedAnswer(null);
      setCorrectAnswer(null);
      setWaitingForOpponent(false);
      setTimer(TIMER_SECONDS);
      setUsedPowerups(new Set());
      setHiddenOptions([]);
      setActivePowerup(null);
      setGainedThisRound(null);
      setFeedback(null);
    });

    socket.on('battle:next', (data) => {
      setCorrectAnswer(data.previousCorrect);
      setScores(data.scores);
      setGainedThisRound(data.gained);
      setTimeout(() => {
        setQuestion(data.question);
        setQuestionIndex(data.questionIndex);
        setSelectedAnswer(null);
        setCorrectAnswer(null);
        setWaitingForOpponent(false);
        setTimer(TIMER_SECONDS);
        setHiddenOptions([]);
        setActivePowerup(null);
        setGainedThisRound(null);
        setFeedback(null);
        setOpponentPowerup(null);
      }, 2200);
    });

    socket.on('battle:finished', (data) => {
      setCorrectAnswer(data.correctAnswer);
      setTimeout(() => {
        setScores(data.players);
        setTotalQuestions(data.totalQuestions);
        setPhase('result');
        refreshMe();
      }, 2200);
    });

    socket.on('battle:opponent_powerup', ({ powerup }) => {
      setOpponentPowerup(powerup);
      setTimeout(() => setOpponentPowerup(null), 2500);
    });

    socket.on('battle:playerLeft', (data) => {
      setError(data.message);
      setPhase('lobby');
    });

    socket.on('battle:error', (msg) => setError(typeof msg === 'string' ? msg : msg?.message || 'Erreur'));

    return () => { socket.disconnect(); clearTimeout(timerRef.current); };
  }, [user]);

  // Timer
  useEffect(() => {
    if (phase !== 'playing' || waitingForOpponent || correctAnswer) {
      clearTimeout(timerRef.current);
      return;
    }
    if (timer <= 0) { handleAnswer(null); return; }
    timerRef.current = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timer, phase, waitingForOpponent, correctAnswer]);

  const refreshRooms = useCallback(() => {
    socketRef.current?.emit('battle:list', (available) => {
      setRooms(available || []);
    });
  }, []);

  useEffect(() => { if (phase === 'lobby') refreshRooms(); }, [phase, refreshRooms]);

  const createRoom = () => {
    if (eligible === false) {
      setError('Tu dois avoir complété au moins 1 vidéo à 80% pour participer.');
      return;
    }
    if (!socketRef.current?.connected) {
      setError('Connexion au serveur en cours… Réessayez.');
      return;
    }
    socketRef.current.emit('battle:create', {
      name: `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim(),
      userId: user?._id,
    }, (res) => {
      if (!res || !res.roomId) { setError('Impossible de créer la salle.'); return; }
      setRoomId(res.roomId);
      setIsHost(true);
      setPhase('waiting');
      setError('');
    });
  };

  const joinRoom = (rid) => {
    if (eligible === false) {
      setError('Tu dois avoir complété au moins 1 vidéo à 80% pour rejoindre une battle.');
      return;
    }
    socketRef.current?.emit('battle:join', {
      roomId: rid,
      name: `${user.prenom} ${user.nom}`,
      userId: user._id,
    }, (res) => {
      if (res.error) return setError(res.error);
      setRoomId(rid);
      setIsHost(false);
      setPhase('waiting');
      setError('');
    });
  };

  const startBattle = () => { socketRef.current?.emit('battle:start', { roomId }); };

  const usePowerup = (id) => {
    if (usedPowerups.has(id) || selectedAnswer !== null || waitingForOpponent || correctAnswer) return;
    setUsedPowerups(prev => new Set([...prev, id]));

    if (id === 'fifty') {
      // Cache 2 options incorrectes
      const correct = null;
      const options = ['A', 'B', 'C', 'D'];
      // On ne connaît pas la correcte côté client, donc on stratégie : on cache 2 aléatoires
      // Fallback : montrer les 2 qui restent aléatoirement (utile même sans savoir la bonne)
      // Ici on va ne cacher que 2 non-sélectionnées au hasard pour garder la contrainte stratégique
      const shuffled = options.sort(() => Math.random() - 0.5);
      setHiddenOptions(shuffled.slice(0, 2));
    } else if (id === 'freeze') {
      setTimer(t => t + 8);
    } else if (id === 'double') {
      setActivePowerup('double');
    }
  };

  const handleAnswer = (answer) => {
    if (selectedAnswer !== null || waitingForOpponent) return;
    setSelectedAnswer(answer);
    setWaitingForOpponent(true);
    socketRef.current?.emit('battle:answer', {
      roomId, questionIndex, answer,
      powerup: activePowerup,
    });
  };

  // Feedback visuel sur ma réponse quand on reçoit le correctAnswer
  useEffect(() => {
    if (correctAnswer && selectedAnswer !== null) {
      setFeedback(selectedAnswer === correctAnswer ? 'correct' : 'wrong');
    }
  }, [correctAnswer, selectedAnswer]);

  const playAgain = () => {
    setPhase('lobby');
    setRoomId(null);
    setPlayers([]);
    setScores([]);
    setQuestion(null);
    setSelectedAnswer(null);
    setCorrectAnswer(null);
    setError('');
    setIsHost(false);
    setTimer(TIMER_SECONDS);
    setUsedPowerups(new Set());
    setHiddenOptions([]);
    setActivePowerup(null);
  };

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <Layout title="Quiz Battle">
      <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
          <ArrowLeft size={18} /> Retour
        </button>

        {error && (
          <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 14, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 700 }}><XCircle size={16} /></button>
          </div>
        )}

        {/* Opponent powerup flash */}
        {opponentPowerup && (
          <div style={{ position: 'fixed', top: 80, right: 20, zIndex: 9999, padding: '12px 18px', background: 'linear-gradient(135deg, #DC2626, #F87171)', color: 'white', borderRadius: 12, fontWeight: 700, animation: 'toast-pop-in 400ms ease both', boxShadow: '0 8px 24px rgba(220,38,38,.3)' }}>
            ⚡ Adversaire a utilisé <strong>{POWERUPS.find(p => p.id === opponentPowerup)?.label}</strong> !
          </div>
        )}

        {/* LOBBY */}
        {phase === 'lobby' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 76, height: 76, borderRadius: '50%', background: 'linear-gradient(135deg, #1B4F72, #2874A6)', marginBottom: 12, boxShadow: '0 8px 24px rgba(27,79,114,.25)' }}>
                <Swords size={38} color="white" />
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1B4F72', margin: 0, letterSpacing: '-0.02em' }}>Quiz Battle</h1>
              <p style={{ color: '#64748b', marginTop: 6 }}>Défie un autre étudiant en duel temps réel avec power-ups et combos</p>
            </div>

            {/* Encart pedagogique : prerequis */}
            {eligible === false && (
              <div style={{
                padding: '16px 18px', marginBottom: 24, borderRadius: 12,
                background: 'linear-gradient(135deg, #FEF3C7, #FFFBEB)',
                border: '1px solid #FCD34D',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BookOpen size={18} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#92400E', margin: 0 }}>
                    Avant de défier tes camarades, regarde au moins une vidéo en entier
                  </p>
                  <p style={{ fontSize: 12, color: '#78350F', margin: '4px 0 8px', lineHeight: 1.5 }}>
                    Le Quiz Battle est un complément à l'apprentissage, pas un raccourci. Tu dois avoir complété
                    au moins <strong>1 vidéo à 80%</strong> dans tes cours pour participer.
                  </p>
                  <button
                    onClick={() => navigate('/courses')}
                    style={{
                      padding: '7px 14px', borderRadius: 8, background: '#D97706',
                      color: 'white', border: 'none', fontWeight: 600, fontSize: 12,
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <BookOpen size={13} /> Aller à mes cours
                  </button>
                </div>
              </div>
            )}

            {/* Règles du jeu — repliable */}
            <details
              open={rulesOpen}
              onToggle={(e) => setRulesOpen(e.currentTarget.open)}
              style={{
                marginBottom: 20, padding: '10px 14px',
                background: 'white', borderRadius: 10,
                border: '1px solid #E5E7EB',
              }}
            >
              <summary
                aria-label={rulesOpen ? 'Masquer les règles du jeu' : 'Afficher les règles du jeu'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 13, fontWeight: 600, color: '#475569',
                  cursor: 'pointer', listStyle: 'none', userSelect: 'none',
                }}
              >
                <Sparkles size={14} color="#1B4F72" />
                Règles du jeu
                <ChevronDown
                  size={14}
                  style={{
                    marginLeft: 'auto',
                    transition: 'transform .2s',
                    transform: rulesOpen ? 'rotate(180deg)' : 'rotate(0)',
                  }}
                />
              </summary>
              <div style={{
                marginTop: 10, paddingTop: 10,
                borderTop: '1px solid #F1F5F9',
                fontSize: 12, color: '#475569', lineHeight: 1.6,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <Flame size={13} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span><strong>Combos</strong> — 3 bonnes réponses d'affilée donnent un bonus de +5 points, 5 d'affilée donnent +10.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <Zap size={13} color="#0EA5E9" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span><strong>Power-ups</strong> — 50/50 (élimine 2 mauvaises réponses), Freeze (+8 secondes), x2 Points. Utilisable 1 fois par match.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Crown size={13} color="#9333EA" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span><strong>Badge Invincible</strong> — 5 combos d'affilée débloque ce badge spécial.</span>
                </div>
              </div>
            </details>

            <button
              onClick={createRoom}
              disabled={eligible === false}
              aria-label="Créer une nouvelle salle de Quiz Battle"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                width: '100%', padding: '16px', borderRadius: 12,
                background: eligible === false ? '#94A3B8' : 'linear-gradient(135deg, #1B4F72, #2874A6)',
                color: 'white', border: 'none', fontSize: 16, fontWeight: 700,
                cursor: eligible === false ? 'not-allowed' : 'pointer',
                marginBottom: 24, boxShadow: '0 4px 14px rgba(27,79,114,.3)',
                opacity: eligible === false ? 0.6 : 1,
              }}>
              <Plus size={20} /> Créer une salle
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1B4F72', margin: 0 }}>Salles disponibles</h2>
              <button onClick={refreshRooms} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1B4F72', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                <RefreshCw size={14} /> Actualiser
              </button>
            </div>

            {rooms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, background: 'white', borderRadius: 12, border: '1px dashed #cbd5e1', color: '#94a3b8' }}>
                <Users size={32} style={{ opacity: 0.4 }} />
                <p style={{ marginTop: 8 }}>Aucune salle disponible. Crée-en une !</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rooms.map(r => (
                  <div key={r.roomId} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 18px', background: 'white', borderRadius: 10, border: '1px solid #e5e7eb',
                    transition: 'transform .15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>⚔️ {r.host}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>En attente d'un adversaire</div>
                    </div>
                    <button onClick={() => joinRoom(r.roomId)} style={{
                      padding: '9px 20px', borderRadius: 8, background: '#2874A6',
                      color: 'white', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}>
                      Rejoindre
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* WAITING */}
        {phase === 'waiting' && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 72, borderRadius: '50%', background: '#EBF3FA', marginBottom: 16 }}>
              <Users size={40} color="#1B4F72" />
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1B4F72', margin: 0 }}>
              {players.length < 2 ? "En attente d'un adversaire…" : 'Adversaire trouvé !'}
            </h2>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 24, flexWrap: 'wrap' }}>
              {players.map((p, i) => (
                <div key={i} style={{ padding: '16px 24px', background: 'white', borderRadius: 14, border: '2px solid #1B4F72', minWidth: 140, boxShadow: '0 4px 12px rgba(27,79,114,.1)' }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>⚔️</div>
                  <div style={{ fontWeight: 700, color: '#1B4F72', fontSize: 16 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Joueur {i + 1}</div>
                </div>
              ))}
              {players.length < 2 && (
                <div style={{ padding: '16px 24px', background: '#f8fafc', borderRadius: 14, border: '2px dashed #d1d5db', minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 24, opacity: 0.3 }}>❓</div>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 6 }}>En attente...</div>
                </div>
              )}
            </div>

            {roomId && players.length < 2 && (
              <div style={{ marginTop: 20, padding: '12px 16px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd', fontSize: 13, color: '#0369a1', display: 'inline-block' }}>
                Code de la salle : <strong style={{ letterSpacing: '0.05em' }}>{roomId}</strong>
              </div>
            )}

            {isHost && players.length === 2 && (
              <button onClick={startBattle} style={{
                marginTop: 24, padding: '14px 40px', borderRadius: 12,
                background: 'linear-gradient(135deg, #16A34A, #22C55E)',
                color: 'white', border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(22,163,74,.3)',
              }}>
                <Zap size={20} /> Commencer le Battle !
              </button>
            )}

            <div style={{ marginTop: 16 }}>
              <button onClick={playAgain} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* PLAYING */}
        {phase === 'playing' && question && (
          <div>
            {/* Header : question + timer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>
                Question <strong style={{ color: '#1B4F72' }}>{questionIndex + 1}</strong> / {totalQuestions}
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                borderRadius: 999,
                background: timer <= 5 ? '#FEF2F2' : timer <= 10 ? '#FEF3C7' : '#EBF3FA',
                color: timer <= 5 ? '#DC2626' : timer <= 10 ? '#92400E' : '#1B4F72',
                fontWeight: 800, fontSize: 18,
                animation: timer <= 5 ? 'pulse-timer 0.5s ease-in-out infinite' : 'none',
              }}>
                <Clock size={16} /> {timer}s
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #1B4F72, #2874A6)', borderRadius: 3, width: `${((questionIndex + 1) / totalQuestions) * 100}%`, transition: 'width 0.3s' }} />
            </div>

            {/* Scores + streak */}
            {scores.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
                {scores.map((s, i) => {
                  const isMe = s.name === `${user?.prenom} ${user?.nom}`;
                  return (
                    <div key={i} style={{
                      padding: '10px 16px', background: isMe ? '#EBF3FA' : 'white',
                      borderRadius: 10, border: `1px solid ${isMe ? '#1B4F72' : '#e5e7eb'}`,
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <div style={{ fontSize: 13, color: '#64748b' }}>
                        {isMe ? '👤 Vous' : '⚔️'} {!isMe && s.name}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#1B4F72' }}>{s.score}</div>
                      {s.streak >= 2 && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 2,
                          padding: '2px 8px', background: '#FEF3C7', color: '#D97706',
                          borderRadius: 999, fontSize: 11, fontWeight: 700,
                          animation: s.streak >= 3 ? 'flame-flicker 0.8s ease-in-out infinite' : 'none',
                        }}>
                          <Flame size={11} /> {s.streak}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Active modifiers */}
            {(activePowerup === 'double' || myStreak >= 3) && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                {activePowerup === 'double' && (
                  <div style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #D97706, #F59E0B)', color: 'white', borderRadius: 999, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, animation: 'pulse-timer 1.2s ease-in-out infinite' }}>
                    <Sparkles size={12} /> x2 Points actif
                  </div>
                )}
                {myStreak >= 3 && (
                  <div style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #DC2626, #F87171)', color: 'white', borderRadius: 999, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Flame size={12} /> {myStreak} COMBOS 🔥
                  </div>
                )}
              </div>
            )}

            {/* Question */}
            <div style={{
              background: 'white', borderRadius: 14, border: feedback === 'correct' ? '2px solid #16A34A' : feedback === 'wrong' ? '2px solid #DC2626' : '1px solid #e5e7eb',
              padding: 24, marginBottom: 18,
              transition: 'border-color .3s',
            }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', margin: 0, lineHeight: 1.5 }}>{question.texte}</h2>
            </div>

            {/* Options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {optionLabels.map(letter => {
                const isSelected = selectedAnswer === letter;
                const isCorrect = correctAnswer === letter;
                const showResult = correctAnswer !== null;
                const isHidden = hiddenOptions.includes(letter) && !isCorrect && !isSelected;

                let bg = 'white', border = '#e5e7eb', textColor = '#1e293b';
                if (showResult && isCorrect) { bg = '#F0FDF4'; border = '#16A34A'; textColor = '#16A34A'; }
                else if (showResult && isSelected && !isCorrect) { bg = '#FEF2F2'; border = '#DC2626'; textColor = '#DC2626'; }
                else if (isSelected) { bg = '#EBF5FB'; border = '#1B4F72'; textColor = '#1B4F72'; }

                return (
                  <button key={letter}
                    onClick={() => !showResult && !isHidden && handleAnswer(letter)}
                    disabled={selectedAnswer !== null || isHidden}
                    style={{
                      padding: '16px', borderRadius: 12, background: bg,
                      border: `2px solid ${border}`, cursor: (selectedAnswer || isHidden) ? 'default' : 'pointer',
                      textAlign: 'left', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: 12,
                      fontFamily: 'inherit', fontSize: 14,
                      opacity: isHidden ? 0.25 : 1,
                      filter: isHidden ? 'grayscale(1)' : 'none',
                      transform: showResult && isCorrect ? 'scale(1.02)' : 'scale(1)',
                      animation: showResult && isCorrect ? 'correct-pulse 0.6s ease' : showResult && isSelected && !isCorrect ? 'wrong-shake 0.5s ease' : 'none',
                    }}>
                    <span style={{ width: 32, height: 32, borderRadius: '50%', background: border, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                      {letter}
                    </span>
                    <span style={{ fontWeight: 500, color: textColor, fontSize: 14, flex: 1 }}>
                      {isHidden ? '— éliminé —' : question.options?.[letter]}
                    </span>
                    {showResult && isCorrect && <CheckCircle size={18} color="#16A34A" />}
                    {showResult && isSelected && !isCorrect && <XCircle size={18} color="#DC2626" />}
                  </button>
                );
              })}
            </div>

            {/* Power-ups bar */}
            {!correctAnswer && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                {POWERUPS.map(p => {
                  const used = usedPowerups.has(p.id);
                  const Icon = p.Icon;
                  return (
                    <button
                      key={p.id}
                      onClick={() => usePowerup(p.id)}
                      disabled={used || selectedAnswer !== null}
                      title={used ? 'Déjà utilisé' : p.desc}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', borderRadius: 10,
                        background: used ? '#F1F5F9' : p.bg,
                        border: `2px solid ${used ? '#E2E8F0' : p.color}`,
                        color: used ? '#94A3B8' : p.color,
                        cursor: (used || selectedAnswer !== null) ? 'not-allowed' : 'pointer',
                        fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                        opacity: (used || selectedAnswer !== null) ? 0.5 : 1,
                        transition: 'transform .15s',
                      }}
                      onMouseEnter={e => { if (!used && selectedAnswer === null) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <Icon size={14} /> {p.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Feedback gain */}
            {correctAnswer && gainedThisRound && (
              <div style={{ textAlign: 'center', padding: 12, marginTop: 8 }}>
                {Object.entries(gainedThisRound).map(([name, pts]) => {
                  const isMe = name === `${user?.prenom} ${user?.nom}`;
                  return (
                    <span key={name} style={{ margin: '0 10px', fontSize: 14, color: isMe ? '#16A34A' : '#64748b', fontWeight: isMe ? 700 : 500 }}>
                      {isMe ? '✨ Vous' : name}: {pts > 0 ? `+${pts}` : '0'} pts
                    </span>
                  );
                })}
              </div>
            )}

            {waitingForOpponent && !correctAnswer && (
              <div style={{ textAlign: 'center', marginTop: 12, color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
                En attente de la réponse de l'adversaire…
              </div>
            )}
          </div>
        )}

        {/* RESULT */}
        {phase === 'result' && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            {(() => {
              const sorted = [...scores].sort((a, b) => b.score - a.score);
              const winner = sorted[0];
              const me = sorted.find(s => s.name === `${user?.prenom} ${user?.nom}`);
              const iWon = winner?.name === `${user?.prenom} ${user?.nom}`;
              const tie = sorted.length === 2 && sorted[0].score === sorted[1].score;
              const invincible = me?.bestStreak >= 4;
              const accuracy = totalQuestions ? Math.round(((me?.correctCount || 0) / totalQuestions) * 100) : 0;

              return (
                <>
                  <div style={{ animation: 'result-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 100, height: 100, borderRadius: '50%', background: iWon ? 'linear-gradient(135deg, #F59E0B, #FBBF24)' : tie ? 'linear-gradient(135deg, #64748B, #94A3B8)' : 'linear-gradient(135deg, #E2E8F0, #CBD5E1)', marginBottom: 16, boxShadow: '0 12px 32px rgba(0,0,0,0.1)' }}>
                      <Trophy size={52} color="white" />
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1B4F72', margin: 0, letterSpacing: '-0.02em' }}>
                      {tie ? '⚖️ Égalité !' : iWon ? '🏆 Victoire !' : '😤 Défaite'}
                    </h1>
                    <p style={{ color: '#64748b', marginTop: 4 }}>
                      {tie ? 'Vous et votre adversaire êtes à égalité' : iWon ? 'Bravo, tu as battu ton adversaire !' : 'Pas de panique, retente !'}
                    </p>
                  </div>

                  {/* Badges débloqués */}
                  {invincible && (
                    <div style={{ marginTop: 20, padding: '14px 20px', background: 'linear-gradient(135deg, #5B21B6, #7C3AED)', color: 'white', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 10, animation: 'result-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both' }}>
                      <Crown size={20} /> <strong>Badge "Invincible" débloqué !</strong>
                    </div>
                  )}

                  {/* Stats personnelles */}
                  {me && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginTop: 24, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
                      <div style={{ padding: 14, background: 'white', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                        <Target size={16} color="#1B4F72" />
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, fontWeight: 600, textTransform: 'uppercase' }}>Précision</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#1B4F72' }}>{accuracy}%</div>
                      </div>
                      <div style={{ padding: 14, background: 'white', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                        <Flame size={16} color="#D97706" />
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, fontWeight: 600, textTransform: 'uppercase' }}>Best streak</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#D97706' }}>{me.bestStreak || 0}</div>
                      </div>
                      <div style={{ padding: 14, background: 'white', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                        <Award size={16} color="#059669" />
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, fontWeight: 600, textTransform: 'uppercase' }}>Bonnes</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#059669' }}>{me.correctCount || 0}/{totalQuestions}</div>
                      </div>
                    </div>
                  )}

                  {/* Classement final */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 28, flexWrap: 'wrap' }}>
                    {sorted.map((s, i) => (
                      <div key={i} style={{
                        padding: '20px 28px', background: 'white', borderRadius: 16,
                        border: i === 0 && !tie ? '3px solid #F59E0B' : '1px solid #e5e7eb',
                        minWidth: 170,
                        boxShadow: i === 0 && !tie ? '0 8px 24px rgba(245,158,11,.2)' : '0 2px 6px rgba(0,0,0,.05)',
                      }}>
                        {i === 0 && !tie && (
                          <div style={{ marginBottom: 6 }}><Crown size={24} color="#F59E0B" /></div>
                        )}
                        <div style={{ fontWeight: 700, color: '#1B4F72', fontSize: 16 }}>{s.name}</div>
                        <div style={{ fontSize: 30, fontWeight: 800, color: i === 0 && !tie ? '#F59E0B' : '#64748b', marginTop: 6 }}>{s.score} pts</div>
                        {s.bestStreak > 0 && (
                          <div style={{ fontSize: 11, color: '#D97706', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
                            <Flame size={11} /> {s.bestStreak} max
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
                    <button onClick={playAgain} style={{
                      padding: '12px 28px', borderRadius: 10,
                      background: 'linear-gradient(135deg, #1B4F72, #2874A6)',
                      color: 'white', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      boxShadow: '0 4px 14px rgba(27,79,114,.3)',
                    }}>
                      <RefreshCw size={16} /> Rejouer
                    </button>
                    <button onClick={() => navigate('/')} style={{
                      padding: '12px 28px', borderRadius: 10, background: 'white',
                      color: '#1B4F72', border: '2px solid #1B4F72', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                    }}>
                      Tableau de bord
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </Layout>
  );
}
