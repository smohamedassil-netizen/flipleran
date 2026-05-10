/**
 * seed-isil-l3-demo.js — Seed démo articulation Cas Pratique ↔ Projet.
 *
 * Sub-commands :
 *   --cleanup-only  → supprime tout document marqué [DEMO_SEED] dans description
 *   --seed          → seed sans cleanup préalable (idempotent SI cleanup déjà fait)
 *   --full          → cleanup + seed (recommandé)
 *
 * Marqueur de démo : `[DEMO_SEED]` en suffixe dans la description des documents
 * (Course, Chapter, Video, QCM, Prosit, Project). Permet un cleanup chirurgical
 * sans toucher au contenu pédagogique réel.
 *
 * Modules ciblés (3 phases) :
 *   Phase 2 : Cybersécurité & Cloud DevOps (état AVANCÉ ~80%)
 *   Phase 3 : Génie Logiciel & UML (état MILIEU ~50%)         — TODO
 *   Phase 4 : IA & Data Mining (état DÉBUT ~10%)              — TODO
 *
 * Validation YouTube : oEmbed API (plus fiable que HEAD).
 *
 * Usage :
 *   node scripts/seed-isil-l3-demo.js --full
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

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════════════════ */

async function main() {
  const args = process.argv.slice(2);
  const isCleanup = args.includes('--cleanup-only');
  const isSeed = args.includes('--seed');
  const isFull = args.includes('--full');

  if (!isCleanup && !isSeed && !isFull) {
    console.error('Usage: node scripts/seed-isil-l3-demo.js [--cleanup-only|--seed|--full]');
    process.exit(1);
  }

  await connectDB();

  if (isCleanup || isFull) {
    await cleanupDemoSeeds();
  }

  if (isSeed || isFull) {
    const result = await seedCybersecModule();
    const assertOK = await assertCybersecExpectations(result);

    console.log('\n📊 Récapitulatif :');
    console.log(`  • Module Cybersec : ${result.chapters.length} chapitres, ${result.videos.length} capsules, ${result.qcms} QCM`);
    console.log(`  • 3 cas pratiques : ${result.casPratiques.map((c) => c.statut).join(', ')}`);
    console.log(`  • 1 projet 5 phases articulées (${result.project._id})`);
    console.log(`  • Progression assil : ${result.qcmAttempts} QCM tentés`);
    console.log(`  • URLs YouTube : ${result.youtube.valid}/15 valides, ${result.youtube.fallback}/15 fallback`);

    if (!assertOK) {
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
