import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema(
  {
    deck: { type: mongoose.Schema.Types.ObjectId, ref: 'Deck', required: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
    image: { type: String, default: '' },
    audio: { type: String, default: '' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    nextReview: { type: Date, default: Date.now },
    interval: { type: Number, default: 1 },
    easeFactor: { type: Number, default: 2.5 },
    repetitions: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Card', cardSchema);
