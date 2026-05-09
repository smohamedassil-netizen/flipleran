/**
 * QCM — un quiz lié à une vidéo, avec ses questions imbriquées.
 *
 * ⚠️ Note d'architecture : il existe DEUX types de questions dans FlipLearn :
 *  1. QCM.questions[] (sub-document, ce fichier) — un quiz "post-vidéo" complet
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
    videoId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true, unique: true },
    titre:            { type: String, required: true, trim: true },
    questions:        [questionSchema],
    pointsPerQuestion:{ type: Number, default: 10 },
    timerSeconds:     { type: Number, default: 30 },
    resultats:        [resultatSchema],
    deadline:         { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('QCM', qcmSchema);
