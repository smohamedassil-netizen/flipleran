# DOCUMENT 5 — TEMPS REEL : CHAT, NOTIFICATIONS ET QUIZ BATTLE

## 5.1 Qu'est-ce que Socket.io ?

Socket.io est une librairie qui permet la **communication bidirectionnelle en temps reel** entre le navigateur et le serveur via le protocole WebSocket.

**Difference entre HTTP classique et WebSocket :**
```
HTTP classique (requete/reponse) :
    Client → "Donne-moi les messages" → Serveur
    Client ← reponse ← Serveur
    (Le client doit redemander pour avoir les nouveaux messages)

WebSocket (connexion permanente) :
    Client ←→ connexion ouverte ←→ Serveur
    Le serveur peut ENVOYER des donnees au client sans que celui-ci demande
    → Les messages arrivent instantanement
```

---

## 5.2 Configuration de Socket.io

### Fichier : `backend/server.js` (lignes 37-49)

```javascript
const httpServer = createServer(app);  // Creer un serveur HTTP a partir d'Express

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,        // Autoriser les connexions depuis le frontend
        methods: ['GET', 'POST'],
    },
});

app.set('io', io);  // Rendre io accessible dans les controleurs
```

### Authentification des connexions Socket.io (lignes 95-114)

```javascript
io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;   // Le token JWT envoye par le client
    if (!token) return next(new Error('Unauthorized'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('nom prenom role');
    if (!user) return next(new Error('Unauthorized'));

    // Attacher les infos utilisateur au socket
    socket.user = { id: user._id.toString(), nom: user.nom, prenom: user.prenom, role: user.role };
    next();
});
```

**Ce middleware s'execute AVANT chaque connexion WebSocket.** Si le token est invalide, la connexion est refusee. Ainsi, seuls les utilisateurs connectes peuvent utiliser le chat.

---

## 5.3 Le systeme de chat

### Comment fonctionne une salle de chat (room)

Socket.io a un concept de **rooms** (salles). Quand un utilisateur rejoint une room, il recoit tous les messages envoyes dans cette room.

**3 types de salles dans FlipLearn :**

| Prefixe | Exemple | Usage |
|---|---|---|
| `course_` | `course_65a123` | Chat de groupe d'un cours (tous les etudiants + le prof) |
| `private_` | `private_65a123_65b456` | Chat prive entre 2 utilisateurs |
| `bot_` | `bot_65a123` | Chat avec l'agent IA |

### Rejoindre une salle (`join_room`)

```javascript
socket.on('join_room', async (roomId) => {
    // Quitter la salle precedente si on en avait une
    if (socket.currentRoom && socket.currentRoom !== roomId) {
        socket.leave(socket.currentRoom);
        leaveRoom(socket, socket.currentRoom);
    }

    socket.join(roomId);              // Rejoindre la nouvelle salle
    socket.currentRoom = roomId;

    // Enregistrer l'utilisateur dans la liste des participants
    if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Map());
    roomUsers.get(roomId).set(socket.id, {
        userId: user.id, nom: user.nom, prenom: user.prenom, role: user.role,
    });

    // Diffuser la liste des participants a tous dans la salle
    io.to(roomId).emit('room_users', getRoomParticipants(roomId));

    // Envoyer l'historique (50 derniers messages) au nouveau venu
    const history = await Message.find({ roomId })
        .populate('senderId', 'nom prenom')
        .sort({ createdAt: 1 })
        .limit(50);
    socket.emit('message_history', history);
});
```

### Envoyer un message (`send_message`)

```javascript
socket.on('send_message', async ({ roomId, content, receiverId, priority }) => {
    // 1. Sauvegarder le message en BDD
    const msg = await Message.create({
        senderId: user.id,
        receiverId: receiverId || undefined,
        roomId,
        content: content.trim(),
        priority: (user.role === 'professeur') ? priority : 'normal',
    });

    // 2. Diffuser le message a TOUS les membres de la salle
    io.to(roomId).emit('receive_message', msg);

    // 3. Envoyer une notification au destinataire (messages prives)
    if (receiverId) {
        io.to(`user_${receiverId}`).emit('notification', {
            type: 'message',
            message: `Nouveau message de ${user.prenom} ${user.nom}`,
            link: `/chat/private/${user.id}`,
        });
    }

    // 4. Si message urgent → envoyer un email
    if (priority === 'urgent') {
        sendUrgentEmail(recipient.email, 'Message urgent', `...`);
    }

    // 5. Si salle bot → declencher l'IA (voir document 4)
    if (roomId.startsWith('bot_')) {
        const aiText = await askBot(content, history);
        // ... sauvegarder et diffuser la reponse de l'IA
    }
});
```

### Indicateur de frappe (`typing`)

