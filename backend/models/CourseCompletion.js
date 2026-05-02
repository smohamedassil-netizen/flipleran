import mongoose from 'mongoose';

/**
 * CourseCompletion — matérialise la validation finale d'un module par un étudiant.
 *
 * Pédagogie : à la fin d'un module, l'étudiant fait une auto-évaluation
 * métacognitive (Lebrun, 2007 ; Tardif, 1998) — il réfléchit sur ce qu'il
 * a appris, ce qui reste flou, et son niveau de confiance. Ce moment de
 * recul transforme l'apprentissage de surface en apprentissage en profondeur.
 *
 * Conditions de validation (vérifiées côté controller, pas en schema) :
 *   - Préparation 'completed' (vidéos ≥ 80% + QCM ≥ 80%)
 *   - Au moins 1 Prosit terminé sur ce cours
 *
 * À la validation :
 *   - Création du doc CourseCompletion
 *   - Attribution du badge 'module_validated' (idempotent, 1ère fois seulement)
 *   - +50 points à l'étudiant
 *
 * Index unique (userId, courseId) : 1 seule validation par étudiant par module.
 */
const courseCompletionSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },

    /* Auto-évaluation métacognitive — 3 questions courtes */
    selfAssessment: {
      // Niveau de confiance perçu sur les acquis (1 = perdu, 5 = maîtrise)
      confidence: { type: Number, min: 1, max: 5, required: true },
      // Réponse libre : "Qu'est-ce que tu retiens d'essentiel ?"
      retained:   { type: String, required: true, maxlength: 1000 },
      // Réponse libre : "Quels concepts te semblent encore flous ?"
      unclear:    { type: String, default: '', maxlength: 1000 },
    },

    /* Snapshot des conditions au moment de la validation (audit) */
    snapshot: {
      videosWatched:  { type: Number, default: 0 },
      videosTotal:    { type: Number, default: 0 },
      quizzesPassed:  { type: Number, default: 0 },
      quizzesTotal:   { type: Number, default: 0 },
      prositsCompleted: { type: Number, default: 0 },
      projectsSubmitted:{ type: Number, default: 0 },
    },

    pointsAwarded: { type: Number, default: 0 },
    validatedAt:   { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Un étudiant ne peut valider qu'une fois par cours.
courseCompletionSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export default mongoose.model('CourseCompletion', courseCompletionSchema);
