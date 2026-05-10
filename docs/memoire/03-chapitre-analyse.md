# Chapitre 3 — Analyse du système

L'analyse du système consiste à formaliser, avant la conception détaillée, l'ensemble des besoins auxquels la plateforme doit répondre. Le présent chapitre identifie successivement les **acteurs du système** (§ 3.1), formalise les **exigences fonctionnelles** (§ 3.2) et les **exigences non fonctionnelles** (§ 3.3) attendues, puis présente les principaux **cas d'utilisation** sous forme UML (§ 3.4).

## 3.1 Acteurs du système

FlipLearn distingue trois acteurs principaux, modélisés en base de données via le champ `role` du modèle `User` (enum à trois valeurs : `'etudiant'`, `'professeur'`, `'admin'`). Chaque rôle possède des permissions distinctes appliquées par le middleware `requireRole` côté serveur et par le composant `ProtectedRoute` côté client.

### 3.1.1 L'étudiant (`role: 'etudiant'`)

L'étudiant est l'utilisateur final principal de la plateforme. Il s'agit typiquement d'un étudiant inscrit dans l'une des trois filières de l'EM Alger Business School (ISIL, Management, Finance & Comptabilité), réparti sur trois niveaux d'études (L1, L2, L3). Les neuf combinaisons (filière × niveau) constituent autant de **promotions** distinctes, chacune accédant automatiquement aux cours qui lui sont associés via les champs `filiere` et `promotion` du modèle `Course`.

