# Chapitre 5 — Résultats

Ce chapitre présente les résultats opérationnels du travail réalisé. Y sont successivement décrits les principales **interfaces étudiant** (§ 5.1), **interfaces professeur** (§ 5.2), **interface administrateur** (§ 5.3), un **workflow type complet** illustrant la traversée des cinq étapes du Cycle d'Apprentissage Inversé (§ 5.4), et les **métriques d'usage** observées sur l'environnement de démonstration (§ 5.5).

## 5.1 Interface étudiant

L'interface étudiant a été conçue pour répondre à une exigence simple : **éviter à tout moment la question « je suis où ? »**. Cette exigence est la conséquence directe du diagnostic initial (cf. chapitre 1, § 1.3) selon lequel les plateformes e-learning existantes échouent en partie parce qu'elles fragmentent l'expérience d'apprentissage en outils dispersés sans fil rouge unificateur.

### 5.1.1 Page « Mon Parcours » — le hub étudiant

La page **`/my-journey`** constitue l'innovation majeure de l'interface étudiant et matérialise concrètement le Cycle d'Apprentissage Inversé. Pour chaque cours auquel l'étudiant est inscrit, elle affiche une carte qui décompose l'état des cinq étapes du cycle.

**Anatomie de la page Mon Parcours**

```
  ╔═══════════════════════════════════════════════════════════════╗
  ║  🎯 Mon Parcours                                               ║
  ║  Suis ta progression dans chaque module selon le Cycle         ║
  ║  d'Apprentissage Inversé.                                      ║
  ╚═══════════════════════════════════════════════════════════════╝

  ┌─────────────────────────────────────────────────────────────────┐
  │  📚 Cybersécurité            [ISIL] [L3]                        │
  │                                                                  │
  │  PROGRESSION DU CYCLE                                40%         │
  │  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                  │
  │                                                                  │
  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐│
  │  │  📚 ✓   │  │  👥 …   │  │  🧩 …   │  │  🚀 🔒  │  │  🔁 …  ││
  │  │ ÉTAPE 1 │  │ ÉTAPE 2 │  │ ÉTAPE 3 │  │ ÉTAPE 4 │  │ ÉTAPE 5││
  │  │ PRÉPA.  │  │ RDV     │  │ APPLI.  │  │ PRODUC. │  │ CONSO. ││
  │  │ Vidéos  │  │ À venir │  │ Prosit  │  │ Locked  │  │ 12     ││
  │  │ 4/5     │  │         │  │ 1/2     │  │         │  │ cards  ││
  │  │ QCM 3/5 │  │         │  │ ✓       │  │         │  │ dues   ││
  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └────────┘│
  │                                                                  │
  │  [Continuer →]                                                   │
  └─────────────────────────────────────────────────────────────────┘
```

Chaque étape est représentée par une carte (composant `JourneyStepCard.jsx`) dont le code couleur traduit immédiatement le statut : **vert** pour `'completed'`, **orange** pour `'in-progress'` ou `'active'`, **gris** pour `'locked'` ou `'not-started'`. Les détails compteurs sont contextualisés selon l'étape : nombre de vidéos vues et de QCM réussis pour la Préparation, nombre de Prosits complétés et en cours pour l'Application, nombre de cartes dues pour la Consolidation, etc.

La cohérence visuelle de l'ensemble — palette restreinte, alignement parfait des cinq cartes en grille adaptive (responsive), animations subtiles au survol — produit une impression d'unité qui contraste avec la dispersion habituelle des plateformes e-learning. Au-dessus, une **barre de progression du cycle** matérialise le pourcentage global d'avancement (multiple de 20 selon le nombre d'étapes complétées) avec un code couleur progressif (rouge sous 40 %, orange entre 40 et 79 %, vert au-delà).

### 5.1.2 Tableau de bord étudiant — diagramme de cycle animé

Le tableau de bord étudiant (page `/`) sert de point d'entrée quotidien. Il a été enrichi en mai 2026 avec un **diagramme du cycle animé** (composant `CycleDiagram.jsx`) qui présente, pour le cours sélectionné via un dropdown, l'état des cinq étapes sous forme visuelle synthétique. Les étapes en cours (statut `'in-progress'` ou `'active'`) bénéficient d'une animation **pulse** CSS qui attire le regard vers les actions à entreprendre prioritairement.

