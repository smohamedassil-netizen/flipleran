/**
 * qcmWrongAnswerCards.js — Génère des flashcards SM-2 à partir des questions
 * RATÉES d'un QCM, pour alimenter la révision espacée de l'étudiant.
 *
 * Promesse landing §4 : « L'évaluation pour apprendre — Les erreurs alimentent
 * la révision espacée, elles ne sanctionnent pas. »
 *
 * Workflow :
 *   1. Étudiant soumet un QCM.
 *   2. Si score < 80% → on prend les questions mal répondues (ou time-out).
 *   3. Pour chaque erreur, on crée une flashcard :
 *        front = libellé de la question
 *        back  = bonne réponse + explication
 *   4. Les cartes sont ajoutées au deck « Révision QCM — [titre QCM] » de
 *      l'étudiant (créé si inexistant).
 *   5. Déduplication par frontHash (SHA-1 court) : re-soumettre le même QCM
 *      avec les mêmes erreurs ne crée pas de doublons.
 *
 * Non-bloquant : toute erreur est loggée et n'interrompt pas la réponse HTTP
 * du QCM.
 *
 * @see Wozniak, P. (1990). SM-2 algorithm.
 * @see Black, P. & Wiliam, D. (1998). Assessment for learning.
 */

import crypto from 'crypto';
import Card from '../models/Card.js';
import Deck from '../models/Deck.js';

const QCM_REVIEW_DECK_TAG = 'auto-qcm-wrong';
const SCORE_TRIGGER_THRESHOLD = 80; // < 80% déclenche la génération

function computeFrontHash(front) {
  const normalized = String(front || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 16);
}

/**
 * Reformate la « bonne réponse » d'une question QCM pour figurer au verso
 * d'une flashcard. Gère les questions single-choice (A/B/C/D) et multi-choice.
 */
function formatCorrectAnswer(question) {
  const opts = question.options || {};
  if (Array.isArray(question.correctAnswers) && question.correctAnswers.length > 1) {
    return question.correctAnswers
      .map((letter) => `${letter}. ${opts[letter] ?? ''}`)
      .filter(Boolean)
      .join('\n');
  }
  const letter = question.correctAnswer;
  if (!letter) return '';
  return `${letter}. ${opts[letter] ?? ''}`;
}

/**
 * Trouve ou crée le deck « Révision QCM » pour un QCM donné chez l'étudiant.
 */
async function getOrCreateReviewDeck({ userId, qcm }) {
  const title = `Révision QCM — ${qcm.titre || 'sans titre'}`;
  let deck = await Deck.findOne({ owner: userId, title });
  if (deck) return deck;

  return Deck.create({
    owner: userId,
    title,
    description: 'Cartes générées automatiquement à partir des questions ratées de ce QCM. Méthode SM-2 (Wozniak, 1990). Promesse : l\'erreur est une ressource, pas une sanction (Black & Wiliam, 1998).',
    category: 'Révision QCM',
    isPublic: false,
    tags: [QCM_REVIEW_DECK_TAG, 'révision', 'qcm'],
  });
}

/**
 * Génère les flashcards depuis les réponses ratées d'une soumission QCM.
 *
 * @param {object} args
 * @param {string} args.userId
 * @param {object} args.qcm — Document QCM complet (avec questions populées)
 * @param {object[]} args.gradedAnswers — Tableau retourné par submitQCM, avec correct/timedOut
 * @param {number} args.score — Score 0-100
 * @returns {Promise<{ skipped?: boolean, reason?: string, deck?: object, createdCount: number, skippedCount: number }>}
 */
export async function generateFromQcmResult({ userId, qcm, gradedAnswers, score }) {
  if (!userId || !qcm || !Array.isArray(gradedAnswers)) {
    return { skipped: true, reason: 'missing-args', createdCount: 0, skippedCount: 0 };
  }

  if (score >= SCORE_TRIGGER_THRESHOLD) {
    return { skipped: true, reason: 'score-above-threshold', createdCount: 0, skippedCount: 0 };
  }

  // Collecte des questions ratées : incorrect OU time-out
  const wrongAnswers = gradedAnswers.filter((a) => !a.correct);
  if (wrongAnswers.length === 0) {
    return { skipped: true, reason: 'no-wrong-answers', createdCount: 0, skippedCount: 0 };
  }

  const deck = await getOrCreateReviewDeck({ userId, qcm });

  // Dédup : récupère les hashes déjà présents
  const existing = await Card.find({ deck: deck._id }).select('frontHash').lean();
  const existingHashes = new Set(existing.map((c) => c.frontHash).filter(Boolean));

  let createdCount = 0;
  let skippedCount = 0;

  for (const ga of wrongAnswers) {
    const question = qcm.questions.id(ga.questionId);
    if (!question) continue;

    const front = question.texte;
    const correctText = formatCorrectAnswer(question);
    const explanation = question.explanation ? `\n\n💡 ${question.explanation}` : '';
    const back = correctText + explanation;

    if (!front || !back) continue;

    const hash = computeFrontHash(front);
    if (existingHashes.has(hash)) {
      skippedCount++;
      continue;
    }

    try {
      await Card.create({
        deck: deck._id,
        front,
        back,
        difficulty: 'medium',
        source: 'auto-ai',
        frontHash: hash,
      });
      existingHashes.add(hash);
      createdCount++;
    } catch (err) {
      console.error('[qcmWrongAnswerCards] Card.create failed:', err.message);
    }
  }

  if (createdCount > 0) {
    deck.cardCount = (deck.cardCount || 0) + createdCount;
    await deck.save();
  }

  return { deck, createdCount, skippedCount };
}

export default { generateFromQcmResult };
