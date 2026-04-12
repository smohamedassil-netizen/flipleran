# DOCUMENT 1 — PRESENTATION GENERALE DU PROJET FLIPLEARN

## 1.1 Qu'est-ce que FlipLearn ?

FlipLearn est une plateforme web d'e-learning basee sur le modele de la **classe inversee** (Flipped Classroom). Le principe est simple : au lieu que le professeur dispense son cours en classe et donne des exercices a la maison, c'est l'inverse. Le professeur publie ses cours, videos et ressources en ligne, l'etudiant les consulte chez lui a son rythme, et le temps en classe est consacre a la pratique, aux projets et aux echanges.

L'application s'adresse a un contexte universitaire algerien et comporte **trois roles** :
- **Etudiant** : consulte les cours, regarde les videos, passe les QCM, participe aux projets
- **Professeur** : cree les cours, uploade les videos, genere les QCM (manuellement ou par IA), suit la progression
- **Administrateur** : gere les utilisateurs, supervise la plateforme

## 1.2 Technologies utilisees

### Backend (cote serveur)

| Technologie | Version | Role | Pourquoi ce choix |
|---|---|---|---|
| **Node.js** | 18+ | Environnement d'execution JavaScript cote serveur | Permet d'utiliser JavaScript des deux cotes (front + back), ecosysteme npm tres riche, performant pour les operations I/O asynchrones |
| **Express.js** | 4.x | Framework web minimaliste | Le framework le plus utilise avec Node.js, leger, flexible, gestion simple des routes et middleware |
| **MongoDB** | 7.x | Base de donnees NoSQL orientee documents | Flexible (pas de schema rigide), stocke les donnees en JSON, parfait pour des structures imbriquees (QCM avec questions et reponses intégrees) |
| **Mongoose** | 8.x | ODM (Object Document Mapper) pour MongoDB | Permet de definir des schemas de validation, des relations entre documents, des hooks pre/post sauvegarde |
| **Socket.io** | 4.x | Communication temps reel bidirectionnelle (WebSocket) | Indispensable pour le chat en direct, les notifications instantanees et le Quiz Battle |
| **JWT (jsonwebtoken)** | 9.x | Authentification par token | Standard de l'industrie, stateless (pas besoin de stocker les sessions cote serveur), securise |
| **bcryptjs** | 2.x | Hashage des mots de passe | Algorithme bcrypt, standard de securite, salage automatique |
| **dotenv** | 16.x | Gestion des variables d'environnement | Permet de stocker les cles API et secrets hors du code source |

### Frontend (cote client)

| Technologie | Version | Role | Pourquoi ce choix |
|---|---|---|---|
| **React** | 18.x | Bibliotheque d'interface utilisateur | Composants reutilisables, DOM virtuel performant, ecosysteme tres riche, rendu reactif |
| **Vite** | 5.x | Bundler et serveur de developpement | Remplace Webpack, demarrage quasi-instantane, Hot Module Replacement rapide |
| **React Router** | 6.x | Navigation cote client (SPA) | Permet la navigation sans rechargement de page, routes protegees par role |
| **Axios** | 1.x | Client HTTP pour les requetes API | Plus riche que fetch() natif, intercepteurs pour injecter le JWT automatiquement |
| **Tailwind CSS** | - | Framework CSS utilitaire | Non utilise directement, le projet utilise du CSS custom avec des variables CSS |
| **Lucide React** | - | Bibliotheque d'icones SVG | Icones legeres, coherentes, utilisees dans la sidebar et la topbar |
| **Socket.io Client** | 4.x | Connexion WebSocket cote client | Permet au navigateur de recevoir les messages en temps reel |

### Services externes (API tierces)

