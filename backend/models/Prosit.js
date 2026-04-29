import mongoose from 'mongoose';

/**
 * Modèle Prosit — méthodologie APP/CESI (Apprentissage Par Problème).
 *
 * Distinct du modèle Project :
 *   - 5 rôles spécifiques CESI : animateur, secretaire, scribe, gestionnaire, membre
 *   - 3 phases verrouillées : aller, recherche, retour (+ evalue, archive)
 *   - Espace collaboratif structuré (mots-clés, hypothèses, plan d'action)
 *   - Contributions individuelles par membre pendant la phase recherche
 *   - Grille d'évaluation pondérée (rubrics)
 *   - 3 modes de formation des groupes (random / manual / student_choice)
 *
 * Workflow : brouillon → aller → recherche → retour → evalue → archive
 */

const PROSIT_ROLES = ['animateur', 'secretaire', 'scribe', 'gestionnaire', 'membre'];

const fichierSchema = new mongoose.Schema({
  url:      String,
  publicId: String,
  type:     { type: String, enum: ['document', 'video', 'image', 'lien'], default: 'document' },
  titre:    String,
}, { _id: false });

const membreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role:   { type: String, enum: PROSIT_ROLES, required: true, default: 'membre' },

  // Contribution individuelle (phase recherche)
  contributionTexte:   { type: String, default: '' },
  contributionFichier: fichierSchema,
  contributionAt:      { type: Date, default: null },
}, { _id: false });

const groupeSchema = new mongoose.Schema({
  nom:     { type: String, required: true },
  membres: [membreSchema],

  // Espace collaboratif — phase Aller
  motsClesIdentifies:    [String],
  problematiqueReformulee: { type: String, default: '' },
  hypotheses:            [String],
  planAction:            { type: String, default: '' },

  // Solution finale — phase Retour
  solutionTexte:   { type: String, default: '' },
  solutionFichier: fichierSchema,
  presenteAt:      { type: Date, default: null },

  // Évaluation par le tuteur (V1 = prof seul ; auto-évaluation en perspective)
  evaluation: {
    noteGlobale:  { type: Number, min: 0, max: 20, default: null },
    criteres:     [{
      nom:  { type: String, required: true },
      note: { type: Number, min: 0, max: 20, required: true },
    }],
    commentaire:  { type: String, default: '' },
    evaluePar:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    evalueAt:     { type: Date, default: null },
  },
}, { _id: true });

const grilleCritereSchema = new mongoose.Schema({
  critere:     { type: String, required: true },
  poids:       { type: Number, default: 25, min: 0, max: 100 },
  description: { type: String, default: '' },
}, { _id: false });

const ressourceSchema = new mongoose.Schema({
  titre: String,
  url:   String,
  type:  { type: String, enum: ['lien', 'document', 'video'], default: 'lien' },
}, { _id: false });

const prositSchema = new mongoose.Schema({
  // Métadonnées
  titre:                  { type: String, required: true, trim: true },
  description:            { type: String, default: '' },
  enonce:                 { type: String, required: true },
  motsCles:               [String],
  objectifsApprentissage: [String],

  // Contexte pédagogique
  courseId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  filiere:        { type: String, enum: ['ISIL', 'Management', 'Finance'], required: true },
  promotion:      { type: String, enum: ['L1', 'L2', 'L3'], required: true },
  caseEntreprise: { type: String, default: '' },

  // Calendrier
  dateAller:             { type: Date, required: true },
  dateRetour:            { type: Date, required: true },
  dureeRechercheJours:   { type: Number, default: 7, min: 1, max: 30 },

  // Création
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Workflow
  status: {
    type: String,
    enum: ['brouillon', 'aller', 'recherche', 'retour', 'evalue', 'archive'],
    default: 'brouillon',
    index: true,
  },

  // Configuration des groupes (paramétrée par le prof à la création)
  groupesConfig: {
    minMembres:     { type: Number, default: 4, min: 2, max: 12 },
    maxMembres:     { type: Number, default: 8, min: 2, max: 12 },
    formationMode: {
      type: String,
      enum: ['random', 'manual', 'student_choice'],
      default: 'random',
    },
  },

  groupes:    [groupeSchema],

  // Ressources jointes par le prof
  ressources: [ressourceSchema],

  // Grille d'évaluation
  grilleEvaluation: [grilleCritereSchema],

}, { timestamps: true });

prositSchema.index({ courseId: 1, status: 1 });
prositSchema.index({ filiere: 1, promotion: 1, status: 1 });
prositSchema.index({ 'groupes.membres.userId': 1 });
prositSchema.index({ createdBy: 1, status: 1 });

prositSchema.statics.PROSIT_ROLES = PROSIT_ROLES;

const Prosit = mongoose.model('Prosit', prositSchema);
export default Prosit;
export { PROSIT_ROLES };
