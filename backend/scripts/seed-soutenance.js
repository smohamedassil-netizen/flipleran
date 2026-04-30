#!/usr/bin/env node
/**
 * seed-soutenance.js — Scène de démo cohérente pour la soutenance PFE.
 *
 * Crée :
 *   1. Une professeure « Mme Lebrun » (clin d'œil à Marcel Lebrun)
 *   2. Un cours « Sécurité Web — L3 ISIL » avec 5 outcomes Bloom et un
 *      contrat pédagogique soigné
 *   3. 3 vidéos avec chapters (URLs Google Cloud sample stables)
 *   4. 3 VideoQuestion sur la vidéo 1 (timestamps 90s / 240s / 450s)
 *   5. 3 QCM (un par vidéo, mix Bloom remember/understand/apply)
 *   6. Un LearningPath publié de 7 steps (V→QCM→V→QCM→V→QCM→Prosit)
 *   7. Un Prosit « Sécuriser une API REST contre OWASP Top 10 » en
 *      phase 'retour', 2 groupes de 4, contributions et workspace remplis
 *   8. 8 étudiants avec progression variée (2 excellents, 4 moyens,
 *      2 en difficulté) — visionnages, scores QCM, peer assessments
 *
 * Idempotent par défaut : si Mme Lebrun existe déjà, on quitte sans
 * modifier. Avec `--reset`, on supprime tout ce que ce script a créé
 * (par marqueurs dans description / titre) puis on recrée.
 *
 * Usage :
 *   node backend/scripts/seed-soutenance.js
 *   node backend/scripts/seed-soutenance.js --reset
 *   node backend/scripts/seed-soutenance.js --dry-run    (preview, no write)
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Video from '../models/Video.js';
import VideoQuestion from '../models/VideoQuestion.js';
import QCM from '../models/QCM.js';
import Prosit from '../models/Prosit.js';
import LearningPath from '../models/LearningPath.js';
import Progress from '../models/Progress.js';
import { finalizeProsit } from '../services/prositXP.js';

const args = process.argv.slice(2);
const RESET   = args.includes('--reset');
const DRY_RUN = args.includes('--dry-run');

const MARKER = '[soutenance-seed]';
const COMMON_PWD = 'demo1234';

/* ─────────────────────────────────────────────────────────────────────────
   ACTEURS
───────────────────────────────────────────────────────────────────────── */

const PROF = {
  email:    'lebrun@fliplearn.dz',
  password: COMMON_PWD,
  prenom:   'Marie',
  nom:      'Lebrun',
  role:     'professeur',
  filiere:  'ISIL',
  promotion:'L3',
  status:   'active',
};

// 8 étudiants ISIL L3 avec profils d'engagement
const STUDENTS = [
  // 2 excellents (engagement ~90%)
  { email: 'sara.demo@fliplearn.dz',   prenom: 'Sara',   nom: 'Bachir',     engagement: 0.95 },
  { email: 'yanis.demo@fliplearn.dz',  prenom: 'Yanis',  nom: 'Hadjadj',    engagement: 0.90 },
  // 4 moyens (engagement ~60%)
  { email: 'lina.demo@fliplearn.dz',   prenom: 'Lina',   nom: 'Mansouri',   engagement: 0.65 },
  { email: 'walid.demo@fliplearn.dz',  prenom: 'Walid',  nom: 'Khelil',     engagement: 0.60 },
  { email: 'rania.demo@fliplearn.dz',  prenom: 'Rania',  nom: 'Brahimi',    engagement: 0.55 },
  { email: 'samir.demo@fliplearn.dz',  prenom: 'Samir',  nom: 'Belkacem',   engagement: 0.62 },
  // 2 en difficulté (engagement ~35%)
  { email: 'imane.demo@fliplearn.dz',  prenom: 'Imane',  nom: 'Larbi',      engagement: 0.38 },
  { email: 'mehdi.demo@fliplearn.dz',  prenom: 'Mehdi',  nom: 'Yahiaoui',   engagement: 0.30 },
].map((s) => ({
  ...s,
  password: COMMON_PWD,
  role: 'etudiant',
  filiere: 'ISIL',
  promotion: 'L3',
  status: 'active',
}));

/* ─────────────────────────────────────────────────────────────────────────
   COURS — Sécurité Web L3 ISIL
───────────────────────────────────────────────────────────────────────── */

const PEDAGOGICAL_CONTRACT = `# Bienvenue dans Sécurité Web — L3 ISIL

## Ce que tu vas apprendre

À la fin de ce module, tu seras capable d'identifier les principales vulnérabilités d'une application web (OWASP Top 10), de comprendre les mécanismes d'attaque les plus courants (XSS, injection SQL, CSRF), d'**implémenter** des contre-mesures concrètes côté serveur et navigateur, puis de **comparer** différentes stratégies d'authentification et d'autorisation.

## Comment on travaille

- **Avant le présentiel** : tu regardes les vidéos courtes (15-25 min), tu réponds aux questions interactives qui apparaissent pendant le visionnage, et tu passes le QCM pour vérifier tes acquis.
- **En classe** : on débat des cas concrets, on réalise les ateliers Prosit (méthode APP/CESI) et on défend nos solutions devant le groupe.
- **Après** : tu réalises ton Prosit en groupe, tu évalues tes pairs et tu rédiges ton journal d'apprentissage.

## Engagement réciproque

- *Je m'engage à* : produire des supports synthétiques (≤25 min de vidéo par leçon), répondre sous 24h aux questions postées sur le chat du module, et fournir un retour individualisé après chaque Prosit.
- *Tu t'engages à* : visionner chaque vidéo avant le présentiel, contribuer activement aux Prosits, évaluer tes pairs honnêtement.

## Évaluation

QCM formatifs (20%) · Prosit collectif (50%, dont 30% via évaluation par les pairs) · Journal d'apprentissage final (30%).

*Bonne navigation — et n'hésite pas à abuser de l'assistant IA du module pour tes recherches.*`;

