import mongoose from 'mongoose';

/**
 * Feedback ciblé d'un professeur vers un étudiant.
 * Permet au prof de commenter spécifiquement la performance de l'étudiant
 * sur une vidéo, un QCM, ou de manière générale (cours).
 *
 * L'étudiant le voit dans une page dédiée + une notification.
 */
const feedbackSchema = new mongoose.Schema({
  profId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  courseId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  videoId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
  qcmId:     { type: mongoose.Schema.Types.ObjectId, ref: 'QCM' },
  message:   { type: String, required: true, trim: true, maxlength: 2000 },
  read:      { type: Boolean, default: false },
}, { timestamps: true });

feedbackSchema.index({ studentId: 1, read: 1, createdAt: -1 });
feedbackSchema.index({ profId: 1, createdAt: -1 });

export default mongoose.model('Feedback', feedbackSchema);