Les principales actions accessibles à un étudiant sont les suivantes :
- **Consulter** ses cours, vidéos, ressources, et son parcours pédagogique structuré (page *Mon Parcours*) ;
- **Visionner** les vidéos avec suivi automatique du temps regardé ;
- **Passer** les QCM associés aux vidéos (déverrouillés à 50 % de visionnage minimum) ;
- **Créer et réviser** ses propres flashcards selon l'algorithme SM-2 ;
- **Participer** à un Prosit (méthode CESI) en tant que membre d'un groupe avec un rôle assigné ;
- **Contribuer** à un Projet (mono-module ou multi-modules) et soumettre des livrables ;
- **Évaluer** ses pairs sur les Prosits évalués (note 30 % du total) ;
- **Dialoguer** avec son tuteur IA personnel à tout moment ;
- **Affronter** d'autres étudiants en *Quiz Battle* temps réel ;
- **Échanger** ses points XP contre des récompenses (mois d'abonnement Premium FlipLearn) ;
- **Communiquer** via le chat de cours ou le chat privé avec un autre utilisateur.

### 3.1.2 Le professeur (`role: 'professeur'`)

Le professeur est l'acteur producteur de contenu pédagogique et accompagnateur des étudiants. Il enseigne typiquement un ou plusieurs modules dans sa filière de rattachement.

Les principales actions accessibles à un professeur sont :
- **Créer et gérer** ses cours (titre, description, filière, promotion, contrat pédagogique au format Markdown, objectifs Bloom) ;
- **Uploader** des vidéos depuis Cloudinary ou intégrer des liens YouTube, avec gestion de l'ordre dans le cours ;
- **Créer** des QCM associés aux vidéos, manuellement ou via génération assistée par IA ;
- **Configurer** des questions interactives in-vidéo (méthodologie Mazur 1997) ;
- **Lancer** l'auto-préparation IA d'une vidéo en un clic (génération simultanée de résumé, QCM, questions, idées de Prosit, flashcards) ;
- **Créer** des Prosits avec énoncé contextualisé, configuration des groupes, grille d'évaluation ;
- **Créer** des Projets mono ou multi-modules avec phases, livrables attendus et rubric d'évaluation ;
- **Suivre** la progression de la classe via la page *Synthèse de classe* et la page *Préparation classe* (cycle CAI) ;
- **Évaluer** les Prosits et Projets soumis ;
- **Envoyer** des rappels groupés ou individuels aux étudiants en difficulté ;
- **Consulter** les Insights IA pédagogiques générés à partir des métriques de classe ;
- **Communiquer** avec ses étudiants via chat de cours, chat privé, ou en publiant des feedbacks pédagogiques structurés.

### 3.1.3 L'administrateur (`role: 'admin'`)

L'administrateur a la responsabilité globale du système. Le seed de démonstration comprend un seul administrateur (`admin@fliplearn.dz`) ; en déploiement réel, ce rôle serait probablement attribué à l'équipe pédagogique de l'EM Alger ou à un service informatique central.

Les principales actions accessibles à un administrateur sont :
- **Approuver ou rejeter** les nouvelles inscriptions étudiantes et professorales (workflow décrit en § 3.2.1) ;
- **Gérer** l'ensemble des utilisateurs : créer, désactiver, supprimer (sauf les autres admins et soi-même) ;
- **Gérer** l'ensemble des cours : créer pour le compte d'un professeur, modifier, supprimer ;
- **Modérer** le chat global et les messages signalés ;
- **Consulter** le journal d'activité du système ;
- **Traiter** les tickets de support utilisateur ;
- **Approuver** les réclamations de récompenses (Reward Claims) ;
- **Visualiser** les statistiques globales (nombre d'utilisateurs, cours, vidéos, messages) et la répartition par rôle.

**Tableau 3.1 — Acteurs et permissions du système**

| Action | Étudiant | Professeur | Admin |
|---|:---:|:---:|:---:|
| Consulter ses cours | ✅ | ✅ | ✅ |
| Visionner les vidéos | ✅ | ✅ | ✅ |
| Passer les QCM | ✅ | – | – |
| Créer un cours | – | ✅ | ✅ |
| Uploader des vidéos | – | ✅ | ✅ |
| Créer / éditer un QCM | – | ✅ | ✅ |
| Créer / éditer un Prosit | – | ✅ | ✅ |
| Évaluer un Prosit | – | ✅ | – |
| Évaluer ses pairs (peer assessment) | ✅ | – | – |
| Page « Mon Parcours » CAI | ✅ | – | – |
| Page « Préparation classe » CAI | – | ✅ | – |
| Quiz Battle | ✅ | – | – |
| Approuver / rejeter inscriptions | – | – | ✅ |
| Gérer tous les utilisateurs | – | – | ✅ |
| Modérer le chat global | – | – | ✅ |
| Consulter journal système | – | – | ✅ |

## 3.2 Exigences fonctionnelles

Les exigences fonctionnelles décrivent **ce que le système doit permettre de faire**. Elles sont regroupées ici par domaine fonctionnel, en cohérence avec l'architecture en six domaines présentée au chapitre 4 (§ 4.2).

### 3.2.1 Domaine *Authentification et gestion des comptes*

**EF-AUTH-1** — Le système doit permettre à un visiteur non authentifié de **créer un compte** étudiant ou professeur en renseignant ses informations personnelles (nom, prénom, email, mot de passe), sa filière et son niveau (pour les étudiants).

**EF-AUTH-2** — Toute nouvelle inscription doit être soumise à **validation par un administrateur** avant que l'utilisateur puisse se connecter. Le statut du compte est alors initialisé à `pending`. Les administrateurs reçoivent une notification temps réel.

**EF-AUTH-3** — L'administrateur doit pouvoir **approuver** une inscription en attente, ce qui active le compte (`status: 'active'`) et déclenche l'envoi d'un email de bienvenue à l'utilisateur.

**EF-AUTH-4** — L'administrateur doit pouvoir **rejeter** une inscription en attente avec un motif optionnel, ce qui marque le compte comme `rejected` et déclenche l'envoi d'un email d'explication.

**EF-AUTH-5** — Un utilisateur authentifié doit pouvoir **se déconnecter** à tout moment, ce qui invalide son JWT côté client.

**EF-AUTH-6** — Un utilisateur doit pouvoir **modifier son profil** (nom, prénom, email, photo de profil) et **changer son mot de passe** depuis la page *Mon profil*.

### 3.2.2 Domaine *Cours et contenus pédagogiques*

**EF-COURSE-1** — Le système doit permettre au professeur de **créer un cours** rattaché à une filière et une promotion spécifiques. Les étudiants de cette filière/promotion sont automatiquement inscrits au cours (création silencieuse d'un document `Progress` vide pour chaque étudiant).

**EF-COURSE-2** — Le professeur doit pouvoir **uploader une vidéo** au format MP4, WebM ou MOV (taille maximale 100 Mo), avec titre, description, ordre dans le cours et deadline optionnelle. Alternative : intégrer une vidéo YouTube par URL.

**EF-COURSE-3** — Le système doit suivre automatiquement la **progression de visionnage** de chaque étudiant sur chaque vidéo (champ `watchedBy` avec sous-document `{ userId, watchedPercent, completed, completedAt }`).

**EF-COURSE-4** — Le professeur doit pouvoir **définir des objectifs d'apprentissage** alignés Bloom (Anderson & Krathwohl 2001) pour chaque cours et lier chaque objectif aux vidéos qui le couvrent.

**EF-COURSE-5** — Le professeur doit pouvoir **rédiger un contrat pédagogique** au format Markdown (max 2000 caractères) qui sera affiché en haut de la page cours côté étudiant.

**EF-COURSE-6** — Le professeur doit pouvoir **organiser les vidéos, QCM et Prosits en un parcours pédagogique** scénarisé via la page *Path Builder*, avec critères de déverrouillage configurables (vidéo ≥ X %, QCM ≥ Y %).

### 3.2.3 Domaine *Évaluation (QCM et questions in-vidéo)*

**EF-QCM-1** — Le professeur doit pouvoir **créer un QCM** associé à une vidéo avec questions à choix unique ou multiple, options A/B/C/D, bonne(s) réponse(s) et explication post-soumission.

**EF-QCM-2** — Le professeur doit pouvoir **générer un QCM avec l'IA** à partir du transcript de la vidéo (typiquement 5-10 questions).

**EF-QCM-3** — Le QCM ne doit être **accessible à l'étudiant** que lorsqu'il a regardé au moins 50 % de la vidéo associée (principe de la classe inversée).

**EF-QCM-4** — L'étudiant doit pouvoir **passer le QCM** avec un timer optionnel par question, et obtenir son score immédiatement à la soumission. Le score est stocké dans `QCM.resultats[]` avec le détail des réponses.

**EF-QCM-5** — Le professeur doit pouvoir **placer des questions interactives** sur la timeline de la vidéo (méthode Mazur 1997 *Peer Instruction*), qui s'afficheront en pause forcée au timestamp configuré.

### 3.2.4 Domaine *Apprentissage par problème (Prosits CESI)*

**EF-PROSIT-1** — Le professeur doit pouvoir **créer un Prosit** avec énoncé complet, cas d'entreprise (contextualisable Algérie), mots-clés, calendrier (date Aller, durée Recherche, date Retour), et configuration des groupes (taille min/max, mode de formation : aléatoire / manuel / choix étudiant).

**EF-PROSIT-2** — Le professeur doit pouvoir **définir une grille d'évaluation** spécifique au Prosit (critères pondérés) et activer/désactiver l'évaluation par les pairs (par défaut activée, pondération 30 %).

**EF-PROSIT-3** — Le système doit gérer le **workflow en six états** du Prosit : `brouillon → aller → recherche → retour → evalue → archive`.

**EF-PROSIT-4** — Lors de la composition automatique des groupes, le système doit **prioriser les rôles non encore endossés** par chaque étudiant (mécanique de rotation des cinq rôles CESI : Animateur, Secrétaire, Scribe, Gestionnaire, Membre).

**EF-PROSIT-5** — Pendant la phase de Recherche, chaque membre doit pouvoir **soumettre ses contributions individuelles** (texte, fichiers).

**EF-PROSIT-6** — Lors de la phase d'évaluation, chaque membre doit pouvoir **noter ses pairs** sur cinq critères standardisés (participation, contribution, esprit d'équipe, respect des deadlines, écoute) avec commentaire optionnel et anonymat par défaut.

**EF-PROSIT-7** — La **note finale** d'un membre doit être calculée selon la formule : *Note = 0.7 × Note professeur + 0.3 × Moyenne notes pairs*.

### 3.2.5 Domaine *Apprentissage par projet (Projects)*

**EF-PROJECT-1** — Le professeur doit pouvoir **créer un Projet** de type *mono* (un seul module), *groupe* (multi-modules), ou *PFE* (projet de fin d'études avec phases canon algériennes).

**EF-PROJECT-2** — Pour chaque Projet, le professeur doit pouvoir **structurer les phases** (3 par défaut pour mono, 5 pour groupe, 7 pour PFE), définir leur ordre, leurs deadlines, leurs livrables attendus et leur poids dans la note finale.

**EF-PROJECT-3** — Le professeur doit pouvoir **partir d'un template** de la bibliothèque officielle (14 templates seedés couvrant les 3 filières × 3 niveaux × PFE).

**EF-PROJECT-4** — Le professeur doit pouvoir **constituer les groupes** manuellement ou de manière aléatoire, en assignant à chaque membre l'un des cinq rôles disponibles (Chef de projet, Scribe, Animateur, Chrono, Analyste).

**EF-PROJECT-5** — L'étudiant doit pouvoir **soumettre des livrables** par phase, et **valider la checklist** de chaque phase (cases à cocher).

**EF-PROJECT-6** — Le professeur doit pouvoir **évaluer un livrable** via la grille rubric configurable (critères × descripteurs niveau 1-5) et fournir un feedback texte.

### 3.2.6 Domaine *Révision espacée (Decks et Cards)*

**EF-DECK-1** — L'étudiant doit pouvoir **créer un deck** de flashcards manuellement (titre, description, catégorie, visibilité publique/privée).

**EF-DECK-2** — L'étudiant doit pouvoir **générer un deck avec l'IA** depuis une vidéo qu'il a vue (typiquement 8-12 cartes générées).

**EF-DECK-3** — L'étudiant doit pouvoir **lancer une session de révision** sur un deck, qui présente uniquement les cartes dues (`Card.nextReview <= now`).

**EF-DECK-4** — Pour chaque carte révisée, l'étudiant doit pouvoir grader sa difficulté ressentie (*Encore* / *Bien* / *Facile*), ce qui déclenche le **calcul SM-2** de la prochaine date de révision en mettant à jour `interval`, `easeFactor` et `repetitions` selon la formule de Wozniak (1990).

### 3.2.7 Domaine *Communication et notifications*

**EF-CHAT-1** — Le système doit fournir un **chat de cours** (un par cours, accessible à tous les inscrits) avec messages persistés en base.

**EF-CHAT-2** — Le système doit fournir un **chat privé** entre deux utilisateurs (type messagerie instantanée).

**EF-NOTIF-1** — Le système doit envoyer des **notifications in-app temps réel** (via Socket.io) pour : nouveau message, deadline imminente, badge débloqué, rappel pédagogique du professeur, validation/rejet d'inscription.

**EF-NOTIF-2** — L'utilisateur doit pouvoir **consulter** ses notifications dans une page dédiée avec filtres (Toutes, Non lues, Rappels), les **marquer comme lues** individuellement ou en masse, et les **supprimer**.

**EF-NOTIF-3** — Pour les rappels pédagogiques critiques (deadline imminente, vidéo non vue avant cours), le système doit également envoyer un **email** via Brevo.

### 3.2.8 Domaine *Gamification*

**EF-GAMIF-1** — Chaque action pédagogique de l'étudiant doit déclencher l'**attribution de points XP** (vidéo terminée à 80 %+ : 20 XP, QCM passé : 10 XP par bonne réponse, Prosit terminé : 100 XP, etc.) gérée centralement par le service `pointsService.js`.

**EF-GAMIF-2** — Le système doit gérer un **système de niveaux** (5 niveaux : Débutant, Apprenti, Confirmé, Expert, Maître) avec progression visible dans la barre de niveau du dashboard.

**EF-GAMIF-3** — Le système doit gérer un **système de streaks** récompensant la régularité (nombre de jours consécutifs d'activité), avec freezes consommables permettant de couvrir un jour manqué (max 3 freezes).

**EF-GAMIF-4** — Chaque lundi à 06h00, le système doit **générer trois quêtes hebdomadaires** par étudiant via Groq (1 facile, 1 moyenne, 1 difficile) ciblées sur ses cours en cours.

**EF-GAMIF-5** — L'étudiant doit pouvoir **affronter un autre étudiant** en *Quiz Battle* temps réel (5 questions, timer 15 secondes par question, 3 power-ups disponibles : 50/50, Freeze, x2 Points).

**EF-GAMIF-6** — L'étudiant doit pouvoir **réclamer une récompense** (« 1 mois Premium FlipLearn ») contre 1000 XP, sous réserve de validation par un administrateur.

### 3.2.9 Domaine *Cycle d'Apprentissage Inversé (CAI)*

**EF-CAI-1** — Le système doit afficher à l'étudiant une **page « Mon Parcours »** présentant pour chacun de ses cours l'état des cinq étapes du Cycle d'Apprentissage Inversé : Préparation, Rendez-vous, Application, Production, Consolidation.

**EF-CAI-2** — Le système doit calculer pour chaque cours un **pourcentage de progression du cycle** (multiple de 20, basé sur le nombre d'étapes complétées).

**EF-CAI-3** — Le système doit afficher au professeur une **page « Préparation classe »** présentant pour chaque vidéo du cours le nombre d'étudiants prêts (vidéo ≥ 80 % + QCM ≥ 60 %), partiels, ou non préparés, avec liste des emails des non préparés pour rappel groupé.

**EF-CAI-4** — Le professeur doit pouvoir **envoyer un rappel groupé** aux étudiants non préparés (limite de 50 destinataires par appel, dédoublonnage horaire pour éviter le spam).

## 3.3 Exigences non fonctionnelles

Les exigences non fonctionnelles décrivent **comment le système doit fonctionner** : qualité, performance, sécurité, ergonomie, maintenabilité.

### 3.3.1 Performance

**ENF-PERF-1** — Le temps de réponse moyen des endpoints REST doit rester sous **500 ms** en environnement de production sur Render (mesure prise sur l'environnement de démonstration : 304 ms pour `/api/class-readiness/:courseId` avec 1 étudiant et 2 vidéos).

**ENF-PERF-2** — Le temps de chargement initial du front-end (TTFB + parse JS) doit rester sous **3 secondes** sur connexion 3G/4G typique algérienne.

**ENF-PERF-3** — Les appels IA Groq (génération QCM, tuteur, auto-prep) doivent retourner sous **5 secondes** par requête (la latence Groq étant typiquement de 2 secondes pour 8000 tokens).

### 3.3.2 Sécurité

**ENF-SEC-1** — Les mots de passe doivent être stockés **hashés avec bcrypt** (facteur 10), jamais en clair.

**ENF-SEC-2** — Toutes les routes protégées doivent valider le **JWT** côté serveur via le middleware `authMiddleware`.

**ENF-SEC-3** — Les routes nécessitant un rôle spécifique doivent vérifier ce rôle via le middleware `requireRole(...roles)`.

**ENF-SEC-4** — Les inputs utilisateurs doivent être **sanitisés** contre les injections NoSQL via `express-mongo-sanitize` et contre la pollution de paramètres via `hpp`.

**ENF-SEC-5** — Les headers HTTP de sécurité standard doivent être injectés via **Helmet** (CSP, X-Frame-Options, X-Content-Type-Options).

**ENF-SEC-6** — Les endpoints sensibles (login, register, reset password) doivent être protégés par **rate limiting** (max 100 requêtes / 15 minutes / IP).

### 3.3.3 Disponibilité et résilience

**ENF-DISPO-1** — Le système doit fonctionner avec une **disponibilité cible de 99 %** sur le tier gratuit Render (la mise en sommeil après 15 min d'inactivité étant connue et compensable par UptimeRobot).

**ENF-DISPO-2** — L'envoi d'emails doit utiliser un **fallback en cascade** (Brevo → Resend → Gmail SMTP) pour garantir la robustesse de la chaîne de notification.

**ENF-DISPO-3** — Les appels IA parallèles (cas de l'auto-prep cours) doivent utiliser `Promise.allSettled` pour garantir qu'**un échec sur un appel n'arrête pas les autres**.

### 3.3.4 Ergonomie et accessibilité

**ENF-UX-1** — L'interface doit être **responsive** (adaptée mobile, tablette, desktop) avec des breakpoints standards (640 px, 768 px, 1024 px, 1280 px).

**ENF-UX-2** — Les éléments interactifs (boutons, liens, inputs) doivent respecter les **standards d'accessibilité WCAG 2.1 niveau AA** : contraste suffisant, focus visible, labels ARIA pour les boutons-icônes.

**ENF-UX-3** — Tout texte affiché à l'utilisateur doit être en **français** (langue d'enseignement de l'EM Alger), avec orthographe et accentuation correctes.

**ENF-UX-4** — Les pages doivent fournir des **états vides** (empty states) explicatifs et des **états de chargement** (skeletons ou spinners) plutôt qu'un écran blanc.

### 3.3.5 Maintenabilité et qualité du code

**ENF-MAINT-1** — Le code doit suivre une **organisation modulaire** claire : séparation routes / contrôleurs / services côté backend, composants atomiques côté frontend.

**ENF-MAINT-2** — Les commits Git doivent suivre la **convention Conventional Commits** (préfixes typés `feat:`, `fix:`, `chore:`, etc.) pour faciliter la lecture du journal et la génération automatique de changelog.

**ENF-MAINT-3** — Les choix techniques significatifs doivent être documentés sous forme d'**ADR (Architecture Decision Records)** dans `docs/technical-decisions.md`.

**ENF-MAINT-4** — Les fonctions critiques (algorithme SM-2, calcul des streaks, formules de note Prosit) doivent être couvertes par des **tests automatisés**.

### 3.3.6 Coût d'exploitation

**ENF-COUT-1** — La plateforme doit fonctionner intégralement sur les **tiers gratuits** des services externes (MongoDB Atlas M0, Render free, Cloudinary free, Groq free, Brevo 300 emails/jour). Le coût marginal d'exploitation doit rester **inférieur à 5 USD/mois** (essentiellement les appels OpenAI Whisper + GPT-4o pour les nouvelles vidéos analysées).

## 3.4 Cas d'utilisation principaux

Les cas d'utilisation suivants formalisent les interactions clés entre les acteurs et le système. Ils sont présentés sous forme synthétique selon le format **UseCase Name → Acteur → Précondition → Scénario nominal → Postcondition**.

### 3.4.1 Cas d'utilisation : *S'inscrire sur la plateforme*

| | |
|---|---|
| **Acteur principal** | Visiteur (non authentifié, futur étudiant ou professeur) |
| **Précondition** | Aucune (page `/welcome` ou `/register` accessible publiquement) |
| **Scénario nominal** | 1. Le visiteur clique sur « Créer mon compte » depuis la page d'accueil. 2. Il renseigne ses informations (nom, prénom, email, mot de passe, rôle, filière, niveau). 3. Il soumet le formulaire. 4. Le système crée le compte avec `status: 'pending'`, sans token (pas de connexion automatique). 5. Le système notifie tous les administrateurs en temps réel. 6. Le visiteur reçoit un message de confirmation lui indiquant qu'il doit attendre la validation. |
| **Postcondition** | Le compte existe en base avec `status: 'pending'` ; les administrateurs sont notifiés. |
| **Variantes** | (a) Email déjà utilisé → erreur 409 *Conflict* + message « Un compte avec cet email existe déjà ». (b) Champs manquants → erreur 400 *Bad Request*. |

### 3.4.2 Cas d'utilisation : *Approuver une nouvelle inscription*

| | |
|---|---|
| **Acteur principal** | Administrateur |
| **Précondition** | Au moins un utilisateur en statut `pending` existe en base. |
| **Scénario nominal** | 1. L'administrateur reçoit une notification temps réel d'inscription. 2. Il se connecte (ou clique directement sur le lien de la notification). 3. Il accède à l'onglet *Inscriptions* du dashboard admin. 4. Il consulte la liste des inscriptions en attente. 5. Pour chaque candidat, il peut consulter les informations puis cliquer *Approuver* ou *Rejeter*. 6. À l'approbation, le système met le `status` du compte à `'active'` et envoie un email de bienvenue à l'utilisateur. |
| **Postcondition** | L'utilisateur peut se connecter. Un email lui est envoyé. |
| **Variantes** | (a) L'admin choisit *Rejeter* avec motif → `status: 'rejected'` + email d'explication. |

### 3.4.3 Cas d'utilisation : *Préparer un cours en classe inversée (workflow CAI étudiant)*

| | |
|---|---|
| **Acteur principal** | Étudiant inscrit |
| **Précondition** | L'étudiant est inscrit à un cours qui contient au moins une vidéo et un QCM. |
| **Scénario nominal** | 1. L'étudiant accède à la page *Mon Parcours*. 2. Il sélectionne le module en cours (ex. *Cybersécurité*). 3. Il consulte l'état de son cycle d'apprentissage : étape 1 (Préparation) en cours. 4. Il clique sur *Continuer* → ouvre la page du cours. 5. Il sélectionne la vidéo *Les bases de la cybersécurité* et la regarde à 100 %. 6. Le système met à jour `Video.watchedBy` avec `completed: true`. 7. Le QCM associé se déverrouille automatiquement (≥ 50 % de visionnage requis). 8. L'étudiant passe le QCM et obtient 80 %. 9. Le système recalcule le `cycleProgress` : étape 1 passe de *in-progress* à *completed*, étape 3 (Application) passe de *locked* à *in-progress*. 10. L'étudiant retourne sur *Mon Parcours* et constate la progression visuellement. |
| **Postcondition** | `Video.watchedBy` mis à jour, `QCM.resultats` enrichi, badge éventuel attribué, +20 XP attribués, étape suivante du cycle débloquée. |

### 3.4.4 Cas d'utilisation : *Préparer une séance présentielle (workflow CAI professeur)*

| | |
|---|---|
| **Acteur principal** | Professeur d'un cours |
| **Précondition** | Le cours contient au moins une vidéo avec QCM associé. Au moins un étudiant est inscrit au cours. |
| **Scénario nominal** | 1. Avant sa séance présentielle, le professeur accède à la page *Préparation classe*. 2. Il sélectionne le cours concerné. 3. Le système affiche pour chaque vidéo : nombre d'étudiants prêts (vidéo ≥ 80 % + QCM ≥ 60 %), partiels, non préparés. 4. Le professeur identifie les étudiants non préparés. 5. Il clique *Envoyer rappel* pour la vidéo concernée. 6. Une modale s'ouvre avec la liste des destinataires (cochables) et un message pré-rempli adaptable. 7. Le professeur valide. 8. Le système crée une notification in-app pour chaque destinataire avec lien vers la vidéo. 9. Le professeur arrive en classe avec une visibilité claire sur l'état de préparation et peut adapter sa séance en conséquence. |
| **Postcondition** | `N` notifications in-app créées (avec dédoublonnage horaire pour éviter le spam si reclic). |

### 3.4.5 Cas d'utilisation : *Auto-préparation d'un cours par l'IA (F1)*

| | |
|---|---|
| **Acteur principal** | Professeur |
| **Précondition** | Une vidéo a été uploadée et son analyse Whisper + GPT-4o a été complétée (statut `VideoAnalysis.status === 'completed'`, présence du transcript). |
| **Scénario nominal** | 1. Le professeur accède à la page *Auto-préparation IA* d'une vidéo. 2. Il clique *Lancer la génération*. 3. Le service `courseAutoPrep.js` orchestre cinq appels Groq parallèles via `Promise.allSettled` : génération de questions in-vidéo, QCM 10 questions, objectifs Bloom, suggestion Prosit, flashcards. 4. En 30-60 secondes, l'interface affiche les cinq sections résultats avec toggles *Garder* / *Rejeter* sur chaque élément. 5. Le professeur passe en revue, ajuste, décoche les éléments non pertinents. 6. Il clique *Publier*. 7. Le système crée atomiquement les entités correspondantes en base (QCM, VideoQuestion, mise à jour `Course.learningOutcomes`, draft Prosit, deck de flashcards prof). |
| **Postcondition** | Module pédagogique enrichi en quelques minutes au lieu de plusieurs heures de travail manuel. |
| **Variante d'erreur** | Si l'analyse Whisper de la vidéo n'est pas complétée → message « Transcription non disponible. Lance d'abord l'analyse IA de la vidéo et reviens dans 1-2 minutes. » |

### 3.4.6 Cas d'utilisation : *Participer à un Prosit en groupe (méthode CESI)*

| | |
|---|---|
| **Acteur principal** | Étudiant membre d'un groupe Prosit |
| **Précondition** | Un Prosit existe au statut `aller` ; l'étudiant est membre d'un des groupes. |
| **Scénario nominal** | 1. L'étudiant accède à la page du Prosit depuis *Prosits* ou *Mon Parcours*. 2. Si c'est sa première participation à un Prosit, une modale d'onboarding lui propose de lire la *Méthode Prosit* (5 minutes). 3. L'étudiant consulte l'énoncé, la grille d'évaluation, et identifie son rôle (par exemple *Animateur*). 4. **Phase Aller** (en présentiel) : le groupe se réunit, analyse le cas collectivement, l'animateur distribue la parole, le secrétaire note les contributions, le scribe remplit le tableau partagé. 5. Le professeur valide la fin de la phase Aller → bascule en *recherche*. 6. **Phase Recherche** (chez soi, ~7 jours) : chaque membre soumet ses contributions individuelles via l'interface. 7. **Phase Retour** (en présentiel) : le groupe présente sa solution au professeur. 8. Le professeur évalue le travail du groupe selon la grille et bascule le Prosit en `evalue`. 9. Une période de 3 jours s'ouvre pendant laquelle chaque membre peut **évaluer ses pairs** sur les cinq critères standardisés. 10. Le système calcule la note finale = 0.7 × note professeur + 0.3 × moyenne notes pairs. |
| **Postcondition** | Note finale calculée et persistée. Statistique de rotation des rôles mise à jour pour chaque membre. |

---

> *Note de fin de chapitre.* Le chapitre 3 a formalisé les besoins fonctionnels et non fonctionnels du système ainsi que les principaux cas d'utilisation. Le chapitre 4 va maintenant présenter la conception détaillée — architecture, modèle de données, schéma pédagogique du Cycle d'Apprentissage Inversé, et diagrammes UML.
