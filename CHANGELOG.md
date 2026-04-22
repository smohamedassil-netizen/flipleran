# Changelog — FlipLearn

Historique des modifications par date de session.

---

## 22 Avril 2026 (session IA — Microservice TensorFlow)

### Nouveau microservice IA (`ai-service/`)
- Architecture microservices : Python/Flask (port 5001) séparé du backend Node.js
- **Prédicteur de réussite** : modèle Keras MLP (régression) qui prédit le score final 0-100 d'un étudiant sur un cours — métriques MAE / RMSE / R²
- **Détecteur de décrochage** : modèle Keras MLP (classification binaire) avec class_weight — métriques Accuracy / Precision / Recall / F1 / ROC-AUC
- Pipeline `extract_data.py` : agrège 9 features depuis MongoDB (Progress, QCM, User, Course, Deck) + fallback synthétique réaliste si données insuffisantes
- Inférence thread-safe avec cache paresseux des modèles (`predictor.py`)
- API Flask sécurisée par token partagé `X-AI-Service-Token` : `/health`, `/train`, `/predict/features`, `/predict/student/:uid/:cid`, `/students/at-risk`

### Intégration backend Node.js
- Nouveau service `backend/services/aiService.js` (fetch natif, aucune dépendance ajoutée)
- Controller `aiController.js` + routes `/api/ai/*` avec contrôle de rôle (prof/admin pour train et at-risk)
- Variables d'environnement `AI_SERVICE_URL` + `AI_SERVICE_TOKEN` documentées dans `.env.example`

