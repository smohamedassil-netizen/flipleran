import mongoose from 'mongoose';

/**
 * Modèle Prosit — refondu en "Cas pratique" (mai 2026).
 *
 * UI label : "Cas pratique" (le nom interne "Prosit" reste pour rétrocompat DB).
 *
 * Refonte 2026-05-09 :
 *   - 5 rôles → 3 rôles (animateur, scribe, membre)
 *   - 5 phases → 3 phases (cadrage, travail individuel, bilan)
 *   - 1 cas pratique = 1 groupe (avant : N groupes par Prosit)
 *   - Énoncé + ressources documentaires (avant : mots-clés + pistes à entrer manuellement)
 *   - Notation simplifiée : note individuelle (livrable) + note collective (documents)
 *
 * Workflow : planifie → cadrage_en_cours → travail_individuel → bilan_en_cours → evalue
 *
 * Champs LEGACY conservés pour rétrocompatibilité des données existantes :
 *   enonce, motsCles, objectifsApprentissage, filiere, promotion, caseEntreprise,
 *   dateAller, dateRetour, dureeRechercheJours, ressources, groupes (avec sous-docs),
 *   groupesConfig, grilleEvaluation, peerAssessment* (Falchikov/Topping), status (ancien enum)
 */

const PROSIT_ROLES_LEGACY = ['animateur', 'secretaire', 'scribe', 'gestionnaire', 'membre'];
const CAS_PRATIQUE_ROLES = ['animateur', 'scribe', 'membre'];

const STATUTS = ['planifie', 'cadrage_en_cours', 'travail_individuel', 'bilan_en_cours', 'evalue'];
const STATUS_LEGACY = ['brouillon', 'aller', 'recherche', 'retour', 'evalue', 'archive'];

/**
 * Critères d'évaluation par les pairs (peer assessment) — par défaut.
 * @see Topping, K. (1998). Peer Assessment Between Students in Colleges and Universities.
 * @see Falchikov, N. (2005). Improving Assessment through Student Involvement.
 */
const DEFAULT_PEER_CRITERIA = [
  { name: 'participation',   description: 'Présence et engagement durant les séances de groupe' },
  { name: 'contribution',    description: 'Qualité et quantité du travail individuel apporté' },
  { name: 'teamSpirit',      description: 'Capacité à coopérer, encourager, gérer les désaccords' },
  { name: 'deadlineRespect', description: 'Respect des échéances internes du groupe' },
  { name: 'listening',       description: 'Écoute active des coéquipiers et prise en compte de leurs idées' },
];

const fichierSchema = new mongoose.Schema({
  url:      String,
  publicId: String,
  type:     { type: String, enum: ['document', 'video', 'image', 'lien'], default: 'document' },
  titre:    String,
}, { _id: false });

/**
 * Détection de texte généré par IA (F2 sprint-final).
 * Score, flags, extrait court (200 chars). Texte intégral jamais stocké ici.
 * @see Mitchell et al. (2023) DetectGPT, Krishna et al. (2023).
 */
const aiDetectionSchema = new mongoose.Schema({
  aiProbability:  { type: Number, default: 0, min: 0, max: 100 },
  heuristicScore: { type: Number, default: 0, min: 0, max: 100 },
  groqScore:      { type: Number, default: null },
  flags:          [{ type: String }],
  reasons:        [{ type: String }],
  checkedAt:      { type: Date, default: null },
  textPreview:    { type: String, default: '', maxlength: 200 },
}, { _id: false });

// ════════════════════════════════════════════════════════════════════
// LEGACY SUB-SCHEMAS (rétrocompat — anciennes données)
// ════════════════════════════════════════════════════════════════════

const selfAssessmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  criteria: {
    effort:        { type: Number, min: 1, max: 5 },
    quality:       { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 },
  },
  reflection:  { type: String, default: '', maxlength: 1000 },
  completedAt: { type: Date, default: Date.now },
}, { _id: false });

const peerAssessmentSchema = new mongoose.Schema({
  evaluatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  criteria: {
    participation:   { type: Number, min: 1, max: 5 },
    contribution:    { type: Number, min: 1, max: 5 },
    teamSpirit:      { type: Number, min: 1, max: 5 },
    deadlineRespect: { type: Number, min: 1, max: 5 },
    listening:       { type: Number, min: 1, max: 5 },
  },
  comment:     { type: String, default: '', maxlength: 500 },
  isAnonymous: { type: Boolean, default: true },
  completedAt: { type: Date, default: Date.now },
}, { _id: false });

const finalIndividualScoreSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  profGroupScore:   { type: Number, min: 0, max: 20 },
  peerAverageScore: { type: Number, min: 0, max: 20 },
  finalScore:       { type: Number, min: 0, max: 20 },
  xpAwarded:        { type: Number, default: 0 },
  isFreeRider:      { type: Boolean, default: false },
  isMvc:            { type: Boolean, default: false },
  computedAt:       { type: Date, default: Date.now },
}, { _id: false });

const membreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role:   { type: String, enum: PROSIT_ROLES_LEGACY, required: true, default: 'membre' },
  contributionTexte:   { type: String, default: '' },
  contributionFichier: fichierSchema,
  contributionAt:      { type: Date, default: null },
  aiDetection: { type: aiDetectionSchema, default: null },
}, { _id: false });

const groupeSchema = new mongoose.Schema({
  nom:     { type: String, required: true },
  membres: [membreSchema],
  motsClesIdentifies:    [String],
  problematiqueReformulee: { type: String, default: '' },
  hypotheses:            [String],
  planAction:            { type: String, default: '' },
  solutionTexte:   { type: String, default: '' },
  solutionFichier: fichierSchema,
  presenteAt:      { type: Date, default: null },
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
  selfAssessments:       { type: [selfAssessmentSchema],       default: [] },
  peerAssessments:       { type: [peerAssessmentSchema],       default: [] },
  finalIndividualScores: { type: [finalIndividualScoreSchema], default: [] },
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

// ════════════════════════════════════════════════════════════════════
// NEW SUB-SCHEMAS (Cas pratique 2026-05)
// ════════════════════════════════════════════════════════════════════

const resourceSchema = new mongoose.Schema({
  type:        { type: String, enum: ['pdf', 'link', 'article'], default: 'link' },
  title:       { type: String, default: '' },
  url:         { type: String, default: '' },
  description: { type: String, default: '' },
}, { _id: false });

const groupMemberSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role:      { type: String, enum: CAS_PRATIQUE_ROLES, default: 'membre' },
}, { _id: false });

