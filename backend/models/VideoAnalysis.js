import mongoose from 'mongoose';

const conceptSchema = new mongoose.Schema(
  {
    term:       { type: String, required: true },
    definition: { type: String, required: true },
  },
  { _id: false }
);

const mindMapNodeSchema = new mongoose.Schema(
  {
    label:    { type: String, required: true },
    children: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { _id: false }
);

const videoAnalysisSchema = new mongoose.Schema(
  {
    videoId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Video',
      required: true,
      unique:   true,
    },
    transcript:   { type: String, default: '' },
    summary:      { type: String, default: '' },
    mindMap:      { type: mindMapNodeSchema, default: null },
    keyConcepts:  [conceptSchema],
    status: {
      type:    String,
      enum:    ['pending', 'transcribing', 'analyzing', 'completed', 'error'],
      default: 'pending',
    },
    error:    { type: String, default: '' },
    language: { type: String, default: 'fr' },
    analyzedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('VideoAnalysis', videoAnalysisSchema);
