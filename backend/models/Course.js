import mongoose from 'mongoose';
import learningOutcomeSchema from './LearningOutcome.js';

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

/**
 * Course schema — module pédagogique d'une promotion.
 *
 * Le couple (`learningOutcomes`, `pedagogicalContract`) implémente
 * l'**alignement constructif** (Biggs, 1996) : le prof rend explicite ce que
 * l'étudiant saura faire (objectifs Bloom) et l'engagement réciproque qui
 * encadre le module (contrat pédagogique). Ce socle déclaratif sert ensuite
 * d'ancre pour les vidéos (`Video.coversOutcomes`), les QCM et le parcours.
 */
const courseSchema = new mongoose.Schema(
  {
    titre:       { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    professorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filiere:     { type: String, required: true },
    promotion:   { type: String, required: true },
    // Semestre académique du module (ex: 'S5', 'S6'). Optionnel : permet de
    // découper la promotion par semestre (calque sur l'organisation universitaire
    // française : L1 = S1+S2, L2 = S3+S4, L3 = S5+S6).
    semestre:    { type: String, default: '', enum: ['', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'] },
    isActive:    { type: Boolean, default: true },
    aiPersona:   { type: aiPersonaSchema, default: () => ({}) },

    // Objectifs d'apprentissage (Anderson & Krathwohl, 2001)
    learningOutcomes:    { type: [learningOutcomeSchema], default: [] },

    // Contrat pédagogique (Markdown, max 2000 chars) — Biggs (1996)
    pedagogicalContract: { type: String, default: '', maxlength: 2000 },

    /* Toggle prof : "Les QCM comptent dans la note de contrôle continu ?"
       En classe inversée stricte les QCM AVANT le cours sont formatifs
       (Black & Wiliam 1998) → false par défaut. Le prof peut activer pour
       que la moyenne des QCM compte dans la note CC du module. */
    qcmCountsInGrade: { type: Boolean, default: false },

    /**
     * Date du prochain rendez-vous présentiel (étape 2 du Cycle CAI).
     * Renseignée par le prof, utilisée par MyJourney étudiant pour
     * afficher "Sois prêt pour mardi 10h" et par ClassReadiness pour
     * cibler le briefing du prochain cours.
     * Optionnel : si non renseignée, l'étape 2 reste 'unknown'.
     */
    nextClassDate: { type: Date, default: null },

    /* Pondération de la note CC du module (somme = 100). */
    gradeWeights: {
      qcm:        { type: Number, default: 30, min: 0, max: 100 },
      prosit:     { type: Number, default: 30, min: 0, max: 100 },
      project:    { type: Number, default: 30, min: 0, max: 100 },
      validation: { type: Number, default: 10, min: 0, max: 100 },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Course', courseSchema);
