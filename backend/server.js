import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
import connectDB from './config/db.js';
import User    from './models/User.js';
import Message from './models/Message.js';

// Routes
import authRoutes     from './routes/authRoutes.js';
import deckRoutes     from './routes/deckRoutes.js';
import cardRoutes     from './routes/cardRoutes.js';
import courseRoutes   from './routes/courseRoutes.js';
import videoRoutes    from './routes/videoRoutes.js';
import qcmRoutes      from './routes/qcmRoutes.js';
import messageRoutes  from './routes/messageRoutes.js';
import badgeRoutes    from './routes/badgeRoutes.js';
import progressRoutes    from './routes/progressRoutes.js';
import professorRoutes   from './routes/professorRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import chatbotRoutes    from './routes/chatbotRoutes.js';
import resourceRoutes   from './routes/resourceRoutes.js';
import adminRoutes      from './routes/adminRoutes.js';
import { seedBadges }   from './services/points.js';
import { askBot }       from './services/chatbot.js';
import { BOT_SENDER }   from './controllers/chatbotController.js';

const app = express();
const httpServer = createServer(app);

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(s => s.trim())
  : ['http://localhost:5173'];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

connectDB().then(() => seedBadges().catch(console.error));

// Middleware
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API routes
app.use('/api/auth',     authRoutes);
app.use('/api/decks',    deckRoutes);
app.use('/api/decks/:deckId/cards', cardRoutes);
app.use('/api/courses',  courseRoutes);
app.use('/api/videos',   videoRoutes);
app.use('/api/qcm',      qcmRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/badges',   badgeRoutes);
app.use('/api/progress',  progressRoutes);
app.use('/api/professor',    professorRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/chatbot',    chatbotRoutes);
app.use('/api/resources',  resourceRoutes);
app.use('/api/admin',      adminRoutes);

// ── En production : servir le frontend buildé ──────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));

  // Toute route qui n'est pas /api/* renvoie index.html (SPA)
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  // Health check en dev
  app.get('/', (_req, res) => res.json({ message: 'FlipLearn API is running' }));
}

/* ══════════════════════════════════════════════════════════════════════════
   Socket.io — authentification JWT
══════════════════════════════════════════════════════════════════════════ */
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('nom prenom role');
    if (!user) return next(new Error('Unauthorized'));

    socket.user = {
      id:     user._id.toString(),
      nom:    user.nom,
      prenom: user.prenom,
      role:   user.role,
    };
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

/* ── Quiz Battle state ────────────────────────────────────────────────── */
// onlineForBattle: userId → { socketId, nom, prenom, filiere, promotion }
const onlineBattle = new Map();
// battles: battleId → { p1, p2, questions, answers, status, startedAt }
const battles      = new Map();
// pendingChallenges: targetUserId → { battleId, challengerId, name }
const challenges   = new Map();

/* ── roomUsers: roomId → Map<socketId, userInfo> ──────────────────────── */
const roomUsers = new Map();

function getRoomParticipants(roomId) {
  const room = roomUsers.get(roomId);
  if (!room) return [];
  // Déduplique par userId (même user peut avoir plusieurs onglets)
  return Array.from(
    new Map([...room.values()].map((u) => [u.userId, u])).values()
  );
}

function leaveRoom(socket, roomId) {
  const room = roomUsers.get(roomId);
  if (!room) return;
  room.delete(socket.id);
  socket.to(roomId).emit('stop_typing', { userId: socket.user.id });
  if (room.size === 0) {
    roomUsers.delete(roomId);
  } else {
    io.to(roomId).emit('room_users', getRoomParticipants(roomId));
  }
}

/* ── Connexion ─────────────────────────────────────────────────────────── */
io.on('connection', (socket) => {
  const user = socket.user;

  /* ── join_room ─────────────────────────────────────────────────────── */
  socket.on('join_room', async (roomId) => {
    if (!roomId) return;

    // Quitter la salle précédente
    if (socket.currentRoom && socket.currentRoom !== roomId) {
      socket.leave(socket.currentRoom);
      leaveRoom(socket, socket.currentRoom);
    }

    socket.join(roomId);
    socket.currentRoom = roomId;

    // Enregistrer dans la map
    if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Map());
    roomUsers.get(roomId).set(socket.id, {
      userId: user.id,
      nom:    user.nom,
      prenom: user.prenom,
      role:   user.role,
    });

    // Diffuser la liste des participants
    io.to(roomId).emit('room_users', getRoomParticipants(roomId));

    // Envoyer l'historique (50 derniers messages)
    try {
      const history = await Message.find({ roomId })
        .populate('senderId', 'nom prenom')
        .sort({ createdAt: 1 })
        .limit(50);
      socket.emit('message_history', history);
    } catch { /* non-bloquant */ }
  });

  /* ── send_message ──────────────────────────────────────────────────── */
  socket.on('send_message', async ({ roomId, content, receiverId, type = 'text' }) => {
    if (!content?.trim() || !roomId) return;
    try {
      // 1. Sauvegarder et diffuser le message de l'utilisateur
      const msg = await Message.create({
        senderId:   user.id,
        receiverId: receiverId || undefined,
        roomId,
        content:    content.trim(),
        type,
      });
      await msg.populate('senderId', 'nom prenom');

      socket.to(roomId).emit('stop_typing', { userId: user.id });
      io.to(roomId).emit('receive_message', msg);

      // 2. Si salle bot → déclencher l'IA
      if (roomId.startsWith('bot_')) {
        // Indicateur "le bot réfléchit"
        io.to(roomId).emit('bot_thinking', true);

        // Charger l'historique pour le contexte
        const history = await Message.find({ roomId })
          .sort({ createdAt: 1 })
          .limit(12)
          .select('content type');

        // Appel Groq (non-bloquant pour les autres connexions)
        const aiText = await askBot(content.trim(), history);

        // Sauvegarder la réponse du bot
        const botMsg = await Message.create({
          roomId,
          content:    aiText,
          type:       'bot',
          senderName: 'Assistant FlipLearn',
        });

        io.to(roomId).emit('bot_thinking', false);

        // Diffuser avec un sender virtuel
        io.to(roomId).emit('receive_message', {
          ...botMsg.toObject(),
          senderId: BOT_SENDER,
        });
      }
    } catch (err) {
      console.error('[send_message]', err.message);
      if (roomId?.startsWith('bot_')) {
        io.to(roomId).emit('bot_thinking', false);
        io.to(roomId).emit('receive_message', {
          _id:      Date.now().toString(),
          roomId,
          content:  "Je rencontre un problème technique. Veuillez réessayer. 🙏",
          type:     'bot',
          senderId: BOT_SENDER,
          createdAt: new Date().toISOString(),
        });
      }
    }
  });

  /* ── typing ────────────────────────────────────────────────────────── */
  socket.on('typing', ({ roomId }) => {
    if (!roomId) return;
    socket.to(roomId).emit('typing', {
      userId: user.id,
      nom:    user.nom,
      prenom: user.prenom,
    });
  });

  /* ── stop_typing ───────────────────────────────────────────────────── */
  socket.on('stop_typing', ({ roomId }) => {
    if (!roomId) return;
    socket.to(roomId).emit('stop_typing', { userId: user.id });
  });

  /* ── disconnect ────────────────────────────────────────────────────── */
  socket.on('disconnect', () => {
    if (socket.currentRoom) leaveRoom(socket, socket.currentRoom);
    onlineBattle.delete(user.id);
  });

  /* ══════════════════════════════════════════════════════════════════════
     QUIZ BATTLE EVENTS
  ══════════════════════════════════════════════════════════════════════ */

  /* Rejoindre le lobby de bataille */
  socket.on('battle:online', () => {
    onlineBattle.set(user.id, {
      socketId:  socket.id,
      nom:       user.nom,
      prenom:    user.prenom,
      role:      user.role,
    });
    socket.emit('battle:online_ack');
  });

  /* Défier un joueur */
  socket.on('battle:challenge', ({ targetId }) => {
    const target = onlineBattle.get(targetId);
    if (!target) {
      return socket.emit('battle:error', { message: 'Ce joueur n\'est plus disponible.' });
    }
    if (challenges.has(targetId)) {
      return socket.emit('battle:error', { message: 'Ce joueur a déjà un défi en attente.' });
    }

    const battleId = `battle_${Date.now()}`;
    challenges.set(targetId, { battleId, challengerId: user.id, challengerName: `${user.prenom} ${user.nom}` });

    io.to(target.socketId).emit('battle:challenged', {
      battleId,
      challengerId:   user.id,
      challengerName: `${user.prenom} ${user.nom}`,
    });

    socket.emit('battle:challenge_sent', { battleId, targetId });
  });

  /* Accepter un défi */
  socket.on('battle:accept', async ({ battleId, challengerId }) => {
    const challenge = challenges.get(user.id);
    if (!challenge || challenge.battleId !== battleId) {
      return socket.emit('battle:error', { message: 'Défi introuvable ou expiré.' });
    }
    challenges.delete(user.id);

    const challenger = onlineBattle.get(challengerId);
    if (!challenger) {
      return socket.emit('battle:error', { message: 'L\'adversaire s\'est déconnecté.' });
    }

    // Charger 5 questions aléatoires depuis la base
    let questions = [];
    try {
      const QCM = (await import('./models/QCM.js')).default;
      const qcms = await QCM.find({}).select('questions').limit(20);
      const pool = qcms.flatMap((q) => q.questions.map((question) => ({
        _id:           question._id,
        texte:         question.texte,
        options:       question.options,
        correctAnswer: question.correctAnswer,
      })));
      // Mélanger et prendre 5
      questions = pool.sort(() => Math.random() - 0.5).slice(0, 5);
    } catch { /* pas de QCM disponible */ }

    if (questions.length < 2) {
      // Questions de démo si aucun QCM en base
      questions = [
        { _id: '1', texte: 'Qu\'est-ce qu\'un algorithme ?', options: { A: 'Un programme', B: 'Une suite d\'instructions', C: 'Un langage', D: 'Un compilateur' }, correctAnswer: 'B' },
        { _id: '2', texte: 'Quelle est la complexité d\'un tri fusion ?', options: { A: 'O(n)', B: 'O(n²)', C: 'O(n log n)', D: 'O(log n)' }, correctAnswer: 'C' },
        { _id: '3', texte: 'SQL est un langage :', options: { A: 'Compilé', B: 'De requête', C: 'Objet', D: 'Fonctionnel' }, correctAnswer: 'B' },
        { _id: '4', texte: 'HTTP est un protocole de :', options: { A: 'Réseau', B: 'Transport', C: 'Application', D: 'Liaison' }, correctAnswer: 'C' },
        { _id: '5', texte: 'Un processus est :', options: { A: 'Un programme en mémoire', B: 'Un fichier', C: 'Un thread', D: 'Un CPU' }, correctAnswer: 'A' },
      ];
    }

    // Sanitiser — masquer les bonnes réponses pour l'envoi aux clients
    const questionsForClient = questions.map(({ _id, texte, options }) => ({ _id, texte, options }));

    // Créer la salle de bataille
    battles.set(battleId, {
      p1:        { userId: challengerId,  socketId: challenger.socketId, score: 0, answers: [] },
      p2:        { userId: user.id,       socketId: socket.id,           score: 0, answers: [] },
      questions,
      status:    'playing',
      startedAt: Date.now(),
    });

    // Rejoindre la salle Socket.io
    const challengerSocket = io.sockets.sockets.get(challenger.socketId);
    challengerSocket?.join(battleId);
    socket.join(battleId);

    // Démarrer la bataille (3 s countdown géré côté client)
    io.to(battleId).emit('battle:start', {
      battleId,
      questions: questionsForClient,
      timerSeconds: 15,
      p1: { userId: challengerId,  name: challenge.challengerName },
      p2: { userId: user.id,       name: `${user.prenom} ${user.nom}` },
    });
  });

  /* Décliner un défi */
  socket.on('battle:decline', ({ challengerId }) => {
    challenges.delete(user.id);
    const challenger = onlineBattle.get(challengerId);
    if (challenger) {
      io.to(challenger.socketId).emit('battle:declined', { message: `${user.prenom} a décliné le défi.` });
    }
  });

  /* Soumettre une réponse */
  socket.on('battle:answer', ({ battleId, questionId, answer, timeLeft }) => {
    const battle = battles.get(battleId);
    if (!battle || battle.status !== 'playing') return;

    const isP1      = battle.p1.userId === user.id;
    const player    = isP1 ? battle.p1 : battle.p2;
    const opponent  = isP1 ? battle.p2 : battle.p1;

    // Éviter les doublons pour la même question
    if (player.answers.some((a) => a.questionId?.toString() === questionId?.toString())) return;

    const question = battle.questions.find((q) => q._id?.toString() === questionId?.toString());
    const correct  = !!question && question.correctAnswer === answer;
    const points   = correct ? Math.max(1, timeLeft) : 0;  // plus vite = plus de points

    player.score += points;
    player.answers.push({ questionId, answer, correct, points });

    // Diffuser la mise à jour des scores
    io.to(battleId).emit('battle:score_update', {
      p1Score: battle.p1.score,
      p2Score: battle.p2.score,
      lastAnswer: {
        userId:  user.id,
        correct,
        points,
        questionId,
      },
    });

    // Vérifier si la bataille est terminée
    const totalQ   = battle.questions.length;
    const p1Done   = battle.p1.answers.length >= totalQ;
    const p2Done   = battle.p2.answers.length >= totalQ;

    if (p1Done && p2Done) {
      battle.status = 'ended';
      const winner =
        battle.p1.score > battle.p2.score ? battle.p1.userId :
        battle.p2.score > battle.p1.score ? battle.p2.userId :
        null; // égalité

      io.to(battleId).emit('battle:end', {
        p1Score:  battle.p1.score,
        p2Score:  battle.p2.score,
        winner,
        questions: battle.questions, // avec bonnes réponses
      });
      setTimeout(() => battles.delete(battleId), 30000);
    }
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
