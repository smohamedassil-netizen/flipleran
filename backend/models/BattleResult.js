import mongoose from 'mongoose';

/**
 * Résultat d'un match de Quiz Battle terminé.
 *
 * Conformément au brief 01 (cadre éducatif vs farming) :
 *   - Aucune XP n'est attribuée à User.points pour un Battle gagné.
 *   - Ce modèle sert UNIQUEMENT au classement interne du Quiz Battle
 *     (leaderboard séparé, indépendant de l'XP global).
 *
 * Une entrée par joueur (= 2 entrées par match en mode 1v1).
 */
const battleResultSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  opponentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // Cours (matière) sur lequel a porté le match — optionnel (null = toutes matières)
  courseId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null, index: true },
  score:        { type: Number, required: true, min: 0 },
  correctCount: { type: Number, required: true, min: 0 },
  totalQuestions: { type: Number, required: true, min: 0 },
  bestStreak:   { type: Number, default: 0 },
  // Issue du match : 'win' (a marqué plus de points), 'loss', ou 'draw'
  outcome:      { type: String, enum: ['win', 'loss', 'draw'], required: true },
  matchedAt:    { type: Date, default: Date.now, index: true },
}, { timestamps: true });

battleResultSchema.index({ userId: 1, matchedAt: -1 });

export default mongoose.model('BattleResult', battleResultSchema);
