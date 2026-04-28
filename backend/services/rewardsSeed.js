import Reward from '../models/Reward.js';

/**
 * Catalogue de récompenses : uniquement de l'abonnement FlipLearn Premium.
 * L'utilisateur échange ses points (gagnés via l'usage de la plateforme et de ses agents IA)
 * contre des mois d'abonnement débloquant les fonctionnalités IA premium.
 *
 * Note PFE : seul type de récompense tenable juridiquement à ce stade — pas de cadeaux
 * physiques, pas de codes promo partenaires, pas de certifications externes (cf. mémoire
 * chap. 7.4 — perspectives d'évolution une fois la structure juridique en place).
 *
 * Seed idempotent : n'écrase pas les rewards existants (match par titre).
 */
const REWARDS_SEED = [
  {
    titre: '1 mois FlipLearn Premium',
    description: 'Débloque pendant 30 jours l\'usage illimité des agents IA : assistant module, génération QCM IA, analyse vidéo automatisée.',
    type: 'abonnement_fliplearn',
    dureeMois: 1,
    pointsRequired: 500,
    emoji: '⭐',
    highlight: true,
    stock: -1,
  },
  {
    titre: '3 mois FlipLearn Premium',
    description: 'Trois mois d\'accès illimité aux fonctionnalités IA premium. Idéal pour préparer un semestre.',
    type: 'abonnement_fliplearn',
    dureeMois: 3,
    pointsRequired: 1300,
    emoji: '🌟',
    stock: -1,
  },
  {
    titre: '6 mois FlipLearn Premium',
    description: 'Demi-année complète d\'accès illimité aux agents IA et aux fonctionnalités avancées.',
    type: 'abonnement_fliplearn',
    dureeMois: 6,
    pointsRequired: 2400,
    emoji: '💫',
    stock: -1,
  },
  {
    titre: '1 an FlipLearn Premium',
    description: 'Une année complète d\'accès illimité. Récompense exclusive pour les top contributeurs.',
    type: 'abonnement_fliplearn',
    dureeMois: 12,
    pointsRequired: 4500,
    emoji: '👑',
    highlight: true,
    stock: 20,
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
  console.log(`[seed] ${REWARDS_SEED.length} récompenses (abonnement FlipLearn) vérifiées.`);
}
