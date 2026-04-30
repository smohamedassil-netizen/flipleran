import mongoose from 'mongoose';

/**
 * LearningPath — Parcours d'apprentissage scénarisé.
 *
 * Permet au professeur d'organiser les ressources d'un cours (vidéos, QCM,
 * Prosits, lectures) en une séquence pédagogique cohérente. L'étudiant
 * progresse étape par étape, chaque étape se déverrouillant lorsque la
 * précédente est validée selon des critères configurables (ex. QCM ≥ 50%,
 * vidéo ≥ 70% visionnée).
 *
 * @description Ce modèle implémente la notion de **scénarisation pédagogique**
 * définie par Lebrun (2007), qui distingue le simple « dépôt de contenus »
 * d'un parcours intentionnellement structuré : le concepteur choisit
 * l'ordre, les transitions et les critères de progression pour orchestrer
 * une trajectoire d'apprentissage. Sans scénarisation, la classe inversée
 * dégénère en un sac de ressources sans articulation pédagogique.
 *
 * @see Lebrun, M. (2007). *Théories et méthodes pédagogiques pour enseigner
 *      et apprendre : quelle place pour les TIC dans l'éducation ?* (2e éd.).
 *      De Boeck, p. 142–157 (chapitre sur la scénarisation).
 *
 * Polymorphisme : `resourceModel` désigne la collection cible (Video, QCM,
 * Prosit, Resource) afin que `resourceId` puisse pointer vers l'une ou
 * l'autre. Mongoose ne suit pas la ref dynamiquement par populate ici ;
 * le controller hydrate manuellement chaque step à la lecture.
 */

const STEP_TYPES         = ['video', 'qcm', 'prosit', 'reading'];
const STEP_RESOURCE_MODELS = ['Video', 'QCM', 'Prosit', 'Resource'];

const unlockCriteriaSchema = new mongoose.Schema(
  {
    previousCompleted: { type: Boolean, default: true },
    minScore:          { type: Number, default: 50, min: 0, max: 100 },     // pour QCM
    minWatchPercent:   { type: Number, default: 70, min: 0, max: 100 },     // pour Video
  },
  { _id: false }
);

const stepSchema = new mongoose.Schema(
  {
    order:        { type: Number, required: true, min: 0 },
    type:         { type: String, enum: STEP_TYPES, required: true },
    resourceId:   { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'steps.resourceModel' },
    resourceModel:{ type: String, enum: STEP_RESOURCE_MODELS, required: true },
    title:        { type: String, default: '', trim: true },     // override optionnel
    isRequired:   { type: Boolean, default: true },
    unlockCriteria: { type: unlockCriteriaSchema, default: () => ({}) },
    estimatedMinutes: { type: Number, default: 0, min: 0 },
    customMessage:    { type: String, default: '', maxlength: 500, trim: true },
  },
  { _id: true }
);

const learningPathSchema = new mongoose.Schema(
  {
    courseId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, unique: true },
    title:       { type: String, default: 'Parcours d\'apprentissage', trim: true },
    description: { type: String, default: '' },
    steps:       { type: [stepSchema], default: [] },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    publishedAt: { type: Date, default: null },                  // null = brouillon
  },
  { timestamps: true }
);

learningPathSchema.index({ courseId: 1 }, { unique: true });
learningPathSchema.index({ publishedAt: 1 });

learningPathSchema.statics.STEP_TYPES           = STEP_TYPES;
learningPathSchema.statics.STEP_RESOURCE_MODELS = STEP_RESOURCE_MODELS;

const LearningPath = mongoose.model('LearningPath', learningPathSchema);
export default LearningPath;
export { STEP_TYPES, STEP_RESOURCE_MODELS };
