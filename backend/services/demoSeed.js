/**
 * demoSeed.js — Remplit la DB avec du contenu réel pour démo PFE :
 *   - 9 QCMs (1 par cours-clé) avec questions pédagogiques en dur
 *   - 18 ressources externes (PDFs, liens officiels)
 *   - 6 projets mono-module avec énoncés, mots-clés, phases et checklist
 *     (structure inspirée de la méthodologie Prosit — sera migrée vers le
 *      module Prosit dédié quand celui-ci sera réintroduit)
 *   - 4 projets multi-modules (3 mono-filière + 1 collaboratif multi-modules)
 *
 * Idempotent : ne duplique pas (matche par titre / relationship).
 * Appelé une fois au boot après contentSeed.
 */

import User from '../models/User.js';
import Course from '../models/Course.js';
import Video from '../models/Video.js';
import QCM from '../models/QCM.js';
import Resource from '../models/Resource.js';
import Project from '../models/Project.js';

/* ═══════════════════════════════════════════════════════════════════════
   QCMs — 5 questions par cours clé
═══════════════════════════════════════════════════════════════════════ */
const QCM_DEFS = [
  {
    courseTitre: 'Algorithmique & Programmation',
    videoTitre: 'Qu\'est-ce qu\'un algorithme ?',
    qcmTitre: 'QCM — Bases de l\'algorithmique',
    questions: [
      {
        texte: "Qu'est-ce qu'un algorithme ?",
        options: { A: 'Un programme compilé', B: 'Une suite finie d\'instructions pour résoudre un problème', C: 'Un langage de programmation', D: 'Un type de fichier' },
        correctAnswer: 'B',
        explanation: 'Un algorithme est une suite finie et ordonnée d\'instructions qui résout un problème donné.',
      },
      {
        texte: "Quelle est la complexité d'un tri fusion ?",
        options: { A: 'O(n)', B: 'O(n²)', C: 'O(n log n)', D: 'O(log n)' },
        correctAnswer: 'C',
        explanation: 'Le tri fusion a une complexité de O(n log n) dans tous les cas grâce à sa structure diviser-pour-régner.',
      },
      {
        texte: 'Que retourne une fonction en Python si aucun return explicite ?',
        options: { A: '0', B: 'false', C: 'None', D: 'Erreur' },
        correctAnswer: 'C',
        explanation: 'En Python, une fonction sans return explicite retourne None par défaut.',
      },
      {
        texte: 'Quelle structure permet d\'exécuter du code tant qu\'une condition est vraie ?',
        options: { A: 'if/else', B: 'while', C: 'switch', D: 'return' },
        correctAnswer: 'B',
        explanation: 'La boucle while exécute son bloc tant que la condition reste vraie.',
      },
      {
        texte: "Qu'est-ce que le pseudocode ?",
        options: { A: 'Un langage exécutable', B: 'Une description d\'algorithme en langage naturel structuré', C: 'Du code crypté', D: 'Un code compilé' },
        correctAnswer: 'B',
        explanation: 'Le pseudocode permet de décrire un algorithme sans syntaxe stricte, pour se concentrer sur la logique.',
      },
    ],
  },
  {
    courseTitre: 'Structures de données',
    videoTitre: 'Listes chaînées',
    qcmTitre: 'QCM — Structures de données',
    questions: [
      {
        texte: 'Quelle structure fonctionne en LIFO (Last In, First Out) ?',
        options: { A: 'File', B: 'Liste chaînée', C: 'Pile', D: 'Arbre binaire' },
        correctAnswer: 'C',
        explanation: 'La pile (stack) suit le principe LIFO : le dernier élément empilé est le premier dépilé.',
      },
      {
        texte: 'Quelle est la complexité d\'un accès par index dans une liste chaînée ?',
        options: { A: 'O(1)', B: 'O(n)', C: 'O(log n)', D: 'O(n²)' },
        correctAnswer: 'B',
        explanation: 'Contrairement à un tableau, la liste chaînée nécessite un parcours séquentiel : O(n).',
      },
      {
        texte: 'Un arbre binaire de recherche (ABR) garantit quel ordre ?',
        options: { A: 'Fils gauche < racine < fils droit', B: 'Fils gauche > racine > fils droit', C: 'Aucun ordre', D: 'Ordre alphabétique' },
        correctAnswer: 'A',
        explanation: 'Dans un ABR, chaque nœud a les valeurs plus petites à gauche et plus grandes à droite.',
      },
      {
        texte: 'Qu\'est-ce qu\'une file (queue) ?',
        options: { A: 'FIFO : premier arrivé, premier sorti', B: 'LIFO', C: 'Accès aléatoire', D: 'Structure hachée' },
        correctAnswer: 'A',
        explanation: 'Une file suit le principe FIFO (First In, First Out), comme une file d\'attente.',
      },
      {
        texte: 'Quelle structure utilise un hash pour retrouver rapidement une valeur ?',
        options: { A: 'Arbre', B: 'Liste chaînée', C: 'Table de hachage', D: 'Pile' },
        correctAnswer: 'C',
        explanation: 'Les tables de hachage offrent un accès en O(1) en moyenne grâce à une fonction de hachage.',
      },
    ],
  },
  {
    courseTitre: 'Développement Web Full-Stack',
    videoTitre: 'JavaScript moderne',
    qcmTitre: 'QCM — Web moderne',
    questions: [
      {
        texte: 'Que signifie l\'acronyme API ?',
        options: { A: 'Application Programming Interface', B: 'Advanced Program Integration', C: 'Automated Process Interface', D: 'Asynchronous Page Integration' },
        correctAnswer: 'A',
        explanation: 'API = Application Programming Interface, une interface permettant à des logiciels de communiquer.',
      },
      {
        texte: 'En React, qu\'est-ce qu\'un composant fonctionnel ?',
        options: { A: 'Une classe qui hérite de Component', B: 'Une fonction JavaScript qui retourne du JSX', C: 'Un fichier CSS', D: 'Une base de données' },
        correctAnswer: 'B',
        explanation: 'Un composant fonctionnel est simplement une fonction JS qui retourne du JSX.',
      },
      {
        texte: 'Quelle méthode HTTP est utilisée pour créer une ressource ?',
        options: { A: 'GET', B: 'PUT', C: 'POST', D: 'DELETE' },
        correctAnswer: 'C',
        explanation: 'POST est utilisé pour créer de nouvelles ressources dans une API REST.',
      },
      {
        texte: 'Qu\'est-ce que le CSS Flexbox ?',
        options: { A: 'Un framework JS', B: 'Un système de mise en page CSS', C: 'Une base de données', D: 'Un serveur web' },
        correctAnswer: 'B',
        explanation: 'Flexbox est un modèle de mise en page CSS qui facilite l\'alignement des éléments.',
      },
      {
        texte: 'En JavaScript, que fait le mot-clé `async` devant une fonction ?',
        options: { A: 'La rend synchrone', B: 'La rend asynchrone et retourne toujours une Promise', C: 'Crée une erreur', D: 'Bloque l\'exécution' },
        correctAnswer: 'B',
        explanation: 'Une fonction `async` retourne toujours une Promise et permet d\'utiliser `await` à l\'intérieur.',
      },
    ],
  },
  {
    courseTitre: 'Cybersécurité',
    videoTitre: 'Les bases de la cybersécurité',
    qcmTitre: 'QCM — Fondamentaux cybersécurité',
    questions: [
      {
        texte: 'Que représente la triade CIA en cybersécurité ?',
        options: { A: 'Confidentialité, Intégrité, Disponibilité', B: 'Central Intelligence Agency', C: 'Cryptage, Injection, Authentification', D: 'Chiffrement, Identification, Audit' },
        correctAnswer: 'A',
        explanation: 'La triade CIA (Confidentiality, Integrity, Availability) est le fondement de la sécurité informatique.',
      },
      {
        texte: "Qu'est-ce qu'une attaque par phishing ?",
        options: { A: 'Une attaque DDoS', B: 'Une tentative de tromper l\'utilisateur pour obtenir des infos sensibles', C: 'Un virus', D: 'Une injection SQL' },
        correctAnswer: 'B',
        explanation: 'Le phishing utilise l\'ingénierie sociale pour tromper l\'utilisateur (faux email, faux site).',
      },
      {
        texte: 'Quel mécanisme protège un mot de passe en BDD ?',
        options: { A: 'Le stockage en clair', B: 'Le hashage avec sel (bcrypt, argon2)', C: 'Le chiffrement réversible', D: 'Base64' },
        correctAnswer: 'B',
        explanation: 'Le hashage avec sel (bcrypt, argon2) est irréversible et résiste aux attaques par rainbow tables.',
      },
      {
        texte: 'Qu\'est-ce qu\'une injection SQL ?',
        options: { A: 'L\'exécution de code SQL malveillant via des entrées utilisateur non validées', B: 'Une optimisation de base de données', C: 'Un protocole', D: 'Une fonction de hachage' },
        correctAnswer: 'A',
        explanation: 'Une injection SQL permet à un attaquant d\'exécuter des commandes SQL en exploitant une mauvaise validation.',
      },
      {
        texte: 'Que signifie HTTPS ?',
        options: { A: 'HTTP Secure, chiffré via TLS', B: 'Hyper Text Protocol Standard', C: 'Host Transfer Protocol', D: 'Une base de données' },
        correctAnswer: 'A',
        explanation: 'HTTPS = HTTP over TLS/SSL, garantit confidentialité et intégrité des échanges.',
      },
    ],
  },
  {
    courseTitre: 'Intelligence Artificielle & Machine Learning',
    videoTitre: 'Qu\'est-ce que le ML ?',
    qcmTitre: 'QCM — Introduction à l\'IA/ML',
    questions: [
      {
        texte: 'Quelle est la différence entre apprentissage supervisé et non supervisé ?',
        options: { A: 'Aucune', B: 'Supervisé = données étiquetées, non supervisé = données non étiquetées', C: 'Supervisé = rapide', D: 'Supervisé = avec humain' },
        correctAnswer: 'B',
        explanation: 'En supervisé, on a des paires (entrée, sortie attendue). En non supervisé, on cherche des structures cachées.',
      },
      {
        texte: 'Qu\'est-ce que l\'overfitting (surapprentissage) ?',
        options: { A: 'Le modèle généralise bien', B: 'Le modèle mémorise le training set mais échoue sur de nouvelles données', C: 'Un bug', D: 'Un type de régression' },
        correctAnswer: 'B',
        explanation: 'L\'overfitting survient quand le modèle apprend trop spécifiquement les données d\'entraînement.',
      },
      {
        texte: 'Quelle métrique est utilisée pour une classification binaire ?',
        options: { A: 'MSE', B: 'Accuracy, Precision, Recall, F1-score', C: 'Variance', D: 'Temps de compilation' },
        correctAnswer: 'B',
        explanation: 'Accuracy, précision, rappel et F1 sont les métriques standards pour la classification.',
      },
      {
        texte: 'Qu\'est-ce qu\'un neurone artificiel ?',
        options: { A: 'Une unité qui combine des entrées pondérées et applique une fonction d\'activation', B: 'Un circuit électrique', C: 'Un type de CPU', D: 'Une base de données' },
        correctAnswer: 'A',
        explanation: 'Le neurone artificiel calcule une somme pondérée des entrées puis applique une fonction (sigmoid, ReLU, etc.).',
      },
      {
        texte: 'Que fait l\'algorithme de rétropropagation ?',
        options: { A: 'Il compile le réseau', B: 'Il ajuste les poids en minimisant l\'erreur via le gradient', C: 'Il crée des neurones', D: 'Il affiche les résultats' },
        correctAnswer: 'B',
        explanation: 'La backpropagation calcule le gradient de l\'erreur et met à jour les poids en sens inverse.',
      },
    ],
  },
  {
    courseTitre: 'Introduction au Management',
    videoTitre: 'Les 4 fonctions du management',
    qcmTitre: 'QCM — Bases du management',
    questions: [
      {
        texte: 'Quelles sont les 4 fonctions classiques du management selon Fayol ?',
        options: { A: 'Vendre, Acheter, Produire, Stocker', B: 'Planifier, Organiser, Diriger, Contrôler', C: 'Communiquer, Décider, Vérifier, Évaluer', D: 'Recruter, Former, Motiver, Licencier' },
        correctAnswer: 'B',
        explanation: 'Fayol identifie : Planifier, Organiser, Diriger (Commander), Contrôler (+ Coordonner).',
      },
      {
        texte: 'Qu\'est-ce que la théorie de Taylor ?',
        options: { A: 'Le management moderne', B: 'L\'organisation scientifique du travail (division des tâches, mesure du rendement)', C: 'La théorie des jeux', D: 'Le marketing digital' },
        correctAnswer: 'B',
        explanation: 'Taylor (1911) propose l\'OST : décomposer le travail en tâches simples, mesurer, optimiser.',
      },
      {
        texte: 'Quelle est la pyramide de Maslow ?',
        options: { A: 'Une hiérarchie de 5 besoins humains (physiologiques, sécurité, social, estime, accomplissement)', B: 'Une structure d\'entreprise', C: 'Un calcul financier', D: 'Un modèle de management' },
        correctAnswer: 'A',
        explanation: 'Maslow classe les besoins du plus basique (manger, dormir) au plus élevé (accomplissement de soi).',
      },
      {
        texte: 'Qu\'est-ce qu\'un leader transformationnel ?',
        options: { A: 'Un leader qui inspire et motive le changement chez ses équipes', B: 'Un leader autoritaire', C: 'Un leader qui délègue tout', D: 'Un leader absent' },
        correctAnswer: 'A',
        explanation: 'Le leader transformationnel inspire, mobilise et développe ses collaborateurs pour atteindre une vision partagée.',
      },
      {
        texte: 'Qu\'est-ce qu\'un KPI ?',
        options: { A: 'Key Performance Indicator — mesure chiffrée d\'atteinte d\'un objectif', B: 'Kilo Par Individu', C: 'Kernel Process Indicator', D: 'Un type d\'organigramme' },
        correctAnswer: 'A',
        explanation: 'Un KPI est un indicateur clé de performance, utilisé pour piloter et évaluer une activité.',
      },
    ],
  },
  {
    courseTitre: 'Management stratégique',
    videoTitre: 'Analyse SWOT',
    qcmTitre: 'QCM — Stratégie d\'entreprise',
    questions: [
      {
        texte: 'Que signifie SWOT ?',
        options: { A: 'Strengths, Weaknesses, Opportunities, Threats', B: 'Sales, Workflow, Operations, Team', C: 'Stratégie, Valeurs, Objectifs, Tactiques', D: 'Un logiciel comptable' },
        correctAnswer: 'A',
        explanation: 'SWOT = Forces, Faiblesses (interne), Opportunités, Menaces (externe).',
      },
      {
        texte: 'Les 5 forces de Porter incluent notamment :',
        options: { A: 'Pouvoir de négociation des clients et fournisseurs', B: 'Le PIB et l\'inflation', C: 'Les saisons', D: 'Les réseaux sociaux' },
        correctAnswer: 'A',
        explanation: 'Les 5 forces de Porter : concurrents, nouveaux entrants, produits de substitution, pouvoir clients, pouvoir fournisseurs.',
      },
      {
        texte: 'Qu\'est-ce que la matrice BCG ?',
        options: { A: 'Une matrice qui classe les produits en Vaches à lait, Stars, Dilemmes, Poids morts', B: 'Un planning', C: 'Un bilan comptable', D: 'Un logiciel' },
        correctAnswer: 'A',
        explanation: 'La matrice BCG analyse le portefeuille de produits selon croissance du marché et part de marché relative.',
      },
      {
        texte: 'Qu\'est-ce qu\'une stratégie de différenciation ?',
        options: { A: 'Produire au moindre coût', B: 'Offrir un produit unique perçu comme supérieur', C: 'Copier la concurrence', D: 'Fermer l\'entreprise' },
        correctAnswer: 'B',
        explanation: 'La différenciation (Porter) consiste à offrir un produit unique pour justifier un prix premium.',
      },
      {
        texte: "L'analyse PESTEL concerne :",
        options: { A: 'L\'environnement macro (Politique, Économique, Sociologique, Technologique, Écologique, Légal)', B: 'La comptabilité interne', C: 'Les ressources humaines', D: 'Le marketing digital' },
        correctAnswer: 'A',
        explanation: 'PESTEL analyse les facteurs externes macro qui influencent une entreprise.',
      },
    ],
  },
  {
    courseTitre: 'Comptabilité générale',
    videoTitre: 'Le bilan comptable expliqué',
    qcmTitre: 'QCM — Comptabilité générale',
    questions: [
      {
        texte: 'Quelle est l\'équation fondamentale de la comptabilité ?',
        options: { A: 'Actif = Passif + Capitaux propres', B: 'Recettes = Dépenses', C: 'Profit = Ventes × 2', D: 'Capital = Dettes' },
        correctAnswer: 'A',
        explanation: 'Actif = Passif + Capitaux propres : ce que l\'entreprise possède = ce qu\'elle doit + ce qui appartient aux propriétaires.',
      },
      {
        texte: "Qu'est-ce qu'un bilan comptable ?",
        options: { A: 'Un rapport des ventes', B: 'Une photo du patrimoine à un instant T', C: 'Un planning annuel', D: 'Un tableau de bord commercial' },
        correctAnswer: 'B',
        explanation: 'Le bilan représente actifs et passifs à une date donnée (instantané du patrimoine).',
      },
      {
        texte: 'Les immobilisations sont :',
        options: { A: 'Des dettes à court terme', B: 'Des actifs durables utilisés sur plus d\'un an', C: 'Des ventes', D: 'Des produits finis' },
        correctAnswer: 'B',
        explanation: 'Les immobilisations (machines, bâtiments, brevets) sont utilisées plus d\'un an dans l\'activité.',
      },
      {
        texte: "Qu'est-ce que l'amortissement ?",
        options: { A: 'Une prime de salaire', B: 'La constatation de la dépréciation d\'un actif sur sa durée d\'usage', C: 'Un remboursement bancaire', D: 'Un profit' },
        correctAnswer: 'B',
        explanation: 'L\'amortissement répartit le coût d\'une immobilisation sur sa durée d\'utilisation.',
      },
      {
        texte: 'Le compte de résultat mesure :',
        options: { A: 'Le patrimoine à un instant T', B: 'Les charges et produits sur une période (mois, année)', C: 'Les soldes bancaires', D: 'Les effectifs' },
        correctAnswer: 'B',
        explanation: 'Le compte de résultat (P&L) résume performances d\'une période : charges, produits, résultat net.',
      },
    ],
  },
  {
    courseTitre: 'Analyse financière',
    videoTitre: 'Les ratios de liquidité',
    qcmTitre: 'QCM — Analyse financière',
    questions: [
      {
        texte: 'Que mesure le ratio de liquidité générale ?',
        options: { A: 'Actif circulant / Dettes à court terme', B: 'Ventes / Actifs totaux', C: 'Dividendes / Actions', D: 'CA / Salariés' },
        correctAnswer: 'A',
        explanation: 'Liquidité générale = Actif circulant / Dettes à CT. Mesure la capacité à honorer ses dettes à CT.',
      },
      {
        texte: 'Qu\'est-ce que le ROE ?',
        options: { A: 'Return on Equity = Résultat net / Capitaux propres', B: 'Revenue of Europe', C: 'Ratio of Economy', D: 'Return on Engineering' },
        correctAnswer: 'A',
        explanation: 'Le ROE mesure la rentabilité des capitaux propres. C\'est un indicateur clé pour les actionnaires.',
      },
      {
        texte: 'Le fonds de roulement (FR) est :',
        options: { A: 'Capitaux permanents - Immobilisations', B: 'Actif - Passif', C: 'Ventes mensuelles', D: 'La caisse' },
        correctAnswer: 'A',
        explanation: 'FR = Capitaux permanents (CP + dettes LT) - Immobilisations. Il finance le cycle d\'exploitation.',
      },
      {
        texte: 'Un BFR positif signifie :',
        options: { A: 'L\'entreprise a besoin de financement pour son cycle d\'exploitation', B: 'L\'entreprise est en faillite', C: 'Tout va bien', D: 'L\'entreprise peut fermer' },
        correctAnswer: 'A',
        explanation: 'BFR positif = décalage entre encaissements clients et décaissements fournisseurs → besoin de trésorerie.',
      },
      {
        texte: 'Le ratio d\'endettement est :',
        options: { A: 'Dettes financières / Capitaux propres', B: 'CA / Bénéfice', C: 'Salaires / Effectif', D: 'Production / Ventes' },
        correctAnswer: 'A',
        explanation: 'Ratio d\'endettement = Dettes / Capitaux propres. Au-delà de 1 : l\'entreprise est très endettée.',
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   RESSOURCES externes par cours (PDFs/liens officiels)
═══════════════════════════════════════════════════════════════════════ */
const RESOURCE_DEFS = [
  // ISIL L1
  { courseTitre: 'Algorithmique & Programmation', resources: [
    { titre: 'Python : Guide complet débutant (PDF)', description: 'Documentation officielle Python en français', type: 'pdf', url: 'https://docs.python.org/fr/3/tutorial/index.html' },
    { titre: 'OpenClassrooms — Apprenez la programmation', description: 'Parcours interactif pour débuter', type: 'autre', url: 'https://openclassrooms.com/fr/courses/7168871-apprenez-a-programmer-avec-python' },
  ]},
  { courseTitre: 'Bases de Python', resources: [
    { titre: 'Python Cheat Sheet (PDF)', description: 'Aide-mémoire complet des syntaxes Python', type: 'pdf', url: 'https://www.pythoncheatsheet.org/' },
    { titre: 'Real Python — Tutoriels', description: 'Tutoriels Python de qualité (en anglais)', type: 'autre', url: 'https://realpython.com/' },
  ]},
  { courseTitre: 'Mathématiques pour l\'informatique', resources: [
    { titre: 'Logique & Raisonnement (Cours universitaire)', description: 'Support de cours niveau Licence', type: 'pdf', url: 'https://fr.wikipedia.org/wiki/Logique_math%C3%A9matique' },
  ]},
  // ISIL L2
  { courseTitre: 'Structures de données', resources: [
    { titre: 'Visualisation des structures (VisuAlgo)', description: 'Animations interactives des algos et structures', type: 'autre', url: 'https://visualgo.net/fr' },
    { titre: 'Cormen — Introduction aux algorithmes', description: 'Le livre de référence', type: 'pdf', url: 'https://en.wikipedia.org/wiki/Introduction_to_Algorithms' },
  ]},
  { courseTitre: 'POO en Java', resources: [
    { titre: 'Documentation officielle Oracle Java', description: 'Référence complète du langage', type: 'autre', url: 'https://docs.oracle.com/en/java/' },
  ]},
  { courseTitre: 'Bases de données SQL', resources: [
    { titre: 'SQLBolt — Apprendre SQL interactif', description: 'Exercices SQL progressifs dans le navigateur', type: 'autre', url: 'https://sqlbolt.com/' },
    { titre: 'MySQL Reference Manual', description: 'Documentation MySQL officielle', type: 'pdf', url: 'https://dev.mysql.com/doc/' },
  ]},
  // ISIL L3
  { courseTitre: 'Développement Web Full-Stack', resources: [
    { titre: 'MDN Web Docs', description: 'La référence web (HTML/CSS/JS)', type: 'autre', url: 'https://developer.mozilla.org/fr/' },
    { titre: 'React Documentation officielle', description: 'Apprends React sur le site officiel', type: 'autre', url: 'https://react.dev/' },
  ]},
  { courseTitre: 'Intelligence Artificielle & Machine Learning', resources: [
    { titre: 'Coursera — Machine Learning (Andrew Ng)', description: 'Le MOOC de référence en ML', type: 'autre', url: 'https://www.coursera.org/learn/machine-learning' },
    { titre: 'Fast.ai — Cours pratique de Deep Learning', description: 'Cours gratuit hands-on', type: 'autre', url: 'https://course.fast.ai/' },
  ]},
  { courseTitre: 'Cybersécurité', resources: [
    { titre: 'OWASP Top 10', description: 'Les 10 vulnérabilités web les plus critiques', type: 'autre', url: 'https://owasp.org/www-project-top-ten/' },
    { titre: 'TryHackMe — Apprendre la cybersécurité', description: 'Plateforme de labs pratiques', type: 'autre', url: 'https://tryhackme.com/' },
  ]},
  // MANAGEMENT
  { courseTitre: 'Introduction au Management', resources: [
    { titre: 'Harvard Business Review — Articles essentiels', description: 'Articles de référence sur le management', type: 'autre', url: 'https://hbr.org/' },
  ]},
  { courseTitre: 'Management stratégique', resources: [
    { titre: 'Canvas SWOT à imprimer (template)', description: 'Template officiel SWOT', type: 'pdf', url: 'https://www.bdc.ca/fr/articles-outils/boite-outils-entrepreneur/gabarits-documents-guides-affaires/analyse-swot' },
    { titre: '5 forces de Porter — Explication complète', description: 'Framework Porter détaillé', type: 'autre', url: 'https://fr.wikipedia.org/wiki/Cinq_forces_de_Porter' },
  ]},
  { courseTitre: 'Management de projet', resources: [
    { titre: 'Scrum Guide officiel (FR)', description: 'Le guide officiel Scrum', type: 'pdf', url: 'https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-French.pdf' },
  ]},
  // FINANCE
  { courseTitre: 'Comptabilité générale', resources: [
    { titre: 'Système Comptable Financier (SCF) Algérie', description: 'Le référentiel comptable algérien', type: 'autre', url: 'https://www.mf.gov.dz/' },
    { titre: 'Plan Comptable Général (FR)', description: 'Plan comptable général français détaillé', type: 'pdf', url: 'https://www.plancomptable.com/' },
  ]},
  { courseTitre: 'Analyse financière', resources: [
    { titre: 'Xerfi Canal — Analyses financières', description: 'Vidéos d\'analyse économique', type: 'autre', url: 'https://www.xerficanal.com/' },
  ]},
  { courseTitre: 'Audit financier', resources: [
    { titre: 'IFRS Standards (officiel)', description: 'Les normes IFRS internationales', type: 'autre', url: 'https://www.ifrs.org/' },
  ]},
];

/* ═══════════════════════════════════════════════════════════════════════
   PROJETS PÉDAGOGIQUES MONO-MODULE
   Note : ces définitions ont la structure d'un Prosit (méthodologie APP/CESI)
   mais sont seedées comme projets mono-module — `type: 'mono'`. Elles seront
   migrées vers le module Prosit dédié quand celui-ci sera réintroduit comme
   module séparé.
═══════════════════════════════════════════════════════════════════════ */
const MONO_PROJECT_DEFS = [
  // ISIL
  {
    filiere: 'ISIL', promotion: 'L3',
    titre: 'Sécuriser une application web contre les attaques courantes',
    description: 'Étude de cas : auditer et sécuriser une plateforme e-commerce vulnérable.',
    enonce: `Tu travailles pour une startup algérienne qui vient de mettre en ligne une plateforme e-commerce. En 2 semaines, 3 incidents de sécurité ont été signalés : des commandes passées avec des comptes piratés, un dump de la base clients diffusé sur un forum, et un script malveillant injecté sur la page d'accueil.
Ta mission : analyser les vulnérabilités, proposer des corrections, et prototyper une solution sécurisée.

Contexte : Node.js/Express + MongoDB + React. Aucune revue de code n'a été faite.

Livrables attendus :
- Un rapport d'audit listant les vulnérabilités (OWASP Top 10)
- Un proof-of-concept corrigé avec mesures de sécurité (hashing, validation, CSRF, XSS)
- Une présentation de 10 min avec démo`,
    motsCles: ['OWASP', 'XSS', 'SQL Injection', 'CSRF', 'bcrypt', 'JWT', 'HTTPS', 'CSP', 'Validation'],
    courseTitre: 'Cybersécurité',
    phases: [
      {
        titre: 'Prosit Aller', statut: 'a_faire',
        checklist: [
          { texte: 'Lire l\'énoncé et extraire les mots-clés', done: false },
          { texte: 'Identifier les concepts inconnus à rechercher', done: false },
          { texte: 'Formuler les questions clés à résoudre', done: false },
        ],
      },
      {
        titre: 'Recherche individuelle', statut: 'a_faire',
        checklist: [
          { texte: 'Lire OWASP Top 10 (site officiel)', done: false },
          { texte: 'Étudier bcrypt / argon2 pour le hashage', done: false },
          { texte: 'Comprendre JWT et ses alternatives (sessions)', done: false },
          { texte: 'Pratiquer une injection SQL sur un lab (TryHackMe)', done: false },
        ],
      },
      {
        titre: 'Prosit Retour', statut: 'a_faire',
        checklist: [
          { texte: 'Mise en commun des recherches', done: false },
          { texte: 'Rédiger le rapport d\'audit', done: false },
          { texte: 'Coder le POC sécurisé', done: false },
          { texte: 'Préparer la démo live', done: false },
        ],
      },
    ],
    ideas: [
      { titre: 'Exercice : Audit d\'une app vulnérable', type: 'exercice', difficulte: 'moyen', estime: '4h', description: 'Utiliser DVWA (Damn Vulnerable Web Application) pour tester chaque attaque.' },
      { titre: 'Workshop : Setup HTTPS avec Let\'s Encrypt', type: 'workshop', difficulte: 'facile', estime: '2h', description: 'Configurer un certificat SSL sur une app Express.' },
      { titre: 'Recherche : CSP (Content Security Policy)', type: 'recherche', difficulte: 'moyen', estime: '3h', description: 'Lire sur CSP et implémenter une politique stricte.' },
      { titre: 'Livrable : Rapport d\'audit PDF', type: 'livrable', difficulte: 'difficile', estime: '6h' },
    ],
  },
  {
    filiere: 'ISIL', promotion: 'L3',
    titre: 'Créer un classificateur de spam par Machine Learning',
    description: 'Entraîner un modèle de classification pour détecter automatiquement les emails spam.',
    enonce: `Tu rejoins une équipe data science. Ta première mission : développer un classificateur qui détecte si un email est "spam" ou "ham" (légitime). Le jeu de données historique contient 5000 emails étiquetés.

Contraintes :
- Utiliser Python (scikit-learn, pandas)
- Comparer au moins 3 modèles (Logistic Regression, Naive Bayes, Random Forest)
- Obtenir une précision ≥ 95%
- Documenter le processus (notebook Jupyter)

Livrables : notebook complet + modèle sauvegardé + rapport court justifiant le choix final.`,
    motsCles: ['scikit-learn', 'NLP', 'TF-IDF', 'Naive Bayes', 'Confusion Matrix', 'F1-score', 'Overfitting'],
    courseTitre: 'Intelligence Artificielle & Machine Learning',
    phases: [
      { titre: 'Prosit Aller', statut: 'a_faire', checklist: [
        { texte: 'Comprendre l\'énoncé et les contraintes', done: false },
        { texte: 'Lister les étapes d\'un projet ML (EDA, features, training, eval)', done: false },
      ]},
      { titre: 'Recherche individuelle', statut: 'a_faire', checklist: [
        { texte: 'Lire sur TF-IDF et sac de mots', done: false },
        { texte: 'Pratiquer les 3 modèles sur un petit dataset', done: false },
        { texte: 'Comprendre les métriques (precision, recall, F1)', done: false },
      ]},
      { titre: 'Prosit Retour', statut: 'a_faire', checklist: [
        { texte: 'Mettre en commun et choisir l\'approche', done: false },
        { texte: 'Implémenter le pipeline complet', done: false },
        { texte: 'Livrer notebook + rapport', done: false },
      ]},
    ],
    ideas: [
      { titre: 'Kaggle : Dataset Spam Classification', type: 'exercice', difficulte: 'moyen', estime: '5h' },
      { titre: 'Exploration Data Analysis (EDA)', type: 'exercice', difficulte: 'facile', estime: '2h' },
      { titre: 'Workshop : Validation croisée en ML', type: 'workshop', difficulte: 'moyen', estime: '3h' },
    ],
  },
  // MANAGEMENT
  {
    filiere: 'Management', promotion: 'L3',
    titre: 'Lancer une startup algérienne : Business Plan complet',
    description: 'Concevoir un business plan réaliste pour une startup dans le contexte algérien.',
    enonce: `Tu veux créer une startup en Algérie. Choisis ton secteur (fintech, logistique, agri-tech, edtech, e-commerce, etc.) et construis un business plan complet sur 3 ans.

Exigences :
- Étude de marché précise (concurrence, cible, taille)
- Business Model Canvas
- Plan financier sur 3 ans (comptes de résultat prévisionnels, besoins de financement)
- Stratégie marketing & commerciale
- Roadmap produit

Contexte : financement initial disponible 10M DA. Tu vises un seuil de rentabilité à 18 mois.

Livrable : business plan de 15-20 pages + pitch deck (10 slides).`,
    motsCles: ['Business Model Canvas', 'MVP', 'Étude de marché', 'Seuil de rentabilité', 'Pitch', 'Lean Startup'],
    courseTitre: 'Entrepreneuriat',
    phases: [
      { titre: 'Prosit Aller', statut: 'a_faire', checklist: [
        { texte: 'Choisir le secteur et la problématique', done: false },
        { texte: 'Formuler la proposition de valeur', done: false },
        { texte: 'Identifier les parties prenantes', done: false },
      ]},
      { titre: 'Recherche individuelle', statut: 'a_faire', checklist: [
        { texte: 'Analyser 3 concurrents directs en Algérie', done: false },
        { texte: 'Estimer la taille du marché TAM/SAM/SOM', done: false },
        { texte: 'Construire le Business Model Canvas', done: false },
        { texte: 'Faire des projections financières (Excel)', done: false },
      ]},
      { titre: 'Prosit Retour', statut: 'a_faire', checklist: [
        { texte: 'Rédiger le business plan final', done: false },
        { texte: 'Créer le pitch deck', done: false },
        { texte: 'Répéter le pitch (10 min)', done: false },
      ]},
    ],
    ideas: [
      { titre: 'Exercice : Business Model Canvas interactif', type: 'exercice', difficulte: 'moyen', estime: '3h' },
      { titre: 'Workshop : Pitch devant un jury', type: 'workshop', difficulte: 'difficile', estime: '4h' },
      { titre: 'Recherche : Les licornes maghrébines', type: 'recherche', difficulte: 'facile', estime: '2h', description: 'Étude de Yassir, Temtem, Yatoo Express...' },
    ],
  },
  {
    filiere: 'Management', promotion: 'L2',
    titre: 'Restructurer l\'organisation d\'une PME en difficulté',
    description: 'Étude de cas : une PME de 50 salariés subit une perte de 30% de son CA. Propose un plan de redressement.',
    enonce: `"Textile Algérie SARL" est une PME de 50 salariés spécialisée dans le prêt-à-porter. Son CA a chuté de 30% en 2 ans. Les raisons : concurrence chinoise, mauvaise communication interne, absence de vision digitale.

Le PDG te mandate pour proposer un plan de restructuration sur 12 mois.

Analyse à mener :
- Diagnostic SWOT
- Analyse des forces de Porter
- Problématiques RH (motivation, organigramme)
- Plan d'action opérationnel avec jalons

Livrable : rapport de diagnostic + plan de transformation en 10 pages + présentation au comité de direction.`,
    motsCles: ['SWOT', 'Porter', 'PESTEL', 'Restructuration', 'Management du changement', 'KPI'],
    courseTitre: 'Management stratégique',
    phases: [
      { titre: 'Prosit Aller', statut: 'a_faire', checklist: [
        { texte: 'Identifier les symptômes et les causes probables', done: false },
        { texte: 'Cartographier les parties prenantes', done: false },
      ]},
      { titre: 'Recherche individuelle', statut: 'a_faire', checklist: [
        { texte: 'Étudier 2 cas de restructuration réussie (ex: Renault)', done: false },
        { texte: 'Lire sur le management du changement (Kotter)', done: false },
        { texte: 'Faire un diagnostic SWOT + PESTEL', done: false },
      ]},
      { titre: 'Prosit Retour', statut: 'a_faire', checklist: [
        { texte: 'Consolider le diagnostic', done: false },
        { texte: 'Rédiger le plan de transformation', done: false },
        { texte: 'Présenter au "comité de direction"', done: false },
      ]},
    ],
    ideas: [
      { titre: 'Exercice : SWOT sur un cas réel', type: 'exercice', difficulte: 'moyen', estime: '2h' },
      { titre: 'Recherche : Modèle de Kotter pour le changement', type: 'recherche', difficulte: 'moyen', estime: '3h' },
    ],
  },
  // FINANCE
  {
    filiere: 'Finance & Comptabilité', promotion: 'L3',
    titre: 'Diagnostic financier complet d\'une entreprise cotée',
    description: 'Analyser la santé financière d\'une entreprise algérienne cotée à la bourse d\'Alger.',
    enonce: `Tu es analyste financier junior. Ton chef te demande de rédiger un rapport d'analyse financière sur "Biopharm SPA" (ou toute autre entreprise cotée d'Alger).

Ton analyse doit inclure :
- Lecture du bilan et du compte de résultat des 3 dernières années
- Calcul des ratios clés (ROE, ROA, liquidité, endettement, rotation)
- Analyse du fonds de roulement et du BFR
- Comparaison avec les concurrents du secteur
- Recommandation d'investissement (acheter/vendre/conserver)

Livrable : rapport d'analyse de 10 pages + graphiques + fichier Excel des calculs.`,
    motsCles: ['ROE', 'ROA', 'BFR', 'Fonds de roulement', 'Analyse horizontale', 'Ratios', 'DCF'],
    courseTitre: 'Analyse financière',
    phases: [
      { titre: 'Prosit Aller', statut: 'a_faire', checklist: [
        { texte: 'Choisir l\'entreprise et télécharger les états financiers', done: false },
        { texte: 'Identifier les ratios à calculer', done: false },
      ]},
      { titre: 'Recherche individuelle', statut: 'a_faire', checklist: [
        { texte: 'Lire les 3 derniers rapports annuels', done: false },
        { texte: 'Calculer les ratios dans Excel', done: false },
        { texte: 'Benchmarker avec 2 concurrents', done: false },
      ]},
      { titre: 'Prosit Retour', statut: 'a_faire', checklist: [
        { texte: 'Rédiger le rapport et conclure', done: false },
        { texte: 'Préparer la présentation', done: false },
      ]},
    ],
    ideas: [
      { titre: 'Exercice : Feuille de ratios Excel', type: 'exercice', difficulte: 'facile', estime: '2h' },
      { titre: 'Workshop : Valorisation par DCF', type: 'workshop', difficulte: 'difficile', estime: '4h' },
      { titre: 'Livrable : Rapport avec recommandation', type: 'livrable', difficulte: 'moyen', estime: '5h' },
    ],
  },
  {
    filiere: 'Finance & Comptabilité', promotion: 'L2',
    titre: 'Optimiser la trésorerie d\'une PME en croissance rapide',
    description: 'Cas pratique : une PME vend plus mais manque de cash. Diagnostiquer et recommander.',
    enonce: `Une PME a vu son CA doubler en 2 ans (+120%). Pourtant, elle n'arrive plus à payer ses fournisseurs à temps et a dû refuser une commande faute de trésorerie.

Données disponibles :
- Bilans 2023 et 2024
- Compte de résultat
- Échéancier clients/fournisseurs

Mission :
- Calculer le BFR et son évolution
- Identifier les postes qui consomment du cash
- Proposer 5 actions concrètes pour libérer de la trésorerie
- Projeter un compte de trésorerie à 6 mois

Livrable : note d'analyse (5 pages) + plan d'action chiffré.`,
    motsCles: ['BFR', 'Trésorerie', 'Créances clients', 'Dettes fournisseurs', 'Factoring', 'Cash-flow'],
    courseTitre: 'Contrôle de gestion',
    phases: [
      { titre: 'Prosit Aller', statut: 'a_faire', checklist: [
        { texte: 'Analyser l\'énoncé et le contexte', done: false },
        { texte: 'Lister les leviers possibles (créances, stocks, fournisseurs)', done: false },
      ]},
      { titre: 'Recherche individuelle', statut: 'a_faire', checklist: [
        { texte: 'Étudier les outils d\'optimisation du BFR', done: false },
        { texte: 'Calculer les DSO, DPO, DIO', done: false },
      ]},
      { titre: 'Prosit Retour', statut: 'a_faire', checklist: [
        { texte: 'Plan d\'action chiffré', done: false },
        { texte: 'Note finale', done: false },
      ]},
    ],
    ideas: [
      { titre: 'Exercice : Calcul DSO/DPO/DIO', type: 'exercice', difficulte: 'facile', estime: '1h' },
      { titre: 'Recherche : Le factoring (affacturage)', type: 'recherche', difficulte: 'moyen', estime: '2h' },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   PROJETS — plus long que prosits, avec dates et livrables
═══════════════════════════════════════════════════════════════════════ */
const PROJECT_DEFS = [
  {
    filiere: 'ISIL', promotion: 'L3',
    titre: 'Développer FlipLearn-Lite : une micro-plateforme e-learning',
    description: 'Projet fil rouge du semestre : construire en équipe une mini-plateforme de cours en ligne.',
    dateDebut: new Date('2026-04-15'),
    dateFin: new Date('2026-06-15'),
    dateSoutenance: new Date('2026-06-20'),
    courseTitre: 'Développement Web Full-Stack',
    phases: [
      { titre: 'Lancement', statut: 'a_faire', dateFin: new Date('2026-04-22'), checklist: [
        { texte: 'Former les groupes de 4-5 personnes', done: false },
        { texte: 'Choisir la stack technique', done: false },
        { texte: 'Définir le MVP', done: false },
      ]},
      { titre: 'Conception', statut: 'a_faire', dateFin: new Date('2026-05-05'), checklist: [
        { texte: 'Maquettes Figma', done: false },
        { texte: 'Schéma de la base de données', done: false },
        { texte: 'API endpoints documentés', done: false },
      ]},
      { titre: 'Développement', statut: 'a_faire', dateFin: new Date('2026-06-05'), checklist: [
        { texte: 'Backend API (auth, cours, vidéos)', done: false },
        { texte: 'Frontend React', done: false },
        { texte: 'Déploiement Render/Vercel', done: false },
        { texte: 'Tests unitaires et E2E', done: false },
      ]},
      { titre: 'Préparation soutenance', statut: 'a_faire', dateFin: new Date('2026-06-18'), checklist: [
        { texte: 'Rapport final (20-30 pages)', done: false },
        { texte: 'Slides de présentation', done: false },
        { texte: 'Démo live préparée', done: false },
      ]},
      { titre: 'Soutenance', statut: 'a_faire', dateFin: new Date('2026-06-20'), checklist: [
        { texte: 'Présentation orale (20 min)', done: false },
        { texte: 'Questions/Réponses (10 min)', done: false },
      ]},
    ],
    ideas: [
      { titre: 'Implémenter l\'authentification JWT', type: 'livrable', difficulte: 'moyen', estime: '6h' },
      { titre: 'Upload vidéo via Cloudinary', type: 'livrable', difficulte: 'moyen', estime: '4h' },
      { titre: 'Workshop : Déploiement CI/CD', type: 'workshop', difficulte: 'difficile', estime: '5h' },
      { titre: 'Ajouter un chat temps réel (Socket.io)', type: 'exercice', difficulte: 'difficile', estime: '8h' },
      { titre: 'Intégrer un chatbot IA (Groq/OpenAI)', type: 'exercice', difficulte: 'difficile', estime: '6h' },
    ],
  },
  {
    filiere: 'Management', promotion: 'L3',
    titre: 'Lancer une nouvelle marque : de l\'idée au Go-to-Market',
    description: 'Projet de groupe : créer et lancer une marque fictive avec un plan marketing complet.',
    dateDebut: new Date('2026-04-15'),
    dateFin: new Date('2026-06-15'),
    dateSoutenance: new Date('2026-06-18'),
    courseTitre: 'Stratégie digitale',
    phases: [
      { titre: 'Idéation', statut: 'a_faire', dateFin: new Date('2026-04-25'), checklist: [
        { texte: 'Brainstorming et choix du produit/service', done: false },
        { texte: 'Définir la mission et la vision', done: false },
      ]},
      { titre: 'Étude de marché', statut: 'a_faire', dateFin: new Date('2026-05-10'), checklist: [
        { texte: 'Analyser 5 concurrents', done: false },
        { texte: 'Définir le persona cible', done: false },
        { texte: 'Interviews utilisateurs (5 personnes)', done: false },
      ]},
      { titre: 'Branding & Marketing', statut: 'a_faire', dateFin: new Date('2026-05-30'), checklist: [
        { texte: 'Logo + charte graphique', done: false },
        { texte: 'Site web landing page', done: false },
        { texte: 'Plan marketing digital (SEO, SEA, réseaux sociaux)', done: false },
      ]},
      { titre: 'Go-to-Market', statut: 'a_faire', dateFin: new Date('2026-06-12'), checklist: [
        { texte: 'Budget marketing chiffré', done: false },
        { texte: 'Calendrier de lancement', done: false },
        { texte: 'KPI à suivre', done: false },
      ]},
      { titre: 'Soutenance', statut: 'a_faire', dateFin: new Date('2026-06-18'), checklist: [] },
    ],
    ideas: [
      { titre: 'Créer le Business Model Canvas', type: 'livrable', difficulte: 'moyen', estime: '3h' },
      { titre: 'Designer la charte graphique (Canva/Figma)', type: 'exercice', difficulte: 'facile', estime: '4h' },
      { titre: 'Rédiger la landing page', type: 'livrable', difficulte: 'facile', estime: '3h' },
    ],
  },
  {
    filiere: 'Finance & Comptabilité', promotion: 'L3',
    titre: 'Créer un cabinet d\'audit virtuel et auditer 3 entreprises',
    description: 'Simulation : votre groupe forme un cabinet et conduit 3 missions d\'audit sur des cas réels (anonymisés).',
    dateDebut: new Date('2026-04-15'),
    dateFin: new Date('2026-06-10'),
    dateSoutenance: new Date('2026-06-15'),
    courseTitre: 'Audit financier',
    phases: [
      { titre: 'Constitution du cabinet', statut: 'a_faire', dateFin: new Date('2026-04-22'), checklist: [
        { texte: 'Former le groupe', done: false },
        { texte: 'Distribuer les rôles (associé, senior, junior)', done: false },
        { texte: 'Créer la charte déontologique', done: false },
      ]},
      { titre: 'Planification de l\'audit', statut: 'a_faire', dateFin: new Date('2026-05-05'), checklist: [
        { texte: 'Évaluer les risques par entreprise', done: false },
        { texte: 'Établir la lettre de mission', done: false },
        { texte: 'Calendrier des tests', done: false },
      ]},
      { titre: 'Exécution des audits', statut: 'a_faire', dateFin: new Date('2026-05-30'), checklist: [
        { texte: 'Tests de contrôle interne', done: false },
        { texte: 'Tests substantifs (échantillonnage)', done: false },
        { texte: 'Revue des états financiers', done: false },
      ]},
      { titre: 'Rapports finaux', statut: 'a_faire', dateFin: new Date('2026-06-08'), checklist: [
        { texte: '3 rapports d\'audit', done: false },
        { texte: 'Recommandations par entreprise', done: false },
      ]},
      { titre: 'Soutenance', statut: 'a_faire', dateFin: new Date('2026-06-15'), checklist: [] },
    ],
    ideas: [
      { titre: 'Exercice : Cartographie des risques', type: 'exercice', difficulte: 'moyen', estime: '3h' },
      { titre: 'Workshop : Utilisation d\'IDEA ou ACL pour les tests', type: 'workshop', difficulte: 'difficile', estime: '5h' },
      { titre: 'Recherche : Normes IFRS vs SCF algérien', type: 'recherche', difficulte: 'moyen', estime: '4h' },
    ],
  },
  // PROJET COLLABORATIF MULTI-MODULES
  {
    filiere: null, promotion: 'L3',
    titre: '[COLLABORATIF] Startup Tech+Management+Finance — FinTech algérienne',
    description: 'Projet transverse 3 filières : ISIL code le produit, Management fait le business, Finance le plan financier.',
    isCollaborative: true,
    multiModulesTitres: [
      'Développement Web Full-Stack',    // ISIL L3
      'Entrepreneuriat',                 // Management L3
      'Finance de marché',               // Finance L3
    ],
    dateDebut: new Date('2026-05-01'),
    dateFin: new Date('2026-06-25'),
    dateSoutenance: new Date('2026-06-28'),
    phases: [
      { titre: 'Lancement multi-filières', statut: 'a_faire', dateFin: new Date('2026-05-08'), checklist: [
        { texte: 'Former des groupes mixtes (2 ISIL + 2 Management + 1 Finance)', done: false },
        { texte: 'Choisir le vertical FinTech (paiement, crédit, investissement...)', done: false },
        { texte: 'Définir les rôles par filière', done: false },
      ]},
      { titre: 'Étude & conception', statut: 'a_faire', dateFin: new Date('2026-05-20'), checklist: [
        { texte: '[Management] Business Model Canvas', done: false },
        { texte: '[Management] Étude de marché (concurrents, persona)', done: false },
        { texte: '[Finance] Prévisionnel financier 3 ans', done: false },
        { texte: '[Finance] Plan de financement + BFR', done: false },
        { texte: '[ISIL] Architecture technique + choix stack', done: false },
        { texte: '[ISIL] Maquettes et user flow', done: false },
      ]},
      { titre: 'Développement du MVP', statut: 'a_faire', dateFin: new Date('2026-06-15'), checklist: [
        { texte: '[ISIL] Backend API + sécurité', done: false },
        { texte: '[ISIL] Frontend responsive', done: false },
        { texte: '[Management] Stratégie marketing (SEO, réseaux sociaux)', done: false },
        { texte: '[Finance] Tableaux de bord KPI financiers', done: false },
      ]},
      { titre: 'Pitch & soutenance conjointe', statut: 'a_faire', dateFin: new Date('2026-06-28'), checklist: [
        { texte: 'Pitch deck à 3 voix (Tech + Biz + Finance)', done: false },
        { texte: 'Démo live du produit', done: false },
        { texte: 'Q&R devant jury mixte', done: false },
      ]},
    ],
    ideas: [
      { titre: '[Tech] Intégrer une API bancaire sandbox', type: 'exercice', difficulte: 'difficile', estime: '8h' },
      { titre: '[Biz] Réaliser 10 interviews utilisateurs', type: 'recherche', difficulte: 'moyen', estime: '5h' },
      { titre: '[Finance] Construire le modèle DCF', type: 'livrable', difficulte: 'difficile', estime: '6h' },
      { titre: 'Workshop commun : Pitch de startup devant jury', type: 'workshop', difficulte: 'moyen', estime: '3h' },
      { titre: 'Idée secteur : paiement mobile Algérie (comme CIB)', type: 'autre', difficulte: 'moyen', estime: '2h' },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   MAIN SEED FUNCTION
═══════════════════════════════════════════════════════════════════════ */
export async function seedDemoData() {
  const prof = await User.findOne({ role: 'professeur', status: { $ne: 'rejected' } });
  if (!prof) {
    console.warn('[demoSeed] Aucun prof trouvé — skip');
    return;
  }

  let qcmsCreated = 0;
  let resourcesCreated = 0;
  let monoProjectsCreated = 0;
  let projectsCreated = 0;

  // ── QCMs ────────────────────────────────────────────────────────────
  for (const def of QCM_DEFS) {
    const course = await Course.findOne({ titre: def.courseTitre });
    if (!course) continue;
    const video = await Video.findOne({ titre: def.videoTitre, courseId: course._id });
    if (!video) continue;

    const existing = await QCM.findOne({ videoId: video._id });
    if (existing) continue;

    await QCM.create({
      videoId: video._id,
      titre: def.qcmTitre,
      questions: def.questions.map(q => ({
        texte: q.texte,
        options: q.options,
        correctAnswer: q.correctAnswer,
        questionType: 'single',
        correctAnswers: [q.correctAnswer],
        explanation: q.explanation || '',
      })),
      pointsPerQuestion: 10,
      timerSeconds: 30,
    });
    qcmsCreated++;
  }

  // ── Ressources ──────────────────────────────────────────────────────
  for (const def of RESOURCE_DEFS) {
    const course = await Course.findOne({ titre: def.courseTitre });
    if (!course) continue;
    for (const r of def.resources) {
      const existing = await Resource.findOne({ titre: r.titre, courseId: course._id });
      if (existing) continue;
      await Resource.create({
        ...r,
        courseId: course._id,
        uploadedBy: prof._id,
      });
      resourcesCreated++;
    }
  }

  // ── Projets mono-module ─────────────────────────────────────────────
  for (const def of MONO_PROJECT_DEFS) {
    const existing = await Project.findOne({ titre: def.titre });
    if (existing) continue;

    const course = def.courseTitre ? await Course.findOne({ titre: def.courseTitre, filiere: def.filiere }) : null;

    await Project.create({
      type: 'mono',
      titre: def.titre,
      description: def.description,
      enonce: def.enonce,
      motsCles: def.motsCles,
      courseId: course?._id,
      createdBy: prof._id,
      status: 'actif',
      phases: def.phases.map(p => ({
        titre: p.titre,
        statut: p.statut,
        checklist: p.checklist || [],
      })),
      ideas: def.ideas.map(i => ({ ...i, addedBy: prof._id })),
    });
    monoProjectsCreated++;
  }

  // ── Projets ─────────────────────────────────────────────────────────
  for (const def of PROJECT_DEFS) {
    const existing = await Project.findOne({ titre: def.titre });
    if (existing) continue;

    let courseId = null;
    let modulesIds = [];

    if (def.courseTitre) {
      const c = await Course.findOne({ titre: def.courseTitre });
      courseId = c?._id || null;
    }
    if (def.isCollaborative && def.multiModulesTitres) {
      const modules = await Course.find({ titre: { $in: def.multiModulesTitres } }).select('_id');
      modulesIds = modules.map(m => m._id);
      courseId = modulesIds[0]; // cours principal
    }

    // Mono-module si pas de modules multiples ; groupé sinon
    const projectType = (modulesIds.length >= 2) ? 'groupe' : 'mono';
    await Project.create({
      type: projectType,
      titre: def.titre,
      description: def.description,
      courseId,
      modules: modulesIds,
      createdBy: prof._id,
      status: 'actif',
      dateDebut: def.dateDebut,
      dateFin: def.dateFin,
      dateSoutenance: def.dateSoutenance,
      phases: def.phases.map(p => ({
        titre: p.titre,
        statut: p.statut,
        dateFin: p.dateFin,
        checklist: p.checklist || [],
      })),
      ideas: (def.ideas || []).map(i => ({ ...i, addedBy: prof._id })),
    });
    projectsCreated++;
  }

  console.log(`[demoSeed] ${qcmsCreated} QCMs, ${resourcesCreated} ressources, ${monoProjectsCreated} projets mono-module, ${projectsCreated} projets groupés créés.`);
  return { qcmsCreated, resourcesCreated, monoProjectsCreated, projectsCreated };
}
