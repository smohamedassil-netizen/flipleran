/**
 * contentSeed.js — Seed de contenu démo (3 filières × 3 niveaux × 3 cours).
 *
 * URLs vidéos : Google Cloud sample videos (commondatastorage.googleapis.com)
 * — ce sont des vidéos publiques stables, utilisées par Google comme
 * exemples. Elles marchent directement dans <video src="..."> HTML5.
 * L'utilisateur peut les remplacer par ses propres uploads Cloudinary ou
 * vidéos YouTube plus tard via l'UI prof.
 *
 * Le seed gère 2 cas :
 *   - Cours/vidéo inexistant : création complète
 *   - Vidéo existante avec provider=youtube (ancien seed) : UPDATE vers mp4 direct
 *
 * Désactivable : SEED_CONTENT=false dans .env
 */

import User from '../models/User.js';
import Course from '../models/Course.js';
import Video from '../models/Video.js';

// Pool de vidéos sample Google Cloud (stables depuis 2014+)
const GOOGLE_SAMPLE_VIDEOS = [
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',        duration: 596, thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',      duration: 653, thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',     duration: 15,  thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',    duration: 15,  thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',        duration: 60,  thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',   duration: 15,  thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',  duration: 15,  thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerMeltdowns.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',              duration: 888, thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', duration: 594, thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/SubaruOutbackOnStreetAndDirt.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',        duration: 734, thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4', duration: 15,  thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/VolkswagenGTIReview.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4', duration: 47,  thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/WeAreGoingOnBullrun.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4', duration: 15, thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/WhatCarCanYouGetForAGrand.jpg' },
];

