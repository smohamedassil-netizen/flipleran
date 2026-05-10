# 🔄 Brief pour Claude — Implémenter le Cycle d'Apprentissage Inversé (CAI)

> **À copier-coller dans une nouvelle session Claude** (ou référence pour humain).
> Date du brief : 1er mai 2026. Auteur : Mohamed Assil SERAY (PFE L3 ISIL EM Alger).

---

## 1. Contexte projet

**FlipLearn** — plateforme e-learning de classe inversée pour l'université algérienne (PFE Licence Informatique ISIL, EM Alger Business School).

**Stack** : React 18 + Vite (frontend) / Node.js + Express + Socket.io + MongoDB Atlas (backend) / Cloudinary + Groq (Llama 3.3) + OpenAI (Whisper + GPT-4o).

**Repo** : https://github.com/smohamedassil-netizen/flipleran (typo intentionnelle).

**Branche actuelle** : `main` (déployée sur Render https://fliplearn-5lsz.onrender.com).

**Compte test prof** : `omar.isil.l3@fliplearn.dz` / `test1234`
**Compte test étudiant** : `assil.isil.l3@fliplearn.dz` / `test1234`

**Ce qui existe déjà** (features fonctionnelles sur `main`) :
- Cours / Vidéos / QCM / Decks-flashcards SM-2
- Prosits (méthode CESI/APP : 3 phases Aller/Recherche/Retour, 5 rôles tournants)
- Projets (mono / groupe / PFE, 3-7 phases, rubric d'évaluation)
- Tuteur IA personnel (Groq) + Assistant IA module (RAG par cours)
- Auto-prépa cours en 1 clic (F1)
- Quiz Battle temps réel (Socket.io + power-ups)
- Streaks + Niveaux + Quêtes IA hebdo (F11A)
- Leaderboard, Récompenses, Badges, Chat
- Détection plagiat IA Prosit (F2 — code conservé)
- Insights pédagogiques IA (F3)
- Forum + peer-review (F9)
- Bibliothèque templates projets (F10)

**Audit récent** (1er mai 2026) :
- Côté étudiant : 16 bugs fixés + tuto + protocole tests
- Côté prof : Bug B (0 étudiants inscrits dashboard) + Bug C (Omar voyait 0 projets) fixés
- Backend Mongoose warnings silencés
- Tout poussé sur `main`, déployé sur Render

**Page Bloom/contrat pédagogique** : retirée de la sidebar (commit récent), code conservé en perspective d'évolution.

---

## 2. Le problème pédagogique à résoudre

**FlipLearn a beaucoup de bonnes briques mais aucun fil rouge qui les relie.**

L'étudiant ne sait pas *« je suis où dans le module ? »*. Le prof ne sait pas *« la classe est où dans le cycle ? »*.

Et surtout : **70% des classes inversées échouent parce que les étudiants ne regardent pas les vidéos avant le cours en présentiel.** Le prof arrive en classe, demande "Vous avez vu la vidéo ?", silence gêné, il refait son cours magistral. → La classe inversée devient une classe normale + travail en plus pour le prof.

C'est exactement ce qui se passe dans les universités algériennes : pas d'outils, pas de mécanisme d'engagement, pas de visibilité prof.

---

## 3. La solution : le Cycle d'Apprentissage Inversé (CAI)

**5 étapes obligatoires** pour chaque module, articulant tous les composants existants :

```
┌──────────────────────────────────────────────────────────┐
│  1. PRÉPARATION  →  2. RENDEZ-VOUS  →  3. APPLICATION    │
│  (à la maison)      (en classe)         (Prosit groupe)  │
│       ↓                  ↑                    ↓          │
│  4. PRODUCTION  ←  5. CONSOLIDATION  ←────────┘          │
│  (Projet final)    (révisions IA)                        │
└──────────────────────────────────────────────────────────┘
```

### Étape 1 — PRÉPARATION (chez l'étudiant, avant le cours)

**Composants** : Vidéo + QCM + **Pulse Préparation** ⚡ (NOUVEAU)

**Pulse Préparation** : 24h avant chaque cours en présentiel, l'étudiant fait un mini-check de 30 secondes :
- 1 question express (auto-générée par IA depuis le transcript de la vidéo)
- 1 question ouverte : *« Qu'est-ce qui te bloque le plus dans cette vidéo ? »*
- → +20 XP, badge "Prêt", déblocage de l'étape suivante

### Étape 2 — RENDEZ-VOUS PRÉSENTIEL (en classe)

**Composants** : Briefing prof + activité ciblée

Le prof arrive en classe avec son **Briefing IA** :
- X étudiants prêts / Y partiels / Z absents
- Top 3 blocages identifiés (analyse IA des verbatim Pulse)
- Suggestions d'activité présentielle par l'IA (démo, débat, exo en direct)
- Bouton "Exporter PDF" pour avoir son brief en classe
- Bouton "Envoyer rappel" aux étudiants pas prêts

L'étudiant marque sa présence dans l'app (QR code ou check-in simple).

### Étape 3 — APPLICATION (en groupe, sur 1-2 semaines)

**Composants** : **Prosit** (déjà existant)

À la fin du présentiel, le prof active automatiquement le Prosit du module :
- Phase Aller (1h en classe) → Recherche (chez soi, 1 sem) → Retour (présentation au prof)
- Rôles CESI tournants
- Évaluation par les pairs (30% pairs + 70% prof)

### Étape 4 — PRODUCTION (sur tout le module)

**Composants** : **Projet** (déjà existant)

En parallèle des Prosits, un projet plus long (1 mois) qui couvre TOUT le module :
- 1 livrable structuré (3, 5 ou 7 phases selon mono/groupe/PFE)
- L'étudiant CRÉE quelque chose d'original (niveau Bloom 6)
- L'IA valide la non-tricherie (analyse plagiat F2)

### Étape 5 — CONSOLIDATION (autonome, à vie)

**Composants** : **Flashcards SM-2** (réactiver F6) + **Tuteur IA personnel** (F4)

- Auto-génération de flashcards depuis les vidéos vues (réactiver F6)
- Révision espacée (algorithme SM-2 Wozniak 1990)
- Le Tuteur IA répond aux questions à n'importe quel moment

---

## 4. L'Engagement Score — l'argument démo

Pour chaque module, chaque étudiant a un **Engagement Score sur 100** :

| Étape | Poids | Mesure |
|---|---|---|
| 1. Préparation | 30 % | Vidéo ≥80% (10) + QCM ≥60% (10) + Pulse fait (10) |
| 2. Rendez-vous | 20 % | Présence checkée (10) + Interaction prof (10) |
| 3. Application | 25 % | Phase Aller (10) + Phase Retour (10) + Note pairs ≥3/5 (5) |
| 4. Production | 15 % | Projet livré (10) + Note ≥3/5 (5) |
| 5. Consolidation | 10 % | ≥3 flashcards révisées (5) + ≥1 question tuteur IA (5) |

**Score public dans la promo** (avec consentement RGPD) → émulation saine.

---

## 5. L'IA dans chaque étape (workflow concret)

| Étape | Rôle de l'IA | Service backend |
|---|---|---|
| 1. Préparation | Génère questions Pulse depuis transcript vidéo | Whisper + Groq |
| 2. Rendez-vous | Analyse verbatim Pulse → groupe blocages → propose activités | Groq |
| 3. Application | Génère Prosit (énoncé + grille) adapté | Groq (existant) |
| 4. Production | Détecte plagiat IA dans livrables (F2) | Groq (existant, à réactiver) |
| 5. Consolidation | Auto-flashcards (F6) + Tuteur IA (F4) | Groq (existant) |

---

## 6. Refonte de la sidebar (simplifiée)

### Étudiant — 4 sections claires
| Section | Items |
|---|---|
| 🎯 MON PARCOURS | Tableau de bord (avec cycle visualisé) / Mes cours / Mon Pulse |
| 📝 ACTIVITÉS | Prosits / Projets / Mes flashcards |
| 🤖 MES OUTILS IA | Mon tuteur IA / Méthode Prosit |
| 👥 COMMUNAUTÉ | Classement / Quiz Battle / Récompenses / Messages |

### Prof — 4 sections claires
| Section | Items |
|---|---|
| 🎯 MON ENSEIGNEMENT | Tableau de bord / **Briefings prochains cours** ⭐ NEW / Mes cours / Suivi étudiants |
| 📝 ACTIVITÉS | Projets / Prosits |
| 🛠 CRÉATION | Gérer QCM / Gérer badges |
| 💬 ESPACE | Messages / Mon profil / Aide |

À retirer / fusionner :
- "Ressources" séparé → intégré aux cours
- "Méthode Prosit" séparé → intégré au menu Prosits

---

## 7. Pages hub à créer

### "Mon parcours" (étudiant) — `/my-journey`

Vue unique pour répondre à *« Je suis où ? »* :
```
┌─────────────────────────────────────────────────────┐
│  CYBERSÉCURITÉ — Module 2/5                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━           │
│  Engagement : 73 / 100  🔥                          │
│                                                      │
│  ✅ 1. PRÉPARATION  ✓ Vidéo, QCM 80%, Pulse fait   │
│  ⏳ 2. RENDEZ-VOUS  Mardi 10h — sois prêt           │
│  🔓 3. APPLICATION  Prosit OWASP — phase Aller     │
│  🔒 4. PRODUCTION   se débloque après le Prosit     │
│  🔒 5. CONSOLIDATION                                │
│                                                      │
│  [Continue le module →]                              │
└─────────────────────────────────────────────────────┘
```

### "Briefings prochains cours" (prof) — `/professor/briefings`

Liste des cours à venir avec stats Pulse + accès au briefing complet :
```
┌─────────────────────────────────────────────────────┐
│  📅 PROCHAINS COURS                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━           │
│                                                      │
│  📌 Mardi 10h — Cybersécurité Vidéo 3                │
│     ✅ 18 prêts · 🟡 7 partiels · 🔴 5 absents      │
│     Top blocage : "hash SHA-256"                     │
│     [Ouvrir briefing complet]                        │
└─────────────────────────────────────────────────────┘
```

---

## 8. Plan d'implémentation (séquencé)

| # | Phase | Effort | Livrable |
|---|---|---|---|
| **P1** | **Pulse Préparation** (étudiant + prof briefing) | 4h | Feature démo |
| **P2** | **Engagement Score** (calcul + affichage étudiant + prof) | 3h | Score sur 100 dans Mon parcours |
| **P3** | **Page hub "Mon parcours"** étudiant | 2h | Vue unifiée 5 étapes |
| **P4** | **Refonte sidebar** (4 sections clean) + fil d'ariane | 1h | Plus simple |
| **P5** | **Réactiver F6 (auto-flashcards)** pour étape 5 | 30 min | Consolidation auto |
| **P6** | **Doc pédagogique** : schéma cycle + tableau Bloom intégré | 1h | Pour mémoire |

**Total** : ~12h pour transformer FlipLearn en LA plateforme classe inversée nouvelle génération.

---

## 9. Détails techniques pour P1 (Pulse Préparation)

### Backend (1h30)

**Modèle `backend/models/PulseCheck.js`** :
```js
{
  videoId: ObjectId(ref Video),
  studentId: ObjectId(ref User),
  courseId: ObjectId(ref Course),
  scheduledClassDate: Date, // date du cours en présentiel
  mcqQuestion: String,      // question auto-générée par IA
  mcqOptions: [String],
  mcqCorrectIndex: Number,
  mcqAnswer: Number,        // réponse de l'étudiant
  mcqIsCorrect: Boolean,
  openQuestion: String,     // toujours "Qu'est-ce qui te bloque ?"
  openAnswer: String,       // verbatim étudiant
  completedAt: Date,
}
```

**Service `backend/services/pulseGenerator.js`** :
- `generatePulseQuestion(videoId)` : prend le transcript de la vidéo (depuis VideoAnalysis), appelle Groq pour générer 1 question MCQ + 4 options + correctIndex.

**Controller `backend/controllers/pulseCheckController.js`** :
- `getOrGeneratePulse(videoId, studentId)` : retourne le Pulse de l'étudiant pour cette vidéo (en générer un si pas existant).
- `submitPulse(pulseId, mcqAnswer, openAnswer)` : enregistre la réponse, calcule isCorrect.
- `getBriefing(courseId, scheduledClassDate)` : renvoie pour le prof : counts (prêts/partiels/absents) + top 3 blocages (analyse Groq des verbatim) + suggestions activités.

**Routes `backend/routes/pulseRoutes.js`** :
- POST `/api/pulse/generate` (étudiant)
- POST `/api/pulse/:id/submit` (étudiant)
- GET `/api/pulse/briefing/:courseId/:date` (prof)

**Cron** : scheduler dans `notificationScheduler.js` qui envoie une notif aux étudiants 24h avant chaque scheduled class date.

### Frontend (2h)

**Page `frontend/src/pages/PulseCheck.jsx`** : modal/page avec la question MCQ + l'open question + bouton Submit. Animations légères. 30 sec timer visuel.

**Page `frontend/src/pages/ProfessorBriefings.jsx`** : liste des prochains cours avec stats Pulse + bouton "Ouvrir briefing complet" qui ouvre `/professor/briefings/:courseId/:date`.

**Page `frontend/src/pages/ProfessorBriefingDetail.jsx`** : détail d'un briefing (counts + top 3 blocages + suggestions IA + export PDF + rappel groupé).

**Widget Dashboard étudiant** : *"Prochain Pulse : mardi 10h — fais-le maintenant !"*

**Widget Dashboard prof** : *"Briefing prochain cours : 18/30 prêts pour mardi 10h"*

**Sidebar prof** : ajouter item "Briefings cours" sous MON ENSEIGNEMENT.

---

## 10. Détails techniques pour P2 (Engagement Score)

**Service `backend/services/engagementScore.js`** :
- `computeScoreForStudentAndCourse(studentId, courseId)` : agrège les 5 étapes selon les poids du tableau § 4. Retourne `{ totalScore, breakdown: { preparation, rendezvous, application, production, consolidation } }`.

**Endpoints** :
- GET `/api/engagement/me/:courseId` (étudiant voit son score)
- GET `/api/engagement/course/:courseId` (prof voit le tableau de toute sa classe)

**Frontend** : composant `EngagementScoreCard.jsx` (anneau de progression + breakdown par étape).

---

## 11. Détails techniques pour P3 (Page hub "Mon parcours")

**Page `frontend/src/pages/MyJourney.jsx`** : itère sur tous les cours de l'étudiant, affiche pour chacun l'état des 5 étapes via icônes + bouton "Continue".

**Service utilisateur `frontend/src/utils/journeyState.js`** : helper `getStepStatus(step, course, studentData)` retourne `'completed' | 'in-progress' | 'unlocked' | 'locked'`.

**Route** : `/my-journey` (sidebar étudiant section MON PARCOURS).

---

## 12. Pour le mémoire (chapitre Cadre théorique)

Réutiliser ces références scientifiques (déjà documentées dans `docs/TUTO-COMPLET-PROF.md` § 11) :

| Concept | Référence | Implémentation FlipLearn |
|---|---|---|
| Classe inversée | Bergmann & Sams 2012 ; Bishop & Verleger 2013 | **Cycle d'Apprentissage Inversé en 5 étapes** (extension de Bishop) |
| Engagement étudiant | Hattie 2009 ; Akçayır 2018 | **Engagement Score sur 100** + Pulse Préparation |
| Métacognition | Flavell 1979 | Question ouverte Pulse "Qu'est-ce qui te bloque ?" |
| Apprentissage Par Problème | Barrows 1996 | Prosits 3 phases + 5 rôles CESI |
| Évaluation par les pairs | Falchikov 2005 ; Topping 1998 | 70% prof + 30% pairs |
| Curve of forgetting | Wozniak 1990 (SM-2) | Decks/Cards consolidation |

---

## 13. Comment démarrer (ordre des fichiers à toucher)

**Pour P1 (Pulse Préparation)** :

1. `backend/models/PulseCheck.js` (NOUVEAU)
2. `backend/services/pulseGenerator.js` (NOUVEAU)
3. `backend/controllers/pulseCheckController.js` (NOUVEAU)
4. `backend/routes/pulseRoutes.js` (NOUVEAU)
5. `backend/server.js` : mount `/api/pulse`
6. `backend/services/notificationScheduler.js` : ajouter cron pulse
7. `frontend/src/pages/PulseCheck.jsx` (NOUVEAU)
8. `frontend/src/pages/ProfessorBriefings.jsx` (NOUVEAU)
9. `frontend/src/pages/ProfessorBriefingDetail.jsx` (NOUVEAU)
10. `frontend/src/App.jsx` : ajouter routes `/pulse/:videoId` + `/professor/briefings` + `/professor/briefings/:courseId/:date`
11. `frontend/src/components/Layout.jsx` : ajouter item sidebar prof "Briefings cours"
12. `frontend/src/pages/Dashboard.jsx` : widget "Prochain Pulse"
13. `frontend/src/pages/ProfessorDashboard.jsx` : widget "Briefing prochain cours"

---

## 14. Fichiers de référence à lire avant de coder

Pour comprendre le projet existant :
- `fliplearn/CLAUDE.md` — règles projet et commandes
- `fliplearn/docs/TUTO-COMPLET-ETUDIANT.md` — toutes les pages étudiant
- `fliplearn/docs/TUTO-COMPLET-PROF.md` — toutes les pages prof
- `fliplearn/backend/services/contentSeed.js` — comment les vidéos sont seedées
- `fliplearn/backend/services/courseAutoPrep.js` — pattern IA Groq + Promise.allSettled
- `fliplearn/frontend/src/components/Layout.jsx` — sidebar configuration
- `fliplearn/frontend/src/App.jsx` — toutes les routes

---

## 15. Règles de travail à respecter (préférences user)

- **Commit + push autonome** sur la branche `main` après chaque phase complétée (pas demander permission, confiance accordée)
- **Étape par étape** : terminer P1 puis demander validation avant P2, etc.
- **Honnêteté** : si un truc casse ou ne marche pas, le dire. Pas de blabla pour cacher.
- **Pas de tuto/docs en plus** sauf si explicitement demandé.
- **Vérification navigateur** après chaque changement observable (preview_eval, preview_snapshot).
- **Pas de Markdown technique chez l'utilisateur** : si on doit éditeur dans l'UI, préférer WYSIWYG ou templates pré-remplis.
- **Pas d'over-engineering** : viser le MVP démo, pas la perfection production.

---

## 16. Verbatim utilisateur (pour comprendre le contexte humain)

L'utilisateur (Mohamed Assil SERAY, L3 ISIL EM Alger Business School) a dit littéralement :

> *« On enlève [Bloom + contrat pédagogique] et on essaie de voir autre chose qui représente la classe inversée, qui a un sens dans l'application prof, qui aura un impact sur les étudiants et les encourage à participer, voire respecter le principe de la classe inversée. »*

> *« Une idée du siècle, adaptée à l'université algérienne et même au-delà. »*

> *« Améliore cette idée pour qu'elle s'adapte à notre application, qu'elle puisse être reliée aux Prosits et Projets, à la sainte IA. Donne-moi une idée qui relie cette application, qui montre l'engagement de l'étudiant. L'étudiant va regarder la vidéo, ensuite faire le QCM, après il y a quoi ? Le cours présentiel ? En présentiel il y a les Prosits à faire en classe ?? Via l'application ou c'est comment ? Et les projets, où place ton idée ? Améliore-la, peaufine-la et propose-moi une sorte de refonte qui nous aide dans notre application, qu'elle soit cohérente avec la classe inversée, qu'on comprenne et qu'elle soit efficace, qu'on ne se perde pas dans l'application. »*

→ La demande est : **un fil rouge cohérent qui articule tout l'existant + une feature pivot (Pulse) + une vision UX simplifiée**.

---

## 17. État actuel des branches Git (1er mai 2026)

- `main` : déployée Render (front + API monolithe), audit 1er mai inclus, tous bugs étudiant+prof fixés
- `mvp-soutenance` : version simplifiée (F2/F3/F5/F6/F7 désactivées) — utilisable pour démo si on veut moins de features
- `backup-30-avril-complete` : snapshot avant simplify
- `sprint-final` : référence dev

Travailler sur `main` (production = ce que le jury verra).

---

## 18. TL;DR pour Claude

> Implémente le **Cycle d'Apprentissage Inversé (CAI) en 5 étapes** dans FlipLearn :
> 1. Crée la feature **Pulse Préparation** (P1, cf. § 9) : mini-check 30s avant chaque cours présentiel + briefing prof IA.
> 2. Calcule l'**Engagement Score** sur 100 par étudiant et par module (P2, cf. § 10).
> 3. Crée la page hub **"Mon parcours"** côté étudiant (P3, cf. § 11).
> 4. Refonte **sidebar 4 sections** (P4, cf. § 6).
> 5. Réactive **F6 (auto-flashcards)** pour l'étape 5 Consolidation (P5).
>
> Travaille sur `main`, commit + push autonome après chaque phase. Vérifie en navigateur (preview_*) après chaque changement observable. Demande validation utilisateur entre chaque P (pas tout d'un coup).
>
> Compte test prof : `omar.isil.l3@fliplearn.dz` / `test1234`. Backend en background à démarrer si pas déjà : `cd backend && node server.js`. Frontend Vite : preview_start ou `cd frontend && npm run dev`.

Bonne implémentation. 🚀
