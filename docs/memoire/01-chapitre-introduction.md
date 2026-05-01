# Chapitre 1 — Introduction

## 1.1 Contexte

L'enseignement supérieur algérien traverse une période de transformation accélérée dont les contours sont redessinés simultanément par trois dynamiques convergentes : la massification continue des effectifs étudiants, l'imposition progressive des outils numériques dans la pratique pédagogique quotidienne, et la réflexion ouverte par la pandémie de COVID-19 sur la valeur ajoutée réelle du présentiel. Ces trois forces conjuguées rendent inopérant, à terme, le format historique du cours magistral linéaire et invitent à repenser en profondeur la chaîne d'apprentissage.

L'**École des Hautes Études Commerciales d'Alger (EM Alger Business School)**, où s'inscrit le présent travail, illustre concrètement cette tension. Ses trois filières principales — **Ingénierie des Systèmes d'Information et du Logiciel (ISIL)**, **Management**, **Finance & Comptabilité** — accueillent des promotions denses (cohortes de cinquante à quatre-vingts étudiants par niveau) où les enseignants peinent à individualiser leur attention. Les outils numériques actuellement en usage dans l'établissement se limitent pour l'essentiel à des solutions génériques (suites bureautiques en ligne, plateformes de visioconférence, dépôt asynchrone de documents), sans intégration cohérente d'un cycle pédagogique structuré.

Dans ce paysage, la **classe inversée** (*flipped classroom*) constitue l'une des réponses les plus éprouvées au plan international. Théorisée et popularisée par les enseignants américains Jonathan Bergmann et Aaron Sams à partir de 2007 dans leur ouvrage de référence *Flip Your Classroom: Reach Every Student in Every Class Every Day* (Bergmann & Sams, 2012), elle propose une inversion radicale de la séquence pédagogique : la **transmission de contenu** (qui constituait le cœur du cours magistral) est déportée à la maison sous forme de vidéos courtes que l'étudiant consomme à son rythme, tandis que le **temps en classe** est intégralement consacré aux activités à forte valeur ajoutée que la machine ne sait pas produire — résolution de problèmes en groupe, débat, expérimentation, accompagnement individualisé du professeur. La promesse est triple : permettre à chaque étudiant d'avancer à son propre rythme dans la phase de transmission, libérer du temps de présentiel pour la pratique active, et donner à l'enseignant une visibilité fine sur les acquis réels de chaque apprenant.

Cette inversion est cependant difficile à opérationnaliser sans outillage adapté. Trois écueils sont systématiquement rapportés dans la littérature et confirmés par les expériences locales : (a) l'**absence de mécanisme contraignant le visionnage préalable** des vidéos, qui aboutit à ce qu'une fraction importante de la classe arrive en présentiel sans préparation et que le professeur soit contraint, faute d'alternative, de redonner le cours magistral en classe ; (b) l'**invisibilité pour le professeur** de l'état réel de préparation de chaque étudiant, qui empêche d'adapter la séance présentielle aux blocages effectifs ; (c) la **fragmentation des outils** mobilisés (un service pour les vidéos, un autre pour les QCM, un troisième pour le chat, etc.), qui multiplie la charge cognitive de l'étudiant comme du professeur sans créer de fil conducteur pédagogique.

