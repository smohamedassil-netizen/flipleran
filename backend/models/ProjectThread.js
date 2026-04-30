import mongoose from 'mongoose';

/**
 * ProjectThread — Forum asynchrone par projet (F9 sprint-final).
 *
 * Cadre théorique :
 * @see Garrison, Anderson, Archer (2000). *Critical Inquiry in a
 *      Text-Based Environment*. Modèle Community of Inquiry — la présence
 *      cognitive et sociale en e-learning passe par les échanges asynchrones
 *      structurés (questions, partages, annonces).
 *
 * Décisions de design :
 *  - Collection séparée du modèle Project pour éviter le gonflement du
 *    document parent (Mongoose limite 16 MB) et permettre la pagination /
 *    l'index par date.
 *  - 3 types de threads (question / announcement / sharing) — l'annonce est
 *    réservée au prof+admin (vérifié dans le controller).
 *  - Replies en sous-documents (réponses imbriquées 1 niveau, pas plus pour
 *    rester lisible en discussion universitaire).
 *  - pinnedByProf : épinglé en haut, ordre prof-décidé pour les annonces
 *    importantes (deadlines, consignes de dernière minute).
 */

const replySchema = new mongoose.Schema({
  authorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:   { type: String, required: true, maxlength: 4000 },
  createdAt: { type: Date,   default: Date.now },
  // Optionnel : marqueur "réponse du prof" pour highlighting côté UI
  isFromProf: { type: Boolean, default: false },
  // Optionnel : marqueur "réponse coach IA" si on active l'auto-FAQ plus tard
  isFromAI:   { type: Boolean, default: false },
}, { _id: true });

const projectThreadSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  authorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  title:     { type: String, required: true, trim: true, maxlength: 200 },
  content:   { type: String, required: true, maxlength: 8000 },
  type:      {
    type: String,
    enum: ['question', 'announcement', 'sharing'],
    default: 'question',
  },
  replies:       { type: [replySchema], default: [] },
  pinnedByProf:  { type: Boolean, default: false },
  // Marqueur "résolu" pour les threads de type 'question' — l'auteur peut
  // marquer sa question comme résolue après une bonne réponse.
  isResolved:    { type: Boolean, default: false },
}, { timestamps: true });

projectThreadSchema.index({ projectId: 1, pinnedByProf: -1, createdAt: -1 });

const ProjectThread = mongoose.model('ProjectThread', projectThreadSchema);
export default ProjectThread;
