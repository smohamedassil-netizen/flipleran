import ProjectTemplate from '../models/ProjectTemplate.js';
import { getRubricTemplate } from './projectTemplates.js';

/**
 * projectTemplatesSeed — Seed initial de 14 templates de projets officiels
 * (F10 sprint-final). Couvre 3 filières (ISIL, Management, Finance) +
 * templates PFE.
 *
 * Idempotent : ne réinsère pas un template avec le même `title` + `source='official'`.
 *
 * Lancé manuellement via `node backend/scripts/seed-templates.js` (à créer si
 * besoin) ou via le seed démo (SEED_CONTENT=true en dev).
 */

const RUBRIC_GENERIC = getRubricTemplate();

/* ─── Helpers ──────────────────────────────────────────────────────────── */

function phasesISIL() {
  return [
    { titre: 'Cahier des charges', description: 'Spécifier le besoin, les contraintes techniques et les critères de succès.', weight: 15, livrableSpec: { type: 'document', isRequired: true, consigne: 'CdC 2-4 pages.' } },
    { titre: 'Conception', description: 'Architecture logicielle, choix technos, diagrammes UML.', weight: 20, livrableSpec: { type: 'document', isRequired: true, consigne: 'Document de conception + diagrammes.' } },
    { titre: 'Développement', description: 'Implémentation itérative avec tests unitaires.', weight: 35, livrableSpec: { type: 'demo', isRequired: true, consigne: 'Code source + démo fonctionnelle.' } },
    { titre: 'Tests & validation', description: 'Tests d\'intégration, performances, retours utilisateurs.', weight: 15, livrableSpec: { type: 'document', isRequired: true, consigne: 'Cahier de tests + résultats.' } },
    { titre: 'Soutenance', description: 'Présentation orale + démo en direct + questions/réponses.', weight: 15, livrableSpec: { type: 'presentation', isRequired: true, consigne: 'Slides 15-20 min + démo.' } },
  ];
}

function phasesManagement() {
  return [
    { titre: 'Étude de marché', description: 'Analyse concurrentielle et positionnement.', weight: 20, livrableSpec: { type: 'document', isRequired: true, consigne: 'Rapport d\'étude 5-10 pages.' } },
    { titre: 'Stratégie', description: 'Objectifs SMART, plan d\'action, KPI de succès.', weight: 25, livrableSpec: { type: 'document', isRequired: true, consigne: 'Document stratégique.' } },
    { titre: 'Mise en œuvre', description: 'Plan opérationnel, ressources, calendrier.', weight: 30, livrableSpec: { type: 'document', isRequired: true, consigne: 'Plan détaillé + Gantt.' } },
    { titre: 'Évaluation', description: 'Mesure des KPI, ROI estimé, recommandations.', weight: 10, livrableSpec: { type: 'document', isRequired: true, consigne: 'Rapport d\'évaluation.' } },
    { titre: 'Soutenance', description: 'Pitch business + slides + Q/R.', weight: 15, livrableSpec: { type: 'presentation', isRequired: true, consigne: 'Pitch 15 min.' } },
  ];
}

function phasesFinance() {
  return [
    { titre: 'Collecte de données', description: 'Identification et collecte des données financières pertinentes.', weight: 15, livrableSpec: { type: 'document', isRequired: true, consigne: 'Dataset + sources documentées.' } },
    { titre: 'Analyse quantitative', description: 'Ratios financiers, modélisation, projections.', weight: 30, livrableSpec: { type: 'document', isRequired: true, consigne: 'Modèle Excel/Python + analyse écrite.' } },
    { titre: 'Analyse qualitative', description: 'Contexte sectoriel, risques, opportunités.', weight: 15, livrableSpec: { type: 'document', isRequired: true, consigne: 'Note qualitative.' } },
    { titre: 'Synthèse & recommandations', description: 'Conclusions, recommandations actionnables.', weight: 25, livrableSpec: { type: 'document', isRequired: true, consigne: 'Rapport final 15-25 pages.' } },
    { titre: 'Soutenance', description: 'Présentation aux décideurs + slides + Q/R.', weight: 15, livrableSpec: { type: 'presentation', isRequired: true, consigne: 'Pitch 20 min.' } },
  ];
}

