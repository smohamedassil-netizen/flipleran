import mongoose from 'mongoose';

/**
 * Récompense disponible dans le catalogue. Les étudiants peuvent la réclamer
 * s'ils ont assez de points. Après réclamation, un admin valide manuellement.
 */
const rewardSchema = new mongoose.Schema({
  titre:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  type: {
    type: String,
    enum: ['certificat', 'reduction', 'premium', 'cadeau', 'formation', 'autre'],
    default: 'autre',
  },
  pointsRequired: { type: Number, required: true, min: 0 },
  imageUrl:    { type: String, default: '' },
  emoji:       { type: String, default: '🎁' },
  sponsor:     { type: String, default: '' },
  stock:       { type: Number, default: -1 },   // -1 = illimité
  claimed:     { type: Number, default: 0 },    // compteur total
  active:      { type: Boolean, default: true },
  highlight:   { type: Boolean, default: false }, // mis en avant
}, { timestamps: true });

rewardSchema.index({ active: 1, pointsRequired: 1 });

export default mongoose.model('Reward', rewardSchema);