const OUTCOMES = [
  // Remember
  { statement: 'Identifier les 10 vulnérabilités majeures du référentiel OWASP Top 10 (2021).', bloomLevel: 'remember',  estimatedMinutes: 20 },
  // Understand x2
  { statement: 'Expliquer le mécanisme d\'une attaque XSS (Cross-Site Scripting) stockée et réfléchie.', bloomLevel: 'understand', estimatedMinutes: 30 },
  { statement: 'Distinguer les rôles respectifs de l\'authentification et de l\'autorisation dans une API REST.', bloomLevel: 'understand', estimatedMinutes: 25 },
  // Apply
  { statement: 'Implémenter une stratégie d\'échappement des entrées utilisateur côté serveur (Node.js + Express).', bloomLevel: 'apply', estimatedMinutes: 45 },
  // Analyze
  { statement: 'Comparer les stratégies de session JWT vs cookie httpOnly et identifier les compromis sécurité / ergonomie.', bloomLevel: 'analyze', estimatedMinutes: 40 },
];

/* ─── Vidéos (URLs Google Cloud sample stables) ─────────────────────────── */
const VIDEO_POOL = [
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',         duration: 888, thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',   duration: 734, thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',   duration: 596, thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg' },
];

const VIDEOS_DEF = [
  {
    titre: 'Introduction à OWASP Top 10',
    description: `${MARKER} Découverte des 10 vulnérabilités les plus critiques du web en 2021. Vidéo de référence pour identifier les vecteurs d'attaque les plus courants.`,
    chapters: [
      { title: 'Pourquoi OWASP ?',                timestamp: 0   },
      { title: 'A01 — Broken Access Control',     timestamp: 90  },
      { title: 'A03 — Injection',                 timestamp: 240 },
      { title: 'A07 — Identification & Auth',     timestamp: 380 },
      { title: 'Synthèse et bonnes pratiques',    timestamp: 520 },
    ],
    outcomeIndices: [0],            // remember
  },
  {
    titre: 'XSS, CSRF et défenses navigateur',
    description: `${MARKER} Mécanismes des attaques XSS (stockée, réfléchie, DOM-based) et CSRF. Mise en pratique de Content-Security-Policy, SameSite cookies, et sanitisation côté serveur.`,
    chapters: [
      { title: 'XSS stocké vs réfléchi', timestamp: 0   },
      { title: 'CSRF en pratique',       timestamp: 180 },
      { title: 'Headers de sécurité',    timestamp: 360 },
      { title: 'Sanitisation Node.js',   timestamp: 540 },
    ],
    outcomeIndices: [1, 3],         // understand + apply
  },
  {
    titre: 'Authentification API REST : JWT vs sessions',
    description: `${MARKER} Comparaison détaillée des stratégies d'authentification pour une API REST moderne. Couvre les compromis sécurité, scalabilité et ergonomie.`,
    chapters: [
      { title: 'Sessions classiques',     timestamp: 0   },
      { title: 'JWT : claims et signature', timestamp: 150 },
      { title: 'httpOnly + refresh',      timestamp: 360 },
      { title: 'Quand choisir quoi ?',    timestamp: 560 },
    ],
    outcomeIndices: [2, 4],         // understand + analyze
  },
];

/* ─── VideoQuestions sur la vidéo 1 ─────────────────────────────────────── */
const VIDEO_QUESTIONS_V1 = [
  {
    timestamp: 90,
    texte: 'Quelle vulnérabilité est listée en A01 du Top 10 OWASP 2021 ?',
    options: {
      A: 'Cross-Site Scripting',
      B: 'Broken Access Control',
      C: 'Injection SQL',
      D: 'Server-Side Request Forgery',
    },
    correctAnswer: 'B',
    explanation: 'Broken Access Control est passé de la 5e (2017) à la 1ère place (2021). 94% des applications testées présentaient une forme de défaut de contrôle d\'accès.',
  },
  {
    timestamp: 240,
    texte: 'Une injection SQL classique repose sur :',
    options: {
      A: 'L\'absence de HTTPS',
      B: 'L\'absence d\'échappement des entrées utilisateur dans une requête SQL',
      C: 'Une mauvaise configuration du pare-feu',
      D: 'Un mot de passe trop court',
    },
    correctAnswer: 'B',
    explanation: 'Sans paramétrage des requêtes (prepared statements), une entrée utilisateur est interprétée comme du code SQL — ce qui permet à l\'attaquant d\'exfiltrer ou modifier des données.',
  },
  {
    timestamp: 450,
    texte: 'Qu\'est-ce que la « politique du moindre privilège » applique ?',
    options: {
      A: 'Ne donner à un compte que les droits strictement nécessaires à sa fonction',
      B: 'Donner tous les droits aux administrateurs',
      C: 'Désactiver l\'authentification pour les développeurs',
      D: 'Stocker les mots de passe en clair pour faciliter la maintenance',
    },
    correctAnswer: 'A',
    explanation: 'Principe fondateur en sécurité (Saltzer & Schroeder, 1975). Limiter la surface d\'attaque en cas de compromission d\'un compte.',
  },
];

