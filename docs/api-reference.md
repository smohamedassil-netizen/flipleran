# 🔌 Référence API FlipLearn

**Base URL** : `/api/*` · **Auth** : JWT Bearer (sauf `/auth/*` et `/api/health`).

> Cette référence regroupe **~120 endpoints** par module fonctionnel. Pour les payloads détaillés, voir le code des controllers Express dans `backend/controllers/`.

---

## Conventions

- **Auth** : header `Authorization: Bearer <token>`. Token obtenu via `POST /api/auth/login`.
- **Refresh token** : cookie httpOnly `fliplearn_refresh` (15 jours). Régénéré automatiquement par `POST /api/auth/refresh`.
- **Roles** : `etudiant` (par défaut), `professeur`, `admin`. Middleware `requireRole(role...)` filtre.
- **Réponses** : JSON. Erreurs format `{ message: string, ...fields }`.
- **Status codes** : 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 412 Precondition Failed, 429 Too Many Requests, 500 Server Error.

---

## 1. Authentification (`/api/auth`)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/register` | public | Inscription (status `pending` → admin valide) |
| POST | `/login` | public | Login → JWT + refresh cookie |
| POST | `/logout` | auth | Invalide refresh cookie |
| POST | `/refresh` | cookie | Régénère JWT |
| GET | `/me` | auth | Profil + plan + premium |
| PUT | `/me` | auth | Update profil (nom, prenom, avatar) |
| PUT | `/me/password` | auth | Change password |
| POST | `/forgot-password` | public | Envoie lien reset email |
| POST | `/reset-password/:token` | public | Reset via token email |

---

## 2. Cours & vidéos (`/api/courses`, `/api/videos`)

### Cours
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/courses` | auth | Liste des cours (étudiant → filière, prof → siens) |
| GET | `/courses/:id` | auth | Détail d'un cours |
| POST | `/courses` | prof | Crée un cours |
| PUT | `/courses/:id` | prof | Modifie |
| DELETE | `/courses/:id` | prof+admin | Supprime |
| GET | `/courses/:id/outcomes` | auth | Objectifs d'apprentissage Bloom |
| PUT | `/courses/:id/outcomes` | prof | Met à jour outcomes |

### Vidéos
| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/videos/upload` | prof | Upload Cloudinary (multer) |
| POST | `/videos/youtube` | prof | Crée depuis URL YouTube |
| GET | `/videos/course/:cid` | auth | Vidéos d'un cours + ma progression |
| GET | `/videos/:id` | auth | Détail vidéo |
| POST | `/videos/:id/progress` | étudiant | Sauve `watchedPercent` (déclenche streak F11A à 80%+) |
| GET | `/videos/:id/stats` | prof | Stats engagement |
| PUT | `/videos/:id` | prof | Modifie titre/desc/chapitres |
| DELETE | `/videos/:id` | prof+admin | Supprime + Cloudinary |

### Auto-prépa IA (F1)
| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/courses/:cid/videos/:vid/auto-prep` | prof | Lance pipeline 5 IA Groq parallèles |
| GET | `/auto-prep-jobs/:jobId` | prof | Poll status (pending → running → completed) |
| POST | `/auto-prep-jobs/:jobId/publish` | prof | Publie résultats validés (création QCM/Decks/etc.) |

---

## 3. Activités pédagogiques

### QCM
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/qcm/video/:videoId` | auth | QCM associés à une vidéo |
| GET | `/qcm/:id` | auth | Détail QCM |
| POST | `/qcm/:id/submit` | étudiant | Soumet réponses, calcul score, +XP |
| POST | `/qcm/generate-ai` | prof | Génère QCM via Groq (rate-limited) |
| POST | `/qcm` | prof | Crée manuellement |
| PUT | `/qcm/:id` | prof | Modifie |

### Questions in-video
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/video-questions/video/:vid` | étudiant | Questions à montrer pendant la vidéo |
| POST | `/video-questions/:qid/answer` | étudiant | Soumet réponse |
| POST | `/video-questions` | prof | Crée |

### Prosits (méthodologie CESI/APP)
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/prosits` | auth | Liste filtrée filière/promotion/status |
| GET | `/prosits/:id` | auth | Détail (vue prof ou étudiant selon role) |
| POST | `/prosits` | prof | Crée |
| PUT | `/prosits/:id` | prof | Modifie |
| POST | `/prosits/:id/transition` | prof | Phase aller→recherche→retour→evalue→archive |
| POST | `/prosits/:id/groupes/auto` | prof | Génère groupes aléatoires |
| POST | `/prosits/:id/groupes/manual` | prof | Composition manuelle avec rôles |
| POST | `/prosits/:id/groupes/join` | étudiant | Rejoint un groupe |
| PUT | `/prosits/:id/groupes/:gIdx` | étudiant | Update workspace (mots-clés, hypothèses) |
| POST | `/prosits/:id/groupes/:gIdx/contribution` | étudiant | Soumet contribution + déclenche détection plagiat IA F2 |
| GET | `/prosits/:id/ai-report` | prof | Rapport plagiat IA par membre |
| GET | `/prosits/:id/coach/status` | étudiant | Coach IA F7 — détection blockage |
| POST | `/prosits/:id/coach/suggest` | étudiant | 3 next steps Groq socratique |
| POST | `/prosits/:id/coach/review` | étudiant | Review constructive contribution |
| GET | `/prosits/:id/coach/sources` | étudiant | 3 sources fiables suggérées |
| POST | `/prosits/:id/groupes/:gIdx/peer-assessment` | étudiant | Peer assessment F2 |
| POST | `/prosits/:id/ai-help` | auth | Aide IA libre |

