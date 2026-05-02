/**
 * l3IsilSeed.js — Seed riche pour la filière ISIL Promotion L3.
 *
 * Crée :
 *   - 3 nouveaux professeurs ISIL L3 (Tarek, Sami, Yasmine) en plus d'Omar
 *   - 10 nouveaux étudiants ISIL L3 (5 en S5, 5 en S6) — Assil reste seedé séparément
 *   - 8 modules (cours) couvrant le programme réel d'une L3 ISIL
 *     (4 modules en S5 + 4 modules en S6)
 *   - Assigne chaque module à un prof (parfois 1 prof = 2 modules)
 *
 * Idempotent : skip si l'email/cours existe déjà. Sûr à relancer.
 */

import User from '../models/User.js';
import Course from '../models/Course.js';

const PASSWORD = 'test1234';

// ─── 3 nouveaux profs ISIL L3 ──────────────────────────────────────────────
const NEW_PROFS = [
  {
    email: 'tarek.isil.l3@fliplearn.dz',
    nom: 'Mansouri', prenom: 'Tarek',
    role: 'professeur', filiere: 'ISIL', promotion: 'L3',
  },
  {
    email: 'sami.isil.l3@fliplearn.dz',
    nom: 'Hadj', prenom: 'Sami',
    role: 'professeur', filiere: 'ISIL', promotion: 'L3',
  },
  {
    email: 'yasmine.isil.l3@fliplearn.dz',
    nom: 'Khelifi', prenom: 'Yasmine',
    role: 'professeur', filiere: 'ISIL', promotion: 'L3',
  },
];

// ─── 10 étudiants ISIL L3 (5 en S5, 5 en S6) ──────────────────────────────
const NEW_STUDENTS = [
  // Semestre 5 (1er sem L3)
  { email: 'yacine.boudjedra.l3@fliplearn.dz',  nom: 'Boudjedra',  prenom: 'Yacine',  semestre: 'S5' },
  { email: 'lina.benkhelifa.l3@fliplearn.dz',   nom: 'Benkhelifa', prenom: 'Lina',    semestre: 'S5' },
  { email: 'mohamed.larbi.l3@fliplearn.dz',     nom: 'Larbi',      prenom: 'Mohamed', semestre: 'S5' },
  { email: 'sarah.bouzid.l3@fliplearn.dz',      nom: 'Bouzid',     prenom: 'Sarah',   semestre: 'S5' },
  { email: 'adel.bouhabel.l3@fliplearn.dz',     nom: 'Bouhabel',   prenom: 'Adel',    semestre: 'S5' },
  // Semestre 6 (2e sem L3)
  { email: 'imane.rahmoun.l3@fliplearn.dz',     nom: 'Rahmoun',    prenom: 'Imane',   semestre: 'S6' },
  { email: 'karim.saidi.l3@fliplearn.dz',       nom: 'Saidi',      prenom: 'Karim',   semestre: 'S6' },
  { email: 'hanae.mokhtari.l3@fliplearn.dz',    nom: 'Mokhtari',   prenom: 'Hanae',   semestre: 'S6' },
  { email: 'anis.bouchama.l3@fliplearn.dz',     nom: 'Bouchama',   prenom: 'Anis',    semestre: 'S6' },
  { email: 'selma.djebbar.l3@fliplearn.dz',     nom: 'Djebbar',    prenom: 'Selma',   semestre: 'S6' },
];

