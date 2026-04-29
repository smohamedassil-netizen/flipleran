/**
 * VideoQuestion — Question interactive déclenchée à un timestamp précis
 * pendant le visionnage d'une vidéo (modèle EdPuzzle).
 *
 * Cadre théorique de classe inversée Type 2 (Lebrun) :
 *   - Bergmann & Sams (2012), "Flip Your Classroom: Reach Every Student in
 *     Every Class Every Day" — la vidéo passive ne suffit pas, il faut
 *     enrôler l'apprenant dans une démarche active de questionnement.
 *   - Mazur (1997), "Peer Instruction: A User's Manual" — "Don't ask if
 *     students understand, make them prove it." Les ConcepTests apparaissent
 *     au moment précis où une notion vient d'être présentée, forçant la
 *     recall et révélant les misconceptions immédiatement.
 *
 * Une VideoQuestion porte sur UNE notion ponctuelle de la vidéo et se
 * déclenche au timestamp défini par le professeur. L'overlay frontend
 * met en pause la lecture (si pauseVideo=true) tant que la question
 * n'est pas répondue.
 */

import mongoose from 'mongoose';

const videoQuestionSchema = new mongoose.Schema({
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true,
    index: true,
  },
  timestamp: {
    type: Number,        // secondes (peut être fractionnaire)
    required: true,
    min: 0,
    index: true,
  },
  texte: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  options: {
    A: { type: String, required: true, trim: true },
    B: { type: String, required: true, trim: true },
    C: { type: String, required: true, trim: true },
    D: { type: String, required: true, trim: true },
  },
  correctAnswer: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
    required: true,
  },
  explanation: {
    type: String,
    default: '',
    trim: true,
    maxlength: 2000,
  },
  pauseVideo: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

// Index combiné : utile pour la query GET /video/:videoId triée par timestamp
videoQuestionSchema.index({ videoId: 1, timestamp: 1 });

export default mongoose.model('VideoQuestion', videoQuestionSchema);
