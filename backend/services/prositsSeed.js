import Prosit, { PROSIT_ROLES } from '../models/Prosit.js';
import User from '../models/User.js';
import Course from '../models/Course.js';

/**
 * Seed de Prosits de démo : 1 par filière (ISIL, Management, Finance) en L3.
 * Chaque Prosit est créé en phase 'aller' avec des groupes auto-formés
 * pour permettre une démo immédiate de l'UI complète (espace collaboratif,
 * rôles CESI, transitions, évaluation).
 *
 * Idempotent : ne duplique pas (matche par titre).
 */
const PROSIT_SEED_DEFS = [
  {
    titre: 'Sécuriser une application web algérienne contre les attaques OWASP',
    description: 'Audit et durcissement d\'une plateforme e-commerce vulnérable.',
    enonce: `Une startup algérienne vient de mettre en ligne une plateforme e-commerce. En 2 semaines, 3 incidents de sécurité ont été signalés : commandes passées avec des comptes piratés, dump de la base clients diffusé sur un forum, script malveillant injecté sur la page d'accueil.

Ta mission : analyser les vulnérabilités, proposer des corrections, et prototyper une solution sécurisée.

Contexte : Node.js/Express + MongoDB + React. Aucune revue de code n'a été faite.

Livrables attendus :
- Un rapport d'audit listant les vulnérabilités (OWASP Top 10)
- Un proof-of-concept corrigé avec mesures de sécurité (hashing, validation, CSRF, XSS)
- Une présentation de 10 min avec démo`,
    motsCles: ['OWASP', 'XSS', 'SQL Injection', 'CSRF', 'bcrypt', 'JWT', 'HTTPS', 'CSP', 'Validation'],
    objectifsApprentissage: [
      'Identifier les vulnérabilités OWASP Top 10 dans une application web réelle',
      'Mettre en place une authentification sécurisée (hashing, JWT, sessions)',
      'Comprendre les mécanismes de défense en profondeur (validation, CSP, CSRF)',
    ],
    courseTitre: 'Cybersécurité',
    filiere: 'ISIL',
    promotion: 'L3',
    caseEntreprise: 'Startup e-commerce algérienne (PME locale)',
  },
  {
    titre: 'Pivoter le modèle économique d\'une foodtech algérienne en perte de vitesse',
    description: 'Cas stratégique d\'une startup en phase de pivot.',
    enonce: `Une startup algérienne dans la foodtech (livraison de plats préparés à Alger) voit ses ventes chuter de 30% sur les 6 derniers mois. La concurrence s'intensifie (Yassir Express, Imou) et les marges sont fragiles.

Ta mission : analyser la situation et proposer une stratégie de pivot ou de différenciation crédible.

Contexte : 12 employés, levée de fonds limitée, présence uniquement à Alger Centre.

Livrables attendus :
- Analyse SWOT et 5 forces de Porter sur le marché de la foodtech à Alger
- Proposition d'un nouveau modèle économique (canvas business model)
- Plan d'action sur 6 mois avec KPIs et budget estimé
- Présentation orale de 15 min`,
    motsCles: ['Pivot', 'Business Model Canvas', 'SWOT', 'Porter', 'Foodtech', 'KPI'],
    objectifsApprentissage: [
      'Maîtriser les outils d\'analyse stratégique (SWOT, Porter, BMC)',
      'Construire un plan d\'action commercial cohérent et chiffré',
      'Apprendre à communiquer une recommandation stratégique en 15 min',
    ],
    courseTitre: 'Stratégie d\'entreprise',
    filiere: 'Management',
    promotion: 'L3',
    caseEntreprise: 'Startup foodtech à Alger',
  },
  {
    titre: 'Choisir le mode de financement optimal pour une PME familiale en expansion',
    description: 'Analyse comparative de 3 options de financement.',
    enonce: `Une entreprise familiale algérienne (matériaux de construction, 15 ans d'existence, CA 200 millions DZD) souhaite financer son expansion vers l'Ouest du pays (ouverture de 2 nouvelles agences).

Trois options sont à l'étude :
1. Crédit bancaire classique (BNA, BEA, CPA) — taux 8%, 5 ans
2. Murabaha islamique (Banque Al Salam) — marge 10%, 5 ans
3. Levée de fonds privée (fonds d'investissement régional) — entrée au capital 30%

Ta mission : analyser chaque option (coût total, risques, gouvernance) et recommander la meilleure.

Livrables attendus :
- Tableau comparatif chiffré des 3 options
- Calculs de TRI / VAN sur 5 ans
- Recommandation argumentée avec justification fiscale et éthique
- Présentation orale de 12 min`,
    motsCles: ['TRI', 'VAN', 'Murabaha', 'Crédit bancaire', 'Levée de fonds', 'Fiscalité', 'Gouvernance'],
    objectifsApprentissage: [
      'Comparer les modes de financement classiques et islamiques en contexte algérien',
      'Maîtriser les indicateurs financiers TRI / VAN appliqués à des scénarios réels',
      'Analyser les implications fiscales et de gouvernance d\'un choix de financement',
    ],
    courseTitre: 'Finance d\'entreprise',
    filiere: 'Finance',
    promotion: 'L3',
    caseEntreprise: 'PME familiale algérienne (matériaux de construction)',
  },
];

