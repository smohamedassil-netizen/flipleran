# Changelog — FlipLearn

Historique des modifications par date de session.

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
- Leaderboard avec podium et classement complet
- QuizBattle wrappé dans Layout

### Corrections de bugs
- Mapping rôles `etudiant`/`professeur` dans Layout.jsx
- Création de CoursesPage.jsx (route manquante)
- Fix profil étudiant (Layout wrapper + formulaire édition)
- Fix admin sidebar (query params au lieu de paths)
- Fix variables CSS (`--primary` → `--color-primary`)
- Fix import Bot dans ChatPage
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
- Seed.js avec données de démonstration
- 10 collections MongoDB
- 24 pages React