Au-dessus du diagramme, un **bandeau d'accueil CAI** est affiché à la première connexion de l'étudiant (déclenché via le `localStorage` clé `cai-banner-seen`), expliquant en une phrase le concept du cycle et invitant à explorer la page *Mon Parcours*. Ce bandeau est **dismissible** : un clic sur l'icône de fermeture le supprime définitivement et persiste cette préférence.

Le reste du tableau de bord rassemble : un message d'accueil personnalisé (« Bonjour, Assil ! Vous avez 2 tâches à faire cette semaine. »), quatre cartes de statistiques (Points XP, Cours inscrits, Vidéos terminées, QCM complétés), la liste des cinq derniers cours, le bloc « Cette semaine » qui agrège les deadlines vidéos et QCM des sept prochains jours, et une grille de quatre accès rapides (Classement, Quiz Battle, Messages, Mon profil).

### 5.1.3 Page de cours — vue étudiant

Lorsque l'étudiant clique sur un cours, il accède à la page **`/courses/:id`** qui présente :

- En haut, le **header du cours** (titre, badges filière/promotion, lien vers le chat de cours) ;
- Si renseigné par le professeur, le **contrat pédagogique** (rendu Markdown) et la liste des **objectifs d'apprentissage** Bloom-typés ;
- La **liste des vidéos** numérotées dans l'ordre, avec pour chacune le titre, le pourcentage de visionnage individuel, le statut (Non vu / En cours / Terminé) ;
- Un **panneau latéral droit** « MA PROGRESSION » qui décompose : pourcentage global, X/Y vidéos complétées, détail par statut (Complétées / En cours / Non vues) ;
- Trois **boutons d'action** principaux : *Continuer le cours* (ouvre la première vidéo non terminée), *Chat du cours* (vers le salon collectif), *🤖 Assistant IA du module* (vers l'assistant IA spécialisé sur ce cours).

### 5.1.4 Lecteur vidéo et QCM — incarnation du principe de classe inversée

Le lecteur vidéo (page **`/watch/:videoId`**) supporte les vidéos hébergées Cloudinary (lecteur HTML5 natif) et YouTube (iframe `youtube.com/embed/`). Il intègre un **suivi automatique** du temps regardé par l'étudiant, transmis au backend via des appels périodiques `POST /api/videos/:id/progress` et persisté dans le sous-document `Video.watchedBy[]`.

Côté pédagogique, deux mécaniques notables sont implémentées :

1. **Verrouillage du QCM tant que la vidéo n'a pas été regardée à 50 %** : la page `/qcm/:videoId` affiche un message explicatif (« QCM verrouillé. Tu dois avoir regardé au moins 50 % de la vidéo associée avant de pouvoir commencer ce QCM. C'est le principe de la classe inversée : la vidéo prépare le QCM. ») et un bouton « Regarder la vidéo » qui renvoie vers le lecteur. Cette mécanique opérationnalise concrètement la définition canonique de la classe inversée par Bishop & Verleger (2013).

2. **Questions interactives in-vidéo** (méthodologie Mazur, 1997) : le lecteur peut être configuré par le professeur pour mettre la lecture en pause à des timestamps précis et afficher une question à laquelle l'étudiant doit répondre avant de pouvoir reprendre.

### 5.1.5 Mon Tuteur IA — assistant personnel disponible 24/7

La page **`/my-tutor`** présente le tuteur IA personnel sous forme d'un chat conversationnel inspiré des interfaces ChatGPT/Claude.ai. Le layout est divisé en deux colonnes :

- **À gauche** (sur desktop) : suggestions du jour générées dynamiquement à partir du contexte de l'étudiant (« Regarde la vidéo d'introduction au cours de Développement Web », « Révise les concepts de base de la cybersécurité », etc.), points forts et points faibles identifiés.
- **À droite** : zone de chat avec messages utilisateur/assistant alternés, champ de saisie, deux quick prompts au démarrage (« 📚 Quel cours faire maintenant ? » et « 🛠 Aide sur mon Prosit »), bouton micro pour la **dictée vocale** via l'API Web Speech.

