import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { io } from 'socket.io-client';
import { ArrowLeft, Swords, Users, Clock, Trophy, Plus, RefreshCw, Zap, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');
const STORAGE_KEY = 'fliplearn_user';
const getToken = () => JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null')?.token ?? null;
const TIMER_SECONDS = 15;

export default function QuizBattle() {
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const socketRef = useRef(null);
  const timerRef = useRef(null);

  const [user] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)); } catch { return null; }
  });

  const [phase, setPhase] = useState('lobby'); // lobby | waiting | playing | result
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

  // Connect socket with JWT auth
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
    });

    socket.on('battle:next', (data) => {
      setCorrectAnswer(data.previousCorrect);
      setScores(data.scores);
      // Show correct answer for 2 seconds, then next question
      setTimeout(() => {
        setQuestion(data.question);
        setQuestionIndex(data.questionIndex);
        setSelectedAnswer(null);
        setCorrectAnswer(null);
        setWaitingForOpponent(false);
        setTimer(TIMER_SECONDS);
      }, 2000);
    });

    socket.on('battle:finished', (data) => {
      setCorrectAnswer(data.correctAnswer);
      setTimeout(() => {
        setScores(data.players);
        setPhase('result');
        // Sync points from server so dashboard is up to date
        refreshMe();
      }, 2000);
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
    if (timer <= 0) {
      handleAnswer(null); // Time's up
      return;
    }
    timerRef.current = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timer, phase, waitingForOpponent, correctAnswer]);

  const refreshRooms = useCallback(() => {
    socketRef.current?.emit('battle:list', (available) => {
      setRooms(available || []);
    });
  }, []);

  useEffect(() => {
    if (phase === 'lobby') refreshRooms();
  }, [phase, refreshRooms]);

  const createRoom = () => {
    if (!socketRef.current?.connected) {
      setError('Connexion au serveur en cours… Réessayez dans quelques secondes.');
      return;
    }
    socketRef.current.emit('battle:create', {
      name: `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim(),
      userId: user?._id,
    }, (res) => {
      if (!res || !res.roomId) {
        setError('Impossible de créer la salle. Veuillez réessayer.');
        return;
      }
      setRoomId(res.roomId);
      setIsHost(true);
      setPhase('waiting');
      setError('');
    });
  };

  const joinRoom = (rid) => {
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

  const startBattle = () => {
    socketRef.current?.emit('battle:start', { roomId });
  };

  const handleAnswer = (answer) => {
    if (selectedAnswer !== null || waitingForOpponent) return;
    setSelectedAnswer(answer);
    setWaitingForOpponent(true);
    socketRef.current?.emit('battle:answer', { roomId, questionIndex, answer });
  };

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
  };

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <Layout title="Quiz Battle">
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
          <ArrowLeft size={18} /> Retour
        </button>

        {error && (
          <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 14, marginBottom: 16 }}>
            {error}
            <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 700 }}>x</button>
          </div>
        )}

        {/* LOBBY */}
        {phase === 'lobby' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <Swords size={48} color="#1B4F72" />
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B4F72', marginTop: 12 }}>Quiz Battle</h1>
              <p style={{ color: '#64748b' }}>{'Défiez un autre étudiant en temps réel !'}</p>
            </div>

            <button onClick={createRoom} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', padding: '16px', borderRadius: 12, background: '#1B4F72',
              color: 'white', border: 'none', fontSize: 16, fontWeight: 600, cursor: 'pointer',
              marginBottom: 24
            }}>
              <Plus size={20} /> {'Créer une salle'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1B4F72', margin: 0 }}>Salles disponibles</h2>
              <button onClick={refreshRooms} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1B4F72', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <RefreshCw size={14} /> Actualiser
              </button>
            </div>

            {rooms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', color: '#94a3b8' }}>
                <Users size={32} />
                <p style={{ marginTop: 8 }}>{'Aucune salle disponible. Créez-en une !'}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rooms.map(r => (
                  <div key={r.roomId} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 18px', background: 'white', borderRadius: 10, border: '1px solid #e5e7eb'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.host}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>En attente d'un adversaire</div>
                    </div>
                    <button onClick={() => joinRoom(r.roomId)} style={{
                      padding: '8px 20px', borderRadius: 8, background: '#2874A6',
                      color: 'white', border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer'
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
            <Users size={48} color="#1B4F72" />
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1B4F72', marginTop: 16 }}>
              {players.length < 2 ? "En attente d'un adversaire..." : 'Adversaire trouve !'}
            </h2>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
              {players.map((p, i) => (
                <div key={i} style={{ padding: '16px 24px', background: 'white', borderRadius: 12, border: '2px solid #1B4F72', minWidth: 140 }}>
                  <div style={{ fontWeight: 600, color: '#1B4F72', fontSize: 16 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Joueur {i + 1}</div>
                </div>
              ))}
              {players.length < 2 && (
                <div style={{ padding: '16px 24px', background: '#f8fafc', borderRadius: 12, border: '2px dashed #d1d5db', minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ color: '#94a3b8' }}>???</div>
                </div>
              )}
            </div>

            {roomId && players.length < 2 && (
              <div style={{ marginTop: 20, padding: '12px 16px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd', fontSize: 13, color: '#0369a1' }}>
                Code de la salle : <strong>{roomId}</strong>
              </div>
            )}

            {isHost && players.length === 2 && (
              <button onClick={startBattle} style={{
                marginTop: 24, padding: '14px 40px', borderRadius: 10, background: '#16A34A',
                color: 'white', border: 'none', fontSize: 16, fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8
              }}>
                <Zap size={20} /> Commencer le Battle !
              </button>
            )}

            <div style={{ marginTop: 16 }}>
              <button onClick={playAgain} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>
                Annuler et revenir au lobby
              </button>
            </div>
          </div>
        )}

        {/* PLAYING */}
        {phase === 'playing' && question && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>
                Question {questionIndex + 1} / {totalQuestions}
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                borderRadius: 20, background: timer <= 5 ? '#FEF2F2' : '#f8fafc',
                color: timer <= 5 ? '#DC2626' : '#1B4F72', fontWeight: 700, fontSize: 18
              }}>
                <Clock size={16} /> {timer}s
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, marginBottom: 20 }}>
              <div style={{ height: '100%', background: '#1B4F72', borderRadius: 2, width: `${((questionIndex + 1) / totalQuestions) * 100}%`, transition: 'width 0.3s' }} />
            </div>

            {/* Scores */}
            {scores.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
                {scores.map((s, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#64748b' }}>
                    {s.name}: <strong style={{ color: '#1B4F72' }}>{s.score} pts</strong>
                  </div>
                ))}
              </div>
            )}

            {/* Question */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24, marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>{question.texte}</h2>
            </div>

            {/* Options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {optionLabels.map(letter => {
                const isSelected = selectedAnswer === letter;
                const isCorrect = correctAnswer === letter;
                const showResult = correctAnswer !== null;

                let bg = 'white', border = '#e5e7eb', textColor = '#1e293b';
                if (showResult && isCorrect) { bg = '#F0FDF4'; border = '#16A34A'; textColor = '#16A34A'; }
                else if (showResult && isSelected && !isCorrect) { bg = '#FEF2F2'; border = '#DC2626'; textColor = '#DC2626'; }
                else if (isSelected) { bg = '#EBF5FB'; border = '#1B4F72'; textColor = '#1B4F72'; }

                return (
                  <button key={letter}
                    onClick={() => !showResult && handleAnswer(letter)}
                    disabled={selectedAnswer !== null}
                    style={{
                      padding: '16px', borderRadius: 10, background: bg,
                      border: `2px solid ${border}`, cursor: selectedAnswer ? 'default' : 'pointer',
                      textAlign: 'left', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 12,
                      fontFamily: 'inherit', fontSize: 14
                    }}>
                    <span style={{ width: 32, height: 32, borderRadius: '50%', background: border, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                      {letter}
                    </span>
                    <span style={{ fontWeight: 500, color: textColor, fontSize: 14 }}>
                      {question.options?.[letter]}
                    </span>
                    {showResult && isCorrect && <CheckCircle size={18} color="#16A34A" style={{ marginLeft: 'auto' }} />}
                    {showResult && isSelected && !isCorrect && <XCircle size={18} color="#DC2626" style={{ marginLeft: 'auto' }} />}
                  </button>
                );
              })}
            </div>

            {waitingForOpponent && !correctAnswer && (
              <div style={{ textAlign: 'center', marginTop: 20, color: '#94a3b8', fontSize: 14 }}>
                En attente de la reponse de l'adversaire...
              </div>
            )}
          </div>
        )}

        {/* RESULT */}
        {phase === 'result' && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Trophy size={56} color="#F59E0B" />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B4F72', marginTop: 16 }}>Resultats</h1>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 24, flexWrap: 'wrap' }}>
              {[...scores].sort((a, b) => b.score - a.score).map((s, i) => (
                <div key={i} style={{
                  padding: '24px 32px', background: 'white', borderRadius: 16,
                  border: i === 0 ? '3px solid #F59E0B' : '1px solid #e5e7eb',
                  minWidth: 160
                }}>
                  {i === 0 && <div style={{ fontSize: 28, marginBottom: 4 }}>
                    <Trophy size={28} color="#F59E0B" />
                  </div>}
                  <div style={{ fontWeight: 700, color: '#1B4F72', fontSize: 18, marginTop: 8 }}>{s.name}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: i === 0 ? '#F59E0B' : '#64748b', marginTop: 8 }}>{s.score} pts</div>
                </div>
              ))}
            </div>

            {scores.length === 2 && scores[0].score === scores[1].score && (
              <p style={{ marginTop: 16, color: '#64748b', fontWeight: 600 }}>Egalite !</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
              <button onClick={playAgain} style={{
                padding: '12px 28px', borderRadius: 10, background: '#1B4F72',
                color: 'white', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <RefreshCw size={16} /> Rejouer
              </button>
              <button onClick={() => navigate('/')} style={{
                padding: '12px 28px', borderRadius: 10, background: 'white',
                color: '#1B4F72', border: '2px solid #1B4F72', fontSize: 15, fontWeight: 600, cursor: 'pointer'
              }}>
                Retour au tableau de bord
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
