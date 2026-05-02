import mongoose from 'mongoose';

/**
 * XPTransaction — journal d'attribution de points (XP) pour traçabilité.
 *
 * Chaque appel à `addPoints()` du service points.js crée un document ici.
 * Permet :
 *   - Au student : voir d'où viennent ses points (dashboard breakdown)
 *   - Au prof   : auditer la cohérence des récompenses
 *   - À l'app   : empêcher les doublons (dedupKey idempotence)
 *
 * Source = catégorie sémantique large (video / qcm / prosit / project /
 * module / battle / quest / streak / ai / admin). Le code de raison libre
 * est conservé dans `reason` pour rétrocompatibilité avec les appels
 * existants à addPoints(userId, amount, reason).
 */
const xpTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true }, // peut être négatif (ajustement admin)
    reason: { type: String, default: '' },

    /* Catégorie sémantique pour le breakdown — déduite de `reason` à
       l'appel ou explicite via le 4e paramètre de addPoints(). */
    source: {
      type: String,
      enum: [
        'video',     // 1 vidéo regardée à 80%+
        'qcm',       // QCM passé (score, complétion, bonus)
        'prosit',    // Prosit finalisé
        'project',   // Projet groupé terminé
        'module',    // Validation finale du module
        'battle',    // Quiz Battle victoire
        'quest',     // Quête / défi
        'streak',    // Bonus série quotidienne
        'ai',        // Première interaction agent IA
        'admin',     // Ajustement manuel admin
        'other',     // fallback rétrocompatible
      ],
      default: 'other',
      index: true,
    },

    /* Lien optionnel vers l'entité source (Video, QCM, Prosit, Project, Course, BattleResult). */
    relatedType: { type: String, default: '' },
    relatedId:   { type: mongoose.Schema.Types.ObjectId, default: null },

    /* Idempotence : si le même dedupKey existe déjà, on n'écrit pas (utile
       pour empêcher de re-créditer la même action sur double-clic / retry). */
    dedupKey: { type: String, default: null, index: true, sparse: true },
  },
  { timestamps: true }
);

// Index composite pour les requêtes "mes transactions du dernier mois par source"
xpTransactionSchema.index({ userId: 1, createdAt: -1 });
xpTransactionSchema.index({ userId: 1, source: 1 });

export default mongoose.model('XPTransaction', xpTransactionSchema);
