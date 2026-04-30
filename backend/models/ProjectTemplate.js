import mongoose from 'mongoose';

/**
 * ProjectTemplate — Bibliothèque de templates de projets pré-pensés (F10
 * sprint-final).
 *
 * Distinction avec les templates de phases F8 (`services/projectTemplates.js`) :
 *  - F8 = sets génériques de phases standard par type (mono 3 / groupe 5 / pfe 7)
 *  - F10 = templates COMPLETS pré-pensés (titre + énoncé + phases sur-mesure +
 *    rubric + outcomes suggérés) pour des sujets concrets : "Chatbot RAG ISIL",
 *    "Business plan startup tech", "Audit organisationnel CNAS", etc.
 *
 * Cadre théorique :
 * @see Helle, Tynjälä, Olkinuora (2006). Project-based learning in
 *      post-secondary education. Une bibliothèque de templates réduit le coût
 *      de scénarisation et favorise l'adoption du PBL par les profs.
 *
 * Provenance des templates :
 *  - 'official'     : seedés par l'équipe FlipLearn, validés pédagogiquement.
 *  - 'community'    : partagés par d'autres profs (V2 — pas dans sprint-final).
 *  - 'ai-generated' : créés à la volée via Groq (POST /generate).
 */

const phaseTemplateSchema = new mongoose.Schema({
  titre:        { type: String, required: true },
  description:  { type: String, default: '' },
  weight:       { type: Number, min: 0, max: 100, default: 0 },
  livrableSpec: {
    type:       { type: String, enum: ['document', 'video', 'presentation', 'demo', 'libre'], default: 'libre' },
    isRequired: { type: Boolean, default: false },
    consigne:   { type: String, default: '' },
  },
}, { _id: false });

const rubricCriterionTemplateSchema = new mongoose.Schema({
  criterion:   { type: String, required: true },
  maxPoints:   { type: Number, default: 4 },
  descriptors: [{
    level: { type: Number, min: 1, max: 5, required: true },
    text:  { type: String, default: '' },
  }],
}, { _id: false });

const projectTemplateSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: '', maxlength: 2000 },
  enonce:      { type: String, default: '', maxlength: 5000 },
  motsCles:    [{ type: String, maxlength: 50 }],

  // Catégorisation
  filiere:  { type: String, enum: ['ISIL', 'Management', 'Finance', 'transverse'], required: true, index: true },
  type:     { type: String, enum: ['mono', 'groupe', 'pfe'], required: true, index: true },
  level:    { type: String, enum: ['L1', 'L2', 'L3', 'M1', 'M2'], default: 'L3', index: true },

  estimatedDurationWeeks: { type: Number, default: 6, min: 1, max: 52 },

  // Contenu pédagogique pré-rempli
  phases: { type: [phaseTemplateSchema], default: [] },
  rubric: { type: [rubricCriterionTemplateSchema], default: [] },
  suggestedOutcomes: [{ type: String, maxlength: 300 }],

  // Provenance
  source:    { type: String, enum: ['official', 'community', 'ai-generated'], default: 'official', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isPublic:  { type: Boolean, default: true },

  // Stats d'usage (pour ranking UX V2)
  usageCount: { type: Number, default: 0 },
}, { timestamps: true });

projectTemplateSchema.index({ filiere: 1, type: 1, level: 1, source: 1 });
projectTemplateSchema.index({ title: 'text', description: 'text' });

const ProjectTemplate = mongoose.model('ProjectTemplate', projectTemplateSchema);
export default ProjectTemplate;
