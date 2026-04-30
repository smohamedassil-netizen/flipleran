import mongoose from 'mongoose';

/**
 * ProjectPeerReview — Peer review structurée entre étudiants sur les
 * livrables d'un projet (F9 sprint-final).
 *
 * Cadre théorique :
 * @see Topping, K. (1998). *Peer Assessment Between Students in Colleges
 *      and Universities*. Review of Educational Research, 68(3), 249–276.
 *      L'anonymat par défaut réduit le biais de complaisance.
 * @see Falchikov, N. (2005). *Improving Assessment through Student
 *      Involvement*. La métacognition (réviser le travail des pairs)
 *      est un levier d'apprentissage en soi, pas juste un outil d'évaluation.
 * @see Boud, D. & Falchikov, N. (2007). *Rethinking Assessment in Higher
 *      Education*. La peer-review formative > peer-review sommative.
 *
 * Distinction avec les structures existantes :
 *  - Project.evaluations[] : peer-assessment global libre en fin de projet
 *    (existant). Toujours utilisable.
 *  - Prosit.peerAssessments[] : peer-assessment dans le cadre Prosit/CESI,
 *    sur les rôles et la dynamique de groupe (existant via F2).
 *  - ProjectPeerReview (F9) : reviews CIBLÉES sur un livrable précis,
 *    avec auto-pairing reviewer→target par le prof, anonymisation
 *    optionnelle. Formative pendant le projet, pas en fin.
 *
 * Auto-pairing :
 *  - Le prof active la peer-review pour un livrable (ou pour tous les
 *    livrables d'une phase).
 *  - L'algorithme assigne 2 reviewers par livrable, en s'assurant que
 *    chaque étudiant review 2x autres et soit reviewé 2x. Round-robin
 *    avec mélange aléatoire.
 *  - Évite l'auto-review et limite les paires intra-groupe pour avoir
 *    de vrais regards extérieurs.
 */

const PEER_REVIEW_CRITERIA = ['clarte', 'rigueur', 'originalite', 'utilite'];

const criterionScoreSchema = new mongoose.Schema({
  name:  { type: String, enum: PEER_REVIEW_CRITERIA, required: true },
  score: { type: Number, min: 1, max: 5, required: true },
}, { _id: false });

const projectPeerReviewSchema = new mongoose.Schema({
  projectId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  // Référence au livrable concerné (sub-doc dans Project.livrables)
  livrableId:   { type: mongoose.Schema.Types.ObjectId, required: true },
  // Optionnel : phase concernée (snapshot pour traçabilité)
  phaseId:      { type: mongoose.Schema.Types.ObjectId, default: null },
  reviewerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Statut : assigned (pas encore fait) → submitted (review déposée)
  status: {
    type: String,
    enum: ['assigned', 'submitted'],
    default: 'assigned',
    index: true,
  },
  criteria:    { type: [criterionScoreSchema], default: [] },
  comment:     { type: String, default: '', maxlength: 2000 },
  // Anonymisation : si true, le targetUserId ne voit pas qui l'a reviewé
  isAnonymous: { type: Boolean, default: true },
  // Deadline pour rendre la review (par défaut : projet.dateFin)
  deadline:    { type: Date, default: null },
  submittedAt: { type: Date, default: null },
}, { timestamps: true });

// Index composite : retrouver rapidement les reviews d'un user
projectPeerReviewSchema.index({ reviewerId: 1, status: 1 });
projectPeerReviewSchema.index({ targetUserId: 1, status: 1 });
// Évite les doublons de paires (1 reviewer review 1 target sur 1 livrable max)
projectPeerReviewSchema.index({ projectId: 1, livrableId: 1, reviewerId: 1, targetUserId: 1 }, { unique: true });

const ProjectPeerReview = mongoose.model('ProjectPeerReview', projectPeerReviewSchema);
export default ProjectPeerReview;
export { PEER_REVIEW_CRITERIA };
