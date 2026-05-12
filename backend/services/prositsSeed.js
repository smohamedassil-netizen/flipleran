/**
 * prositsSeed.js — Seed de Cas pratiques de démo, un par filière (L3).
 *
 * REFONTE 2026-05-12 :
 *   - Utilise le schéma "Cas pratique" 2026-05 (contexte/problematique séparés,
 *     groupMembers, resources, statut 'cadrage_en_cours').
 *   - Filière corrigée : 'Finance & Comptabilité' (matche usersSeed.js).
 *   - Cas algériens enrichis : contexte concret + 3 ressources documentaires
 *     locales (OWASP, Banque d'Algérie, Yassir, etc.).
 *   - Robust : crée un cours placeholder si aucun n'existe pour la filière.
 *   - Idempotent : skip si un Cas pratique du même titre existe déjà.
 *
 * Sécurité production : peut être lancé sur la base de prod via
 *   `npm run seed:prod` (les seeds sont gardés par titre, pas de doublon).
 */

import Prosit from '../models/Prosit.js';
import User from '../models/User.js';
import Course from '../models/Course.js';

/* ─────────────────────────────────────────────────────────────────────────
   DÉFINITIONS DES 3 CAS PRATIQUES ALGÉRIENS
   ───────────────────────────────────────────────────────────────────────── */