Ces trois écueils définissent l'espace problème que le présent travail entreprend de couvrir. Ils sont complétés par une **opportunité technologique récente** dont l'ampleur n'a pas encore été pleinement exploitée par les solutions e-learning existantes : la disponibilité, depuis 2024, de modèles de langage open-source (notamment Llama-3.3-70B de Meta) servis en mode rapide via l'infrastructure d'inférence Groq, à un coût marginal effectivement nul pour des volumes comparables à ceux d'un projet pédagogique. Cette nouveauté transforme radicalement l'équation économique des outils d'IA en éducation : ce qui exigeait, en 2023 encore, un budget mensuel de plusieurs centaines de dollars en API GPT-4 (Mitchell et al., 2023, ont par exemple consommé l'équivalent de 5 000 USD de tokens pour leur évaluation de DetectGPT) devient en 2025 accessible à un projet étudiant individuel pour quelques dizaines de centimes mensuels.

C'est à l'intersection de ces trois dimensions — un besoin pédagogique réel et documenté localement, un cadre théorique éprouvé internationalement (la classe inversée), et une opportunité technologique qui rebat les cartes économiques de l'IA en éducation — que s'inscrit la conception et la réalisation de **FlipLearn**.

## 1.2 Revue de la littérature

### 1.2.1 La classe inversée (Bergmann & Sams, 2012 ; Bishop & Verleger, 2013)

Le concept de classe inversée trouve ses racines pratiques dans l'expérience de Bergmann et Sams, deux enseignants de chimie d'un lycée du Colorado qui, en 2007, commencent à enregistrer leurs cours en vidéo à destination de leurs élèves absents. Ils découvrent rapidement que les élèves présents préfèrent eux aussi visionner les vidéos chez eux et utiliser le temps en classe pour les exercices et questions. Leur ouvrage de 2012 systématise cette pratique en une méthodologie reproductible (Bergmann & Sams, 2012).

Une revue systématique de la littérature publiée par Bishop et Verleger (2013) dans les actes de l'*ASEE Annual Conference & Exposition* établit la définition désormais canonique de la classe inversée : *« an educational technique that consists of two parts: interactive group learning activities inside the classroom, and direct computer-based individual instruction outside the classroom »*. Cette définition fait explicitement deux exclusions : la simple mise en ligne d'enregistrements de cours magistraux ne constitue pas en soi une classe inversée, pas plus que l'usage d'activités collaboratives en présentiel sans préparation préalable individuelle.

Les méta-analyses ultérieures ont nuancé l'enthousiasme initial. Akçayır & Akçayır (2018), dans une méta-analyse couvrant 71 études publiées entre 2012 et 2017, identifient comme principal facteur d'échec des classes inversées le **non-visionnage des ressources préparatoires** par une proportion significative des étudiants : entre 30 % et 50 % selon les études, avec des conséquences en cascade sur la dynamique du présentiel et sur la motivation de l'enseignant à maintenir le dispositif. Ce constat empirique est central dans la formulation de notre problématique (cf. § 1.3) et oriente directement la conception du **Cycle d'Apprentissage Inversé** présenté en chapitre 4.

### 1.2.2 Alignement constructif (Biggs, 1996)

L'idée d'**alignement constructif** (*constructive alignment*) formulée par John Biggs dans la revue *Higher Education* (Biggs, 1996) constitue le socle conceptuel sur lequel s'articule la cohérence pédagogique d'un module d'enseignement. Biggs établit qu'un dispositif pédagogique n'est efficace que lorsque trois éléments sont explicitement alignés : (a) les **objectifs d'apprentissage** formulés en termes de capacités observables, (b) les **activités d'enseignement** mobilisées pour développer ces capacités, (c) les **modalités d'évaluation** qui en mesurent l'atteinte effective. La rupture de cet alignement — le cas le plus fréquent étant celui d'objectifs ambitieux (*« comprendre les fondements de la cybersécurité »*) auxquels répondent des évaluations purement mémorielles (QCM de définitions) — produit ce que Biggs désigne comme la *surface learning* : un apprentissage de surface qui satisfait à l'évaluation mais ne transforme pas durablement les capacités de l'apprenant.

Anderson et Krathwohl (2001) ont par ailleurs révisé la **taxonomie des objectifs cognitifs** initialement proposée par Bloom (1956), produisant une grille à six niveaux désormais standard : *Mémoriser*, *Comprendre*, *Appliquer*, *Analyser*, *Évaluer*, *Créer*. Cette taxonomie révisée, qui place le verbe d'action et non plus le nom abstrait au cœur de chaque niveau, permet à l'enseignant d'expliciter avec précision la profondeur cognitive visée par chaque objectif d'apprentissage. Un module bien conçu mobilise typiquement plusieurs niveaux, allant croissant au fil du parcours.

FlipLearn intègre directement ce double cadre théorique dans la structure de données du modèle `Course` (champ `learningOutcomes` typé `LearningOutcome[]` avec attribut `bloomLevel`) ainsi que dans la mécanique du **contrat pédagogique** (champ `pedagogicalContract` au format Markdown), formalisant ainsi côté plateforme l'engagement réciproque enseignant/étudiants au sens où Biggs l'entend.

### 1.2.3 Apprentissage par problème — la méthode CESI/APP (Barrows, 1996)

Si la classe inversée règle la question du *contenu* (où et quand le transmettre), elle ne dit rien par elle-même sur les *activités* qui doivent occuper le temps présentiel ainsi libéré. Plusieurs méthodologies pédagogiques se proposent de combler cet espace. L'**Apprentissage Par Problème (APP)**, formalisé par Howard Barrows à l'École de médecine de l'Université McMaster dès les années 1960 (Barrows, 1996), est l'une des plus éprouvées : les étudiants y travaillent en petits groupes (typiquement 5 à 8 membres) sur un cas concret authentique dont la résolution mobilise les apprentissages théoriques visés.

La méthode se décline en plusieurs traditions. La tradition francophone des **écoles d'ingénieurs CESI** a notamment formalisé une variante structurée en trois phases — *Aller*, *Recherche*, *Retour* — articulant un travail de groupe initial (analyse collective du cas, formulation des hypothèses, plan de recherche), une phase individuelle de documentation, et une restitution finale au tuteur enseignant. À chaque cas (désigné sous le terme **Prosit**), les étudiants endossent à tour de rôle l'un des cinq rôles de la méthode (*Animateur*, *Secrétaire*, *Scribe*, *Gestionnaire*, *Membre*), ce qui développe la polyvalence et empêche la cristallisation des dynamiques de groupe.

Cette méthodologie est implémentée intégralement dans FlipLearn via le modèle `Prosit` (champs `status` à six valeurs incluant les trois phases, `groupes[].membres[].role` typé sur l'enum CESI à cinq valeurs, mécanique de rotation prioritaire des rôles non encore endossés par chaque étudiant). Elle constitue l'**étape 3 — Application** du Cycle d'Apprentissage Inversé.

### 1.2.4 Évaluation par les pairs (Topping, 1998 ; Falchikov, 2005)

L'**évaluation par les pairs** (*peer assessment*) constitue un complément essentiel à l'évaluation enseignante dans les dispositifs collaboratifs, pour deux raisons principales. D'une part, elle permet de mesurer des dimensions comportementales (engagement dans le groupe, qualité de la coopération, écoute active) que l'enseignant ne peut pas observer en présentiel ponctuel. D'autre part, elle développe chez l'évaluateur lui-même des compétences de jugement et de réflexivité qui consolident son propre apprentissage (Falchikov, 2005, chap. 3).

Topping (1998) recense, dans une revue de 109 études, plusieurs précautions méthodologiques qu'un dispositif d'évaluation par les pairs doit intégrer pour éviter les biais classiques : anonymat par défaut (pour réduire la complaisance et le risque de représailles relationnelles), grille critériée explicite (pour objectiver l'évaluation), pondération raisonnable de la note des pairs dans la note finale (entre 20 % et 40 % selon les études, avec un consensus autour de 30 %).

FlipLearn implémente ces recommandations dans le modèle `Prosit` (sous-documents `peerAssessmentSchema` avec champ `isAnonymous` à `true` par défaut, grille `peerAssessmentCriteria` à cinq critères standardisés, calcul de la note finale via la formule **70 % note professeur + 30 % note pairs**).

### 1.2.5 Mémorisation et révision espacée (Ebbinghaus, 1885 ; Wozniak, 1990)

Les travaux pionniers d'Hermann Ebbinghaus (1885) sur la mémoire ont établi expérimentalement la **courbe de l'oubli** : la rétention d'une information apprise décroît selon une courbe exponentielle décroissante, dont seule la répétition espacée à intervalles croissants permet d'inverser la pente. Plus d'un siècle après ces travaux, Piotr Wozniak a formalisé en 1990 l'algorithme **SuperMemo 2 (SM-2)**, qui calcule pour chaque carte mémoire l'intervalle optimal avant la prochaine révision en fonction de la difficulté ressentie par l'apprenant lors de la révision précédente. Cet algorithme demeure aujourd'hui la référence des applications de flashcards (Anki, Quizlet, et désormais FlipLearn).

L'implémentation FlipLearn (modèle `Card`, champs `interval`, `easeFactor`, `repetitions`, `nextReview`) reproduit fidèlement la formule originale de Wozniak. Cette mécanique constitue l'**étape 5 — Consolidation** du Cycle d'Apprentissage Inversé, garantissant que les concepts vus en cours, retravaillés en QCM, appliqués en Prosit puis synthétisés en Projet, sont enfin ancrés en mémoire long terme par révision espacée.

### 1.2.6 Apports de l'IA générative en éducation (2024-2026)

L'évolution rapide des modèles de langage open-source — au premier rang desquels la famille **Llama 3.x de Meta** — a profondément modifié, entre 2024 et 2026, le paysage de l'IA en éducation. Là où les modèles propriétaires (GPT-4 d'OpenAI, Claude d'Anthropic) restaient économiquement prohibitifs pour un déploiement éducatif à grande échelle, l'apparition de **Groq comme infrastructure d'inférence ultra-rapide** (latence typique de 2 secondes pour une requête de 8 000 tokens, contre 15 à 30 secondes pour les services comparables) a rendu accessible aux projets étudiants des pipelines IA jusqu'alors réservés à la recherche académique : RAG (*Retrieval-Augmented Generation*), agents multi-tâches, planification socratique.

FlipLearn s'inscrit pleinement dans cette dynamique. Sept agents IA distincts mobilisent le modèle `llama-3.3-70b-versatile` via l'API Groq, sans coût marginal au-delà des quotas gratuits :
- le **tuteur IA personnel** (méthode socratique, refus systématique de donner les réponses des QCM) ;
- l'**auto-préparation de cours** (cinq appels parallèles via `Promise.allSettled` pour générer simultanément résumé, QCM, questions in-vidéo, idées de Prosit, flashcards) ;
- la **génération de QCM** depuis transcript vidéo ;
- la **détection de plagiat IA** dans les contributions Prosit (heuristique de perplexité inspirée de Mitchell et al., 2023, *DetectGPT*) ;
- la **génération d'insights pédagogiques** pour le professeur ;
- le **coach IA anti-blocage** sur les Prosits actifs ;
- le **briefing classe** qui agrège les verbatim du Pulse Préparation et identifie les blocages dominants.

À ces sept agents s'ajoutent deux services OpenAI (Whisper pour la transcription audio des vidéos, GPT-4o pour l'analyse multimodale du contenu visuel), formant un total de **neuf intégrations IA** dans la plateforme.

### 1.2.7 Plateformes existantes et limites

Le marché des plateformes e-learning est pléthorique mais se structure autour de quelques familles archétypales, dont aucune ne couvre intégralement le besoin que FlipLearn entend adresser.

**Tableau 1.1 — Comparatif des principales plateformes e-learning**

| Plateforme | Force principale | Limite par rapport à FlipLearn |
|---|---|---|
| **Moodle** | Standard de fait dans l'enseignement supérieur, open-source, riche en plug-ins | Pas de cycle pédagogique unifié ; UI datée ; aucune intégration IA native ; pas pensé pour la classe inversée |
| **Coursera / edX** | Catalogue massif de cours certifiants, production vidéo professionnelle | Modèle MOOC, pas adapté à un module d'université locale ; tarification premium ; pas de personnalisation institutionnelle |
| **Khan Academy** | Vidéos courtes très réussies, gratuit, large couverture niveau secondaire | Centré sur l'autoformation individuelle, pas sur un cycle classe inversée formalisé ; pas d'outils enseignant |
| **Edpuzzle** | Spécialisé dans l'enrichissement de vidéos par questions interactives | Limité à la dimension vidéo ; pas de Prosits, pas de projets, pas de tuteur IA |
| **Google Classroom** | Intégration suite Google, gratuit pour l'éducation | Outil de gestion de devoirs, pas une plateforme pédagogique structurée |

Aucune de ces plateformes ne propose simultanément : (a) un cycle pédagogique structuré matérialisé dans l'interface, (b) une intégration native d'agents IA spécialisés, (c) une adaptation explicite au contexte universitaire algérien (méthode CESI/APP, 3G/4G, classes denses). C'est cet espace vacant que FlipLearn entreprend d'occuper.

## 1.3 Problématique

L'analyse du contexte (§ 1.1) et la revue de la littérature (§ 1.2) convergent vers une problématique formulable en une phrase : **comment opérationnaliser, dans le contexte de l'enseignement supérieur algérien, un dispositif de classe inversée qui résolve simultanément le problème du non-visionnage des ressources préparatoires, l'invisibilité pour l'enseignant de l'état de préparation effectif de la classe, et la fragmentation des outils mobilisés ?**

Cette problématique se décline en quatre questions de recherche subordonnées :

**Q1 — Quel cadre conceptuel** permet de structurer en un cycle cohérent l'ensemble des activités pédagogiques d'un module en classe inversée, depuis la préparation individuelle jusqu'à la consolidation à long terme ?

**Q2 — Quelle architecture technique** permet de matérialiser ce cycle dans une plateforme web utilisable à la fois par les étudiants et par les enseignants, sans requérir d'équipement spécialisé en présentiel ?

**Q3 — Comment les agents d'IA générative peuvent-ils être mobilisés** au service de ce cycle, en assistant l'enseignant dans la préparation et le suivi sans pour autant déposséder l'étudiant de son apprentissage ?

**Q4 — Comment évaluer empiriquement** la pertinence d'un tel dispositif dans le cadre d'un projet de fin d'études, c'est-à-dire avec un échantillon d'utilisateurs réduit et un horizon temporel limité à quelques mois ?

## 1.4 Objectifs et orientation de la recherche

À partir de la problématique formulée ci-dessus, les **objectifs** de ce travail se structurent en trois niveaux :

**Objectif principal** : Concevoir, développer et évaluer une plateforme web complète opérationnalisant un dispositif de classe inversée structuré pour l'enseignement supérieur algérien, intégrant des agents d'IA générative et adaptée aux contraintes locales de connectivité et de taille de classe.

**Objectifs spécifiques** (six, déclinés des questions de recherche) :

1. **Théoriser** un cadre conceptuel original — le *Cycle d'Apprentissage Inversé* — articulant en cinq étapes obligatoires les composantes d'un module pédagogique inversé, en s'appuyant sur la littérature existante (Q1).

2. **Concevoir** une architecture logicielle web modulaire trois couches (front-end React, back-end Node.js/Express, base MongoDB) suffisamment flexible pour héberger les cinq étapes du cycle sans coupling excessif entre fonctionnalités (Q2).

3. **Réaliser** l'intégralité de l'application web, incluant les interfaces des trois rôles utilisateurs (étudiant, professeur, administrateur) et les sept agents d'IA générative (Q2, Q3).

4. **Implémenter** une mécanique de gamification non-coercitive (streaks, niveaux, quêtes hebdomadaires) compatible avec la théorie de l'autodétermination de Deci & Ryan (1985), pour soutenir la motivation intrinsèque des étudiants sans la dégrader par des récompenses extrinsèques mal calibrées (Q3).

5. **Tester** le système par une combinaison de tests automatisés ciblés (52 tests *smoke* couvrant les fonctions critiques) et d'un protocole d'évaluation utilisateur standardisé conduit auprès de cinq étudiants L3 ISIL et d'une enseignante (Q4).

6. **Documenter** l'ensemble du travail dans un mémoire académique conforme au guide de rédaction du Prof. Kimour Mohamed Tahar (EM Alger, 2026), accompagné de huit documents techniques compagnons publiés sur le dépôt GitHub du projet (Q4).

## 1.5 Approche méthodologique

L'approche méthodologique mobilisée pour ce travail combine quatre démarches complémentaires.

**Démarche 1 — Revue de littérature itérative.** La revue présentée en § 1.2 n'a pas été menée en bloc en début de projet, mais de manière itérative au fur et à mesure que les fonctionnalités étaient conçues : chaque ajout fonctionnel majeur (Prosits, peer assessment, flashcards SM-2, etc.) a été précédé d'une recherche bibliographique ciblée pour ancrer le choix d'implémentation dans la littérature existante. Cette démarche garantit que le code lui-même cite directement ses sources théoriques (commentaires `@see` dans les modèles Mongoose), produisant un mémoire dont les citations sont vérifiables ligne par ligne dans le code source publié.

**Démarche 2 — Développement agile en sprints courts.** Le projet a été développé sur l'année universitaire 2025-2026 selon une logique de sprints d'une à deux semaines, chacun se concluant par un commit Git versionné et un déploiement automatisé sur l'environnement de production (Render + Vercel). Cette cadence a permis d'incorporer en continu les retours utilisateurs (familiers, camarades de promotion, encadrante) et de pivoter quand nécessaire (notamment l'abandon, en avril 2026, de la branche TensorFlow initialement prévue pour la prédiction d'échec étudiant, au profit d'une centration sur les agents IA conversationnels jugés plus défendables et plus utiles).

**Démarche 3 — Tests utilisateurs structurés.** Au-delà des tests automatisés, une **évaluation utilisateur** a été conduite début mai 2026 selon un protocole standardisé (cf. chapitre 6) : huit tâches typiques du parcours étudiant, dix tâches typiques du parcours professeur, observation de l'accomplissement par l'utilisateur, recueil de verbatim sur les blocages et points positifs, débrief structuré. Les cinq étudiants et l'enseignante recrutés ont fourni un matériau qualitatif riche qui a directement nourri une dernière itération de polish UX avant la soutenance.

**Démarche 4 — Documentation continue et publique.** L'ensemble de la production documentaire a été versionnée sur GitHub au fur et à mesure de l'avancement, dans un dossier dédié `docs/`. Cette documentation, organisée en huit fichiers thématiques (architecture, modèle de données, référence API, décisions techniques sous forme d'ADR, stratégie de tests, features MVP, features extensions, script de soutenance), constitue à la fois un complément technique au présent mémoire et un témoignage de la rigueur méthodologique mobilisée.

Cette quadruple démarche se veut explicitement **reproductible** : un autre étudiant en informatique pourrait, à partir du dépôt public, reprendre le projet, comprendre les décisions de conception et les étendre — ce qui correspond à la définition même d'un travail académique de qualité dans le champ de l'ingénierie logicielle (Wieringa, 2014, *Design Science Methodology*).

## 1.6 Structure du mémoire

Le présent mémoire s'organise en sept chapitres principaux, conformes à la structure-type imposée par le Guide de rédaction de mémoire en informatique du Prof. Kimour Mohamed Tahar (EM Alger, 2026).

Le **Chapitre 1**, dont la lecture s'achève ici, a établi le contexte du projet, restitué les fondements théoriques mobilisés via une revue de la littérature en sciences de l'éducation, formulé la problématique adressée et précisé les objectifs poursuivis ainsi que l'approche méthodologique retenue.

Le **Chapitre 2 — Technologies appliquées** détaille la stack technique mobilisée pour la réalisation de la plateforme. Y sont successivement présentés les outils de développement (Git, Visual Studio Code, Claude Code), le front-end (React 18, Vite, Tailwind CSS, Recharts), le back-end (Node.js, Express, Socket.io, JWT), la base de données (MongoDB Atlas avec ODM Mongoose), les agents d'intelligence artificielle (Groq Llama-3.3-70B, OpenAI Whisper et GPT-4o), et les services d'hébergement et de déploiement (Cloudinary, Render, Vercel).

Le **Chapitre 3 — Analyse du système** identifie les trois acteurs principaux (étudiant, professeur, administrateur) et leurs périmètres fonctionnels respectifs, puis détaille les exigences fonctionnelles et non fonctionnelles auxquelles la plateforme doit répondre.

Le **Chapitre 4 — Conception du système** présente la conception détaillée de la plateforme : architecture globale en trois couches, modèle de données réparti sur vingt-cinq collections MongoDB regroupées en six domaines thématiques, schéma pédagogique du **Cycle d'Apprentissage Inversé** en cinq étapes (cœur conceptuel original du projet), diagrammes UML (cas d'utilisation, séquence, classes, déploiement) et design des principales interfaces utilisateur.

Le **Chapitre 5 — Résultats** documente les interfaces effectivement réalisées, illustrées par les principaux écrans des trois rôles utilisateurs (étudiant, professeur, administrateur) et par un workflow type démontrant la circulation de l'information à travers les cinq étapes du cycle d'apprentissage. Il présente également les métriques d'usage observées sur l'environnement de démonstration.

Le **Chapitre 6 — Tests système** rend compte de la stratégie d'évaluation mise en œuvre : philosophie générale (pyramide de tests inversée pour un projet solo), tests automatisés (52 tests *smoke* couvrant les fonctions critiques), tests utilisateurs (cinq étudiants L3 ISIL et une enseignante), et métriques de qualité obtenues.

Le **Chapitre 7 — Conclusion** dresse le bilan critique du travail réalisé, identifie honnêtement les limites du projet (vidéos seedées dépendantes d'un service tiers pour la démonstration, validation empirique limitée à un faible échantillon, absence de comparaison contrôlée avec une plateforme témoin), et trace plusieurs pistes d'évolution post-soutenance susceptibles d'enrichir le travail dans le cadre d'études ultérieures (Master, doctorat) ou d'un transfert technologique vers l'EM Alger.

Le mémoire se termine par les **références bibliographiques** (dix-huit publications scientifiques citées au fil du texte) et par les **annexes** (extraits de code significatifs, captures d'écran complémentaires, questionnaire de tests utilisateurs).

---

> *Note de fin de chapitre.* Ce premier chapitre a posé les fondations conceptuelles du travail. Il revient désormais au chapitre 2 d'en présenter les fondations techniques.
