import mongoose from 'mongoose';

/**
 * Réclamation d'une récompense par un étudiant. Status initial 'pending'
 * jusqu'à validation/refus par un admin.
 */
const rewardClaimSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rewardId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Reward', required: true },
  pointsSpent:  { type: Number, required: true },
  status:       { type: String, enum: ['pending', 'approved', 'delivered', 'rejected'], default: 'pending' },
  adminNote:    { type: String, default: '' },
  userMessage:  { type: String, default: '' },
  code:         { type: String, default: '' }, // code de réduction / lien / serial une fois livré
  processedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  processedAt:  { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('RewardClaim', rewardClaimSchema);
