import mongoose from 'mongoose';

/**
 * Chapter — regroupement de vidéos au sein d'un Course (= module).
 *
 * Hiérarchie pédagogique (Coursera/Khan Academy/edX) :
 *   Module (Course)
 *   └── Chapitre (Chapter)            ← ICI
 *       └── Vidéo (Video)
 *           └── Partie (Video.parts)
 *               └── mini-QCM + feedback + questions inline
 *
 * Un chapitre regroupe les vidéos d'une même unité conceptuelle (ex. dans
 * "Sécurité Informatique" : Chapitre 1 — Cryptographie, Chapitre 2 — OWASP,
 * Chapitre 3 — Pentest...).
 *
 * Mastery learning (Bloom 1968) : l'étudiant ne passe au chapitre suivant
 * qu'après avoir terminé le précédent. Le verrouillage est calculé côté
 * controller — pas en schema, pour rester souple (le prof peut autoriser
 * le mode "libre" via `unlockedByDefault`).
 */
const chapterSchema = new mongoose.Schema(
  {
    titre:       { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    courseId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    order:       { type: Number, default: 0 },        // ordre d'affichage dans le module

    /* Si true, le chapitre est accessible sans avoir terminé le précédent
       (mode libre). Default = false → respect du Mastery Learning. */
    unlockedByDefault: { type: Boolean, default: false },

    /* Seuil de complétion pour considérer le chapitre "terminé" et débloquer
       le suivant. 80% est la valeur par défaut (Bloom 1968 + littérature). */
    completionThreshold: { type: Number, default: 80, min: 50, max: 100 },

    /* Bouton "S'entraîner" en fin de chapitre — tirage aléatoire de N
       questions parmi tous les QCM du chapitre. Configurable par le prof. */
    practiceMode: {
      enabled:      { type: Boolean, default: true },
      questionCount: { type: Number, default: 10, min: 3, max: 30 },
    },
  },
  { timestamps: true }
);

chapterSchema.index({ courseId: 1, order: 1 });

export default mongoose.model('Chapter', chapterSchema);