/* ─── QCM par vidéo (5 questions, mix Bloom) ────────────────────────────── */
function makeQCMQuestions(videoIdx) {
  if (videoIdx === 0) {
    return [
      {
        texte: 'Combien de catégories contient le référentiel OWASP Top 10 ?',
        options: { A: '5', B: '8', C: '10', D: '12' },
        questionType: 'single', correctAnswer: 'C',
        explanation: 'Le Top 10 OWASP — par construction — recense 10 catégories de risques.',
      },
      {
        texte: 'Lequel de ces patterns indique une probable Broken Access Control ?',
        options: {
          A: 'L\'application demande un mot de passe',
          B: 'Une URL exposant un id de ressource permet à n\'importe quel utilisateur connecté de la modifier',
          C: 'Le serveur utilise HTTPS',
          D: 'Les sessions expirent au bout d\'une heure',
        },
        questionType: 'single', correctAnswer: 'B',
        explanation: 'IDOR (Insecure Direct Object Reference) est la forme la plus courante de Broken Access Control.',
      },
      {
        texte: 'Pourquoi l\'OWASP Top 10 évolue-t-il dans le temps ?',
        options: {
          A: 'Pour augmenter le nombre de catégories',
          B: 'Parce que les techniques d\'attaque et les contre-mesures évoluent (statistiques de CVE, retours d\'incidents)',
          C: 'Parce que les frameworks changent de logo',
          D: 'Pour des raisons commerciales',
        },
        questionType: 'single', correctAnswer: 'B',
        explanation: 'Le Top 10 est révisé tous les 3 ans environ, sur la base d\'une analyse statistique des vulnérabilités réelles observées.',
      },
      {
        texte: 'Une attaque par injection peut concerner :',
        options: {
          A: 'Uniquement SQL',
          B: 'SQL, NoSQL, LDAP, OS commands, XPath, et autres interpréteurs',
          C: 'Uniquement les bases relationnelles',
          D: 'Aucun de ces éléments',
        },
        questionType: 'single', correctAnswer: 'B',
        explanation: 'Toute donnée passée à un interpréteur sans échappement est un vecteur potentiel d\'injection.',
      },
      {
        texte: 'Le principe « defense in depth » consiste à :',
        options: {
          A: 'Mettre une seule mesure de sécurité très forte',
          B: 'Empiler plusieurs couches de défense pour qu\'une faille n\'ouvre pas tout',
          C: 'Cacher le code source',
          D: 'Augmenter la profondeur des logs',
        },
        questionType: 'single', correctAnswer: 'B',
        explanation: 'La défense en profondeur (NSA Information Assurance) suppose qu\'aucune mesure n\'est infaillible et combine plusieurs lignes pour ralentir / détecter l\'attaquant.',
      },
    ];
  }
  if (videoIdx === 1) {
    return [
      {
        texte: 'Dans une attaque XSS stockée, le payload malveillant est :',
        options: {
          A: 'Stocké en base de données et restitué tel quel à d\'autres utilisateurs',
          B: 'Uniquement présent dans l\'URL',
          C: 'Dans un cookie de session',
          D: 'Chiffré côté serveur',
        },
        questionType: 'single', correctAnswer: 'A',
        explanation: 'XSS stocké = persistance en base. La victime n\'a pas besoin de cliquer sur un lien spécial : elle visite simplement la page qui affiche le contenu pollué.',
      },
      {
        texte: 'Quel header HTTP réduit drastiquement le risque de XSS ?',
        options: { A: 'Cache-Control', B: 'Content-Security-Policy', C: 'Content-Type', D: 'Accept-Language' },
        questionType: 'single', correctAnswer: 'B',
        explanation: 'CSP permet de contraindre les sources de scripts autorisées et de bloquer le inline-script (avec une nonce ou un hash).',
      },
      {
        texte: 'Un cookie marqué SameSite=Strict :',
        options: {
          A: 'Est envoyé pour toutes les requêtes',
          B: 'N\'est envoyé que lorsque la requête provient du même site',
          C: 'Est chiffré',
          D: 'Expire automatiquement',
        },
        questionType: 'single', correctAnswer: 'B',
        explanation: 'SameSite=Strict bloque l\'envoi du cookie sur les requêtes cross-site, ce qui mitige largement le CSRF.',
      },
      {
        texte: 'Pour échapper l\'HTML utilisateur en Node/Express, on peut :',
        options: {
          A: 'Utiliser une lib comme `dompurify` ou `escape-html`, ou `Helmet` pour les headers',
          B: 'Ne rien faire, le navigateur s\'en charge',
          C: 'Compresser le HTML',
          D: 'Désactiver JavaScript',
        },
        questionType: 'single', correctAnswer: 'A',
        explanation: 'L\'échappement doit être systématique côté serveur. Le navigateur n\'échappe pas par défaut le HTML qu\'on lui sert.',
      },
      {
        texte: 'Si une page affiche le pseudo de l\'utilisateur sans échapper, c\'est un risque :',
        options: { A: 'XSS réfléchi ou stocké selon l\'origine du pseudo', B: 'CSRF', C: 'SQL injection', D: 'Aucun risque' },
        questionType: 'single', correctAnswer: 'A',
        explanation: 'Un attaquant met `<script>...</script>` dans son pseudo ; toute page affichant ce pseudo exécute son code.',
      },
    ];
  }
  // videoIdx === 2 : JWT vs sessions
  return [
    {
      texte: 'Un JWT est :',
      options: {
        A: 'Chiffré en AES par défaut',
        B: 'Une chaîne signée (HS256/RS256) lisible par n\'importe qui',
        C: 'Toujours stocké en sessionStorage',
        D: 'Une session côté serveur',
      },
      questionType: 'single', correctAnswer: 'B',
      explanation: 'JWT n\'est pas chiffré par défaut, juste signé. Le payload est en base64url et lisible — il ne faut donc PAS y mettre de données sensibles en clair.',
    },
    {
      texte: 'Un cookie httpOnly :',
      options: {
        A: 'Ne peut pas être lu par JavaScript côté client',
        B: 'Ne peut être envoyé qu\'en HTTPS',
        C: 'Ne contient pas de données',
        D: 'Est obsolète',
      },
      questionType: 'single', correctAnswer: 'A',
      explanation: 'httpOnly bloque l\'accès via document.cookie, ce qui mitige l\'exfiltration en cas de XSS. Combiner avec Secure (HTTPS) et SameSite.',
    },
    {
      texte: 'Le principal compromis de JWT vs sessions classiques :',
      options: {
        A: 'JWT est stateless mais difficile à révoquer instantanément',
        B: 'Sessions sont stateless',
        C: 'JWT est plus rapide à signer qu\'à vérifier',
        D: 'Aucun compromis',
      },
      questionType: 'single', correctAnswer: 'A',
      explanation: 'JWT évite la lookup serveur à chaque requête (scalable) mais on ne peut pas l\'invalider sans mécanisme additionnel (blacklist Redis, courte expiration + refresh token).',
    },
    {
      texte: 'Pour stocker un JWT côté client :',
      options: {
        A: 'localStorage suffit, c\'est la bonne pratique',
        B: 'sessionStorage / localStorage exposent au XSS ; un cookie httpOnly est plus sûr',
        C: 'En cookie classique sans flag',
        D: 'En clair dans l\'URL',
      },
      questionType: 'single', correctAnswer: 'B',
      explanation: 'Tout token accessible à JavaScript est exfiltrable si une XSS est exploitée. Cookie httpOnly + Secure + SameSite est la voie recommandée.',
    },
    {
      texte: 'Pour une API REST publique servant un mobile + un web app :',
      options: {
        A: 'Sessions stickies obligatoires',
        B: 'JWT avec refresh token courte durée + httpOnly cookie pour le refresh est une approche solide',
        C: 'Authentification par adresse IP',
        D: 'Pas d\'authentification',
      },
      questionType: 'single', correctAnswer: 'B',
      explanation: 'Schéma classique en 2026 : access JWT court (15min), refresh token httpOnly long (7-30j), rotation à chaque refresh.',
    },
  ];
}

