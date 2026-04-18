import mongoose from 'mongoose';

/**
 * Persona de l'agent IA spécialisé pour ce module.
 * Chaque cours peut avoir son propre assistant IA avec un nom, une spécialité
 * et un ton différents. Si absent, un persona par défaut est dérivé du titre du cours.
 */
const aiPersonaSchema = new mongoose.Schema({
  nom:         { type: String, default: '' },        // ex: "Algo-Bot"
  specialite:  { type: String, default: '' },        // ex: "Algorithmique et structures de données"
  avatar:      { type: String, default: '🤖' },     // emoji ou URL
  ton:         { type: String, default: 'pédagogue' }, // pédagogue | strict | fun | expert
  description: { type: String, default: '' },        // courte intro affichée à l'étudiant
  couleur:     { type: String, default: '#1B4F72' }, // couleur UI
}, { _id: false });

const courseSchema = new mongoose.Schema(
  {
    titre:       { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    professorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filiere:     { type: String, required: true },
    promotion:   { type: String, required: true },
    isActive:    { type: Boolean, default: true },
    aiPersona:   { type: aiPersonaSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default mongoose.model('Course', courseSchema);
