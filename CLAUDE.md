# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
| Brevo | Transactional emails (300/day free) | `BREVO_API_KEY` |
| Resend | Email fallback | `RESEND_API_KEY` |

## Deployment

Deployed on Render.com at `https://fliplearn-5lsz.onrender.com`. Single web service serves both API and frontend. Auto-deploys on push to `main`. Free tier sleeps after 15min inactivity.

GitHub repo: `https://github.com/smohamedassil-netizen/flipleran` (note: typo in repo name is intentional)

## Test Accounts (from seed.js)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@fliplearn.dz | admin1234 |
| Prof | karim.prof@fliplearn.dz | prof1234 |
| Student | amine@fliplearn.dz | etudiant123 |

## Language

All UI text is in French. User-facing strings use proper French accents. In JSX text content (between tags), Unicode escapes like `\u00e9` render literally — use `{'é'}` JS expressions instead.