// Attribue une vidéo sample à chaque entrée (répartition cyclique sur le pool)
let sampleIdx = 0;
const nextSample = () => {
  const s = GOOGLE_SAMPLE_VIDEOS[sampleIdx % GOOGLE_SAMPLE_VIDEOS.length];
  sampleIdx++;
  return s;
};

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
          { titre: 'Qu\'est-ce qu\'un algorithme ?',     description: "Définition, premier exemple, pseudocode.", chapters: [
            { title: 'Définition', timestamp: 0 }, { title: 'Premier exemple', timestamp: 180 }, { title: 'Pseudocode', timestamp: 420 },
          ]},
          { titre: 'Les variables et types de données', description: "Déclaration de variables et types primitifs.", chapters: [
            { title: 'Déclaration', timestamp: 0 }, { title: 'Types primitifs', timestamp: 240 },
          ]},
          { titre: 'Boucles et conditions',             description: "if/else, for et while expliqués avec exemples.", chapters: [
            { title: 'Les conditions if/else', timestamp: 0 }, { title: 'Boucle for', timestamp: 280 }, { title: 'Boucle while', timestamp: 500 },
          ]},
        ],
      },
      {
        titre: 'Bases de Python',
        description: 'Découvre Python, syntaxe, types, fonctions.',
        aiPersona: { nom: 'Py-Bot', specialite: 'Python', avatar: '🐍', ton: 'fun', couleur: '#1B4F72' },
        videos: [
          { titre: 'Installer Python + 1er script', description: 'Installation et Hello World.', chapters: [{ title: 'Installation', timestamp: 0 }, { title: 'Hello World', timestamp: 240 }] },
          { titre: 'Types et opérations', description: 'Types primitifs et opérations de base.' },
          { titre: 'Fonctions Python', description: 'Définir et utiliser des fonctions.', chapters: [{ title: 'Définir', timestamp: 0 }, { title: 'Arguments', timestamp: 240 }] },
        ],
      },
      {
        titre: 'Mathématiques pour l\'informatique',
        description: 'Logique, arithmétique, ensembles, théorie des graphes.',
        aiPersona: { nom: 'Math-Bot', specialite: 'Mathématiques discrètes', avatar: '🧮', ton: 'pedagogue', couleur: '#1B4F72' },
        videos: [
          { titre: 'Logique des propositions', description: 'Introduction à la logique mathématique.' },
          { titre: 'Théorie des ensembles', description: 'Les bases de la théorie des ensembles.' },
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
          { titre: 'Listes chaînées', description: "Introduction aux listes simplement et doublement chaînées." },
          { titre: 'Piles et files', description: 'Pile LIFO, File FIFO et cas d\'usage.' },
          { titre: 'Arbres binaires', description: "Arbres binaires, parcours et arbre binaire de recherche." },
        ],
      },
      {
        titre: 'POO en Java',
        description: 'Classes, objets, héritage, polymorphisme.',
        aiPersona: { nom: 'Java-Bot', specialite: 'Java POO', avatar: '☕', ton: 'pedagogue', couleur: '#1B4F72' },
        videos: [
          { titre: 'Classes et objets', description: "Encapsulation, méthodes, constructeurs." },
          { titre: 'Héritage en Java', description: "extends, super, polymorphisme." },
        ],
      },
      {
        titre: 'Bases de données SQL',
        description: 'Modèle relationnel, SQL, MySQL.',
        aiPersona: { nom: 'SQL-Bot', specialite: 'Bases de données relationnelles', avatar: '🗄️', ton: 'expert', couleur: '#1B4F72' },
        videos: [
          { titre: 'Introduction SQL', description: "CREATE, INSERT, requêtes de base." },
          { titre: 'SELECT, JOIN, WHERE', description: "Requêtes avancées avec jointures." },
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
          { titre: 'HTML & CSS essentiels', description: 'Structure, balises, sélecteurs, Flexbox.' },
          { titre: 'JavaScript moderne', description: "ES6+, arrow functions, async/await." },
          { titre: 'Introduction à React', description: "Composants, JSX, hooks useState/useEffect." },
        ],
      },
      {
        titre: 'Intelligence Artificielle & Machine Learning',
        description: 'Concepts IA, ML, réseaux de neurones, NLP.',
        aiPersona: { nom: 'IA-Bot', specialite: 'Intelligence Artificielle', avatar: '🤖', ton: 'expert', couleur: '#1B4F72' },
        videos: [
          { titre: 'Qu\'est-ce que le ML ?', description: 'Définition, supervisé vs non supervisé, exemples.' },
          { titre: 'Régression linéaire expliquée', description: 'Intuition, moindres carrés, applications.' },
          { titre: 'Introduction aux réseaux de neurones', description: 'Neurone artificiel, perceptron, backpropagation.' },
        ],
      },
      {
        titre: 'Cybersécurité',
        description: 'Fondamentaux, attaques courantes, défense.',
        aiPersona: { nom: 'Cyber-Bot', specialite: 'Cybersécurité', avatar: '🛡️', ton: 'strict', couleur: '#1B4F72' },
        videos: [
          { titre: 'Les bases de la cybersécurité', description: 'Triade CIA, authentification, chiffrement.' },
          { titre: 'Attaques par phishing', description: 'Types d\'attaques, comment les éviter.' },
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
          { titre: 'Les 4 fonctions du management', description: 'Planifier, organiser, diriger, contrôler.' },
          { titre: 'Théories classiques (Taylor, Fayol)', description: 'OST, administration scientifique, 14 principes.' },
        ],
      },
      {
        titre: 'Économie générale',
        description: 'Micro & macro, marché, inflation, chômage.',
        aiPersona: { nom: 'Eco-Bot', specialite: 'Économie', avatar: '📈', ton: 'pedagogue', couleur: '#D97706' },
        videos: [
          { titre: 'Offre et demande', description: 'Mécanismes du marché expliqués.' },
          { titre: 'Inflation et chômage', description: 'Courbe de Phillips et politiques économiques.' },
        ],
      },
      {
        titre: 'Marketing fondamentaux',
        description: 'Les 4P, segmentation, positionnement, étude de marché.',
        aiPersona: { nom: 'Market-Bot', specialite: 'Marketing', avatar: '🎯', ton: 'fun', couleur: '#D97706' },
        videos: [
          { titre: 'Les 4P du marketing', description: 'Produit, Prix, Place, Promotion.' },
          { titre: 'Segmentation client', description: "Critères et méthodes de segmentation." },
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
          { titre: 'Analyse SWOT', description: 'Forces, faiblesses, opportunités, menaces.' },
          { titre: 'Les 5 forces de Porter', description: 'Framework d\'analyse concurrentielle.' },
        ],
      },
      {
        titre: 'Gestion des ressources humaines',
        description: 'Recrutement, motivation, évaluation, leadership.',
        aiPersona: { nom: 'RH-Bot', specialite: 'Ressources Humaines', avatar: '👥', ton: 'pedagogue', couleur: '#D97706' },
        videos: [
          { titre: 'La pyramide de Maslow', description: 'Hiérarchie des besoins humains.' },
          { titre: 'Styles de leadership', description: 'Autoritaire, participatif, délégatif.' },
        ],
      },
      {
        titre: 'Droit des affaires',
        description: 'Formes juridiques, contrats commerciaux.',
        aiPersona: { nom: 'Droit-Bot', specialite: 'Droit des affaires', avatar: '⚖️', ton: 'strict', couleur: '#D97706' },
        videos: [
          { titre: 'SARL vs SA en Algérie', description: 'Comparaison des formes juridiques.' },
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
          { titre: 'Introduction à Scrum', description: 'Rôles, events, artefacts.' },
          { titre: 'Diagramme de Gantt', description: 'Planification visuelle de projet.' },
        ],
      },
      {
        titre: 'Entrepreneuriat',
        description: 'Créer une startup, business model, pitch.',
        aiPersona: { nom: 'Entrepreneur-Bot', specialite: 'Entrepreneuriat', avatar: '🚀', ton: 'fun', couleur: '#D97706' },
        videos: [
          { titre: 'Business Model Canvas', description: "Les 9 blocs du BMC." },
          { titre: 'Pitcher son projet', description: "Structure d'un pitch efficace." },
        ],
      },
      {
        titre: 'Stratégie digitale',
        description: 'Marketing digital, SEO, réseaux sociaux.',
        aiPersona: { nom: 'Digital-Bot', specialite: 'Marketing digital', avatar: '💻', ton: 'fun', couleur: '#D97706' },
        videos: [
          { titre: 'SEO : les bases', description: "Référencement naturel expliqué." },
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
          { titre: 'Le bilan comptable expliqué', description: 'Actif, passif, capitaux propres.' },
          { titre: 'Comptes d\'actif et de passif', description: 'Mécanique comptable des écritures.' },
        ],
      },
      {
        titre: 'Mathématiques financières',
        description: 'Intérêts, capitalisation, actualisation.',
        aiPersona: { nom: 'MathFin-Bot', specialite: 'Math financières', avatar: '📐', ton: 'expert', couleur: '#059669' },
        videos: [
          { titre: 'Intérêts simples vs composés', description: 'Formules et comparaison.' },
          { titre: 'Actualisation et VAN', description: 'Valeur actuelle nette, critères d\'investissement.' },
        ],
      },
      {
        titre: 'Introduction à la finance',
        description: 'Marchés, rendement, risque.',
        aiPersona: { nom: 'Finance-Bot', specialite: 'Finance générale', avatar: '💰', ton: 'pedagogue', couleur: '#059669' },
        videos: [
          { titre: 'Qu\'est-ce que la bourse ?', description: 'Fonctionnement des marchés financiers.' },
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
          { titre: 'Les ratios de liquidité', description: 'Liquidité générale, réduite, immédiate.' },
          { titre: 'Le fonds de roulement', description: 'FR, BFR, trésorerie nette.' },
        ],
      },
      {
        titre: 'Comptabilité analytique',
        description: 'Coûts, méthodes ABC, seuil de rentabilité.',
        aiPersona: { nom: 'Cout-Bot', specialite: 'Comptabilité analytique', avatar: '🧾', ton: 'pedagogue', couleur: '#059669' },
        videos: [
          { titre: 'Coûts fixes vs variables', description: 'Classification et décisions associées.' },
          { titre: 'Méthode ABC', description: 'Activity-Based Costing.' },
        ],
      },
      {
        titre: 'Contrôle de gestion',
        description: 'Budget, tableaux de bord, KPI.',
        aiPersona: { nom: 'Control-Bot', specialite: 'Contrôle de gestion', avatar: '📊', ton: 'strict', couleur: '#059669' },
        videos: [
          { titre: 'Construire un budget', description: "Budget prévisionnel, analyse des écarts." },
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
          { titre: 'Introduction à l\'audit', description: "Normes, étapes, certification." },
          { titre: 'Cartographie des risques', description: "Identification et évaluation des risques." },
        ],
      },
      {
        titre: 'Finance internationale',
        description: 'Change, risques, couverture, IFRS.',
        aiPersona: { nom: 'FinInt-Bot', specialite: 'Finance internationale', avatar: '🌍', ton: 'expert', couleur: '#059669' },
        videos: [
          { titre: 'Les marchés de change (FOREX)', description: "Cotations, parités, volatilité." },
          { titre: 'Les normes IFRS', description: "International Financial Reporting Standards." },
        ],
      },
      {
        titre: 'Finance de marché',
        description: 'Actions, obligations, dérivés, portefeuille.',
        aiPersona: { nom: 'Market-Fin-Bot', specialite: 'Finance de marché', avatar: '💹', ton: 'expert', couleur: '#059669' },
        videos: [
          { titre: 'Comment évaluer une action ?', description: "Méthodes DCF, multiples, comparables." },
          { titre: 'Les options expliquées', description: "Call, Put, Payoff, Black-Scholes." },
        ],
      },
    ],
  },
];

