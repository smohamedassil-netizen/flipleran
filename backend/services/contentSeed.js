/**
 * contentSeed.js — Seed de contenu démo (3 filières × 3 niveaux × 3 cours).
 *
 * Ce script est IDEMPOTENT (ne duplique pas) : il utilise findOneAndUpdate
 * avec upsert sur les clés naturelles (titre+filiere+promotion).
 *
 * Lancer manuellement : node -e "import('./backend/services/contentSeed.js').then(m => m.seedDemoContent())"
 * Ou appelé au boot du server si SEED_CONTENT=true dans l'env.
 *
 * Les IDs YouTube sont des exemples — remplace-les via l'UI prof si besoin.
 * Le site affichera "Video unavailable" pour les IDs invalides, sans casser l'app.
 */

import User from '../models/User.js';
import Course from '../models/Course.js';
import Video from '../models/Video.js';
import QCM from '../models/QCM.js';

const CURRICULUM = [
  // ════════ ISIL ════════
  {
    filiere: 'ISIL', promotion: 'L1',
    cours: [
      {
        titre: 'Algorithmique & Programmation',
        description: 'Introduction aux algorithmes, variables, boucles et fonctions.',
        aiPersona: { nom: 'Algo-Bot', specialite: 'Algorithmique', avatar: '🧠', ton: 'pedagogue', couleur: '#1B4F72' },
        videos: [
          { titre: 'Qu\'est-ce qu\'un algorithme ?', ytId: '8QldZSvR4Mk', duration: 720, chapters: [
            { title: 'Définition', timestamp: 0 },
            { title: 'Premier exemple', timestamp: 180 },
            { title: 'Pseudocode', timestamp: 420 },
          ]},
          { titre: 'Les variables et types de données', ytId: '_uQrJ0TkZlc', duration: 600, chapters: [
            { title: 'Déclaration', timestamp: 0 },
            { title: 'Types primitifs', timestamp: 240 },
          ]},
          { titre: 'Boucles et conditions', ytId: 'Ej_02ICOIgs', duration: 780, chapters: [
            { title: 'Les conditions if/else', timestamp: 0 },
            { title: 'Boucle for', timestamp: 280 },
            { title: 'Boucle while', timestamp: 500 },
          ]},
        ],
      },
      {
        titre: 'Bases de Python',
        description: 'Découvre Python, syntaxe, types, fonctions.',
        aiPersona: { nom: 'Py-Bot', specialite: 'Python', avatar: '🐍', ton: 'fun', couleur: '#1B4F72' },
        videos: [
          { titre: 'Installer Python + 1er script', ytId: 'Tb4GiTQPKBg', duration: 540, chapters: [
            { title: 'Installation', timestamp: 0 }, { title: 'Hello World', timestamp: 240 },
          ]},
          { titre: 'Types et opérations', ytId: 'hEgO047GxaQ', duration: 660, chapters: [] },
          { titre: 'Fonctions Python', ytId: 'eipG0kOlzv0', duration: 720, chapters: [
            { title: 'Définir', timestamp: 0 }, { title: 'Arguments', timestamp: 240 },
          ]},
        ],
      },
      {
        titre: 'Mathématiques pour l\'informatique',
        description: 'Logique, arithmétique, ensembles, théorie des graphes.',
        aiPersona: { nom: 'Math-Bot', specialite: 'Mathématiques discrètes', avatar: '🧮', ton: 'pedagogue', couleur: '#1B4F72' },
        videos: [
          { titre: 'Logique des propositions', ytId: 'e_Kb6AtPl4o', duration: 900, chapters: [] },
          { titre: 'Théorie des ensembles', ytId: 'Mv2hQphvWXk', duration: 720, chapters: [] },
        ],
      },
    ],
  },
  {
    filiere: 'ISIL', promotion: 'L2',
    cours: [
      {
        titre: 'Structures de données',
        description: 'Listes chaînées, piles, files, arbres, graphes.',
        aiPersona: { nom: 'Struct-Bot', specialite: 'Structures de données', avatar: '🌲', ton: 'strict', couleur: '#1B4F72' },
        videos: [
          { titre: 'Listes chaînées', ytId: 'R9PTBwOzceo', duration: 840, chapters: [] },
          { titre: 'Piles et files', ytId: 'A4UShc-XL4o', duration: 720, chapters: [] },
          { titre: 'Arbres binaires', ytId: 'oSWTXtMglKE', duration: 960, chapters: [] },
        ],
      },
      {
        titre: 'POO en Java',
        description: 'Classes, objets, héritage, polymorphisme.',
        aiPersona: { nom: 'Java-Bot', specialite: 'Java POO', avatar: '☕', ton: 'pedagogue', couleur: '#1B4F72' },
        videos: [
          { titre: 'Classes et objets', ytId: 'grEKMHGYyns', duration: 600, chapters: [] },
          { titre: 'Héritage en Java', ytId: 'c3gPZkqxRbg', duration: 780, chapters: [] },
        ],
      },
      {
        titre: 'Bases de données SQL',
        description: 'Modèle relationnel, SQL, MySQL.',
        aiPersona: { nom: 'SQL-Bot', specialite: 'Bases de données relationnelles', avatar: '🗄️', ton: 'expert', couleur: '#1B4F72' },
        videos: [
          { titre: 'Introduction SQL', ytId: 'HXV3zeQKqGY', duration: 840, chapters: [] },
          { titre: 'SELECT, JOIN, WHERE', ytId: 'p3qvj9hO_Bo', duration: 900, chapters: [] },
        ],
      },
    ],
  },
  {
    filiere: 'ISIL', promotion: 'L3',
    cours: [
      {
        titre: 'Développement Web Full-Stack',
        description: 'HTML/CSS/JS, React, Node.js, API REST.',
        aiPersona: { nom: 'Web-Bot', specialite: 'Développement Web', avatar: '🌐', ton: 'fun', couleur: '#1B4F72' },
        videos: [
          { titre: 'HTML & CSS essentiels', ytId: 'ok-plXXHlWw', duration: 900, chapters: [] },
          { titre: 'JavaScript moderne', ytId: 'W6NZfCO5SIk', duration: 1200, chapters: [] },
          { titre: 'Introduction à React', ytId: 'Tn6-PIqc4UM', duration: 1080, chapters: [] },
        ],
      },
      {
        titre: 'Intelligence Artificielle & Machine Learning',
        description: 'Concepts IA, ML, réseaux de neurones, NLP.',
        aiPersona: { nom: 'IA-Bot', specialite: 'Intelligence Artificielle', avatar: '🤖', ton: 'expert', couleur: '#1B4F72' },
        videos: [
          { titre: 'Qu\'est-ce que le ML ?', ytId: 'ukzFI9rgwfU', duration: 720, chapters: [] },
          { titre: 'Régression linéaire expliquée', ytId: 'nk2CQITm_eo', duration: 600, chapters: [] },
          { titre: 'Introduction aux réseaux de neurones', ytId: 'aircAruvnKk', duration: 1200, chapters: [] },
        ],
      },
      {
        titre: 'Cybersécurité',
        description: 'Fondamentaux, attaques courantes, défense.',
        aiPersona: { nom: 'Cyber-Bot', specialite: 'Cybersécurité', avatar: '🛡️', ton: 'strict', couleur: '#1B4F72' },
        videos: [
          { titre: 'Les bases de la cybersécurité', ytId: 'inWWhr5tnIA', duration: 900, chapters: [] },
          { titre: 'Attaques par phishing', ytId: 'GC52vWNY5fg', duration: 600, chapters: [] },
        ],
      },
    ],
  },
  // ════════ MANAGEMENT ════════
  {
    filiere: 'Management', promotion: 'L1',
    cours: [
      {
        titre: 'Introduction au Management',
        description: 'Rôles du manager, théories classiques, fonctions.',
        aiPersona: { nom: 'Manage-Bot', specialite: 'Management général', avatar: '💼', ton: 'pedagogue', couleur: '#D97706' },
        videos: [
          { titre: 'Les 4 fonctions du management', ytId: 'VgqUUV6WVLA', duration: 720, chapters: [] },
          { titre: 'Théories classiques (Taylor, Fayol)', ytId: 'BmGyVXLuggA', duration: 840, chapters: [] },
        ],
      },
      {
        titre: 'Économie générale',
        description: 'Micro & macro, marché, inflation, chômage.',
        aiPersona: { nom: 'Eco-Bot', specialite: 'Économie', avatar: '📈', ton: 'pedagogue', couleur: '#D97706' },
        videos: [
          { titre: 'Offre et demande', ytId: 'YgdkUSwcr8M', duration: 600, chapters: [] },
          { titre: 'Inflation et chômage', ytId: 'fZG6mBO-C2U', duration: 720, chapters: [] },
        ],
      },
      {
        titre: 'Marketing fondamentaux',
        description: 'Les 4P, segmentation, positionnement, étude de marché.',
        aiPersona: { nom: 'Market-Bot', specialite: 'Marketing', avatar: '🎯', ton: 'fun', couleur: '#D97706' },
        videos: [
          { titre: 'Les 4P du marketing', ytId: '8aaRPL4UOHo', duration: 540, chapters: [] },
          { titre: 'Segmentation client', ytId: 'oLx9oBN-mYI', duration: 600, chapters: [] },
        ],
      },
    ],
  },
  {
    filiere: 'Management', promotion: 'L2',
    cours: [
      {
        titre: 'Management stratégique',
        description: 'SWOT, Porter, BCG, stratégies génériques.',
        aiPersona: { nom: 'Strategy-Bot', specialite: 'Stratégie d\'entreprise', avatar: '♟️', ton: 'expert', couleur: '#D97706' },
        videos: [
          { titre: 'Analyse SWOT', ytId: 'mR9eICQJLXA', duration: 540, chapters: [] },
          { titre: 'Les 5 forces de Porter', ytId: 'mYF2_FBCvXw', duration: 720, chapters: [] },
        ],
      },
      {
        titre: 'Gestion des ressources humaines',
        description: 'Recrutement, motivation, évaluation, leadership.',
        aiPersona: { nom: 'RH-Bot', specialite: 'Ressources Humaines', avatar: '👥', ton: 'pedagogue', couleur: '#D97706' },
        videos: [
          { titre: 'La pyramide de Maslow', ytId: '9hn0PkiPAQU', duration: 480, chapters: [] },
          { titre: 'Styles de leadership', ytId: 'pMe3q-_HtBY', duration: 660, chapters: [] },
        ],
      },
      {
        titre: 'Droit des affaires',
        description: 'Formes juridiques, contrats commerciaux.',
        aiPersona: { nom: 'Droit-Bot', specialite: 'Droit des affaires', avatar: '⚖️', ton: 'strict', couleur: '#D97706' },
        videos: [
          { titre: 'SARL vs SA en Algérie', ytId: 'ki_mZlY8ChQ', duration: 780, chapters: [] },
        ],
      },
    ],
  },
  {
    filiere: 'Management', promotion: 'L3',
    cours: [
      {
        titre: 'Management de projet',
        description: 'Gestion d\'équipe, PERT, Gantt, agilité.',
        aiPersona: { nom: 'PM-Bot', specialite: 'Management de projet', avatar: '📊', ton: 'pedagogue', couleur: '#D97706' },
        videos: [
          { titre: 'Introduction à Scrum', ytId: '2Vt7Ik8Ublw', duration: 720, chapters: [] },
          { titre: 'Diagramme de Gantt', ytId: 'yhmRoKlQCoE', duration: 540, chapters: [] },
        ],
      },
      {
        titre: 'Entrepreneuriat',
        description: 'Créer une startup, business model, pitch.',
        aiPersona: { nom: 'Entrepreneur-Bot', specialite: 'Entrepreneuriat', avatar: '🚀', ton: 'fun', couleur: '#D97706' },
        videos: [
          { titre: 'Business Model Canvas', ytId: 'QoAOzMTLP5s', duration: 720, chapters: [] },
          { titre: 'Pitcher son projet', ytId: 'i6O98o2FRHw', duration: 540, chapters: [] },
        ],
      },
      {
        titre: 'Stratégie digitale',
        description: 'Marketing digital, SEO, réseaux sociaux.',
        aiPersona: { nom: 'Digital-Bot', specialite: 'Marketing digital', avatar: '💻', ton: 'fun', couleur: '#D97706' },
        videos: [
          { titre: 'SEO : les bases', ytId: 'DvwS7cV9GmQ', duration: 900, chapters: [] },
        ],
      },
    ],
  },
  // ════════ FINANCE & COMPTABILITÉ ════════
  {
    filiere: 'Finance & Comptabilité', promotion: 'L1',
    cours: [
      {
        titre: 'Comptabilité générale',
        description: 'Plan comptable, journal, bilan, compte de résultat.',
        aiPersona: { nom: 'Compta-Bot', specialite: 'Comptabilité générale', avatar: '📒', ton: 'pedagogue', couleur: '#059669' },
        videos: [
          { titre: 'Le bilan comptable expliqué', ytId: 'kwsuAWgB8wU', duration: 840, chapters: [] },
          { titre: 'Comptes d\'actif et de passif', ytId: 'dt7H6DU88oU', duration: 720, chapters: [] },
        ],
      },
      {
        titre: 'Mathématiques financières',
        description: 'Intérêts, capitalisation, actualisation.',
        aiPersona: { nom: 'MathFin-Bot', specialite: 'Math financières', avatar: '📐', ton: 'expert', couleur: '#059669' },
        videos: [
          { titre: 'Intérêts simples vs composés', ytId: 'EefR-A7ZoD0', duration: 600, chapters: [] },
          { titre: 'Actualisation et VAN', ytId: 'rNK8fbFGf_Q', duration: 720, chapters: [] },
        ],
      },
      {
        titre: 'Introduction à la finance',
        description: 'Marchés, rendement, risque.',
        aiPersona: { nom: 'Finance-Bot', specialite: 'Finance générale', avatar: '💰', ton: 'pedagogue', couleur: '#059669' },
        videos: [
          { titre: 'Qu\'est-ce que la bourse ?', ytId: 'p7HKvqRI_Bo', duration: 900, chapters: [] },
        ],
      },
    ],
  },
  {
    filiere: 'Finance & Comptabilité', promotion: 'L2',
    cours: [
      {
        titre: 'Analyse financière',
        description: 'Ratios, analyse du bilan, diagnostic financier.',
        aiPersona: { nom: 'Analyse-Bot', specialite: 'Analyse financière', avatar: '🔍', ton: 'expert', couleur: '#059669' },
        videos: [
          { titre: 'Les ratios de liquidité', ytId: 'ZcJY0SQCZ3g', duration: 600, chapters: [] },
          { titre: 'Le fonds de roulement', ytId: 'xAkccZ5htvU', duration: 540, chapters: [] },
        ],
      },
      {
        titre: 'Comptabilité analytique',
        description: 'Coûts, méthodes ABC, seuil de rentabilité.',
        aiPersona: { nom: 'Cout-Bot', specialite: 'Comptabilité analytique', avatar: '🧾', ton: 'pedagogue', couleur: '#059669' },
        videos: [
          { titre: 'Coûts fixes vs variables', ytId: 'OoXF-OnbTz4', duration: 540, chapters: [] },
          { titre: 'Méthode ABC', ytId: 'WyWkHp0g1Hc', duration: 720, chapters: [] },
        ],
      },
      {
        titre: 'Contrôle de gestion',
        description: 'Budget, tableaux de bord, KPI.',
        aiPersona: { nom: 'Control-Bot', specialite: 'Contrôle de gestion', avatar: '📊', ton: 'strict', couleur: '#059669' },
        videos: [
          { titre: 'Construire un budget', ytId: 'yPWHBmV3SAg', duration: 720, chapters: [] },
        ],
      },
    ],
  },
  {
    filiere: 'Finance & Comptabilité', promotion: 'L3',
    cours: [
      {
        titre: 'Audit financier',
        description: 'Démarche d\'audit, risques, rapport.',
        aiPersona: { nom: 'Audit-Bot', specialite: 'Audit financier', avatar: '✅', ton: 'strict', couleur: '#059669' },
        videos: [
          { titre: 'Introduction à l\'audit', ytId: 'LQ0GX2vbDFA', duration: 840, chapters: [] },
          { titre: 'Cartographie des risques', ytId: 'Omi1_y8M7Jk', duration: 660, chapters: [] },
        ],
      },
      {
        titre: 'Finance internationale',
        description: 'Change, risques, couverture, IFRS.',
        aiPersona: { nom: 'FinInt-Bot', specialite: 'Finance internationale', avatar: '🌍', ton: 'expert', couleur: '#059669' },
        videos: [
          { titre: 'Les marchés de change (FOREX)', ytId: 'sD9TZkzvgQQ', duration: 720, chapters: [] },
          { titre: 'Les normes IFRS', ytId: 'pZyPJl7AUeA', duration: 840, chapters: [] },
        ],
      },
      {
        titre: 'Finance de marché',
        description: 'Actions, obligations, dérivés, portefeuille.',
        aiPersona: { nom: 'Market-Fin-Bot', specialite: 'Finance de marché', avatar: '💹', ton: 'expert', couleur: '#059669' },
        videos: [
          { titre: 'Comment évaluer une action ?', ytId: 'dbCx-KzMqAg', duration: 900, chapters: [] },
          { titre: 'Les options expliquées', ytId: 'SuTXjvNOcFE', duration: 600, chapters: [] },
        ],
      },
    ],
  },
];

