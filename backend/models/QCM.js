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
  },
  { timestamps: true }
);

export default mongoose.model('QCM', qcmSchema);
