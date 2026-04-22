// ============================================================================
// FlipLearn — OpenAPI 3 specification
// ----------------------------------------------------------------------------
// Spec statique exposée sur /api-docs (Swagger UI) et /api-docs.json (raw).
// Pensée pour donner une vue d'ensemble au jury / à un nouveau développeur.
// Les endpoints sont documentés au niveau ressource ; le détail des payloads
// reste volontairement synthétique pour garder le fichier lisible.
// ============================================================================

const servers = [
  { url: 'http://localhost:5000', description: 'Développement local' },
  { url: 'https://fliplearn-api.onrender.com', description: 'Production (Render)' },
];

const securitySchemes = {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: "JWT obtenu via POST /api/auth/login, à placer dans l'en-tête Authorization.",
  },
};

// ── Schémas réutilisables ────────────────────────────────────────────────────
const schemas = {
  Error: {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Ressource introuvable' },
    },
  },
  AuthCredentials: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'etudiant@fliplearn.app' },
      password: { type: 'string', format: 'password', example: '••••••••' },
    },
  },
  RegisterPayload: {
    type: 'object',
    required: ['nom', 'prenom', 'email', 'password'],
    properties: {
      nom: { type: 'string', example: 'Kaabi' },
      prenom: { type: 'string', example: 'Assil' },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', format: 'password' },
      role: { type: 'string', enum: ['etudiant', 'professeur'], default: 'etudiant' },
    },
  },
  AuthResponse: {
    type: 'object',
    properties: {
      token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
      user: { $ref: '#/components/schemas/User' },
    },
  },
  User: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      nom: { type: 'string' },
      prenom: { type: 'string' },
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['etudiant', 'professeur', 'admin'] },
      status: { type: 'string', enum: ['pending', 'active', 'rejected'] },
      points: { type: 'integer', example: 420 },
      badges: { type: 'array', items: { type: 'string' } },
    },
  },
  Deck: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      titre: { type: 'string', example: 'Algorithmique — chapitre 1' },
      description: { type: 'string' },
      owner: { type: 'string', description: 'User id' },
      cardCount: { type: 'integer', example: 24 },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  Card: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      deckId: { type: 'string' },
      recto: { type: 'string', example: 'Quelle est la complexité du tri fusion ?' },
      verso: { type: 'string', example: 'O(n log n)' },
    },
  },
  QCM: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      videoId: { type: 'string' },
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            texte: { type: 'string' },
            options: {
              type: 'object',
              properties: {
                A: { type: 'string' }, B: { type: 'string' },
                C: { type: 'string' }, D: { type: 'string' },
              },
            },
            correctAnswer: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
          },
        },
      },
    },
  },
  Badge: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      code: { type: 'string', example: 'FIRST_DECK' },
      titre: { type: 'string', example: 'Premier deck créé' },
      description: { type: 'string' },
      icon: { type: 'string', example: '🏅' },
      points: { type: 'integer' },
    },
  },
  LeaderboardEntry: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      nom: { type: 'string' },
      prenom: { type: 'string' },
      points: { type: 'integer' },
      rank: { type: 'integer' },
    },
  },
  Message: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      roomId: { type: 'string' },
      senderId: { type: 'string' },
      receiverId: { type: 'string', nullable: true },
      content: { type: 'string' },
      type: { type: 'string', enum: ['text', 'bot', 'image', 'file'] },
      priority: { type: 'string', enum: ['normal', 'urgent'] },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
};

const unauthorizedResponse = {
  description: 'Token manquant ou invalide',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
};

const forbiddenResponse = {
  description: 'Accès interdit (rôle insuffisant)',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
};

const notFoundResponse = {
  description: 'Ressource introuvable',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
};