export async function seedDemoContent() {
  // Trouver un prof par filière — ou le premier prof dispo sinon
  let professor = await User.findOne({ role: 'professeur', status: { $ne: 'rejected' } });
  if (!professor) {
    console.warn('[contentSeed] Aucun professeur trouvé. Impossible de seeder le contenu.');
    return { coursesCreated: 0, videosCreated: 0 };
  }

  let coursesCreated = 0;
  let videosCreated = 0;
  let skipped = 0;

  for (const bloc of CURRICULUM) {
    for (const courseData of bloc.cours) {
      // Idempotent : upsert du cours
      let course = await Course.findOne({
        titre: courseData.titre,
        filiere: bloc.filiere,
        promotion: bloc.promotion,
      });

      if (!course) {
        course = await Course.create({
          titre:       courseData.titre,
          description: courseData.description,
          filiere:     bloc.filiere,
          promotion:   bloc.promotion,
          professorId: professor._id,
          aiPersona:   courseData.aiPersona || {},
          isActive:    true,
        });
        coursesCreated++;
      } else if (!course.aiPersona?.nom && courseData.aiPersona) {
        course.aiPersona = courseData.aiPersona;
        await course.save();
      }

      // Vidéos du cours
      for (let i = 0; i < courseData.videos.length; i++) {
        const v = courseData.videos[i];
        const existing = await Video.findOne({ courseId: course._id, titre: v.titre });
        if (existing) { skipped++; continue; }

        await Video.create({
          titre:        v.titre,
          description:  v.description || '',
          provider:     'youtube',
          url:          `https://www.youtube.com/embed/${v.ytId}`,
          youtubeId:    v.ytId,
          thumbnailUrl: `https://i.ytimg.com/vi/${v.ytId}/hqdefault.jpg`,
          duration:     v.duration || 600,
          order:        i,
          chapters:     v.chapters || [],
          courseId:     course._id,
          createdBy:    professor._id,
        });
        videosCreated++;
      }
    }
  }

  console.log(`[contentSeed] ${coursesCreated} cours créés, ${videosCreated} vidéos ajoutées, ${skipped} vidéos déjà présentes.`);
  return { coursesCreated, videosCreated, skipped };
}
