import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema(
  {
    userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    videosCompleted:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
    qcmScores:        [
      {
        qcmId: { type: mongoose.Schema.Types.ObjectId, ref: 'QCM' },
        score: { type: Number },
        _id:   false,
      },
    ],
    lastActivity:     { type: Date, default: Date.now },
    // Champs IA mis à jour automatiquement après chaque QCM soumis
    aiPredictedScore:    { type: Number, default: null },
    aiDropoutProbability:{ type: Number, default: null },
    aiRiskLevel:         { type: String, enum: ['faible', 'modéré', 'élevé', 'critique', null], default: null },
    aiRiskUpdatedAt:     { type: Date, default: null },
  },
  { timestamps: true }
);

progressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export default mongoose.model('Progress', progressSchema);