| Service | Role | Modele economique |
|---|---|---|
| **MongoDB Atlas** | Base de donnees cloud | Gratuit jusqu'a 512 Mo |
| **Groq** (modele Llama 3.3 70B) | Agent IA : chatbot pedagogique + generation de QCM | Gratuit (API open source) |
| **Cloudinary** | Stockage cloud de videos et fichiers (jusqu'a 100 Mo) | Gratuit jusqu'a 25 Go |
| **Brevo** (ex-Sendinblue) | Envoi d'emails transactionnels | Gratuit : 300 emails/jour |
| **Resend** | Envoi d'emails (fallback si Brevo echoue) | Gratuit : 100 emails/jour |
| **Render.com** | Hebergement et deploiement | Gratuit (free tier, mise en veille apres 15 min) |

## 1.3 Architecture globale

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NAVIGATEUR WEB                                │
│                                                                      │
│   React 18 (SPA - Single Page Application)                          │
│   ├── AuthContext : gestion du login/logout et du token JWT          │
│   ├── NotificationContext : ecoute les events Socket.io              │
│   ├── GamificationContext : affiche les notifications de points      │
│   ├── Axios : envoie les requetes HTTP vers /api/*                   │
│   └── Socket.io Client : connexion WebSocket pour le temps reel      │
│                                                                      │
└───────────────┬──────────────────────┬──────────────────────────────┘
                │ HTTP (REST API)      │ WebSocket
                │ Port 5000           │ Port 5000
┌───────────────▼──────────────────────▼──────────────────────────────┐
│                    SERVEUR EXPRESS.JS                                 │
│                                                                      │
│   server.js (point d'entree unique)                                  │
│   ├── 16 Routes API : /api/auth, /api/courses, /api/qcm, etc.       │
│   ├── Middleware JWT : verifie le token sur chaque requete protegee   │
│   ├── Socket.io : gere le chat, les notifications, le Quiz Battle    │
│   └── 3 Services :                                                   │
│       ├── chatbot.js → appelle l'API Groq (IA)                       │
│       ├── emailService.js → appelle l'API Brevo/Resend               │
│       └── points.js → calcule les points et verifie les badges       │
│                                                                      │
└───────────────┬──────────┬──────────┬──────────┬───────────────────┘
                │          │          │          │
         ┌──────▼───┐ ┌───▼────┐ ┌───▼────┐ ┌───▼────┐
         │ MongoDB  │ │ Groq   │ │Cloudi- │ │ Brevo  │
         │ Atlas    │ │ API    │ │nary    │ │ API    │
         │ (BDD)    │ │ (IA)   │ │(fichier│ │(emails)│
         └──────────┘ └────────┘ └────────┘ └────────┘
```

## 1.4 Comment l'application fonctionne en developpement

En mode developpement, on lance deux serveurs :

1. `npm run dev:backend` → Express sur le port **5000** (API + Socket.io)
2. `npm run dev:frontend` → Vite sur le port **5173** (React)

Vite est configure pour **proxier** les requetes `/api/*` vers `http://localhost:5000`. Ainsi, quand React fait un appel `axios.get('/api/courses')`, Vite redirige automatiquement vers Express.

## 1.5 Comment l'application fonctionne en production

En production (sur Render.com), il n'y a qu'**un seul serveur** :

1. React est compile en fichiers statiques (`npm run build` → `frontend/dist/`)
2. Express sert ces fichiers statiques ET l'API sur le meme port
3. Toute URL qui ne commence pas par `/api/` renvoie `index.html` (SPA routing)

```javascript
// server.js, ligne 79-85
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(frontendDist));    // Sert les fichiers React compiles
    app.get(/^(?!\/api).*/, (req, res) => {
        res.sendFile('index.html');           // Toute route non-API → React
    });
}
```

## 1.6 Structure des dossiers

```
flipleran/
├── backend/
│   ├── server.js              # Point d'entree : Express + Socket.io (533 lignes)
│   ├── config/
│   │   ├── db.js              # Connexion MongoDB Atlas
│   │   └── cloudinary.js      # Configuration Cloudinary (upload fichiers)
│   ├── middleware/
│   │   └── authMiddleware.js  # Verification JWT sur chaque requete protegee
│   ├── models/                # 12 schemas Mongoose (structure des donnees)
│   ├── controllers/           # 16 controleurs (logique metier)
│   ├── routes/                # 16 fichiers de routes Express
│   ├── services/              # 3 services metier (IA, email, points)
│   ├── seed.js                # Script de creation de donnees de test
│   └── package.json           # Dependances backend
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Toutes les routes React (141 lignes)
│   │   ├── main.jsx           # Point d'entree React
│   │   ├── index.css          # Styles CSS globaux
│   │   ├── components/        # 12 composants reutilisables
│   │   ├── context/           # 5 contextes React (state global)
│   │   ├── hooks/             # 4 hooks personnalises
│   │   ├── pages/             # 27 pages
│   │   └── utils/
│   │       └── api.js         # Instance Axios avec intercepteurs JWT
│   ├── vite.config.js         # Configuration Vite (proxy API)
│   └── package.json           # Dependances frontend
└── CLAUDE.md                  # Documentation technique du projet
```
