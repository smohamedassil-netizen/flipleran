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

/**
 * Critères d'évaluation par les pairs (peer assessment) — par défaut.
 *
 * @description Tels que définis dans la littérature sur le peer assessment
 * collaboratif (Topping, 1998 ; Falchikov, 2005), ces 5 critères couvrent
 * les dimensions comportementales que seuls les coéquipiers peuvent juger
 * (et que le prof ne peut pas observer en présentiel ponctuel).
 *
 * @see Topping, K. (1998). Peer Assessment Between Students in Colleges and
 *      Universities. *Review of Educational Research*, 68(3), 249–276.
 * @see Falchikov, N. (2005). *Improving Assessment through Student
 *      Involvement*. RoutledgeFalmer.
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
 * Auto-évaluation d'un membre sur son propre travail dans le Prosit.
 * Falchikov (2005) souligne que la métacognition (réflexion sur son propre
 * apprentissage) est un levier essentiel quand elle est combinée à l'évaluation
 * par les pairs.
 */
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

/**
 * Évaluation d'un coéquipier par un autre membre.
 * Topping (1998) recommande l'anonymat par défaut pour réduire le biais de
 * complaisance et le risque de représailles relationnelles.
 */
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

/**
 * Note finale individualisée combinant la note de groupe du prof (70%) et
 * la moyenne des évaluations par les pairs reçues (30%).
 */
const finalIndividualScoreSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  profGroupScore:   { type: Number, min: 0, max: 20 },
  peerAverageScore: { type: Number, min: 0, max: 20 },
  finalScore:       { type: Number, min: 0, max: 20 },
  xpAwarded:        { type: Number, default: 0 },
  isFreeRider:      { type: Boolean, default: false },
  isMvc:            { type: Boolean, default: false },   // Most Valuable Contributor
  computedAt:       { type: Date, default: Date.now },
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

  // Évaluation par le tuteur (note de groupe)
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

  // Auto-évaluations + évaluations par les pairs (Falchikov 2005, Topping 1998)
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

const prositSchema = new mongoose.Schema({
  // Métadonnées
  titre:                  { type: String, required: true, trim: true },
  description:            { type: String, default: '' },
  enonce:                 { type: String, required: true },
  motsCles:               [String],
  objectifsApprentissage: [String],

  // Contexte pédagogique
  // courseId rendu optionnel : un Prosit peut être autonome (transverse,
  // workshop hors module) ou rattaché à un cours pour ancrage pédagogique.
  courseId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
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

  // Évaluation par les pairs (méta-config au niveau Prosit)
  peerAssessmentEnabled:  { type: Boolean, default: true },
  peerAssessmentDeadline: { type: Date, default: null },          // par défaut dateRetour + 3j
  peerAssessmentCriteria: { type: [grilleCritereSchema], default: () =>
    DEFAULT_PEER_CRITERIA.map((c) => ({
      critere: c.name, poids: 20, description: c.description,
    }))
  },
}, { timestamps: true });

/**
 * Pré-save : si la deadline d'évaluation par les pairs n'a pas été fixée,
 * on la calcule à dateRetour + 3 jours (compromis entre laisser le temps
 * de réfléchir et finaliser le Prosit avant la transition).
 */
prositSchema.pre('save', function (next) {
  if (this.peerAssessmentEnabled && !this.peerAssessmentDeadline && this.dateRetour) {
    const d = new Date(this.dateRetour);
    d.setDate(d.getDate() + 3);
    this.peerAssessmentDeadline = d;
  }
  next();
});

prositSchema.index({ courseId: 1, status: 1 });
prositSchema.index({ filiere: 1, promotion: 1, status: 1 });
prositSchema.index({ 'groupes.membres.userId': 1 });
prositSchema.index({ createdBy: 1, status: 1 });

prositSchema.statics.PROSIT_ROLES = PROSIT_ROLES;
prositSchema.statics.DEFAULT_PEER_CRITERIA = DEFAULT_PEER_CRITERIA;

const Prosit = mongoose.model('Prosit', prositSchema);
export default Prosit;
export { PROSIT_ROLES, DEFAULT_PEER_CRITERIA };
