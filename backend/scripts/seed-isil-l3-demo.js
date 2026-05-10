/**
 * seed-isil-l3-demo.js — Seed démo articulation Cas Pratique ↔ Projet.
 *
 * Sub-commands :
 *   --cleanup-only       → supprime tout document marqué [DEMO_SEED]
 *   --seed               → seed sans cleanup préalable (idempotent SI cleanup déjà fait)
 *   --full               → cleanup + seed
 *   --module=cybersec|gl|ia|all   (default: all)
 *
 * Marqueur de démo : `[DEMO_SEED]` en suffixe dans la description des documents
 * (Course, Chapter, Video, Prosit, Project) ou dans le titre des QCM (qui n'ont
 * pas de champ description). Permet un cleanup chirurgical sans toucher au
 * contenu pédagogique réel non tagué.
 *
 * Modules ciblés :
 *   Phase 2 : Cybersécurité & Cloud DevOps (état AVANCÉ ~80%) — DONE
 *   Phase 3 : Génie Logiciel & UML (état MILIEU ~50%)         — DONE
 *   Phase 4 : IA & Data Mining (état DÉBUT ~10%)              — TODO
 *
 * Validation YouTube : oEmbed API (plus fiable que HEAD).
 *
 * Usage :
 *   node scripts/seed-isil-l3-demo.js --full --module=all
 *   node scripts/seed-isil-l3-demo.js --full --module=gl
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import https from 'node:https';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Chapter from '../models/Chapter.js';
import Video from '../models/Video.js';
import QCM from '../models/QCM.js';
import Prosit from '../models/Prosit.js';
import Project from '../models/Project.js';

const DEMO_TAG = '[DEMO_SEED]';

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

function tagDescription(text) {
  const base = text || '';
  return base.includes(DEMO_TAG) ? base : `${base}\n\n${DEMO_TAG}`.trim();
}

const DEMO_REGEX = new RegExp(DEMO_TAG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

/**
 * Vérifie qu'une vidéo YouTube est accessible via oEmbed (404 si supprimée/privée).
 */
function validateYouTubeId(ytId) {
  return new Promise((resolve) => {
    const url = `https://www.youtube.com/oembed?url=https%3A//www.youtube.com/watch%3Fv%3D${ytId}&format=json`;
    const req = https.request(url, { method: 'GET', timeout: 8000 }, (res) => {
      // 200 = OK, 401/404/etc. = invalide
      const ok = res.statusCode === 200;
      // Drain
      res.on('data', () => {});
      res.on('end', () => resolve({ ok, statusCode: res.statusCode }));
    });
    req.on('error', () => resolve({ ok: false, statusCode: 0 }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, statusCode: 0 }); });
    req.end();
  });
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function pad(n) { return String(n).padStart(2, '0'); }

/* ═══════════════════════════════════════════════════════════════════════════
   YOUTUBE LIBRARY — Cybersécurité
   IDs choisis pour leur stabilité (chaînes officielles ou contenu de référence).
   Validation oEmbed appliquée à l'exécution. En cas d'échec : warning + skip.
═══════════════════════════════════════════════════════════════════════════ */

const CYBERSEC_VIDEOS = {
  /* CH1 — Introduction à la cybersécurité (Cocadmin FR) */
  ch1: [
    { ytId: 'zjEIFFi8Izg', titre: 'Cybersécurité — vue d\'ensemble', description: 'Cocadmin : visite guidée d\'un datacenter et notions de sécurité physique/logique. Panorama des enjeux cybersec.', duration: 600 },
    { ytId: 'k1-nGEEEKoo', titre: 'Comment fonctionne une cyber-attaque', description: 'Cocadmin : anatomie d\'une cyber-attaque grand public — webcam piratée, vecteurs d\'intrusion, exfiltration.', duration: 720 },
    { ytId: 'Dk-ZqQ-bfy4', titre: 'Hygiène numérique pour développeurs', description: 'Mots de passe, MFA, gestion des secrets dans les projets, .env et gitignore.', duration: 540 },
  ],
  /* CH2 — Cryptographie appliquée */
  ch2: [
    { ytId: 'GSIDS_lvRv4', titre: 'HTTPS et TLS — sous le capot', description: 'Cryptographie sym/asym appliquée à TLS : handshake, certificats, autorité de certification.', duration: 660 },
    { ytId: 'GSIDS_lvRv4', titre: 'Cryptographie symétrique vs asymétrique', description: 'AES, RSA, signature numérique. Quand utiliser quoi.', duration: 720 },
    { ytId: 'b4b8ktEV4Bg', titre: 'Hash, salt et bcrypt', description: 'Pourquoi ne JAMAIS stocker un mot de passe en clair, attaques par dictionnaire, rainbow tables, salt.', duration: 480 },
  ],
  /* CH3 — OWASP Top 10 */
  ch3: [
    { ytId: 'xe9LN2w7hfE', titre: 'OWASP Top 10 — vue générale', description: 'Kyborde : OWASP Top 10 2021 expliqué en français. Les 10 vulnérabilités web les plus critiques.', duration: 900 },
    { ytId: '_jKylhJtPmI', titre: 'Injection SQL — démo + parade', description: 'Injection SQL en pratique sur app vulnérable, parades : requêtes paramétrées, ORM.', duration: 600 },
    { ytId: 'EoaDgUgS6QA', titre: 'Cross-Site Scripting (XSS)', description: 'XSS reflected vs stored, CSP, sanitization, frameworks safe par défaut.', duration: 540 },
  ],
  /* CH4 — Authentification & sessions (chaînes FR de référence) */
  ch4: [
    { ytId: 'Goh18xP5yvA', titre: 'JWT vs Sessions', description: 'Découverte JWT en 10 minutes : trade-offs sécurité/performance vs cookies de session classiques.', duration: 660 },
    { ytId: 'V27fNfRNHkg', titre: 'Authentification sécurisée — bonnes pratiques', description: 'JWT principe et fonctionnement, MFA, OAuth2, gestion des refresh tokens.', duration: 720 },
    { ytId: 'A2-YImhNVMU', titre: 'Failles d\'authentification courantes', description: 'Hubert Sablonnière — 100% stateless avec JWT : pièges, anti-patterns, credential stuffing, broken auth (OWASP A07).', duration: 480 },
  ],
  /* CH5 — Pen-testing & DevSecOps */
  ch5: [
    { ytId: '3FNYvj2U0HM', titre: 'Introduction au pen-testing', description: 'Méthodologie OSSTMM, phases d\'un pentest, outils Kali Linux.', duration: 720 },
    { ytId: 'RpdDIzkAk_Q', titre: 'DevSecOps — sécurité dans la CI/CD', description: 'Cocadmin : tendances et innovations sysadmin, intégration sécurité (SAST/DAST) dans le pipeline.', duration: 660 },
    { ytId: '5FeygmD1fx0', titre: 'Burp Suite — démo intercepting proxy', description: 'Cocadmin : sysadmin extrême, outils d\'analyse réseau et HTTP. Pédagogie pentest.', duration: 540 },
  ],
};

// Fallback : on utilise la 1ère vidéo Cocadmin Datacenter (validée 200) comme secours
// si jamais une URL devient inaccessible plus tard. Stable car chaîne FR très active.
const VIDEO_FALLBACK_ID = 'zjEIFFi8Izg';
const VIDEO_FALLBACK_NOTE = ' [DEMO_SEED — vidéo de remplacement (URL originale invalide)]';

/* ═══════════════════════════════════════════════════════════════════════════
   YOUTUBE LIBRARY — Génie Logiciel & UML
   Réutilisation des IDs Phase 2 validés (autorisé par le brief Phase 3) avec
   titres adaptés. Les IDs sont garantis 200 OK via oEmbed (validés en Phase 2).
   Note dans la description : [DEMO_SEED — placeholder vidéo réutilisée].
═══════════════════════════════════════════════════════════════════════════ */

const GL_VIDEO_NOTE_REUSED = ' [DEMO_SEED — vidéo placeholder réutilisée de Phase 2 cybersec, à remplacer par contenu GL réel en démo]';

