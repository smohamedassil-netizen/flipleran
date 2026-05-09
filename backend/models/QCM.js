/**
 * QCM — un quiz à 3 niveaux d'évaluation (capsule / chapitre / module).
 *
 * Le champ `scope` détermine la cible du QCM :
 *   - 'video'    → QCM post-capsule (synthèse d'une seule vidéo) — videoId requis
 *   - 'chapter'  → QCM de fin de chapitre (toutes les capsules) — chapterId requis
 *   - 'module'   → QCM final de module (tous les chapitres) — courseId requis
 *
 * Hiérarchie pédagogique (Bloom Mastery Learning 1968, Black & Wiliam 1998) :
 *   Module (Course) → Chapitre (Chapter) → Capsule (Video)
 *   À chaque niveau, un QCM noté qui valide la progression.
 *
 * ⚠️ Note d'architecture : il existe DEUX types de questions dans FlipLearn :
 *  1. QCM.questions[] (sub-document, ce fichier) — quiz "post-capsule" complet
 *     que l'étudiant passe d'un seul tenant après avoir vu la vidéo.
 *  2. VideoQuestion (collection séparée) — questions intégrées DANS la vidéo,
 *     déclenchées à un timestamp précis pendant la lecture.
 *
 * Les deux servent à différents moments pédagogiques :
 *  - VideoQuestion = vérification continue, accroche l'attention
 *  - QCM           = synthèse finale, conditionne l'unlock du chapitre suivant
 *
 * Les Réponses ne sont PAS une collection séparée : elles sont imbriquées
 * comme sub-document dans chaque question pour minimiser les jointures
 * (denormalization pattern MongoDB).
 */
import mongoose from 'mongoose';

/* ─── Question ────────────────────────────────────────────────────────────── */
const questionSchema = new mongoose.Schema(
  {
    texte:          { type: String, required: true },
    options: {
      A: { type: String, required: true },
      B: { type: String, required: true },
      C: { type: String, required: true },
      D: { type: String, required: true },
    },
    questionType:   { type: String, enum: ['single', 'multiple'], default: 'single' },
    correctAnswer:  { type: String, enum: ['A', 'B', 'C', 'D'], default: 'A' },
    correctAnswers: { type: [String], default: [] },
    explanation:    { type: String, default: '' },
  },
  { _id: true }
);

/* ─── Réponse individuelle (dans un résultat) ─────────────────────────────── */
const answerEntrySchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    answer:     { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
    answers:    { type: [String], default: [] },
    correct:    { type: Boolean, required: true },
    timedOut:   { type: Boolean, default: false },
  },
  { _id: false }
);

/* ─── Résultat d'un étudiant ──────────────────────────────────────────────── */
const resultatSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    score:       { type: Number, required: true },          // 0-100
    correctCount:{ type: Number, required: true },
    pointsEarned:{ type: Number, required: true },
    answers:     [answerEntrySchema],
    completedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/* ─── QCM ─────────────────────────────────────────────────────────────────── */
const qcmSchema = new mongoose.Schema(
  {
    /**
     * Scope du QCM — détermine le niveau d'évaluation et la référence requise.
     * - 'video'   → videoId requis (QCM post-capsule, comportement historique)
     * - 'chapter' → chapterId requis (QCM de fin de chapitre)
     * - 'module'  → courseId requis (QCM final de module)
     */
    scope: { type: String, enum: ['video', 'chapter', 'module'], default: 'video', required: true, index: true },

    // Références scope-dependent (1 seule renseignée selon scope)
    videoId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Video',   default: null, index: true },
    chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', default: null, index: true },
    courseId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Course',  default: null, index: true },

    titre:            { type: String, required: true, trim: true },
    questions:        [questionSchema],
    pointsPerQuestion:{ type: Number, default: 10 },
    timerSeconds:     { type: Number, default: 30 },
    /**
     * Score de réussite minimum (en %). Utilisé pour les QCM de chapitre/module
     * pour conditionner le déblocage de l'étape suivante. Pour scope='video',
     * ignoré (compat historique).
     */
    passingScore:     { type: Number, default: 60, min: 0, max: 100 },
    resultats:        [resultatSchema],
    deadline:         { type: Date, default: null },
  },
  { timestamps: true }
);

/**
 * Validator : selon scope, la référence appropriée doit être renseignée.
 * Empêche un QCM scope='chapter' sans chapterId, etc.
 */
qcmSchema.pre('validate', function (next) {
  if (this.scope === 'video' && !this.videoId) {
    return next(new Error('QCM scope=video : videoId est requis.'));
  }
  if (this.scope === 'chapter' && !this.chapterId) {
    return next(new Error('QCM scope=chapter : chapterId est requis.'));
  }
  if (this.scope === 'module' && !this.courseId) {
    return next(new Error('QCM scope=module : courseId est requis.'));
  }
  next();
});

/**
 * Index uniques partiels — 1 QCM max par scope+ref :
 *   - 1 QCM par vidéo (compatibilité historique)
 *   - 1 QCM de chapitre par chapitre
 *   - 1 QCM final par module
 */
qcmSchema.index(
  { scope: 1, videoId: 1 },
  { unique: true, partialFilterExpression: { scope: 'video',   videoId:   { $type: 'objectId' } } }
);
qcmSchema.index(
  { scope: 1, chapterId: 1 },
  { unique: true, partialFilterExpression: { scope: 'chapter', chapterId: { $type: 'objectId' } } }
);
qcmSchema.index(
  { scope: 1, courseId: 1 },
  { unique: true, partialFilterExpression: { scope: 'module',  courseId:  { $type: 'objectId' } } }
);

export default mongoose.model('QCM', qcmSchema);
