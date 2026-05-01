# Chapitre 2 — Technologies appliquées

Le présent chapitre détaille la stack technique mobilisée pour la conception et la réalisation de FlipLearn. Cinq grandes familles de technologies y sont successivement présentées : les outils de développement (§ 2.1), le front-end (§ 2.2), le back-end (§ 2.3), la base de données (§ 2.4), les agents d'intelligence artificielle (§ 2.5), et enfin l'infrastructure d'hébergement et de déploiement (§ 2.6). Une synthèse récapitulative en § 2.7 dresse le tableau complet de la stack et justifie les choix opérés.

## 2.1 Outils de développement

### 2.1.1 Système de contrôle de version : Git

L'ensemble du code source est versionné avec **Git** (version 2.x), avec un dépôt distant hébergé sur **GitHub** à l'adresse `github.com/smohamedassil-netizen/flipleran` (la coquille typographique du nom de dépôt étant intentionnelle, conservée pour ne pas casser les références existantes). Le projet compte à la date de soutenance plus de **150 commits** organisés en plusieurs branches : `main` (branche de référence déployée en production), `mvp-soutenance` (variante simplifiée pour la démonstration finale), et une dizaine de branches de fonctionnalité (`sprint-final`, `sprint-pedagogy/p2-p7`, `claude/rebuild-classroom-app-kdwDv`, etc.) issues du développement en sprints successifs.

La discipline de commit suit le standard **Conventional Commits** : préfixes typés (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `polish:`) suivis d'une description impérative concise. Cette convention permet, *a posteriori*, de générer automatiquement un changelog structuré et facilite la lecture du journal Git pour quiconque reprendrait le projet.

### 2.1.2 Éditeur de code : Visual Studio Code

L'environnement de développement principal est **Visual Studio Code** (Microsoft), enrichi des extensions habituelles de l'écosystème JavaScript moderne : **ESLint** (linting JavaScript/JSX), **Prettier** (formatage automatique), **Mongoose Snippets** (autocomplétion ODM), **Mermaid Markdown** (prévisualisation des diagrammes intégrés à la documentation), **GitLens** (annotations Git inline).

### 2.1.3 Assistant IA développeur : Claude Code

Une mention particulière doit être faite de **Claude Code**, l'interface CLI d'Anthropic intégrée au terminal de développement. Cet outil, mobilisé tout au long du projet, a accompagné le développement non comme un substitut au travail de l'étudiant mais comme un partenaire de revue : aide à la conception architecturale, suggestions de refactoring, génération assistée de tests, et surtout production accélérée de la documentation technique. La traçabilité de cette collaboration humain-IA est explicitement assumée par les marqueurs `Co-Authored-By: Claude Opus 4.7` figurant dans une partie significative des commits — choix méthodologique qui s'inscrit dans la dynamique contemporaine d'usage transparent des assistants IA en ingénierie logicielle (Bird et al., 2023, *Taking Flight with Copilot*, ACM Queue).

### 2.1.4 Gestionnaire de paquets : npm

Le gestionnaire de paquets utilisé est **npm**, livré nativement avec Node.js. La structure du projet est un **monorepo** simplifié : un dossier racine `fliplearn/` contenant deux sous-projets autonomes (`frontend/` et `backend/`), chacun avec son propre `package.json`. Cette organisation permet un déploiement unifié (le backend sert les fichiers statiques du frontend en production) tout en gardant deux pipelines de dépendances découplés.

## 2.2 Front-end

### 2.2.1 Framework : React 18

Le front-end est construit avec **React 18.x**, le framework de composants déclaratifs de Meta. Le choix de React s'explique par trois facteurs convergents : (a) la maturité de l'écosystème (richesse en bibliothèques de composants, documentation foisonnante, communauté massive), (b) la familiarité du développeur (formé à React au cours de la deuxième année de Licence ISIL via le module *Développement Web Avancé*), (c) la disponibilité de modèles de référence pour les fonctionnalités complexes (chat temps réel, lecteur vidéo personnalisé, drag-and-drop) qui auraient été plus longues à reproduire ex nihilo dans un framework moins établi.

