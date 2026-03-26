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
  },
  { timestamps: true }
);

progressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export default mongoose.model('Progress', progressSchema);
