import mongoose from 'mongoose';

/**
 * AutoPrepJob — Suivi d'un job d'auto-préparation de cours par IA.
 *
 * @description Le prof clique « Préparer ce cours avec l'IA » sur une vidéo
 * dont la transcription est disponible. Le backend lance 5 appels Groq en
 * parallèle (questions in-video, QCM, outcomes Bloom, suggestion de Prosit,
 * flashcards). Ce modèle suit l'état de l'exécution et stocke les résultats
 * jusqu'à validation ou rejet par le prof.
 *
 * Conformité pédagogique :
 * @see Bergmann & Sams (2012) — la classe inversée n'est efficace que si
 *      le prof a le temps de concevoir des activités riches autour de la
 *      vidéo. L'IA dégage ce temps.
 * @see Mazur (1997) — ConcepTests insérés au moment où une notion vient
 *      d'être présentée (questions in-video).
 * @see Anderson & Krathwohl (2001) — taxonomie révisée pour les outcomes.
 * @see Lebrun (2007) — scénarisation pédagogique : le prof reste maître
 *      de la décision, l'IA propose, il dispose.
 */

const itemResultSchema = new mongoose.Schema({
  task:    { type: String, enum: ['inVideoQuestions', 'qcm', 'outcomes', 'prositSuggestion', 'flashcards'], required: true },
  status:  { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
  data:    { type: mongoose.Schema.Types.Mixed, default: null },     // payload spécifique à la tâche
  error:   { type: String, default: '' },
  startedAt:   { type: Date, default: null },
  completedAt: { type: Date, default: null },
}, { _id: false });

const autoPrepJobSchema = new mongoose.Schema({
  videoId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Video',  required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true, index: true },

  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending',
    index: true,
  },

  // Résultats par sous-tâche (Promise.allSettled : un échec n'arrête pas les autres)
  results: { type: [itemResultSchema], default: [] },

  // Erreurs orchestrateur (hors erreurs sous-tâches déjà tracées dans results[].error)
  errors: { type: [String], default: [] },

  // Métriques
  tokensUsedEstimate: { type: Number, default: 0 },
  durationMs:         { type: Number, default: 0 },

  startedAt:   { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

autoPrepJobSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('AutoPrepJob', autoPrepJobSchema);