### Projets (PBL)
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/projects` | auth | Liste filtrée |
| GET | `/projects/:id` | auth | Détail populé |
| POST | `/projects` | prof | Crée (auto-load template phases F8) |
| PUT | `/projects/:id` | prof | Update (rejette changement de `type` F8 hotfix) |
| POST | `/projects/:id/groupes/random` | prof | Groupes aléatoires |
| POST | `/projects/:id/groupes` | prof | Groupes manuels |
| PUT | `/projects/:id/phases/:pid` | auth | Update statut/checklist phase |
| POST | `/projects/:id/livrables` | étudiant | Upload livrable |
| POST | `/projects/:id/livrables/:lid/feedback` | prof | Feedback texte+rating + socket notif |
| GET | `/projects/:id/progress` | auth | % completion par membre |
| GET | `/projects/:id/rubric` | auth | Lecture rubric |
| PUT | `/projects/:id/rubric` | prof | Update rubric |
| GET | `/projects/:id/threads` | auth | Forum threads (F9) |
| POST | `/projects/:id/threads` | auth | Crée thread (annonce = prof) |
| POST | `/projects/:id/threads/:tid/replies` | auth | Répond |
| PATCH | `/projects/:id/threads/:tid` | auth | Pin/résolu |
| DELETE | `/projects/:id/threads/:tid` | auth | Supprime |
| POST | `/projects/:id/peer-reviews/assign` | prof | Auto-pairing 2 reviewers/livrable F9 |
| GET | `/projects/:id/peer-reviews/mine` | étudiant | Mes reviews assignées |
| POST | `/projects/:id/peer-reviews/:rid/submit` | étudiant | Soumet review (4 critères + commentaire) |
| GET | `/projects/:id/peer-reviews/summary` | prof | Summary anonymisée |
| POST | `/projects/:id/coach/*` | étudiant | Coach IA F7 (idem Prosit) |

### Templates de projets (F10)
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/project-templates` | auth | Liste filtrée filière/type/level/source |
| GET | `/project-templates/:id` | auth | Détail (gère `isPublic`) |
| POST | `/project-templates/:id/use` | prof | Incrémente `usageCount` |
| POST | `/project-templates/generate` | prof | Génère template via Groq custom |

---

## 4. Tuteur IA & coaching (F4, F5, F7)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/tutor/chat` | étudiant | Streaming chat avec contexte personnel |
| POST | `/tutor/ask-video` | étudiant | RAG sur transcript vidéo (F5) |
| GET | `/tutor/ask-video/quota?videoId=` | étudiant | Quota 5/(user, vidéo, jour) |
| GET | `/tutor/suggestions` | étudiant | 3 missions du jour générées par cron |
| GET | `/tutor/context` | étudiant | Debug : contexte que sait le tuteur |
| POST | `/chatbot/module/:cid` | auth | Assistant module par cours (illimité) |

---

## 5. Insights pédagogiques (F3)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/courses/:id/insights` | prof | 3-5 insights actionables Groq |
| POST | `/insights/student-suggestion` | prof | Plan d'action perso pour 1 étudiant |

---

## 6. Révision SM-2 (Decks & Cards)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/decks` | étudiant | Mes decks |
| POST | `/decks` | étudiant | Crée deck manuel |
| GET | `/decks/:id` | étudiant | Détail |
| PUT | `/decks/:id` | étudiant | Modifie |
| DELETE | `/decks/:id` | étudiant | Supprime |
| POST | `/decks/generate-ai` | étudiant | Génération IA (1 vidéo, quota mensuel) |
| POST | `/decks/auto-generate` | étudiant | F6 — auto à partir des vidéos vues (idempotent) |
| GET | `/decks/auto-status` | étudiant | Stats decks auto + due today |
| GET | `/decks/due-today` | étudiant | Compte cartes à réviser maintenant |
| GET | `/decks/:deckId/cards` | étudiant | Cartes d'un deck |
| POST | `/decks/:deckId/cards` | étudiant | Crée carte |
| PUT | `/cards/:id` | étudiant | Update + recalcul SM-2 |
| DELETE | `/cards/:id` | étudiant | Supprime |

---

## 7. Gamification (F11)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/streak` | étudiant | Mon streak (current/longest/saved/history) |
| GET | `/levels/me` | étudiant | Mon niveau + barre progression vers next |
| GET | `/levels/scale` | auth | Liste des 5 paliers |
| GET | `/levels/user/:uid` | auth | Niveau d'un autre utilisateur |
| GET | `/quests` | étudiant | Mes 3 quêtes hebdo (génération paresseuse) |
| POST | `/quests/refresh` | étudiant | Régénère quêtes manuellement |
| GET | `/leaderboard?scope=cohort` | étudiant | Top promotion |
| GET | `/leaderboard?scope=monthly` | étudiant | Top XP ce mois |
| GET | `/leaderboard?scope=personal` | étudiant | Série 30j cumulative pour AreaChart |
| GET | `/leaderboard/honor-board/:cid` | étudiant | Top 3 du mois pour un cours |
| GET | `/leaderboard/course/:cid` | étudiant | Legacy : classement d'un cours |
| GET | `/leaderboard/global` | étudiant | Legacy : global filière+promotion |
| GET | `/badges` | auth | Catalogue badges |
| GET | `/badges/me` | étudiant | Mes badges |

---

## 8. Récompenses

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/rewards` | auth | Catalogue (active uniquement, sauf admin) |
| POST | `/rewards/:id/claim` | étudiant | Réclame (déduit XP, statut pending) |
| GET | `/rewards/mine` | étudiant | Mes claims |
| POST | `/rewards` | admin | Crée |
| PUT | `/rewards/:id` | admin | Modifie |
| DELETE | `/rewards/:id` | admin | Supprime |
| GET | `/rewards/claims` | admin | Toutes les claims |
| PUT | `/rewards/claims/:id` | admin | Approve/reject/deliver (rembourse XP si reject) |

---

## 9. Quiz Battle (Socket.io)

Événements WebSocket (pas REST) :

| Event (client → server) | Description |
|---|---|
| `battle:create` | Crée une room + courseId optionnel |
| `battle:join` | Rejoint via roomId |
| `battle:list` | Liste des rooms ouvertes |
| `battle:start` | Démarre (5 questions tirées des QCM du cours) |
| `battle:answer` | Soumet réponse + powerup optionnel |

| Event (server → client) | Description |
|---|---|
| `battle:players` | Liste joueurs |
| `battle:started` | Question 1 |
| `battle:next` | Question suivante + score |
| `battle:finished` | Fin + résultats |
| `battle:opponent_powerup` | Adversaire a utilisé un boost |

---

## 10. Communication

### Messages temps réel (Socket.io)
| Event | Description |
|---|---|
| `join_room` | Rejoint room avec ACL (course/prosit/project/private) |
| `send_message` | Envoie + diffuse + notif |
| `typing` / `stop_typing` | Indicateur frappe |

### Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/notifications` | Mes notifs (paginées) |
| PATCH | `/notifications/:id/read` | Marque lue |
| PATCH | `/notifications/read-all` | Toutes lues |

### Resources
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/resources/course/:cid` | auth | Resources d'un cours |
| POST | `/resources` | prof | Upload doc/lien |
| DELETE | `/resources/:id` | prof | Supprime |

### Support
| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/support/tickets` | auth | Crée ticket |
| GET | `/support/tickets` | auth (admin = tous) | Mes tickets |
| POST | `/support/tickets/:id/replies` | auth | Répond |

---

## 11. Administration

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/users` | Liste utilisateurs avec filtres |
| PUT | `/admin/users/:id/approve` | Approuve inscription pending |
| PUT | `/admin/users/:id/reject` | Reject avec raison |
| GET | `/admin/stats` | KPIs globaux |
| GET | `/professor/tracking/:cid` | Suivi étudiants d'un cours |

---

## 12. Health & monitoring

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | public | F8 hotfix — `{status, uptime, timestamp}` pour UptimeRobot |

---

## Rate limiting

| Endpoint | Limit | Fenêtre |
|---|---|---|
| `/api/*` | 300 req | 15 min |
| `/api/auth/login` | 10 | 15 min |
| `/api/auth/register` | 10 | 15 min |
| `/api/chatbot/*` | 30 | 1h |
| `/api/qcm/generate-ai` | 30 | 1h |

## Quotas IA mensuels (plan FREE)

Stockés dans `User.aiUsage`. Reset 1er du mois.

| Feature | Limite/mois |
|---|---|
| `videoAnalysis` (Whisper + GPT-4o) | 3 |
| `qcmGeneration` (Groq) | 5 |
| `deckGeneration` (Groq, partagé F6) | 5 |

`moduleBot` (chatbot par cours) et endpoints coach IA (F7) sont **illimités** car Groq est gratuit.

---

## Voir aussi

- [Architecture](architecture.md) — pour le runtime et les flux
- [Modèle de données](data-model.md) — pour les payloads de réponse
- [Décisions techniques](technical-decisions.md) — ADR-006 (rate limiting), ADR-007 (quotas IA)
