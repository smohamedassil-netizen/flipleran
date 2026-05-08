# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Agent IA distant ?** (Claude Code dispatch, Claude.ai mobile, autre)
> Lis [`docs/agents/README.md`](docs/agents/README.md) **avant** de toucher au code. Il contient les conventions, la vision pédagogique, les deadlines, les recaps de sessions précédentes — tout ce qu'il faut pour bosser dans la continuité.

## Project Overview

FlipLearn is a full-stack e-learning platform built around the Flipped Classroom model. Three roles: `etudiant`, `professeur`, `admin`. The app uses JWT auth stored in `sessionStorage` under key `fliplearn_user`.

## Commands

```bash
# Install all dependencies (backend + frontend)
npm run install:all

# Development (run both in separate terminals)
npm run dev:backend    # Express on port 5000
npm run dev:frontend   # Vite on port 5173

# Production build (frontend compiled, served by backend)
npm run build
npm start              # cd backend && node server.js

# Render.com deploy build
npm run render:build

# Seed database with demo data
node backend/seed.js
```

## Architecture

Monorepo with two packages. Backend uses ES modules (`"type": "module"`).

**Backend** (`backend/`): Express.js + Socket.io server
- `server.js` — Entry point. HTTP server, Socket.io setup, routes, and all real-time event handlers (chat, quiz battle, notifications) are in this single file (~530 lines)
- `models/` — Mongoose schemas: User, Course, Video, QCM, Message, Deck, Card, Badge, Progress, Resource, SupportTicket
- `controllers/` — Route handlers (one per resource)
- `routes/` — Express Router definitions
- `services/` — Business logic: `chatbot.js` (Groq/Llama 3.3 API), `emailService.js` (Brevo > Resend > Gmail SMTP fallback), `pointsService.js`
- `middleware/authMiddleware.js` — JWT verification, attaches `req.user`
- `config/cloudinary.js` — Cloudinary SDK setup using 3 env vars

**Frontend** (`frontend/`): React 18 + Vite + Tailwind CSS
- `src/App.jsx` — All routes defined here with `ProtectedRoute` wrapper checking roles
- `src/components/Layout.jsx` — Main layout with Sidebar (role-based nav), Topbar, mobile hamburger menu. Role mapping: `etudiant`→student nav, `professeur`→teacher nav, `admin`→admin nav
- `src/context/` — AuthContext (login/logout/token), GamificationContext (points/badges), NotificationContext (socket notifications), ToastContext
- `src/hooks/useChat.js` — Socket.io chat logic (rooms, private, bot)
- `src/pages/` — 24 page components
- `src/utils/api.js` — Axios instance with JWT interceptor, baseURL `/api`, 5min timeout for uploads

**Key patterns:**
- Vite proxies `/api` to `http://localhost:5000` in dev
- In production, Express serves `frontend/dist/` as static files and handles `/api` routes
- Socket.io auth middleware verifies JWT from `socket.handshake.auth.token`
- Roles in DB are French: `etudiant`, `professeur`, `admin` (not English)
- CSS uses custom properties `--color-primary`, `--color-secondary`, etc. defined in `index.css`. Alias vars `--primary` → `--color-primary` exist for convenience.

## External Services

| Service | Purpose | Env Var |
|---------|---------|---------|
| MongoDB Atlas | Database | `MONGODB_URI` |
| Cloudinary | Video/file storage (100MB limit) | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| Groq | AI chatbot + QCM generation (model: `llama-3.3-70b-versatile`) | `GROQ_API_KEY` |
| OpenAI | Video AI Agent: Whisper transcription + GPT-4o analysis | `OPENAI_API_KEY` |
| Brevo | Transactional emails (300/day free) | `BREVO_API_KEY` |
| Resend | Email fallback | `RESEND_API_KEY` |

## Deployment

Deployed on Render.com at `https://fliplearn-5lsz.onrender.com`. Single web service serves both API and frontend. Auto-deploys on push to `main`. Free tier sleeps after 15min inactivity.

GitHub repo: `https://github.com/smohamedassil-netizen/flipleran` (note: typo in repo name is intentional)

## Test Accounts (from backend/services/usersSeed.js)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@fliplearn.dz | admin1234 |
| Prof (ISIL L3) | omar.isil.l3@fliplearn.dz | test1234 |
| Student (ISIL L3) | assil.isil.l3@fliplearn.dz | test1234 |

The seed creates 9 professors and 9 students covering ISIL / Management / Finance × L1 / L2 / L3 (e.g., `karim.isil.l1@`, `amine.isil.l1@`, `leila.isil.l2@`, etc.). Common password for everyone except admin is `test1234`.

## Language

All UI text is in French. User-facing strings use proper French accents. In JSX text content (between tags), Unicode escapes like `\u00e9` render literally — use `{'é'}` JS expressions instead.

## Session Protocol — IMPORTANT

**À chaque nouvelle session Claude Code sur ce projet, tu DOIS :**

1. **Au début de session** : lire ce fichier + faire un `git log --oneline -5` pour voir où on en est
2. **Pendant le travail** : faire des commits réguliers (pas tout d'un coup à la fin)
3. **À la fin de session** :
   - Faire un commit avec les modifications du jour (même mineures : typo, commentaire, refactor)
   - Push sur GitHub : `git push origin main`
   - Mettre à jour le fichier `CHANGELOG.md` à la racine avec la date et les modifications
   - Si aucune modification de code : faire un commit de maintenance (mise à jour doc, commentaires, nettoyage)

**Objectif** : que l'historique GitHub montre une activité régulière et progressive, pas un projet fait en 1 jour. Chaque session = au moins 1 commit avec une date différente.

**Format des commits** :
- `feat: ...` pour les nouvelles fonctionnalités
- `fix: ...` pour les corrections de bugs
- `docs: ...` pour la documentation
- `style: ...` pour le CSS/UI
- `refactor: ...` pour le refactoring
- `chore: ...` pour la maintenance

## Recent Changes (Module PBL)

- `backend/models/Project.js` — Modèle projet avec types `mono` / `groupe`, rôles CESI, phases, livrables, évaluations
- `backend/controllers/projectController.js` — 12 endpoints (CRUD, groupes aléatoires, upload livrables, évaluations, aide IA Groq)
- `backend/routes/projectRoutes.js` — Routes protégées par auth + role middleware
- `frontend/src/pages/ProjectList.jsx` — Liste des projets, encart pédagogique sobre (l'ancienne dichotomie Prosits/Projets a été fusionnée en mono/groupe le 28/04/2026)
- `frontend/src/pages/ProjectDetail.jsx` — Détail projet avec timeline, groupes, badges rôles style Loup-Garou, livrables, auto-évaluation, aide IA
- `frontend/src/pages/ProjectCreate.jsx` — Formulaire création projet mono/groupé avec phases pré-remplies

Note : un module **Prosit** dédié (méthodologie APP/CESI : phases Aller / Recherche / Retour, rôles spécifiques) sera réintroduit séparément du module Project actuel — voir le brief `_briefs/02_SPECS_PROSIT.md` à la racine du projet PFE.