/* ─── PROSIT — Sécuriser une API REST contre OWASP Top 10 ───────────────── */
const PROSIT_DEF = {
  titre: 'Sécuriser une API REST contre OWASP Top 10',
  description: `${MARKER} Atelier Prosit en groupe : audit de sécurité d'une API existante.`,
  enonce: `Une startup algéroise de livraison de repas (« RestoNow ») vient d'être victime d'un incident sécurité : un journaliste a démontré qu'il pouvait accéder aux commandes d'autres clients en modifiant simplement l'identifiant dans l'URL, et qu'un champ "Adresse" pollué affichait du JavaScript chez d'autres utilisateurs. La direction technique vous mandate pour auditer l'API REST de l'application (Node.js + Express + MongoDB), identifier les vulnérabilités OWASP présentes, et proposer un plan de remédiation chiffré et priorisé.

Vous devrez livrer :
1. Une cartographie des risques alignée sur le Top 10 OWASP 2021 (au moins 5 catégories examinées).
2. Une priorisation argumentée (impact × probabilité × coût de remédiation).
3. Trois exemples concrets de patches de code (avant / après) sur des extraits typiques d'Express.
4. Une recommandation sur la stratégie d'authentification (sessions classiques, JWT en cookie httpOnly, ou OAuth2 délégué) avec justification.

Le tuteur évaluera la profondeur de l'analyse, la rigueur des sources et la qualité de la défense orale.`,
  motsCles: ['OWASP Top 10', 'XSS', 'IDOR', 'JWT', 'CSP', 'sanitisation', 'authentification'],
  objectifsApprentissage: [
    'Cartographier les vulnérabilités d\'une API REST réelle',
    'Prioriser les corrections selon le risque',
    'Implémenter des patches concrets côté serveur Node.js',
    'Argumenter une stratégie d\'authentification',
  ],
  filiere: 'ISIL',
  promotion: 'L3',
  caseEntreprise: 'RestoNow — startup algéroise de livraison de repas (250 000 utilisateurs)',
  groupesConfig: { minMembres: 4, maxMembres: 4, formationMode: 'manual' },
  grilleEvaluation: [
    { critere: 'Pertinence de la cartographie OWASP', poids: 25, description: 'Couverture, justesse des risques identifiés' },
    { critere: 'Profondeur de l\'analyse',             poids: 25, description: 'Sources, exemples de CVE, raisonnement' },
    { critere: 'Qualité des patches proposés',         poids: 30, description: 'Code correct, contre-mesures pertinentes' },
    { critere: 'Présentation orale',                   poids: 20, description: 'Clarté, gestion du temps, défense argumentée' },
  ],
};

const GROUPE_1_WORKSPACE = {
  motsClesIdentifies: ['IDOR', 'XSS stocké', 'CSP', 'JWT vs cookie httpOnly', 'rate limiting'],
  problematiqueReformulee: 'Comment auditer méthodiquement une API Node.js / Express dont l\'historique a déjà laissé fuiter des données, et quelles 3 contre-mesures prioritaires implémenter dans la première sprint ?',
  hypotheses: [
    'Les 2 incidents publics (commandes accessibles, XSS dans Adresse) ne sont que la partie visible — d\'autres failles probables sur l\'authentification.',
    'IDOR est plus rapide à patcher (middleware d\'autorisation) que la généralisation de la sanitisation HTML.',
    'JWT en cookie httpOnly + refresh token est plus simple à mettre en œuvre qu\'OAuth2 délégué pour cette taille d\'équipe.',
  ],
  planAction: 'Sara : audit OWASP A01-A05 + propositions de patches IDOR. Yanis : audit XSS / CSRF + patch CSP. Lina : audit auth JWT + comparatif. Walid : synthèse et préparation présentation.',
  solutionTexte: 'Synthèse en cours — voir contributions individuelles. La présentation finale insistera sur le triplet IDOR / XSS / authentification comme priorité sprint 1.',
};