const CAS_PRATIQUE_DEFS = [
  // ════════════════════════════════════════════════════════════════════
  // ISIL L3 — Cybersécurité d'une plateforme e-commerce algérienne
  // ════════════════════════════════════════════════════════════════════
  {
    titre: 'Sécurisation d\'une marketplace algérienne face à OWASP Top 10',
    description: 'Audit et durcissement d\'une plateforme e-commerce locale exposée à des vulnérabilités critiques.',
    contexte: `Une marketplace algérienne (équivalent local de Jumia.dz ou Ouedkniss) employant 25 personnes vient d'être victime de trois incidents en deux semaines :

1. Plusieurs comptes clients ont été utilisés pour passer des commandes frauduleuses (vol de session).
2. Un extrait de la base clients (12 000 lignes : noms, emails, adresses) a été retrouvé sur un forum de hacking maghrébin.
3. Un script malveillant a été injecté dans la page d'accueil, redirigeant les utilisateurs vers un site de phishing.

La plateforme tourne sur une stack Node.js / Express / MongoDB / React, hébergée sur un VPS algérien. Aucun audit de sécurité n'a jamais été réalisé.`,
    problematique: `Comment identifier les vulnérabilités présentes selon le référentiel OWASP Top 10, prioriser les corrections en fonction du risque, et livrer un plan de remédiation crédible que la direction technique pourra défendre devant l'ARPCE ?`,
    filiere: 'ISIL',
    promotion: 'L3',
    courseFallbackTitre: 'Administration et Sécurité Réseaux',
    profEmail: 'omar.isil.l3@fliplearn.dz',
    resources: [
      { type: 'link',    title: 'OWASP Top 10 (édition 2021, version FR)',           url: 'https://owasp.org/Top10/fr/',                                  description: 'Référentiel officiel des 10 vulnérabilités web les plus critiques.' },
      { type: 'link',    title: 'ARPCE — Régulation algérienne de la cybersécurité', url: 'https://www.arpce.dz/',                                        description: 'Autorité de régulation algérienne, lignes directrices conformité.' },
      { type: 'article', title: 'Loi 18-07 sur la protection des données (DZ)',       url: 'https://www.joradp.dz/FTP/JO-FRANCAIS/2018/F2018034.pdf',       description: 'Cadre légal algérien sur le traitement des données personnelles.' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // MANAGEMENT L3 — Pivot stratégique foodtech Alger
  // ════════════════════════════════════════════════════════════════════
  {
    titre: 'Pivot stratégique d\'une foodtech algérienne face à Yassir Express',
    description: 'Cas de pivot business model pour une startup en perte de vitesse sur le marché algérien de la livraison de repas.',
    contexte: `Une foodtech algérienne ("BledFood", nom anonymisé) basée à Alger Centre voit ses ventes chuter de 32 % sur les six derniers mois. L'équipe : 14 personnes, levée de fonds limitée (40 millions DZD restants), opérations uniquement intra-muros à Alger.

Le marché s'est durci : Yassir Express domine grâce à son écosystème intégré (VTC + paiement + livraison), Imou agrège les restos populaires, Glovo a fermé ses opérations algériennes en 2024 mais ses anciens utilisateurs sont volatils. BledFood n'a plus que 6 mois de trésorerie avant une décision capitale : pivoter, lever des fonds ou liquider.

Le CEO sollicite un cabinet extérieur (vous) pour un diagnostic stratégique et une recommandation argumentée.`,
    problematique: `Comment positionner BledFood pour reprendre une trajectoire de croissance soutenable dans les 12 prochains mois, en arbitrant entre pivot de modèle économique, diversification géographique (Oran, Constantine) ou spécialisation de niche (cuisine du terroir, B2B entreprises) ?`,
    filiere: 'Management',
    promotion: 'L3',
    courseFallbackTitre: 'Stratégie d\'entreprise',
    profEmail: 'fatima.manage.l3@fliplearn.dz',
    resources: [
      { type: 'link',    title: 'Yassir — page entreprise et chiffres-clés',           url: 'https://yassir.com/',                                           description: 'Site officiel de l\'écosystème Yassir, données sur leur intégration verticale.' },
      { type: 'article', title: 'Business Model Canvas (modèle Strategyzer)',            url: 'https://www.strategyzer.com/library/the-business-model-canvas', description: 'Outil de référence pour cartographier un modèle économique.' },
      { type: 'article', title: 'Analyse PESTEL appliquée au marché algérien (CREAD)',   url: 'https://www.cread.dz/',                                         description: 'Centre de recherche en économie appliquée pour le développement, études marché DZ.' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // FINANCE & COMPTABILITÉ L3 — FinTech algérienne face à la Banque d'Algérie
  // ════════════════════════════════════════════════════════════════════
  {
    titre: 'Audit de conformité d\'une FinTech algérienne face à la Banque d\'Algérie',
    description: 'Analyse de la conformité réglementaire d\'une startup de paiement mobile au cadre prudentiel algérien.',
    contexte: `Une FinTech algérienne ("DZ-Pay", nom anonymisé) propose depuis 2024 une solution de paiement mobile interopérable, ciblant les commerces de proximité et les transferts P2P. 80 000 utilisateurs actifs mensuels, 4 millions DZD de volume traité par jour.

La Banque d'Algérie a publié en mars 2026 une nouvelle circulaire imposant aux opérateurs de monnaie électronique : (1) un capital minimum de 1 milliard DZD, (2) une ségrégation stricte des fonds clients, (3) un reporting AML (anti-blanchiment) trimestriel, (4) une conformité IFRS pour les états financiers.

DZ-Pay dispose actuellement de 250 millions DZD de capital, mélange ses fonds opérationnels et clients sur un compte unique, n'a pas de procédure AML formalisée, et tient ses comptes selon le PCN algérien (non-IFRS).`,
    problematique: `Quelles sont les zones d'écart réglementaires entre la situation actuelle de DZ-Pay et les exigences de la nouvelle circulaire BA 2026 ? Quel plan de mise en conformité chiffré et calendaire la direction financière doit-elle présenter au conseil d'administration sous 60 jours ?`,
    filiere: 'Finance & Comptabilité',
    promotion: 'L3',
    courseFallbackTitre: 'Audit financier et conformité',
    profEmail: 'nabil.finance.l3@fliplearn.dz',
    resources: [
      { type: 'link',    title: 'Banque d\'Algérie — Réglementation bancaire et changes', url: 'https://www.bank-of-algeria.dz/reglementation-bancaire-et-des-changes/', description: 'Portail officiel des circulaires et règlements de la BA.' },
      { type: 'article', title: 'IFRS Foundation — Normes en français',                    url: 'https://www.ifrs.org/issued-standards/list-of-standards/',               description: 'Référentiel international des normes comptables.' },
      { type: 'link',    title: 'GAFI — Lutte anti-blanchiment (recommandations)',         url: 'https://www.fatf-gafi.org/fr/',                                          description: 'Standards internationaux AML/CFT auxquels la BA s\'aligne.' },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────────────────────── */

function inDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(9, 0, 0, 0);
  return d;
}

/**
 * Construit la liste des groupMembers à partir des étudiants disponibles :
 *   - 1er → animateur
 *   - 2e  → scribe
 *   - 3e+ → membre
 *
 * Si moins de 2 étudiants, on n'attribue que les rôles disponibles (utile
 * pour Management/Finance L3 où il n'y a qu'1 étudiant seedé).
 */
function buildGroupMembers(students) {
  return students.map((s, i) => ({
    studentId: s._id,
    role: i === 0 ? 'animateur' : i === 1 ? 'scribe' : 'membre',
  }));
}

/**
 * Trouve un cours pour la filière/promotion. Si aucun n'existe, en crée un
 * placeholder rattaché au prof — assez pour que le Cas pratique soit affiché
 * dans l'UI étudiant (qui requiert courseId pour la navigation).
 */
async function findOrCreatePlaceholderCourse(def, prof) {
  // 1. Cours par titre exact
  let course = await Course.findOne({ titre: def.courseFallbackTitre, filiere: def.filiere });
  if (course) return course;

  // 2. N'importe quel cours actif de la filière+promotion
  course = await Course.findOne({ filiere: def.filiere, promotion: def.promotion, isActive: true });
  if (course) return course;

  // 3. Placeholder
  console.log(`[prositsSeed] Création cours placeholder "${def.courseFallbackTitre}" pour ${def.filiere} ${def.promotion}`);
  return Course.create({
    titre: def.courseFallbackTitre,
    description: 'Module support pour les cas pratiques pédagogiques.',
    professorId: prof._id,
    filiere: def.filiere,
    promotion: def.promotion,
    isActive: true,
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   SEED PRINCIPAL
   ───────────────────────────────────────────────────────────────────────── */

export async function seedProsits() {
  let created = 0;
  let skipped = 0;

  for (const def of CAS_PRATIQUE_DEFS) {
    // Idempotent : skip si déjà créé
    const existing = await Prosit.findOne({ titre: def.titre });
    if (existing) {
      skipped++;
      continue;
    }

    // Prof spécifique pour cette filière+promotion
    const prof = await User.findOne({ email: def.profEmail, role: 'professeur' });
    if (!prof) {
      console.warn(`[prositsSeed] Prof "${def.profEmail}" introuvable — skip "${def.titre}"`);
      continue;
    }

    // Cours (existant ou placeholder)
    const course = await findOrCreatePlaceholderCourse(def, prof);

    // Étudiants éligibles (max 6 pour un groupe lisible)
    const students = await User.find({
      role: 'etudiant',
      filiere: def.filiere,
      promotion: def.promotion,
      isActive: { $ne: false },
    })
      .select('_id prenom nom')
      .sort({ createdAt: 1 })
      .limit(6)
      .lean();

    const groupMembers = buildGroupMembers(students);
    const statut = groupMembers.length >= 2 ? 'cadrage_en_cours' : 'planifie';

    await Prosit.create({
      titre: def.titre,
      description: def.description,
      contexte: def.contexte,
      problematique: def.problematique,
      courseId: course._id,
      filiere: def.filiere,
      promotion: def.promotion,
      resources: def.resources,
      groupMembers,
      createdBy: prof._id,
      statut,
      phaseCadrageDate: inDays(0),
      phaseBilanDate:   inDays(14),
    });
    created++;
  }

  console.log(`[prositsSeed] ${created} cas pratique(s) créé(s), ${skipped} déjà existant(s).`);
  return { created, skipped };
}
