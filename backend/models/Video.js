import mongoose from 'mongoose';

const watchedEntrySchema = new mongoose.Schema(
  {
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    watchedPercent: { type: Number, default: 0, min: 0, max: 100 },
    completed:      { type: Boolean, default: false },   // true si >= 80 %
    completedAt:    { type: Date },
    lastWatchedAt:  { type: Date, default: Date.now },
  },
  { _id: false }
);

const chapterSchema = new mongoose.Schema(
  {
    title:     { type: String, required: true, trim: true },
    timestamp: { type: Number, required: true, min: 0 },  // secondes depuis le début
  },
  { _id: false }
);

const videoSchema = new mongoose.Schema(
  {
    titre:        { type: String, required: true, trim: true },
    description:  { type: String, default: '' },
    url:          { type: String, required: true },       // secure_url Cloudinary
    publicId:     { type: String, default: '' },          // pour suppression Cloudinary
    thumbnailUrl: { type: String, default: '' },
    duration:     { type: Number, default: 0 },           // secondes
    order:        { type: Number, default: 0 },           // ordre dans le cours
    chapters:     [chapterSchema],                        // chapitres / parties
    courseId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
    watchedBy:    [watchedEntrySchema],
  },
  { timestamps: true }
);

videoSchema.index({ courseId: 1, order: 1 });

export default mongoose.model('Video', videoSchema);
