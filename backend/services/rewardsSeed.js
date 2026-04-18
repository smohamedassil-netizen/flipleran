import Reward from '../models/Reward.js';

/**
 * Catalogue pré-rempli de récompenses concrètes.
 * Seed idempotent : n'écrase pas les rewards existants (match par titre).
 */
const REWARDS_SEED = [
  // === Certificats ===
  {
    titre: 'Certification Cybersécurité Fondamentale',
    description: 'Certificat attestant de tes connaissances en cybersécurité de base, délivré par FlipLearn x partenaire.',
    type: 'certificat',
    pointsRequired: 2000,
    emoji: '🛡️',
    sponsor: 'TryHackMe Academy',
    highlight: true,
    stock: -1,
  },
  {
    titre: 'Certificat "Full-Stack Developer"',
    description: 'Certificat officiel FlipLearn après validation de 3 modules web + projet. À mentionner sur ton CV.',
    type: 'certificat',
    pointsRequired: 3000,
    emoji: '💻',
    sponsor: 'FlipLearn Academy',
    stock: -1,
  },
  {
    titre: 'Certificat "Data Analyst Junior"',
    description: 'Valide tes compétences en analyse de données (SQL, Python, visualisation).',
    type: 'certificat',
    pointsRequired: 2500,
    emoji: '📊',
    sponsor: 'FlipLearn Academy',
    stock: -1,
  },
  // === Réductions ===
  {
    titre: '-20% sur TryHackMe Premium',
    description: 'Code promo -20% pour un abonnement Premium sur TryHackMe (plateforme de cybersécurité pratique).',
    type: 'reduction',
    pointsRequired: 800,
    emoji: '🎟️',
    sponsor: 'TryHackMe',
    stock: 50,
  },
  {
    titre: '-30% sur Udemy — cours Dev',
    description: 'Code promo -30% sur tout cours Udemy catégorie Développement (valable 3 mois).',
    type: 'reduction',
    pointsRequired: 600,
    emoji: '🏷️',
    sponsor: 'Udemy',
    stock: 100,
  },
  {
    titre: '-50% sur DataCamp (1 mois)',
    description: 'Demi-tarif sur ton premier mois DataCamp (bootcamps Data Science & SQL).',
    type: 'reduction',
    pointsRequired: 1200,
    emoji: '📉',
    sponsor: 'DataCamp',
    stock: 30,
  },
  // === Accès premium ===
  {
    titre: '1 mois FlipLearn Premium gratuit',
    description: 'Accès illimité aux fonctionnalités payantes FlipLearn pendant 30 jours : IA illimitée, cours exclusifs, badges premium.',
    type: 'premium',
    pointsRequired: 500,
    emoji: '⭐',
    sponsor: 'FlipLearn',
    highlight: true,
    stock: -1,
  },
  {
    titre: '3 mois FlipLearn Premium',
    description: 'Accès illimité pendant 3 mois. Pour les vrais warriors du classement.',
    type: 'premium',
    pointsRequired: 1500,
    emoji: '🌟',
    sponsor: 'FlipLearn',
    stock: -1,
  },
  // === Formations / Workshops ===
  {
    titre: 'Workshop "Cybersécurité Offensive"',
    description: 'Workshop en ligne de 4h sur les fondamentaux de l\'éthique hacking. Place gratuite réservée.',
    type: 'formation',
    pointsRequired: 1800,
    emoji: '🎓',
    sponsor: 'FlipLearn Events',
    stock: 10,
  },
  {
    titre: 'Bootcamp IA générative — 1 semaine',
    description: 'Inscription gratuite au bootcamp intensif IA générative (prompt engineering, RAG, agents).',
    type: 'formation',
    pointsRequired: 4000,
    emoji: '🤖',
    sponsor: 'FlipLearn Academy',
    highlight: true,
    stock: 5,
  },
  // === Cadeaux physiques ===
  {
    titre: 'T-shirt FlipLearn',
    description: 'T-shirt officiel FlipLearn, floqué avec ton nom et ton rang. Livraison Algérie.',
    type: 'cadeau',
    pointsRequired: 300,
    emoji: '👕',
    sponsor: 'FlipLearn Merch',
    stock: 200,
  },
  {
    titre: 'Mug FlipLearn collector',
    description: 'Mug en céramique gravé "Top Learner FlipLearn 2026".',
    type: 'cadeau',
    pointsRequired: 200,
    emoji: '☕',
    sponsor: 'FlipLearn Merch',
    stock: 300,
  },
  {
    titre: 'Sticker pack "Développeur"',
    description: 'Pack de 10 stickers vinyles résistants (logos langages, éditeurs, FlipLearn).',
    type: 'cadeau',
    pointsRequired: 100,
    emoji: '🏷️',
    sponsor: 'FlipLearn Merch',
    stock: 500,
  },
  {
    titre: 'Carnet FlipLearn + stylo',
    description: 'Carnet A5 100 pages lignées + stylo gravé. Parfait pour tes notes de cours.',
    type: 'cadeau',
    pointsRequired: 250,
    emoji: '📔',
    sponsor: 'FlipLearn Merch',
    stock: 150,
  },
  // === Bonus top classement ===
  {
    titre: 'Mention "Top 10 FlipLearn"',
    description: 'Ton profil mis en avant sur la landing page pendant 1 mois + badge spécial.',
    type: 'autre',
    pointsRequired: 5000,
    emoji: '🏆',
    sponsor: 'FlipLearn',
    highlight: true,
    stock: 10,
  },
];

export async function seedRewards() {
  for (const r of REWARDS_SEED) {
    await Reward.findOneAndUpdate(
      { titre: r.titre },
      { $setOnInsert: r },
      { upsert: true, new: true }
    );
  }
  console.log(`[seed] ${REWARDS_SEED.length} récompenses catalogue vérifiées.`);
}