```javascript
socket.on('typing', ({ roomId }) => {
    socket.to(roomId).emit('typing', {
        userId: user.id, nom: user.nom, prenom: user.prenom,
    });
});

socket.on('stop_typing', ({ roomId }) => {
    socket.to(roomId).emit('stop_typing', { userId: user.id });
});
```

Quand un utilisateur tape, les autres voient "Karim est en train d'ecrire..." en temps reel.

---

## 5.4 Le Quiz Battle (duel entre etudiants)

### Comment ca marche

```
1. Joueur 1 cree une salle → battle:create
2. Tous les utilisateurs sont notifies (notification + email)
3. Joueur 2 rejoint → battle:join
4. Joueur 1 lance la partie → battle:start
5. Le serveur charge 5 questions aleatoires des QCM existants
6. Les 2 joueurs recoivent la meme question en meme temps
7. Chacun repond → quand les 2 ont repondu → question suivante
8. A la fin → scores compares → le gagnant est affiche
```

### Creation d'une salle (`battle:create`)

```javascript
socket.on('battle:create', async (data, callback) => {
    // Generer un code de salle aleatoire : "BATTLE-X7K9M2"
    const roomId = 'BATTLE-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Creer la structure de la salle
    battleRooms.set(roomId, {
        players: [{ id: socket.id, name: data.name, score: 0 }],
        questions: [],
        currentQ: 0,
        answers: {},
        started: false,
    });

    socket.join(roomId);
    callback({ roomId });  // Renvoyer le code au createur

    // Notifier tous les utilisateurs connectes
    socket.broadcast.emit('notification', {
        type: 'quiz_battle',
        message: `${data.name} a cree une salle de Quiz Battle ! Rejoignez-le !`,
    });
});
```

### Demarrage de la partie (`battle:start`)

```javascript
socket.on('battle:start', async ({ roomId }) => {
    const room = battleRooms.get(roomId);
    if (!room || room.players.length < 2) return;  // Il faut 2 joueurs
    room.started = true;

    // Charger des questions aleatoires depuis les QCMs existants en BDD
    const QCM = (await import('./models/QCM.js')).default;
    const qcms = await QCM.find({}).select('questions').limit(20);
    const allQuestions = qcms.flatMap(q => q.questions || []);

    // Melanger aleatoirement et prendre 5 questions
    questions = allQuestions.sort(() => Math.random() - 0.5).slice(0, 5);

    room.questions = questions;

    // Envoyer la premiere question aux 2 joueurs
    io.to(roomId).emit('battle:started', {
        totalQuestions: questions.length,
        question: { texte: questions[0].texte, options: questions[0].options },
        questionIndex: 0,
    });
});
```

### Soumission d'une reponse (`battle:answer`)

```javascript
socket.on('battle:answer', ({ roomId, questionIndex, answer }) => {
    const room = battleRooms.get(roomId);
    const playerIdx = room.players.findIndex(p => p.id === socket.id);

    // Verifier si la reponse est correcte
    const correct = answer === room.questions[questionIndex]?.correctAnswer;
    if (correct) room.players[playerIdx].score += 10;

    room.answers[questionIndex][socket.id] = { answer, correct };

    // Quand les 2 joueurs ont repondu → passer a la question suivante
    if (Object.keys(room.answers[questionIndex]).length === 2) {
        const nextQ = questionIndex + 1;

        if (nextQ >= room.questions.length) {
            // Partie terminee → envoyer les scores finaux
            io.to(roomId).emit('battle:finished', {
                players: room.players.map(p => ({ name: p.name, score: p.score })),
            });
        } else {
            // Question suivante
            io.to(roomId).emit('battle:next', {
                questionIndex: nextQ,
                question: { texte: room.questions[nextQ].texte, options: room.questions[nextQ].options },
                scores: room.players.map(p => ({ name: p.name, score: p.score })),
            });
        }
    }
});
```

---

## 5.5 Les notifications en temps reel

### Cote serveur : emettre une notification

```javascript
// Notification pour un utilisateur specifique
io.to(`user_${receiverId}`).emit('notification', {
    type: 'message',
    message: 'Nouveau message de Karim',
    link: '/chat/private/65a123',
});
```

Chaque utilisateur rejoint automatiquement une room `user_SONID` a la connexion. Ainsi, on peut lui envoyer des notifications ciblees.

### Cote frontend : ecouter les notifications

### Fichier : `frontend/src/context/NotificationContext.jsx`

```javascript
useEffect(() => {
    const socket = io(socketUrl, { auth: { token: user.token } });

    socket.on('connect', () => {
        socket.emit('join', `user_${user._id}`);  // Rejoindre sa room personnelle
    });

    socket.on('notification', (data) => {
        addNotification({
            message: data.message,
            type: data.type,
            link: data.link,
        });
    });

    return () => socket.disconnect();  // Nettoyage a la deconnexion
}, []);
```

Les notifications sont stockees dans le `localStorage` (persistent entre les sessions) et affichees dans un dropdown dans la topbar (la cloche avec le compteur rouge).
