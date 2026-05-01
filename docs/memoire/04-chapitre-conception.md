# Chapitre 4 — Conception du système

Le présent chapitre formalise la conception détaillée de FlipLearn. Il aborde successivement l'**architecture globale** en trois couches (§ 4.1), le **modèle de données** structuré en six domaines thématiques sur vingt-cinq collections MongoDB (§ 4.2), le **schéma pédagogique** original — le Cycle d'Apprentissage Inversé — qui constitue le cœur conceptuel du projet (§ 4.3), les principaux **diagrammes UML** (§ 4.4), et enfin le **design des interfaces utilisateur** (§ 4.5).

## 4.1 Architecture globale

### 4.1.1 Vue d'ensemble — architecture trois couches

FlipLearn adopte une architecture web **trois couches** classique, séparant strictement la présentation, la logique métier et la persistance. Cette séparation, conforme au pattern *MVC* généralisé et largement éprouvée dans l'écosystème JavaScript moderne, présente trois avantages décisifs : (a) elle permet le **développement parallèle** des couches (le front-end peut évoluer indépendamment du back-end tant que le contrat REST/Socket est respecté), (b) elle facilite la **maintenance** (un bug visuel ne nécessite jamais de toucher à la base de données), (c) elle prépare les **évolutions futures** (par exemple le développement ultérieur d'une application mobile native qui réutiliserait l'API back-end existante).

**Figure 4.1 — Architecture trois couches FlipLearn**

```
┌──────────────────────────────────────────────────────────────────┐
│                    COUCHE PRÉSENTATION                            │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  React 18 + Vite + React Router DOM v6                  │     │
│  │                                                          │     │
│  │  - 50 routes (étudiant / professeur / admin / public)   │     │
│  │  - 5 contextes (Auth, Theme, Toast, Notif, Gamif)       │     │
│  │  - ~60 composants réutilisables                         │     │
│  │  - 35 pages spécialisées                                │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↕
        REST /api/*           Socket.io WebSocket
                            ↕
┌──────────────────────────────────────────────────────────────────┐
│                    COUCHE MÉTIER                                  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  Node.js 20 + Express 4 + Socket.io 4                   │     │
│  │                                                          │     │
│  │  Routes (~30) → Contrôleurs (~30) → Services (~15)      │     │
│  │                                                          │     │
│  │  Middlewares : authMiddleware, requireRole,             │     │
│  │                helmet, rateLimit, mongoSanitize, hpp    │     │
│  │                                                          │     │
│  │  Services IA : Groq (7 agents), OpenAI (Whisper, GPT-4o)│     │
│  │  Service email : Brevo → Resend → Gmail (fallback)      │     │
│  │  Cron : 4 schedulers (deadlines 8h, flashcards Sun 9h,  │     │
│  │         coach 18h, quêtes Mon 6h)                       │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↕
        Mongoose ODM         Cloudinary SDK
                            ↕
┌──────────────────────────────────────────────────────────────────┐
│                    COUCHE PERSISTANCE                             │
│                                                                   │
│  ┌──────────────────┐         ┌─────────────────────────────┐   │
│  │  MongoDB Atlas   │         │  Cloudinary                  │   │
│  │  (cluster M0)    │         │  - Vidéos (.mp4)             │   │
│  │  25 collections  │         │  - Ressources (PDF/PPTX/...) │   │
│  │  ~17 Mo data     │         │  - Thumbnails auto           │   │
│  └──────────────────┘         └─────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↕
                    Services externes
                            ↕
        ┌──────────────┬──────────────┬─────────────┐
        │  Groq API    │  OpenAI API  │  Brevo API  │
        │ (Llama-3.3)  │ (Whisper +   │  (emails)   │
        │              │  GPT-4o)     │             │
        └──────────────┴──────────────┴─────────────┘
```

### 4.1.2 La couche présentation

La couche présentation est une **Single Page Application (SPA)** React 18, compilée par Vite et servie soit par le serveur Express en production unifiée, soit par Vercel pour bénéficier d'un CDN edge mondial. Elle communique avec la couche métier via deux canaux complémentaires :

- **REST HTTP/JSON** pour les opérations classiques (lecture, écriture, recherche), via une instance Axios centralisée qui injecte automatiquement le JWT dans le header `Authorization`.
- **Socket.io WebSocket** pour le temps réel : chat de cours, chat privé, notifications instantanées, synchronisation Quiz Battle multijoueurs.