const GROUPE_2_WORKSPACE = {
  motsClesIdentifies: ['injection NoSQL', 'CSRF', 'logs', 'monitoring', 'OWASP A07'],
  problematiqueReformulee: 'Quelle stratégie de remédiation à 3 mois permettrait de couvrir progressivement le Top 10 sans bloquer les développements feature ?',
  hypotheses: [
    'L\'absence de monitoring est aussi grave que les failles techniques car elle empêche la détection.',
    'L\'équipe RestoNow étant petite, externaliser une partie via un WAF managé peut accélérer.',
    'Un sprint dédié sécurité tous les 2 mois est plus efficace qu\'un saupoudrage continu.',
  ],
  planAction: 'Rania : injection NoSQL + monitoring. Samir : CSRF + cookies. Imane : OWASP A07 / A09. Mehdi : synthèse.',
  solutionTexte: 'Solution en cours de rédaction.',
};

const CONTRIBUTIONS = {
  // Group 1 (excellents + moyen)
  sara:  'Audit complet de l\'A01 (Broken Access Control). Proposition d\'un middleware Express `requireOwnership(resourceModel)` qui vérifie que `req.user._id === resource.userId` avant d\'autoriser la modification. Code typescript fourni en annexe avec tests Jest. 4 sources : OWASP cheatsheet, Express security guide, RFC 7519, et une CVE 2024 pertinente sur une plateforme similaire.',
  yanis: 'Analyse XSS/CSRF approfondie. Recommande d\'ajouter Helmet middleware + CSP avec nonce, SameSite=Strict sur les cookies de session, et une lib comme `dompurify` pour le HTML enrichi (champ Adresse). Patch avant/après fourni avec mesure d\'impact (charge CPU + 0.3ms négligeable).',
  lina:  'Comparatif sessions classiques vs JWT pour cette taille d\'équipe. Conclut JWT-en-cookie-httpOnly avec refresh 7j et access 15min. Tableau comparatif sur 6 critères : sécurité, scalabilité, complexité, debug, rotation, mobile.',
  walid: 'Synthèse des contributions des 3 autres + préparation du support de présentation (slides + démo live d\'un IDOR sur une instance test).',
  // Group 2 (moyen + difficulté)
  rania: 'Brève analyse injection NoSQL : l\'usage de `$where` ou de query builders dynamiques sur Mongoose est un risque. Recommande validateur Joi en amont. 2 sources OWASP.',
  samir: 'Étude CSRF : explique le scénario, propose token anti-CSRF + SameSite. Court mais correct.',
  imane: 'Note brève sur les logs : peu de matière, citation OWASP A09 sans approfondir.',
  mehdi: '', // pas de contribution → free-rider potentiel à la finalisation
};

/* ─────────────────────────────────────────────────────────────────────────
   RESET — drop tout ce que ce script a créé (par marqueurs)
───────────────────────────────────────────────────────────────────────── */

async function resetSeed() {
  console.log('[seed-soutenance] --reset : suppression des données de la démo...');

  const prof = await User.findOne({ email: PROF.email });
  const studentEmails = STUDENTS.map((s) => s.email);

  if (prof) {
    // Cours créés par ce prof avec marqueur
    const courses = await Course.find({ professorId: prof._id });
    const courseIds = courses.map((c) => c._id);
    const videos = await Video.find({ courseId: { $in: courseIds } });
    const videoIds = videos.map((v) => v._id);

    await VideoQuestion.deleteMany({ videoId: { $in: videoIds } });
    await QCM.deleteMany({ videoId: { $in: videoIds } });
    await Video.deleteMany({ courseId: { $in: courseIds } });
    await LearningPath.deleteMany({ courseId: { $in: courseIds } });
    await Prosit.deleteMany({ createdBy: prof._id });
    await Course.deleteMany({ _id: { $in: courseIds } });
    await Progress.deleteMany({ courseId: { $in: courseIds } });
  }

  await User.deleteMany({ email: { $in: [...studentEmails, PROF.email] } });
  console.log('[seed-soutenance] reset terminé.');
}

/* ─────────────────────────────────────────────────────────────────────────
   MAIN
───────────────────────────────────────────────────────────────────────── */

