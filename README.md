# FlipLearn

**Application web de classe inversée** — projet de fin d'études (PFE).

FlipLearn est une plateforme d'apprentissage collaboratif basée sur la pédagogie de la **classe inversée** : les étudiants étudient le contenu (vidéos, flashcards, ressources) avant le cours, et le temps en classe est consacré à l'application et aux échanges. La plateforme intègre de la **gamification** (points, badges, récompenses, leaderboard, Quiz Battle), de l'**IA générative** (chatbot pédagogique, résumés automatiques de vidéos) et un **chat temps réel** entre étudiants et professeurs.

---

## Sommaire

1. [Fonctionnalités](#fonctionnalités)
2. [Stack technique](#stack-technique)
3. [Architecture](#architecture)
4. [Installation locale](#installation-locale)
5. [Variables d'environnement](#variables-denvironnement)
6. [Scripts disponibles](#scripts-disponibles)
7. [API](#api)
8. [Rôles et permissions](#rôles-et-permissions)
9. [Déploiement](#déploiement)
10. [Tests](#tests)
11. [Structure du projet](#structure-du-projet)

---

## Fonctionnalités

### Pour les étudiants
- **Cours & vidéos** : visionnage avec suivi de progression, résumés générés par IA.
- **Flashcards** : création et révision de decks personnels.
- **QCM** : quiz associés aux vidéos pour valider la compréhension.
- **Quiz Battle** : mode duel temps réel entre étudiants (Socket.io) avec power-ups et combos.
- **Gamification** : points, badges, récompenses à débloquer, leaderboard global et par cours.
- **Chat** : discussions par cours, messagerie privée, chatbot IA pour questions sur les modules.
- **Projets** : consultation et soumission de projets assignés par les professeurs.
- **Notifications** : temps réel (Socket.io) et email pour les messages urgents.

### Pour les professeurs
- **Gestion des cours** : upload de vidéos (Cloudinary), édition des modules.
- **Création de QCM** : éditeur de questions avec correction automatique.
- **Suivi des étudiants** : dashboard d'engagement (vues vidéos, scores QCM, progression).
- **Gestion des badges** : attribution et création de badges personnalisés.
- **Chat de cours** : messages urgents (notifications email automatiques aux étudiants).
- **Assistant module** : chatbot IA contextualisé par cours.

### Pour les administrateurs
- **Gestion des utilisateurs** : approbation des inscriptions, attribution de rôles.
- **Supervision** : vue d'ensemble des cours, tickets support, contenus publiés.

---

## Stack technique

| Couche | Technologies |
|--------|--------------|
| **Frontend** | React 18, Vite 5, React Router 6, Tailwind CSS 3, Lucide Icons, Recharts, Axios, Socket.io client |
| **Backend** | Node.js, Express 4, Mongoose 8, Socket.io 4, JWT, Bcrypt, Multer, node-cron |
| **Base de données** | MongoDB (Atlas en production) |
| **Stockage média** | Cloudinary (vidéos & images) |
| **IA** | Groq SDK (Llama 3.3 70B), OpenAI SDK (Whisper + GPT-4o) |
| **Email** | Brevo + Resend (HTTP API, fallback) |
| **Déploiement** | Render.com (service unifié front + back) |

---

## Architecture

```
                  ┌──────────────────────────────────────────┐
                  │  Render (monolithe)                       │
                  │   ┌──────────────┐    ┌──────────────┐    │
                  │   │ React SPA    │ ←  │ Express API  │    │
                  │   │ (statique    │    │ /api/*       │    │
                  │   │  servi par   │    │ + Socket.io  │    │
                  │   │  Express)    │    │              │    │
                  │   └──────────────┘    └──────┬───────┘    │
                  └──────────────────────────────┼────────────┘
                                                 │
                          ┌──────────────────────┼──────────────────────┐
                          │                      │                      │
                    ┌─────▼─────┐          ┌─────▼─────┐          ┌─────▼─────┐
                    │ MongoDB   │          │ Cloudinary│          │ Groq /    │
                    │ Atlas     │          │  (media)  │          │ OpenAI    │
                    └───────────┘          └───────────┘          └───────────┘
```

---

## Installation locale

### Prérequis

- **Node.js** ≥ 18
- **npm** ≥ 9 (ou yarn / pnpm)
- Un cluster **MongoDB** (local ou MongoDB Atlas)
- Un compte **Cloudinary** (gratuit) pour les uploads média
- Une clé API **Groq** (gratuite) pour le chatbot IA

### Cloner le dépôt

```bash
git clone <url-du-repo>
cd fliplearn
```

### Backend

```bash
cd backend
npm install
cp .env.example .env      # puis éditer .env avec vos propres clés
npm run dev               # démarre sur http://localhost:5000
```

### Frontend

```bash
cd ../frontend
npm install
cp .env.example .env      # puis éditer si besoin
npm run dev               # démarre sur http://localhost:5173
```

Le frontend communique par défaut avec `http://localhost:5000` (modifiable via `VITE_API_URL`).

---

## Variables d'environnement

### Backend — `backend/.env`

| Variable | Rôle | Exemple |
|----------|------|---------|
| `PORT` | Port d'écoute du serveur | `5000` |
| `NODE_ENV` | Environnement | `development` ou `production` |
| `MONGODB_URI` | URI de connexion MongoDB | `mongodb+srv://user:pass@cluster.mongodb.net/fliplearn` |
| `JWT_SECRET` | Clé secrète pour signer les JWT | chaîne aléatoire ≥ 32 caractères |
| `CLIENT_URL` | URL du frontend (CORS) | `http://localhost:5173` |
| `CLOUDINARY_CLOUD_NAME` | Nom du cloud Cloudinary | — |
| `CLOUDINARY_API_KEY` | Clé API Cloudinary | — |
| `CLOUDINARY_API_SECRET` | Secret API Cloudinary | — |
| `GROQ_API_KEY` | Clé API Groq (chatbot + résumés) | — |
| `OPENAI_API_KEY` | Clé API OpenAI (optionnelle) | — |
| `SMTP_HOST` | Serveur SMTP (emails) | `smtp.gmail.com` |
| `SMTP_PORT` | Port SMTP | `587` |
| `SMTP_USER` | Identifiant SMTP | — |
| `SMTP_PASS` | Mot de passe / token SMTP | — |
| `SEED_CONTENT` | `false` pour désactiver le seed de démo | `true` par défaut |

### Frontend — `frontend/.env`

| Variable | Rôle | Exemple |
|----------|------|---------|
| `VITE_API_URL` | URL de l'API backend | `http://localhost:5000` |

---

## Scripts disponibles

### Backend

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarrage avec nodemon (hot reload) |
| `npm start` | Démarrage en production |

### Frontend

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Build de production (dossier `dist/`) |
| `npm run preview` | Prévisualiser le build |

---

## API

L'API REST est exposée sous le préfixe `/api`. Le détail des endpoints (paramètres, codes de retour, exemples de payload) est documenté dans le **chapitre 4 du mémoire PFE**.

### Endpoints principaux

| Préfixe | Description |
|---------|-------------|
| `/api/auth` | Inscription, connexion, profil utilisateur |
| `/api/decks` | Gestion des decks de flashcards |
| `/api/decks/:deckId/cards` | Cartes d'un deck |
| `/api/courses` | Cours et modules |
| `/api/videos` | Vidéos de cours (upload, visionnage, analyse IA) |
| `/api/qcm` | QCM associés aux vidéos |
| `/api/messages` | Historique de messages (chat) |
| `/api/badges` | Badges et attributions |
| `/api/progress` | Progression des étudiants |
| `/api/professor` | Endpoints réservés aux professeurs |
| `/api/leaderboard` | Classement global et par cours |
| `/api/chatbot` | Chatbot IA générique |
| `/api/resources` | Bibliothèque de ressources |
| `/api/admin` | Administration (users, approbations) |
| `/api/support` | Tickets support |
| `/api/projects` | Projets pédagogiques |
| `/api/notifications` | Notifications utilisateur |
| `/api/tracking` | Tracking d'engagement |
| `/api/rewards` | Récompenses à débloquer |

### Authentification

Toutes les routes protégées attendent un en-tête :

```
Authorization: Bearer <jwt-token>
```

Le token est obtenu via `POST /api/auth/login`.

### Socket.io (temps réel)

- **Namespace** : `/` (par défaut)
- **Auth** : JWT via `socket.handshake.auth.token`
- **Events principaux** : `join_room`, `send_message`, `typing`, `notification`, `battle:create`, `battle:join`, `battle:answer`, `battle:finished`

---

## Rôles et permissions

Trois rôles, contrôlés côté backend par le middleware `auth.js` + `roleMiddleware.js` :

- **`etudiant`** — rôle par défaut à l'inscription. Accès aux cours, decks, chat, leaderboard.
- **`professeur`** — peut créer/modifier des cours, QCM, badges, projets. Accès au dashboard pédagogique et au suivi des étudiants.
- **`admin`** — supervision globale : approuve les inscriptions, gère tous les utilisateurs et contenus.

Les nouveaux comptes ont un statut `pending` jusqu'à validation par un administrateur (`PATCH /api/admin/users/:id/approve`).

---

## Déploiement

### Render.com — service unifié front + back

Le fichier [`backend/render.yaml`](./backend/render.yaml) décrit la configuration du service. Variables d'environnement à définir dans le dashboard Render (cf. section [Variables d'environnement](#variables-denvironnement)).

Architecture monolithique : en `NODE_ENV=production`, Express sert directement `frontend/dist/` en static + les routes `/api/*`. Une seule URL pour tout le projet ([https://fliplearn-5lsz.onrender.com](https://fliplearn-5lsz.onrender.com)).

Auto-deploy sur push `main` ; free tier dort après 15 min d'inactivité (cold start ~30-60s au réveil).

---

## Structure du projet

```
fliplearn/
├── backend/
│   ├── config/              # connexion MongoDB
│   ├── controllers/         # logique métier
│   ├── middleware/          # auth, upload, rôles, gestion d'erreurs
│   ├── models/              # schémas Mongoose (User, Deck, Card, QCM, Badge, …)
│   ├── routes/              # routes Express
│   ├── services/            # services transverses (IA, email, seeds, scheduler)
│   ├── public/videos/       # vidéos locales (dev)
│   ├── server.js            # point d'entrée
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/      # composants réutilisables (Layout, BadgeCard, …)
    │   ├── context/         # providers (Auth, Theme, Toast, Notification, Gamification)
    │   ├── hooks/           # hooks personnalisés (useChat, useVideoProgress)
    │   ├── pages/           # pages / écrans (Dashboard, StudentCourse, QCM, …)
    │   ├── main.jsx
    │   └── App.jsx          # routage
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── vite.config.js
    └── .env.example
```

---

## Auteur

**Projet de fin d'études** — réalisé par Assil.

## Licence

Projet académique — tous droits réservés.