### Dashboard React IA pédagogique
- Nouvelle page `frontend/src/pages/AIDashboard.jsx` sur `/professor/ai`
- Affiche les métriques des modèles, stats globales (étudiants actifs, cours, score moyen), et tableau des étudiants à risque classés par probabilité
- Boutons "Entraîner les modèles" (déclenche l'entraînement côté Python) et "Rafraîchir"
- Entrée sidebar "IA pédagogique" (icône BrainCircuit) sous la section Gestion

### Documentation
- README complet dans `ai-service/README.md` (installation, workflow, endpoints, pitch soutenance)
- Documentation PFE mise à jour (modif #014) via `doc_updater.py`

---

## 18 Avril 2026 (session 3 — Authentification, 3 filières, YouTube, thèmes)

### Authentification avec validation admin
- Nouveau champ `User.status` (pending / active / rejected) + `rejectionReason`, `approvedBy`, `approvedAt`
- Inscription : ne connecte PAS automatiquement, crée un compte pending + notifie les admins
- Login : bloque pending et rejected avec messages dédiés (encarts colorés spécifiques)
- Nouveaux endpoints admin : GET /auth/pending, PUT /auth/users/:id/approve, PUT /auth/users/:id/reject
- Nouvelle section admin "Inscriptions" dans AdminDashboard avec avatar généré par filière
- Migration au boot : comptes existants (sans status) marqués 'active' automatiquement
- Email notification à l'étudiant lors d'approbation/refus
- Écran de confirmation post-inscription avec étapes visuelles

### Landing page refaite
- Hero avec démo animée du chatbot IA (chat pop-in)
- 3 cartes filières cliquables (ISIL, Management, Finance) avec modules types
- Section "Comment ça marche" en 4 étapes
- 6 features avec hover coloré
- 3 témoignages étudiants avec étoiles
- CTA final avec gradient et features trust (100% gratuit, validé par EM Alger, activation 24h)

### Thèmes de couleurs par filière
- `FILIERE_THEMES` : ISIL=bleu, Management=orange, Finance=vert
- Hook `useTheme` enrichi avec `filiereTheme`
- CSS variables `--filiere-primary`, `--filiere-accent`, `--filiere-gradient` appliquées sur document
- Event `fliplearn:user-changed` émis au login/logout pour sync instantanée
- Persona IA enrichie : directives domaine par filière (références, exemples, vocabulaire)

### Support vidéos YouTube
- `Video.provider` ('cloudinary' | 'youtube') + `youtubeId`
- Parser URL YouTube robuste (youtube.com/watch, youtu.be, embed, shorts, ou ID direct)
- Nouveau POST /api/videos/youtube (prof/admin)
- Composant `YouTubeEmbedPlayer` avec iframe + tracking temps d'écoute estimé + bouton "J'ai terminé"
- Onglet YouTube dans ProfessorUpload : collage d'URL + titre + durée + ordre
- Thumbnail auto depuis i.ytimg.com

### Contenu démo pré-rempli
- Nouveau service `contentSeed.js` : 27 vidéos YouTube + 9 cours (3 filières × 3 niveaux)
- Chaque cours a un `aiPersona` adapté (Algo-Bot, Py-Bot, Manage-Bot, Compta-Bot, etc.)
- Seed idempotent (ne duplique pas) + désactivable via SEED_CONTENT=false
- Seed utilise le premier prof trouvé comme propriétaire (override possible)

### UI projets — mono vs multi
- Onglets filtres enrichis : Tous / Prosits / Projets / 📘 Mono-module / 🌐 Collaboratifs
- Encart explicatif "Qu'est-ce qu'un Prosit ?" collapsible avec les 3 phases (Aller / Recherche / Retour)
- Distinction claire Prosit/Projet/Mono/Multi dans l'UI

### Documentation
- doc_updater.py entrée #010 ajoutée
- CHANGELOG.md mis à jour

---

## 18 Avril 2026 (session 2 — UX & engagement)

### Toast notifications pop animées
- Refonte `ToastContext.jsx` : toasts "pop" avec animation scale + slide depuis top-right
- Icônes typées par catégorie (reminder_qcm, ticket_update, reward, achievement, etc.)
- Urgent : animation shake + shadow rouge + durée prolongée (8s)
- Progress bar animée avant disparition + clic ouvre le lien
- `NotificationContext` connecté → chaque notif socket.io déclenche un toast

### Navigation allégée
- Retrait des entrées "Notifications" de la sidebar (accessible via cloche Topbar)
- Fusion "Aide & Support" + "Mes tickets" : la page `/support` intègre désormais FAQ + gestion tickets (création avec priorité/catégorie, conversation multi-turn)
- `/my-tickets` redirige vers `/support` (compat)
- Suppression de `MyTickets.jsx` (obsolète)

### Admin tickets restylé
- Refonte `SupportSection` (AdminDashboard) : stats en carte (libres, mes tickets, urgents, résolus)
- Onglets Libres / Mes tickets / Tous ouverts / Résolus
- Filtres priorité + catégorie + recherche
- Tri automatique par priorité (urgent en haut)
- Modal conversation multi-turn avec édition priorité/catégorie à la volée

### Quiz Battle enrichi (game feel)
- **Streak / combos** : +5 points de bonus à partir de 3 bonnes d'affilée, +10 à partir de 5
- **Power-ups (1 par match)** : 50/50 (cache 2 options), Freeze (+8s timer), x2 Points
- Notification à l'adversaire quand un power-up est utilisé
- Animations : pulse vert sur bonne réponse, shake rouge sur mauvaise, timer qui pulse en rouge si ≤5s
- Post-match : stats détaillées (précision %, best streak, bonnes réponses)
- Badge "Invincible" automatique si 4 combos ou plus
- UI redesign lobby avec cartes features (Combos, Power-ups, Invincible)

### Projets — checklist et suivi détaillé
- Nouveau `checklist[]` sur chaque phase : tâches cochables par les membres
- Nouveau `ideas[]` : le prof peut pousser des suggestions (exercice/workshop/recherche/livrable) avec difficulté + estimation
- Widget "Progression globale" : % calculé à partir des phases (40%), tâches (40%), livrables (20%)
- Composant `ProjectProgressPanel.jsx` réutilisable (ProgressWidget, PhaseChecklist, IdeasPanel)
- Endpoints : POST/PUT/DELETE checklist item, POST/DELETE ideas

### Récompenses réelles (nouveau)
- Nouveaux modèles `Reward` (catalogue) et `RewardClaim` (réclamations)
- Controller + routes complet : catalogue, claim, my-claims, admin validation/livraison
- Catalogue seedé avec **15 récompenses concrètes** : certificats cybersécurité, Full-Stack, Data Analyst ; réductions TryHackMe/Udemy/DataCamp ; FlipLearn Premium 1/3 mois ; workshop cybersécu ; bootcamp IA ; t-shirt, mug, stickers, carnet ; badge Top 10
- Page `/rewards` : catalogue filtrable, carte produit avec highlight, barre de progression vers prochain objectif, modal confirmation (débit immédiat), onglet "Mes réclamations" avec statut temps réel
- Section admin `Récompenses` : traitement des claims (approver/livrer avec code/note/refuser avec remboursement auto)

### Documentation
- Appel `doc_updater.py` — entrée #009 ajoutée
- `CHANGELOG.md` mis à jour

---

## 18 Avril 2026

### Notifications persistantes & rappels automatiques (node-cron)
- Nouveau modèle `Notification.js` avec dédoublonnage (dedupKey) et index composé
- Champ `deadline` ajouté à `QCM`, `Video` ; `Project.phases.dateFin` déjà existant
- Service `notificationService.js` : push unifié (DB + Socket.io)
- Scheduler `notificationScheduler.js` (node-cron) tournant à 08:00 quotidien
- Rappels automatiques à J-7/J-3/J-1/J-0 pour QCM non complétés, vidéos non vues, phases projets
- Nouvelles routes `/api/notifications` (list, unread-count, read, read-all, delete, clear)
- Refonte complète de `NotificationContext.jsx` : DB-backed, plus de localStorage
- Nouvelle page `/notifications` (NotificationsPage.jsx) avec filtres et actions

### Suivi étudiants pour le professeur
- Nouvelles routes `/api/tracking` (my-courses, course/:id, course/:id/remind)
- Nouvelle page `/professor/tracking` : stats globales + tableau détaillé par étudiant
- Rappels manuels ciblés (par vidéo, par QCM, ou général) envoyés comme notifications

### IA spécialisée par module (RAG léger)
- Ajout de `aiPersona` sur `Course` (nom, specialite, avatar, ton, description, couleur)
- Nouveau service `moduleAI.js` : contexte RAG à partir des summaries + keyConcepts des VideoAnalysis
- Nouvelles routes `/api/chatbot/module/:courseId` (GET persona + historique, POST message)
- Route `/api/courses/:id/ai-persona` pour que le prof configure son assistant
- Nouvelle page `/courses/:courseId/assistant` (ModuleAssistant.jsx) avec éditeur de persona
- Bouton 'Assistant IA du module' dans StudentCourse

### Tickets support enrichis
- Modèle `SupportTicket` enrichi : priority, category, conversation[], resolvedAt, status 'closed'
- Controller entièrement refait + `/api/support/mine`, `/api/support/:id`, `/api/support/:id/message`, `/api/support/:id/priority`
- Nouvelle page `/my-tickets` (MyTickets.jsx) : filtres, création avec priorité, conversation multi-turn
- Notifications persistées à chaque étape (création, prise en charge, résolution, nouveau message)

### Timeline projets temps réel
- Nouveaux champs `Project.modules: [Course]` (pour projets multi-modules collaboratifs) et `Project.activity[]`
- Helpers `logActivity` + `notifyMembers` dans projectController
- Émission Socket.io `project:activity` sur changement de phase et ajout de livrable
- `getProjects` retourne maintenant `isMultiModule` calculé
- Badges 'Mono-module' / 'Multi-modules (N)' dans ProjectList
- Nouveau composant `ProjectActivityFeed.jsx` avec indicateur '● En direct' intégré dans ProjectDetail

### Documentation
- Appel à `doc_updater.py` → Documentation_PFE.docx modification #008 + Tutoriel_FlipLearn.docx mis à jour

---

## 28 Mars 2026

### Module Classe par Projet (PBL)
- Création du modèle `Project.js` avec schémas imbriqués (groupes, membres, rôles, phases, livrables, évaluations)
- 5 rôles CESI : Chef de projet, Scribe, Animateur, Chrono, Analyste
- Controller avec 12 endpoints : CRUD projet, groupes aléatoires, upload livrables, auto-évaluation, aide IA
- 3 nouvelles pages frontend : ProjectList, ProjectDetail, ProjectCreate
- Badges de rôles stylisés (style carte de jeu / Loup-Garou) avec hover animé
- Timeline visuelle des phases du projet
- Upload de livrables (documents + vidéos) via Cloudinary
- Aide IA via Groq pour suggestions de ressources

### Notifications email (Brevo)
- Migration Gmail SMTP → Resend → Brevo (résolution problème IPv6 sur Render)
- Emails transactionnels pour messages privés et urgents
- Template HTML avec design FlipLearn

### Messages urgents
- Bouton ⚠️ pour les professeurs dans le chat
- Badge rouge "URGENT" sur les messages
- Email urgent avec template rouge

### Quiz Battle
- Notification cliquable (redirige vers /quiz-battle)
- Codes de salle lisibles (BATTLE-X7K2MF)
- Gestion timeout null answer

### Corrections diverses
- Fix `etudiantId` → `userId` dans les groupes
- Fix `statut` → `status` pour le projet principal
- Fix aide IA : `data.suggestions` au lieu de `data.response`
- Fix upload livrables : groupeIndex auto-détecté + middleware étendu (vidéos/images)
- Fix affichage livrables : populate uploadedBy + date correcte
- Fix accents français dans ProjectDetail et ProjectCreate

---

## 27 Mars 2026

### Déploiement Render.com
- Configuration du déploiement (build command, start command, env vars)
- Fix vite devDependencies pour le build sur Render
- Fix chemins relatifs `cd backend && node server.js`
- Configuration MongoDB Atlas (IP whitelist 0.0.0.0/0)
- Configuration Cloudinary (3 variables séparées)
- Configuration Groq (migration llama3-8b → llama-3.3-70b-versatile)

### Configuration email
- Gmail SMTP : fonctionne en local, échoue sur Render (IPv6 ENETUNREACH)
- Resend : fonctionne mais limité à sa propre adresse en gratuit
- Brevo : solution finale, 300 emails/jour gratuits vers tout le monde

---

## 26 Mars 2026

### Refonte UI/UX complète
- Design system CSS (classes réutilisables, variables, responsive)
- Sidebar mobile avec hamburger menu et overlay
- Breadcrumb sur les pages intérieures
- Toast notifications (succès/erreur/info)
- Modal de confirmation
- Page 404 professionnelle
- Dashboard étudiant avec skeleton loading et accès rapide
- Flashcards avec animation flip 3D et navigation clavier

### Corrections de bugs
- Fix mapping rôles etudiant/professeur dans Layout.jsx
- Création de CoursesPage.jsx (route manquante)
- Fix profil étudiant (Layout wrapper + formulaire édition)
- Fix admin sidebar (query params)
- Fix variables CSS (alias --primary vers --color-primary)
- Logo FlipLearn cliquable (retour accueil)
- Accents français dans 9 fichiers

### Nouvelles fonctionnalités
- QCM choix multiple (checkbox)
- Génération QCM par IA (Groq)
- Page Contacts chat avec filtres
- Chapitres vidéo navigables

---

## 25 Mars 2026

### Développement initial
- Stack MERN : MongoDB + Express + React + Node.js
- Authentification JWT avec bcrypt
- Socket.io pour chat temps réel
- Upload vidéos via Cloudinary
- Système de gamification (points, badges, classement)
- Script seed.js avec données de démonstration
- 10 collections MongoDB
- 24 pages React
