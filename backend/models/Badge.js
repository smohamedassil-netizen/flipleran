import mongoose from 'mongoose';

const badgeSchema = new mongoose.Schema(
  {
    key:         { type: String, required: true, unique: true },   // identifiant programmatique
    nom:         { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    icon:        { type: String, default: '' },                    // nom icône Lucide (ex: "Star")
    color:       { type: String, default: '#1B4F72' },
    rarity:      { type: String, enum: ['common', 'rare', 'epic'], default: 'common' },
    condition:   { type: String, required: true },                 // texte lisible
  },
  { timestamps: true }
);

export default mongoose.model('Badge', badgeSchema);
