import mongoose from 'mongoose';

/**
 * LearningOutcome — Objectif d'apprentissage formulé selon la taxonomie de
 * Bloom révisée (Anderson & Krathwohl, 2001).
 *
 * @description Sous-document Mongoose réutilisable. Un objectif d'apprentissage
 * authentique doit nommer **ce que l'étudiant sera capable de faire** à la fin
 * de l'activité, formulé avec un verbe d'action observable, et positionné sur
 * un des six niveaux cognitifs de la taxonomie révisée. Cette explicitation
 * est le pivot de l'**alignement constructif** (Biggs, 1996) : objectifs,
 * activités d'apprentissage et critères d'évaluation doivent être cohérents
 * pour produire un dispositif pédagogique efficace.
 *
 * Niveaux Bloom (Anderson & Krathwohl, 2001) :
 *   - remember   : restituer une information (identifier, lister, nommer)
 *   - understand : interpréter / expliquer (résumer, classer, comparer)
 *   - apply      : utiliser une procédure (implémenter, calculer, exécuter)
 *   - analyze    : décomposer, mettre en relation (différencier, structurer)
 *   - evaluate   : juger, critiquer (justifier, critiquer, vérifier)
 *   - create     : produire du nouveau (concevoir, formuler, planifier)
 *
 * @see Bloom, B. S. (Ed.) (1956). *Taxonomy of Educational Objectives,
 *      Handbook I: The Cognitive Domain*. David McKay.
 * @see Anderson, L. W., & Krathwohl, D. R. (Eds.) (2001). *A Taxonomy for
 *      Learning, Teaching, and Assessing: A Revision of Bloom's Taxonomy
 *      of Educational Objectives*. Longman.
 * @see Biggs, J. (1996). Enhancing teaching through constructive alignment.
 *      *Higher Education*, 32(3), 347–364.
 */

export const BLOOM_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

const learningOutcomeSchema = new mongoose.Schema({
  statement:        { type: String, required: true, trim: true },
  bloomLevel:       { type: String, enum: BLOOM_LEVELS, required: true },
  estimatedMinutes: { type: Number, default: 30, min: 0 },
}, { _id: true });

export default learningOutcomeSchema;
