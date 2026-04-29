/**
 * VideoQuestionAnswer — Réponse soumise par un étudiant à une VideoQuestion.
 *
 * Schéma pédagogique : une seule réponse par couple (questionId, userId).
 * Si l'étudiant retombe sur la même question (rewind ou re-visionnage), on
 * lui sert directement le résultat précédent — pas de re-soumission. Cette
 * contrainte d'unicité reflète le principe ConcepTest de Mazur (1997) :
 * la première réaction de l'apprenant est la donnée pédagogiquement
 * pertinente, même si la rétroaction arrive ensuite.
 */

import mongoose from 'mongoose';

const videoQuestionAnswerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoQuestion',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true,
    index: true,
  },
  answer: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
    required: true,
  },
  isCorrect: {
    type: Boolean,
    required: true,
  },
  timeTaken: {
    type: Number,        // millisecondes entre apparition et clic
    default: 0,
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Une seule réponse par (question, étudiant) — empêche la re-soumission.
videoQuestionAnswerSchema.index({ questionId: 1, userId: 1 }, { unique: true });

export default mongoose.model('VideoQuestionAnswer', videoQuestionAnswerSchema);
