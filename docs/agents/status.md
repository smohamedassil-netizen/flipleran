# Statut du projet FlipLearn

> Snapshot à jour de ce qui est livré, déployé, et de ce qui reste. À mettre à jour à chaque grosse session.

**Dernière mise à jour** : 2026-05-08

---

## Production

- **Frontend** : <https://fliplearn-frontend3.vercel.app> (Vercel)
- **Backend + frontend statique** : <https://fliplearn-5lsz.onrender.com> (Render free tier — dort après 15 min d'inactivité)
- **Base de données** : MongoDB Atlas
- **Stockage médias** : Cloudinary (vidéos & images, 100 MB par fichier)
- **IA** : Groq (Llama 3.3 70B, gratuit) + OpenAI (Whisper + GPT-4o pour analyse vidéo)
- **Emails** : Brevo > Resend > Gmail SMTP (fallback chain dans `backend/services/emailService.js`)

## Stack technique condensée

- **Backend** : Node.js, Express, Mongoose, Socket.io, JWT, Helmet, rate-limit, mongo-sanitize
- **Frontend** : React 18, Vite, React Router v6, Axios, Socket.io-client, Tailwind, Recharts, Lucide
- **Tests** : Jest + supertest (backend, partiel)
- **Doc auto** : Python + python-docx (`scripts/doc_updater.py`)

Voir [`docs/architecture.md`](../architecture.md) et [`docs/data-model.md`](../data-model.md) pour les détails.

---

## Modules livrés

### Étudiant (rôle `etudiant`)
- ✅ Tableau de bord avec **Cycle d'Apprentissage Inversé** (5 étapes)
- ✅ Catalogue **Cours** + **Chapitres** + **Vidéos** (Cloudinary)
- ✅ **Watch video** avec progression % + complétion à 80%
- ✅ **QCM** par vidéo + résultats / scoring
- ✅ **Decks** flashcards (auto-générés ou manuels) + révision SM-2
- ✅ **Quiz Battle** 1v1 temps réel (Socket.io) avec power-ups (50/50 sécurisé serveur, Freeze, x2 Points), combos, classement séparé
- ✅ **Leaderboards** (cohorte, mensuel, ma progression)
- ✅ **Profil** + récap téléchargeable
- ✅ **Récompenses** (catalogue + claims approuvés par admin)
- ✅ **Chat** par cours + privé (avec professeurs et pairs)
- ✅ **Notifications** in-app + emails (urgent / message / quiz battle)
- ✅ **Mon Tuteur IA** personnel (`/my-tutor`)
- ✅ **Mon Parcours** (`/my-journey`)
- ✅ **Module Assistant** par cours (chat IA persona configurable + RAG)
- ✅ **Prosits** (rôles CESI : animateur / scribe / gestionnaire / etc.)
- ✅ **Projets PBL** (mono ou groupé, livrables, peer-assessment 70/30)
- ✅ **Ressources** par cours
- ✅ **Feedback** prof → étudiant (avec notification email)

### Professeur (rôle `professeur`)
- ✅ Dashboard prof + **Synthèse de classe** (insights IA)
- ✅ **Upload** vidéos / ressources (Cloudinary)
- ✅ **QCM Hub** : créer manuellement ou **Générer avec IA** (Groq)
- ✅ **Auto-prep complet** d'un cours en 1 clic (Groq × 5 parallèle)
- ✅ **Learning Path Builder**
- ✅ **Class Readiness** (diagnostic avant cours présentiel)
- ✅ **Tracking** étudiant individuel
- ✅ **Bibliothèque de templates** projets
- ✅ **Badges** management
- ✅ **Insights pédagogiques IA** par classe (Hattie 2009)
- ✅ **Détection plagiat IA** sur livrables (DetectGPT-like + Groq)

### Admin (rôle `admin`)
- ✅ **Validation** des inscriptions étudiants
- ✅ **Catalogue** récompenses (création / approbation claims)
- ✅ **Seed L3 ISIL** (10 étudiants S6 + 3 profs + 8 modules)
- ✅ Gestion users / cours

### Transversal
- ✅ **Onboarding** wizard (premier login étudiant)
- ✅ **Thème filière** : bleu ISIL / orange Management / vert Finance
- ✅ Mode sombre (toggle)
- ✅ Responsive mobile + sidebar burger
- ✅ Quotas IA : 30 requêtes/h/user
- ✅ Streak quotidien + freezes (style Duolingo, sans pénalité)
- ✅ Page 404 propre

---

## Ce qui reste / à polir

Voir aussi `PROGRESS.md` (sprint final) à la racine du repo.

### Avant rendu mémoire (20 mai)
- [ ] Mettre à jour la page de garde (changement d'encadrante : Amira RAHAL → Sana KOUCHI)
- [ ] Compléter screenshots du chap 5 du mémoire
- [ ] Relecture et corrections finales du mémoire
- [ ] Mettre à jour `livrables/Documentation_PFE.docx` et `livrables/Tutoriel_FlipLearn.docx` via `doc_updater.py`

### Polish (avant soutenance 15 juin)
- [ ] Possibles : F6-F15 du `PLAN-FLIPLEARN-PROMPTS-CLAUDE-CODE.md` si l'auteur le souhaite
- [ ] Mais priorité : **maîtrise du code existant** > nouvelles features

### Décisions prises et validées
- ✅ **Pas de mode "vs IA"** dans Quiz Battle (08/05/2026) — voir `pedagogie.md`
- ✅ **Suppression de la prédiction TensorFlow** (28/04/2026) — voir `sessions/2026-04-28.md`
- ✅ **Modules Project & Prosit séparés** (28/04/2026) — l'ancienne dichotomie Prosit/Projet a été refondue en mono/groupé pour les projets, et le module Prosit suit la méthodologie APP/CESI

---

## Comptes de test pour démo

(passwords seedés, déjà publics dans `CLAUDE.md`)

| Rôle | Email | Mot de passe | Profil |
|---|---|---|---|
| Admin | `admin@fliplearn.dz` | `admin1234` | — |
| Prof | `omar.isil.l3@fliplearn.dz` | `test1234` | Omar Saadi, ISIL L3 |
| Prof démo | `lebrun@fliplearn.dz` | `demo1234` | Mme Lebrun (seed-soutenance) |
| Étudiant | `assil.isil.l3@fliplearn.dz` | `test1234` | Assil Seray (compte de l'auteur) |
| Étudiante MVP | `sara.demo@fliplearn.dz` | `demo1234` | engagement 95% |
| Étudiante moyenne | `lina.demo@fliplearn.dz` | `demo1234` | engagement 65% |
| Étudiant faible | `mehdi.demo@fliplearn.dz` | `demo1234` | engagement 25% |

Reset des seeds démo : `node backend/scripts/seed-soutenance.js --reset`.