async function main() {
  console.log(`[seed-soutenance] Connexion à MongoDB${DRY_RUN ? ' (DRY RUN)' : ''}...`);
  await connectDB();

  if (RESET) {
    if (DRY_RUN) console.log('[seed-soutenance] (dry-run) skip reset effectif');
    else await resetSeed();
  }

  // Idempotence par défaut : si la prof existe déjà, on quitte
  const existingProf = await User.findOne({ email: PROF.email });
  if (existingProf && !RESET) {
    console.log(`[seed-soutenance] Mme Lebrun existe déjà (${existingProf.email}). Rien à faire.`);
    console.log('  → Pour repartir d\'une scène fraîche : node backend/scripts/seed-soutenance.js --reset');
    await mongoose.connection.close();
    return;
  }

  if (DRY_RUN) {
    console.log('[seed-soutenance] (dry-run) — aucune écriture. Plan :');
    console.log(`  · 1 prof : ${PROF.email}`);
    console.log(`  · ${STUDENTS.length} étudiants`);
    console.log(`  · 1 cours avec ${OUTCOMES.length} outcomes Bloom + contrat pédagogique`);
    console.log(`  · ${VIDEOS_DEF.length} vidéos avec chapters`);
    console.log(`  · ${VIDEO_QUESTIONS_V1.length} questions in-video sur la vidéo 1`);
    console.log(`  · 3 QCM (${makeQCMQuestions(0).length} questions chacun)`);
    console.log(`  · 1 LearningPath publié de 7 steps`);
    console.log(`  · 1 Prosit en phase 'retour' avec 2 groupes de 4 + peer assessments + finalize sur groupe 1`);
    await mongoose.connection.close();
    return;
  }

  /* ── 1. Prof ─────────────────────────────────────────────────────────── */
  const prof = await User.create(PROF);
  console.log(`  + prof créée : ${prof.email}`);

  /* ── 2. Étudiants ────────────────────────────────────────────────────── */
  const students = await User.create(STUDENTS);
  console.log(`  + ${students.length} étudiants créés`);
  const byEmail = Object.fromEntries(students.map((s) => [s.email, s]));

  /* ── 3. Cours ────────────────────────────────────────────────────────── */
  const course = await Course.create({
    titre: 'Sécurité Web — L3 ISIL',
    description: `${MARKER} OWASP Top 10, attaques web courantes, contre-mesures et stratégies d'authentification API.`,
    professorId: prof._id,
    filiere: 'ISIL',
    promotion: 'L3',
    isActive: true,
    aiPersona: {
      nom: 'Sec-Bot',
      specialite: 'Sécurité applicative web',
      avatar: '🛡️',
      ton: 'expert',
      description: 'Assistant IA spécialisé en sécurité web, privilégie sources OWASP, MDN et NIST.',
      couleur: '#9B2335',
    },
    learningOutcomes: OUTCOMES,
    pedagogicalContract: PEDAGOGICAL_CONTRACT,
  });
  // Mongoose attribue les _id aux outcomes au save : on les récupère après
  const outcomeIds = course.learningOutcomes.map((o) => o._id);
  console.log(`  + cours "${course.titre}" + ${outcomeIds.length} outcomes Bloom`);

  /* ── 4. Vidéos avec chapters + coversOutcomes ─────────────────────────── */
  const videos = [];
  for (let i = 0; i < VIDEOS_DEF.length; i++) {
    const def = VIDEOS_DEF[i];
    const sample = VIDEO_POOL[i];
    const v = await Video.create({
      titre:        def.titre,
      description:  def.description,
      provider:     'cloudinary',
      url:          sample.url,
      thumbnailUrl: sample.thumb,
      duration:     sample.duration,
      order:        i,
      chapters:     def.chapters,
      courseId:     course._id,
      createdBy:    prof._id,
      coversOutcomes: def.outcomeIndices.map((idx) => outcomeIds[idx]),
    });
    videos.push(v);
  }
  console.log(`  + ${videos.length} vidéos`);

  /* ── 5. VideoQuestions sur la vidéo 1 ─────────────────────────────────── */
  for (const q of VIDEO_QUESTIONS_V1) {
    await VideoQuestion.create({
      videoId: videos[0]._id,
      timestamp: q.timestamp,
      texte: q.texte,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      pauseVideo: true,
      createdBy: prof._id,
    });
  }
  console.log(`  + ${VIDEO_QUESTIONS_V1.length} questions in-video sur la vidéo 1`);

  /* ── 6. QCM par vidéo ─────────────────────────────────────────────────── */
  const qcms = [];
  for (let i = 0; i < videos.length; i++) {
    const qcm = await QCM.create({
      videoId: videos[i]._id,
      titre: `QCM — ${videos[i].titre}`,
      questions: makeQCMQuestions(i),
      pointsPerQuestion: 10,
      timerSeconds: 30,
    });
    qcms.push(qcm);
  }
  console.log(`  + ${qcms.length} QCM (5 questions chacun)`);

  /* ── 7. Progressions étudiantes (visionnages + scores QCM) ────────────── */
  const today = new Date();
  for (const s of STUDENTS) {
    const u = byEmail[s.email];
    const progress = await Progress.create({
      userId: u._id,
      courseId: course._id,
      videosCompleted: [],
      qcmScores: [],
      lastActivity: today,
    });

    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];
      const decay = 1 - i * 0.15;            // étudiant tend à décrocher en avançant
      const watchedPercent = Math.round(Math.max(0, Math.min(100, s.engagement * 100 * decay + (Math.random() * 8 - 4))));
      if (watchedPercent > 0) {
        v.watchedBy.push({
          userId: u._id,
          watchedPercent,
          completed: watchedPercent >= 80,
          completedAt: watchedPercent >= 80 ? today : undefined,
          lastWatchedAt: today,
        });
        if (watchedPercent >= 80) {
          progress.videosCompleted.push(v._id);
        }
      }

      // QCM uniquement si vidéo regardée à ≥ 50%
      if (watchedPercent >= 50) {
        const score = Math.round(Math.max(0, Math.min(100, s.engagement * 100 * (0.85 + Math.random() * 0.2))));
        const correctCount = Math.round((score / 100) * 5);
        qcms[i].resultats.push({
          userId: u._id,
          score,
          correctCount,
          pointsEarned: correctCount * 10,
          answers: [],          // simplification : pas de détail des réponses
          completedAt: today,
        });
        progress.qcmScores.push({ qcmId: qcms[i]._id, score });
      }
    }
    await progress.save();
  }
  await Promise.all(videos.map((v) => v.save()));
  await Promise.all(qcms.map((q) => q.save()));
  console.log('  + progression étudiante variée enregistrée');

  /* ── 8. LearningPath publié (V→Q→V→Q→V→Q→Prosit) ──────────────────────── */
  // Prosit créé d'abord pour avoir son _id, ou bien on crée le path sans la step Prosit puis on l'ajoute après.
  // Plus simple : on crée le Prosit avant le path.

  /* ── 9. Prosit ───────────────────────────────────────────────────────── */
  const dateAller  = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);  // il y a 2 semaines
  const dateRetour = new Date(Date.now() -  3 * 24 * 60 * 60 * 1000);  // il y a 3 jours
  const peerDeadline = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000); // dans 4 jours

  const group1Members = ['sara', 'yanis', 'lina', 'walid'].map((p, i) => ({
    userId: byEmail[`${p}.demo@fliplearn.dz`]._id,
    role:   ['animateur', 'secretaire', 'scribe', 'gestionnaire'][i],
    contributionTexte:   CONTRIBUTIONS[p],
    contributionAt:      CONTRIBUTIONS[p] ? new Date() : null,
  }));
  const group2Members = ['rania', 'samir', 'imane', 'mehdi'].map((p, i) => ({
    userId: byEmail[`${p}.demo@fliplearn.dz`]._id,
    role:   ['animateur', 'secretaire', 'scribe', 'gestionnaire'][i],
    contributionTexte:   CONTRIBUTIONS[p],
    contributionAt:      CONTRIBUTIONS[p] ? new Date() : null,
  }));

  const prosit = await Prosit.create({
    titre: PROSIT_DEF.titre,
    description: PROSIT_DEF.description,
    enonce: PROSIT_DEF.enonce,
    motsCles: PROSIT_DEF.motsCles,
    objectifsApprentissage: PROSIT_DEF.objectifsApprentissage,
    courseId: course._id,
    filiere: PROSIT_DEF.filiere,
    promotion: PROSIT_DEF.promotion,
    caseEntreprise: PROSIT_DEF.caseEntreprise,
    dateAller,
    dateRetour,
    dureeRechercheJours: 7,
    createdBy: prof._id,
    status: 'retour',
    groupesConfig: PROSIT_DEF.groupesConfig,
    groupes: [
      {
        nom: 'Groupe Alpha',
        membres: group1Members,
        ...GROUPE_1_WORKSPACE,
        // Évaluation prof déjà saisie (16/20)
        evaluation: {
          noteGlobale: 16,
          criteres: [
            { nom: 'Pertinence cartographie', note: 17 },
            { nom: 'Profondeur analyse',      note: 16 },
            { nom: 'Qualité patches',         note: 16 },
            { nom: 'Présentation orale',      note: 15 },
          ],
          commentaire: 'Excellente analyse, patches concrets et bien argumentés. La présentation gagnerait à mieux gérer le temps sur la partie auth.',
          evaluePar: prof._id,
          evalueAt:  new Date(),
        },
      },
      {
        nom: 'Groupe Beta',
        membres: group2Members,
        ...GROUPE_2_WORKSPACE,
        // Pas d'évaluation prof : note manquante intentionnellement pour la démo
      },
    ],
    grilleEvaluation: PROSIT_DEF.grilleEvaluation,
    peerAssessmentEnabled: true,
    peerAssessmentDeadline: peerDeadline,
  });
  console.log(`  + Prosit "${prosit.titre}" en phase 'retour'`);

  /* ── 10. Self/peer assessments pour groupe 1 (complets) + groupe 2 (partiels) */
  const fresh = await Prosit.findById(prosit._id);
  const g1 = fresh.groupes[0];
  const g2 = fresh.groupes[1];

  // Groupe 1 — auto-évaluations + peer assessments complets entre les 4 membres
  const g1Ids = g1.membres.map((m) => m.userId);
  const selfG1 = [
    { uid: byEmail['sara.demo@fliplearn.dz']._id,   c: { effort: 5, quality: 5, communication: 4 }, refl: 'Premier Prosit où je me sens à l\'aise sur l\'OWASP. J\'ai aimé devoir argumenter mes choix de middleware face au groupe.' },
    { uid: byEmail['yanis.demo@fliplearn.dz']._id,  c: { effort: 5, quality: 4, communication: 5 }, refl: 'Le défi a été de tenir les délais — la rotation hebdo m\'a appris à découper plus tôt.' },
    { uid: byEmail['lina.demo@fliplearn.dz']._id,   c: { effort: 4, quality: 4, communication: 4 }, refl: 'J\'ai compris l\'intérêt du couple JWT-cookie après en avoir débattu, alors que la vidéo seule ne m\'avait pas convaincue.' },
    { uid: byEmail['walid.demo@fliplearn.dz']._id,  c: { effort: 3, quality: 3, communication: 4 }, refl: 'J\'aurais dû contribuer plus tôt sur le fond, je me suis surtout occupé de la synthèse à la fin.' },
  ];
  for (const s of selfG1) {
    g1.selfAssessments.push({
      userId: s.uid, criteria: s.c, reflection: s.refl, completedAt: new Date(),
    });
  }
  // Tous les peer assessments croisés du groupe 1 (4 × 3 = 12)
  const peerNotes = (a, b) => {
    // Notes ciblées : sara/yanis se notent haut, walid se fait noter moyen
    const map = {
      sara:  { participation: 5, contribution: 5, teamSpirit: 5, deadlineRespect: 5, listening: 5 },
      yanis: { participation: 5, contribution: 5, teamSpirit: 5, deadlineRespect: 4, listening: 5 },
      lina:  { participation: 4, contribution: 4, teamSpirit: 4, deadlineRespect: 4, listening: 4 },
      walid: { participation: 3, contribution: 3, teamSpirit: 4, deadlineRespect: 3, listening: 4 },
    };
    return map[b];
  };
  const g1Aliases = ['sara', 'yanis', 'lina', 'walid'];
  for (let i = 0; i < g1Aliases.length; i++) {
    for (let j = 0; j < g1Aliases.length; j++) {
      if (i === j) continue;
      g1.peerAssessments.push({
        evaluatorId: byEmail[`${g1Aliases[i]}.demo@fliplearn.dz`]._id,
        targetId:    byEmail[`${g1Aliases[j]}.demo@fliplearn.dz`]._id,
        criteria:    peerNotes(g1Aliases[i], g1Aliases[j]),
        comment: g1Aliases[j] === 'walid'
          ? 'Bonne synthèse finale, mais aurait pu contribuer plus tôt sur le fond.'
          : g1Aliases[j] === 'sara'
            ? 'Tirée par les autres, codes solides et sources rigoureuses.'
            : g1Aliases[j] === 'yanis'
              ? 'Très investi, patch CSP clair, pédagogue avec le groupe.'
              : 'Comparatif structuré, notamment le tableau JWT vs sessions.',
        isAnonymous: true,
        completedAt: new Date(),
      });
    }
  }

  // Groupe 2 — partiels : Rania a tout fait, Samir a fait son auto-éval, les autres rien
  g2.selfAssessments.push({
    userId: byEmail['rania.demo@fliplearn.dz']._id,
    criteria: { effort: 4, quality: 4, communication: 4 },
    reflection: 'Le sujet était dense, j\'aurais aimé plus de temps pour creuser l\'A09 (logs).',
    completedAt: new Date(),
  });
  g2.selfAssessments.push({
    userId: byEmail['samir.demo@fliplearn.dz']._id,
    criteria: { effort: 3, quality: 3, communication: 3 },
    reflection: 'Pas évident de coordonner avec le groupe en parallèle des autres modules.',
    completedAt: new Date(),
  });
  // Rania évalue tout le monde
  const g2Aliases = ['rania', 'samir', 'imane', 'mehdi'];
  for (const target of g2Aliases) {
    if (target === 'rania') continue;
    g2.peerAssessments.push({
      evaluatorId: byEmail['rania.demo@fliplearn.dz']._id,
      targetId:    byEmail[`${target}.demo@fliplearn.dz`]._id,
      criteria: target === 'mehdi'
        ? { participation: 1, contribution: 1, teamSpirit: 2, deadlineRespect: 1, listening: 2 }
        : target === 'imane'
          ? { participation: 3, contribution: 2, teamSpirit: 3, deadlineRespect: 2, listening: 3 }
          : { participation: 4, contribution: 3, teamSpirit: 4, deadlineRespect: 3, listening: 4 },
      comment: target === 'mehdi'
        ? 'Aucune contribution écrite n\'a été remise, peu présent aux échanges.'
        : target === 'imane'
          ? 'A fait le minimum, gagnerait à creuser plus.'
          : 'Présent et coopératif.',
      isAnonymous: true,
      completedAt: new Date(),
    });
  }

  await fresh.save();

  /* ── 11. Finalisation du groupe 1 (notes individuelles + XP individualisées) */
  const finRes = await finalizeProsit(fresh._id);
  console.log(`  + Prosit finalisé pour groupe 1 : ${finRes.groupsFinalized} groupe(s), ${finRes.totalXP} XP attribués`);

  /* ── 12. LearningPath publié ──────────────────────────────────────────── */
  const path = await LearningPath.create({
    courseId: course._id,
    title: 'Parcours sécurité web — du concept à la défense',
    description: 'Trois leçons vidéo + QCM, conclues par un atelier Prosit en groupe sur un cas réel.',
    steps: [
      { order: 0, type: 'video',  resourceId: videos[0]._id, resourceModel: 'Video',  title: 'Découvrir OWASP Top 10', estimatedMinutes: 18, customMessage: 'Concentre-toi sur les 3 premières catégories : ce sont celles qu\'on retrouvera tout au long du module.', unlockCriteria: { previousCompleted: true, minScore: 50, minWatchPercent: 70 } },
      { order: 1, type: 'qcm',    resourceId: qcms[0]._id,   resourceModel: 'QCM',    title: 'QCM Top 10',             estimatedMinutes: 7,  customMessage: 'Sois rigoureux, tu auras besoin de ces notions pour la suite.', unlockCriteria: { previousCompleted: true, minScore: 60, minWatchPercent: 70 } },
      { order: 2, type: 'video',  resourceId: videos[1]._id, resourceModel: 'Video',  title: 'XSS, CSRF, défenses',    estimatedMinutes: 22, customMessage: 'Garde un œil sur le passage CSP : c\'est la techno-clé.', unlockCriteria: { previousCompleted: true, minScore: 50, minWatchPercent: 70 } },
      { order: 3, type: 'qcm',    resourceId: qcms[1]._id,   resourceModel: 'QCM',    title: 'QCM XSS / CSRF',          estimatedMinutes: 7,  customMessage: '', unlockCriteria: { previousCompleted: true, minScore: 60, minWatchPercent: 70 } },
      { order: 4, type: 'video',  resourceId: videos[2]._id, resourceModel: 'Video',  title: 'JWT vs sessions',         estimatedMinutes: 18, customMessage: 'Note les compromis de chaque approche, on va en débattre en présentiel.', unlockCriteria: { previousCompleted: true, minScore: 50, minWatchPercent: 70 } },
      { order: 5, type: 'qcm',    resourceId: qcms[2]._id,   resourceModel: 'QCM',    title: 'QCM authentification',    estimatedMinutes: 7,  customMessage: '', unlockCriteria: { previousCompleted: true, minScore: 60, minWatchPercent: 70 } },
      { order: 6, type: 'prosit', resourceId: prosit._id,    resourceModel: 'Prosit', title: 'Prosit RestoNow',         estimatedMinutes: 240, customMessage: 'Travail en groupe sur 7 jours. Application directe de tout ce qu\'on a vu.', unlockCriteria: { previousCompleted: true, minScore: 50, minWatchPercent: 70 } },
    ],
    createdBy: prof._id,
    publishedAt: new Date(),
  });
  console.log(`  + LearningPath publié avec ${path.steps.length} steps`);

  /* ── Récapitulatif ───────────────────────────────────────────────────── */
  console.log('\n[seed-soutenance] ✅ Scène de démo prête.');
  console.log('  Prof  : lebrun@fliplearn.dz / demo1234');
  console.log('  Étudiants : *.demo@fliplearn.dz / demo1234 (sara, yanis, lina, walid, rania, samir, imane, mehdi)');
  console.log('  → Voir backend/scripts/README.md et docs/script-soutenance.md.');

  await mongoose.connection.close();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed-soutenance] Erreur :', err);
    process.exit(1);
  });