function phasesPFE7() {
  return [
    { titre: 'Étude bibliographique', description: 'Revue de la littérature, état de l\'art.', weight: 10, livrableSpec: { type: 'document', isRequired: true, consigne: 'Synthèse 8-15 pages.' } },
    { titre: 'Cahier des charges fonctionnel', description: 'Spécifications fonctionnelles et non-fonctionnelles.', weight: 10, livrableSpec: { type: 'document', isRequired: true, consigne: 'CdCF complet.' } },
    { titre: 'Conception détaillée', description: 'Architecture, diagrammes UML, choix techniques.', weight: 15, livrableSpec: { type: 'document', isRequired: true, consigne: 'Document de conception.' } },
    { titre: 'Implémentation', description: 'Codage + tests unitaires + intégration continue.', weight: 25, livrableSpec: { type: 'document', isRequired: true, consigne: 'Code + repo Git + rapport.' } },
    { titre: 'Tests & validation', description: 'Tests fonctionnels, performance, retours users.', weight: 10, livrableSpec: { type: 'document', isRequired: true, consigne: 'Cahier de tests.' } },
    { titre: 'Mémoire', description: 'Rédaction du mémoire académique 50-80 pages.', weight: 20, livrableSpec: { type: 'document', isRequired: true, consigne: 'Mémoire format université.' } },
    { titre: 'Soutenance', description: 'Présentation devant le jury + démo + Q/R.', weight: 10, livrableSpec: { type: 'presentation', isRequired: true, consigne: 'Slides 25-30 min + démo.' } },
  ];
}

/* ─── Définition des 14 templates ──────────────────────────────────────── */