const cadrageDocumentSchema = new mongoose.Schema({
  motsCles:                [String],
  problematiqueReformulee: { type: String, default: '' },
  planAction:              [String],
  questionsOuvertes:       [String],
  redigePar:               { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  validatedBy:             [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  valideParGroupe:         { type: Boolean, default: false },
  completedAt:             { type: Date, default: null },
}, { _id: false });

const livrableSchema = new mongoose.Schema({
  studentId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contenu:         { type: String, default: '' },
  fichierUrl:      { type: String, default: '' },
  fichierPublicId: { type: String, default: '' },
  submittedAt:     { type: Date, default: Date.now },
  aiDetection:     { type: aiDetectionSchema, default: null },
}, { _id: false });

const bilanDocumentSchema = new mongoose.Schema({
  syntheseSolutions:  { type: String, default: '' },
  pointsAccomplis:    [String],
  pointsNonAccomplis: [String],
  apprentissages:     [String],
  redigePar:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  validatedBy:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  completedAt:        { type: Date, default: null },
}, { _id: false });

const noteSchema = new mongoose.Schema({
  studentId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  noteIndividuelle: { type: Number, min: 0, max: 20, default: null },
  noteCollective:   { type: Number, min: 0, max: 20, default: null },
  feedback:         { type: String, default: '' },
  notedAt:          { type: Date, default: Date.now },
}, { _id: false });

// ════════════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ════════════════════════════════════════════════════════════════════

const prositSchema = new mongoose.Schema({
  // ─── Métadonnées ─────────────────────────────────────────────────
  titre:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },

  // NEW : énoncé structuré (contexte + problématique séparés)
  contexte:       { type: String, default: '' },
  problematique:  { type: String, default: '' },

  // LEGACY : énoncé monobloc (avant la refonte)
  enonce:                 { type: String, default: '' },
  motsCles:               [String],
  objectifsApprentissage: [String],

  // ─── Contexte pédagogique ────────────────────────────────────────
  courseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  chapterIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' }], // NEW

  // LEGACY (filtres anciens)
  filiere:        { type: String, enum: ['ISIL', 'Management', 'Finance', 'Finance & Comptabilité'] },
  promotion:      { type: String, enum: ['L1', 'L2', 'L3'] },
  caseEntreprise: { type: String, default: '' },

  // ─── Calendrier ──────────────────────────────────────────────────
  // NEW
  phaseCadrageDate: { type: Date, default: null },
  phaseBilanDate:   { type: Date, default: null },
  // LEGACY
  dateAller:           { type: Date, default: null },
  dateRetour:          { type: Date, default: null },
  dureeRechercheJours: { type: Number, default: 7, min: 1, max: 30 },

  // ─── Création ────────────────────────────────────────────────────
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // ─── Statut (NEW enum) ───────────────────────────────────────────
  statut: {
    type: String,
    enum: STATUTS,
    default: 'planifie',
    index: true,
  },
  // LEGACY status (ancien enum) — gardé pour les Prosits non encore migrés
  status: {
    type: String,
    enum: STATUS_LEGACY,
    default: 'brouillon',
  },

  // ─── Ressources documentaires (NEW) ──────────────────────────────
  resources: { type: [resourceSchema], default: [] },
  // LEGACY
  ressources: { type: [ressourceSchema], default: [] },

  // ─── Groupe unique (NEW : 1 cas pratique = 1 groupe) ─────────────
  groupMembers: { type: [groupMemberSchema], default: [] },

  // ─── Documents collectifs (NEW) ──────────────────────────────────
  cadrageDocument: { type: cadrageDocumentSchema, default: () => ({}) },
  bilanDocument:   { type: bilanDocumentSchema,   default: () => ({}) },

  // ─── Livrables individuels (NEW) ─────────────────────────────────
  livrables: { type: [livrableSchema], default: [] },

  // ─── Évaluation (NEW : prof-only, simplifié) ─────────────────────
  notes: { type: [noteSchema], default: [] },

  // ─── LEGACY : groupes multiples + groupesConfig ──────────────────
  groupesConfig: {
    minMembres:    { type: Number, default: 4, min: 2, max: 12 },
    maxMembres:    { type: Number, default: 8, min: 2, max: 12 },
    formationMode: {
      type: String,
      enum: ['random', 'manual', 'student_choice'],
      default: 'manual',
    },
  },
  groupes: { type: [groupeSchema], default: [] },

  // ─── LEGACY : grille + peer-assessment Falchikov/Topping ─────────
  grilleEvaluation:       { type: [grilleCritereSchema], default: [] },
  peerAssessmentEnabled:  { type: Boolean, default: false },
  peerAssessmentDeadline: { type: Date, default: null },
  peerAssessmentCriteria: { type: [grilleCritereSchema], default: [] },
}, { timestamps: true });

/**
 * Pré-save : si statut est défini (nouveau flow), garder status (legacy) en
 * cohérence pour les anciens controllers qui pourraient encore lire status.
 */
prositSchema.pre('save', function (next) {
  if (this.isModified('statut') && this.statut) {
    const map = {
      planifie:            'brouillon',
      cadrage_en_cours:    'aller',
      travail_individuel:  'recherche',
      bilan_en_cours:      'retour',
      evalue:              'evalue',
    };
    if (map[this.statut]) this.status = map[this.statut];
  }
  next();
});

prositSchema.index({ courseId: 1, statut: 1 });
prositSchema.index({ filiere: 1, promotion: 1, statut: 1 });
prositSchema.index({ 'groupMembers.studentId': 1 });
prositSchema.index({ 'groupes.membres.userId': 1 });
prositSchema.index({ createdBy: 1, statut: 1 });

prositSchema.statics.PROSIT_ROLES = PROSIT_ROLES_LEGACY;
prositSchema.statics.CAS_PRATIQUE_ROLES = CAS_PRATIQUE_ROLES;
prositSchema.statics.STATUTS = STATUTS;
prositSchema.statics.DEFAULT_PEER_CRITERIA = DEFAULT_PEER_CRITERIA;

// Alias rétrocompat : l'ancien nom `PROSIT_ROLES` est encore importé par
// prositController.js et services/prositXP.js — on le ré-exporte tel quel.
const PROSIT_ROLES = PROSIT_ROLES_LEGACY;

const Prosit = mongoose.model('Prosit', prositSchema);
export default Prosit;
export { PROSIT_ROLES, PROSIT_ROLES_LEGACY, CAS_PRATIQUE_ROLES, STATUTS, DEFAULT_PEER_CRITERIA };