L'architecture front-end repose sur les patterns canoniques de React 18 : **composants fonctionnels** (l'usage des classes a été proscrit), **hooks** standards (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`) et **hooks personnalisés** pour la logique métier réutilisable (`useDecks`, `useChat`, `useVideoProgress`). La gestion d'état globale est assurée par cinq **contextes React** spécialisés (`AuthContext`, `GamificationContext`, `NotificationContext`, `ToastContext`, `ThemeContext`), évitant le recours à une bibliothèque de gestion d'état externe (type Redux ou Zustand) qui aurait été disproportionnée pour la taille du projet.

### 2.2.2 Outil de build : Vite

L'outil de build retenu est **Vite 5.x**, qui a remplacé le traditionnel **Create React App** (désormais déprécié par l'équipe React) comme standard de fait de l'écosystème. Vite combine deux atouts décisifs : un **temps de démarrage du serveur de développement quasi instantané** (de l'ordre de la seconde, contre 15-30 secondes pour CRA en fin de vie), et un **système de Hot Module Replacement (HMR)** très fiable qui permet de voir les modifications de code reflétées dans le navigateur sans perdre l'état de l'application. La configuration `vite.config.js` du projet assure également le **proxy automatique** des requêtes `/api/*` vers le serveur back-end en environnement de développement.

### 2.2.3 Routage : React Router DOM v6

La navigation entre les pages est gérée par **React Router DOM v6.x**, qui propose un modèle de routage déclaratif basé sur le composant `<Routes>`. L'application FlipLearn comporte **environ 50 routes distinctes**, organisées en quatre familles selon les permissions requises : routes publiques (`/welcome`, `/login`, `/register`), routes communes à tous les rôles authentifiés (`/profile`, `/chat`, `/notifications`), routes étudiant uniquement (`/decks`, `/study/:deckId`, `/quiz-battle`, `/my-journey`), routes professeur et admin (`/professor/dashboard`, `/professor/class-readiness/:courseId`, etc.).

### 2.2.4 Styles : CSS modulaire avec variables CSS et Tailwind CSS

La stratégie de styles combine deux approches complémentaires. D'une part, un **système de variables CSS** centralisé dans `index.css` définit les couleurs, espacements, rayons et typographies de la plateforme — par exemple `--color-primary: #1B4F72` (le bleu historique d'EM Alger), `--radius-md: 10px`, `--font-size-md: 14px`. D'autre part, **Tailwind CSS** (utility-first framework) est mobilisé pour les classes utilitaires courantes (`flex`, `gap-4`, `hidden`). Cette double approche évite à la fois la rigidité d'un design system entièrement custom et la verbosité d'un usage exclusif de Tailwind.

### 2.2.5 Bibliothèques visuelles complémentaires

Trois bibliothèques externes complètent l'arsenal visuel :
- **Lucide React** : un set d'icônes SVG cohérent et léger (450+ icônes utilisées sur l'ensemble de l'application).
- **Recharts 2.12.x** : pour les visualisations de données (graphiques d'inscriptions, AreaChart de progression XP sur 30 jours, etc.).
- **Plus Jakarta Sans** (Google Fonts) : la typographie principale de la plateforme, choisie pour son équilibre entre modernité et lisibilité sur écran.

### 2.2.6 Communication temps réel : Socket.io-client

Pour les fonctionnalités temps réel (chat de cours, chat privé, notifications instantanées, Quiz Battle multijoueurs), le front-end embarque le client **Socket.io 4.x**, qui établit une connexion WebSocket persistante avec le back-end. L'authentification de la connexion socket utilise le même JWT que les appels REST classiques, transmis dans `socket.handshake.auth.token`.

### 2.2.7 Client HTTP : Axios

Les requêtes REST sont émises via **Axios**, encapsulé dans une instance unique configurée dans `frontend/src/utils/api.js`. Cet **intercepteur** centralise trois préoccupations transversales : injection automatique du JWT dans le header `Authorization`, gestion uniforme des erreurs 401 (déconnexion automatique et redirection vers `/login`), et timeout généreux de 5 minutes pour les uploads vidéo de gros fichiers.

## 2.3 Back-end

### 2.3.1 Runtime : Node.js 20.x

Le back-end fonctionne sur **Node.js 20.x LTS** (Long Term Support), version stable et performante pour les applications web temps réel. Le choix de Node.js s'inscrit dans la cohérence du langage (JavaScript de bout en bout, front et back) qui réduit la friction cognitive du développement et facilite le partage de code (par exemple, certaines fonctions utilitaires de validation peuvent être réutilisées des deux côtés).

### 2.3.2 Framework HTTP : Express 4.x

Le serveur HTTP est construit avec **Express**, le framework web minimaliste qui constitue le standard de fait dans l'écosystème Node.js. La structure du projet suit une organisation classique en **routes / contrôleurs / services** :

- Les **routes** (`backend/routes/`, ~30 fichiers) déclarent les endpoints, mappent les middlewares (`authMiddleware`, `requireRole`) et délèguent au contrôleur correspondant.
- Les **contrôleurs** (`backend/controllers/`, ~30 fichiers) implémentent la logique de chaque endpoint : validation des paramètres, appels aux modèles ou services, renvoi du JSON.
- Les **services** (`backend/services/`, ~15 fichiers) encapsulent la logique métier complexe ou réutilisable : par exemple `chatbot.js` (orchestration des appels IA), `pointsService.js` (gestion centralisée des XP), `emailService.js` (envoi d'emails avec fallback Brevo → Resend → Gmail SMTP).

### 2.3.3 Communication temps réel : Socket.io 4.x

Côté serveur, **Socket.io** est attaché au serveur HTTP Express via `createServer(app)`. La gestion des événements temps réel est centralisée dans le fichier `server.js` qui orchestre quatre namespaces principaux : chat de cours (room `course:<courseId>`), chat privé (room `private:<userId>:<otherId>`), notifications globales (room `user:<userId>`), Quiz Battle (rooms `battle:<roomId>`).

### 2.3.4 Authentification : JSON Web Tokens (JWT)

L'authentification est implémentée avec **JSON Web Tokens** via la bibliothèque `jsonwebtoken`. Le flux est classique : l'utilisateur s'authentifie par email/mot de passe sur `POST /api/auth/login`, le serveur vérifie le hash du mot de passe (bcryptjs avec un facteur de 10), génère un JWT signé avec un secret côté serveur (`JWT_SECRET` en variable d'environnement), et le retourne au client. Le client stocke le JWT dans le `sessionStorage` du navigateur (clé `fliplearn_user`) et l'inclut dans toutes les requêtes ultérieures via le header `Authorization: Bearer <token>`. Le middleware `authMiddleware.js` côté serveur intercepte chaque requête protégée pour vérifier la validité du token, attache `req.user = { id, role, filiere, promotion }` et passe la main au contrôleur.

### 2.3.5 Sécurité

Plusieurs couches de sécurité sont activées dès l'initialisation du serveur :

- **Helmet** : injecte un ensemble de headers HTTP de sécurité standard (CSP, X-Frame-Options, X-Content-Type-Options, etc.) ;
- **express-rate-limit** : limite à 100 requêtes par 15 minutes par IP sur les endpoints sensibles (login, register, reset password) ;
- **express-mongo-sanitize** : neutralise les tentatives d'injection NoSQL en filtrant les caractères `$` et `.` des inputs ;
- **hpp (HTTP Parameter Pollution)** : protège contre la pollution des paramètres de requête ;
- **bcryptjs** : hash bcrypt facteur 10 pour les mots de passe en base.

Un **middleware de rôle** (`requireRole`) protège les endpoints réservés à certains rôles (`requireRole('professeur', 'admin')`), renvoyant un 403 Forbidden si l'utilisateur authentifié n'a pas le rôle requis.

## 2.4 Base de données

### 2.4.1 Système de gestion : MongoDB Atlas

La persistance des données est assurée par **MongoDB Atlas**, le service cloud managé de MongoDB Inc., en cluster M0 (formule gratuite à 512 Mo de stockage). Le choix de MongoDB plutôt qu'une base relationnelle (PostgreSQL, MySQL) répond à plusieurs considérations :

1. **Schéma flexible** : les modèles pédagogiques évoluent fréquemment (ajout de champs Bloom à un modèle Course existant, extension de l'enum des rôles Prosit, etc.). Le modèle document permet ces évolutions sans migration de schéma destructrice.

2. **Nature documentaire des données** : un Cours, un Prosit, un Projet sont naturellement des entités composites avec sous-documents (membres, phases, livrables, évaluations). Les modéliser dans une base relationnelle imposerait une dizaine de tables jointes, alourdissant les requêtes courantes.

3. **Cohérence avec la stack** : MongoDB s'intègre nativement à Node.js via l'ODM **Mongoose**, qui produit un code plus expressif que les ORM relationnels équivalents.

4. **Coût** : le cluster M0 gratuit suffit largement aux volumes d'un projet pédagogique (estimation ~17 Mo de données réelles à pleine charge démo).

### 2.4.2 ODM : Mongoose 8.x

L'**Object Document Mapper Mongoose** sert d'interface entre la couche métier Node.js et MongoDB. Chaque entité métier (Cours, Vidéo, QCM, Prosit, Projet, etc.) est définie comme un **schéma Mongoose** typé, validé et indexé. Au total, **vingt-cinq modèles Mongoose** structurent la base de données, regroupés en six domaines thématiques détaillés au chapitre 4 (§ 4.2).

L'utilisation de Mongoose apporte plusieurs garanties que les drivers natifs MongoDB ne fournissent pas : validation automatique des champs au moment de la sauvegarde (`required`, `min`, `max`, `enum`), middleware `pre/post` pour la logique transversale (par exemple le pré-calcul de la deadline d'évaluation par les pairs dans le modèle `Prosit`), méthodes statiques et d'instance, gestion des références (`populate()` pour résoudre les références entre collections).

### 2.4.3 Variables d'environnement

La connexion à MongoDB Atlas se fait via une URI de connexion stockée dans la variable d'environnement `MONGODB_URI`. Trois variables d'environnement supplémentaires structurent la configuration sensible : `JWT_SECRET` (signature JWT), `CLOUDINARY_*` (trois variables pour l'API Cloudinary), `GROQ_API_KEY` et `OPENAI_API_KEY` (services IA), `BREVO_API_KEY` et `RESEND_API_KEY` (envoi d'emails).

## 2.5 Agents d'intelligence artificielle

L'intégration de l'intelligence artificielle dans FlipLearn ne relève pas d'un effet de mode mais d'une exploitation systématique des opportunités ouvertes par l'écosystème open-source en 2024-2026. Sept agents distincts sont implémentés, chacun répondant à un besoin pédagogique précis et mobilisant le modèle approprié.

### 2.5.1 Tuteur IA personnel (service `personalTutor.js`)

Le tuteur IA est l'agent le plus utilisé par les étudiants. Il s'appuie sur le modèle **Llama-3.3-70b-versatile** servi via l'API **Groq**. Le service `personalTutor.js` (~330 lignes) construit dynamiquement, à chaque requête, un **system prompt** contextualisé qui injecte dans la fenêtre de contexte du modèle : (a) le profil de l'étudiant (cours en cours, % de complétion, derniers QCM passés, points faibles identifiés, streak actuel), (b) ses Prosits et Projets actifs, (c) une consigne stricte de **méthode socratique** lui interdisant de fournir directement les réponses des QCM ou des exercices.

Cette posture socratique s'inscrit dans la tradition pédagogique de Vygotsky (1978) sur la *zone proximale de développement* : l'apprenant doit être stimulé pour produire la réponse plutôt que de la recevoir passivement. Elle prévient également les usages détournés du tuteur comme "machine à tricher", risque par ailleurs documenté pour les outils d'IA généraliste type ChatGPT (Krishna et al., 2023).

### 2.5.2 Auto-préparation de cours (service `courseAutoPrep.js`)

L'auto-préparation est la **feature démonstrative principale** du projet. Elle permet à l'enseignant, en un seul clic, de transformer une vidéo brute en un module pédagogique structuré et complet. Le service orchestre **cinq appels Groq parallèles** via `Promise.allSettled` (la primitive JavaScript qui assure qu'un échec sur l'un des appels n'arrête pas les quatre autres) :

1. **Génération de cinq questions in-vidéo** positionnées aux moments-clés du transcript (méthodologie Edpuzzle, mais générée automatiquement) ;
2. **Génération d'un QCM** de dix questions avec un mix Bloom équilibré (4 *Mémoriser* + 4 *Comprendre* + 2 *Appliquer*) ;
3. **Génération de trois à cinq objectifs d'apprentissage** alignés Bloom (Anderson & Krathwohl, 2001) ;
4. **Suggestion d'un Prosit** (étude de cas CESI/APP contextualisée si possible au contexte algérien) ;
5. **Génération de huit à douze flashcards** avec format question/réponse adapté à l'algorithme SM-2.

Le professeur valide manuellement chaque élément (toggle *Garder* / *Rejeter*) avant publication atomique en base de données. Le coût estimé est d'environ 30 000 tokens par job, qui demeure entièrement dans le quota gratuit de Groq.

### 2.5.3 Génération de QCM (service `chatbot.js`)

Au-delà de l'auto-préparation complète, le service `chatbot.js` expose une fonction `generateQuizQuestions()` permettant à l'enseignant de générer des QCM ciblés sur des thématiques précises. Cette fonction est mobilisée à la fois par le bouton « Générer avec IA » de l'interface QCM Hub et par le service d'auto-préparation présenté ci-dessus.

### 2.5.4 Détection de plagiat IA (service `aiPlagiarismDetector.js`)

Avec la généralisation des outils d'IA générative, le risque que des étudiants soumettent des contributions Prosit générées par ChatGPT ou équivalent devient une préoccupation pédagogique réelle. Le service `aiPlagiarismDetector.js` implémente une **heuristique de détection** inspirée des travaux de Mitchell et al. (2023) sur *DetectGPT* : analyse de la perplexité du texte (typiquement plus basse pour un texte généré que pour un texte humain), recherche de tournures stylistiques caractéristiques des LLM, comparaison à un corpus témoin de productions étudiantes authentiques.

Cette fonctionnalité demeure désactivée par défaut sur la branche de soutenance (`mvp-soutenance`) faute de validation empirique formelle (le risque de faux positifs étant éthiquement inacceptable sans corpus de calibration), mais reste disponible sur la branche `main` à titre de **perspective d'évolution**.

### 2.5.5 Insights pédagogiques (service `teacherInsights.js`)

Pour aider l'enseignant à identifier les blocages collectifs au niveau de sa classe, le service `teacherInsights.js` agrège les métriques de visionnage, de réussite QCM et d'avancement Prosit, puis demande à Groq de produire **trois à cinq recommandations actionnables** formulées dans un langage opérationnel ("12 étudiants ont raté la question 3 du QCM Cybersécurité — proposez un atelier de 20 minutes en classe pour reprendre la triade CIA"). Cette fonctionnalité s'inscrit dans la tradition des *learning analytics* (Hattie, 2009 ; Black & Wiliam, 1998).

### 2.5.6 Coach IA anti-blocage (service `projectCoach.js`)

Sur les Prosits et Projets en phase active, un coach IA dédié peut être sollicité par l'étudiant ou son groupe lorsqu'ils se sentent bloqués. Le service `projectCoach.js` (~490 lignes) propose quatre actions distinctes : suggérer un *next step* concret, reformuler le problème, fournir trois sources documentaires fiables, ou détecter automatiquement un blocage à partir de l'inactivité prolongée du groupe. Cette fonctionnalité est elle aussi désactivée par défaut sur `mvp-soutenance` au profit du tuteur IA personnel jugé suffisant pour la démonstration.

### 2.5.7 Briefing classe — Pulse Préparation

Implémenté en mai 2026 dans le cadre du **Cycle d'Apprentissage Inversé** (cf. chapitre 4 § 4.3), le briefing classe agrège les contributions du **Pulse Préparation** (mini-questionnaire de 30 secondes que chaque étudiant remplit avant chaque cours présentiel) et les transmet au professeur sous forme synthétique : nombre d'étudiants prêts / partiels / non préparés, top 3 des blocages identifiés via analyse IA des verbatim, suggestions d'activités présentielles ciblées.

### 2.5.8 Services IA non-Groq : Whisper et GPT-4o

Deux agents complémentaires utilisent l'écosystème **OpenAI** :

- **Whisper-1** est mobilisé pour la **transcription audio** des vidéos de cours uploadées par les enseignants. Cette transcription est ensuite réutilisée par tous les agents IA en aval (auto-prep, génération QCM, RAG du tuteur).
- **GPT-4o** assure l'**analyse multimodale** complémentaire de la vidéo (extraction de concepts visuels), produisant un résumé enrichi qui dépasse la simple analyse textuelle.

Ces deux services représentent le seul coût marginal réel du projet (environ 0,02 USD par vidéo de 10 minutes), bornable et acceptable dans le contexte d'un projet académique.

## 2.6 Hébergement et déploiement

### 2.6.1 Stockage des médias : Cloudinary

Les **vidéos** uploadées par les enseignants et les **fichiers** des ressources de cours (PDF, PPTX, DOCX, ZIP) sont hébergés sur **Cloudinary**, le service spécialisé dans la gestion de médias. Le SDK Node.js de Cloudinary est intégré dans `backend/config/cloudinary.js` avec authentification via trois variables d'environnement (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).

Les avantages de Cloudinary par rapport à un stockage local incluent : le **CDN mondial** automatique pour la diffusion rapide des vidéos, la **transcription audio** native (alternative à Whisper, non utilisée dans le projet), la **génération de thumbnails** automatique, et la **transformation à la volée** (redimensionnement, compression). Le quota gratuit de 25 GB de bande passante mensuelle suffit largement à un usage pédagogique en démonstration.

### 2.6.2 Hébergement back-end : Render

Le serveur back-end est déployé sur **Render**, plateforme PaaS (Platform as a Service) concurrente d'Heroku, dans son offre gratuite. Le déploiement est continu depuis la branche `main` du dépôt GitHub : à chaque `git push origin main`, Render reconstruit l'image et redéploie automatiquement (typiquement en 3-5 minutes). L'URL publique de production est `https://fliplearn-5lsz.onrender.com`.

Une particularité du tier gratuit de Render est la **mise en sommeil automatique** du service après 15 minutes d'inactivité ; le premier appel suivant l'inactivité subit alors un délai de réveil d'environ 30 secondes. Cette contrainte est compensable en démo soit par un appel "warm-up" préalable, soit par l'usage d'un service de ping périodique (UptimeRobot).

### 2.6.3 Hébergement front-end : double déploiement

Pour optimiser les performances de chargement du front-end, deux stratégies de déploiement coexistent :

1. **Mode unifié** : en production sur Render, le serveur Express sert également les fichiers statiques compilés du front-end (`frontend/dist/`). Cette approche minimise la complexité opérationnelle.

2. **Mode séparé** : un déploiement parallèle du front-end uniquement est maintenu sur **Vercel** à l'adresse `https://fliplearn-frontend3.vercel.app`. Vercel propose un CDN edge optimisé qui réduit significativement le *Time To First Byte* (TTFB) pour les utilisateurs géographiquement distants du datacenter Render.

### 2.6.4 Service d'envoi d'emails : Brevo (anciennement Sendinblue)

L'envoi d'emails transactionnels (notifications, rappels deadline, invitations) utilise le service **Brevo** dans son tier gratuit (300 emails/jour). Une stratégie de **fallback en cascade** est implémentée dans `emailService.js` : si Brevo échoue (quota dépassé, panne temporaire), le service bascule sur **Resend** ; si Resend échoue à son tour, sur **Gmail SMTP**. Cette redondance assure la robustesse de la chaîne de notification dans le contexte pédagogique où les rappels manquants peuvent compromettre l'engagement.

## 2.7 Synthèse de la stack technique

Le tableau suivant récapitule l'ensemble de la stack technique mobilisée :

**Tableau 2.1 — Stack technique complète FlipLearn**

| Couche | Technologie | Version | Rôle dans le projet |
|---|---|---|---|
| **Outils** | Git / GitHub | 2.x | Versioning + dépôt distant |
| | Visual Studio Code | 1.x | IDE principal |
| | Claude Code | Opus 4.7 | Assistant IA développement |
| | npm | 10.x | Gestion des dépendances |
| **Front-end** | React | 18.x | Framework UI |
| | Vite | 5.x | Build tool & HMR |
| | React Router DOM | 6.x | Routage SPA |
| | Tailwind CSS | 3.x | Utility-first styling |
| | Lucide React | latest | Iconographie |
| | Recharts | 2.12.x | Visualisations de données |
| | Socket.io-client | 4.x | Temps réel (chat, battle) |
| | Axios | 1.x | Client HTTP |
| **Back-end** | Node.js | 20.x LTS | Runtime JavaScript serveur |
| | Express | 4.x | Framework HTTP |
| | Socket.io | 4.x | Serveur WebSocket |
| | Mongoose | 8.x | ODM MongoDB |
| | jsonwebtoken | 9.x | Authentification JWT |
| | bcryptjs | 2.x | Hash mots de passe |
| | helmet, hpp, mongo-sanitize | latest | Sécurité HTTP |
| | express-rate-limit | 7.x | Limitation de débit |
| **Base de données** | MongoDB Atlas | 7.x | NoSQL cluster M0 (gratuit) |
| **IA** | Groq (Llama-3.3-70B) | versatile | 7 agents conversationnels |
| | OpenAI Whisper | 1 | Transcription audio vidéos |
| | OpenAI GPT-4o | latest | Analyse multimodale vidéo |
| **Hébergement** | Cloudinary | API v2 | Stockage vidéos & fichiers |
| | Render | free tier | Hébergement back-end |
| | Vercel | hobby tier | Hébergement front-end (CDN) |
| | Brevo / Resend / Gmail | API | Envoi d'emails (fallback 3 niveaux) |

Cette stack a été stabilisée à mi-parcours et n'a pas connu de réécriture majeure depuis. La plupart des choix initiaux (React, Node.js, MongoDB) se sont révélés robustes ; seuls des choix périphériques ont été révisés en cours de projet, notamment l'**abandon en avril 2026 d'un microservice Python en TensorFlow** initialement prévu pour la prédiction d'échec étudiant — décision documentée dans l'ADR n°6 du document `docs/technical-decisions.md` et motivée par la volonté de centrer le projet sur les agents conversationnels jugés plus défendables académiquement et plus utiles en pratique.

---

> *Note de fin de chapitre.* Le chapitre 2 a établi la stack technique du projet. Le chapitre 3 va maintenant procéder à l'analyse fonctionnelle et non fonctionnelle du système.
