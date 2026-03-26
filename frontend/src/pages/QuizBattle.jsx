import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Swords, Trophy, Clock, CheckCircle, XCircle, Users, Zap, Crown } from 'lucide-react';
import { io } from 'socket.io-client';
import Layout    from '../components/Layout.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';

const SOCKET_URL  = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');
const STORAGE_KEY = 'fliplearn_user';
const getToken    = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')?.token ?? null;

/* ─── Phases : lobby → challenging → countdown → playing → result ────────── */
const PHASE = { LOBBY: 'lobby', WAITING: 'waiting', CHALLENGED: 'challenged', COUNTDOWN: 'countdown', PLAYING: 'playing', RESULT: 'result' };

/* ─── Avatar initiales ───────────────────────────────────────────────────── */
function Avatar({ name = '', size = 40, color = '#1B4F72' }) {
  const parts = name.trim().split(' ');
  const init  = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.36, flexShrink: 0 }}>
      {init.toUpperCase()}
    </div>
  );
}

/* ─── Barre de score ─────────────────────────────────────────────────────── */
function ScoreBar({ p1, p2, p1Score, p2Score }) {
  const total = p1Score + p2Score || 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
      <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '30px', textAlign: 'right' }}>{p1Score}</span>
      <div style={{ flex: 1, height: '12px', background: '#E5E7EB', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: `${(p1Score / total) * 100}%`, background: '#1B4F72', transition: 'width 0.4s ease', borderRadius: '6px 0 0 6px' }} />
        <div style={{ flex: 1, background: '#EF4444', borderRadius: '0 6px 6px 0' }} />
      </div>
      <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '30px' }}>{p2Score}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════════════════════ */
