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

La couche présentation est une **Single Page Application (SPA)** React 18, compilée par Vite et servie en production par le serveur Express dans un déploiement monolithique unifié (Express délivre les fichiers statiques de `frontend/dist/` sur la racine `/` et expose simultanément les routes API sur `/api/*` à la même origine). Elle communique avec la couche métier via deux canaux complémentaires :

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
    checklist: [{ texte, done, doneBy, doneAt }],
    // Refonte 2026-05 — articulation Cas Pratique ↔ Projet (cf. § 4.3.5)
    unlockRules: {
      chapterIds: [ObjectId (ref Chapter)],     // chapitres requis pour débloquer
      casPratiqueIds: [ObjectId (ref Prosit)],  // cas pratiques requis (statut evalue + note)
      requiresAllChapters: Boolean (default true),       // tous OU au moins un
      requiresAllCasPratiques: Boolean (default true)
    },
    sourceCasPratiqueId: ObjectId (ref Prosit), // pour le bouton "Importer livrable"
    studentProgress: [{
      studentId: ObjectId (ref User),
      status: 'locked' | 'unlocked' | 'in-progress' | 'submitted' | 'validated',
      submission: String,                        // texte du livrable étudiant
      fichierUrl: String,                        // URL fichier joint (optionnel)
      importedFromCasPratiqueId: ObjectId,       // traçabilité de l'import livrable
      submittedAt, validatedAt: Date,
      feedback: String                           // retour prof à validation
    }]
  }],
  livrables: [Livrable],                        // soumissions étudiants (canal legacy global)
  evaluations: [Evaluation],                    // notes prof
  rubric: [RubricCriterion],                    // grille évaluation transparente
  ideas: [Idea],                                // suggestions prof + étudiants
  activity: [Activity],                         // feed événements
  linkedCasPratiqueId: ObjectId (ref Prosit)    // lien CAI étape 3 → étape 4 (cf. § 4.3.5)
}
```

Les sous-documents `unlockRules`, `sourceCasPratiqueId` et `studentProgress` sont des **ajouts rétrocompatibles** introduits lors de la refonte de mai 2026 : un projet créé sans ces champs continue de fonctionner (statut par défaut `unlocked` pour toute phase sans règles déclarées). Cette extension par sous-document, plutôt que par création d'une nouvelle collection, respecte la philosophie *embedding-first* de MongoDB lorsque la cardinalité est bornée et la cohérence locale — toutes les phases d'un projet sont consultées ensemble (Banker, 2016, *MongoDB in Action*).

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

### 4.3.5 Articulation fine entre l'étape 3 (Application) et l'étape 4 (Production)

Le verrouillage *macro* présenté en § 4.3.3 fonctionne au grain du cours : l'étape 4 est verrouillée tant qu'aucun Prosit du cours n'est terminé. Ce grain s'est révélé insuffisant à l'usage, car un projet de fin de module se compose de plusieurs phases dont chacune mobilise des concepts précis du cours et peut tirer parti d'un cas pratique antérieur précis. La refonte de mai 2026 a donc introduit un second niveau de verrouillage, *micro*, agissant **par phase** plutôt que par étape, et **par étudiant** plutôt que pour la cohorte.

**a) Modèle de règles déclaratives.** Chaque phase d'un Projet peut déclarer un sous-document `unlockRules` (cf. § 4.2.3) listant les chapitres et les cas pratiques requis pour débloquer la phase, avec deux drapeaux booléens (`requiresAllChapters`, `requiresAllCasPratiques`) qui distinguent la conjonction stricte (« tous obligatoires ») de la disjonction (« au moins un suffit »). Le paramétrage par défaut est `true/true`, conformément au principe pédagogique de progression cumulative ; l'option permissive est offerte pour les cas où plusieurs cas pratiques préparent à un même type de production (l'étudiant a alors le choix de l'étude de cas qu'il prolonge).

**b) Critère composite de complétion d'un chapitre.** La complétion d'un chapitre, condition centrale du déblocage, n'est pas réduite à un simple ratio de capsules vues. Le service `progressService.isChapterCompletedByUser(userId, chapterId)` croise deux indicateurs : (i) **% capsules complétées** (au sens `Video.watchedBy.completed === true`, c'est-à-dire visionnage à 80 % au moins) qui doit dépasser le seuil paramétrable `Chapter.completionThreshold` (par défaut 80 %) ; (ii) **% QCM-vidéo passés** (au sens `score ≥ 60 %`) qui doit dépasser 80 % des QCM rattachés aux capsules du chapitre. Ce critère composite, plus exigeant qu'un simple visionnage, traduit l'idée que la *préparation* d'une étape suivante demande non seulement d'avoir vu mais aussi d'avoir *compris* (vérification formative immédiate, Black & Wiliam, 1998). Le fallback est cependant explicite : si un chapitre ne dispose d'aucun QCM-vidéo, le critère se replie sur le seul taux de visionnage, évitant de bloquer l'étudiant pour un manque que ne lui est pas imputable.

**c) Critère d'évaluation d'un cas pratique.** L'évaluation d'un cas pratique pour un étudiant donné, condition complémentaire, est définie par trois conjonctions : (i) le cas pratique est en statut `evalue` ; (ii) l'étudiant a soumis un livrable individuel (présent dans `Prosit.livrables`) ; (iii) l'étudiant a reçu une note du professeur (présente dans `Prosit.notes`). Cette triple conjonction garantit que le déblocage matérialise un *travail effectivement réalisé et reconnu*, et non une simple appartenance passive au groupe.

**d) Service d'orchestration.** Le service `projectMilestoneService.computePhaseStatus(projectId, studentId)` lit le projet, vérifie que l'étudiant est inscrit dans un groupe, puis pour chaque phase évalue les règles via les deux fonctions précédentes et résout le statut résultant. Une règle d'**immutabilité des statuts terminaux** (`submitted`, `validated`) garantit qu'un travail soumis ou validé ne peut être rétrogradé par un changement ultérieur des prérequis. Les statuts intermédiaires (`unlocked`, `in-progress`) sont en revanche recalculables, à condition que l'étudiant ait effectivement commencé pour conserver `in-progress` (sinon il rebascule à `unlocked`).

**e) Trigger après évaluation.** Lorsque le professeur soumet l'évaluation d'un cas pratique (`POST /api/cas-pratiques/:id/evaluate`), un trigger asynchrone non-bloquant appelle `recomputePhasesForStudentOnCourse(studentId, courseId)` pour chaque étudiant noté. Cette tâche en arrière-plan met à jour les statuts de phases dans tous les projets actifs du cours concerné, sans pénaliser le temps de réponse de la requête principale ni faire échouer l'évaluation en cas d'erreur de recalcul.

**f) Réutilisation du livrable précédent.** Lorsqu'une phase déclare un cas pratique source (`sourceCasPratiqueId`), un endpoint dédié `POST /api/projects/:id/phases/:phaseId/import-livrable` permet à l'étudiant éligible de copier le contenu de son livrable du cas pratique dans la zone de soumission de la phase, et trace la provenance via le champ `studentProgress.importedFromCasPratiqueId`. Cette traçabilité sert deux finalités : (i) l'étudiant identifie sans ambiguïté ce qu'il enrichit (un bandeau jaune *« Livrable importé depuis l'étude de cas X »* surmonte le formulaire) ; (ii) le professeur peut, à la lecture du livrable final, mesurer l'apport propre à l'étudiant par delà la base réutilisée — cohérent avec la démarche d'**alignement constructif** de Biggs (1996), qui préconise de rendre visibles les apprentissages successifs plutôt que de les fragmenter en silos déconnectés.

**g) Bénéfice pédagogique mesurable.** Cette mécanique évite à l'étudiant l'effet *page blanche* dans les phases finales d'un module (Lebrun, 2007, sur la *scénarisation pédagogique*), tout en préservant le contrôle du professeur (rien n'est imposé : l'option *Repartir de zéro* est toujours disponible). Elle rend en outre visible, dans les interfaces, la **continuité du parcours** : l'étudiant constate que ce qu'il a investi dans un cas pratique n'est pas *consommé* à l'évaluation mais *capitalisé* pour la suite, ce qui répond directement à la critique fréquente de la fragmentation des dispositifs en classe inversée (Akçayır, 2018).

## 4.4 Diagrammes UML

> **Note méthodologique.** Les diagrammes des sections § 4.4.1 à § 4.4.6 sont rédigés en **PlantUML** et versionnés dans `docs/diagrammes/*.puml`. La représentation textuelle ASCII conservée ci-dessous (pour lecture immédiate) est une vue simplifiée — les sources `.puml` produisent un rendu PNG/SVG académique avec packages colorés, couleurs distinctes par participant dans les séquences, et notes contextuelles. La génération s'effectue via `plantuml -tpng docs/diagrammes/*.puml` ou un service en ligne (cf. `docs/diagrammes/README.md`).

### 4.4.1 Diagramme de cas d'utilisation simplifié

> Source PlantUML : [`docs/diagrammes/01-cas-utilisation.puml`](../diagrammes/01-cas-utilisation.puml)

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

> Source PlantUML : [`docs/diagrammes/04-sequence-autoprep-ia.puml`](../diagrammes/04-sequence-autoprep-ia.puml)

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

> Source PlantUML : [`docs/diagrammes/02-classes-prosit.puml`](../diagrammes/02-classes-prosit.puml)

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

### 4.4.4 Diagramme de classes — Domaine *Apprentissage par projet (refonte 2026-05)*

> Source PlantUML : [`docs/diagrammes/03-classes-project-articulation.puml`](../diagrammes/03-classes-project-articulation.puml)

**Figure 4.7 — Classes du domaine Project enrichi (articulation CAI 3 → 4)**

Le diagramme ci-dessous précise les sous-documents introduits par la refonte de mai 2026 (cf. § 4.2.3 et § 4.3.5) qui matérialisent l'articulation entre le cas pratique et le projet final.

```
   ┌───────────────────────────────────┐
   │            Project                │
   ├───────────────────────────────────┤
   │ - titre, description, type        │
   │ - courseId, modules[]             │
   │ - createdBy, status               │
   │ - dateDebut, dateFin, dateSout    │
   │ - linkedCasPratiqueId  ─────────────────────► Prosit
   ├───────────────────────────────────┤            (lien CAI étape 3 → 4)
   │ + addPhase()                      │
   │ + computeProjectGrade()           │
   └───────────────────────────────────┘
                  │ 1
                  │ contient
                  │ *
                  ▼
   ┌───────────────────────────────────┐
   │             Phase                 │
   ├───────────────────────────────────┤
   │ - titre, description              │
   │ - statut: a_faire|en_cours|term.  │
   │ - dateDebut, dateFin, weight      │
   │ - livrableSpec                    │
   │ - sourceCasPratiqueId  ─────────────────────► Prosit
   │ - checklist[]                     │            (cas pratique source pour
   │ - unlockRules    ─┐               │             import livrable)
   │ - studentProgress[] ─┐            │
   ├───────────────────│──│────────────┤
   │ + isUnlockedFor(  │  │            │
   │       studentId)  │  │            │
   └───────────────────│──│────────────┘
                       │  │
       ┌───────────────┘  └──────────────────┐
       │ 1                                    │ * (1 par étudiant inscrit)
       ▼                                      ▼
┌──────────────────────────┐    ┌───────────────────────────────────┐
│      UnlockRules         │    │      StudentProgress              │
├──────────────────────────┤    ├───────────────────────────────────┤
│ - chapterIds[] ──► Chap. │    │ - studentId  ─────────────────► User
│ - casPratiqueIds[] ─► Pr.│    │ - status: locked | unlocked |     │
│ - requiresAllChapters    │    │            in-progress |           │
│ - requiresAllCasPrat.    │    │            submitted | validated  │
└──────────────────────────┘    │ - submission: String              │
                                │ - fichierUrl: String              │
                                │ - importedFromCasPratiqueId ──► Prosit
                                │ - submittedAt, validatedAt        │
                                │ - feedback: String                │
                                └───────────────────────────────────┘
```

**Lecture du diagramme.** Une `Phase` est un sous-document de `Project`, embarquant à la fois la définition pédagogique (titre, deadlines, poids dans la note) et la dimension *individuelle* via `studentProgress[]` — un sous-document distinct par étudiant inscrit dans un groupe du projet. Cette double couche traduit le besoin EF-PROJECT-9 (matrice de progression) sans dénormaliser : la lecture d'un projet rapatrie en une seule requête toutes les informations nécessaires à la matrice. La cardinalité `*` de `studentProgress` est bornée par le nombre d'étudiants effectivement inscrits dans les groupes (typiquement 5-25 par projet) ; ce volume reste largement compatible avec la limite des 16 Mo par document MongoDB.

Le sous-document `unlockRules` est *singleton* sur la phase (toutes les règles s'appliquent à toutes les soumissions de la phase) ; à l'inverse, `studentProgress` est *multi-occurrences* (un statut par étudiant). Cette asymétrie reflète la différence entre la *définition* du parcours (commune au groupe) et son *parcours effectif* (individuel).

### 4.4.5 Diagramme de séquence — Cas d'utilisation *Importer le livrable d'un cas pratique*

> Source PlantUML : [`docs/diagrammes/05-sequence-import-livrable.puml`](../diagrammes/05-sequence-import-livrable.puml)

**Figure 4.8 — Séquence Import livrable cas pratique → phase de projet**

```
  Étudiant     Front          Back              progressService     Project DB    Prosit DB
     │           │              │                      │                 │            │
     │ Click     │              │                      │                 │            │
     │ "Importer"│              │                      │                 │            │
     ├──────────►│              │                      │                 │            │
     │           │ POST /api/projects/:id/             │                 │            │
     │           │   phases/:phaseId/import-livrable   │                 │            │
     │           ├─────────────►│                      │                 │            │
     │           │              │ findById(projectId)  │                 │            │
     │           │              ├──────────────────────────────────────►│            │
     │           │              │  ◄────────── project (avec phases)    │            │
     │           │              │                      │                 │            │
     │           │              │ vérifie inscription  │                 │            │
     │           │              │ (studentId ∈         │                 │            │
     │           │              │  groupes[].membres)  │                 │            │
     │           │              │                      │                 │            │
     │           │              │ vérifie phase.       │                 │            │
     │           │              │ sourceCasPratiqueId  │                 │            │
     │           │              │ existe               │                 │            │
     │           │              │                      │                 │            │
     │           │              │ isCasPratiqueEvaluatedForUser(         │            │
     │           │              │   studentId, sourceId)                 │            │
     │           │              ├─────────────────────►│                 │            │
     │           │              │                      │ findById(sourceId)           │
     │           │              │                      ├────────────────────────────►│
     │           │              │                      │ ◄── prosit (statut, livr., notes)
     │           │              │                      │                 │            │
     │           │              │                      │ check 3 conds : │            │
     │           │              │                      │  statut=evalue, │            │
     │           │              │                      │  livrable[my],  │            │
     │           │              │                      │  notes[my]      │            │
     │           │              │ ◄────── boolean true │                 │            │
     │           │              │                      │                 │            │
     │           │              │ findById(sourceId).livrables           │            │
     │           │              │   .find(l.studentId === my)            │            │
     │           │              ├──────────────────────────────────────────────────►│
     │           │              │ ◄────── livrable { contenu, fichierUrl }           │
     │           │              │                      │                 │            │
     │           │              │ phase.studentProgress[my].submission   │            │
     │           │              │   = livrable.contenu                   │            │
     │           │              │ phase.studentProgress[my].importedFrom │            │
     │           │              │   = sourceCasPratiqueId                │            │
     │           │              │ phase.studentProgress[my].status       │            │
     │           │              │   = 'in-progress'                      │            │
     │           │              │                      │                 │            │
     │           │              │ project.markModified('phases')         │            │
     │           │              │ project.save()       │                 │            │
     │           │              ├──────────────────────────────────────►│            │
     │           │              │                      │                 │            │
     │           │ 200 + payload│                      │                 │            │
     │           │ phase mise à │                      │                 │            │
     │           │ jour pour my │                      │                 │            │
     │           │◄─────────────│                      │                 │            │
     │ Affiche   │              │                      │                 │            │
     │ formulaire│              │                      │                 │            │
     │ pré-rempli│              │                      │                 │            │
     │ + badge   │              │                      │                 │            │
     │ "Importé" │              │                      │                 │            │
     │◄──────────│              │                      │                 │            │
     │           │              │                      │                 │            │
```

**Lecture du diagramme.** Le contrôleur `importPhaseLivrable` orchestre cinq vérifications successives — projet existant, phase existante, étudiant inscrit, cas pratique source déclaré, cas pratique évalué pour cet étudiant — avant la copie effective du contenu. Cette défense en profondeur (Saltzer & Schroeder, 1975, *defense in depth*) garantit qu'aucun étudiant ne peut récupérer le livrable d'un autre, même en construisant manuellement une requête HTTP. L'écriture finale en base est *idempotente* : un import déjà effectué, puis ré-effectué, écrasera la `submission` mais restera cohérent (seule l'horodatage `submittedAt` reste à `null` tant que la phase n'est pas réellement soumise).

### 4.4.6 Diagramme de déploiement

> Source PlantUML : [`docs/diagrammes/06-deploiement.puml`](../diagrammes/06-deploiement.puml)

**Figure 4.9 — Architecture de déploiement monolithique sur Render**

Le diagramme de déploiement formalise la topologie physique de l'application en production. FlipLearn adopte une architecture **monolithique** : un unique service Node.js (Express + Socket.io) hébergé sur Render Cloud sert à la fois la *Single Page Application* React (en static, depuis `frontend/dist/`) et l'API REST (`/api/*`), sur la même origine HTTPS. Cette unification simplifie le déploiement, élimine les problèmes de CORS cross-origin et réduit le coût opérationnel à un seul service free tier.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ☁️ Navigateur étudiant/professeur                                        │
│  ┌─────────────────────────────────────────────────────────┐              │
│  │  React 18 SPA (Vite build)                              │              │
│  │  - frontend/dist/index.html  +  /assets/*.js, *.css     │              │
│  │  - Socket.io-client (WebSocket)                         │              │
│  └─────────────────────────────────────────────────────────┘              │
└──────────────────┬─────────────────────┬──────────────────┬───────────────┘
                   │ HTTPS GET /         │ /api/*           │ WSS Socket.io
                   │ (HTML+JS+CSS)       │ (REST + JWT)     │ (token JWT)
                   ▼                     ▼                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   🟢 RENDER (Cloud, free tier, datacenter Frankfurt)                     │
│   ┌────────────────────────────────────────────────────────────┐         │
│   │  📦 Service "fliplearn-api" — Node.js 20.x port 10000        │         │
│   │                                                            │         │
│   │  🌐 Express 4                                              │         │
│   │   ├── Static middleware → frontend/dist/                   │         │
│   │   ├── Routes /api/* (35 routers)                           │         │
│   │   └── Socket.io 4 (chat, battle, notifications)            │         │
│   │                                                            │         │
│   │  ⚙️ Services métier (15+ fichiers)                          │         │
│   │   ├── progressService + projectMilestoneService            │         │
│   │   ├── courseAutoPrep (5 appels Groq parallèles)            │         │
│   │   ├── videoAnalyzer (Whisper + GPT-4o)                     │         │
│   │   ├── notificationScheduler (4 crons)                      │         │
│   │   └── emailService (cascade Brevo > Resend > Gmail)        │         │
│   │                                                            │         │
│   │  🔐 11 env vars (MONGODB_URI, JWT_SECRET, GROQ_API_KEY...)  │         │
│   │  📋 render.yaml (blueprint)                                 │         │
│   └────────────────────────────────────────────────────────────┘         │
│                                                                          │
└─────┬─────────────┬──────────────┬──────────────┬─────────────┬──────────┘
      │             │              │              │             │
      ▼             ▼              ▼              ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐
│ MongoDB  │  │Cloudinary│  │   Groq   │  │  OpenAI  │  │ Email cascade│
│ Atlas M0 │  │ (médias) │  │Llama 3.3 │  │ Whisper  │  │ Brevo →      │
│Frankfurt │  │ 100MB max│  │~1500tok/s│  │+ GPT-4o  │  │ Resend →     │
│ 32 colls │  │ par fich.│  │ free tier│  │payant lim│  │ Gmail SMTP   │
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └─────────────┘

   ▲ GitHub                                    ▲ YouTube (iframe)
   │  push main → auto-deploy Render            │ tracking via IFrame API
   │  (npm install + build + restart)           │ (POST /api/videos/:id/progress)
   │                                            │
   └────────────────── Browser ─────────────────┘
```

**Lecture du diagramme.** Le déploiement repose sur **un seul service Render** comme nœud central, encadré par six services externes spécialisés :
- **MongoDB Atlas M0** (free tier, 512 Mo, cluster 3 nœuds) pour la persistance des 32 collections.
- **Cloudinary** pour le stockage des vidéos et fichiers uploadés (limite 100 Mo par fichier en free tier, encodage automatique).
- **Groq Cloud** (free tier, modèle Llama-3.3-70B-versatile) pour les agents conversationnels et les appels parallèles d'auto-préparation IA.
- **OpenAI** (Whisper + GPT-4o) pour la transcription audio et l'analyse multimodale des vidéos.
- **Email providers** (Brevo en primaire, Resend en repli, Gmail SMTP en dernier recours) pour les notifications transactionnelles, avec cascade implémentée dans `emailService.js`.
- **YouTube** (IFrame Player API) consulté directement par le navigateur pour les capsules embarquées (le serveur Render n'intermédie pas la lecture).

Le pipeline CI/CD est élémentaire : un `git push` sur la branche `main` du dépôt GitHub déclenche automatiquement, sur Render, un re-build (`npm install` puis `node server.js`) avec migration *blue-green* (le service précédent reste actif jusqu'à ce que le nouveau ait passé le `healthCheckPath` `/`). Aucun pipeline GitHub Actions n'est requis pour le déploiement applicatif lui-même — la simplicité étant ici un choix assumé compatible avec les ressources d'un projet étudiant.

**Particularités du free tier Render documentées :**
- *Sleep* automatique du service après 15 minutes d'inactivité, avec un *cold start* de 30 à 60 secondes au prochain accès. Acceptable en démo (préchauffage 1-2 min avant la soutenance) mais inadapté à un usage en production réelle qui nécessiterait un upgrade Starter ($7/mois) ou un pinger UptimeRobot toutes les 5 minutes (cf. *technical-decisions.md*, ADR-009).
- 512 Mo de RAM, 0,1 vCPU partagé : suffisant pour un usage de démonstration (< 50 connexions simultanées) mais limitatif pour un déploiement à l'échelle d'une promotion entière.
- Disque éphémère : tout l'état persistant transite obligatoirement par MongoDB Atlas ou Cloudinary, ce qui correspond aux bonnes pratiques *cloud-native* (stateless services) sans effort supplémentaire de conception.

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
