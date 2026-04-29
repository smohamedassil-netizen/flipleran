import Reward from '../models/Reward.js';

/**
 * Catalogue de récompenses actives — uniquement le palier "1 mois FlipLearn Premium".
 *
 * Contexte juridique : à ce stade du PFE, aucune structure juridique n'est associée
 * à FlipLearn. Promettre un abonnement de longue durée (3, 6 ou 12 mois) ou des
 * récompenses tangibles (codes promo, goodies, certifications) reviendrait à
 * s'engager sur des prestations qui ne peuvent être garanties. La plateforme se
 * limite donc à un seul palier réellement réclamable. Les durées plus longues
 * sont décrites dans l'interface comme des "perspectives d'évolution" — sans
 * engagement, et conditionnées à la création d'une structure juridique et à
 * l'établissement de partenariats avec des établissements (cf. mémoire chap. 7.4).
 *
 * Seed idempotent : n'écrase pas le reward existant (match par titre).
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
];

// Anciens paliers seedés dans des versions précédentes — on les désactive (active=false)
// au lieu de les supprimer, pour préserver l'historique des éventuelles réclamations.
const LEGACY_TITLES_TO_DEACTIVATE = [
  '3 mois FlipLearn Premium',
  '6 mois FlipLearn Premium',
  '1 an FlipLearn Premium',
];

export async function seedRewards() {
  for (const r of REWARDS_SEED) {
    await Reward.findOneAndUpdate(
      { titre: r.titre },
      { $setOnInsert: r },
      { upsert: true, new: true }
    );
  }
  const deactivated = await Reward.updateMany(
    { titre: { $in: LEGACY_TITLES_TO_DEACTIVATE }, active: { $ne: false } },
    { $set: { active: false } }
  );
  console.log(
    `[seed] 1 récompense active (1 mois Premium) ; ${deactivated.modifiedCount ?? 0} ancienne(s) désactivée(s).`
  );
}
