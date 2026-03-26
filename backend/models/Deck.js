import mongoose from 'mongoose';

const deckSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'General' },
    coverImage: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPublic: { type: Boolean, default: false },
    tags: [{ type: String }],
    cardCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Deck', deckSchema);