const GL_VIDEOS = {
  /* CH1 — Introduction au génie logiciel (cycles V, agile, SCRUM) */
  ch1: [
    { ytId: 'zjEIFFi8Izg', titre: 'Cycles de vie & culture sysadmin', description: 'Panorama des cycles de vie logiciel (cascade, V, agile) et culture professionnelle.', duration: 600 },
    { ytId: 'RpdDIzkAk_Q', titre: 'Méthodes agiles & SCRUM — tendances', description: 'Tendances actuelles, agile vs cycle V, présentation SCRUM (sprints, backlog, rétrospective).', duration: 720 },
    { ytId: '5FeygmD1fx0', titre: 'Pratiques pro & DevOps', description: 'Du dev au déploiement, intégration continue, qualité de code, hygiène projet.', duration: 540 },
  ],
  /* CH2 — Modélisation UML — Cas d'utilisation */
  ch2: [
    { ytId: 'A2-YImhNVMU', titre: 'Modélisation des besoins & spec', description: 'Comment formaliser les besoins en cas d\'utilisation : acteurs, scénarios, exigences fonctionnelles.', duration: 660 },
    { ytId: 'V27fNfRNHkg', titre: 'Cas d\'utilisation — principes', description: 'Diagramme de cas d\'utilisation UML, relations include/extend, niveaux de détail.', duration: 720 },
    { ytId: 'Goh18xP5yvA', titre: 'Cahier des charges — bonnes pratiques', description: 'Rédaction d\'un cahier des charges en 10 minutes, structure, critères d\'acceptation.', duration: 480 },
  ],
  /* CH3 — Diagrammes de classes & d'objets */
  ch3: [
    { ytId: 'GSIDS_lvRv4', titre: 'Modélisation orientée objet', description: 'Classes, attributs, méthodes, héritage, encapsulation. Bases du diagramme de classes UML.', duration: 660 },
    { ytId: 'b4b8ktEV4Bg', titre: 'Relations & associations', description: 'Aggrégation, composition, dépendance, multiplicité, navigabilité.', duration: 600 },
    { ytId: 'Dk-ZqQ-bfy4', titre: 'Clean code & cohésion', description: 'Diagramme de classes propre : cohésion forte, couplage faible, principes SOLID.', duration: 540 },
  ],
  /* CH4 — Diagrammes de séquence & d'activité */
  ch4: [
    { ytId: '_jKylhJtPmI', titre: 'Diagramme de séquence', description: 'Flux d\'interaction entre objets, lignes de vie, messages synchrones/asynchrones.', duration: 600 },
    { ytId: 'EoaDgUgS6QA', titre: 'Diagramme d\'activité', description: 'Workflow métier, branchements, parallélisme, swimlanes.', duration: 540 },
    { ytId: '3FNYvj2U0HM', titre: 'Scénarios d\'usage & tests', description: 'Du diagramme dynamique aux scénarios de test, traçabilité besoin → test.', duration: 660 },
  ],
  /* CH5 — Patterns de conception (GoF) */
  ch5: [
    { ytId: 'k1-nGEEEKoo', titre: 'Anti-patterns à éviter', description: 'God object, spaghetti code, copy-paste, comment les détecter et les refactoriser.', duration: 720 },
    { ytId: 'xe9LN2w7hfE', titre: 'Patterns créationnels (Singleton, Factory)', description: 'Les patterns Gang of Four — création d\'objets : Singleton, Factory Method, Builder.', duration: 900 },
    { ytId: 'zjEIFFi8Izg', titre: 'Patterns structurels & comportementaux', description: 'Adapter, Decorator, Observer, Strategy. Quand et pourquoi les appliquer.', duration: 600 },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
   QCM LIBRARY — Génie Logiciel
═══════════════════════════════════════════════════════════════════════════ */

const GL_VIDEO_QCM = {
  'ch1:0': { titre: 'Cycles de vie logiciel', questions: [
    { texte: 'Le cycle en V se distingue de la cascade par…', options: { A: 'rien', B: 'des phases de validation/vérification miroir des phases de spécification', C: 'l\'absence de tests', D: 'sa rapidité' }, correctAnswer: 'B', explanation: 'Chaque phase descendante a sa contrepartie de tests/validation.' },
    { texte: 'L\'avantage principal d\'agile sur le cycle V est…', options: { A: 'plus de docs', B: 'adaptation aux changements de besoins', C: 'pas de tests', D: 'pas de spec' }, correctAnswer: 'B', explanation: 'Itérations courtes + feedback continu = adaptation.' },
    { texte: 'Un sprint SCRUM dure typiquement…', options: { A: '1 jour', B: '2-4 semaines', C: '6 mois', D: '1 an' }, correctAnswer: 'B', explanation: 'Sprints courts pour boucle feedback rapide.' },
  ]},
  'ch1:1': { titre: 'SCRUM — bases', questions: [
    { texte: 'Qui est responsable du backlog produit ?', options: { A: 'le développeur', B: 'le Product Owner', C: 'le Scrum Master', D: 'le client' }, correctAnswer: 'B', explanation: 'Le PO priorise et maintient le backlog.' },
    { texte: 'La rétrospective sert à…', options: { A: 'planifier le sprint suivant', B: 'améliorer le processus de l\'équipe', C: 'présenter le produit', D: 'recruter' }, correctAnswer: 'B', explanation: 'Inspect & adapt sur la façon de travailler.' },
    { texte: 'Le daily stand-up dure…', options: { A: '5 min', B: '15 min max', C: '1h', D: 'la journée' }, correctAnswer: 'B', explanation: 'Rapide, focus, debout pour rester court.' },
  ]},
  'ch1:2': { titre: 'CI/CD & qualité', questions: [
    { texte: 'CI signifie…', options: { A: 'Continuous Improvement', B: 'Continuous Integration — merge fréquent + build/test auto', C: 'Code Inspection', D: 'rien' }, correctAnswer: 'B', explanation: 'Intégration fréquente sur main, validée par CI.' },
    { texte: 'Le linting sert à…', options: { A: 'compiler', B: 'détecter automatiquement style + erreurs courantes', C: 'tester unitairement', D: 'déployer' }, correctAnswer: 'B', explanation: 'ESLint, Prettier, etc. — qualité statique.' },
    { texte: 'TDD = ?', options: { A: 'Test Driven Design', B: 'Test Driven Development — tests écrits avant le code', C: 'Tests Done Daily', D: 'aucun' }, correctAnswer: 'B', explanation: 'Red-Green-Refactor.' },
  ]},
  'ch2:0': { titre: 'Cas d\'utilisation', questions: [
    { texte: 'Un acteur dans un cas d\'utilisation est…', options: { A: 'toujours un humain', B: 'humain OU système externe interagissant avec le système modélisé', C: 'jamais externe', D: 'aucun' }, correctAnswer: 'B', explanation: 'Acteur = entité externe, humaine ou système.' },
    { texte: 'Une exigence "non fonctionnelle" est par exemple…', options: { A: 'authentifier l\'utilisateur', B: 'temps de réponse < 200ms', C: 'créer un compte', D: 'supprimer un produit' }, correctAnswer: 'B', explanation: 'Non fonctionnel = qualité (perf, sécurité, dispo).' },
    { texte: 'Un cas d\'utilisation décrit…', options: { A: 'la structure du code', B: 'une interaction acteur-système avec un objectif', C: 'le déploiement', D: 'aucun' }, correctAnswer: 'B', explanation: 'Use case = scénario fonctionnel.' },
  ]},
  'ch2:1': { titre: 'Diagramme cas d\'utilisation UML', questions: [
    { texte: 'La relation <<include>> indique…', options: { A: 'une dépendance optionnelle', B: 'une inclusion obligatoire d\'un sous-cas', C: 'un héritage', D: 'rien' }, correctAnswer: 'B', explanation: 'Sous-cas réutilisable, toujours appelé.' },
    { texte: 'La relation <<extend>> indique…', options: { A: 'identique à include', B: 'une extension optionnelle conditionnelle', C: 'composition', D: 'rien' }, correctAnswer: 'B', explanation: 'Cas étendu : optionnel, sous condition.' },
    { texte: 'Le système est représenté par…', options: { A: 'un cercle', B: 'un rectangle/cadre englobant', C: 'une flèche', D: 'rien' }, correctAnswer: 'B', explanation: 'Cadre système qui contient les cas d\'utilisation.' },
  ]},
  'ch2:2': { titre: 'Cahier des charges', questions: [
    { texte: 'Un critère d\'acceptation doit être…', options: { A: 'flou', B: 'mesurable et testable', C: 'optionnel', D: 'aucun' }, correctAnswer: 'B', explanation: 'Sinon impossible de valider la livraison.' },
    { texte: 'Une user story s\'écrit typiquement…', options: { A: '"comme [acteur], je veux [action] afin de [bénéfice]"', B: 'en code', C: 'en pseudo-code', D: 'aucun' }, correctAnswer: 'A', explanation: 'Format INVEST de la user story.' },
    { texte: 'MoSCoW classe les besoins en…', options: { A: 'Must / Should / Could / Won\'t', B: 'Mort / Sec', C: 'aucun', D: 'autre' }, correctAnswer: 'A', explanation: 'Priorisation MoSCoW.' },
  ]},
  'ch3:0': { titre: 'Diagramme de classes — bases', questions: [
    { texte: 'Une classe abstraite…', options: { A: 'peut être instanciée', B: 'ne peut PAS être instanciée directement', C: 'n\'a pas de méthodes', D: 'aucun' }, correctAnswer: 'B', explanation: 'Sert de base à des sous-classes concrètes.' },
    { texte: 'L\'encapsulation signifie…', options: { A: 'tout en public', B: 'cacher l\'état interne, exposer une API', C: 'pas de méthodes', D: 'aucun' }, correctAnswer: 'B', explanation: 'Pilier OO. Private/protected pour l\'état.' },
    { texte: 'Une interface UML…', options: { A: 'a une implémentation', B: 'définit un contrat sans implémentation', C: 'identique à classe', D: 'aucun' }, correctAnswer: 'B', explanation: 'Réalisation par les classes implémentantes.' },
  ]},
  'ch3:1': { titre: 'Relations entre classes', questions: [
    { texte: 'L\'aggrégation diffère de la composition par…', options: { A: 'rien', B: 'la composition implique une dépendance forte de cycle de vie', C: 'l\'inverse', D: 'aucun' }, correctAnswer: 'B', explanation: 'Composition = "contient" exclusif (losange noir).' },
    { texte: 'Une multiplicité "1..*" signifie…', options: { A: 'aucun', B: 'au moins un, plusieurs possibles', C: 'exactement un', D: '0 ou 1' }, correctAnswer: 'B', explanation: 'Min 1, max illimité.' },
    { texte: 'L\'héritage UML est noté avec…', options: { A: 'une flèche pleine', B: 'une flèche triangulaire creuse vers la classe mère', C: 'un cercle', D: 'rien' }, correctAnswer: 'B', explanation: 'Triangle creux = généralisation.' },
  ]},
  'ch3:2': { titre: 'Principes SOLID', questions: [
    { texte: 'Le S de SOLID = ?', options: { A: 'Speed', B: 'Single Responsibility — une classe = une raison de changer', C: 'Strict', D: 'aucun' }, correctAnswer: 'B', explanation: 'Cohésion forte au niveau classe.' },
    { texte: 'Le O de SOLID = ?', options: { A: 'Outsourcing', B: 'Open/Closed — ouvert à l\'extension, fermé à la modification', C: 'Object', D: 'aucun' }, correctAnswer: 'B', explanation: 'Étendre par sous-classes/interfaces, pas par modification.' },
    { texte: 'Couplage faible = ?', options: { A: 'beaucoup de dépendances', B: 'peu de dépendances entre modules', C: 'aucun code', D: 'aucun' }, correctAnswer: 'B', explanation: 'Plus modulaire, plus testable.' },
  ]},
  'ch4:0': { titre: 'Diagramme de séquence', questions: [
    { texte: 'Une ligne de vie représente…', options: { A: 'un acteur exclusivement', B: 'une instance d\'objet ou un acteur sur l\'axe temporel', C: 'un message', D: 'aucun' }, correctAnswer: 'B', explanation: 'Verticale, temps va vers le bas.' },
    { texte: 'Un message synchrone est…', options: { A: 'identique à asynchrone', B: 'l\'appelant attend la réponse avant de continuer', C: 'sans réponse', D: 'aucun' }, correctAnswer: 'B', explanation: 'Flèche pleine, attente bloquante.' },
    { texte: 'Un fragment combiné "alt" représente…', options: { A: 'une boucle', B: 'des branches conditionnelles (if/else)', C: 'une exception', D: 'aucun' }, correctAnswer: 'B', explanation: 'Alternative / branchement.' },
  ]},
  'ch4:1': { titre: 'Diagramme d\'activité', questions: [
    { texte: 'Une swimlane sert à…', options: { A: 'une seule activité', B: 'regrouper les activités par responsable/acteur', C: 'séparer le code', D: 'aucun' }, correctAnswer: 'B', explanation: 'Couloir vertical par acteur.' },
    { texte: 'Un nœud de décision est représenté par…', options: { A: 'un cercle', B: 'un losange', C: 'un rectangle', D: 'aucun' }, correctAnswer: 'B', explanation: 'Losange = choix.' },
    { texte: 'La barre de fork/join sert à…', options: { A: 'décrire le code', B: 'séparer/synchroniser des flux parallèles', C: 'finir le diagramme', D: 'aucun' }, correctAnswer: 'B', explanation: 'Fork = parallélisme, Join = sync.' },
  ]},
  'ch4:2': { titre: 'Traçabilité spec → test', questions: [
    { texte: 'Un test d\'acceptation valide…', options: { A: 'la performance', B: 'qu\'un cas d\'utilisation est correctement implémenté', C: 'le style de code', D: 'aucun' }, correctAnswer: 'B', explanation: 'BDD/Cucumber : Given-When-Then.' },
    { texte: 'La traçabilité besoin → test signifie…', options: { A: 'rien', B: 'chaque exigence a au moins un test associé', C: 'pas de test', D: 'aucun' }, correctAnswer: 'B', explanation: 'Matrice de traçabilité.' },
    { texte: 'Un test fonctionnel teste…', options: { A: 'la perf', B: 'le COMPORTEMENT externe (vs unit test = brique interne)', C: 'le code', D: 'aucun' }, correctAnswer: 'B', explanation: 'Boîte noire vs boîte blanche.' },
  ]},
  'ch5:0': { titre: 'Anti-patterns', questions: [
    { texte: 'Un "God object" est une classe qui…', options: { A: 'fait trop de choses', B: 'a une seule responsabilité', C: 'est utile', D: 'aucun' }, correctAnswer: 'A', explanation: 'Viole SRP, à découper.' },
    { texte: 'Le "spaghetti code" se caractérise par…', options: { A: 'lisibilité parfaite', B: 'flots de contrôle entremêlés, sans structure', C: 'tests complets', D: 'aucun' }, correctAnswer: 'B', explanation: 'Difficile à comprendre/maintenir.' },
    { texte: 'Le copy-paste de code conduit à…', options: { A: 'meilleure qualité', B: 'duplication = bug fixé à un endroit, pas à l\'autre', C: 'rien', D: 'aucun' }, correctAnswer: 'B', explanation: 'DRY : Don\'t Repeat Yourself.' },
  ]},
  'ch5:1': { titre: 'Patterns créationnels GoF', questions: [
    { texte: 'Le Singleton garantit…', options: { A: 'plusieurs instances', B: 'une seule instance globale', C: 'aucun objet', D: 'aucun' }, correctAnswer: 'B', explanation: 'Constructeur privé + getInstance().' },
    { texte: 'Le Factory Method sert à…', options: { A: 'rien', B: 'déléguer la création d\'objets aux sous-classes', C: 'détruire', D: 'aucun' }, correctAnswer: 'B', explanation: 'Pattern de création polymorphe.' },
    { texte: 'Le Builder est utile quand…', options: { A: 'l\'objet est simple', B: 'l\'objet a beaucoup de paramètres optionnels', C: 'aucun cas', D: 'aucun' }, correctAnswer: 'B', explanation: 'Évite les constructeurs téléscopiques.' },
  ]},
  'ch5:2': { titre: 'Patterns structurels & comportementaux', questions: [
    { texte: 'L\'Adapter sert à…', options: { A: 'créer', B: 'rendre compatible deux interfaces incompatibles', C: 'détruire', D: 'aucun' }, correctAnswer: 'B', explanation: 'Pattern structurel — wrapping.' },
    { texte: 'L\'Observer notifie…', options: { A: 'rien', B: 'plusieurs observateurs des changements d\'un sujet', C: 'lui-même', D: 'aucun' }, correctAnswer: 'B', explanation: 'Pub/sub local.' },
    { texte: 'Le Strategy permet de…', options: { A: 'figer un algo', B: 'changer dynamiquement l\'algorithme utilisé', C: 'rien', D: 'aucun' }, correctAnswer: 'B', explanation: 'Encapsule une famille d\'algos interchangeables.' },
  ]},
};

const GL_CHAPTER_QCM = {
  ch1: { titre: 'QCM Chapitre 1 — Génie logiciel & cycles', questions: [
    { texte: 'Le cycle en V est…', options: { A: 'agile', B: 'séquentiel avec phases de validation symétriques', C: 'incrémental court', D: 'aucun' }, correctAnswer: 'B', explanation: 'V = chaque spec a sa validation associée.' },
    { texte: 'Quel rôle SCRUM facilite l\'équipe sans la diriger ?', options: { A: 'PO', B: 'Scrum Master', C: 'Architecte', D: 'aucun' }, correctAnswer: 'B', explanation: 'SM = facilitateur, retire les blocages.' },
    { texte: 'TDD signifie…', options: { A: 'Test Driven Development', B: 'Tests Documentés Daily', C: 'aucun', D: 'autre' }, correctAnswer: 'A', explanation: 'Tests écrits avant le code (red-green-refactor).' },
    { texte: 'CI/CD vise…', options: { A: 'ralentir le dev', B: 'merge fréquent + déploiement auto/fréquent', C: 'aucun', D: 'plus de bugs' }, correctAnswer: 'B', explanation: 'Boucle de feedback courte = qualité.' },
    { texte: 'Une "definition of done" sert à…', options: { A: 'rien', B: 'aligner l\'équipe sur ce qui constitue un travail terminé', C: 'figer le scope', D: 'aucun' }, correctAnswer: 'B', explanation: 'Critère partagé pour éviter les ambiguïtés.' },
  ]},
  ch2: { titre: 'QCM Chapitre 2 — UML & cas d\'utilisation', questions: [
    { texte: 'Un acteur principal dans UML est…', options: { A: 'le système', B: 'l\'entité externe qui initie un cas d\'utilisation', C: 'un sous-cas', D: 'aucun' }, correctAnswer: 'B', explanation: 'Acteur primaire / déclencheur.' },
    { texte: 'Le scénario nominal d\'un cas d\'utilisation décrit…', options: { A: 'les erreurs', B: 'le déroulement standard, sans incident', C: 'une exception', D: 'aucun' }, correctAnswer: 'B', explanation: 'Happy path.' },
    { texte: 'Une exigence non fonctionnelle = ?', options: { A: 'fonctionnalité', B: 'qualité (performance, sécurité, dispo)', C: 'rien', D: 'aucun' }, correctAnswer: 'B', explanation: 'NFR = qualité, pas comportement métier.' },
    { texte: 'Le format "user story" est…', options: { A: 'En tant que [acteur], je veux [action] pour [bénéfice]', B: 'Faire [tâche]', C: 'aucun', D: 'autre' }, correctAnswer: 'A', explanation: 'Format INVEST.' },
    { texte: 'L\'extend UML ajoute…', options: { A: 'rien', B: 'un comportement optionnel et conditionnel', C: 'obligatoire', D: 'aucun' }, correctAnswer: 'B', explanation: 'Cas étendu = optionnel.' },
  ]},
  ch3: { titre: 'QCM Chapitre 3 — Diagrammes de classes', questions: [
    { texte: 'Une composition (losange noir) implique…', options: { A: 'rien', B: 'que la partie est détruite avec le tout', C: 'l\'inverse', D: 'aucun' }, correctAnswer: 'B', explanation: 'Cycle de vie lié.' },
    { texte: 'L\'encapsulation = ?', options: { A: 'tout public', B: 'cacher l\'état interne, exposer une interface contrôlée', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Pilier OO.' },
    { texte: 'Une interface en UML est notée…', options: { A: 'avec <<interface>> ou cercle', B: 'sans symbole', C: 'comme une classe normale', D: 'aucun' }, correctAnswer: 'A', explanation: 'Stéréotype <<interface>> ou notation lollipop.' },
    { texte: 'Le L de SOLID = ?', options: { A: 'Liskov Substitution', B: 'Lisp', C: 'aucun', D: 'autre' }, correctAnswer: 'A', explanation: 'Sous-classes substituables à leur classe parente.' },
    { texte: 'Couplage fort + cohésion faible = ?', options: { A: 'idéal', B: 'mauvaise conception (à éviter)', C: 'standard', D: 'aucun' }, correctAnswer: 'B', explanation: 'Inverse de l\'objectif.' },
  ]},
  ch4: { titre: 'QCM Chapitre 4 — Diagrammes dynamiques', questions: [
    { texte: 'Un message synchrone bloque l\'appelant ?', options: { A: 'non, jamais', B: 'oui, attend la réponse', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Sync = bloquant.' },
    { texte: 'Le fragment "loop" représente…', options: { A: 'une condition', B: 'une boucle/itération', C: 'rien', D: 'aucun' }, correctAnswer: 'B', explanation: 'Boucle UML.' },
    { texte: 'Une swimlane regroupe…', options: { A: 'les méthodes', B: 'les activités d\'un acteur/responsable', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Couloir par acteur.' },
    { texte: 'Le diagramme d\'activité s\'utilise pour…', options: { A: 'le code source', B: 'modéliser un workflow métier', C: 'rien', D: 'aucun' }, correctAnswer: 'B', explanation: 'Process flow.' },
    { texte: 'Un nœud "fork" sert à…', options: { A: 'fusionner', B: 'paralléliser plusieurs flux', C: 'arrêter', D: 'aucun' }, correctAnswer: 'B', explanation: 'Fork = split parallèle.' },
  ]},
  ch5: { titre: 'QCM Chapitre 5 — Patterns GoF', questions: [
    { texte: 'Le Singleton garantit…', options: { A: 'N instances', B: 'une seule instance globale', C: 'aucun objet', D: 'aucun' }, correctAnswer: 'B', explanation: 'Une seule instance accessible globalement.' },
    { texte: 'Le pattern Observer = ?', options: { A: 'aucun', B: 'pub/sub local — N observateurs notifiés par 1 sujet', C: 'inverse', D: 'autre' }, correctAnswer: 'B', explanation: 'Découplage producteur/consommateurs.' },
    { texte: 'L\'Adapter sert à…', options: { A: 'rien', B: 'rendre compatibles 2 interfaces incompatibles', C: 'créer', D: 'aucun' }, correctAnswer: 'B', explanation: 'Pattern structurel de wrapping.' },
    { texte: 'Le Strategy permet de…', options: { A: 'figer un algo', B: 'changer d\'algorithme dynamiquement', C: 'rien', D: 'aucun' }, correctAnswer: 'B', explanation: 'Famille d\'algos interchangeables.' },
    { texte: 'Le Decorator…', options: { A: 'simplifie', B: 'ajoute du comportement à un objet sans modifier sa classe', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Composition vs héritage.' },
  ]},
};

const GL_MODULE_QCM = {
  titre: 'QCM final — Génie Logiciel & UML',
  questions: [
    { texte: 'Cycle en V vs cascade ?', options: { A: 'identique', B: 'V ajoute des phases de validation symétriques', C: 'inverse', D: 'aucun' }, correctAnswer: 'B', explanation: 'V = phase de test associée à chaque phase de spec.' },
    { texte: 'Avantage d\'agile ?', options: { A: 'moins de tests', B: 'adaptation aux changements', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Itérations courtes + feedback.' },
    { texte: 'Un acteur UML peut-il être un système externe ?', options: { A: 'non', B: 'oui', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Acteur = entité externe humaine OU système.' },
    { texte: 'Use case <<include>> = ?', options: { A: 'optionnel', B: 'obligatoirement appelé', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Sous-cas inclus dans tous les scénarios.' },
    { texte: 'Aggrégation vs composition ?', options: { A: 'identique', B: 'composition = cycle de vie lié', C: 'inverse', D: 'aucun' }, correctAnswer: 'B', explanation: 'Losange noir = composition.' },
    { texte: 'Encapsulation = ?', options: { A: 'tout public', B: 'cacher l\'état interne', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Pilier OO.' },
    { texte: 'Le S de SOLID = ?', options: { A: 'Speed', B: 'Single Responsibility', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Une classe = une raison de changer.' },
    { texte: 'Couplage faible + cohésion forte = ?', options: { A: 'mauvais', B: 'idéal', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Objectif de la conception OO.' },
    { texte: 'Diagramme de séquence représente…', options: { A: 'la structure', B: 'les interactions temporelles entre objets', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Dynamique : qui parle à qui et quand.' },
    { texte: 'Diagramme d\'activité représente…', options: { A: 'la structure', B: 'un workflow métier', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Process / flowchart.' },
    { texte: 'Singleton garantit…', options: { A: 'plusieurs instances', B: 'une seule instance', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Constructeur privé + accesseur unique.' },
    { texte: 'Factory Method = ?', options: { A: 'casser', B: 'déléguer la création aux sous-classes', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Pattern créationnel.' },
    { texte: 'Observer = ?', options: { A: 'aucun', B: 'pub/sub local', C: 'inverse', D: 'autre' }, correctAnswer: 'B', explanation: 'Notification 1→N.' },
    { texte: 'Anti-pattern God Object = ?', options: { A: 'classe parfaite', B: 'classe qui fait trop de choses (viole SRP)', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'À refactoriser en plusieurs classes.' },
    { texte: 'Une definition of done sert à…', options: { A: 'rien', B: 'aligner l\'équipe sur le critère de "terminé"', C: 'figer le scope', D: 'aucun' }, correctAnswer: 'B', explanation: 'Évite les ambiguïtés en livraison.' },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
   YOUTUBE LIBRARY — IA & Data Mining
   Réutilisation IDs Phase 2 validés, titres adaptés au sujet IA/ML.
═══════════════════════════════════════════════════════════════════════════ */

const IA_VIDEO_NOTE_REUSED = ' [DEMO_SEED — vidéo placeholder réutilisée Phase 2, à remplacer par contenu IA réel en démo]';

const IA_VIDEOS = {
  /* CH1 — Introduction IA & ML */
  ch1: [
    { ytId: 'zjEIFFi8Izg', titre: 'Qu\'est-ce que l\'intelligence artificielle ?', description: 'Panorama de l\'IA : définitions, histoire, IA faible vs forte, applications concrètes.', duration: 600 },
    { ytId: 'RpdDIzkAk_Q', titre: 'Machine learning expliqué simplement', description: 'Différence entre programmation classique et ML, données vs règles, étapes d\'un projet ML.', duration: 720 },
    { ytId: 'k1-nGEEEKoo', titre: 'ChatGPT — comment ça marche', description: 'Vulgarisation des LLM (Large Language Models), tokens, transformers, fine-tuning.', duration: 540 },
  ],
  /* CH2 — Apprentissage supervisé */
  ch2: [
    { ytId: 'GSIDS_lvRv4', titre: 'Régression linéaire expliquée', description: 'Modèle le plus simple : prédire une valeur continue à partir de features, droite des moindres carrés.', duration: 660 },
    { ytId: 'b4b8ktEV4Bg', titre: 'Classification : régression logistique', description: 'Adapter la régression à la classification binaire (0/1), fonction sigmoïde, frontières de décision.', duration: 720 },
    { ytId: 'Dk-ZqQ-bfy4', titre: 'Random forest & arbres de décision', description: 'Arbres simples → forêts aléatoires, ensemble learning, feature importance.', duration: 480 },
  ],
  /* CH3 — Apprentissage non supervisé */
  ch3: [
    { ytId: '_jKylhJtPmI', titre: 'K-means clustering', description: 'Algorithme de clustering le plus utilisé : initialisation, mise à jour des centroïdes, choix de k.', duration: 600 },
    { ytId: 'EoaDgUgS6QA', titre: 'Réduction de dimension : PCA', description: 'Principal Component Analysis : projeter des données haute dimension dans un espace réduit.', duration: 540 },
    { ytId: '3FNYvj2U0HM', titre: 'Détection d\'anomalies', description: 'Identifier les outliers : isolation forest, autoencoders, applications fraude/cybersec.', duration: 660 },
  ],
  /* CH4 — Deep learning */
  ch4: [
    { ytId: 'A2-YImhNVMU', titre: 'Réseaux de neurones — bases', description: 'Neurones, couches, fonction d\'activation, propagation avant, backpropagation.', duration: 720 },
    { ytId: 'V27fNfRNHkg', titre: 'CNN — réseaux convolutionnels', description: 'Architecture pour la vision : convolutions, pooling, applications classification d\'images.', duration: 660 },
    { ytId: 'Goh18xP5yvA', titre: 'Transformers & attention', description: 'L\'architecture qui a révolutionné le NLP (BERT, GPT) : mécanisme d\'attention, encoder/decoder.', duration: 540 },
  ],
  /* CH5 — Éthique & biais en IA */
  ch5: [
    { ytId: 'xe9LN2w7hfE', titre: 'Biais algorithmiques en IA', description: 'D\'où viennent les biais (données, conception, déploiement), exemples concrets et impacts sociaux.', duration: 720 },
    { ytId: '5FeygmD1fx0', titre: 'Éthique de l\'IA', description: 'Cadre réglementaire (RGPD, AI Act EU), enjeux éthiques, IA responsable.', duration: 660 },
    { ytId: 'k1-nGEEEKoo', titre: 'ChatGPT — dangers et limites', description: 'Hallucinations, désinformation, deepfakes, dépendance, dégradation des compétences.', duration: 540 },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
   QCM LIBRARY — IA & Data Mining
═══════════════════════════════════════════════════════════════════════════ */

const IA_VIDEO_QCM = {
  'ch1:0': { titre: 'IA — bases', questions: [
    { texte: 'L\'IA "faible" vise…', options: { A: 'à dépasser l\'humain', B: 'à résoudre des tâches précises (classification, traduction…)', C: 'rien', D: 'à remplacer le cerveau' }, correctAnswer: 'B', explanation: 'Narrow AI = tâche spécifique. Forte = AGI hypothétique.' },
    { texte: 'Le test de Turing évalue…', options: { A: 'la vitesse', B: 'la capacité à imiter une conversation humaine', C: 'la mémoire', D: 'aucun' }, correctAnswer: 'B', explanation: 'Critère historique de Turing (1950).' },
    { texte: 'Quel domaine de l\'IA traite des images ?', options: { A: 'NLP', B: 'Computer Vision', C: 'RL', D: 'aucun' }, correctAnswer: 'B', explanation: 'CV pour les images, NLP pour le texte.' },
  ]},
  'ch1:1': { titre: 'Machine learning — vue d\'ensemble', questions: [
    { texte: 'En ML supervisé, on apprend à partir de…', options: { A: 'rien', B: 'données labellisées (input + output attendu)', C: 'données aléatoires', D: 'aucun' }, correctAnswer: 'B', explanation: 'Supervisé = labels fournis.' },
    { texte: 'Une époque (epoch) en ML correspond à…', options: { A: 'une heure', B: 'un passage complet sur le dataset', C: 'rien', D: 'aucun' }, correctAnswer: 'B', explanation: 'On répète sur N epochs jusqu\'à convergence.' },
    { texte: 'L\'overfitting signifie…', options: { A: 'modèle parfait', B: 'modèle apprend par cœur le train, échoue sur test', C: 'aucun', D: 'sous-apprentissage' }, correctAnswer: 'B', explanation: 'Trop bien sur train, mauvais en généralisation.' },
  ]},
  'ch1:2': { titre: 'LLM & ChatGPT', questions: [
    { texte: 'GPT signifie…', options: { A: 'General Purpose Transformer', B: 'Generative Pre-trained Transformer', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Transformer pré-entraîné, génératif.' },
    { texte: 'Un "token" en NLP est typiquement…', options: { A: 'un mot complet', B: 'un fragment de mot ou caractère', C: 'une phrase', D: 'aucun' }, correctAnswer: 'B', explanation: 'BPE / sentencepiece — fragments sub-word.' },
    { texte: 'Les LLM peuvent halluciner = ?', options: { A: 'rien', B: 'générer des faits faux avec confiance', C: 'voir des images', D: 'aucun' }, correctAnswer: 'B', explanation: 'Limite majeure des LLM actuels.' },
  ]},
  'ch2:0': { titre: 'Régression linéaire', questions: [
    { texte: 'L\'objectif de la régression linéaire est…', options: { A: 'classer', B: 'prédire une valeur continue', C: 'rien', D: 'aucun' }, correctAnswer: 'B', explanation: 'Output ∈ ℝ, pas une classe.' },
    { texte: 'La fonction de coût classique est…', options: { A: 'cross-entropy', B: 'MSE (mean squared error)', C: 'aucun', D: 'log loss' }, correctAnswer: 'B', explanation: 'Moindre carrés ordinaires.' },
    { texte: 'La descente de gradient sert à…', options: { A: 'régulariser', B: 'minimiser la fonction de coût itérativement', C: 'rien', D: 'augmenter le coût' }, correctAnswer: 'B', explanation: 'Optimisation par déplacement opposé au gradient.' },
  ]},
  'ch2:1': { titre: 'Régression logistique', questions: [
    { texte: 'La fonction sigmoïde renvoie…', options: { A: 'tout réel', B: 'une valeur entre 0 et 1 (probabilité)', C: 'rien', D: 'aucun' }, correctAnswer: 'B', explanation: 'σ(x) = 1/(1+e^-x), borné [0,1].' },
    { texte: 'La régression logistique est…', options: { A: 'une régression', B: 'un classifieur binaire malgré son nom', C: 'aucun', D: 'régression non-linéaire' }, correctAnswer: 'B', explanation: 'Output = proba de classe 1.' },
    { texte: 'Pour évaluer un classifieur, on utilise…', options: { A: 'MSE', B: 'accuracy, precision, recall, F1', C: 'rien', D: 'temps' }, correctAnswer: 'B', explanation: 'Métriques de classification.' },
  ]},
  'ch2:2': { titre: 'Random Forest', questions: [
    { texte: 'Une forêt aléatoire est…', options: { A: 'un arbre seul', B: 'un ensemble d\'arbres de décision votant', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Bagging d\'arbres → réduit variance.' },
    { texte: 'Avantage principal vs un arbre seul ?', options: { A: 'plus rapide', B: 'moins d\'overfitting + meilleure généralisation', C: 'aucun', D: 'plus simple' }, correctAnswer: 'B', explanation: 'Diversification des arbres.' },
    { texte: 'Feature importance dans RF = ?', options: { A: 'aléatoire', B: 'mesure de contribution de chaque variable aux décisions', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Aide à l\'interprétation.' },
  ]},
  'ch3:0': { titre: 'K-means', questions: [
    { texte: 'K-means demande…', options: { A: 'des données labellisées', B: 'le nombre de clusters k à trouver', C: 'rien', D: 'autre' }, correctAnswer: 'B', explanation: 'Hyperparamètre principal.' },
    { texte: 'Méthode du coude (elbow method) sert à…', options: { A: 'mesurer la perf', B: 'choisir k optimal', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Tracer inertie vs k, prendre le coude.' },
    { texte: 'K-means converge-t-il toujours au minimum global ?', options: { A: 'oui', B: 'non, optimum local possible (relancer plusieurs fois)', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Sensibilité à l\'initialisation. K-means++ améliore.' },
  ]},
  'ch3:1': { titre: 'PCA', questions: [
    { texte: 'PCA réduit la dimension en…', options: { A: 'supprimant des features au hasard', B: 'projetant sur les directions de variance maximale', C: 'rien', D: 'autre' }, correctAnswer: 'B', explanation: 'Composantes principales = vecteurs propres.' },
    { texte: 'PCA est…', options: { A: 'supervisé', B: 'non supervisé (pas de labels)', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Pure analyse de structure.' },
    { texte: 'Avantage principal de PCA ?', options: { A: 'classification', B: 'visualiser des données haute dimension + accélérer modèles', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Visualisation 2D/3D + features réduites.' },
  ]},
  'ch3:2': { titre: 'Détection d\'anomalies', questions: [
    { texte: 'Une anomalie en data mining = ?', options: { A: 'donnée standard', B: 'point très différent du reste (outlier)', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Détection : fraude, intrusion, défaut produit.' },
    { texte: 'Isolation Forest fonctionne en…', options: { A: 'forêt classique', B: 'isolant des points par splits aléatoires (anomalies isolées vite)', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Anomalies = profondeur d\'isolation faible.' },
    { texte: 'Application typique en cybersec ?', options: { A: 'rien', B: 'détection d\'intrusion réseau (IDS basé ML)', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Trafic anormal = attaque potentielle.' },
  ]},
  'ch4:0': { titre: 'Réseaux de neurones', questions: [
    { texte: 'Un perceptron est…', options: { A: 'rien', B: 'un neurone artificiel : combinaison linéaire + activation', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Brique de base.' },
    { texte: 'La backpropagation calcule…', options: { A: 'rien', B: 'le gradient de la loss par rapport à chaque poids (chain rule)', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Permet d\'entraîner les NN.' },
    { texte: 'ReLU vs Sigmoïde en activation ?', options: { A: 'identiques', B: 'ReLU plus efficace (pas de vanishing gradient)', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'ReLU = max(0, x), simple et efficace.' },
  ]},
  'ch4:1': { titre: 'CNN', questions: [
    { texte: 'CNN = ?', options: { A: 'Convolutional Neural Network', B: 'Cable News Network', C: 'aucun', D: 'autre' }, correctAnswer: 'A', explanation: 'Architecture conçue pour la vision.' },
    { texte: 'Le pooling sert à…', options: { A: 'rien', B: 'réduire la dimension spatiale (downsampling)', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Max pooling typique.' },
    { texte: 'Un filtre conv apprend…', options: { A: 'rien', B: 'à détecter des features locales (contours, textures, motifs)', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Hiérarchie : couches profondes = features de haut niveau.' },
  ]},
  'ch4:2': { titre: 'Transformers', questions: [
    { texte: 'Le mécanisme central des Transformers est…', options: { A: 'la convolution', B: 'l\'attention (self-attention)', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Attention is all you need (Vaswani 2017).' },
    { texte: 'BERT vs GPT : différence principale ?', options: { A: 'identiques', B: 'BERT bidirectionnel (encoder), GPT autoregressif (decoder)', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'BERT pour comprendre, GPT pour générer.' },
    { texte: 'Le fine-tuning consiste à…', options: { A: 'rien', B: 'adapter un modèle pré-entraîné à une tâche spécifique', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Transfert d\'apprentissage.' },
  ]},
  'ch5:0': { titre: 'Biais algorithmiques', questions: [
    { texte: 'Les biais en IA viennent principalement…', options: { A: 'du code', B: 'des données d\'entraînement non représentatives', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Garbage in, garbage out.' },
    { texte: 'COMPAS (justice US) a été critiqué pour…', options: { A: 'rien', B: 'biais raciaux dans la prédiction de récidive', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Cas emblématique de biais en IA.' },
    { texte: 'Comment mitiger un biais ?', options: { A: 'ignorer', B: 'auditer + équilibrer données + tester sur sous-groupes', C: 'rien', D: 'autre' }, correctAnswer: 'B', explanation: 'Pratiques de fairness ML.' },
  ]},
  'ch5:1': { titre: 'Éthique & régulation', questions: [
    { texte: 'L\'AI Act EU est…', options: { A: 'volontaire', B: 'régulation contraignante avec catégorisation par risque', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Risque inacceptable / élevé / limité / minimal.' },
    { texte: 'Le RGPD impose pour les décisions automatisées…', options: { A: 'rien', B: 'droit à l\'explication + intervention humaine', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Article 22 RGPD.' },
    { texte: 'Une IA explicable (XAI) sert à…', options: { A: 'cacher', B: 'rendre transparentes les décisions du modèle', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'LIME, SHAP, etc.' },
  ]},
  'ch5:2': { titre: 'LLM — dangers', questions: [
    { texte: 'Une hallucination LLM est…', options: { A: 'créative', B: 'génération de fait inexact présenté avec assurance', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Limite majeure des LLM.' },
    { texte: 'Un deepfake = ?', options: { A: 'rien', B: 'média synthétique (vidéo/audio) trompeur généré par IA', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Défi éthique et sécuritaire.' },
    { texte: 'Précaution face à un output LLM ?', options: { A: 'aucune', B: 'vérifier les sources, ne pas faire confiance aveuglément', C: 'recopier', D: 'autre' }, correctAnswer: 'B', explanation: 'Esprit critique indispensable.' },
  ]},
};

const IA_CHAPTER_QCM = {
  ch1: { titre: 'QCM Chapitre 1 — Intro IA & ML', questions: [
    { texte: 'IA forte vs faible : la "forte" vise…', options: { A: 'tâche précise', B: 'intelligence générale comparable à l\'humain', C: 'rien', D: 'autre' }, correctAnswer: 'B', explanation: 'AGI = aujourd\'hui hypothétique.' },
    { texte: 'Apprentissage supervisé requiert…', options: { A: 'rien', B: 'des données labellisées', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Inputs + outputs attendus.' },
    { texte: 'Overfitting = ?', options: { A: 'modèle parfait', B: 'apprendre par cœur, mauvaise généralisation', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Trop ajusté au train.' },
    { texte: 'NLP = ?', options: { A: 'Natural Language Processing', B: 'Network Layer Protocol', C: 'aucun', D: 'autre' }, correctAnswer: 'A', explanation: 'Domaine du langage.' },
    { texte: 'Test de Turing évalue…', options: { A: 'la vitesse', B: 'la capacité d\'une IA à imiter un humain en conversation', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Critère historique 1950.' },
  ]},
  ch2: { titre: 'QCM Chapitre 2 — Apprentissage supervisé', questions: [
    { texte: 'Régression linéaire prédit…', options: { A: 'des classes', B: 'des valeurs continues', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Output ∈ ℝ.' },
    { texte: 'Régression logistique malgré son nom est…', options: { A: 'une régression', B: 'un classifieur binaire', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Sortie = proba.' },
    { texte: 'Random Forest = ?', options: { A: 'un arbre seul', B: 'ensemble d\'arbres votant (bagging)', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Réduit variance, robustesse.' },
    { texte: 'Métriques de classification incluent…', options: { A: 'MSE seulement', B: 'accuracy, precision, recall, F1', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Métriques discrètes.' },
    { texte: 'Train/test split sert à…', options: { A: 'rien', B: 'évaluer la généralisation hors données vues', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Validation classique.' },
  ]},
  ch3: { titre: 'QCM Chapitre 3 — Apprentissage non supervisé', questions: [
    { texte: 'Apprentissage non supervisé = ?', options: { A: 'avec labels', B: 'sans labels — on cherche structure intrinsèque', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Clustering, dim. reduction.' },
    { texte: 'K-means demande…', options: { A: 'rien', B: 'le nombre k de clusters à priori', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Hyperparamètre.' },
    { texte: 'PCA est…', options: { A: 'supervisé', B: 'non supervisé, réduction de dimension linéaire', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Composantes principales.' },
    { texte: 'Détection d\'anomalies utile pour…', options: { A: 'rien', B: 'fraude, intrusion réseau, défauts produits', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Outliers signalent un événement rare.' },
    { texte: 'Méthode du coude pour k-means sert à…', options: { A: 'rien', B: 'choisir k optimal', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Trace inertie vs k.' },
  ]},
  ch4: { titre: 'QCM Chapitre 4 — Deep Learning', questions: [
    { texte: 'Un réseau profond a…', options: { A: '1 couche', B: 'plusieurs couches cachées (≥2)', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Profond = plusieurs couches.' },
    { texte: 'CNN excellent pour…', options: { A: 'NLP seulement', B: 'la vision (images)', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Convolutions = features visuelles.' },
    { texte: 'Transformer central par…', options: { A: 'convolution', B: 'self-attention', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Attention is all you need.' },
    { texte: 'Backpropagation calcule…', options: { A: 'rien', B: 'gradients des poids via règle de chaîne', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Cœur de l\'apprentissage NN.' },
    { texte: 'Transfer learning = ?', options: { A: 'recommencer à zéro', B: 'partir d\'un modèle pré-entraîné et l\'adapter', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Économise data + temps.' },
  ]},
  ch5: { titre: 'QCM Chapitre 5 — Éthique & biais', questions: [
    { texte: 'Origine principale des biais en IA = ?', options: { A: 'le code', B: 'les données d\'entraînement', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Biais social → biais data → biais modèle.' },
    { texte: 'AI Act EU classifie les systèmes par…', options: { A: 'taille', B: 'niveau de risque', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Inacceptable / élevé / limité / minimal.' },
    { texte: 'XAI = ?', options: { A: 'eXtra AI', B: 'eXplainable AI — rendre les décisions transparentes', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'LIME, SHAP, attention maps.' },
    { texte: 'Hallucination LLM = ?', options: { A: 'créatif', B: 'fait inexact généré avec assurance', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Limite des LLM, vérifier les sources.' },
    { texte: 'RGPD impose pour décisions automatisées…', options: { A: 'rien', B: 'droit à l\'explication + intervention humaine', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Art. 22.' },
  ]},
};

const IA_MODULE_QCM = {
  titre: 'QCM final — IA & Data Mining',
  questions: [
    { texte: 'IA faible vs forte : faible = ?', options: { A: 'AGI', B: 'tâche spécifique', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Narrow AI.' },
    { texte: 'Supervisé vs non supervisé : non sup = ?', options: { A: 'avec labels', B: 'sans labels', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Pure structure.' },
    { texte: 'Régression linéaire prédit…', options: { A: 'classe', B: 'valeur continue', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Output ∈ ℝ.' },
    { texte: 'Sigmoïde renvoie…', options: { A: 'tout réel', B: 'valeur ∈ [0, 1]', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Bornée.' },
    { texte: 'Random Forest = ?', options: { A: 'arbre seul', B: 'ensemble d\'arbres', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Bagging.' },
    { texte: 'K-means demande…', options: { A: 'rien', B: 'k', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Nb clusters.' },
    { texte: 'PCA = ?', options: { A: 'classifieur', B: 'réduction de dimension non supervisée', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Variance maximale.' },
    { texte: 'Backpropagation = ?', options: { A: 'forward pass', B: 'calcul gradient via chain rule', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Cœur entraînement NN.' },
    { texte: 'CNN spécialisé pour…', options: { A: 'NLP', B: 'vision', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Convolutions.' },
    { texte: 'Transformer central = ?', options: { A: 'convolution', B: 'attention', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Self-attention.' },
    { texte: 'BERT vs GPT : BERT…', options: { A: 'génératif', B: 'encoder bidirectionnel', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Compréhension.' },
    { texte: 'Origine biais IA = ?', options: { A: 'code', B: 'données', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Garbage in, garbage out.' },
    { texte: 'XAI = ?', options: { A: 'eXtra AI', B: 'eXplainable AI', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Transparence.' },
    { texte: 'Hallucination LLM = ?', options: { A: 'créatif', B: 'fait faux avec assurance', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: 'Limite à connaître.' },
    { texte: 'AI Act EU classifie par…', options: { A: 'taille', B: 'risque', C: 'aucun', D: 'autre' }, correctAnswer: 'B', explanation: '4 niveaux.' },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
   QCM LIBRARY — Cybersécurité
   Questions cohérentes avec les sujets de chapitre, indépendantes du contenu
   exact des vidéos.
═══════════════════════════════════════════════════════════════════════════ */

// QCM par capsule (3 questions chacun) — clé = chapterKey:videoIndex
const VIDEO_QCM = {
  'ch1:0': {
    titre: 'Cybersécurité — Les bases',
    questions: [
      { texte: 'Que désigne la "triade CIA" en cybersécurité ?', options: { A: 'Cryptographie, Intégrité, Authentification', B: 'Confidentialité, Intégrité, Disponibilité', C: 'Contrôle, Inspection, Audit', D: 'Cybersécurité, Internet, Antivirus' }, correctAnswer: 'B', explanation: 'Confidentialité (Confidentiality), Intégrité (Integrity), Disponibilité (Availability) — les 3 piliers de la sécurité.' },
      { texte: 'Une attaque DoS vise principalement…', options: { A: 'la confidentialité', B: 'l\'intégrité', C: 'la disponibilité', D: 'l\'authentification' }, correctAnswer: 'C', explanation: 'Denial of Service rend le service indisponible.' },
      { texte: 'Qu\'est-ce qu\'un "vecteur d\'attaque" ?', options: { A: 'un outil de défense', B: 'le chemin emprunté par l\'attaquant pour atteindre la cible', C: 'un type de virus', D: 'une norme ISO' }, correctAnswer: 'B', explanation: 'Vecteur = chemin/méthode pour exploiter une vulnérabilité (mail phishing, port ouvert, etc.).' },
    ],
  },
  'ch1:1': {
    titre: 'Anatomie d\'une cyber-attaque',
    questions: [
      { texte: 'La phase de "reconnaissance" consiste à…', options: { A: 'effacer ses traces', B: 'collecter des informations sur la cible avant l\'attaque', C: 'extraire les données', D: 'fuir' }, correctAnswer: 'B', explanation: 'Recon = phase d\'OSINT et de scan pour préparer l\'intrusion.' },
      { texte: 'Que signifie "exfiltration" ?', options: { A: 'pénétrer le réseau', B: 'sortir les données volées hors du réseau cible', C: 'effacer les logs', D: 'analyser le trafic' }, correctAnswer: 'B', explanation: 'Exfiltration = vol effectif des données.' },
      { texte: 'Un "kill chain" est…', options: { A: 'un type de malware', B: 'la séquence d\'étapes d\'une attaque', C: 'un outil défensif', D: 'un audit de code' }, correctAnswer: 'B', explanation: 'Cyber Kill Chain de Lockheed Martin — modèle des 7 étapes d\'une attaque.' },
    ],
  },
  'ch1:2': {
    titre: 'Hygiène numérique du dev',
    questions: [
      { texte: 'Pourquoi ne JAMAIS commit un fichier .env ?', options: { A: 'il est trop volumineux', B: 'il contient des secrets (DB, API keys) qui peuvent fuiter', C: 'il ralentit le repo', D: 'il génère des conflits' }, correctAnswer: 'B', explanation: 'Les secrets dans Git restent dans l\'historique même après suppression.' },
      { texte: 'Le MFA (multi-factor auth) repose sur…', options: { A: 'plusieurs mots de passe', B: 'plusieurs facteurs distincts (savoir/avoir/être)', C: 'plusieurs comptes', D: 'plusieurs serveurs' }, correctAnswer: 'B', explanation: 'Au moins 2 facteurs parmi : ce que je sais (password), ce que j\'ai (téléphone), ce que je suis (biométrie).' },
      { texte: 'Un gestionnaire de mots de passe sert à…', options: { A: 'éviter d\'avoir à retenir des mots de passe complexes uniques', B: 'partager les mots de passe', C: 'remplacer le MFA', D: 'crypter le disque' }, correctAnswer: 'A', explanation: 'Permet de générer/stocker des passwords uniques et complexes par site.' },
    ],
  },
  'ch2:0': {
    titre: 'HTTPS / TLS',
    questions: [
      { texte: 'À quoi sert le certificat TLS ?', options: { A: 'compresser la connexion', B: 'authentifier le serveur et chiffrer la connexion', C: 'accélérer le DNS', D: 'cacher l\'URL' }, correctAnswer: 'B', explanation: 'Le certificat prouve l\'identité du serveur et établit le tunnel chiffré.' },
      { texte: 'Lors du handshake TLS, que se passe-t-il ?', options: { A: 'le client envoie son mot de passe', B: 'client et serveur négocient une clé de session via crypto asymétrique', C: 'le serveur démarre', D: 'rien de notable' }, correctAnswer: 'B', explanation: 'Le handshake établit une clé symétrique partagée à partir des clés publique/privée.' },
      { texte: 'Une "Autorité de Certification" (CA) sert à…', options: { A: 'héberger des sites', B: 'signer les certificats pour qu\'on leur fasse confiance', C: 'crypter les données', D: 'attaquer les sites' }, correctAnswer: 'B', explanation: 'La CA garantit l\'identité du propriétaire du certificat.' },
    ],
  },
  'ch2:1': {
    titre: 'Crypto symétrique vs asymétrique',
    questions: [
      { texte: 'En cryptographie symétrique…', options: { A: 'on utilise 2 clés différentes', B: 'la même clé chiffre et déchiffre', C: 'pas de clé', D: 'la clé est publique' }, correctAnswer: 'B', explanation: 'Une seule clé partagée — rapide mais nécessite un canal sûr pour l\'échange.' },
      { texte: 'AES est…', options: { A: 'asymétrique', B: 'symétrique (clés 128/192/256 bits)', C: 'un protocole réseau', D: 'un hash' }, correctAnswer: 'B', explanation: 'Advanced Encryption Standard — successeur de DES.' },
      { texte: 'Une signature numérique RSA garantit…', options: { A: 'la confidentialité', B: 'l\'authenticité et l\'intégrité du message', C: 'la performance', D: 'la disponibilité' }, correctAnswer: 'B', explanation: 'On signe avec sa clé privée → vérifie avec la publique.' },
    ],
  },
  'ch2:2': {
    titre: 'Hash et stockage de mots de passe',
    questions: [
      { texte: 'Pourquoi "saler" un mot de passe avant hash ?', options: { A: 'pour l\'allonger', B: 'pour défaire les rainbow tables et garantir des hashes uniques', C: 'pour le compresser', D: 'aucune raison' }, correctAnswer: 'B', explanation: 'Sans sel, deux users avec le même password ont le même hash — vulnérable.' },
      { texte: 'bcrypt diffère de SHA-256 car…', options: { A: 'il est cassable', B: 'il est lent et adapté pour les passwords (work factor)', C: 'il est plus rapide', D: 'il est plus court' }, correctAnswer: 'B', explanation: 'bcrypt est volontairement lent pour ralentir le brute force.' },
      { texte: 'Un hash est conçu pour être…', options: { A: 'réversible', B: 'à sens unique (irréversible)', C: 'compressé', D: 'partagé' }, correctAnswer: 'B', explanation: 'Propriété fondamentale d\'un hash cryptographique.' },
    ],
  },
  'ch3:0': {
    titre: 'OWASP Top 10',
    questions: [
      { texte: 'OWASP est…', options: { A: 'une entreprise commerciale', B: 'une fondation à but non lucratif sur la sécurité applicative', C: 'un protocole', D: 'un éditeur de logiciel' }, correctAnswer: 'B', explanation: 'Open Web Application Security Project — référence mondiale.' },
      { texte: 'Le Top 10 OWASP est mis à jour…', options: { A: 'tous les ans', B: 'environ tous les 3-4 ans', C: 'jamais', D: 'tous les 10 ans' }, correctAnswer: 'B', explanation: 'Dernières versions : 2017, 2021. Reflet des tendances réelles d\'attaque.' },
      { texte: 'A01:2021 (n°1 du Top 10) concerne…', options: { A: 'l\'injection', B: 'le contrôle d\'accès défaillant (Broken Access Control)', C: 'XSS', D: 'CSRF' }, correctAnswer: 'B', explanation: 'Broken Access Control est devenu n°1 en 2021 (était n°5 en 2017).' },
    ],
  },
  'ch3:1': {
    titre: 'Injection SQL',
    questions: [
      { texte: 'Quelle est la PARADE PRINCIPALE contre l\'injection SQL ?', options: { A: 'WAF', B: 'requêtes paramétrées (prepared statements) ou ORM', C: 'compresser les requêtes', D: 'utiliser HTTPS' }, correctAnswer: 'B', explanation: 'Les paramètres ne sont jamais interprétés comme du SQL.' },
      { texte: '"\' OR 1=1 --" est un exemple de…', options: { A: 'XSS', B: 'injection SQL', C: 'CSRF', D: 'SSRF' }, correctAnswer: 'B', explanation: 'Payload classique d\'auth bypass par SQLi.' },
      { texte: 'Un ORM (ex: Mongoose, Sequelize) protège-t-il automatiquement ?', options: { A: 'oui, toujours', B: 'oui par défaut, sauf si on contourne avec du raw query', C: 'non, il aggrave', D: 'non, il ne fait rien' }, correctAnswer: 'B', explanation: 'Les ORM utilisent des requêtes paramétrées, mais raw query peut réintroduire la vulnérabilité.' },
    ],
  },
  'ch3:2': {
    titre: 'XSS',
    questions: [
      { texte: 'XSS stored vs reflected, lequel est PIRE ?', options: { A: 'reflected (besoin de cliquer un lien piégé)', B: 'stored (stocké en DB, frappe tous les visiteurs)', C: 'identique', D: 'aucun' }, correctAnswer: 'B', explanation: 'Stored frappe tous les visiteurs sans action de leur part.' },
      { texte: 'Une CSP (Content Security Policy) sert à…', options: { A: 'compresser le HTML', B: 'restreindre les sources de scripts/styles autorisés par le navigateur', C: 'cacher le code', D: 'accélérer le chargement' }, correctAnswer: 'B', explanation: 'Header HTTP qui dicte au navigateur ce qu\'il a le droit d\'exécuter.' },
      { texte: 'React est-il automatiquement protégé contre le XSS ?', options: { A: 'oui, totalement', B: 'oui par défaut grâce à l\'échappement, sauf dangerouslySetInnerHTML', C: 'non, jamais', D: 'oui mais seulement avec TypeScript' }, correctAnswer: 'B', explanation: 'JSX échappe automatiquement, mais dangerouslySetInnerHTML désactive cette protection.' },
    ],
  },
  'ch4:0': {
    titre: 'JWT vs Sessions',
    questions: [
      { texte: 'Un JWT est…', options: { A: 'crypté', B: 'signé (et lisible si décodé en base64)', C: 'compressé', D: 'haché' }, correctAnswer: 'B', explanation: 'Signé = on vérifie l\'intégrité. Le payload reste lisible — ne pas y mettre de secrets.' },
      { texte: 'Un avantage des JWT vs sessions classiques ?', options: { A: 'plus sécurisés intrinsèquement', B: 'stateless — pas de stockage serveur', C: 'plus courts', D: 'expiration impossible' }, correctAnswer: 'B', explanation: 'Stateless = scalable horizontalement, mais difficile à révoquer avant expiration.' },
      { texte: 'Pourquoi utiliser un refresh token ?', options: { A: 'pour rallonger l\'access token', B: 'pour permettre des access tokens courts (15min) tout en évitant relogin fréquent', C: 'pour stocker le password', D: 'aucune raison' }, correctAnswer: 'B', explanation: 'Access token court limite la fenêtre d\'attaque ; refresh token long permet une UX fluide.' },
    ],
  },
  'ch4:1': {
    titre: 'Auth sécurisée — bonnes pratiques',
    questions: [
      { texte: 'OAuth 2.0 sert à…', options: { A: 'chiffrer les passwords', B: 'déléguer l\'autorisation à un tiers (ex: Login Google)', C: 'remplacer HTTPS', D: 'compresser les tokens' }, correctAnswer: 'B', explanation: 'OAuth = autorisation déléguée. OpenID Connect ajoute l\'identité au-dessus.' },
      { texte: 'Le SSO (Single Sign-On) permet de…', options: { A: 'avoir plusieurs comptes', B: 'se connecter une fois pour accéder à plusieurs apps', C: 'éviter HTTPS', D: 'partager des passwords' }, correctAnswer: 'B', explanation: 'Une session pour N apps — typique des écosystèmes Google/Microsoft/etc.' },
      { texte: 'TOTP (Google Authenticator) repose sur…', options: { A: 'SMS', B: 'un secret partagé + l\'heure (RFC 6238)', C: 'la biométrie', D: 'le mot de passe' }, correctAnswer: 'B', explanation: 'Time-based One-Time Password — code change toutes les 30s à partir du secret + horloge.' },
    ],
  },
  'ch4:2': {
    titre: 'Failles d\'auth courantes',
    questions: [
      { texte: 'Le credential stuffing consiste à…', options: { A: 'forcer le login avec un seul mot de passe', B: 'tester en masse des combos email/password volés sur d\'autres services', C: 'voler la session', D: 'changer le password' }, correctAnswer: 'B', explanation: 'Tire parti de la réutilisation de mots de passe entre sites.' },
      { texte: 'Une parade efficace au brute-force est…', options: { A: 'rendre l\'app plus rapide', B: 'rate-limiting + lockout temporaire après N échecs', C: 'aucun', D: 'changer le port' }, correctAnswer: 'B', explanation: 'Limiter le nombre de tentatives par IP/compte par fenêtre de temps.' },
      { texte: 'Que faire après détection d\'un vol massif de credentials sur son site ?', options: { A: 'ignorer', B: 'forcer reset password de tous les comptes touchés + notifier', C: 'changer la couleur du site', D: 'fermer définitivement' }, correctAnswer: 'B', explanation: 'Reset + notification + audit forensique. Obligation légale (RGPD) en EU.' },
    ],
  },
  'ch5:0': {
    titre: 'Pen-testing — bases',
    questions: [
      { texte: 'Un pentest "black box" signifie…', options: { A: 'avec accès au code source', B: 'sans information préalable, comme un attaquant externe', C: 'avec accès admin', D: 'à distance uniquement' }, correctAnswer: 'B', explanation: 'Black = aucune connaissance. White = code source. Grey = partiel.' },
      { texte: 'Kali Linux est…', options: { A: 'un antivirus', B: 'une distribution Linux orientée sécurité offensive', C: 'un IDS', D: 'un firewall' }, correctAnswer: 'B', explanation: 'Maintenue par Offensive Security, contient des centaines d\'outils de pentest.' },
      { texte: 'Un pentest LÉGAL nécessite…', options: { A: 'rien', B: 'une autorisation écrite explicite (mandat) du propriétaire du système', C: 'juste un VPN', D: 'un logiciel libre' }, correctAnswer: 'B', explanation: 'Sans mandat = atteinte aux STAD (article 323-1 du code pénal en France).' },
    ],
  },
  'ch5:1': {
    titre: 'DevSecOps',
    questions: [
      { texte: 'SAST signifie…', options: { A: 'Secure Authentication System Tool', B: 'Static Application Security Testing — analyse du code source', C: 'System Audit Sec Tool', D: 'aucun' }, correctAnswer: 'B', explanation: 'Analyse du code statique (sans exécution).' },
      { texte: 'DAST se distingue de SAST car…', options: { A: 'identique', B: 'DAST teste l\'app en cours d\'exécution (boîte noire)', C: 'DAST est moins fiable', D: 'DAST coûte moins cher' }, correctAnswer: 'B', explanation: 'Dynamic — fait des requêtes contre l\'app live.' },
      { texte: 'Le "shift left" en DevSecOps signifie…', options: { A: 'changer de framework', B: 'détecter les failles le plus tôt possible dans le pipeline (dev/CI)', C: 'aller à gauche', D: 'utiliser left-pad' }, correctAnswer: 'B', explanation: 'Plus on détecte tôt, moins ça coûte cher à corriger.' },
    ],
  },
  'ch5:2': {
    titre: 'Burp Suite — proxy d\'interception',
    questions: [
      { texte: 'À quoi sert un "intercepting proxy" ?', options: { A: 'cacher l\'IP', B: 'voir et modifier les requêtes HTTP entre client et serveur', C: 'compresser le trafic', D: 'rien' }, correctAnswer: 'B', explanation: 'Outil de pentest pour comprendre/manipuler les échanges HTTP.' },
      { texte: 'Pour intercepter HTTPS avec Burp, il faut…', options: { A: 'rien de spécial', B: 'installer le certificat racine de Burp dans le navigateur', C: 'désactiver TLS', D: 'changer de DNS' }, correctAnswer: 'B', explanation: 'Burp se met en MITM, son certificat doit être trusté pour ne pas avoir d\'erreur TLS.' },
      { texte: 'Burp Suite Community vs Pro : différence ?', options: { A: 'aucune', B: 'la Pro a le scanner automatique et plus de features', C: 'la Pro est moins puissante', D: 'la Pro est gratuite' }, correctAnswer: 'B', explanation: 'Community gratuit, Pro payant (scanner, intruder illimité, etc.).' },
    ],
  },
};

// QCM par chapitre (5 questions chacun)
const CHAPTER_QCM = {
  ch1: {
    titre: 'QCM Chapitre 1 — Introduction',
    questions: [
      { texte: 'Quels sont les 3 piliers de la triade CIA ?', options: { A: 'Confidentialité, Intégrité, Disponibilité', B: 'Cryptographie, Internet, Audit', C: 'Contrôle, Inspection, Authentification', D: 'Aucun de ces choix' }, correctAnswer: 'A', explanation: 'C-I-A : Confidentiality, Integrity, Availability.' },
      { texte: 'Une attaque de type "phishing" exploite principalement…', options: { A: 'une faille logicielle', B: 'la faiblesse humaine', C: 'le matériel', D: 'le DNS' }, correctAnswer: 'B', explanation: 'Phishing = social engineering, joue sur la crédulité.' },
      { texte: 'Le principe du "moindre privilège" signifie…', options: { A: 'donner tous les droits par défaut', B: 'donner uniquement les droits nécessaires à la tâche', C: 'pas de droits', D: 'priviléges admin pour tous' }, correctAnswer: 'B', explanation: 'Limite la surface d\'attaque en cas de compromission.' },
      { texte: 'Que stocker dans un fichier .env ?', options: { A: 'le code source', B: 'les variables d\'env sensibles (clés API, DB URL, JWT secret)', C: 'les images', D: 'la documentation' }, correctAnswer: 'B', explanation: 'Les secrets, qui ne doivent pas être commités.' },
      { texte: 'Pourquoi imposer le MFA ?', options: { A: 'pour ralentir les utilisateurs', B: 'pour bloquer 99% des attaques par credential stuffing', C: 'sans raison', D: 'pour la conformité uniquement' }, correctAnswer: 'B', explanation: 'Microsoft/Google ont mesuré >99% d\'efficacité contre les attaques de masse.' },
    ],
  },
  ch2: {
    titre: 'QCM Chapitre 2 — Cryptographie',
    questions: [
      { texte: 'TLS établit une clé symétrique via…', options: { A: 'un échange en clair', B: 'la cryptographie asymétrique (RSA, ECDH)', C: 'un mot de passe', D: 'rien' }, correctAnswer: 'B', explanation: 'Le handshake utilise l\'asymétrique pour échanger une clé symétrique de session.' },
      { texte: 'Hash = ?', options: { A: 'fonction réversible', B: 'fonction à sens unique', C: 'compression', D: 'cryptage' }, correctAnswer: 'B', explanation: 'Sens unique : impossible (en pratique) de retrouver l\'entrée.' },
      { texte: 'AES-256 a une clé de…', options: { A: '8 bits', B: '128 bits', C: '256 bits', D: '1024 bits' }, correctAnswer: 'C', explanation: '256 bits — quasi incassable par brute force aujourd\'hui.' },
      { texte: 'bcrypt vs MD5 pour stocker un password ?', options: { A: 'MD5 est meilleur', B: 'bcrypt est meilleur (lent + salt intégré)', C: 'identique', D: 'aucun' }, correctAnswer: 'B', explanation: 'MD5 est cassé pour les passwords ; bcrypt est conçu pour ce cas d\'usage.' },
      { texte: 'Un certificat SSL/TLS expire généralement après…', options: { A: '1 jour', B: '90 jours à 1 an', C: '10 ans', D: 'jamais' }, correctAnswer: 'B', explanation: 'Let\'s Encrypt = 90 jours. Certificats commerciaux = 1 an max depuis 2020.' },
    ],
  },
  ch3: {
    titre: 'QCM Chapitre 3 — OWASP Top 10',
    questions: [
      { texte: 'A01:2021 = ?', options: { A: 'Injection', B: 'Broken Access Control', C: 'XSS', D: 'CSRF' }, correctAnswer: 'B', explanation: 'Devenu n°1 en 2021.' },
      { texte: 'Parade contre l\'injection SQL ?', options: { A: 'WAF uniquement', B: 'requêtes paramétrées + validation input', C: 'changer de DB', D: 'rien' }, correctAnswer: 'B', explanation: 'Defense in depth : prepared statements + sanitization + ORM.' },
      { texte: 'XSS stored est-il pire que reflected ?', options: { A: 'non, identique', B: 'oui, frappe tous les visiteurs sans action', C: 'non, plus facile à corriger', D: 'aucun' }, correctAnswer: 'B', explanation: 'Stored persiste, reflected nécessite que la victime clique un lien.' },
      { texte: 'CSRF protection se fait avec…', options: { A: 'rien', B: 'token CSRF + SameSite cookie', C: 'JWT seul', D: 'HTTPS seul' }, correctAnswer: 'B', explanation: 'Tokens anti-CSRF + cookies SameSite=Lax/Strict.' },
      { texte: 'Une "broken access control" est par exemple…', options: { A: 'une page lente', B: 'l\'accès à /admin/users sans être admin via manipulation d\'URL', C: 'un beau design', D: 'aucun' }, correctAnswer: 'B', explanation: 'Le contrôle d\'autorisation est manquant ou mal fait côté serveur.' },
    ],
  },
  ch4: {
    titre: 'QCM Chapitre 4 — Authentification',
    questions: [
      { texte: 'JWT = JSON Web Token. Ce token est…', options: { A: 'crypté', B: 'signé (header.payload.signature)', C: 'compressé', D: 'haché' }, correctAnswer: 'B', explanation: 'Signé HMAC ou RSA. Le payload est lisible.' },
      { texte: 'Un access token court (15min) couplé à un refresh token long permet…', options: { A: 'plus de bugs', B: 'meilleur compromis sécurité/UX', C: 'rien', D: 'plus de complexité inutile' }, correctAnswer: 'B', explanation: 'Limite la fenêtre d\'attaque sans forcer l\'utilisateur à se reconnecter.' },
      { texte: 'OAuth 2.0 ≠ OpenID Connect car…', options: { A: 'identique', B: 'OAuth = autorisation, OIDC ajoute l\'identité au-dessus', C: 'inverse', D: 'OAuth est obsolète' }, correctAnswer: 'B', explanation: 'OIDC = OAuth + couche identité (id_token).' },
      { texte: 'Stocker un JWT en localStorage est…', options: { A: 'parfaitement sûr', B: 'vulnérable au XSS — préférer cookie HttpOnly Secure', C: 'plus sûr que les cookies', D: 'aucun risque' }, correctAnswer: 'B', explanation: 'localStorage est lisible par JS → XSS = vol du token.' },
      { texte: 'Un mot de passe doit-il être ré-hashé périodiquement côté serveur ?', options: { A: 'oui, automatiquement', B: 'non, mais on peut migrer vers un algo plus fort à la prochaine connexion', C: 'jamais', D: 'tous les jours' }, correctAnswer: 'B', explanation: 'Migration progressive : on rehash au login si l\'algo a changé.' },
    ],
  },
  ch5: {
    titre: 'QCM Chapitre 5 — Pentest & DevSecOps',
    questions: [
      { texte: 'Phases d\'un pentest standard ?', options: { A: 'Aucune', B: 'Recon → Scan → Exploit → Post-exploit → Reporting', C: 'Compile → Run', D: 'Lecture du code seulement' }, correctAnswer: 'B', explanation: 'Méthodologie classique (PTES, OSSTMM).' },
      { texte: 'SAST analyse…', options: { A: 'l\'app en runtime', B: 'le code source statique', C: 'les logs', D: 'le réseau' }, correctAnswer: 'B', explanation: 'Static Application Security Testing.' },
      { texte: 'DAST analyse…', options: { A: 'le code source', B: 'l\'app pendant qu\'elle tourne', C: 'la DB', D: 'rien' }, correctAnswer: 'B', explanation: 'Dynamic Application Security Testing.' },
      { texte: 'Pentest légal nécessite…', options: { A: 'rien', B: 'mandat écrit du propriétaire du système', C: 'un VPN', D: 'un logiciel libre' }, correctAnswer: 'B', explanation: 'Sans mandat = délit pénal.' },
      { texte: 'Burp Suite est…', options: { A: 'un IDE', B: 'un proxy d\'interception HTTP pour tests sécu', C: 'un OS', D: 'un firewall' }, correctAnswer: 'B', explanation: 'Outil incontournable du pentester web.' },
    ],
  },
};

// QCM final module (15 questions de synthèse)
const MODULE_QCM = {
  titre: 'QCM final — Cybersécurité & Cloud DevOps',
  questions: [
    { texte: 'CIA = ?', options: { A: 'Cryptographie, Internet, Audit', B: 'Confidentialité, Intégrité, Disponibilité', C: 'Cybersec, Internet, Antivirus', D: 'aucun' }, correctAnswer: 'B', explanation: 'Triade CIA fondamentale.' },
    { texte: 'OWASP Top 10 2021 — n°1 ?', options: { A: 'Injection', B: 'Broken Access Control', C: 'XSS', D: 'CSRF' }, correctAnswer: 'B', explanation: 'Broken Access Control depuis 2021.' },
    { texte: 'Un hash sécurisé pour password ?', options: { A: 'MD5', B: 'bcrypt/Argon2', C: 'SHA-1', D: 'base64' }, correctAnswer: 'B', explanation: 'Lents par design, salt intégré.' },
    { texte: 'TLS 1.2 minimum recommandé ?', options: { A: 'TLS 1.0', B: 'TLS 1.2 ou 1.3', C: 'SSL 3.0', D: 'aucun' }, correctAnswer: 'B', explanation: 'TLS 1.0/1.1 dépréciés.' },
    { texte: 'JWT stocké où côté browser ?', options: { A: 'localStorage uniquement', B: 'cookie HttpOnly Secure (préféré)', C: 'console.log', D: 'rien' }, correctAnswer: 'B', explanation: 'HttpOnly empêche l\'accès JS → mitige XSS.' },
    { texte: 'Parade SQLi ?', options: { A: 'WAF seul', B: 'requêtes paramétrées + ORM', C: 'cacher l\'URL', D: 'aucun' }, correctAnswer: 'B', explanation: 'Prepared statements = paramètres jamais interprétés.' },
    { texte: 'CSP sert à…', options: { A: 'compresser', B: 'limiter les sources de scripts/styles autorisées', C: 'cacher le code', D: 'accélérer' }, correctAnswer: 'B', explanation: 'Content Security Policy.' },
    { texte: 'MFA bloque % des attaques masse ?', options: { A: '50%', B: '>99% (Microsoft/Google)', C: '10%', D: '0%' }, correctAnswer: 'B', explanation: 'Mesure réelle Microsoft.' },
    { texte: 'Pentest "white box" = ?', options: { A: 'aucune info', B: 'avec code source + accès complet', C: 'à distance', D: 'aucun' }, correctAnswer: 'B', explanation: 'Box = visibilité complète sur le système.' },
    { texte: '"Shift left" en DevSecOps = ?', options: { A: 'changer de framework', B: 'tester sécurité tôt dans le cycle dev', C: 'aller à gauche', D: 'left-pad' }, correctAnswer: 'B', explanation: 'Plus tôt = moins cher.' },
    { texte: 'Cookies SameSite=Strict ?', options: { A: 'envoyés partout', B: 'jamais en cross-site → mitige CSRF', C: 'plus rapides', D: 'aucun effet' }, correctAnswer: 'B', explanation: 'Cookie envoyé seulement en same-site.' },
    { texte: 'OAuth 2.0 fournit…', options: { A: 'identité', B: 'autorisation déléguée', C: 'cryptage', D: 'rien' }, correctAnswer: 'B', explanation: 'OIDC ajoute identité par-dessus.' },
    { texte: 'AES-256 = clé de…', options: { A: '8 bits', B: '256 bits', C: '128 bits', D: '1024 bits' }, correctAnswer: 'B', explanation: 'Le suffixe = taille de clé.' },
    { texte: 'TOTP repose sur…', options: { A: 'SMS', B: 'secret partagé + horloge (RFC 6238)', C: 'biométrie', D: 'mot de passe' }, correctAnswer: 'B', explanation: 'Time-based OTP, code change toutes les 30s.' },
    { texte: 'WAF = ?', options: { A: 'Web Application Firewall', B: 'Wireless Auth Framework', C: 'aucun', D: 'Web Audit Form' }, correctAnswer: 'A', explanation: 'Filtre les requêtes HTTP malveillantes en amont de l\'app.' },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
   CLEANUP
═══════════════════════════════════════════════════════════════════════════ */

async function cleanupDemoSeeds() {
  console.log('\n🧹 Cleanup démo (suppression de tous les documents [DEMO_SEED])');
  const descFilter = { description: { $regex: DEMO_REGEX } };
  // QCM n'a pas de champ description → tag dans titre
  const titreFilter = { titre: { $regex: DEMO_REGEX } };

  // Ordre inverse des dépendances
  const projDel = await Project.deleteMany(descFilter);
  const cpDel = await Prosit.deleteMany(descFilter);
  // QCM : match titre. Filet de sécurité supplémentaire — on supprime aussi
  // les QCM orphelins liés aux vidéos qu'on est sur le point de supprimer
  // (au cas où un seed précédent aurait crashé avant le save du tag).
  const taggedVideoIds = await Video.find(descFilter).distinct('_id');
  const taggedChapterIds = await Chapter.find(descFilter).distinct('_id');
  const qcmDel = await QCM.deleteMany({
    $or: [
      titreFilter,
      { videoId: { $in: taggedVideoIds } },
      { chapterId: { $in: taggedChapterIds } },
    ],
  });

  // Vidéos : on supprime aussi la progression assil sur ces vidéos (cascade
  // implicite car le doc Video est supprimé)
  const videosDel = await Video.deleteMany(descFilter);

  const chapDel = await Chapter.deleteMany(descFilter);

  const total = projDel.deletedCount + cpDel.deletedCount + qcmDel.deletedCount + videosDel.deletedCount + chapDel.deletedCount;

  console.log(`  Projects   : ${projDel.deletedCount}`);
  console.log(`  Prosits    : ${cpDel.deletedCount}`);
  console.log(`  QCM        : ${qcmDel.deletedCount}`);
  console.log(`  Videos     : ${videosDel.deletedCount}`);
  console.log(`  Chapters   : ${chapDel.deletedCount}`);
  console.log(`  TOTAL      : ${total}`);

  return { projDel, cpDel, qcmDel, videosDel, chapDel, total };
}

/* ═══════════════════════════════════════════════════════════════════════════
   SEED CYBERSEC
═══════════════════════════════════════════════════════════════════════════ */

async function seedCybersecModule() {
  console.log('\n🌱 Seed module Cybersécurité & Cloud DevOps (état AVANCÉ ~80%)');

  /* ── 1. Récupérer le course Cybersec actif ──────────────────────────── */
  const course = await Course.findOne({
    titre: /Cybersécurité.*Cloud.*DevOps/i,
    isActive: true,
  });
  if (!course) throw new Error('Course Cybersec & Cloud DevOps introuvable. Vérifier inventaire.');
  console.log(`  Course trouvé : ${course.titre} (${course._id})`);

  /* ── 2. Récupérer users (assil + 2 autres + omar prof) ─────────────── */
  const assil = await User.findOne({ email: 'assil.isil.l3@fliplearn.dz' });
  const omar = await User.findOne({ email: 'omar.isil.l3@fliplearn.dz' });
  if (!assil || !omar) throw new Error('User assil ou omar introuvable.');

  // 2 étudiants test pour matrice prof non vide (récupérés dans l'ordre alphabétique)
  const studentTest1 = await User.findOne({ email: 'adel.bouhabel.l3@fliplearn.dz' });
  const studentTest2 = await User.findOne({ email: 'imane.rahmoun.l3@fliplearn.dz' });
  if (!studentTest1 || !studentTest2) throw new Error('Étudiants test (adel ou imane) introuvables.');

  // 2 autres étudiants random pour étoffer le groupe
  const otherStudents = await User.find({
    role: 'etudiant', filiere: 'ISIL', promotion: 'L3',
    _id: { $nin: [assil._id, studentTest1._id, studentTest2._id] },
  }).limit(4).select('_id email prenom nom');

  console.log(`  Users : assil, omar, +2 tests (adel, imane), +${otherStudents.length} autres dispos`);

  /* ── 3. Créer les 5 chapitres ───────────────────────────────────────── */
  const chapterTitles = [
    'Introduction à la cybersécurité',
    'Cryptographie appliquée',
    'OWASP Top 10 — Vulnérabilités web',
    'Authentification & gestion des sessions',
    'Tests de pénétration & DevSecOps',
  ];
  const chapters = [];
  for (let i = 0; i < chapterTitles.length; i++) {
    const ch = await Chapter.create({
      courseId: course._id,
      titre: chapterTitles[i],
      description: tagDescription(`Chapitre ${i + 1} du module Cybersec & Cloud DevOps.`),
      order: i,
      unlockedByDefault: i === 0, // seul Ch1 est débloqué d'office
      completionThreshold: 80,
      practiceMode: { enabled: true, questionCount: 10 },
    });
    chapters.push(ch);
    console.log(`  ✓ Chapitre ${i + 1} créé : ${ch.titre}`);
  }

  /* ── 4. Pour chaque chapitre, valider URLs YouTube + créer 3 capsules ── */
  console.log('\n  Validation des URLs YouTube via oEmbed…');
  const chapterKeys = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'];
  const videosByChapter = {}; // { chapterId: [videoDocs] }
  let validCount = 0, fallbackCount = 0;

  for (let cIdx = 0; cIdx < chapters.length; cIdx++) {
    const chap = chapters[cIdx];
    const ck = chapterKeys[cIdx];
    const videoSpecs = CYBERSEC_VIDEOS[ck];
    videosByChapter[String(chap._id)] = [];

    for (let vIdx = 0; vIdx < videoSpecs.length; vIdx++) {
      const spec = videoSpecs[vIdx];
      const validation = await validateYouTubeId(spec.ytId);

      let finalYtId = spec.ytId;
      let extraNote = '';
      if (!validation.ok) {
        console.warn(`  ⚠️  YouTube ID ${spec.ytId} invalide (HTTP ${validation.statusCode}) — fallback`);
        finalYtId = VIDEO_FALLBACK_ID;
        extraNote = VIDEO_FALLBACK_NOTE;
        fallbackCount += 1;
      } else {
        validCount += 1;
      }

      const thumb = `https://i.ytimg.com/vi/${finalYtId}/hqdefault.jpg`;
      const video = await Video.create({
        titre: spec.titre,
        description: tagDescription(spec.description + extraNote),
        provider: 'youtube',
        url: `https://www.youtube.com/embed/${finalYtId}`,
        youtubeId: finalYtId,
        thumbnailUrl: thumb,
        duration: spec.duration,
        order: vIdx,
        chapterId: chap._id,
        courseId: course._id,
        createdBy: omar._id,
        watchedBy: [],
      });
      videosByChapter[String(chap._id)].push(video);
      console.log(`    ✓ Capsule "${spec.titre}" (${finalYtId})`);
    }
  }
  console.log(`  YouTube : ${validCount} valides, ${fallbackCount} fallbacks`);

  /* ── 5. Créer QCM (video + chapter + module) ────────────────────────── */
  console.log('\n  Création des QCM…');
  const qcmsByVideo = {};   // { videoId: qcmDoc }
  const qcmsByChapter = {}; // { chapterId: qcmDoc }
  let qcmCount = 0;

  for (let cIdx = 0; cIdx < chapters.length; cIdx++) {
    const chap = chapters[cIdx];
    const ck = chapterKeys[cIdx];
    const videos = videosByChapter[String(chap._id)];

    // QCM par capsule (tag DEMO_SEED dans titre pour cleanup chirurgical)
    for (let vIdx = 0; vIdx < videos.length; vIdx++) {
      const v = videos[vIdx];
      const qcmKey = `${ck}:${vIdx}`;
      const spec = VIDEO_QCM[qcmKey];
      if (!spec) continue;
      const qcm = await QCM.create({
        scope: 'video',
        videoId: v._id,
        titre: `${spec.titre} ${DEMO_TAG}`,
        questions: spec.questions.map((q) => ({
          ...q,
          questionType: 'single',
          correctAnswers: [q.correctAnswer],
        })),
        pointsPerQuestion: 10,
        timerSeconds: 30,
        passingScore: 60,
      });
      qcmsByVideo[String(v._id)] = qcm;
      qcmCount += 1;
    }

    // QCM par chapitre
    const chapSpec = CHAPTER_QCM[ck];
    if (chapSpec) {
      const qcm = await QCM.create({
        scope: 'chapter',
        chapterId: chap._id,
        titre: `${chapSpec.titre} ${DEMO_TAG}`,
        questions: chapSpec.questions.map((q) => ({
          ...q,
          questionType: 'single',
          correctAnswers: [q.correctAnswer],
        })),
        pointsPerQuestion: 10,
        timerSeconds: 45,
        passingScore: 60,
      });
      qcmsByChapter[String(chap._id)] = qcm;
      qcmCount += 1;
    }
  }

  // QCM final module
  const moduleQcm = await QCM.create({
    scope: 'module',
    courseId: course._id,
    titre: `${MODULE_QCM.titre} ${DEMO_TAG}`,
    questions: MODULE_QCM.questions.map((q) => ({
      ...q,
      questionType: 'single',
      correctAnswers: [q.correctAnswer],
    })),
    pointsPerQuestion: 10,
    timerSeconds: 30,
    passingScore: 60,
  });
  qcmCount += 1;

  console.log(`  ✓ ${qcmCount} QCM créés (${Object.keys(qcmsByVideo).length} video + ${Object.keys(qcmsByChapter).length} chapter + 1 module)`);

  /* ── 6. Progression assil — état AVANCÉ ~80% ────────────────────────── */
  console.log('\n  Progression assil (Ch1-4 = 100% vues, Ch5 = 50%)…');

  // Marquer les vidéos vues
  for (let cIdx = 0; cIdx < chapters.length; cIdx++) {
    const chap = chapters[cIdx];
    const videos = videosByChapter[String(chap._id)];
    let nbToWatch;
    if (cIdx < 4) nbToWatch = videos.length; // Ch1-4 : toutes
    else nbToWatch = Math.ceil(videos.length / 2); // Ch5 : 50% (1 ou 2 sur 3)

    for (let vIdx = 0; vIdx < nbToWatch; vIdx++) {
      const v = videos[vIdx];
      const completedAt = daysAgo(30 - cIdx * 5 - vIdx); // étalé entre J-30 et J-5
      v.watchedBy.push({
        userId: assil._id,
        watchedPercent: 100,
        completed: true,
        completedAt,
        lastWatchedAt: completedAt,
      });
      await v.save();
    }
  }

  // Marquer QCM vues + scores 70-95% pour Ch1-4 capsules
  let qcmAttemptCount = 0;
  for (let cIdx = 0; cIdx < 4; cIdx++) {
    const chap = chapters[cIdx];
    const videos = videosByChapter[String(chap._id)];
    for (const v of videos) {
      const qcm = qcmsByVideo[String(v._id)];
      if (!qcm) continue;
      const score = 70 + Math.floor(Math.random() * 26); // 70-95
      qcm.resultats.push({
        userId: assil._id,
        score,
        correctCount: Math.round(qcm.questions.length * (score / 100)),
        pointsEarned: Math.round(qcm.questions.length * 10 * (score / 100)),
        answers: qcm.questions.map((q) => ({
          questionId: q._id,
          answer: q.correctAnswer,
          answers: [q.correctAnswer],
          correct: true,
          timedOut: false,
        })),
        completedAt: daysAgo(30 - cIdx * 5),
      });
      await qcm.save();
      qcmAttemptCount += 1;
    }
    // QCM chapitre Ch1-4 : score ~80%
    const chapQcm = qcmsByChapter[String(chap._id)];
    if (chapQcm) {
      chapQcm.resultats.push({
        userId: assil._id,
        score: 80,
        correctCount: Math.round(chapQcm.questions.length * 0.8),
        pointsEarned: Math.round(chapQcm.questions.length * 10 * 0.8),
        answers: chapQcm.questions.map((q) => ({
          questionId: q._id,
          answer: q.correctAnswer,
          answers: [q.correctAnswer],
          correct: true,
          timedOut: false,
        })),
        completedAt: daysAgo(28 - cIdx * 5),
      });
      await chapQcm.save();
      qcmAttemptCount += 1;
    }
  }

  // QCM chapitre Ch5 : tenté avec 55% (échec)
  const ch5Qcm = qcmsByChapter[String(chapters[4]._id)];
  if (ch5Qcm) {
    ch5Qcm.resultats.push({
      userId: assil._id,
      score: 55,
      correctCount: Math.round(ch5Qcm.questions.length * 0.55),
      pointsEarned: Math.round(ch5Qcm.questions.length * 10 * 0.55),
      answers: ch5Qcm.questions.map((q, i) => ({
        questionId: q._id,
        answer: i % 2 === 0 ? q.correctAnswer : 'A',
        answers: [i % 2 === 0 ? q.correctAnswer : 'A'],
        correct: i % 2 === 0,
        timedOut: false,
      })),
      completedAt: daysAgo(2),
    });
    await ch5Qcm.save();
    qcmAttemptCount += 1;
  }

  console.log(`  ✓ ${qcmAttemptCount} QCM attempts pour assil`);

  /* ── 7. 3 cas pratiques ─────────────────────────────────────────────── */
  console.log('\n  Cas pratiques…');

  // CP1 - Audit OWASP : evalue, livrable assil + note 17/20
  const cp1 = await Prosit.create({
    titre: 'Audit OWASP d\'une app e-commerce',
    description: tagDescription('Audit complet de sécurité d\'une app e-commerce démo selon OWASP Top 10. Identifier les vulnérabilités, proposer des parades.'),
    contexte: 'Une startup algérienne lance une plateforme e-commerce. Avant la mise en prod, ils veulent un audit de sécurité.',
    problematique: 'Quelles sont les 3 vulnérabilités OWASP les plus critiques de cette app et comment les corriger ?',
    courseId: course._id,
    chapterIds: [chapters[0]._id, chapters[1]._id, chapters[2]._id],
    statut: 'evalue',
    phaseCadrageDate: daysAgo(20),
    phaseBilanDate: daysAgo(8),
    createdBy: omar._id,
    groupMembers: [
      { studentId: assil._id, role: 'animateur' },
      { studentId: studentTest1._id, role: 'scribe' },
      { studentId: studentTest2._id, role: 'membre' },
    ],
    livrables: [
      {
        studentId: assil._id,
        contenu: `# Audit OWASP — App e-commerce

## Vulnérabilité 1 : Broken Access Control (A01)
**Constat** : l'endpoint /api/admin/users est accessible sans vérification de rôle. Un utilisateur normal peut lister tous les comptes.
**Parade** : ajouter un middleware requireRole('admin') côté Express, et tester via tests d'intégration.

## Vulnérabilité 2 : SQL Injection (A03)
**Constat** : la barre de recherche concatène le query directement (\`SELECT * WHERE name LIKE '%\${q}%'\`).
**Parade** : utiliser les requêtes paramétrées via le driver MongoDB (déjà parameterized par défaut dans Mongoose) ou prepared statements en SQL classique.

## Vulnérabilité 3 : Stockage de mots de passe en SHA-256 sans salt (A02)
**Constat** : un dump DB révèle des passwords identiques entre comptes (cracking immédiat via rainbow tables).
**Parade** : migrer vers bcrypt avec un work factor ≥ 12, salt automatique inclus. Forcer reset password à la prochaine connexion.

## Conclusion
Les 3 vulnérabilités critiques sont corrigeables en 2-3 jours de dev. Recommandation : pas de mise en prod tant que A01 et A03 ne sont pas patchées.`,
        fichierUrl: '',
        submittedAt: daysAgo(7),
      },
      {
        studentId: studentTest1._id,
        contenu: 'Audit livrable de Adel — focus sur les vulnérabilités d\'authentification et la gestion des sessions...',
        submittedAt: daysAgo(7),
      },
      {
        studentId: studentTest2._id,
        contenu: 'Audit livrable de Imane — focus sur la cryptographie et les certificats TLS...',
        submittedAt: daysAgo(7),
      },
    ],
    notes: [
      { studentId: assil._id, noteIndividuelle: 17, noteCollective: 15, feedback: 'Excellent travail Assil. Analyse claire et structurée, parades pertinentes. Mention pour la profondeur sur bcrypt.', notedAt: daysAgo(5) },
      { studentId: studentTest1._id, noteIndividuelle: 14, noteCollective: 15, feedback: 'Bon travail, à approfondir la partie OAuth.', notedAt: daysAgo(5) },
      { studentId: studentTest2._id, noteIndividuelle: 13, noteCollective: 15, feedback: 'Travail correct mais manque de détails sur les parades.', notedAt: daysAgo(5) },
    ],
  });
  console.log(`  ✓ CP1 "Audit OWASP" — statut=evalue, assil note 17/20`);

  // CP2 - JWT : travail_individuel, 2 livrables sur 4 (assil pas encore)
  const cp2 = await Prosit.create({
    titre: 'Implémenter authentification JWT',
    description: tagDescription('Implémenter une authentification JWT avec refresh token sur une API Express. Identifier les pièges sécu.'),
    contexte: 'Le projet FlipLearn doit migrer son auth de sessions vers JWT pour faciliter le scaling.',
    problematique: 'Comment implémenter JWT proprement avec gestion des refresh tokens et révocation ?',
    courseId: course._id,
    chapterIds: [chapters[1]._id, chapters[3]._id],
    statut: 'travail_individuel',
    phaseCadrageDate: daysAgo(7),
    phaseBilanDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // J+4
    createdBy: omar._id,
    groupMembers: [
      { studentId: assil._id, role: 'scribe' },
      { studentId: studentTest1._id, role: 'animateur' },
      { studentId: studentTest2._id, role: 'membre' },
      { studentId: otherStudents[0]?._id, role: 'membre' },
    ].filter((m) => m.studentId),
    livrables: [
      {
        studentId: studentTest1._id,
        contenu: 'Implémentation JWT côté backend Express avec jsonwebtoken. Refresh token stocké en cookie HttpOnly Secure, durée 7j. Révocation via blacklist Redis...',
        submittedAt: daysAgo(2),
      },
      {
        studentId: studentTest2._id,
        contenu: 'Côté frontend React : stockage de l\'access token en mémoire (jamais localStorage). Intercepteur axios pour rafraîchir automatiquement avant 401...',
        submittedAt: daysAgo(1),
      },
    ],
    notes: [],
  });
  console.log(`  ✓ CP2 "JWT" — statut=travail_individuel, 2/4 livrables soumis`);

  // CP3 - Pen-testing : planifie, pas de groupe
  const cp3 = await Prosit.create({
    titre: 'Pen-testing app vulnérable',
    description: tagDescription('Effectuer un pen-test légal sur une app vulnérable mise à disposition (DVWA ou similaire). Produire un rapport.'),
    contexte: 'Le RSSI veut former l\'équipe à détecter les vulnérabilités avant qu\'elles ne soient exploitées.',
    problematique: 'Quelles vulnérabilités peut-on identifier en 4h sur DVWA et comment les rapporter ?',
    courseId: course._id,
    chapterIds: [chapters[2]._id, chapters[4]._id],
    statut: 'planifie',
    phaseCadrageDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // J+14
    phaseBilanDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),    // J+25
    createdBy: omar._id,
    groupMembers: [], // pas encore composé
    livrables: [],
    notes: [],
  });
  console.log(`  ✓ CP3 "Pen-testing" — statut=planifie, sans groupe`);

  /* ── 8. Projet Cybersec — 5 phases articulées ────────────────────────── */
  console.log('\n  Projet Cybersec — 5 phases articulées…');
  const projectGroupMembers = [
    { userId: assil._id, role: 'chef_projet' },
    { userId: studentTest1._id, role: 'scribe' },
    { userId: studentTest2._id, role: 'analyste' },
    ...otherStudents.slice(0, 2).map((s) => ({ userId: s._id, role: 'membre' })),
  ];

  const project = await Project.create({
    titre: 'Sécuriser une app web de A à Z',
    description: tagDescription('Projet final du module : prendre une app web vulnérable et la sécuriser bout-en-bout (crypto, OWASP, auth, HTTPS, pentest). Production d\'un livrable + démo.'),
    type: 'mono',
    courseId: course._id,
    createdBy: omar._id,
    status: 'actif',
    enonce: `Vous récupérez une app web volontairement vulnérable (déjà déployée). Votre mission est de la sécuriser intégralement en 5 livrables progressifs, chacun s'appuyant sur les chapitres précédemment vus et les cas pratiques évalués.`,
    motsCles: ['cybersec', 'OWASP', 'crypto', 'auth', 'pentest'],
    dateDebut: daysAgo(5),
    dateFin: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    dateSoutenance: new Date(Date.now() + 65 * 24 * 60 * 60 * 1000),
    groupes: [
      { nom: 'Groupe A — Sécurité ISIL L3', membres: projectGroupMembers },
    ],
    phases: [
      {
        titre: 'Implémenter cryptographie',
        description: 'Implémenter le chiffrement AES pour les données sensibles + bcrypt pour les passwords + TLS sur les endpoints publics.',
        statut: 'a_faire',
        weight: 15,
        livrableSpec: { type: 'document', isRequired: true, consigne: 'Document technique + extraits de code montrant l\'implémentation crypto.' },
        unlockRules: {
          chapterIds: [chapters[1]._id], // Ch2 cryptographie
          casPratiqueIds: [],
          requiresAllChapters: true,
          requiresAllCasPratiques: true,
        },
      },
      {
        titre: 'Audit OWASP',
        description: 'Identifier et corriger les vulnérabilités OWASP Top 10 sur l\'app. Réutiliser le travail du cas pratique évalué.',
        statut: 'a_faire',
        weight: 20,
        livrableSpec: { type: 'document', isRequired: true, consigne: 'Rapport OWASP enrichi avec corrections appliquées + diff de code.' },
        unlockRules: {
          chapterIds: [chapters[2]._id], // Ch3 OWASP
          casPratiqueIds: [cp1._id],     // CP1 doit être évalué
          requiresAllChapters: true,
          requiresAllCasPratiques: true,
        },
        sourceCasPratiqueId: cp1._id, // Import livrable possible
      },
      {
        titre: 'Authentification sécurisée',
        description: 'Migrer l\'auth vers JWT avec refresh tokens, MFA optionnel, rate-limiting login.',
        statut: 'a_faire',
        weight: 20,
        livrableSpec: { type: 'document', isRequired: true, consigne: 'Code + doc sur le flow d\'auth.' },
        unlockRules: {
          chapterIds: [chapters[3]._id],
          casPratiqueIds: [cp2._id],
          requiresAllChapters: true,
          requiresAllCasPratiques: true,
        },
        sourceCasPratiqueId: cp2._id,
      },
      {
        titre: 'HTTPS & sécurité réseau',
        description: 'Mettre en place HTTPS (Let\'s Encrypt), CSP, headers sécurité (Helmet), et tests automatisés.',
        statut: 'a_faire',
        weight: 15,
        livrableSpec: { type: 'document', isRequired: true, consigne: 'Configuration nginx/Express + démo HTTPS.' },
        unlockRules: {
          chapterIds: [chapters[4]._id], // Ch5 — pas encore complété par assil
          casPratiqueIds: [],
          requiresAllChapters: true,
          requiresAllCasPratiques: true,
        },
      },
      {
        titre: 'Pen-testing final & soutenance',
        description: 'Tester l\'app sécurisée avec Burp Suite, produire un rapport de pentest, présenter en soutenance.',
        statut: 'a_faire',
        weight: 30,
        livrableSpec: { type: 'presentation', isRequired: true, consigne: 'Rapport pentest + slides soutenance.' },
        // Pas d'unlockRules → débloquée d'office (présentation finale)
      },
    ],
  });
  console.log(`  ✓ Projet "${project.titre}" créé avec 5 phases (id=${project._id})`);

  /* ── 9. Précalculer studentProgress pour assil ──────────────────────── */
  // Le service computePhaseStatus le fera automatiquement à la 1ère requête /my-phases.
  // Mais on peut le déclencher ici pour avoir des chiffres exacts dans le rapport final.
  const { computePhaseStatus } = await import('../services/projectMilestoneService.js');
  const myPhasesAssil = await computePhaseStatus(project._id, assil._id);
  // Idem pour les 2 autres étudiants test (matrice prof non vide)
  await computePhaseStatus(project._id, studentTest1._id);
  await computePhaseStatus(project._id, studentTest2._id);

  return {
    course,
    chapters,
    videos: Object.values(videosByChapter).flat(),
    qcms: qcmCount,
    casPratiques: [cp1, cp2, cp3],
    project,
    youtube: { valid: validCount, fallback: fallbackCount },
    qcmAttempts: qcmAttemptCount,
    myPhasesAssil,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   SEED GÉNIE LOGICIEL & UML  (état MILIEU ~50%)
═══════════════════════════════════════════════════════════════════════════ */

async function seedGenieLogicielModule() {
  console.log('\n🌱 Seed module Génie Logiciel & UML (état MILIEU ~50%)');

  /* ── 1. Course GL ───────────────────────────────────────────────────── */
  const course = await Course.findOne({ titre: /Génie Logiciel/i, isActive: true });
  if (!course) throw new Error('Course Génie Logiciel & UML introuvable.');
  console.log(`  Course trouvé : ${course.titre} (${course._id})`);

  /* ── 2. Users ───────────────────────────────────────────────────────── */
  const assil = await User.findOne({ email: 'assil.isil.l3@fliplearn.dz' });
  const tarek = await User.findOne({ email: 'tarek.isil.l3@fliplearn.dz' }); // prof GL
  const omar = await User.findOne({ email: 'omar.isil.l3@fliplearn.dz' });    // fallback prof
  const profCreator = (course.professorId && tarek?._id?.equals(course.professorId)) ? tarek : (tarek || omar);
  if (!assil || !profCreator) throw new Error('Users (assil ou prof GL) introuvables.');

  const studentTest1 = await User.findOne({ email: 'adel.bouhabel.l3@fliplearn.dz' });
  const studentTest2 = await User.findOne({ email: 'imane.rahmoun.l3@fliplearn.dz' });
  const otherStudents = await User.find({
    role: 'etudiant', filiere: 'ISIL', promotion: 'L3',
    _id: { $nin: [assil._id, studentTest1?._id, studentTest2?._id].filter(Boolean) },
  }).limit(2).select('_id email prenom nom');

  /* ── 3. Détecter l'order de départ pour ne pas écraser le contenu existant ── */
  const existingChapters = await Chapter.find({ courseId: course._id }).sort({ order: -1 }).limit(1).lean();
  const startOrder = existingChapters.length > 0 ? (existingChapters[0].order + 1) : 0;
  console.log(`  Order de départ pour les nouveaux chapitres : ${startOrder} (${existingChapters.length} chapitre(s) existant(s) préservé(s))`);

  /* ── 4. Créer 5 chapitres taggés ────────────────────────────────────── */
  const chapterTitles = [
    'Introduction au génie logiciel',
    'Modélisation UML — Cas d\'utilisation',
    'Diagrammes de classes & d\'objets',
    'Diagrammes de séquence & d\'activité',
    'Patterns de conception (GoF)',
  ];
  const chapters = [];
  for (let i = 0; i < chapterTitles.length; i++) {
    const ch = await Chapter.create({
      courseId: course._id,
      titre: chapterTitles[i],
      description: tagDescription(`Chapitre ${i + 1} du module Génie Logiciel & UML.`),
      order: startOrder + i,
      unlockedByDefault: i === 0,
      completionThreshold: 80,
      practiceMode: { enabled: true, questionCount: 10 },
    });
    chapters.push(ch);
    console.log(`  ✓ Chapitre ${i + 1} créé : ${ch.titre} (order=${ch.order})`);
  }

  /* ── 5. Capsules (15) — réutilisation IDs Phase 2 validés ──────────── */
  console.log('\n  Validation des URLs YouTube via oEmbed…');
  const chapterKeys = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'];
  const videosByChapter = {};
  let validCount = 0, fallbackCount = 0;

  for (let cIdx = 0; cIdx < chapters.length; cIdx++) {
    const chap = chapters[cIdx];
    const ck = chapterKeys[cIdx];
    const videoSpecs = GL_VIDEOS[ck];
    videosByChapter[String(chap._id)] = [];

    for (let vIdx = 0; vIdx < videoSpecs.length; vIdx++) {
      const spec = videoSpecs[vIdx];
      const validation = await validateYouTubeId(spec.ytId);

      let finalYtId = spec.ytId;
      let extraNote = GL_VIDEO_NOTE_REUSED;
      if (!validation.ok) {
        console.warn(`  ⚠️  YouTube ID ${spec.ytId} invalide (HTTP ${validation.statusCode}) — fallback`);
        finalYtId = VIDEO_FALLBACK_ID;
        extraNote = VIDEO_FALLBACK_NOTE;
        fallbackCount += 1;
      } else {
        validCount += 1;
      }

      const video = await Video.create({
        titre: spec.titre,
        description: tagDescription(spec.description + extraNote),
        provider: 'youtube',
        url: `https://www.youtube.com/embed/${finalYtId}`,
        youtubeId: finalYtId,
        thumbnailUrl: `https://i.ytimg.com/vi/${finalYtId}/hqdefault.jpg`,
        duration: spec.duration,
        order: vIdx,
        chapterId: chap._id,
        courseId: course._id,
        createdBy: profCreator._id,
        watchedBy: [],
      });
      videosByChapter[String(chap._id)].push(video);
      console.log(`    ✓ Capsule "${spec.titre}" (${finalYtId})`);
    }
  }
  console.log(`  YouTube : ${validCount} valides, ${fallbackCount} fallbacks`);

  /* ── 6. QCM video + chapter + module ────────────────────────────────── */
  console.log('\n  Création des QCM…');
  const qcmsByVideo = {};
  const qcmsByChapter = {};
  let qcmCount = 0;

  for (let cIdx = 0; cIdx < chapters.length; cIdx++) {
    const chap = chapters[cIdx];
    const ck = chapterKeys[cIdx];
    const videos = videosByChapter[String(chap._id)];

    for (let vIdx = 0; vIdx < videos.length; vIdx++) {
      const v = videos[vIdx];
      const qcmKey = `${ck}:${vIdx}`;
      const spec = GL_VIDEO_QCM[qcmKey];
      if (!spec) continue;
      const qcm = await QCM.create({
        scope: 'video',
        videoId: v._id,
        titre: `${spec.titre} ${DEMO_TAG}`,
        questions: spec.questions.map((q) => ({ ...q, questionType: 'single', correctAnswers: [q.correctAnswer] })),
        pointsPerQuestion: 10,
        timerSeconds: 30,
        passingScore: 60,
      });
      qcmsByVideo[String(v._id)] = qcm;
      qcmCount += 1;
    }

    const chapSpec = GL_CHAPTER_QCM[ck];
    if (chapSpec) {
      const qcm = await QCM.create({
        scope: 'chapter',
        chapterId: chap._id,
        titre: `${chapSpec.titre} ${DEMO_TAG}`,
        questions: chapSpec.questions.map((q) => ({ ...q, questionType: 'single', correctAnswers: [q.correctAnswer] })),
        pointsPerQuestion: 10,
        timerSeconds: 45,
        passingScore: 60,
      });
      qcmsByChapter[String(chap._id)] = qcm;
      qcmCount += 1;
    }
  }

  // Cleanup défensif : si un QCM scope=module non-DEMO existe déjà sur GL, on le supprime.
  // (Évite duplicate key. Utilisé seulement pour les seeds répétés sur DB live ; le user
  // a confirmé qu'il n'y a pas de QCM module GL réel à protéger.)
  const existingModuleQcm = await QCM.findOne({ scope: 'module', courseId: course._id });
  if (existingModuleQcm && !DEMO_REGEX.test(existingModuleQcm.titre || '')) {
    console.warn(`  ⚠️  QCM module GL non-DEMO préexistant trouvé (${existingModuleQcm._id}) — laissé tel quel, on n'en crée pas un nouveau.`);
  } else {
    if (existingModuleQcm) await QCM.deleteOne({ _id: existingModuleQcm._id });
    await QCM.create({
      scope: 'module',
      courseId: course._id,
      titre: `${GL_MODULE_QCM.titre} ${DEMO_TAG}`,
      questions: GL_MODULE_QCM.questions.map((q) => ({ ...q, questionType: 'single', correctAnswers: [q.correctAnswer] })),
      pointsPerQuestion: 10,
      timerSeconds: 30,
      passingScore: 60,
    });
    qcmCount += 1;
  }

  console.log(`  ✓ ${qcmCount} QCM créés`);

  /* ── 7. Progression assil — état MILIEU ~50% ────────────────────────── */
  console.log('\n  Progression assil (Ch1 100%, Ch2 100%, Ch3 60%, Ch4 30%, Ch5 0%)…');
  let qcmAttemptCount = 0;

  // Ch1 + Ch2 : 100% capsules vues + tous les QCM video passés (≥60%) +
  // QCM chapitre passé. Garantit que isChapterCompletedByUser(Ch1/Ch2) = true
  // (critère composite videoPercent ≥ threshold ET qcmPercent ≥ 80%).
  for (const cIdx of [0, 1]) {
    const videos = videosByChapter[String(chapters[cIdx]._id)];
    for (let vIdx = 0; vIdx < videos.length; vIdx++) {
      const v = videos[vIdx];
      const completedAt = daysAgo(20 - cIdx * 5 - vIdx);
      v.watchedBy.push({ userId: assil._id, watchedPercent: 100, completed: true, completedAt, lastWatchedAt: completedAt });
      await v.save();

      // QCM video — score 70-90% (passe le critère 60%)
      const qcm = qcmsByVideo[String(v._id)];
      if (qcm) {
        const score = 70 + Math.floor(Math.random() * 21);
        qcm.resultats.push({
          userId: assil._id, score,
          correctCount: Math.round(qcm.questions.length * (score / 100)),
          pointsEarned: Math.round(qcm.questions.length * 10 * (score / 100)),
          answers: qcm.questions.map((q) => ({ questionId: q._id, answer: q.correctAnswer, answers: [q.correctAnswer], correct: true, timedOut: false })),
          completedAt: daysAgo(19 - cIdx * 5 - vIdx),
        });
        await qcm.save();
        qcmAttemptCount += 1;
      }
    }
    // QCM chapitre score 75-80% (séparé : dérive optionnelle, pas requise par
    // isChapterCompletedByUser qui ne regarde que les QCM scope=video)
    const chapQcm = qcmsByChapter[String(chapters[cIdx]._id)];
    if (chapQcm) {
      const score = cIdx === 0 ? 75 : 80;
      chapQcm.resultats.push({
        userId: assil._id, score,
        correctCount: Math.round(chapQcm.questions.length * (score / 100)),
        pointsEarned: Math.round(chapQcm.questions.length * 10 * (score / 100)),
        answers: chapQcm.questions.map((q) => ({ questionId: q._id, answer: q.correctAnswer, answers: [q.correctAnswer], correct: true, timedOut: false })),
        completedAt: daysAgo(15 - cIdx * 3),
      });
      await chapQcm.save();
      qcmAttemptCount += 1;
    }
  }

  // Ch3 : 60% (2/3 vidéos)
  {
    const videos = videosByChapter[String(chapters[2]._id)];
    for (let vIdx = 0; vIdx < 2; vIdx++) {
      const v = videos[vIdx];
      const completedAt = daysAgo(8 - vIdx);
      v.watchedBy.push({ userId: assil._id, watchedPercent: 100, completed: true, completedAt, lastWatchedAt: completedAt });
      await v.save();
      const qcm = qcmsByVideo[String(v._id)];
      if (qcm) {
        const score = 70 + Math.floor(Math.random() * 16);
        qcm.resultats.push({
          userId: assil._id, score,
          correctCount: Math.round(qcm.questions.length * (score / 100)),
          pointsEarned: Math.round(qcm.questions.length * 10 * (score / 100)),
          answers: qcm.questions.map((q) => ({ questionId: q._id, answer: q.correctAnswer, answers: [q.correctAnswer], correct: true, timedOut: false })),
          completedAt: daysAgo(7 - vIdx),
        });
        await qcm.save();
        qcmAttemptCount += 1;
      }
    }
    // 60% < 80% → chapitre PAS complet → Phase 2 du projet sera locked sauf via override
  }

  // Ch4 : 30% (1/3 vidéo)
  {
    const videos = videosByChapter[String(chapters[3]._id)];
    const v = videos[0];
    const completedAt = daysAgo(2);
    v.watchedBy.push({ userId: assil._id, watchedPercent: 100, completed: true, completedAt, lastWatchedAt: completedAt });
    await v.save();
  }

  // Ch5 : 0% — rien à faire
  console.log(`  ✓ ${qcmAttemptCount} QCM attempts pour assil`);

  /* ── 8. 2 cas pratiques GL ──────────────────────────────────────────── */
  console.log('\n  Cas pratiques…');

  const cp1 = await Prosit.create({
    titre: 'Modéliser un système de réservation',
    description: tagDescription('Modélisation UML d\'un système de réservation de salles : acteurs, cas d\'utilisation, contraintes métier.'),
    contexte: 'Un client veut un système de réservation de salles pour son université. Vous devez livrer la modélisation des besoins en UML.',
    problematique: 'Quels sont les acteurs, cas d\'utilisation principaux et exigences non fonctionnelles ?',
    courseId: course._id,
    chapterIds: [chapters[0]._id, chapters[1]._id],
    statut: 'evalue',
    phaseCadrageDate: daysAgo(21),
    phaseBilanDate: daysAgo(14),
    createdBy: profCreator._id,
    groupMembers: [
      { studentId: assil._id, role: 'animateur' },
      { studentId: studentTest1._id, role: 'scribe' },
      { studentId: studentTest2._id, role: 'membre' },
      ...(otherStudents[0] ? [{ studentId: otherStudents[0]._id, role: 'membre' }] : []),
    ].filter((m) => m.studentId),
    livrables: [
      {
        studentId: assil._id,
        contenu: `# Système de réservation de salles — Modélisation UML

## Acteurs identifiés
**Acteurs principaux :**
- Étudiant : réserve une salle pour révisions, consulte la disponibilité.
- Enseignant : réserve une salle pour cours/réunion, peut bloquer un créneau récurrent.

**Acteurs secondaires :**
- Administrateur : gère le catalogue des salles, valide les demandes spéciales.
- Système de paiement (externe) : pour les salles louées hors université.

## Cas d'utilisation principaux
1. **Consulter la disponibilité** — un étudiant ou enseignant filtre par date/capacité/équipement.
2. **Réserver une salle** — création d'une réservation simple. <<include>> Authentification.
3. **Annuler une réservation** — accessible jusqu'à 1h avant le créneau.
4. **Valider une demande spéciale** — admin uniquement, pour réservations longues ou hors plages standard.

## Exigences non fonctionnelles
- Performance : affichage de la disponibilité < 500ms pour une recherche standard.
- Sécurité : authentification obligatoire, traçabilité des réservations (qui, quand).
- Disponibilité : 99% durant les heures ouvrées universitaires.

## Diagramme de cas d'utilisation
(à joindre — exporté depuis StarUML)`,
        fichierUrl: '',
        submittedAt: daysAgo(13),
      },
      {
        studentId: studentTest1._id,
        contenu: 'Modélisation UML par Adel — focus sur les diagrammes de classes du système de réservation...',
        submittedAt: daysAgo(13),
      },
      {
        studentId: studentTest2._id,
        contenu: 'Modélisation par Imane — diagrammes de séquence pour le scénario de réservation...',
        submittedAt: daysAgo(13),
      },
    ],
    notes: [
      { studentId: assil._id, noteIndividuelle: 16, noteCollective: 14, feedback: 'Bonne identification des acteurs principaux et secondaires, cas d\'utilisation bien décrits.', notedAt: daysAgo(12) },
      { studentId: studentTest1._id, noteIndividuelle: 13, noteCollective: 14, feedback: 'Diagrammes corrects, à affiner sur les multiplicités.', notedAt: daysAgo(12) },
      { studentId: studentTest2._id, noteIndividuelle: 14, noteCollective: 14, feedback: 'Bons scénarios. Manque la gestion des cas d\'erreur.', notedAt: daysAgo(12) },
    ],
  });
  console.log(`  ✓ CP GL-1 "Système de réservation" — statut=evalue, assil note 16/20`);

  const cp2 = await Prosit.create({
    titre: 'Diagrammes de séquence pour app mobile',
    description: tagDescription('Concevoir les diagrammes de séquence pour les scénarios principaux d\'une app mobile de livraison.'),
    contexte: 'Une startup algérienne lance une app mobile de livraison. Vous devez modéliser les interactions client/serveur.',
    problematique: 'Comment modéliser le flux "passer commande → paiement → livraison" en UML dynamique ?',
    courseId: course._id,
    chapterIds: [chapters[1]._id, chapters[3]._id],
    statut: 'cadrage_en_cours',
    phaseCadrageDate: daysAgo(3),
    phaseBilanDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    createdBy: profCreator._id,
    groupMembers: [
      { studentId: assil._id, role: 'animateur' },
      { studentId: studentTest1._id, role: 'scribe' },
      { studentId: studentTest2._id, role: 'membre' },
      ...(otherStudents[0] ? [{ studentId: otherStudents[0]._id, role: 'membre' }] : []),
    ].filter((m) => m.studentId),
    cadrageDocument: {
      motsCles: ['UML', 'séquence', 'mobile', 'paiement', 'livraison'],
      problematiqueReformulee: 'Modéliser les 3 flux principaux (commande, paiement, livraison) avec acteurs, lignes de vie et messages.',
      planAction: ['Identifier les acteurs', 'Lister les scénarios principaux', 'Diagrammer chaque scénario', 'Vérifier la cohérence avec les cas d\'utilisation'],
      questionsOuvertes: ['Comment gérer les paiements échoués ?', 'Que faire si le livreur n\'est pas dispo ?'],
      redigePar: assil._id,
      validatedBy: [],
      valideParGroupe: false,
    },
    livrables: [],
    notes: [],
  });
  console.log(`  ✓ CP GL-2 "Diagrammes séquence" — statut=cadrage_en_cours`);

  /* ── 9. Projet GL — 4 phases avec studentProgress avancé ────────────── */
  console.log('\n  Projet GL — 4 phases (état MILIEU)…');
  const projectGroupMembers = [
    { userId: assil._id, role: 'animateur' },
    { userId: studentTest1._id, role: 'scribe' },
    { userId: studentTest2._id, role: 'membre' },
  ];

  const project = await Project.create({
    titre: 'Concevoir le SI complet d\'une PME algérienne',
    description: tagDescription('Projet final GL : modéliser et concevoir le système d\'information complet d\'une PME (50 salariés). Production d\'un dossier UML + architecture.'),
    type: 'mono',
    courseId: course._id,
    createdBy: profCreator._id,
    status: 'actif',
    enonce: `Une PME algérienne (50 salariés, secteur agroalimentaire) veut digitaliser sa gestion. Vous devez livrer en 4 étapes le SI complet : besoins → modélisation statique → modélisation dynamique → architecture finale.`,
    motsCles: ['UML', 'PME', 'modélisation', 'patterns', 'architecture'],
    dateDebut: daysAgo(15),
    dateFin: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    dateSoutenance: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
    groupes: [
      { nom: 'Groupe GL — ISIL L3', membres: projectGroupMembers },
    ],
    phases: [
      {
        titre: 'Cas d\'utilisation + cahier des charges',
        description: 'Identifier les acteurs, cas d\'utilisation, exigences fonctionnelles et non fonctionnelles. Rédiger le cahier des charges.',
        statut: 'termine',
        weight: 20,
        livrableSpec: { type: 'document', isRequired: true, consigne: 'Cahier des charges + diagramme de cas d\'utilisation UML.' },
        unlockRules: { chapterIds: [chapters[0]._id, chapters[1]._id], casPratiqueIds: [], requiresAllChapters: true, requiresAllCasPratiques: true },
      },
      {
        titre: 'Diagramme de classes + persistance',
        description: 'Modéliser la structure du SI : diagramme de classes, schéma de BDD, mapping ORM.',
        statut: 'en_cours',
        weight: 25,
        livrableSpec: { type: 'document', isRequired: true, consigne: 'Diagramme de classes UML + schéma BD + extraits de mapping.' },
        // Prérequis "soft" : avoir vu Ch2 (cas d'usage) OU Ch3 (modélisation classes)
        // suffit pour démarrer. Pédagogiquement cohérent : Ch2+CP1 forment déjà
        // la base de la modélisation statique. Ch3 reste idéal mais pas bloquant.
        unlockRules: { chapterIds: [chapters[1]._id, chapters[2]._id], casPratiqueIds: [cp1._id], requiresAllChapters: false, requiresAllCasPratiques: true },
        sourceCasPratiqueId: cp1._id,
      },
      {
        titre: 'Diagrammes dynamiques (séquence, activité)',
        description: 'Modéliser les interactions : diagrammes de séquence pour les flux principaux, diagrammes d\'activité pour les workflows métier.',
        statut: 'a_faire',
        weight: 25,
        livrableSpec: { type: 'document', isRequired: true, consigne: 'Diagrammes de séquence (≥3) + diagrammes d\'activité (≥2).' },
        unlockRules: { chapterIds: [chapters[3]._id], casPratiqueIds: [cp2._id], requiresAllChapters: true, requiresAllCasPratiques: true },
        sourceCasPratiqueId: cp2._id,
      },
      {
        titre: 'Architecture finale + patterns appliqués',
        description: 'Architecture en couches du SI, identification et application des patterns GoF pertinents.',
        statut: 'a_faire',
        weight: 30,
        livrableSpec: { type: 'presentation', isRequired: true, consigne: 'Architecture détaillée + 3 patterns appliqués + slides soutenance.' },
        unlockRules: { chapterIds: [chapters[4]._id], casPratiqueIds: [], requiresAllChapters: true, requiresAllCasPratiques: true },
      },
    ],
  });
  console.log(`  ✓ Projet "${project.titre}" créé (id=${project._id})`);

  /* ── 10. Pré-calcul + override studentProgress avancé ───────────────── */
  // On laisse computePhaseStatus calculer les statuts naturels d'abord, puis on
  // override Phase 1 (validated) et Phase 2 (in-progress importée) — ces statuts
  // terminaux/intermédiaires ne sont pas recalculables par le service.
  const { computePhaseStatus } = await import('../services/projectMilestoneService.js');
  await computePhaseStatus(project._id, assil._id);
  await computePhaseStatus(project._id, studentTest1._id);
  await computePhaseStatus(project._id, studentTest2._id);

  // Re-fetch et override
  const proj = await Project.findById(project._id);

  function setSp(phaseIdx, studentId, patch) {
    const phase = proj.phases[phaseIdx];
    let sp = phase.studentProgress.find((s) => String(s.studentId) === String(studentId));
    if (!sp) {
      phase.studentProgress.push({ studentId, status: 'locked' });
      sp = phase.studentProgress[phase.studentProgress.length - 1];
    }
    Object.assign(sp, patch);
  }

  // Phase 1 — assil & adel = validated, imane = submitted
  setSp(0, assil._id, {
    status: 'validated',
    submission: `# Cahier des charges — SI PME agroalimentaire

## Acteurs
- Salarié : pointage, demandes de congés, accès intranet.
- Manager : validation des congés de son équipe, planning.
- RH : gestion des contrats, paie, formation.
- DG : tableaux de bord, indicateurs.
- Système comptable externe : import/export pour la comptabilité.

## Cas d'utilisation prioritaires (MVP)
1. Pointage électronique (entrée/sortie) — Salarié.
2. Demande de congés + validation Manager — workflow.
3. Édition fiches de paie — RH avec template + données pointage.
4. Tableau de bord Manager — vue équipe (présences, congés en cours).
5. Tableau de bord DG — KPI globaux.

## Exigences non fonctionnelles
- Performance : pointage < 1s, dashboard < 3s.
- Disponibilité : 99% en heures ouvrées (8h-18h).
- Sécurité : auth MFA pour RH/DG, traçabilité des accès.
- Conformité : export comptable au format SAGE.

## Critères de succès du MVP
- 80% des salariés utilisent le pointage électronique sous 1 mois.
- Workflow congés : 95% validé sous 48h.
- 0 erreur de calcul paie au 1er trimestre.`,
    submittedAt: daysAgo(8),
    validatedAt: daysAgo(5),
    feedback: 'Excellent cahier des charges. Cas d\'utilisation clairement définis. Continue sur cette dynamique.',
  });
  setSp(0, studentTest1._id, {
    status: 'validated',
    submission: 'Cahier des charges par Adel — vue alternative axée sur la digitalisation des processus opérationnels...',
    submittedAt: daysAgo(7),
    validatedAt: daysAgo(4),
    feedback: 'Bon travail. Approche complémentaire à celle d\'Assil.',
  });
  setSp(0, studentTest2._id, {
    status: 'submitted',
    submission: 'Cahier des charges par Imane — focus sur les exigences non fonctionnelles et la conformité RGPD.',
    submittedAt: daysAgo(2),
  });

  // Phase 2 — assil = in-progress (importé du CP1), adel = unlocked, imane = locked
  setSp(1, assil._id, {
    status: 'in-progress',
    submission: cp1.livrables[0].contenu + `

---

# Enrichissement Phase 2 — Diagramme de classes du SI PME

À partir de la modélisation des cas d'utilisation du système de réservation (réutilisée comme base méthodologique), je structure le diagramme de classes du SI PME comme suit :

**Classes principales :**
- Salarie (id, nom, prenom, email, role, contratId)
- Contrat (id, type, dateDebut, dateFin, salaire)
- Pointage (id, salarieId, dateEntree, dateSortie)
- Conge (id, salarieId, dateDebut, dateFin, statut, validePar)
- FichePaie (id, salarieId, mois, brut, net, charges)

**Relations :**
- Salarie 1 — 0..1 Contrat (composition : la suppression du salarié supprime ses contrats archivés)
- Salarie 1 — * Pointage (aggregation : pointages liés au salarié)
- Salarie 1 — * Conge
- Salarie 1 — * FichePaie

À compléter : mapping ORM Mongoose, schémas de validation, indexes performance.`,
    importedFromCasPratiqueId: cp1._id,
    fichierUrl: null,
    submittedAt: null,
  });
  setSp(1, studentTest1._id, { status: 'unlocked' });
  setSp(1, studentTest2._id, { status: 'locked' });

  // Phase 3 — tous locked
  for (const sId of [assil._id, studentTest1._id, studentTest2._id]) {
    setSp(2, sId, { status: 'locked' });
  }
  // Phase 4 — tous locked
  for (const sId of [assil._id, studentTest1._id, studentTest2._id]) {
    setSp(3, sId, { status: 'locked' });
  }

  proj.markModified('phases');
  await proj.save();

  // Re-fetch les phases finales pour assertions
  const myPhasesAssil = await computePhaseStatus(proj._id, assil._id);

  return {
    course,
    chapters,
    videos: Object.values(videosByChapter).flat(),
    qcms: qcmCount,
    casPratiques: [cp1, cp2],
    project: proj,
    youtube: { valid: validCount, fallback: fallbackCount },
    qcmAttempts: qcmAttemptCount,
    myPhasesAssil,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   SEED IA & DATA MINING  (état DÉBUT ~20%)
═══════════════════════════════════════════════════════════════════════════ */

async function seedIaDataMiningModule() {
  console.log('\n🌱 Seed module IA & Data Mining (état DÉBUT ~20%)');

  const course = await Course.findOne({ titre: /Intelligence Artificielle.*Data Mining/i, isActive: true });
  if (!course) throw new Error('Course IA & Data Mining introuvable.');
  console.log(`  Course trouvé : ${course.titre} (${course._id})`);

  const assil = await User.findOne({ email: 'assil.isil.l3@fliplearn.dz' });
  const yasmine = await User.findOne({ email: 'yasmine.isil.l3@fliplearn.dz' });
  const omar = await User.findOne({ email: 'omar.isil.l3@fliplearn.dz' });
  const profCreator = (course.professorId && yasmine?._id?.equals(course.professorId)) ? yasmine : (yasmine || omar);
  if (!assil || !profCreator) throw new Error('Users (assil ou prof IA) introuvables.');

  const studentTest1 = await User.findOne({ email: 'adel.bouhabel.l3@fliplearn.dz' });
  const studentTest2 = await User.findOne({ email: 'imane.rahmoun.l3@fliplearn.dz' });
  const otherStudents = await User.find({
    role: 'etudiant', filiere: 'ISIL', promotion: 'L3',
    _id: { $nin: [assil._id, studentTest1?._id, studentTest2?._id].filter(Boolean) },
  }).limit(2).select('_id email prenom nom');

  /* ── Détecter order de départ pour préserver l'existant ── */
  const existingChapters = await Chapter.find({ courseId: course._id }).sort({ order: -1 }).limit(1).lean();
  const startOrder = existingChapters.length > 0 ? (existingChapters[0].order + 1) : 0;
  console.log(`  Order de départ : ${startOrder} (${existingChapters.length} chapitre(s) existant(s) préservé(s))`);

  /* ── 5 chapitres ── */
  const chapterTitles = [
    'Introduction à l\'IA et au machine learning',
    'Apprentissage supervisé : régression et classification',
    'Apprentissage non supervisé : clustering',
    'Réseaux de neurones et deep learning',
    'Éthique et biais en IA',
  ];
  const chapters = [];
  for (let i = 0; i < chapterTitles.length; i++) {
    const ch = await Chapter.create({
      courseId: course._id,
      titre: chapterTitles[i],
      description: tagDescription(`Chapitre ${i + 1} du module IA & Data Mining.`),
      order: startOrder + i,
      unlockedByDefault: i === 0,
      completionThreshold: 80,
      practiceMode: { enabled: true, questionCount: 10 },
    });
    chapters.push(ch);
    console.log(`  ✓ Chapitre ${i + 1} créé : ${ch.titre} (order=${ch.order})`);
  }

  /* ── Capsules (15) ── */
  console.log('\n  Validation des URLs YouTube via oEmbed…');
  const chapterKeys = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'];
  const videosByChapter = {};
  let validCount = 0, fallbackCount = 0;

  for (let cIdx = 0; cIdx < chapters.length; cIdx++) {
    const chap = chapters[cIdx];
    const ck = chapterKeys[cIdx];
    const videoSpecs = IA_VIDEOS[ck];
    videosByChapter[String(chap._id)] = [];

    for (let vIdx = 0; vIdx < videoSpecs.length; vIdx++) {
      const spec = videoSpecs[vIdx];
      const validation = await validateYouTubeId(spec.ytId);
      let finalYtId = spec.ytId;
      let extraNote = IA_VIDEO_NOTE_REUSED;
      if (!validation.ok) {
        console.warn(`  ⚠️  YouTube ID ${spec.ytId} invalide (HTTP ${validation.statusCode}) — fallback`);
        finalYtId = VIDEO_FALLBACK_ID;
        extraNote = VIDEO_FALLBACK_NOTE;
        fallbackCount += 1;
      } else {
        validCount += 1;
      }
      const video = await Video.create({
        titre: spec.titre,
        description: tagDescription(spec.description + extraNote),
        provider: 'youtube',
        url: `https://www.youtube.com/embed/${finalYtId}`,
        youtubeId: finalYtId,
        thumbnailUrl: `https://i.ytimg.com/vi/${finalYtId}/hqdefault.jpg`,
        duration: spec.duration,
        order: vIdx,
        chapterId: chap._id,
        courseId: course._id,
        createdBy: profCreator._id,
        watchedBy: [],
      });
      videosByChapter[String(chap._id)].push(video);
      console.log(`    ✓ Capsule "${spec.titre}" (${finalYtId})`);
    }
  }
  console.log(`  YouTube : ${validCount} valides, ${fallbackCount} fallbacks`);

  /* ── QCM ── */
  console.log('\n  Création des QCM…');
  const qcmsByVideo = {};
  const qcmsByChapter = {};
  let qcmCount = 0;

  for (let cIdx = 0; cIdx < chapters.length; cIdx++) {
    const chap = chapters[cIdx];
    const ck = chapterKeys[cIdx];
    const videos = videosByChapter[String(chap._id)];
    for (let vIdx = 0; vIdx < videos.length; vIdx++) {
      const v = videos[vIdx];
      const spec = IA_VIDEO_QCM[`${ck}:${vIdx}`];
      if (!spec) continue;
      const qcm = await QCM.create({
        scope: 'video', videoId: v._id,
        titre: `${spec.titre} ${DEMO_TAG}`,
        questions: spec.questions.map((q) => ({ ...q, questionType: 'single', correctAnswers: [q.correctAnswer] })),
        pointsPerQuestion: 10, timerSeconds: 30, passingScore: 60,
      });
      qcmsByVideo[String(v._id)] = qcm;
      qcmCount += 1;
    }
    const chapSpec = IA_CHAPTER_QCM[ck];
    if (chapSpec) {
      const qcm = await QCM.create({
        scope: 'chapter', chapterId: chap._id,
        titre: `${chapSpec.titre} ${DEMO_TAG}`,
        questions: chapSpec.questions.map((q) => ({ ...q, questionType: 'single', correctAnswers: [q.correctAnswer] })),
        pointsPerQuestion: 10, timerSeconds: 45, passingScore: 60,
      });
      qcmsByChapter[String(chap._id)] = qcm;
      qcmCount += 1;
    }
  }

  // QCM module — défensif (pas écraser un éventuel non-DEMO existant)
  const existingModuleQcm = await QCM.findOne({ scope: 'module', courseId: course._id });
  if (existingModuleQcm && !DEMO_REGEX.test(existingModuleQcm.titre || '')) {
    console.warn(`  ⚠️  QCM module IA non-DEMO préexistant trouvé (${existingModuleQcm._id}) — préservé.`);
  } else {
    if (existingModuleQcm) await QCM.deleteOne({ _id: existingModuleQcm._id });
    await QCM.create({
      scope: 'module', courseId: course._id,
      titre: `${IA_MODULE_QCM.titre} ${DEMO_TAG}`,
      questions: IA_MODULE_QCM.questions.map((q) => ({ ...q, questionType: 'single', correctAnswers: [q.correctAnswer] })),
      pointsPerQuestion: 10, timerSeconds: 30, passingScore: 60,
    });
    qcmCount += 1;
  }
  console.log(`  ✓ ${qcmCount} QCM créés`);

  /* ── Progression assil DÉBUT ~20% : 1/3 capsule Ch1 + 1 QCM video tenté 60% ── */
  console.log('\n  Progression assil (DÉBUT — 1 capsule Ch1 vue, 1 QCM tenté à 60%)…');
  let qcmAttemptCount = 0;
  {
    const v = videosByChapter[String(chapters[0]._id)][0];
    v.watchedBy.push({
      userId: assil._id, watchedPercent: 100, completed: true,
      completedAt: daysAgo(2), lastWatchedAt: daysAgo(2),
    });
    await v.save();

    const qcm = qcmsByVideo[String(v._id)];
    if (qcm) {
      const score = 60;
      qcm.resultats.push({
        userId: assil._id, score,
        correctCount: Math.round(qcm.questions.length * (score / 100)),
        pointsEarned: Math.round(qcm.questions.length * 10 * (score / 100)),
        answers: qcm.questions.map((q, i) => ({
          questionId: q._id,
          answer: i < Math.round(qcm.questions.length * (score / 100)) ? q.correctAnswer : 'A',
          answers: [i < Math.round(qcm.questions.length * (score / 100)) ? q.correctAnswer : 'A'],
          correct: i < Math.round(qcm.questions.length * (score / 100)),
          timedOut: false,
        })),
        completedAt: daysAgo(1),
      });
      await qcm.save();
      qcmAttemptCount += 1;
    }
  }
  console.log(`  ✓ ${qcmAttemptCount} QCM attempt pour assil`);

  /* ── 1 cas pratique planifie ── */
  console.log('\n  Cas pratique…');
  const cp1 = await Prosit.create({
    titre: 'Premier modèle de classification (Iris dataset)',
    description: tagDescription('Implémenter un classifieur supervisé sur le dataset Iris classique. Découvrir le workflow ML : split train/test, entraînement, évaluation.'),
    contexte: 'Vous découvrez la classification ML. Le dataset Iris (3 espèces de fleurs, 4 features) est le "Hello World" du ML.',
    problematique: 'Comment construire un classifieur qui prédit l\'espèce d\'une fleur à partir de ses mesures ?',
    courseId: course._id,
    chapterIds: [chapters[0]._id, chapters[1]._id],
    statut: 'planifie',
    phaseCadrageDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    phaseBilanDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    createdBy: profCreator._id,
    groupMembers: [],
    livrables: [],
    notes: [],
  });
  console.log(`  ✓ CP IA-1 "Iris" — statut=planifie, sans groupe`);

  /* ── Projet IA — 3 phases (toutes locked pour assil) ── */
  console.log('\n  Projet IA — 3 phases…');
  const projectGroupMembers = [
    { userId: assil._id, role: 'animateur' },
    { userId: studentTest1._id, role: 'scribe' },
    { userId: studentTest2._id, role: 'membre' },
  ];

  const project = await Project.create({
    titre: 'Système de recommandation pour une plateforme algérienne',
    description: tagDescription('Projet final IA : concevoir un système de recommandation (musique/films/produits) en 3 phases progressives.'),
    type: 'mono',
    courseId: course._id,
    createdBy: profCreator._id,
    status: 'actif',
    enonce: `Une plateforme algérienne (e-commerce ou musicale) veut intégrer un système de recommandation. Vous le construisez en 3 étapes : cas d\'usage + données → baseline supervisé → amélioration deep learning.`,
    motsCles: ['ML', 'recommandation', 'classification', 'deep learning'],
    dateDebut: new Date(),
    dateFin: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
    dateSoutenance: new Date(Date.now() + 80 * 24 * 60 * 60 * 1000),
    groupes: [
      { nom: 'Groupe IA — ISIL L3', membres: projectGroupMembers },
    ],
    phases: [
      {
        titre: 'Définir le cas d\'usage + collecter les données',
        description: 'Choisir un domaine (musique, e-commerce…), définir le pb business, collecter et nettoyer le dataset.',
        statut: 'a_faire',
        weight: 25,
        livrableSpec: { type: 'document', isRequired: true, consigne: 'Fiche de cadrage + EDA (Exploratory Data Analysis) du dataset.' },
        unlockRules: { chapterIds: [chapters[0]._id], casPratiqueIds: [], requiresAllChapters: true, requiresAllCasPratiques: true },
      },
      {
        titre: 'Implémenter un baseline (régression/classification)',
        description: 'Premier modèle simple (régression logistique, random forest) pour avoir une référence de performance.',
        statut: 'a_faire',
        weight: 35,
        livrableSpec: { type: 'document', isRequired: true, consigne: 'Notebook + métriques baseline (accuracy, precision, recall) + analyse erreurs.' },
        unlockRules: { chapterIds: [chapters[1]._id], casPratiqueIds: [], requiresAllChapters: true, requiresAllCasPratiques: true },
      },
      {
        titre: 'Améliorer avec deep learning',
        description: 'Implémenter une approche deep learning (CNN, embedding, NN dense) et comparer aux baselines.',
        statut: 'a_faire',
        weight: 40,
        livrableSpec: { type: 'presentation', isRequired: true, consigne: 'Modèle DL + comparaison baselines + slides soutenance.' },
        unlockRules: { chapterIds: [chapters[3]._id], casPratiqueIds: [cp1._id], requiresAllChapters: true, requiresAllCasPratiques: true },
        sourceCasPratiqueId: cp1._id,
      },
    ],
  });
  console.log(`  ✓ Projet "${project.titre}" créé (id=${project._id})`);

  /* ── Pré-calcul studentProgress (toutes locked car prérequis non remplis) ── */
  const { computePhaseStatus } = await import('../services/projectMilestoneService.js');
  const myPhasesAssil = await computePhaseStatus(project._id, assil._id);
  await computePhaseStatus(project._id, studentTest1._id);
  await computePhaseStatus(project._id, studentTest2._id);

  return {
    course,
    chapters,
    videos: Object.values(videosByChapter).flat(),
    qcms: qcmCount,
    casPratiques: [cp1],
    project,
    youtube: { valid: validCount, fallback: fallbackCount },
    qcmAttempts: qcmAttemptCount,
    myPhasesAssil,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUTOMATED ASSERTIONS
═══════════════════════════════════════════════════════════════════════════ */

async function assertCybersecExpectations(seedResult) {
  console.log('\n🔬 Vérifications automatiques…');
  const errors = [];

  const phases = seedResult.myPhasesAssil.phases;
  const expected = [
    { idx: 0, titre: 'Implémenter cryptographie',  status: 'unlocked' },
    { idx: 1, titre: 'Audit OWASP',                status: 'unlocked' },
    { idx: 2, titre: 'Authentification sécurisée', status: 'locked' },
    { idx: 3, titre: 'HTTPS & sécurité réseau',     status: 'locked' },
    { idx: 4, titre: 'Pen-testing final & soutenance', status: 'unlocked' },
  ];

  expected.forEach(({ idx, titre, status }) => {
    const actual = phases[idx];
    if (!actual) {
      errors.push(`Phase ${idx} manquante`);
      return;
    }
    if (actual.titre !== titre) {
      errors.push(`Phase ${idx} : titre attendu "${titre}", reçu "${actual.titre}"`);
    }
    if (actual.status !== status) {
      errors.push(`Phase ${idx} ("${titre}") : status attendu "${status}", reçu "${actual.status}"`);
    }
  });

  // Phase 2 doit avoir sourceCasPratiqueId défini
  if (phases[1] && !phases[1].sourceCasPratiqueId) {
    errors.push('Phase 2 ("Audit OWASP") : sourceCasPratiqueId manquant');
  }

  if (errors.length > 0) {
    console.error('  ❌ ÉCHEC :');
    errors.forEach((e) => console.error(`     - ${e}`));
    return false;
  }

  console.log('  ✅ Phase 1 (crypto) = unlocked');
  console.log('  ✅ Phase 2 (OWASP) = unlocked + sourceCasPratiqueId défini');
  console.log('  ✅ Phase 3 (auth) = locked (CP2 pas encore évalué)');
  console.log('  ✅ Phase 4 (HTTPS) = locked (Ch5 incomplet)');
  console.log('  ✅ Phase 5 (pentest) = unlocked (pas de prérequis)');
  return true;
}

async function assertGenieLogicielExpectations(seedResult) {
  console.log('\n🔬 Vérifications automatiques (GL)…');
  const errors = [];
  const phases = seedResult.myPhasesAssil.phases;
  const expected = [
    { idx: 0, titre: 'Cas d\'utilisation + cahier des charges',     status: 'validated' },
    { idx: 1, titre: 'Diagramme de classes + persistance',           status: 'in-progress' },
    { idx: 2, titre: 'Diagrammes dynamiques (séquence, activité)',  status: 'locked' },
    { idx: 3, titre: 'Architecture finale + patterns appliqués',     status: 'locked' },
  ];

  expected.forEach(({ idx, titre, status }) => {
    const actual = phases[idx];
    if (!actual) { errors.push(`Phase ${idx} manquante`); return; }
    if (actual.titre !== titre) errors.push(`Phase ${idx} : titre attendu "${titre}", reçu "${actual.titre}"`);
    if (actual.status !== status) errors.push(`Phase ${idx} ("${titre}") : status attendu "${status}", reçu "${actual.status}"`);
  });

  // Phase 2 : doit avoir importedFromCasPratiqueId pour assil
  if (phases[1] && !phases[1].studentProgress?.importedFromCasPratiqueId) {
    errors.push('Phase 2 ("Diagramme de classes") : importedFromCasPratiqueId manquant pour assil — l\'import livrable n\'a pas été tracé.');
  }
  if (phases[1] && !phases[1].sourceCasPratiqueId) {
    errors.push('Phase 2 : sourceCasPratiqueId (CP1) manquant côté phase.');
  }

  if (errors.length > 0) {
    console.error('  ❌ ÉCHEC GL :');
    errors.forEach((e) => console.error(`     - ${e}`));
    return false;
  }
  console.log('  ✅ Phase 1 (cas usage) = validated (avec feedback prof)');
  console.log('  ✅ Phase 2 (classes) = in-progress, importedFromCasPratiqueId défini (livrable CP1 réutilisé)');
  console.log('  ✅ Phase 3 (séquence) = locked (Ch4 30%, CP2 cadrage_en_cours)');
  console.log('  ✅ Phase 4 (architecture) = locked (Ch5 0%)');
  return true;
}

async function assertIaDataMiningExpectations(seedResult) {
  console.log('\n🔬 Vérifications automatiques (IA)…');
  const errors = [];
  const phases = seedResult.myPhasesAssil.phases;
  const expected = [
    { idx: 0, status: 'locked' },  // Ch1 33% → pas complet
    { idx: 1, status: 'locked' },  // Ch2 0%
    { idx: 2, status: 'locked' },  // Ch4 0% + CP1 planifie
  ];
  expected.forEach(({ idx, status }) => {
    const actual = phases[idx];
    if (!actual) { errors.push(`Phase ${idx} manquante`); return; }
    if (actual.status !== status) errors.push(`Phase ${idx} ("${actual.titre}") : status attendu "${status}", reçu "${actual.status}"`);
    if (!actual.details?.hasRules) errors.push(`Phase ${idx} : details.hasRules manquant — pas de message d'unlock visible`);
  });

  if (errors.length > 0) {
    console.error('  ❌ ÉCHEC IA :');
    errors.forEach((e) => console.error(`     - ${e}`));
    return false;
  }
  console.log('  ✅ Phase 1 (cas usage + données) = locked (Ch1 1/3 capsule vue)');
  console.log('  ✅ Phase 2 (baseline) = locked (Ch2 0%)');
  console.log('  ✅ Phase 3 (deep learning) = locked (Ch4 0% + CP1 planifie)');
  console.log('  ✅ Toutes les phases ont des chapterChecks/casPratiqueChecks (messages clairs étudiant)');
  return true;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════════════════ */

function parseModuleArg(args) {
  const eq = args.find((a) => a.startsWith('--module='));
  if (eq) return eq.split('=')[1];
  return 'all';
}

async function main() {
  const args = process.argv.slice(2);
  const isCleanup = args.includes('--cleanup-only');
  const isSeed = args.includes('--seed');
  const isFull = args.includes('--full');
  const moduleSel = parseModuleArg(args);
  const validModules = new Set(['cybersec', 'gl', 'ia', 'all']);
  if (!validModules.has(moduleSel)) {
    console.error(`Module invalide : ${moduleSel}. Valeurs : cybersec | gl | ia | all`);
    process.exit(1);
  }

  if (!isCleanup && !isSeed && !isFull) {
    console.error('Usage: node scripts/seed-isil-l3-demo.js [--cleanup-only|--seed|--full] [--module=cybersec|gl|ia|all]');
    process.exit(1);
  }

  await connectDB();

  if (isCleanup || isFull) {
    await cleanupDemoSeeds();
  }

  let allAssertOK = true;

  if (isSeed || isFull) {
    if (moduleSel === 'cybersec' || moduleSel === 'all') {
      const result = await seedCybersecModule();
      const ok = await assertCybersecExpectations(result);
      console.log('\n📊 Récap Cybersec :');
      console.log(`  • ${result.chapters.length} chapitres, ${result.videos.length} capsules, ${result.qcms} QCM`);
      console.log(`  • 3 cas pratiques : ${result.casPratiques.map((c) => c.statut).join(', ')}`);
      console.log(`  • 1 projet 5 phases (${result.project._id})`);
      console.log(`  • Progression assil : ${result.qcmAttempts} QCM tentés`);
      console.log(`  • URLs YouTube : ${result.youtube.valid}/15 valides, ${result.youtube.fallback}/15 fallback`);
      if (!ok) allAssertOK = false;
    }

    if (moduleSel === 'gl' || moduleSel === 'all') {
      const result = await seedGenieLogicielModule();
      const ok = await assertGenieLogicielExpectations(result);
      console.log('\n📊 Récap Génie Logiciel :');
      console.log(`  • ${result.chapters.length} chapitres, ${result.videos.length} capsules, ${result.qcms} QCM`);
      console.log(`  • 2 cas pratiques : ${result.casPratiques.map((c) => c.statut).join(', ')}`);
      console.log(`  • 1 projet 4 phases (${result.project._id})`);
      console.log(`  • Progression assil : ${result.qcmAttempts} QCM tentés (état MILIEU ~50%)`);
      console.log(`  • URLs YouTube : ${result.youtube.valid}/15 valides, ${result.youtube.fallback}/15 fallback`);
      if (!ok) allAssertOK = false;
    }

    if (moduleSel === 'ia' || moduleSel === 'all') {
      const result = await seedIaDataMiningModule();
      const ok = await assertIaDataMiningExpectations(result);
      console.log('\n📊 Récap IA & Data Mining :');
      console.log(`  • ${result.chapters.length} chapitres, ${result.videos.length} capsules, ${result.qcms} QCM`);
      console.log(`  • ${result.casPratiques.length} cas pratique : ${result.casPratiques.map((c) => c.statut).join(', ')}`);
      console.log(`  • 1 projet 3 phases (${result.project._id})`);
      console.log(`  • Progression assil : ${result.qcmAttempts} QCM tenté (état DÉBUT ~20%)`);
      console.log(`  • URLs YouTube : ${result.youtube.valid}/15 valides, ${result.youtube.fallback}/15 fallback`);
      if (!ok) allAssertOK = false;
    }

    if (!allAssertOK) {
      console.error('\n💥 Assertions échouées — exit code 1');
      await mongoose.disconnect();
      process.exit(1);
    }
  }

  console.log('\n✅ Terminé.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('\n💥 [seed-isil-l3-demo] Erreur fatale :', err);
  process.exit(1);
});