// ── Chemins ──────────────────────────────────────────────────────────────────
const paths = {
  // Auth
  '/api/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Inscription d\'un nouvel utilisateur',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterPayload' } } },
      },
      responses: {
        201: {
          description: 'Utilisateur créé (statut pending jusqu\'à approbation admin)',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
        },
        400: { description: 'Payload invalide' },
      },
    },
  },
  '/api/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Connexion',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthCredentials' } } },
      },
      responses: {
        200: {
          description: 'Authentification réussie',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
        },
        401: { description: 'Identifiants invalides' },
      },
    },
  },
  '/api/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Profil de l\'utilisateur connecté',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Profil',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
        },
        401: unauthorizedResponse,
      },
    },
  },

  // Decks
  '/api/decks': {
    get: {
      tags: ['Decks'],
      summary: 'Lister les decks de l\'utilisateur',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Liste',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/Deck' } },
            },
          },
        },
        401: unauthorizedResponse,
      },
    },
    post: {
      tags: ['Decks'],
      summary: 'Créer un deck',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['titre'],
              properties: {
                titre: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Deck créé',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Deck' } } },
        },
        401: unauthorizedResponse,
      },
    },
  },
  '/api/decks/{deckId}': {
    parameters: [
      { name: 'deckId', in: 'path', required: true, schema: { type: 'string' } },
    ],
    get: {
      tags: ['Decks'],
      summary: 'Détail d\'un deck',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Deck',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Deck' } } },
        },
        404: notFoundResponse,
      },
    },
    patch: {
      tags: ['Decks'],
      summary: 'Mettre à jour un deck',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Mis à jour' }, 404: notFoundResponse },
    },
    delete: {
      tags: ['Decks'],
      summary: 'Supprimer un deck',
      security: [{ bearerAuth: [] }],
      responses: { 204: { description: 'Supprimé' }, 404: notFoundResponse },
    },
  },

  // Cards
  '/api/decks/{deckId}/cards': {
    parameters: [
      { name: 'deckId', in: 'path', required: true, schema: { type: 'string' } },
    ],
    get: {
      tags: ['Cards'],
      summary: 'Lister les cartes d\'un deck',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Cartes',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/Card' } },
            },
          },
        },
      },
    },
    post: {
      tags: ['Cards'],
      summary: 'Ajouter une carte au deck',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['recto', 'verso'],
              properties: {
                recto: { type: 'string' },
                verso: { type: 'string' },
              },
            },
          },
        },
      },
      responses: { 201: { description: 'Carte créée' } },
    },
  },

  // Courses & videos
  '/api/courses': {
    get: {
      tags: ['Courses'],
      summary: 'Lister les cours accessibles',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Liste' } },
    },
    post: {
      tags: ['Courses'],
      summary: 'Créer un cours (professeur/admin)',
      security: [{ bearerAuth: [] }],
      responses: { 201: { description: 'Cours créé' }, 403: forbiddenResponse },
    },
  },
  '/api/videos': {
    get: {
      tags: ['Videos'],
      summary: 'Lister les vidéos',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Liste' } },
    },
    post: {
      tags: ['Videos'],
      summary: 'Uploader une vidéo (professeur/admin)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, courseId: { type: 'string' } } } } },
      },
      responses: { 201: { description: 'Vidéo uploadée' } },
    },
  },
  '/api/videos/{videoId}/analysis': {
    parameters: [{ name: 'videoId', in: 'path', required: true, schema: { type: 'string' } }],
    get: {
      tags: ['Videos'],
      summary: 'Obtenir l\'analyse IA d\'une vidéo (résumé, points clés)',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Analyse' }, 404: notFoundResponse },
    },
  },

  // QCM
  '/api/qcm': {
    get: {
      tags: ['QCM'],
      summary: 'Lister les QCM',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Liste' } },
    },
    post: {
      tags: ['QCM'],
      summary: 'Créer un QCM (professeur)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/QCM' } } },
      },
      responses: { 201: { description: 'Créé' }, 403: forbiddenResponse },
    },
  },
  '/api/qcm/{qcmId}/submit': {
    parameters: [{ name: 'qcmId', in: 'path', required: true, schema: { type: 'string' } }],
    post: {
      tags: ['QCM'],
      summary: 'Soumettre les réponses d\'un étudiant à un QCM',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                answers: {
                  type: 'array',
                  items: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Score calculé',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  score: { type: 'integer', example: 8 },
                  total: { type: 'integer', example: 10 },
                  pointsEarned: { type: 'integer', example: 40 },
                },
              },
            },
          },
        },
      },
    },
  },

  // Progress
  '/api/progress/me': {
    get: {
      tags: ['Progress'],
      summary: 'Progression de l\'utilisateur connecté',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Progression' } },
    },
  },

  // Leaderboard
  '/api/leaderboard': {
    get: {
      tags: ['Leaderboard'],
      summary: 'Classement global',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Top utilisateurs',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/LeaderboardEntry' } },
            },
          },
        },
      },
    },
  },

  // Badges
  '/api/badges': {
    get: {
      tags: ['Badges'],
      summary: 'Lister les badges disponibles',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Badges',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/Badge' } },
            },
          },
        },
      },
    },
  },

  // Chat / Messages
  '/api/messages/{roomId}': {
    parameters: [{ name: 'roomId', in: 'path', required: true, schema: { type: 'string' } }],
    get: {
      tags: ['Chat'],
      summary: 'Historique des messages d\'une salle',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Messages',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/Message' } },
            },
          },
        },
      },
    },
  },

  // Chatbot
  '/api/chatbot/ask': {
    post: {
      tags: ['Chatbot'],
      summary: 'Poser une question au chatbot IA',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['question'],
              properties: {
                question: { type: 'string' },
                context: { type: 'string', description: 'Contexte du module (optionnel)' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Réponse générée',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { answer: { type: 'string' } } },
            },
          },
        },
      },
    },
  },

  // Admin
  '/api/admin/users': {
    get: {
      tags: ['Admin'],
      summary: 'Lister tous les utilisateurs',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Utilisateurs' }, 403: forbiddenResponse },
    },
  },
  '/api/admin/users/{userId}/approve': {
    parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
    patch: {
      tags: ['Admin'],
      summary: 'Approuver un utilisateur en statut pending',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Approuvé' }, 403: forbiddenResponse, 404: notFoundResponse },
    },
  },
};

const tags = [
  { name: 'Auth', description: 'Inscription, connexion, profil' },
  { name: 'Decks', description: 'Decks de flashcards' },
  { name: 'Cards', description: 'Cartes (flashcards)' },
  { name: 'Courses', description: 'Cours et modules' },
  { name: 'Videos', description: 'Vidéos de cours + analyse IA' },
  { name: 'QCM', description: 'Quiz à choix multiples' },
  { name: 'Progress', description: 'Suivi de progression' },
  { name: 'Leaderboard', description: 'Classement et gamification' },
  { name: 'Badges', description: 'Badges et récompenses' },
  { name: 'Chat', description: 'Messagerie (REST + Socket.io)' },
  { name: 'Chatbot', description: 'Assistant IA pédagogique' },
  { name: 'Admin', description: 'Administration de la plateforme' },
];

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'FlipLearn API',
    version: '1.0.0',
    description:
      "API REST de FlipLearn — plateforme de classe inversée (flashcards, vidéos, QCM, gamification, chat, IA).\n\n" +
      "Toutes les routes protégées attendent un en-tête `Authorization: Bearer <token>` (JWT obtenu via `/api/auth/login`).",
    contact: { name: 'FlipLearn team' },
  },
  servers,
  tags,
  components: { securitySchemes, schemas },
  paths,
};

export default swaggerSpec;
