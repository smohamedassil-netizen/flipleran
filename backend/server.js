import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
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
import supportRoutes    from './routes/supportRoutes.js';
import projectRoutes    from './routes/projectRoutes.js';
import videoAnalysisRoutes from './routes/videoAnalysisRoutes.js';
import notificationRoutes  from './routes/notificationRoutes.js';
import trackingRoutes      from './routes/trackingRoutes.js';
import rewardRoutes        from './routes/rewardRoutes.js';
import feedbackRoutes      from './routes/feedbackRoutes.js';
import battleRoutes        from './routes/battleRoutes.js';
import prositRoutes        from './routes/prositRoutes.js';
import userRoutes          from './routes/userRoutes.js';
import { seedDemoContent } from './services/contentSeed.js';
import { seedDemoData } from './services/demoSeed.js';
import { seedProsits }  from './services/prositsSeed.js';
import { seedUsers } from './services/usersSeed.js';

// Migration : les comptes créés avant le système d'approval n'ont pas de status,
// on les considère actifs par défaut (sinon ils ne pourraient plus se connecter).
async function migrateUserStatus() {
  try {
    const result = await User.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'active' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`[migration] ${result.modifiedCount} comptes existants marqués 'active'`);
    }
  } catch (err) {
    console.error('[migration] userStatus:', err.message);
  }
}

/**
 * Seeds de contenu de démonstration (utilisateurs fictifs, cours, vidéos,
 * Prosits…). Strictement opt-in en dev/staging via SEED_CONTENT='true'.
 * Ne tourne JAMAIS en production : Render redémarre fréquemment et un seed
 * automatique pourrait écraser des données réelles.
 *
 * Pour les seeds idempotents essentiels (badges, rewards), voir le script
 * dédié backend/scripts/seed-prod.js, à exécuter manuellement après le
 * premier déploiement.
 */
async function runDemoSeedsIfEnabled() {
  if (process.env.NODE_ENV === 'production') {
    return; // garde-fou explicite : jamais en prod, même si SEED_CONTENT=true
  }
  if (process.env.SEED_CONTENT !== 'true') {
    return; // opt-in strict (pas opt-out comme avant)
  }
  console.log('[seed] SEED_CONTENT=true détecté en dev/staging — exécution des seeds de démo…');
  try {
    await seedUsers();
    await seedDemoContent();
    await seedDemoData();
    await seedProsits();
    console.log('[seed] Seeds de démo terminés.');
  } catch (err) {
    console.error('[seed]', err.message);
  }
}
import { startNotificationScheduler } from './services/notificationScheduler.js';

const app = express();
const httpServer = createServer(app);

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(s => s.trim())
  : ['http://localhost:5173'];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);

// En mode test (Jest), on n'établit pas la connexion DB / seeds / cron : l'app
// Express est juste exportée pour être consommée par supertest. Les tests qui
// touchent la DB devront mocker les models concernés.
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(async () => {
    await migrateUserStatus();
    await runDemoSeedsIfEnabled();
    startNotificationScheduler(io);
  });
}

// ── Security middleware ──────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(mongoSanitize());
app.use(hpp());
app.use(cookieParser());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,               // needed for httpOnly refresh cookie
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Rate limiters ───────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,        // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de requêtes, réessayez dans 15 minutes.' },
});
app.use('/api', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de tentatives, réessayez dans 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,        // 1 hour
  max: 30,
  keyGenerator: (req) => req.user?.id || 'anon',
  validate: { xForwardedForHeader: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Limite IA atteinte (30/h), réessayez plus tard.' },
});
app.use('/api/chatbot', aiLimiter);
app.use('/api/qcm/generate-ai', aiLimiter);

