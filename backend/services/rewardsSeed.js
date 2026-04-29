import Reward from '../models/Reward.js';

/**
 * Catalogue de récompenses actives — UNE SEULE entrée autorisée :
 * "1 mois FlipLearn Premium gratuit" (accès complet pendant 30 jours).
 *
 * Contexte juridique : à ce stade du PFE, aucune structure juridique n'est
 * associée à FlipLearn. Promettre des abonnements longs, des goodies, des
 * certifications co-signées ou des codes promo reviendrait à s'engager sur
 * des prestations qui ne peuvent être garanties. L'app n'expose donc QUE
 * cette récompense. Les autres paliers (3/6/12 mois, certifications,
 * bootcamps, goodies) restent décrits comme perspective d'avenir
 * UNIQUEMENT dans le mémoire (chap. 7.4.1) — pas dans l'app live.
 *
 * Comportement à chaque démarrage backend :
 *   1. Upsert de l'entrée whitelist (force active: true).
 *   2. Désactivation (active: false) de TOUT le reste — ne supprime pas
 *      pour préserver l'historique des réclamations passées.
 */

const ACTIVE_REWARD = {
  titre: '1 mois FlipLearn Premium gratuit',
  description: '1 mois d\'accès complet : IA illimitée (assistant de cours, génération de QCM, analyse vidéo) et toutes les fonctionnalités premium.',
  type: 'abonnement_fliplearn',
  dureeMois: 1,
  pointsRequired: 500,
  emoji: '⭐',
  highlight: true,
  stock: -1,
};

export async function seedRewards() {
  // 1. Upsert de l'unique entrée active. $set force active: true même si
  //    quelqu'un l'avait passée à false en base.
  await Reward.findOneAndUpdate(
    { titre: ACTIVE_REWARD.titre },
    { $set: { ...ACTIVE_REWARD, active: true } },
    { upsert: true, new: true }
  );

  // 2. Désactivation de TOUTES les autres récompenses (whitelist par titre).
  const result = await Reward.updateMany(
    { titre: { $ne: ACTIVE_REWARD.titre }, active: { $ne: false } },
    { $set: { active: false } }
  );

  console.log(
    `[seed] 1 récompense active : "${ACTIVE_REWARD.titre}" ; ` +
    `${result.modifiedCount ?? 0} autre(s) désactivée(s).`
  );
}
