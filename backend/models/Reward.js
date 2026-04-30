import mongoose from 'mongoose';

/**
 * Récompense disponible dans le catalogue (F11B sprint-final).
 *
 * Types variés pour la diversité de la marketplace (Werbach & Hunter 2012,
 * Deci-Ryan 1985 — récompenses extrinsèques tangibles vs intrinsèques) :
 *  - 'abonnement_fliplearn' : Premium FlipLearn (durée en mois, activation auto à la validation admin).
 *  - 'tutoring'             : Session de tutorat individuelle avec le prof.
 *  - 'content'              : Accès anticipé aux nouvelles vidéos.
 *  - 'badge_linkedin'       : Insigne LinkedIn officiel FlipLearn (livré par admin).
 *  - 'honor_board'          : Mention sur le tableau d'honneur du module pendant 1 mois.
 *  - 'project_choice'       : Choix d'un sujet de projet personnalisé.
 *  - 'cosmetic'             : Personnalisation profil (cadre avatar, thème).
 */
const REWARD_TYPES = [
  'abonnement_fliplearn',
  'tutoring',
  'content',
  'badge_linkedin',
  'honor_board',
  'project_choice',
  'cosmetic',
];

const rewardSchema = new mongoose.Schema({
  titre:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  type: {
    type: String,
    enum: REWARD_TYPES,
    default: 'abonnement_fliplearn',
  },
  // Durée de l'abonnement débloqué (en mois) — pour type='abonnement_fliplearn'
  dureeMois:   { type: Number, default: 1, min: 1 },
  pointsRequired: { type: Number, required: true, min: 0 },
  imageUrl:    { type: String, default: '' },
  emoji:       { type: String, default: '⭐' },
  stock:       { type: Number, default: -1 },   // -1 = illimité
  claimed:     { type: Number, default: 0 },    // compteur total
  active:      { type: Boolean, default: true },
  highlight:   { type: Boolean, default: false }, // mis en avant
  // Métadonnées flexibles selon le type (ex: durée tutorat, lien honor_board, asset cosmetic)
  metadata:    { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

rewardSchema.index({ active: 1, type: 1, pointsRequired: 1 });

const Reward = mongoose.model('Reward', rewardSchema);
export default Reward;
export { REWARD_TYPES };