export async function seedDemoContent() {
  const fallbackProf = await User.findOne({ role: 'professeur', status: { $ne: 'rejected' } });
  if (!fallbackProf) {
    console.warn('[contentSeed] Aucun professeur trouvé — seed skip.');
    return { coursesCreated: 0, videosCreated: 0 };
  }

  // Cache des profs par filière pour assignation cohérente
  const profByFiliere = {};
  async function getProfFor(filiere) {
    if (profByFiliere[filiere]) return profByFiliere[filiere];
    const p = await User.findOne({ role: 'professeur', filiere, status: { $ne: 'rejected' } });
    profByFiliere[filiere] = p || fallbackProf;
    return profByFiliere[filiere];
  }

  sampleIdx = 0; // reset le cursor à chaque seed pour répartition stable
  let coursesCreated = 0;
  let videosCreated = 0;
  let videosUpdated = 0;
  let skipped = 0;

  for (const bloc of CURRICULUM) {
    const prof = await getProfFor(bloc.filiere);
    for (const courseData of bloc.cours) {
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
          professorId: prof._id,
          aiPersona:   courseData.aiPersona || {},
          isActive:    true,
        });
        coursesCreated++;
      } else if (!course.aiPersona?.nom && courseData.aiPersona) {
        course.aiPersona = courseData.aiPersona;
        await course.save();
      }

      for (let i = 0; i < courseData.videos.length; i++) {
        const v = courseData.videos[i];
        const sample = nextSample();

        const existing = await Video.findOne({ courseId: course._id, titre: v.titre });

        if (existing) {
          // Ancienne vidéo YouTube → on la convertit en direct mp4 Google sample
          if (existing.provider === 'youtube' || !existing.url?.includes('commondatastorage')) {
            existing.provider = 'cloudinary';
            existing.url = sample.url;
            existing.thumbnailUrl = sample.thumb;
            existing.duration = sample.duration;
            existing.youtubeId = '';
            existing.description = v.description || existing.description;
            if (v.chapters) existing.chapters = v.chapters;
            await existing.save();
            videosUpdated++;
          } else {
            skipped++;
          }
          continue;
        }

        await Video.create({
          titre:        v.titre,
          description:  v.description || '',
          provider:     'cloudinary', // URL mp4 directe — lue par le <video> HTML5
          url:          sample.url,
          thumbnailUrl: sample.thumb,
          duration:     sample.duration,
          order:        i,
          chapters:     v.chapters || [],
          courseId:     course._id,
          createdBy:    prof._id,
        });
        videosCreated++;
      }
    }
  }

  console.log(`[contentSeed] ${coursesCreated} cours créés, ${videosCreated} vidéos ajoutées, ${videosUpdated} vidéos mises à jour (YouTube → mp4), ${skipped} inchangées.`);
  return { coursesCreated, videosCreated, videosUpdated, skipped };
}