const TEMPLATES = [
  /* ─── ISIL — 5 templates ─── */
  {
    title: 'Chatbot pédagogique avec RAG',
    description: 'Assistant conversationnel pour FAQ d\'un cours, basé sur Retrieval-Augmented Generation.',
    enonce: 'Concevoir et implémenter un chatbot capable de répondre aux questions des étudiants sur le contenu d\'un cours en utilisant une base documentaire indexée. Le système devra distinguer les questions hors-sujet et orienter vers le tuteur humain. Stack libre : Python/Node, embeddings open-source (Sentence-Transformers), vector store (Chroma/FAISS), LLM API gratuit (Groq).',
    motsCles: ['NLP', 'RAG', 'Embeddings', 'LLM', 'Python', 'Vector DB'],
    filiere: 'ISIL', type: 'groupe', level: 'L3', estimatedDurationWeeks: 8,
    phases: phasesISIL(),
    suggestedOutcomes: [
      'Concevoir une architecture RAG complète (ingestion → retrieval → generation)',
      'Évaluer la pertinence d\'une réponse via des métriques objectives (BLEU, ROUGE, recall@k)',
      'Justifier les choix techniques face à des contraintes (coût, latence, qualité)',
    ],
  },
  {
    title: 'Application web sécurisée OWASP-compliant',
    description: 'Mini app full-stack respectant les bonnes pratiques OWASP Top 10.',
    enonce: 'Développer une application web (CRUD multi-utilisateurs, ex: gestion de stock pour une PME) en respectant strictement les règles OWASP Top 10 : auth JWT/cookies httpOnly, CSRF tokens, sanitisation entrées, RBAC, rate limiting, CSP headers. Démontrer la résilience via des tests pen-test simples (Burp Suite, OWASP ZAP).',
    motsCles: ['Sécurité', 'OWASP', 'JWT', 'CSRF', 'XSS', 'Web'],
    filiere: 'ISIL', type: 'groupe', level: 'L3', estimatedDurationWeeks: 10,
    phases: phasesISIL(),
    suggestedOutcomes: [
      'Identifier et mitiger les 10 vulnérabilités OWASP majeures',
      'Auditer une application existante avec un outil pen-test',
      'Documenter une stratégie de sécurité défense en profondeur',
    ],
  },
  {
    title: 'Système de recommandation IA simple',
    description: 'Moteur de recommandation collaborative-filtering pour un cas d\'usage local.',
    enonce: 'Implémenter un système de recommandation pour un site e-commerce algérien (ex: Ouedkniss-like ou plateforme cours). Comparer plusieurs approches : content-based, collaborative filtering (matrix factorization), hybride. Évaluer sur un dataset public (MovieLens) puis adapter à des données métier locales.',
    motsCles: ['IA', 'Machine Learning', 'Recommandation', 'Python', 'Pandas', 'scikit-learn'],
    filiere: 'ISIL', type: 'mono', level: 'L3', estimatedDurationWeeks: 6,
    phases: [
      { titre: 'État de l\'art', description: 'Comparer content-based / collaborative / hybride.', weight: 15, livrableSpec: { type: 'document', isRequired: true, consigne: 'Note de synthèse.' } },
      { titre: 'Implémentation', description: 'Coder les 3 approches en Python.', weight: 35, livrableSpec: { type: 'demo', isRequired: true, consigne: 'Notebook + repo.' } },
      { titre: 'Évaluation', description: 'Mesurer RMSE, precision@k, recall@k.', weight: 25, livrableSpec: { type: 'document', isRequired: true, consigne: 'Rapport d\'évaluation.' } },
      { titre: 'Soutenance', description: 'Présentation + démo en direct.', weight: 25, livrableSpec: { type: 'presentation', isRequired: true, consigne: 'Slides 15 min.' } },
    ],
    suggestedOutcomes: [
      'Comparer empiriquement plusieurs algorithmes de recommandation',
      'Mesurer la performance avec des métriques adaptées au domaine',
    ],
  },
  {
    title: 'Microservice REST avec Docker',
    description: 'Architecture microservices simple : 2 services + gateway + base de données.',
    enonce: 'Concevoir un système distribué de 2 microservices (ex: catalogue produits + service utilisateurs) communiquant via REST, conteneurisés avec Docker, orchestrés via docker-compose. Ajouter un API gateway (Kong, NGINX ou simple reverse-proxy) et un mécanisme de discovery (Consul, optionnel).',
    motsCles: ['Microservices', 'Docker', 'REST', 'Gateway', 'DevOps'],
    filiere: 'ISIL', type: 'groupe', level: 'L3', estimatedDurationWeeks: 8,
    phases: phasesISIL(),
    suggestedOutcomes: [
      'Décomposer un domaine en microservices cohérents',
      'Conteneuriser une stack complète avec docker-compose',
      'Justifier les trade-offs entre monolithe et microservices',
    ],
  },
  {
    title: 'Pipeline DevOps CI/CD',
    description: 'Mise en place d\'une chaîne d\'intégration continue complète.',
    enonce: 'Pour une application web simple, mettre en place un pipeline complet : Git workflow (branches feature/main), tests automatisés (Jest/PyTest), build Docker, déploiement automatique sur un environnement staging (Render, Fly.io ou Heroku). Inclure linting, code coverage, et un dashboard de métriques (Grafana en bonus).',
    motsCles: ['DevOps', 'CI/CD', 'Docker', 'GitHub Actions', 'Tests'],
    filiere: 'ISIL', type: 'groupe', level: 'L3', estimatedDurationWeeks: 6,
    phases: phasesISIL(),
    suggestedOutcomes: [
      'Concevoir un workflow Git en équipe',
      'Automatiser le cycle test → build → deploy',
      'Mesurer la qualité du code (coverage, complexity)',
    ],
  },

  /* ─── Management — 3 templates ─── */
  {
    title: 'Business plan pour startup tech algérienne',
    description: 'Plan d\'affaires complet pour une startup imaginée dans l\'écosystème algérien.',
    enonce: 'Imaginer et structurer le business plan d\'une startup tech ancrée dans le contexte algérien (ex: marketplace artisanat, plateforme covoiturage local, app éducative). Inclure : étude de marché, modèle économique, projections financières 3 ans, stratégie GTM (go-to-market), analyse SWOT, plan de financement.',
    motsCles: ['Business plan', 'Startup', 'Stratégie', 'Finance', 'Marketing'],
    filiere: 'Management', type: 'groupe', level: 'L3', estimatedDurationWeeks: 8,
    phases: phasesManagement(),
    suggestedOutcomes: [
      'Construire un business plan structuré et chiffré',
      'Identifier les leviers de différenciation sur un marché concurrentiel',
      'Argumenter un pitch face à un investisseur fictif',
    ],
  },
  {
    title: 'Audit organisationnel d\'une PME',
    description: 'Analyse organisationnelle d\'une PME locale + recommandations.',
    enonce: 'Choisir une PME algérienne (réelle ou fictive) et conduire un audit organisationnel complet : organigramme, processus clés, points de friction, indicateurs RH, climat social. Proposer 3-5 recommandations concrètes priorisées par ROI/effort.',
    motsCles: ['Audit', 'Organisation', 'PME', 'Processus', 'RH'],
    filiere: 'Management', type: 'groupe', level: 'L3', estimatedDurationWeeks: 6,
    phases: phasesManagement(),
    suggestedOutcomes: [
      'Diagnostiquer une organisation via une grille structurée',
      'Hiérarchiser des recommandations selon des critères business',
    ],
  },
  {
    title: 'Stratégie de transformation digitale',
    description: 'Roadmap de digitalisation pour une entreprise en transition.',
    enonce: 'Concevoir une stratégie de transformation digitale sur 18 mois pour une entreprise traditionnelle (banque, assurance, distribution). Inclure : audit de maturité digitale, choix d\'outils (CRM, ERP, e-commerce), plan de change management, KPI de succès, budget estimatif.',
    motsCles: ['Digital', 'Stratégie', 'Change Management', 'CRM', 'ERP'],
    filiere: 'Management', type: 'groupe', level: 'L3', estimatedDurationWeeks: 8,
    phases: phasesManagement(),
    suggestedOutcomes: [
      'Évaluer la maturité digitale d\'une organisation',
      'Construire une roadmap multi-année réaliste',
      'Anticiper les résistances au changement',
    ],
  },

  /* ─── Finance — 3 templates ─── */
  {
    title: 'Analyse financière d\'une entreprise cotée',
    description: 'Analyse fondamentale complète d\'une entreprise cotée (Algérie ou international).',
    enonce: 'Sélectionner une entreprise cotée (Air Algérie, Sonatrach via offshore, ou international comme Apple) et conduire une analyse financière complète : ratios de rentabilité, liquidité, solvabilité, valorisation par DCF et multiples comparables. Recommandation finale : achat / conservation / vente.',
    motsCles: ['Analyse financière', 'Valorisation', 'DCF', 'Ratios', 'Investissement'],
    filiere: 'Finance', type: 'groupe', level: 'L3', estimatedDurationWeeks: 8,
    phases: phasesFinance(),
    suggestedOutcomes: [
      'Valoriser une entreprise par 2 méthodes complémentaires',
      'Argumenter une recommandation d\'investissement',
    ],
  },
  {
    title: 'Plan d\'investissement et étude de rentabilité',
    description: 'Étude de rentabilité d\'un projet d\'investissement industriel ou immobilier.',
    enonce: 'Pour un projet d\'investissement (extension usine, programme immobilier, parc photovoltaïque), produire un dossier complet : CAPEX/OPEX, scénarios de revenus, cash flows actualisés, VAN/TRI, analyse de sensibilité. Conclure sur la rentabilité et les conditions de viabilité.',
    motsCles: ['Investissement', 'VAN', 'TRI', 'Cash flows', 'Sensibilité'],
    filiere: 'Finance', type: 'groupe', level: 'L3', estimatedDurationWeeks: 6,
    phases: phasesFinance(),
    suggestedOutcomes: [
      'Calculer la rentabilité d\'un projet via VAN/TRI',
      'Conduire une analyse de sensibilité multi-paramètres',
    ],
  },
  {
    title: 'Étude de cas conformité et risques bancaires',
    description: 'Analyse de conformité réglementaire d\'une banque face à Bâle III.',
    enonce: 'Étudier la conformité d\'une banque (réelle ou fictive) aux exigences Bâle III : ratios de fonds propres, liquidité (LCR/NSFR), risques de crédit/marché/opérationnel. Identifier les écarts et proposer un plan de mise en conformité.',
    motsCles: ['Bâle III', 'Conformité', 'Risque', 'Banque', 'LCR'],
    filiere: 'Finance', type: 'groupe', level: 'L3', estimatedDurationWeeks: 8,
    phases: phasesFinance(),
    suggestedOutcomes: [
      'Cartographier les risques bancaires selon Bâle III',
      'Construire un plan de remédiation chiffré',
    ],
  },

  /* ─── PFE — 3 templates (un par filière) ─── */
  {
    title: 'PFE ISIL — Plateforme intelligente complète',
    description: 'Template PFE ISIL : 7 phases canon avec mémoire 50-80 pages.',
    enonce: 'Concevoir et implémenter une plateforme web intelligente complète intégrant des fonctionnalités IA (recommandation, NLP, prédiction). Le sujet précis sera défini avec l\'encadrant. Stack moderne (React/Node/MongoDB ou équivalent), déploiement cloud, mémoire académique 50-80 pages.',
    motsCles: ['PFE', 'IA', 'Web', 'Full-stack', 'Cloud'],
    filiere: 'ISIL', type: 'pfe', level: 'L3', estimatedDurationWeeks: 16,
    phases: phasesPFE7(),
    suggestedOutcomes: [
      'Mener un projet logiciel complet de A à Z',
      'Rédiger un mémoire académique conforme aux normes universitaires',
      'Soutenir publiquement face à un jury',
    ],
  },
  {
    title: 'PFE Management — Stratégie d\'entreprise sur cas réel',
    description: 'Template PFE Management : étude stratégique approfondie d\'une entreprise.',
    enonce: 'Conduire une mission de conseil stratégique pour une entreprise réelle (idéalement en stage). Diagnostic complet, analyse SWOT, recommandations stratégiques chiffrées, plan d\'implémentation. Mémoire 50-80 pages avec annexes.',
    motsCles: ['PFE', 'Stratégie', 'Conseil', 'SWOT', 'Diagnostic'],
    filiere: 'Management', type: 'pfe', level: 'L3', estimatedDurationWeeks: 16,
    phases: phasesPFE7(),
    suggestedOutcomes: [
      'Conduire un diagnostic stratégique sur cas réel',
      'Formuler des recommandations chiffrées et priorisées',
      'Mémoire académique défendable face à un jury',
    ],
  },
  {
    title: 'PFE Finance — Étude approfondie sur problématique financière',
    description: 'Template PFE Finance : analyse approfondie d\'une thématique financière.',
    enonce: 'Mener une recherche approfondie sur une problématique financière concrète (valorisation d\'une cible M&A, performance d\'un fonds, modélisation d\'un risque, étude d\'impact d\'une réforme). Méthodologie rigoureuse, données réelles, modélisation quantitative.',
    motsCles: ['PFE', 'Finance', 'Modélisation', 'Recherche', 'Quantitatif'],
    filiere: 'Finance', type: 'pfe', level: 'L3', estimatedDurationWeeks: 16,
    phases: phasesPFE7(),
    suggestedOutcomes: [
      'Conduire une recherche financière rigoureuse',
      'Modéliser quantitativement une problématique réelle',
      'Mémoire académique défendable face à un jury',
    ],
  },
];

/**
 * Insère les templates officiels en DB s'ils n'existent pas déjà
 * (idempotent par `title` + `source='official'`).
 *
 * @returns {Promise<{ created: number, skipped: number }>}
 */
export async function seedOfficialTemplates() {
  let created = 0;
  let skipped = 0;
  for (const t of TEMPLATES) {
    try {
      const exists = await ProjectTemplate.findOne({ title: t.title, source: 'official' }).lean();
      if (exists) { skipped++; continue; }
      await ProjectTemplate.create({
        ...t,
        rubric: t.rubric || RUBRIC_GENERIC,
        source: 'official',
        isPublic: true,
      });
      created++;
    } catch (err) {
      console.error(`[templatesSeed] échec pour "${t.title}":`, err.message);
    }
  }
  console.log(`[templatesSeed] ${created} templates créés, ${skipped} déjà existants`);
  return { created, skipped };
}

export default { seedOfficialTemplates, TEMPLATES };
