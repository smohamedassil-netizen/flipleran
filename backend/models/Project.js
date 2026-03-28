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

const phaseSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  dateDebut: Date,
  dateFin: Date,
  statut: {
    type: String,
    enum: ['a_faire', 'en_cours', 'termine'],
    default: 'a_faire'
  }
}, { _id: true });

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
  uploadedAt: { type: Date, default: Date.now }
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

const projectSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  description: String,
  type: {
    type: String,
    enum: ['prosit', 'projet'],
    required: true
  },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['brouillon', 'actif', 'termine'],
    default: 'brouillon'
  },

  // Prosit
  enonce: String,
  motsCles: [String],

  // Projet
  dateDebut: Date,
  dateFin: Date,
  dateSoutenance: Date,

  // Structure
  groupes: [groupeSchema],
  phases: [phaseSchema],
  livrables: [livrableSchema],
  evaluations: [evaluationSchema]
}, { timestamps: true });

projectSchema.index({ courseId: 1, createdBy: 1 });

const Project = mongoose.model('Project', projectSchema);
export default Project;