L'application est organisée en **35 pages** principales (étudiant : Dashboard, MyJourney, Cours, WatchVideo, QCM, Decks, Study, Prosits, Projects, MyTutor, Quiz Battle, Rewards, Leaderboard, Profil, Notifications, etc.) et **environ 60 composants** réutilisables (Layout, NavBar, Sidebar, ProjectCard, ReadinessRow, JourneyStepCard, CycleDiagram, TutorBubble, etc.). La gestion d'état globale est assurée par cinq **contextes React** spécialisés, évitant le recours à une bibliothèque externe disproportionnée.

### 4.1.3 La couche métier

La couche métier centralise l'ensemble de la logique applicative dans un serveur Node.js 20 / Express 4. L'organisation interne suit le pattern canonique **routes → contrôleurs → services**, soit un total de **~75 fichiers JavaScript** organisés en cinq dossiers : `routes/`, `controllers/`, `services/`, `models/`, `middleware/`.

Cette couche héberge également les **quatre crons** schedulers programmés via `node-cron` (rappels deadlines à 08:00, génération hebdomadaire des auto-flashcards le dimanche à 09:00, coach proactif à 18:00, génération des quêtes hebdomadaires le lundi à 06:00) ainsi que les **dix services métier** correspondant aux fonctionnalités complexes : `chatbot.js` (orchestration des appels Groq), `pointsService.js` (gestion centralisée des XP), `streakService.js` (calcul des streaks), `emailService.js` (envoi avec fallback), `videoAnalyzer.js` (orchestration Whisper + GPT-4o), `personalTutor.js` (tuteur IA), `courseAutoPrep.js` (auto-préparation cours), `aiPlagiarismDetector.js` (détection plagiat), `teacherInsights.js` (insights pédagogiques), `notificationScheduler.js` (chef d'orchestre des crons).

### 4.1.4 La couche persistance

La couche persistance est dédoublée : les **données structurées** (utilisateurs, cours, vidéos métadonnées, QCM, Prosits, etc.) sont stockées dans MongoDB Atlas via Mongoose, tandis que les **fichiers binaires** (vidéos MP4, ressources PDF/PPTX/DOCX/ZIP) sont délégués à Cloudinary qui assure le stockage CDN et la transformation à la volée. Cette séparation est standard pour les applications web modernes : MongoDB n'est pas conçu pour stocker efficacement des fichiers de plusieurs dizaines de mégaoctets, et Cloudinary apporte des optimisations spécialisées (thumbnails automatiques, compression vidéo adaptative, distribution CDN globale) qui dépassent largement ce qu'un développement custom pourrait produire.

## 4.2 Modèle de données

### 4.2.1 Vue d'ensemble — 25 collections regroupées en 6 domaines

Le modèle de données de FlipLearn comporte **vingt-cinq collections MongoDB**, chacune correspondant à un modèle Mongoose typé et indexé. Pour faciliter la lecture, ces collections sont regroupées thématiquement en **six domaines** :

**Tableau 4.1 — Les 25 collections regroupées par domaine**

| Domaine | Collections | Rôle dans le système |
|---|---|---|
| **1. Authentification & utilisateurs** (1) | `User` | Comptes utilisateurs avec rôles, filière, promotion, status (pending/active/rejected), bcrypt password |
| **2. Cours & contenus** (5) | `Course`, `Video`, `VideoAnalysis`, `LearningPath`, `LearningOutcome` | Cours de l'EM Alger, vidéos Cloudinary, analyses IA Whisper, parcours scénarisés, objectifs Bloom |
| **3. Évaluation** (4) | `QCM`, `VideoQuestion`, `VideoQuestionAnswer`, `Progress` | Questionnaires post-vidéo, questions interactives in-vidéo, suivi de progression étudiant |
| **4. Activités collaboratives** (4) | `Prosit`, `Project`, `ProjectTemplate`, `ProjectThread`, `ProjectPeerReview` | Méthode CESI/APP, projets multi-modules, templates, forum, peer-review |
| **5. Révision & gamification** (8) | `Deck`, `Card`, `Badge`, `Reward`, `RewardClaim`, `StudyStreak`, `WeeklyQuest`, `BattleResult`, `AutoPrepJob` | Flashcards SM-2, badges, marketplace récompenses, streaks, quêtes IA, Quiz Battle, jobs auto-prep |
| **6. Communication** (4) | `Message`, `Notification`, `Feedback`, `SupportTicket`, `Resource` | Chat (cours + privé), notifications in-app, feedbacks pédagogiques prof, tickets support, ressources fichiers |

### 4.2.2 Schéma entité-relation simplifié

Le diagramme ERD ci-dessous présente les principales relations entre les collections (relations *many-to-one* indiquées par `→`, *many-to-many* par `↔`).

**Figure 4.2 — ERD simplifié (entités principales)**

```
                    ┌────────────┐
                    │   User     │
                    │ (etudiant/ │
                    │  prof/     │
                    │  admin)    │
                    └────────────┘
                          ▲
                          │ professorId
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼ enrolled (filiere+promo)
      ┌────────────┐           ┌────────────┐
      │   Course   │◀─────────│  Progress  │
      │ + outcomes │           │ + qcmScores│
      │ + contract │           │ + videos   │
      └────────────┘           └────────────┘
            │                        ▲
            │ courseId               │
            ▼                        │
      ┌────────────┐                 │
      │   Video    │─────────────────┤ watchedBy[]
      │ + watchedBy│                 │
      │ + chapters │                 │
      └────────────┘                 │
            │ videoId                │
            ▼                        │
      ┌────────────┐                 │
      │    QCM     │─────────────────┤ resultats[]
      │ + questions│                 │
      │ + resultats│                 │
      └────────────┘                 │
                                     │
      ┌────────────┐                 │
      │   Prosit   │◀────────────────┤ groupes.membres[]
      │ + groupes  │                 │
      │ + status   │                 │
      └────────────┘                 │
                                     │
      ┌────────────┐                 │
      │  Project   │◀────────────────┘ groupes.membres[]
      │ + phases   │
      │ + livrables│
      └────────────┘
            ▲
            │ ownerId
            │
      ┌────────────┐
      │    Deck    │ ── owner ──→ User
      └────────────┘
            │ deck
            ▼
      ┌────────────┐
      │    Card    │
      │ + nextRev  │
      │ + interval │
      │ + easeFact │
      └────────────┘
```

### 4.2.3 Modèles clés — focus sur cinq entités

#### Modèle `Course` — cours d'enseignement

```javascript
{
  _id: ObjectId,
  titre: String (required),                    // ex: "Cybersécurité"
  description: String,
  professorId: ObjectId (ref User, required),  // un seul prof titulaire
  filiere: String (required),                  // 'ISIL' | 'Management' | 'Finance'
  promotion: String (required),                // 'L1' | 'L2' | 'L3'
  isActive: Boolean (default true),
  aiPersona: {                                  // Assistant IA configurable par cours
    nom: String,                                // ex: "Cyber-Bot"
    specialite: String,
    avatar: String,
    ton: 'pédagogue' | 'strict' | 'fun' | 'expert',
    description: String,
    couleur: String
  },
  learningOutcomes: [LearningOutcome],         // Objectifs Bloom (Anderson 2001)
  pedagogicalContract: String (max 2000),      // Contrat pédagogique Markdown (Biggs 1996)
  createdAt, updatedAt: Date
}
```

#### Modèle `Video` — vidéo de cours

```javascript
{
  _id: ObjectId,
  titre: String (required),
  description: String,
  provider: 'cloudinary' | 'youtube',
  url: String (required),                       // Cloudinary secure_url OU YouTube URL
  youtubeId: String,                            // si provider=youtube
  duration: Number,                             // secondes
  order: Number,                                // ordre dans le cours
  chapters: [{ title, timestamp }],            // chapitrage
  courseId: ObjectId (ref Course, required),
  createdBy: ObjectId (ref User),
  watchedBy: [{                                 // suivi par étudiant
    userId: ObjectId,
    watchedPercent: Number (0-100),
    completed: Boolean,                         // true si >= 80%
    completedAt: Date,
    lastWatchedAt: Date
  }],
  deadline: Date,
  coversOutcomes: [ObjectId],                   // référence aux outcomes Bloom du cours
  createdAt, updatedAt: Date
}
```

#### Modèle `Prosit` — cas d'apprentissage par problème CESI

```javascript
{
  _id: ObjectId,
  titre: String (required),
  pitch: String,
  enonce: String (required),                    // énoncé complet du cas
  caseEntreprise: String,                       // cas algérien contextualisé
  motsCles: [String],
  objectifsApprentissage: [String],
  courseId: ObjectId (ref Course),              // optionnel
  filiere: 'ISIL' | 'Management' | 'Finance',
  promotion: 'L1' | 'L2' | 'L3',
  dateAller: Date (required),
  dateRetour: Date (required),
  dureeRechercheJours: Number (1-30),
  createdBy: ObjectId (ref User),
  status: 'brouillon' | 'aller' | 'recherche' | 'retour' | 'evalue' | 'archive',
  groupesConfig: {
    minMembres: Number (2-12),
    maxMembres: Number (2-12),
    formationMode: 'random' | 'manual' | 'student_choice'
  },
  groupes: [{
    nom: String,
    membres: [{
      userId: ObjectId (ref User),
      role: 'animateur' | 'secretaire' | 'scribe' | 'gestionnaire' | 'membre'
    }],
    contributions: [{ userId, content, createdAt }],
    selfAssessments: [SelfAssessment],          // auto-évaluation Falchikov 2005
    peerAssessments: [PeerAssessment],          // évaluation pairs Topping 1998
    evaluation: { note, commentaire, evaluateurId }
  }],
  ressources: [Ressource],
  grilleEvaluation: [{ critere, poids, description }],
  peerAssessmentEnabled: Boolean (default true),
  peerAssessmentDeadline: Date,
  peerAssessmentCriteria: [Critere]              // 5 critères standardisés par défaut
}
```

#### Modèle `Card` — flashcard SM-2

```javascript
{
  _id: ObjectId,
  deck: ObjectId (ref Deck, required),
  front: String (required),                     // question
  back: String (required),                      // réponse
  image: String,
  audio: String,
  difficulty: 'easy' | 'medium' | 'hard',
  // Algorithme SM-2 (Wozniak, 1990)
  nextReview: Date (default now),               // quand cette carte est due
  interval: Number (default 1),                 // jours entre révisions
  easeFactor: Number (default 2.5),             // facteur de facilité (1.3 - 2.5+)
  repetitions: Number (default 0),              // nb répétitions consécutives réussies
  source: 'manual' | 'auto-ai' | 'prof',
  sourceVideo: ObjectId (ref Video),            // si générée depuis vidéo
  frontHash: String,                            // SHA-1 court pour dédup
  createdAt, updatedAt: Date
}
```

#### Modèle `Project` — projet pédagogique

```javascript
{
  _id: ObjectId,
  titre: String (required),
  description: String,
  type: 'mono' | 'groupe' | 'pfe',              // mono-module, multi-modules, ou PFE
  courseId: ObjectId (ref Course),              // pour mono
  modules: [ObjectId (ref Course)],             // pour groupe et PFE
  createdBy: ObjectId (ref User, required),
  status: 'brouillon' | 'actif' | 'termine',
  enonce: String,
  motsCles: [String],
  dateDebut, dateFin, dateSoutenance: Date,
  groupes: [{
    nom: String,
    membres: [{
      userId: ObjectId,
      role: 'chef_projet' | 'scribe' | 'animateur' | 'chrono' | 'analyste'
    }]
  }],
  phases: [{
    titre: String,
    statut: 'a_faire' | 'en_cours' | 'termine',
    dateDebut, dateFin: Date,
    weight: Number (0-100),                     // pondération dans note finale
    livrableSpec: { type, isRequired, consigne },
    checklist: [{ texte, done, doneBy, doneAt }]
  }],
  livrables: [Livrable],                        // soumissions étudiants
  evaluations: [Evaluation],                    // notes prof
  rubric: [RubricCriterion],                    // grille évaluation transparente
  ideas: [Idea],                                // suggestions prof + étudiants
  activity: [Activity]                          // feed événements
}
```

### 4.2.4 Indexation et performance

Les principales requêtes du système sont accélérées par des **index composés** déclarés au niveau de chaque schéma Mongoose. Quelques exemples notables :

- `Video` : index `{ courseId: 1, order: 1 }` pour récupérer les vidéos d'un cours dans l'ordre.
- `QCM` : `videoId` est unique (un QCM par vidéo).
- `Prosit` : indexes `{ courseId: 1, status: 1 }`, `{ filiere: 1, promotion: 1, status: 1 }`, `{ 'groupes.membres.userId': 1 }`.
- `Progress` : index unique composé `{ userId: 1, courseId: 1 }` (un Progress par couple étudiant/cours).
- `Notification` : indexes `{ userId: 1, read: 1, createdAt: -1 }` (lecture rapide des non-lues triées par date) et `{ dedupKey: 1 }` unique sparse (dédoublonnage des rappels cron).
- `Card` : index `{ deck: 1, frontHash: 1 }` pour la déduplication des cartes auto-générées.

## 4.3 Schéma pédagogique : le Cycle d'Apprentissage Inversé (CAI)

### 4.3.1 Genèse du concept

Le **Cycle d'Apprentissage Inversé (CAI)** constitue la contribution conceptuelle originale du présent travail. Il est né du constat, formulé après plusieurs mois de développement, que FlipLearn rassemblait certes une riche collection de fonctionnalités pédagogiques (vidéos, QCM, Prosits, projets, flashcards, tuteur IA…) mais ne proposait pas de **fil rouge** explicite reliant ces fonctionnalités entre elles.

Cette absence de fil rouge se traduisait par deux phénomènes problématiques observés lors des premières démonstrations utilisateur : (a) côté **étudiant**, l'incompréhension de l'enchaînement attendu (« Je dois faire la vidéo, puis quoi ? Le QCM ? Le Prosit ? Quand ? ») ; (b) côté **professeur**, l'absence d'aide pour structurer un module en s'appuyant sur l'ensemble des outils disponibles (chacun finissant par utiliser deux ou trois fonctionnalités au lieu de l'arsenal complet).

Le CAI a donc été conçu comme une **synthèse opérationnelle** des modèles théoriques mobilisés au chapitre 1 : le modèle classique de la classe inversée (Bergmann & Sams, 2012), enrichi des étapes complémentaires que la littérature plus récente recommande (Bishop & Verleger, 2013 ; Akçayır, 2018) — préparation engageante, présentiel adapté aux blocages réels, application en groupe, production originale, consolidation par révision espacée. C'est la cinquième et dernière étape qui rend le cycle véritablement *cyclique* : la consolidation alimente la mémoire long terme dont les cours suivants tireront profit.

### 4.3.2 Les cinq étapes formalisées

Le CAI articule en cinq étapes obligatoires l'ensemble des activités pédagogiques d'un module d'enseignement :

**Tableau 4.2 — Les cinq étapes du Cycle d'Apprentissage Inversé**

| # | Étape | Lieu | Activités | Composants FlipLearn mobilisés | Pondération engagement |
|:-:|---|---|---|---|:-:|
| **1** | **Préparation** | Domicile | Visionnage vidéos courtes + QCM + (optionnel) Pulse | `Video`, `QCM`, `Pulse` | 30 % |
| **2** | **Rendez-vous** | Présentiel | Activité ciblée par le prof à partir des blocages détectés | `ClassReadiness`, briefing IA | 20 % |
| **3** | **Application** | Groupe (1-2 sem.) | Prosit méthode CESI : Aller → Recherche → Retour | `Prosit` + 5 rôles tournants | 25 % |
| **4** | **Production** | Sur tout le module | Projet original mono / multi / PFE | `Project` + rubric + livrables | 15 % |
| **5** | **Consolidation** | Autonome | Flashcards SM-2 + Tuteur IA | `Deck`, `Card`, `personalTutor` | 10 % |

**Figure 4.3 — Schéma visuel du CAI**

```
        ┌──────────────────────────────────────────────────────────┐
        │                                                          │
        │   1. PRÉPARATION  →  2. RENDEZ-VOUS  →  3. APPLICATION   │
        │   (à la maison)      (en classe)         (Prosit groupe) │
        │        ↓                  ↑                    ↓         │
        │   4. PRODUCTION   ←  5. CONSOLIDATION  ←──────┘          │
        │   (Projet final)     (révisions IA)                      │
        │                                                          │
        └──────────────────────────────────────────────────────────┘

  Légende :
    →  enchaînement séquentiel (verrouillage : étape N doit être commencée
       pour débloquer N+1)
    ↑  retour réflexif (le présentiel adapte ses contenus aux blocages
       identifiés en préparation)
    ←  consolidation alimente la mémoire long terme exploitée par les
       modules suivants
```

### 4.3.3 Mécanique de verrouillage

Pour donner au CAI son rôle structurant, certaines étapes sont **verrouillées tant que les précédentes ne sont pas avancées**. Cette mécanique reflète la dépendance pédagogique réelle entre les étapes : on ne peut pas appliquer ce qu'on n'a pas vu, on ne peut pas produire un projet original sans avoir pratiqué d'abord en groupe, etc. La mécanique précise est la suivante :

- L'étape 1 (**Préparation**) est toujours **active** : c'est l'amorce du cycle.
- L'étape 2 (**Rendez-vous**) renvoie le statut `'unknown'` tant qu'aucun champ `nextClassDate` n'est renseigné dans `Course` (limite acceptée du modèle actuel, à enrichir post-soutenance).
- L'étape 3 (**Application**) est `'locked'` tant que la Préparation n'est pas `'completed'` (vidéos vues à 80 %+ et QCM réussis à 60 %+).
- L'étape 4 (**Production**) est `'locked'` tant qu'aucun Prosit n'a été terminé (`status` parmi `'evalue'` ou `'archive'`).
- L'étape 5 (**Consolidation**) est `'locked'` tant que la Préparation est `'not-started'` (au moins une vidéo doit avoir été commencée pour que des flashcards aient un sens).

### 4.3.4 Implémentation technique du CAI

Le CAI est implémenté côté backend par un **endpoint d'agrégation** unique : `GET /api/journey/me/:courseId`, exposé via la route `journeyRoutes.js` et géré par le contrôleur `journeyController.js`. Cet endpoint, particulièrement remarquable car il **n'introduit aucune nouvelle collection MongoDB**, calcule en temps réel l'état des cinq étapes pour un étudiant donné sur un cours donné, à partir des données déjà présentes dans les modèles existants (`Video.watchedBy`, `QCM.resultats`, `Prosit.status`, `Project.status`, `Card.nextReview`).

Le payload renvoyé est de la forme :

```json
{
  "course": { "_id": "...", "titre": "Cybersécurité", "filiere": "ISIL", "promotion": "L3" },
  "steps": {
    "preparation":   { "status": "completed",   "details": { ... } },
    "rendezvous":    { "status": "unknown",     "nextClassDate": null },
    "application":   { "status": "in-progress", "details": { ... } },
    "production":    { "status": "locked",      "details": { ... } },
    "consolidation": { "status": "active",      "details": { ... } }
  },
  "cycleProgress": 40
}
```

Côté frontend, ce payload est consommé par deux interfaces principales :
- la page **`/my-journey`** (composant `MyJourney.jsx` + sous-composant `JourneyStepCard.jsx`), qui présente le cycle complet pour chaque cours de l'étudiant ;
- le composant **`CycleDiagram.jsx`** intégré au tableau de bord étudiant, qui visualise les cinq étapes sous forme d'un diagramme animé avec dropdown de sélection du cours.

## 4.4 Diagrammes UML

### 4.4.1 Diagramme de cas d'utilisation simplifié

**Figure 4.4 — Cas d'utilisation principaux par acteur**

```
                            ┌──────────────────┐
                            │   FlipLearn      │
                            └──────────────────┘

  ┌─────────────┐                                       ┌─────────────┐
  │             │                                       │             │
  │  ÉTUDIANT   │                                       │  PROFESSEUR │
  │             │                                       │             │
  └─────────────┘                                       └─────────────┘
        │                                                     │
        │── Consulter Mon Parcours (CAI)                      │── Créer cours
        │── Visionner vidéos                                  │── Uploader vidéo
        │── Passer QCM                                        │── Lancer Auto-prep IA
        │── Créer/réviser flashcards (SM-2)                   │── Créer QCM (manuel ou IA)
        │── Participer Prosit (rôle CESI)                     │── Créer Prosit
        │── Soumettre livrable Projet                         │── Évaluer Prosit/Projet
        │── Évaluer pairs (peer assessment)                   │── Consulter Préparation classe
        │── Dialoguer Tuteur IA                               │── Envoyer rappels groupés
        │── Quiz Battle multijoueur                           │── Consulter Insights IA
        │── Échanger XP contre récompense                     │── Communiquer chat
        │── Communiquer chat                                  │
        │                                                     │
        │                                                     │
        │            ┌────────────────────┐                   │
        │            │       ADMIN        │                   │
        │            └────────────────────┘                   │
        │                    │                                │
        │                    │── Approuver/rejeter inscription│
        │                    │── Gérer utilisateurs           │
        │                    │── Gérer cours globalement      │
        │                    │── Modérer chat                 │
        │                    │── Traiter tickets support      │
        │                    │── Approuver récompenses        │
        │                    │── Consulter stats globales     │
```

### 4.4.2 Diagramme de séquence — Cas d'utilisation *Auto-préparation IA*

**Figure 4.5 — Séquence Auto-préparation cours**

```
   Prof          Front          Back            Groq         OpenAI       MongoDB
    │             │              │               │             │             │
    │  Clique     │              │               │             │             │
    │  "Lancer"   │              │               │             │             │
    ├────────────▶│              │               │             │             │
    │             │ POST /auto-prep              │             │             │
    │             ├─────────────▶│               │             │             │
    │             │              │ Vérifie analyse Whispervidéo│             │
    │             │              ├──────────────────────────▶  │             │
    │             │              │                  transcript │             │
    │             │              │◀────────────────────────────             │
    │             │              │                              │             │
    │             │              │ Promise.allSettled([5 appels Groq])       │
    │             │              ├─────────────▶│               │             │
    │             │              │  ─ generateInVideoQuestions  │             │
    │             │              │  ─ generateQCM                │             │
    │             │              │  ─ generateOutcomes           │             │
    │             │              │  ─ generatePrositIdea         │             │
    │             │              │  ─ generateFlashcards         │             │
    │             │              │              5 résultats     │             │
    │             │              │◀─────────────│               │             │
    │             │              │                                            │
    │             │ 200 + draft  │                                            │
    │             │◀─────────────│                                            │
    │  Affiche    │              │                                            │
    │ propositions│              │                                            │
    │◀────────────│              │                                            │
    │             │              │                                            │
    │  Coche      │              │                                            │
    │  les bonnes │              │                                            │
    ├────────────▶│              │                                            │
    │             │ POST /publish│                                            │
    │             ├─────────────▶│ Création atomique entités                  │
    │             │              ├──────────────────────────────────────────▶│
    │             │              │  ─ insert QCM                              │
    │             │              │  ─ insert VideoQuestion[]                  │
    │             │              │  ─ update Course.learningOutcomes          │
    │             │              │  ─ insert Prosit (draft)                   │
    │             │              │  ─ insert Deck + Cards                     │
    │             │              │◀──────────────────────────────────────────│
    │             │ 200          │                                            │
    │             │◀─────────────│                                            │
    │  "Publié"   │              │                                            │
    │◀────────────│              │                                            │
```

### 4.4.3 Diagramme de classes — Domaine *Apprentissage par problème*

**Figure 4.6 — Classes du domaine Prosit**

```
   ┌─────────────────────────┐
   │       Prosit            │
   ├─────────────────────────┤
   │ - titre: String         │
   │ - enonce: String        │
   │ - filiere: enum         │
   │ - promotion: enum       │
   │ - status: enum (6)      │
   │ - dateAller, Retour     │
   │ - peerAssessmentEnabled │
   ├─────────────────────────┤
   │ + getMyGroup(userId)    │
   │ + computeFinalGrade()   │
   └─────────────────────────┘
              │ 1
              │ contient
              │ *
   ┌─────────────────────────┐         ┌─────────────────────────┐
   │       Groupe            │         │       Membre            │
   ├─────────────────────────┤         ├─────────────────────────┤
   │ - nom: String           │ contient│ - userId: ObjectId      │
   │ - membres[]             ├─────1..*│ - role: enum CESI       │
   ├─────────────────────────┤         │ - contributions[]       │
   │ + addMembre(userId)     │         ├─────────────────────────┤
   │ + assignRoles()         │         │ + addContribution(text) │
   └─────────────────────────┘         └─────────────────────────┘
              │
              │ contient *
              ▼
   ┌─────────────────────────┐         ┌─────────────────────────┐
   │   PeerAssessment        │         │   SelfAssessment        │
   ├─────────────────────────┤         ├─────────────────────────┤
   │ - evaluatorId           │         │ - userId                │
   │ - targetId              │         │ - criteria { 3 }        │
   │ - criteria { 5 }        │         │ - reflection: String    │
   │ - comment               │         │ - completedAt           │
   │ - isAnonymous: bool     │         └─────────────────────────┘
   └─────────────────────────┘
```

## 4.5 Design des interfaces utilisateur

### 4.5.1 Système de design (design system)

FlipLearn s'appuie sur un **design system** modeste mais cohérent, défini par des variables CSS centralisées dans `frontend/src/index.css`. Les principes directeurs sont :

- **Hiérarchie visuelle claire** : titres en `Plus Jakarta Sans` 700 ou 800, corps en `Plus Jakarta Sans` 400 ou 500, méta-informations en taille réduite et couleur grisée.
- **Palette restreinte** : trois couleurs principales (`#1B4F72` bleu primaire EM Alger, `#7C3AED` violet IA, `#D97706` orange Algérie) complétées par les statuts standard (vert succès, rouge erreur, jaune avertissement).
- **Espacements basés sur une grille de 4 px** : `--space-1: 4px`, `--space-2: 8px`, etc., pour garantir la cohérence verticale.
- **Rayons unifiés** : `--radius-sm: 6px`, `--radius-md: 10px`, `--radius-lg: 14px`.
- **Ombrage subtil** : `--shadow-sm`, `--shadow-md`, `--shadow-lg` pour la profondeur sans excès.

### 4.5.2 Anatomie de l'interface — sidebar adaptive par rôle

L'interface utilisateur post-authentification est structurée par un **layout commun** (composant `Layout.jsx`) qui combine :

1. Une **sidebar gauche** (largeur 260 px en mode étendu, 64 px en mode replié), avec contenu adapté au rôle de l'utilisateur connecté.
2. Une **topbar** (hauteur 64 px) avec menu burger mobile, titre de la page courante, cloche de notifications, badge de rôle, avatar utilisateur.
3. Une **zone de contenu** centrale qui héberge la page courante.
4. Une **bulle flottante** (composant `TutorBubble.jsx`) en bas à droite, accessible aux étudiants pour invoquer le tuteur IA depuis n'importe quelle page.

La sidebar étudiant est organisée en **quatre sections** : *Apprentissage* (Mon Parcours, Tableau de bord, Mes cours, Mon tuteur IA, Ressources, Mes decks, Projets), *Apprentissage par Problème* (Prosits, Méthode Prosit), *Communauté* (Classement, Quiz Battle, Récompenses, Messages), *Mon espace* (Mon profil, Aide & Support).

La sidebar professeur partage la même architecture avec **cinq sections** : *Mon enseignement* (Tableau de bord, Préparation classe, Suivi étudiants, Mes cours, Ressources, Projets), *Apprentissage par Problème* (Prosits, Méthode Prosit), *Création* (Gérer QCM, Gérer badges), *Communication* (Messages), *Mon espace*.

La sidebar admin est volontairement plus minimaliste : *Administration* (Tableau de bord, Utilisateurs, Cours, Support) et *Communication* (Messages).

### 4.5.3 Patterns d'interface réutilisés

Plusieurs patterns d'interface sont systématiquement réutilisés à travers l'application pour garantir l'apprenabilité :

- **Les cartes** (`card`) avec ombrage léger et coins arrondis comme conteneur principal des informations.
- **Les badges colorés** pour les statuts (`badge-primary`, `badge-success`, `badge-warning`, `badge-error`) et les filières (`ISIL`, `Management`, `Finance`).
- **Les boutons typés** (`btn btn-primary`, `btn btn-ghost`, `btn btn-sm`) déclinés en trois tailles et trois styles.
- **Les empty states** pour les listes vides, accompagnés systématiquement d'une icône représentative et d'un message d'action.
- **Les skeletons de chargement** plutôt que des spinners brutaux, animés via une animation CSS de *shimmer*.
- **Les toasts de feedback** (composant `ToastContext`) pour les actions réussies ou échouées, avec auto-dismiss après 5 secondes.

### 4.5.4 Responsive design

L'ensemble des pages est **responsive**, avec des breakpoints standardisés à 640 px (mobile), 768 px (tablette), 1024 px et 1280 px (desktop). Les principales adaptations mobiles sont :

- La **sidebar gauche** se replie automatiquement en mode hamburger overlay.
- Les **grilles** passent en colonne unique via `grid-template-columns: 1fr` sur petit écran.
- Les **tableaux denses** (par exemple le suivi de visionnage par vidéo dans le dashboard prof) deviennent **scrollables horizontalement** plutôt que de tronquer l'information.
- Les **cards de Mon Parcours** s'empilent verticalement les unes sous les autres au lieu d'être affichées en grille.

---

> *Note de fin de chapitre.* Le chapitre 4 a présenté la conception technique et pédagogique de FlipLearn. Le chapitre 5 va maintenant illustrer les résultats effectivement obtenus, à travers les principales interfaces utilisateur des trois rôles et un workflow type complet.
