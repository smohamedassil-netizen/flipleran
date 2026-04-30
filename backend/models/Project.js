import mongoose from 'mongoose';

const membreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: {
    type: String,
    enum: ['chef_projet', 'scribe', 'animateur', 'chrono', 'analyste'],
    required: true
  }
}, { _id: false });

const groupeSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  membres: [membreSchema]
}, { _id: true });

const checklistItemSchema = new mongoose.Schema({
  texte: { type: String, required: true, trim: true },
  done: { type: Boolean, default: false },
  doneBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  doneAt: { type: Date, default: null },
  assignedGroupe: { type: Number, default: null }, // si null, tous les groupes
}, { _id: true });

/**
 * Spécification de livrable attendu pour une phase (F8 sprint-final).
 * Permet au prof d'indiquer ce que le groupe doit produire pour valider
 * la phase (document / vidéo / présentation / démo). Sans casser les
 * projets existants : tous les champs sont optionnels avec défauts.
 */
const livrableSpecSchema = new mongoose.Schema({
  type:       { type: String, enum: ['document', 'video', 'presentation', 'demo', 'libre'], default: 'libre' },
  isRequired: { type: Boolean, default: false },
  consigne:   { type: String, default: '', maxlength: 1000 },
}, { _id: false });

const phaseSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  description: { type: String, default: '' },
  dateDebut: Date,
  dateFin: Date,
  statut: {
    type: String,
    enum: ['a_faire', 'en_cours', 'termine'],
    default: 'a_faire'
  },
  checklist: [checklistItemSchema],
  // F8 — poids de la phase dans la note finale (0-100, optionnel)
  weight:       { type: Number, min: 0, max: 100, default: 0 },
  // F8 — spécification du livrable attendu
  livrableSpec: { type: livrableSpecSchema, default: null },
}, { _id: true });

/**
 * Idées / templates suggérés par le professeur pour le projet.
 * L'étudiant peut s'en inspirer pour savoir quoi faire.
 */
const ideaSchema = new mongoose.Schema({
  titre: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['exercice', 'workshop', 'recherche', 'livrable', 'autre'], default: 'autre' },
  difficulte: { type: String, enum: ['facile', 'moyen', 'difficile'], default: 'moyen' },
  estime: { type: String, default: '' },   // ex: "2h", "1 semaine"
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: true, timestamps: true });

/**
 * Feedback structuré du prof sur un livrable étudiant (F8 sprint-final).
 * Note 1-5 étoiles (Helle, Tynjälä, Olkinuora 2006 — Project-based learning
 * in post-secondary education). Distinct des `evaluations[]` qui sont des
 * peer-reviews entre étudiants.
 */
const livrableFeedbackSchema = new mongoose.Schema({
  from:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:      { type: String, default: '', maxlength: 2000 },
  rating:    { type: Number, min: 1, max: 5, default: null },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const livrableSchema = new mongoose.Schema({
  groupeIndex: { type: Number, required: true },
  type: {
    type: String,
    enum: ['document', 'video', 'lien'],
    required: true
  },
  titre: { type: String, required: true },
  url: String,
  publicId: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now },
  // F8 — rattachement optionnel à une phase (ID du sous-doc phaseSchema)
  phaseId:     { type: mongoose.Schema.Types.ObjectId, default: null },
  // F8 — texte libre déposé en complément du fichier (notes, commentaire)
  textContent: { type: String, default: '' },
  // F8 — feedback structuré du prof
  feedback:    { type: livrableFeedbackSchema, default: null },
}, { _id: true });

const critereSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  note: { type: Number, min: 1, max: 5, required: true }
}, { _id: false });

const evaluationSchema = new mongoose.Schema({
  groupeIndex: { type: Number, required: true },
  evaluateur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cible: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  criteres: [critereSchema],
  commentaire: String,
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

/**
 * Entrée de timeline : traçabilité des actions sur le projet.
 * Types : phase_status, livrable_added, livrable_removed, evaluation_added,
 *         status_change, groupes_updated, membre_joined, note
 */
const activitySchema = new mongoose.Schema({
  type:        { type: String, required: true },
  authorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: { type: String, required: true },
  meta:        { type: mongoose.Schema.Types.Mixed, default: {} },
  at:          { type: Date, default: Date.now },
}, { _id: true });

/**
 * Rubric d'évaluation détaillée (F8 sprint-final).
 *
 * @see Helle, L., Tynjälä, P., & Olkinuora, E. (2006). Project-based
 *      learning in post-secondary education — theory, practice and rubber
 *      sling shots. *Higher Education*, 51(2), 287-314.
 *
 * Chaque critère contient des descripteurs par niveau (1=insuffisant à
 * 5=excellent) pour rendre l'évaluation transparente et reproductible.
 */
const rubricDescriptorSchema = new mongoose.Schema({
  level: { type: Number, min: 1, max: 5, required: true },
  text:  { type: String, default: '', maxlength: 500 },
}, { _id: false });

const rubricCriterionSchema = new mongoose.Schema({
  criterion:   { type: String, required: true, maxlength: 200 },
  maxPoints:   { type: Number, default: 20, min: 0, max: 100 },
  descriptors: { type: [rubricDescriptorSchema], default: [] },
}, { _id: true });

const projectSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  description: String,
  // Type d'organisation du projet :
  //   'mono'   = rattaché à un seul module (courseId) — alias UI "Module unique"
  //   'groupe' = rattaché à plusieurs modules (modules[]) — alias UI "Multi-modules"
  //   'pfe'    = projet de fin d'études (F8 sprint-final) — multi-modules + soutenance
  // Les valeurs 'mono' et 'groupe' restent valides pour rétrocompat ;
  // 'pfe' a été ajoutée pour distinguer les PFE (jalons + rubric obligatoires).
  type: {
    type: String,
    enum: ['mono', 'groupe', 'pfe'],
    required: true,
    default: 'mono',
  },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['brouillon', 'actif', 'termine'],
    default: 'brouillon'
  },

  // Énoncé pédagogique (commun à mono et groupé)
  enonce: String,
  motsCles: [String],

  // Calendrier
  dateDebut: Date,
  dateFin: Date,
  dateSoutenance: Date,

  // Modules associés (utilisé pour les projets de type 'groupe' et 'pfe')
  modules: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],

  // Structure
  groupes: [groupeSchema],
  phases: [phaseSchema],
  livrables: [livrableSchema],
  evaluations: [evaluationSchema],
  activity: [activitySchema],
  ideas: [ideaSchema],

  // F8 — rubric d'évaluation transparente (Helle et al. 2006)
  rubric: { type: [rubricCriterionSchema], default: [] },
}, { timestamps: true });

projectSchema.index({ courseId: 1, createdBy: 1 });

const Project = mongoose.model('Project', projectSchema);
export default Project;