export default function QuizBattle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const myId     = user?._id?.toString();

  const [phase,       setPhase]       = useState(PHASE.LOBBY);
  const [students,    setStudents]    = useState([]);   // classmates
  const [battleData,  setBattleData]  = useState(null); // { battleId, questions, p1, p2, timerSeconds }
  const [currentQ,    setCurrentQ]    = useState(0);
  const [timeLeft,    setTimeLeft]    = useState(0);
  const [selected,    setSelected]    = useState(null);
  const [scores,      setScores]      = useState({ p1: 0, p2: 0 });
  const [lastFeedback,setLastFeedback]= useState(null);  // { correct, points }
  const [result,      setResult]      = useState(null);  // { winner, p1Score, p2Score }
  const [challenge,   setChallenge]   = useState(null);  // incoming challenge
  const [countdown,   setCountdown]   = useState(3);
  const [error,       setError]       = useState('');

  const socketRef  = useRef(null);
  const timerRef   = useRef(null);

  /* ── Charger les étudiants de la même promotion ────────────────────── */
  useEffect(() => {
    api.get('/auth/me').then(({ data }) => {
      api.get(`/admin/users?role=etudiant`).then(({ data: all }) => {
        setStudents(all.filter((s) => s._id !== myId && s.isActive !== false));
      }).catch(() => setStudents([]));
    }).catch(() => {});
  }, [myId]);

  /* ── Connexion Socket.io ────────────────────────────────────────────── */
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect',  () => socket.emit('battle:online'));
    socket.on('connect_error', (e) => setError(e.message));

    socket.on('battle:challenge_sent', () => setPhase(PHASE.WAITING));
    socket.on('battle:error',  ({ message }) => { setError(message); setPhase(PHASE.LOBBY); });
    socket.on('battle:declined', ({ message }) => { setError(message); setPhase(PHASE.LOBBY); });

    socket.on('battle:challenged', (data) => {
      setChallenge(data);
      setPhase(PHASE.CHALLENGED);
    });

    socket.on('battle:start', (data) => {
      setBattleData(data);
      setScores({ p1: 0, p2: 0 });
      setCurrentQ(0);
      setSelected(null);
      setLastFeedback(null);

      // Countdown 3-2-1
      let c = 3;
      setCountdown(c);
      setPhase(PHASE.COUNTDOWN);
      const iv = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) {
          clearInterval(iv);
          setPhase(PHASE.PLAYING);
          startTimer(data.timerSeconds, data);
        }
      }, 1000);
    });

    socket.on('battle:score_update', ({ p1Score, p2Score, lastAnswer }) => {
      setScores({ p1: p1Score, p2: p2Score });
      if (lastAnswer.userId === myId) {
        setLastFeedback({ correct: lastAnswer.correct, points: lastAnswer.points });
      }
    });

    socket.on('battle:end', (data) => {
      clearTimeout(timerRef.current);
      setResult(data);
      setPhase(PHASE.RESULT);
    });

    return () => { socket.disconnect(); clearTimeout(timerRef.current); };
  }, [myId]);

  const startTimer = useCallback((seconds, data) => {
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Auto-submit null si pas de réponse
          socketRef.current?.emit('battle:answer', {
            battleId:   data.battleId,
            questionId: data.questions[currentQ]?._id,
            answer:     null,
            timeLeft:   0,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [currentQ]);

  const handleAnswer = (option) => {
    if (selected || !battleData) return;
    clearInterval(timerRef.current);
    setSelected(option);

    socketRef.current?.emit('battle:answer', {
      battleId:   battleData.battleId,
      questionId: battleData.questions[currentQ]?._id,
      answer:     option,
      timeLeft,
    });

    // Passer à la question suivante après 1.5s
    setTimeout(() => {
      setSelected(null);
      setLastFeedback(null);
      const next = currentQ + 1;
      if (next < battleData.questions.length) {
        setCurrentQ(next);
        startTimer(battleData.timerSeconds, battleData);
      }
    }, 1500);
  };

  const challenge_ = (targetId) => {
    setError('');
    socketRef.current?.emit('battle:challenge', { targetId });
  };

  const acceptChallenge = () => {
    socketRef.current?.emit('battle:accept', {
      battleId:    challenge.battleId,
      challengerId: challenge.challengerId,
    });
  };

  const declineChallenge = () => {
    socketRef.current?.emit('battle:decline', { challengerId: challenge.challengerId });
    setChallenge(null);
    setPhase(PHASE.LOBBY);
  };

  const myName = `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim();
  const isP1   = battleData?.p1?.userId === myId;
  const myScore = isP1 ? scores.p1 : scores.p2;
  const oppScore = isP1 ? scores.p2 : scores.p1;
  const oppName  = isP1 ? battleData?.p2?.name : battleData?.p1?.name;

  /* ── PHASE LOBBY ────────────────────────────────────────────────────── */
  if (phase === PHASE.LOBBY || phase === PHASE.WAITING) return (
    <Layout title="Quiz Battle">
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <Swords size={22} color="var(--accent)" />
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Quiz Battle</h1>
          <span style={{ fontSize: '12px', background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>BETA</span>
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}

        {phase === PHASE.WAITING && (
          <div className="card" style={{ padding: '24px', textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '12px' }}>
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
            <p style={{ fontWeight: 600, fontSize: '15px' }}>Défi envoyé — en attente de l'adversaire…</p>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: '10px' }} onClick={() => setPhase(PHASE.LOBBY)}>Annuler</button>
          </div>
        )}

        <div className="card" style={{ padding: '16px' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={15} color="var(--primary)" /> Choisir un adversaire
          </h2>
          {students.length === 0 && (
            <div className="empty-state" style={{ padding: '24px' }}>
              <Users size={28} />
              <p>Aucun étudiant disponible pour le moment.</p>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '400px', overflowY: 'auto' }}>
            {students.map((s) => (
              <div
                key={s._id}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: '#fff' }}
              >
                <Avatar name={`${s.prenom} ${s.nom}`} size={36} color="#6B7280" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{s.prenom} {s.nom}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.filiere} — {s.points ?? 0} pts</div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => challenge_(s._id)}
                  disabled={phase === PHASE.WAITING}
                >
                  <Swords size={12} /> Défier
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal défi entrant */}
      {phase === PHASE.CHALLENGED && challenge && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ padding: '28px', maxWidth: '360px', width: '100%', textAlign: 'center' }}>
            <Swords size={36} color="var(--accent)" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700 }}>Défi reçu !</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
              <strong>{challenge.challengerName}</strong> vous défie en Quiz Battle !
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="btn btn-danger" onClick={declineChallenge}>Refuser</button>
              <button className="btn btn-primary" onClick={acceptChallenge}><Swords size={14} /> Accepter</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );

  /* ── PHASE COUNTDOWN ────────────────────────────────────────────────── */
  if (phase === PHASE.COUNTDOWN) return (
    <Layout title="Quiz Battle">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 160px)', gap: '16px' }}>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>Contre <strong>{oppName}</strong></p>
        <div style={{ fontSize: '96px', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>{countdown}</div>
        <p style={{ fontSize: '18px', fontWeight: 600 }}>Préparez-vous !</p>
      </div>
    </Layout>
  );

  /* ── PHASE PLAYING ──────────────────────────────────────────────────── */
  if (phase === PHASE.PLAYING && battleData) {
    const q     = battleData.questions[currentQ];
    const total = battleData.questions.length;

    return (
      <Layout title="Quiz Battle">
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {/* Scores */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Avatar name={myName} size={28} color="#1B4F72" />
              <span style={{ fontWeight: 700, fontSize: '13px' }}>{myScore} pts</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: timeLeft <= 5 ? '#FEF2F2' : '#F0F9FF', borderRadius: '8px', padding: '4px 12px', border: `1px solid ${timeLeft <= 5 ? '#FCA5A5' : '#BAE6FD'}` }}>
              <Clock size={14} color={timeLeft <= 5 ? '#EF4444' : '#0284C7'} />
              <span style={{ fontWeight: 700, fontSize: '16px', color: timeLeft <= 5 ? '#EF4444' : '#0284C7' }}>{timeLeft}s</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 700, fontSize: '13px' }}>{oppScore} pts</span>
              <Avatar name={oppName ?? '?'} size={28} color="#EF4444" />
            </div>
          </div>

          <ScoreBar p1={battleData.p1.name} p2={battleData.p2.name} p1Score={scores.p1} p2Score={scores.p2} />

          {/* Progression */}
          <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Question {currentQ + 1} / {total}
          </div>

          {/* Question */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            <p style={{ fontSize: '15px', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>{q?.texte}</p>
            {lastFeedback && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: lastFeedback.correct ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                {lastFeedback.correct ? <CheckCircle size={15} /> : <XCircle size={15} />}
                {lastFeedback.correct ? `+${lastFeedback.points} points !` : 'Mauvaise réponse'}
              </div>
            )}
          </div>

          {/* Options */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {q && Object.entries(q.options).map(([key, val]) => (
              <button
                key={key}
                onClick={() => handleAnswer(key)}
                disabled={!!selected}
                style={{
                  padding:      '12px 16px',
                  borderRadius: '8px',
                  border:       `2px solid ${selected === key ? (lastFeedback?.correct ? '#10B981' : '#EF4444') : 'var(--border)'}`,
                  background:   selected === key ? (lastFeedback?.correct ? '#ECFDF5' : '#FEF2F2') : '#fff',
                  cursor:       selected ? 'default' : 'pointer',
                  textAlign:    'left',
                  fontSize:     '13px',
                  fontWeight:   500,
                  fontFamily:   'inherit',
                  transition:   'all 0.15s',
                  display:      'flex',
                  gap:          '8px',
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{key}.</span> {val}
              </button>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  /* ── PHASE RESULT ───────────────────────────────────────────────────── */
  if (phase === PHASE.RESULT && result && battleData) {
    const iWon   = result.winner === myId;
    const isDraw = result.winner === null;

    return (
      <Layout title="Quiz Battle — Résultats">
        <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center', paddingTop: '24px' }}>
          <div style={{ fontSize: '64px', marginBottom: '12px' }}>
            {isDraw ? '🤝' : iWon ? '🏆' : '💪'}
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 800 }}>
            {isDraw ? 'Égalité !' : iWon ? 'Victoire !' : 'Bien joué !'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '28px' }}>
            {isDraw ? 'Vous avez terminé ex-æquo !'
              : iWon ? `Vous avez battu ${oppName} !`
              : `${oppName} a gagné cette fois !`}
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '28px' }}>
            <div className="card" style={{ padding: '16px 24px', flex: 1 }}>
              <Avatar name={myName} size={40} color="#1B4F72" />
              <div style={{ fontWeight: 700, marginTop: '8px' }}>{myName}</div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--primary)' }}>
                {isP1 ? result.p1Score : result.p2Score}
              </div>
              {result.winner === myId && <Crown size={20} color="#F59E0B" />}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>VS</div>
            <div className="card" style={{ padding: '16px 24px', flex: 1 }}>
              <Avatar name={oppName ?? '?'} size={40} color="#EF4444" />
              <div style={{ fontWeight: 700, marginTop: '8px' }}>{oppName}</div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#EF4444' }}>
                {isP1 ? result.p2Score : result.p1Score}
              </div>
              {result.winner && result.winner !== myId && <Crown size={20} color="#F59E0B" />}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => { setPhase(PHASE.LOBBY); setBattleData(null); setResult(null); }}>
              <Swords size={14} /> Rejouer
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/leaderboard')}>
              <Trophy size={14} /> Voir le classement
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/')}>
              <ArrowLeft size={14} /> Retour au tableau de bord
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return <Layout title="Quiz Battle"><div className="empty-state">Connexion…</div></Layout>;
}