// ─── 8 modules ISIL L3 (programme réel d'une L3 informatique) ─────────────
// Référence : maquette type LMD ISIL/MIASHS, ESI Alger, ENSIA, etc.
// professorEmail : à qui assigner. Peut être réparti, parfois 1 prof = 2 modules.
const COURSES = [
  // ═══════ Semestre 5 ═══════
  {
    titre: 'Génie Logiciel & UML',
    semestre: 'S5',
    professorEmail: 'tarek.isil.l3@fliplearn.dz',
    description: 'Cycle de vie logiciel, modélisation UML (cas d\'utilisation, classes, séquence, états), patrons de conception GoF, méthodes Agile (Scrum, Kanban), gestion de versions Git, tests unitaires et d\'intégration.',
    aiPersona: { nom: 'UML-Bot', specialite: 'Génie logiciel et modélisation', avatar: '🏗️' },
  },
  {
    titre: 'Systèmes d\'Exploitation Avancés',
    semestre: 'S5',
    professorEmail: 'tarek.isil.l3@fliplearn.dz', // 2e module pour Tarek
    description: 'Concurrence et synchronisation (sémaphores, mutex, moniteurs), ordonnancement, gestion mémoire (pagination, segmentation), systèmes de fichiers, virtualisation et conteneurs Linux, scripting bash avancé.',
    aiPersona: { nom: 'OS-Bot', specialite: 'Systèmes d\'exploitation Linux', avatar: '🐧' },
  },
  {
    titre: 'Bases de Données Avancées',
    semestre: 'S5',
    professorEmail: 'sami.isil.l3@fliplearn.dz',
    description: 'Optimisation SQL, indexation et plans d\'exécution, transactions ACID, normalisation 3NF/BCNF, bases NoSQL (MongoDB, Redis), théorème CAP, sharding et réplication, introduction à Big Data.',
    aiPersona: { nom: 'SQL-Bot', specialite: 'Bases de données relationnelles et NoSQL', avatar: '🗄️' },
  },
  {
    titre: 'Administration et Sécurité Réseaux',
    semestre: 'S5',
    professorEmail: 'omar.isil.l3@fliplearn.dz',
    description: 'Modèle TCP/IP en profondeur, routage statique et dynamique (RIP, OSPF), VLAN, firewalls (iptables, pf), VPN (IPsec, WireGuard), pare-feu applicatif, IDS/IPS (Snort, Suricata), supervision réseau.',
    aiPersona: { nom: 'Net-Bot', specialite: 'Administration et sécurité réseau', avatar: '🌐' },
  },

  // ═══════ Semestre 6 ═══════
  {
    titre: 'Architecture des Systèmes d\'Information',
    semestre: 'S6',
    professorEmail: 'sami.isil.l3@fliplearn.dz', // 2e module pour Sami
    description: 'Architectures n-tiers, microservices vs monolithe, REST et GraphQL, message brokers (RabbitMQ, Kafka), patterns d\'intégration (Saga, CQRS, Event Sourcing), urbanisation SI.',
    aiPersona: { nom: 'Archi-Bot', specialite: 'Architectures logicielles d\'entreprise', avatar: '🏛️' },
  },
  {
    titre: 'Développement Web et Mobile',
    semestre: 'S6',
    professorEmail: 'omar.isil.l3@fliplearn.dz', // 2e module pour Omar
    description: 'Stack moderne MERN/MEAN, React Hooks et Context, Node.js + Express, API REST sécurisées (JWT, OAuth2), apps mobiles cross-platform (React Native, Flutter), PWA, déploiement CI/CD.',
    aiPersona: { nom: 'Web-Bot', specialite: 'Développement web et mobile full-stack', avatar: '💻' },
  },
  {
    titre: 'Intelligence Artificielle & Data Mining',
    semestre: 'S6',
    professorEmail: 'yasmine.isil.l3@fliplearn.dz',
    description: 'Apprentissage supervisé/non supervisé, régression et classification, arbres de décision, réseaux de neurones, deep learning (CNN, RNN, Transformers), NLP, Python (scikit-learn, TensorFlow, PyTorch), éthique IA.',
    aiPersona: { nom: 'AI-Bot', specialite: 'Machine learning et data mining', avatar: '🧠' },
  },
  {
    titre: 'Cybersécurité & Cloud DevOps',
    semestre: 'S6',
    professorEmail: 'yasmine.isil.l3@fliplearn.dz', // 2e module pour Yasmine
    description: 'Cryptographie appliquée (AES, RSA, ECC), OWASP Top 10, pentest et audit, conteneurisation Docker, orchestration Kubernetes, IaC avec Terraform, monitoring (Prometheus, Grafana), GitHub Actions CI/CD.',
    aiPersona: { nom: 'Sec-Bot', specialite: 'Cybersécurité et infrastructure cloud', avatar: '🔐' },
  },
];