Le tuteur respecte une **méthode socratique stricte** : il refuse explicitement de fournir les réponses aux QCM ou aux exercices, même quand l'étudiant insiste. Cette posture est implémentée par injection dans le system prompt Groq d'une consigne explicite (« Tu es un tuteur socratique. Tu ne donnes JAMAIS la réponse directe à un QCM ou à un exercice. Tu poses des questions ouvertes pour guider l'étudiant vers la réponse. »). Le quota est limité à **30 messages par jour par utilisateur** pour rester dans les limites du tier gratuit Groq.

### 5.1.6 Decks et Study — révision SM-2

Les pages **`/decks`** et **`/study/:deckId`** matérialisent l'algorithme SM-2 de Wozniak (1990). La page Decks liste tous les decks de l'étudiant avec compteurs (nombre de cartes total, dues aujourd'hui, dernière révision). Elle propose deux modes de création : **manuel** (modale simple titre/description/catégorie) et **génération IA** (modale qui demande de sélectionner une vidéo récemment vue, puis génère 8 à 12 flashcards via un appel Groq).

La page Study présente une **carte centrale** avec sa face avant (question), bouton « Retourner » qui flip vers la face arrière (réponse), puis trois boutons SM-2 : **Encore** (rouge, quality 1, la carte revient demain), **Bien** (vert, quality 4, intervalle multiplié par l'ease factor), **Facile** (bleu, quality 5, intervalle multiplié par ease + bonus). Un feedback éphémère « Prochaine révision dans X j » s'affiche après chaque grade. À la fin de la session, un écran récapitulatif présente les statistiques : nombre de Encore / Bien / Facile.

### 5.1.7 Prosits — méthode CESI/APP en groupe

Les pages **`/prosits`** (liste) et **`/prosits/:id`** (détail) implémentent intégralement la méthodologie CESI. La liste filtre les Prosits selon leur statut via cinq onglets (*Tous*, *Phase Aller*, *Recherche*, *Phase Retour*, *Évalués*), et présente en haut une **carte « Ma rotation des rôles »** qui visualise pour l'étudiant les rôles déjà endossés (avec compteur d'occurrences) et ceux restant à jouer pour compléter le cycle. Cette carte matérialise la mécanique d'**assignation prioritaire** des rôles non encore endossés lors de la composition automatique des groupes.

La page de détail d'un Prosit présente l'énoncé complet, le cas d'entreprise (généralement contextualisé Algérie), les mots-clés, la grille d'évaluation, le calendrier, et les groupes constitués. Pour le membre d'un groupe en phase active, des sous-sections spécifiques s'affichent : espace de contributions individuelles, tableau partagé en lecture/écriture, liste des coéquipiers avec leurs rôles. À la première ouverture d'un Prosit par un nouvel utilisateur, une **modale d'onboarding** propose de lire le guide *Méthode Prosit* (page `/method-guide`, environ 7 sections pédagogiques détaillées sur la méthodologie CESI/APP).

### 5.1.8 Page projet — vue étudiant à phases progressives

La page **`/projects/:id`** présente, pour l'étudiant inscrit dans un groupe, une expérience profondément remaniée par la refonte de mai 2026 (cf. § 4.3.5). En tête de page s'affiche un **header projet** synthétique : le nom du module rattaché, le titre du projet, la composition du groupe avec mise en évidence du rôle propre, une barre de progression *Mon avancement* (`validatedCount/totalPhases · X %`) et, lorsqu'elle est dans les quatorze prochains jours, un compte à rebours de la date de soutenance.

Sous ce header se déploie la liste des phases personnelles, chacune sous forme d'une **carte adaptée au statut** (composant `StudentPhaseCard.jsx`), parmi les cinq variantes visuelles formalisées en EF-PROJECT-9. Une phase **verrouillée** liste explicitement ses prérequis avec leur taux de complétion individuel (« Chapitre 3 — actuellement à 60 % capsules, il te manque 1 capsule ») et offre des boutons *Reprendre* qui redirigent vers la ressource manquante. Une phase **débloquée** dont la définition pointe vers un cas pratique évalué par l'étudiant propose un choix binaire : *Importer et enrichir* le livrable précédent, ou *Repartir de zéro*. Une phase **en cours** affiche le formulaire d'édition pré-rempli (avec un bandeau jaune *Livrable importé depuis l'étude de cas X — tu peux l'enrichir ci-dessous* lorsque l'option d'import a été retenue), un bouton *Sauvegarder brouillon* (persistance locale en `localStorage`) et un bouton *Soumettre* qui bascule la phase en *submitted*. Une phase **soumise** se met en lecture seule, en attente du retour professeur. Une phase **validée** affiche le feedback du professeur et un bouton *Voir mon livrable* qui ouvre une modale lecture seule.

Cette interface incarne directement les principes de visibilité du parcours et de capitalisation des apprentissages successifs énoncés en § 4.3.5 — chaque écran rappelle où l'étudiant en est, ce qu'il peut faire maintenant, et comment ce qu'il a déjà investi continue à porter ses fruits dans la suite du module.

### 5.1.9 Quiz Battle — affrontement temps réel

La page **`/quiz-battle`** propose un affrontement compétitif entre deux étudiants. Le lobby affiche les salles disponibles et permet d'en créer une nouvelle (choix de la matière). Un match comporte 5 questions, avec un timer de 15 secondes par question. Trois **power-ups** sont à disposition de chaque joueur (utilisables une seule fois chacun) :

- **50/50** : élimine deux mauvaises réponses ;
- **Freeze** : ajoute 8 secondes au timer ;
- **x2 Points** : double les points de la question en cours.

Les power-ups de l'adversaire déclenchent un **flash visuel** notifiant le joueur. Le score, le streak (bonnes réponses consécutives) et les points gagnés à chaque round sont affichés en temps réel via Socket.io. À la fin du match, un tableau de résultats déclare le vainqueur et alimente le classement Battle interne (`/api/battle/leaderboard`).

## 5.2 Interface professeur

L'interface professeur a été conçue selon un principe directeur opposé mais complémentaire à celui de l'interface étudiant : **chaque écran prof doit répondre à une question opérationnelle précise**. Le tableau de bord répond à « comment va ma classe ? », la page Préparation classe à « qui est prêt pour mon prochain cours ? », la page Tracking à « où en est chaque étudiant individuellement ? », l'auto-prep à « comment préparer ce module rapidement ? ».

### 5.2.1 Tableau de bord professeur — Synthèse de classe

Le tableau de bord (page **`/professor/dashboard/:courseId`**) est dénommé *Synthèse de classe* dans son en-tête, avec un sous-titre explicite : « vue d'ensemble par cours : statistiques agrégées, alertes, classement ». Il présente :

- En haut, un **bandeau d'alertes proactives** — par exemple « 10 alertes — cours sous 50 % de complétion » avec bouton « Voir le détail ▾ » qui déplie la liste des étudiants concernés.
- Une section **« Insights IA »** (feature F3, désactivée par défaut sur la branche de soutenance, accessible sur la branche `main`) qui affiche trois à cinq recommandations actionnables générées par Groq à partir des métriques agrégées du cours.
- Le **header du cours** sélectionné avec un dropdown permettant de changer rapidement de cours sans repasser par la sidebar.
- Quatre **cartes de statistiques globales** : Étudiants inscrits, Complétion vidéos (% moyen), Réussite QCM (% moyen ou « — » si aucune tentative), Vidéos publiées (nombre + nombre de QCM associés).
- Un **tableau « Suivi de visionnage par vidéo »** détaillé, avec pour chaque vidéo : numéro, titre, nombre d'étudiants ayant commencé, X/Y terminés, score QCM moyen, pourcentage de complétion. Un encart pédagogique précise : *« Indicateur de préparation avant le cours en présentiel »*. Trois pastilles colorées catégorisent les étudiants en *Prêts (≥ 80 %)*, *Partiel (40-80 %)*, *Non prêts (< 40 %)*.

### 5.2.2 Page « Préparation classe » — l'innovation CAI côté prof

La page **`/professor/class-readiness`** (et son détail `/professor/class-readiness/:courseId`) constitue l'innovation majeure de l'interface professeur, symétrique de la page *Mon Parcours* côté étudiant. Elle répond opérationnellement à la question : *« Pour mon prochain cours, qui a vu la vidéo et fait le QCM, qui ne l'a pas fait ? »* — la question la plus critique de la classe inversée selon Akçayır (2018).

L'interface présente, pour le cours sélectionné, le nombre total d'étudiants inscrits puis, **pour chaque vidéo + QCM associé**, une rangée avec :

- L'icône type (vidéo ou QCM) et le titre de la ressource ;
- Trois **pastilles colorées** : 🟢 X prêts (vidéo complétée + QCM ≥ 60 %), 🟡 Y partiels (un seul des deux), 🔴 Z non préparés (ni l'un ni l'autre) ;
- Si Z > 0, un bouton **« Envoyer rappel aux Z non préparés »** qui ouvre une modale présentant la liste des étudiants concernés (cochables, tous cochés par défaut) et un message pré-rempli adaptable.

Au clic sur « Envoyer », le système crée une **notification in-app** pour chaque destinataire avec lien direct vers la vidéo concernée. Un mécanisme de **dédoublonnage horaire** (clé `dedupKey: 'readiness_<courseId>_<videoId>_<userId>_<YYYYMMDDHH>'`) empêche le spam si le professeur reclique plusieurs fois dans la même heure.

### 5.2.3 Auto-préparation IA — la feature démonstrative

La page **`/professor/courses/:courseId/videos/:videoId/auto-prep`** matérialise la fonctionnalité F1 (*Auto-prépa cours en 1 clic*), feature démonstrative par excellence pour la soutenance. Elle requiert au préalable que l'analyse Whisper de la vidéo ait été complétée (sinon affichage d'un message « Transcription non disponible. Lance d'abord l'analyse IA de la vidéo et reviens dans 1-2 minutes. »).

Lorsque le professeur clique sur le bouton « Lancer la génération », le service `courseAutoPrep.js` orchestre cinq appels Groq parallèles via `Promise.allSettled`. En 30 à 60 secondes, l'interface présente cinq sections de résultats avec, pour chaque élément, un toggle *Garder* / *Rejeter* :

1. **Cinq questions in-vidéo** positionnées sur la timeline (avec timestamp suggéré) ;
2. **Un QCM de 10 questions** avec mix Bloom équilibré ;
3. **Trois à cinq objectifs d'apprentissage** alignés Bloom ;
4. **Une suggestion de Prosit** (énoncé court + grille évaluation préliminaire) ;
5. **Huit à douze flashcards** prêtes pour SM-2.

Le professeur passe en revue, ajuste, décoche les éléments non pertinents, puis clique « Publier ». Le système crée alors atomiquement les entités correspondantes en base de données. **Le gain de temps est massif** : ce qui aurait nécessité plusieurs heures de travail manuel (rédaction de QCM, identification d'objectifs d'apprentissage, conception d'un cas Prosit, génération de flashcards) se produit en quelques minutes de validation.

### 5.2.4 Path Builder et Outcomes — scénarisation pédagogique

Pour aller au-delà de l'enchaînement linéaire vidéo → QCM, le professeur peut utiliser deux pages spécialisées :

- **`/professor/courses/:id/path-builder`** : éditeur de **parcours scénarisé** (composant `LearningPathBuilder.jsx`). Le parcours est une suite ordonnée d'étapes hétérogènes (vidéo, QCM, Prosit, lecture) avec critères de déverrouillage configurables (par exemple : « QCM 1 doit être réussi à 50 % minimum pour débloquer la vidéo 2 »). Le mode *brouillon* / *publié* permet au prof de préparer son module sans qu'il soit immédiatement visible aux étudiants. Un bouton « Aperçu étudiant » affiche un *preview* du rendu côté élève.

- **`/professor/courses/:id/outcomes`** : éditeur des **objectifs d'apprentissage** Bloom (page refondue avec un encart pédagogique « À quoi sert cette page ? » suite aux retours de tests utilisateurs). Chaque objectif est typé sur l'un des six niveaux Bloom et peut être lié aux vidéos qui le couvrent. Le **contrat pédagogique** Markdown est édité dans la même page, avec trois templates pré-remplis cliquables (*Cours classique*, *Cours collaboratif*, *Cours intensif*) pour réduire la charge de la page blanche.

### 5.2.5 Tracking — suivi individualisé

La page **`/professor/tracking`** présente le suivi détaillé étudiant par étudiant. Pour chaque étudiant inscrit aux cours du professeur, sont affichés : sa progression par cours, ses scores QCM, les vidéos non encore vues. Trois actions ciblées sont disponibles :

- **Rappel global** : envoie un rappel à toute la promotion ;
- **Rappel ciblé** : envoie un rappel à un étudiant spécifique sur un élément précis (vidéo, QCM) ;
- **IA** : ouvre la modale `StudentSuggestionModal.jsx` qui appelle le service `teacherInsights.js` et présente un mini-plan d'action personnalisé pour l'étudiant en question (forces, points faibles, trois actions recommandées).

### 5.2.6 Création de Prosit et Projet

Les pages **`/prosits/new`** et **`/professor/projects/create`** permettent au professeur de créer respectivement un Prosit ou un Projet à partir d'un formulaire structuré.

Pour les Projets, un bouton **« Partir d'un template »** ouvre la bibliothèque de quatorze templates officiels seedés (5 ISIL, 3 Management, 3 Finance, 3 PFE), avec énoncé contextualisé Algérie quand pertinent, phases pré-remplies adaptées au type, rubric d'évaluation suggérée. Le professeur peut tout éditer après l'instanciation.

Pour chaque phase saisie ou pré-remplie, un **accordéon repliable « Conditions de déblocage »** offre la configuration des règles `unlockRules` (cf. § 4.2.3 et UC 3.4.7) : multi-sélections des chapitres requis et des cas pratiques requis (chargés dynamiquement depuis le module sélectionné via `GET /api/courses/:id/chapters` et `GET /api/cas-pratiques?courseId=:id`), drapeaux *toutes obligatoires* / *au moins une suffit*, et sélecteur du cas pratique source pour autoriser l'import du livrable précédent. Une **validation côté front** détecte le cas où le `sourceCasPratiqueId` n'est pas inclus dans `casPratiqueIds` et affiche un message rouge explicite tout en bloquant la soumission, garantissant la cohérence des règles avant persistance.

### 5.2.7 Matrice de progression projet — vue prof

En bas de chaque page de détail Projet, le professeur (uniquement) consulte la **matrice de progression** des étudiants inscrits, composant `PhasesProgressionMatrix.jsx` (cf. UC 3.4.10). Une table croise étudiants (lignes, dédupliquées via `Map` car un étudiant peut figurer dans plusieurs groupes, ce qui ne devrait pas se produire en pratique mais est défensif) et phases (colonnes), avec dans chaque cellule une pastille colorée matérialisant les cinq états (✅ validated, ⚠️ submitted, 🟡 in-progress, 🔓 unlocked, 🔒 locked). Un compteur synthétique en en-tête affiche *« N étudiants inscrits · M actifs sur K phases »*. Sur écran mobile (≤ 720 px), la table bascule en une suite de cartes par étudiant grâce à une *media query* CSS embarquée dans le composant — conformément à l'exigence ENF-ERGO-3 d'adaptation au mobile.

Cette matrice répond directement à la critique fréquente des dispositifs PBL : la difficulté pour l'enseignant de discerner, dans un travail collectif, l'engagement et la progression individuelle de chaque membre (Helle, Tynjälä, & Olkinuora, 2006). En offrant une visibilité homogène en lecture, elle équilibre l'expérience d'évaluation et facilite les interventions ciblées (relance d'un étudiant en *locked* depuis trop longtemps, validation d'une soumission en *submitted*, retour individuel sur un *in-progress*).

### 5.2.8 Gestion QCM et badges

Les pages **`/professor/qcm`** (hub de tous les QCM) et **`/professor/badges`** complètent l'arsenal du professeur. Le hub QCM permet la création standalone (sans vidéo associée) ou à partir d'une vidéo existante. La page Badges propose la création de badges custom (titre, description, condition de déblocage, rareté Common/Rare/Épique/Légendaire) et l'attribution manuelle à un étudiant spécifique.

## 5.3 Interface administrateur

L'interface admin (page **`/admin`** avec navigation par sections) est volontairement plus dense que les interfaces étudiant et professeur, puisqu'elle s'adresse à un utilisateur expert dont la mission est la **gestion globale** du système.

Huit onglets organisent les fonctionnalités : *Vue d'ensemble*, *Utilisateurs*, *Cours*, *Messages*, *Activité*, *Inscriptions*, *Support*, *Récompenses*.

### 5.3.1 Vue d'ensemble

Le tableau de bord d'entrée présente quatre **cartes de statistiques globales** (Utilisateurs total, Cours, Vidéos, Messages) avec indicateurs de tendance (+ X % par rapport à la semaine précédente), un **graphique des inscriptions** par jour de la semaine, une **répartition par rôle** (Étudiant / Professeur / Admin avec pourcentages), et deux boutons rapides « Créer un utilisateur » et « Créer un cours ».

### 5.3.2 Section *Inscriptions* — workflow d'approbation

L'onglet *Inscriptions* est central pour la gestion des nouvelles inscriptions. Le composant `PendingUsersSection` y liste tous les utilisateurs au statut `pending`, avec pour chacun : prénom, nom, email, rôle demandé, filière, promotion, date de demande. Pour chaque candidat, deux boutons :

- **Approuver** : passe le `status` à `'active'`, déclenche l'envoi d'un email de bienvenue à l'utilisateur via le service `emailService.js` (avec fallback Brevo → Resend → Gmail).
- **Rejeter** : ouvre une modale demandant un motif optionnel, passe le `status` à `'rejected'`, déclenche l'envoi d'un email d'explication.

Lorsque la liste est vide, le composant affiche un message rassurant (« Aucune inscription en attente. 🎉 ») avec un bouton « Rafraîchir » manuel.

### 5.3.3 Sections complémentaires

- **Utilisateurs** (37 actuellement seedés) : liste paginée avec recherche, filtres par rôle, actions create/edit/désactiver/supprimer (avec garde-fou : impossible de supprimer un autre admin ou soi-même).
- **Cours** (29 seedés) : gestion globale, possibilité de créer un cours pour le compte d'un professeur.
- **Messages** (50 derniers visibles) : modération du chat, possibilité de supprimer un message inapproprié.
- **Activité** : journal d'événements globaux du système.
- **Support** : liste des tickets utilisateur avec statuts (pending, in-progress, closed).
- **Récompenses** : liste des `RewardClaim` à approuver, avec filtres par statut (pending, approved, delivered, rejected).

## 5.4 Workflow démontré : parcours étudiant complet

Pour illustrer la cohérence opérationnelle de l'ensemble, ce paragraphe restitue un workflow type complet, traversant les cinq étapes du Cycle d'Apprentissage Inversé sur le module Cybersécurité.

**Acteur** : Assil SERAY, étudiant L3 ISIL.
**Module** : Cybersécurité (3 vidéos, 3 QCM, 1 Prosit, 1 Projet associés).

**Lundi 09h00 — Étape 1 (Préparation)**
Notification email + in-app : « Nouveau cours Cybersécurité disponible. Première vidéo : *Les bases de la cybersécurité* ». Assil se connecte sur FlipLearn (URL accessible en 3G/4G, chargement initial < 3 secondes). Il accède à la page *Mon Parcours*, voit que pour Cybersécurité aucune étape n'est commencée. Il clique « Continuer » et arrive sur la page du cours. Il ouvre la première vidéo, la regarde à 100 %. À 80 % de visionnage le QCM se déverrouille. Il passe le QCM, obtient 80 %. Il gagne 20 + 8 = 28 XP. La page *Mon Parcours* affiche maintenant l'étape 1 partiellement complétée (1 vidéo / 3, 1 QCM / 3 réussi).

**Mardi 10h00 — Étape 2 (Rendez-vous présentiel)**
Pendant ce temps, son professeur Mr Saadi consulte la page *Préparation classe* le matin du cours. Il voit que sur les 18 étudiants inscrits, 12 ont vu la vidéo et passé le QCM, 4 ont vu la vidéo sans faire le QCM, 2 n'ont rien fait. Il clique « Envoyer rappel aux 2 non préparés », message pré-rempli, validation. Les 2 étudiants reçoivent une notification in-app + un email. En cours, le professeur sait que 16/18 étudiants sont au moins partiellement préparés. Il commence par un mini-débat de 15 minutes sur la triade CIA (concept que les insights IA ont identifié comme le plus mal compris au QCM), puis enchaîne sur un atelier pratique de cassage de hashs MD5 vs SHA-256.

**Mardi-Mercredi-Jeudi — Étape 1 suite (consolidation Préparation)**
Assil continue de regarder les deux autres vidéos du module et passe les deux QCM correspondants. À chaque action, ses XP, sa progression du cycle et son streak quotidien augmentent. Le streak passe à 4 jours consécutifs.

**Vendredi 14h00 — Étape 3 (Application — début du Prosit)**
Le professeur lance le Prosit *Sécuriser une application web (OWASP)* en phase Aller. Le système compose automatiquement les groupes en respectant la rotation des rôles (Assil n'a encore jamais été *Secrétaire* sur les Prosits précédents, il est donc prioritairement assigné à ce rôle). Notification in-app : *« Tu as été assigné au groupe Alpha pour le Prosit OWASP, rôle : Secrétaire »*. La séance présentielle de 1h se déroule, Assil note les contributions de ses coéquipiers.

**Semaine suivante — Étape 3 (Application — phase Recherche)**
Pendant 7 jours, chaque membre soumet ses contributions individuelles. Assil documente la partie SQL Injection. À mi-parcours, un membre se sent bloqué et active le coach IA (feature F7, branche `main`) qui lui suggère trois sources documentaires fiables et une reformulation du problème.

**Jeudi suivant — Étape 3 (Application — phase Retour + évaluation)**
Le groupe présente son cas au professeur en 30 minutes. Le professeur évalue selon la rubric (note 14/20). Le Prosit passe en `evalue`. Pendant 3 jours, chaque membre évalue ses pairs sur les 5 critères standardisés (anonyme par défaut). La note finale d'Assil est calculée : 0.7 × 14 + 0.3 × moyenne pairs (16/20) = 14.6/20.

**Pendant tout ce temps — Étape 5 (Consolidation)**
Au fur et à mesure du visionnage des vidéos du module, le système (cron F6, branche `main`) génère automatiquement des decks de flashcards par cours (« Cybersécurité — auto », 8 cartes). Assil les révise selon SM-2 quand le widget Dashboard l'invite (« 🃏 5 cartes à réviser aujourd'hui »).

**Mois suivant — Étape 4 (Production)**
En parallèle des Prosits, un Projet plus long *Audit OWASP d'une application e-commerce algérienne* a été lancé sur tout le module. Assil et son groupe travaillent sur 3 phases (recherche, audit, présentation), soumettent leurs livrables progressivement. Le professeur évalue le rendu final selon la rubric. Note projet : 16/20.

**Bilan du cycle pour Assil**
À l'issue du module : 5 étapes complétées, `cycleProgress: 100%`. Engagement Score (V2 du concept post-soutenance) calculé selon les pondérations (30 + 20 + 25 + 15 + 10) = 100. Plusieurs badges débloqués (« Animateur né » s'il a déjà été Animateur dans 3 Prosits, « Assidu » pour 5 vidéos terminées, etc.).

## 5.5 Métriques d'usage observées

Sur l'environnement de démonstration (cluster MongoDB Atlas M0, données seedées), les métriques suivantes ont été observées au moment de la rédaction de ce mémoire :

**Tableau 5.1 — Métriques d'usage de l'environnement démo**

| Métrique | Valeur | Détail |
|---|---|---|
| Utilisateurs total | 37 | dont 21 étudiants, 15 professeurs, 1 admin |
| Cours créés | 29 | répartis sur les 9 promotions (3 filières × 3 niveaux) |
| Vidéos publiées | 62 | environ 6-8 vidéos par cours |
| QCM créés | ~30 | environ 1 QCM par vidéo principale |
| Prosits créés | 5 | dont 2 sur Cybersécurité, 1 sur IA, 1 sur Web, 1 sur Management |
| Projets créés | 4 | 1 PFE collaboratif Tech+Management+Finance, 3 mono-modules |
| Templates Projet seedés | 14 | 5 ISIL + 3 Management + 3 Finance + 3 PFE |
| Messages chat | 100+ | sur l'ensemble des salons cours et privés |
| Notifications créées | 16 (par étudiant en moyenne) | mix rappels, badges, mentions |
| Endpoints API | ~120 | regroupés par module fonctionnel |
| Taille DB | ~17 Mo | sur cluster M0 (limite 512 Mo) |
| Latence API moyenne | < 500 ms | mesurée sur Render free tier |
| Latence appels Groq | ~2 s | par requête (8000 tokens entrée typique) |
| Coût mensuel total | < 1 USD | essentiellement OpenAI Whisper + GPT-4o sur nouvelles vidéos |

Ces chiffres, bien que modestes au regard d'un déploiement réel à l'échelle de l'EM Alger (qui mobiliserait plusieurs milliers d'étudiants), démontrent la **viabilité économique** et **opérationnelle** du dispositif. L'architecture est prête à monter en charge sans changements structurels majeurs : le passage à un cluster MongoDB Atlas M10 (autour de 60 USD/mois) permettrait de supporter plusieurs milliers d'utilisateurs simultanés, et le tier Cloudinary plus généreux (90 USD/mois pour le plan Plus) absorberait sans difficulté l'ensemble des vidéos pédagogiques d'une école entière.

---

> *Note de fin de chapitre.* Le chapitre 5 a documenté les résultats opérationnels du travail. Le chapitre 6 va maintenant rendre compte de la stratégie d'évaluation mise en œuvre pour valider ces résultats : tests automatisés et tests utilisateurs.