/* ─── Helpers ──────────────────────────────────────────────────────────── */

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildGroupesRandom(memberIds, { minMembres = 4, maxMembres = 8 } = {}) {
  const shuffled = shuffle(memberIds);
  const groupes = [];
  let idx = 1;
  while (shuffled.length > 0) {
    const remaining = shuffled.length;
    let take;
    if (remaining <= maxMembres) {
      take = remaining;
    } else if (remaining < minMembres + maxMembres) {
      take = Math.ceil(remaining / 2);
    } else {
      take = maxMembres;
    }
    const slice = shuffled.splice(0, take);
    // Attribution simple (sans rotation rétroactive — c'est un seed d'illustration)
    const roleCycle = [...PROSIT_ROLES];
    const membres = slice.map((uid, i) => ({ userId: uid, role: roleCycle[i] || 'membre' }));
    groupes.push({
      nom: `Groupe ${idx++}`,
      membres,
      motsClesIdentifies: [],
      hypotheses: [],
    });
  }
  return groupes;
}

function inDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

/* ─── Seed principal ──────────────────────────────────────────────────── */

export async function seedProsits() {
  const prof = await User.findOne({ role: 'professeur', status: { $ne: 'rejected' } });
  if (!prof) {
    console.warn('[prositsSeed] Aucun prof trouvé — skip');
    return;
  }

  let created = 0;

  for (const def of PROSIT_SEED_DEFS) {
    const existing = await Prosit.findOne({ titre: def.titre });
    if (existing) continue;

    const course = await Course.findOne({ titre: def.courseTitre, filiere: def.filiere });
    if (!course) {
      console.warn(`[prositsSeed] Cours "${def.courseTitre}" introuvable pour ${def.filiere} — skip "${def.titre}"`);
      continue;
    }

    // Étudiants éligibles (filière + promotion)
    const students = await User.find({
      role: 'etudiant',
      filiere: def.filiere,
      promotion: def.promotion,
      isActive: { $ne: false },
    }).select('_id').limit(20);

    if (students.length < 4) {
      console.warn(`[prositsSeed] Pas assez d'étudiants pour ${def.filiere} ${def.promotion} (${students.length}) — Prosit créé sans groupes`);
    }

    const groupesConfig = { minMembres: 4, maxMembres: 6, formationMode: 'random' };
    const groupes = students.length >= 4 ? buildGroupesRandom(students.map(s => s._id), groupesConfig) : [];

    await Prosit.create({
      titre: def.titre,
      description: def.description,
      enonce: def.enonce,
      motsCles: def.motsCles,
      objectifsApprentissage: def.objectifsApprentissage,
      courseId: course._id,
      filiere: def.filiere,
      promotion: def.promotion,
      caseEntreprise: def.caseEntreprise,
      dateAller:  inDays(2),     // dans 2 jours
      dateRetour: inDays(9),     // dans 9 jours (1 semaine de recherche)
      dureeRechercheJours: 7,
      createdBy: prof._id,
      status: groupes.length > 0 ? 'aller' : 'brouillon',
      groupesConfig,
      groupes,
      grilleEvaluation: [
        { critere: 'Pertinence des hypothèses',  poids: 25, description: 'Qualité et plausibilité des hypothèses formulées en phase Aller' },
        { critere: 'Profondeur de la recherche', poids: 25, description: 'Sources, rigueur, citations' },
        { critere: 'Qualité de la solution',     poids: 30, description: 'Exhaustivité, faisabilité, créativité' },
        { critere: 'Présentation orale',         poids: 20, description: 'Clarté, structure, gestion du temps' },
      ],
    });
    created++;
  }

  console.log(`[prositsSeed] ${created} Prosit(s) de démo créé(s).`);
}