/**
 * Crée ou met à jour les comptes (idempotent — skip si email existe et déjà active).
 */
async function upsertUser(payload) {
  const existing = await User.findOne({ email: payload.email });
  if (existing) {
    let changed = false;
    if (existing.status !== 'active')      { existing.status = 'active'; changed = true; }
    if (existing.isActive === false)       { existing.isActive = true; changed = true; }
    if (!existing.filiere && payload.filiere)   { existing.filiere = payload.filiere; changed = true; }
    if (!existing.promotion && payload.promotion) { existing.promotion = payload.promotion; changed = true; }
    if (!existing.semestre && payload.semestre) { existing.semestre = payload.semestre; changed = true; }
    if (changed) await existing.save();
    return { user: existing, created: false };
  }

  const user = new User({
    nom:       payload.nom,
    prenom:    payload.prenom,
    email:     payload.email,
    password:  payload.password || PASSWORD,
    role:      payload.role || 'etudiant',
    filiere:   payload.filiere || 'ISIL',
    promotion: payload.promotion || 'L3',
    semestre:  payload.semestre || '',
    status:    'active',
    isActive:  true,
    points:    0,
  });
  await user.save();
  return { user, created: true };
}

/**
 * Seed principal — appelable depuis l'endpoint admin ou un script CLI.
 *
 * @returns {Promise<{ profs, students, courses, summary }>}
 */
export async function seedL3Isil() {
  // 1) Profs
  const profsByEmail = {};
  let profsCreated = 0;
  for (const p of NEW_PROFS) {
    const { user, created } = await upsertUser({ ...p, password: PASSWORD });
    profsByEmail[user.email] = user;
    if (created) profsCreated++;
  }
  // Récupère aussi Omar (déjà seedé) pour pouvoir lui assigner des cours
  const omar = await User.findOne({ email: 'omar.isil.l3@fliplearn.dz' });
  if (omar) profsByEmail[omar.email] = omar;

  // 2) Étudiants
  let studentsCreated = 0;
  const students = [];
  for (const s of NEW_STUDENTS) {
    const { user, created } = await upsertUser({
      ...s,
      role: 'etudiant',
      filiere: 'ISIL',
      promotion: 'L3',
      password: PASSWORD,
    });
    students.push(user);
    if (created) studentsCreated++;
  }

  // 3) Cours (idempotent : skip si même titre + filière + promotion existe)
  let coursesCreated = 0;
  const coursesOut = [];
  for (const c of COURSES) {
    const prof = profsByEmail[c.professorEmail];
    if (!prof) {
      console.warn(`[l3IsilSeed] Prof introuvable pour ${c.titre} — skip`);
      continue;
    }
    const existing = await Course.findOne({
      titre: c.titre,
      filiere: 'ISIL',
      promotion: 'L3',
    });
    if (existing) {
      // Met à jour le semestre si pas encore renseigné (migration douce)
      if (!existing.semestre && c.semestre) {
        existing.semestre = c.semestre;
        await existing.save();
      }
      coursesOut.push(existing);
      continue;
    }
    const course = await Course.create({
      titre: c.titre,
      description: c.description,
      professorId: prof._id,
      filiere: 'ISIL',
      promotion: 'L3',
      semestre: c.semestre,
      aiPersona: c.aiPersona || {},
    });
    coursesOut.push(course);
    coursesCreated++;
  }

  const summary = {
    profsCreated,
    profsTotal: NEW_PROFS.length,
    studentsCreated,
    studentsTotal: NEW_STUDENTS.length,
    coursesCreated,
    coursesTotal: COURSES.length,
  };
  console.log('[l3IsilSeed] terminé :', summary);

  return {
    profs: Object.values(profsByEmail).map((u) => ({
      _id: u._id, email: u.email, prenom: u.prenom, nom: u.nom,
    })),
    students: students.map((u) => ({
      _id: u._id, email: u.email, prenom: u.prenom, nom: u.nom, semestre: u.semestre,
    })),
    courses: coursesOut.map((c) => ({
      _id: c._id, titre: c.titre, semestre: c.semestre, professorId: c.professorId,
    })),
    summary,
  };
}