// Sert les vidéos locales déposées par le prof dans backend/public/videos/
// URL : http://.../videos/<filename>.mp4
app.use('/videos', express.static(path.join(__dirname, 'public', 'videos'), {
  maxAge: '1h',
  fallthrough: true,
}));

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
app.use('/api/support',    supportRoutes);
app.use('/api/projects',   projectRoutes);
app.use('/api/videos',     videoAnalysisRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tracking',   trackingRoutes);
app.use('/api/rewards',    rewardRoutes);
app.use('/api/feedback',   feedbackRoutes);
app.use('/api/battle',     battleRoutes);
app.use('/api/prosits',    prositRoutes);
app.use('/api/users',      userRoutes);

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

/* ── Quiz Battle state (room-based) ───────────────────────────────────── */
// battleRooms: roomId → { players: [], questions: [], currentQ: 0, answers: {}, started: false }
const battleRooms = new Map();

/* ── roomUsers: roomId → Map<socketId, userInfo> ──────────────────────── */
const roomUsers = new Map();

/* ═══════════════════════════════════════════════════════════════════════
   Socket Room ACL — canJoinRoom(socket, roomId)
   Returns true if the user is allowed to join the room.
═══════════════════════════════════════════════════════════════════════ */
async function canJoinRoom(socket, roomId) {
  const { id: userId, role } = socket.user;
  if (role === 'admin') return true;

  // user_<id> — personal notification room
  if (roomId.startsWith('user_')) {
    return roomId === `user_${userId}`;
  }

  // course_<courseId> — enrolled student OR course professor
  if (roomId.startsWith('course_')) {
    const courseId = roomId.replace('course_', '');
    const [progress, course] = await Promise.all([
      (await import('./models/Progress.js')).default.exists({ userId, courseId }),
      (await import('./models/Course.js')).default.exists({ _id: courseId, professorId: userId }),
    ]);
    return !!(progress || course);
  }

  // prosit_<prositId>
  if (roomId.startsWith('prosit_')) {
    const prositId = roomId.replace('prosit_', '');
    const Prosit = (await import('./models/Prosit.js')).default;
    const found = await Prosit.exists({
      _id: prositId,
      $or: [
        { createdBy: userId },
        { 'groupes.membres.userId': userId },
      ],
    });
    return !!found;
  }

  // project_<projectId>
  if (roomId.startsWith('project_')) {
    const projectId = roomId.replace('project_', '');
    const Project = (await import('./models/Project.js')).default;
    const found = await Project.exists({
      _id: projectId,
      $or: [
        { createdBy: userId },
        { 'groupes.membres.userId': userId },
      ],
    });
    return !!found;
  }

  // BATTLE-<roomId> — only players already registered via battle:create/join
  if (roomId.startsWith('BATTLE-')) {
    const room = battleRooms.get(roomId);
    return !!room && room.players.some(p => p.odgerId === userId);
  }

  // bot_<…>, private chat rooms — allow (authenticated users only)
  if (roomId.startsWith('bot_') || roomId.startsWith('private_')) {
    return true;
  }

  // Unknown prefix → deny
  return false;
}

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

  // Auto-join personal notification room (server-side, no user input)
  socket.join(`user_${user.id}`);

  /* ── join — validated room join (replaces old generic handler) ────── */
  socket.on('join', async (roomId) => {
    if (!roomId) return;
    try {
      if (!(await canJoinRoom(socket, roomId))) {
        console.warn(`[ACL] DENIED join room=${roomId} user=${user.id} role=${user.role}`);
        socket.emit('error', { message: 'Accès refusé à cette salle.' });
        return;
      }
      socket.join(roomId);
    } catch (err) {
      console.error(`[ACL] Error checking room=${roomId}:`, err.message);
    }
  });

  /* ── join_room — chat room join with ACL ─────────────────────────── */
  socket.on('join_room', async (roomId) => {
    if (!roomId) return;

    try {
      if (!(await canJoinRoom(socket, roomId))) {
        console.warn(`[ACL] DENIED join_room room=${roomId} user=${user.id} role=${user.role}`);
        socket.emit('error', { message: 'Accès refusé à cette salle.' });
        return;
      }
    } catch (err) {
      console.error(`[ACL] Error checking room=${roomId}:`, err.message);
      return;
    }

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
  socket.on('send_message', async ({ roomId, content, receiverId, type = 'text', priority = 'normal' }) => {
    if (!content?.trim() || !roomId) return;
    try {
      // Only professors and admins can send urgent messages
      const msgPriority = (user.role === 'professeur' || user.role === 'admin') ? priority : 'normal';

      // 1. Sauvegarder et diffuser le message de l'utilisateur
      const msg = await Message.create({
        senderId:   user.id,
        receiverId: receiverId || undefined,
        roomId,
        content:    content.trim(),
        type,
        priority:   msgPriority,
      });
      await msg.populate('senderId', 'nom prenom');

      socket.to(roomId).emit('stop_typing', { userId: user.id });
      io.to(roomId).emit('receive_message', msg);

      // Notification for course chat messages (notify all room members except sender)
      if (roomId.startsWith('course_')) {
        const courseId = roomId.replace('course_', '');
        const isUrgent = msgPriority === 'urgent';
        const notifPrefix = isUrgent ? '🔴 URGENT — ' : '';
        const roomSockets = await io.in(roomId).fetchSockets();
        for (const s of roomSockets) {
          if (s.user?.id !== user.id) {
            s.emit('notification', {
              type: isUrgent ? 'urgent' : 'message',
              priority: msgPriority,
              message: `${notifPrefix}${user.prenom} ${user.nom} dans le chat du cours`,
              link: `/chat/course/${courseId}`,
              createdAt: new Date().toISOString(),
            });
          }
        }

        // Send email for urgent course messages to ALL enrolled students
        if (isUrgent) {
          try {
            const { sendNotificationEmail, sendUrgentEmail } = await import('./services/emailService.js');
            const course = await (await import('./models/Course.js')).default.findById(courseId).select('titre');
            const students = await User.find({ role: 'etudiant', isActive: true }).select('email prenom nom');
            const courseName = course?.titre || 'un cours';
            for (const student of students) {
              if (student.email) {
                sendUrgentEmail(
                  student.email,
                  `Message urgent — ${courseName}`,
                  `<strong>${user.prenom} ${user.nom}</strong> a envoye un message urgent dans le cours <strong>${courseName}</strong> :<br><br><em>"${content.trim().substring(0, 200)}"</em><br><br>Connectez-vous pour voir le message complet.`
                );
              }
            }
          } catch (emailErr) {
            console.error('[EMAIL] Urgent course notification error:', emailErr.message);
          }
        }
      }

      // 2b. Notification temps réel pour le destinataire (messages privés)
      if (receiverId && !roomId.startsWith('bot_')) {
        const isUrgent = msgPriority === 'urgent';
        const notifPrefix = isUrgent ? '🔴 URGENT — ' : '';

        io.to(`user_${receiverId}`).emit('notification', {
          type: isUrgent ? 'urgent' : 'message',
          priority: msgPriority,
          message: `${notifPrefix}Nouveau message de ${user.prenom} ${user.nom}`,
          link: `/chat/private/${user.id}`,
          from: user.id,
          createdAt: new Date().toISOString(),
        });

        // Send email notification
        try {
          const { sendNotificationEmail, sendUrgentEmail } = await import('./services/emailService.js');
          const recipient = await User.findById(receiverId).select('email prenom');
          console.log('[EMAIL] Private message -> receiverId:', receiverId, '-> email:', recipient?.email, '-> priority:', msgPriority);
          if (recipient?.email) {
            if (isUrgent) {
              sendUrgentEmail(
                recipient.email,
                'Message urgent',
                `<strong>${user.prenom} ${user.nom}</strong> vous a envoye un message urgent sur FlipLearn :<br><br><em>"${content.trim().substring(0, 200)}"</em><br><br>Connectez-vous pour repondre.`
              );
            } else {
              sendNotificationEmail(
                recipient.email,
                'Nouveau message',
                `Vous avez recu un nouveau message de <strong>${user.prenom} ${user.nom}</strong> sur FlipLearn. Connectez-vous pour le lire !`
              );
            }
          }
        } catch (emailErr) {
          console.error('Email notification error:', emailErr.message);
        }
      }

      // (Le chatbot general askBot a ete supprime — seul l'Assistant Module
      //  par cours subsiste, accessible via /api/chatbot/module/:courseId.)
    } catch (err) {
      console.error('[send_message]', err.message);
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

    // Clean up battle rooms on disconnect
    battleRooms.forEach((room, id) => {
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        io.to(id).emit('battle:playerLeft', { message: 'L\'adversaire a quitté la partie' });
        if (room.players.length === 0) battleRooms.delete(id);
      }
    });
  });

  /* ══════════════════════════════════════════════════════════════════════
     QUIZ BATTLE EVENTS (room-based)
  ══════════════════════════════════════════════════════════════════════ */

  /* Créer une salle de bataille */
  socket.on('battle:create', async (data, callback) => {
    const roomId = 'BATTLE-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    battleRooms.set(roomId, {
      players: [{ id: socket.id, name: data.name, odgerId: data.userId, score: 0 }],
      questions: [],
      currentQ: 0,
      answers: {},
      started: false,
      // Cours (matière) sélectionné par l'hôte ; null = toutes matières
      courseId: data.courseId || null,
    });
    socket.join(roomId);
    if (typeof callback === 'function') callback({ roomId });

    // Notify all connected users about the new battle room
    socket.broadcast.emit('notification', {
      type: 'quiz_battle',
      message: `${data.name} a créé une salle de Quiz Battle ! Rejoignez-le !`,
      link: '/quiz-battle',
      createdAt: new Date().toISOString(),
    });

    // Send email to classmates about quiz battle
    try {
      const { sendNotificationEmail } = await import('./services/emailService.js');
      const students = await User.find({
        role: 'etudiant',
        isActive: { $ne: false },
        _id: { $ne: data.userId },
      }).select('email prenom').limit(30);

      for (const student of students) {
        if (student.email) {
          sendNotificationEmail(
            student.email,
            'Invitation Quiz Battle',
            `<strong>${data.name}</strong> vous invite à un Quiz Battle sur FlipLearn ! Connectez-vous pour relever le défi ! ⚔️`
          );
        }
      }
    } catch (err) {
      console.error('Quiz battle email error:', err.message);
    }
  });

  /* Rejoindre une salle */
  socket.on('battle:join', ({ roomId, name, userId }, callback) => {
    const room = battleRooms.get(roomId);
    if (!room) return typeof callback === 'function' && callback({ error: 'Salle introuvable' });
    if (room.players.length >= 2) return typeof callback === 'function' && callback({ error: 'Salle pleine' });
    if (room.started) return typeof callback === 'function' && callback({ error: 'Partie déjà commencée' });

    room.players.push({ id: socket.id, name, odgerId: userId, score: 0 });
    socket.join(roomId);
    if (typeof callback === 'function') callback({ success: true });

    // Notify both players
    io.to(roomId).emit('battle:players', room.players.map(p => ({ name: p.name, odgerId: p.odgerId, score: p.score })));
  });

  /* Démarrer la bataille */
  socket.on('battle:start', async ({ roomId }) => {
    const room = battleRooms.get(roomId);
    if (!room || room.players.length < 2) return;
    room.started = true;

    // Charger des questions aléatoires depuis les QCMs existants.
    // Si un courseId est sélectionné, ne tirer que les QCMs des vidéos de ce cours.
    let questions = [];
    try {
      const QCM = (await import('./models/QCM.js')).default;
      let qcmQuery = {};
      if (room.courseId) {
        const Video = (await import('./models/Video.js')).default;
        const videoIds = await Video.find({ courseId: room.courseId }).select('_id');
        qcmQuery = { videoId: { $in: videoIds.map(v => v._id) } };
      }
      const qcms = await QCM.find(qcmQuery).select('questions').limit(20);
      const allQuestions = qcms.flatMap(q => q.questions || []);
      // Mélanger et prendre 5
      questions = allQuestions.sort(() => Math.random() - 0.5).slice(0, 5).map(q => ({
        texte: q.texte,
        options: q.options,
        correctAnswer: q.correctAnswer,
      }));
    } catch { /* pas de QCM disponible */ }

    if (questions.length < 2) {
      // Questions de démo si aucun QCM en base
      questions = [
        { texte: 'Qu\'est-ce qu\'un algorithme ?', options: { A: 'Un programme', B: 'Une suite d\'instructions', C: 'Un langage', D: 'Un compilateur' }, correctAnswer: 'B' },
        { texte: 'Quelle est la complexité d\'un tri fusion ?', options: { A: 'O(n)', B: 'O(n²)', C: 'O(n log n)', D: 'O(log n)' }, correctAnswer: 'C' },
        { texte: 'SQL est un langage :', options: { A: 'Compilé', B: 'De requête', C: 'Objet', D: 'Fonctionnel' }, correctAnswer: 'B' },
        { texte: 'HTTP est un protocole de :', options: { A: 'Réseau', B: 'Transport', C: 'Application', D: 'Liaison' }, correctAnswer: 'C' },
        { texte: 'Un processus est :', options: { A: 'Un programme en mémoire', B: 'Un fichier', C: 'Un thread', D: 'Un CPU' }, correctAnswer: 'A' },
      ];
    }

    room.questions = questions;

    io.to(roomId).emit('battle:started', {
      totalQuestions: room.questions.length,
      question: {
        texte: room.questions[0].texte,
        options: room.questions[0].options,
      },
      questionIndex: 0,
    });
  });

  /* Soumettre une réponse */
  socket.on('battle:answer', async ({ roomId, questionIndex, answer, powerup }) => {
    const room = battleRooms.get(roomId);
    if (!room) return;

    const playerIdx = room.players.findIndex(p => p.id === socket.id);
    if (playerIdx === -1) return;

    if (!room.answers[questionIndex]) room.answers[questionIndex] = {};

    // Prevent duplicate answers
    if (room.answers[questionIndex][socket.id]) return;

    const player = room.players[playerIdx];
    player.streak = player.streak || 0;
    player.bestStreak = player.bestStreak || 0;
    player.correctCount = player.correctCount || 0;

    const correct = answer != null && room.questions[questionIndex]?.correctAnswer === answer;

    let gained = 0;
    if (correct) {
      gained = 10;
      if (powerup === 'double') gained += 10;      // Double points power-up
      player.streak += 1;
      // Streak bonus: +5 à partir de 3 combos, +10 à partir de 5
      if (player.streak >= 5) gained += 10;
      else if (player.streak >= 3) gained += 5;
      if (player.streak > player.bestStreak) player.bestStreak = player.streak;
      player.correctCount += 1;
    } else {
      player.streak = 0;
    }
    player.score += gained;

    room.answers[questionIndex][socket.id] = { answer, correct, gained };

    // Notifier l'adversaire qu'un power-up a été utilisé (effet visuel)
    if (powerup) {
      socket.to(roomId).emit('battle:opponent_powerup', { powerup });
    }

    // Check if both players answered
    if (Object.keys(room.answers[questionIndex]).length === 2) {
      const nextQ = questionIndex + 1;

      if (nextQ >= room.questions.length) {
        io.to(roomId).emit('battle:finished', {
          players: room.players.map(p => ({
            name: p.name,
            score: p.score,
            bestStreak: p.bestStreak || 0,
            correctCount: p.correctCount || 0,
          })),
          totalQuestions: room.questions.length,
          correctAnswer: room.questions[questionIndex].correctAnswer,
        });

        // Persister les résultats pour le classement interne du Quiz Battle.
        // ⚠️ Conformément au brief 01 (cadre éducatif) : aucune XP ajoutée à User.points.
        // Le classement BattleResult est entièrement séparé de l'XP global.
        try {
          const BattleResult = (await import('./models/BattleResult.js')).default;
          const [p1, p2] = room.players;
          if (p1 && p2 && p1.odgerId && p2.odgerId) {
            const draw = p1.score === p2.score;
            const p1Outcome = draw ? 'draw' : (p1.score > p2.score ? 'win' : 'loss');
            const p2Outcome = draw ? 'draw' : (p2.score > p1.score ? 'win' : 'loss');
            const total = room.questions.length;
            await BattleResult.insertMany([
              {
                userId: p1.odgerId, opponentId: p2.odgerId, courseId: room.courseId,
                score: p1.score, correctCount: p1.correctCount || 0, totalQuestions: total,
                bestStreak: p1.bestStreak || 0, outcome: p1Outcome,
              },
              {
                userId: p2.odgerId, opponentId: p1.odgerId, courseId: room.courseId,
                score: p2.score, correctCount: p2.correctCount || 0, totalQuestions: total,
                bestStreak: p2.bestStreak || 0, outcome: p2Outcome,
              },
            ]);
          }
        } catch (err) {
          console.error('[battle] persist results error:', err.message);
        }

        setTimeout(() => battleRooms.delete(roomId), 5000);
      } else {
        io.to(roomId).emit('battle:next', {
          questionIndex: nextQ,
          question: {
            texte: room.questions[nextQ].texte,
            options: room.questions[nextQ].options,
          },
          scores: room.players.map(p => ({
            name: p.name, score: p.score,
            streak: p.streak || 0, bestStreak: p.bestStreak || 0,
          })),
          previousCorrect: room.questions[questionIndex].correctAnswer,
          gained: Object.fromEntries(
            Object.entries(room.answers[questionIndex]).map(([sid, a]) => {
              const pIdx = room.players.findIndex(p => p.id === sid);
              return [room.players[pIdx]?.name || 'Player', a.gained];
            })
          ),
        });
      }
    }
  });

  /* Lister les salles disponibles */
  socket.on('battle:list', (callback) => {
    if (typeof callback !== 'function') return;
    const available = [];
    battleRooms.forEach((room, id) => {
      if (!room.started && room.players.length === 1) {
        available.push({ roomId: id, host: room.players[0].name });
      }
    });
    callback(available);
  });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export { app, httpServer, io };
export default app;
