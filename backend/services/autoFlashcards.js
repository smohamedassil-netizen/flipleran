import crypto from 'crypto';
import Card from '../models/Card.js';
import Deck from '../models/Deck.js';
import Video from '../models/Video.js';
import Course from '../models/Course.js';
import VideoAnalysis from '../models/VideoAnalysis.js';
import Progress from '../models/Progress.js';
import User from '../models/User.js';
import { generateFlashcards } from './courseAutoPrep.js';

/**
 * autoFlashcards — Service de génération automatique de flashcards pour
 * l'étudiant à partir des vidéos qu'il a complétées.
 *
 * Cadre théorique :
 * @see Ebbinghaus, H. (1885). *Über das Gedächtnis*. La courbe de l'oubli
 *      justifie la nécessité d'une révision espacée pour fixer durablement.
 * @see Wozniak, P. (1990). *Optimization of repetition spacing in the
 *      practice of learning*. Algorithme SuperMemo / SM-2 — base du modèle
 *      d'intervalle utilisé par Card (interval, easeFactor, repetitions).
 *
 * Décisions de design :
 *  - On RÉUTILISE generateFlashcards de courseAutoPrep.js (même prompt Groq
 *    Llama-3.3) au lieu de dupliquer. Le service prof et le service étudiant
 *    convergent ainsi sur la même qualité de cards.
 *  - 1 vidéo = 1 deck "Révision auto — [titre]" par étudiant. Si l'étudiant
 *    rejoue une vidéo on append au même deck (déduplication par frontHash).
 *  - Tag 'auto-ai' sur le deck pour le filtrage côté Decks.jsx.
 *  - Aucun appel Groq si le transcript Whisper n'est pas encore disponible
 *    (VideoAnalysis.status !== 'completed') : on retourne { skipped: true }.
 *  - Le cron hebdo limite à 5 vidéos / étudiant / run pour rester sous le
 *    quota Groq gratuit même quand la cohorte grossit.
 */

const MAX_VIDEOS_PER_RUN = 5;
const AUTO_DECK_TAG = 'auto-ai';

/**
 * Hash court (16 chars) du front normalisé pour déduplication.
 */
export function computeFrontHash(front) {
  const normalized = String(front || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 16);
}

/**
 * Mappe la difficulty IA (1-5) sur l'enum Card ('easy'|'medium'|'hard').
 * Identique au mapping utilisé dans courseAutoPrep.publishResults pour rester
 * cohérent entre la voie prof et la voie étudiant.
 */
function mapDifficulty(d) {
  const n = Number(d);
  if (!Number.isFinite(n)) return 'medium';
  if (n <= 2) return 'easy';
  if (n >= 4) return 'hard';
  return 'medium';
}

/**
 * Trouve ou crée le deck "Révision auto" pour une vidéo donnée d'un étudiant.
 */
async function getOrCreateAutoDeck({ userId, video }) {
  const title = `Révision auto — ${video.titre}`;
  let deck = await Deck.findOne({ owner: userId, title });
  if (deck) return deck;

  deck = await Deck.create({
    owner: userId,
    title,
    description: `Cartes générées automatiquement à partir du transcript de cette vidéo. Méthode SM-2 (Wozniak, 1990).`,
    category: 'Révision IA',
    isPublic: false,
    tags: [AUTO_DECK_TAG, 'révision'],
  });
  return deck;
}

/**
 * Génère (et insère, dédupliquées) des flashcards pour UNE vidéo et UN
 * étudiant. Idempotent : appelable plusieurs fois sans créer de doublons.
 *
 * @param {object} args
 * @param {string} args.userId
 * @param {string} args.videoId
 * @returns {Promise<{ deck, createdCount, skippedCount, skipped?: true, reason? }>}
 */
export async function generateForVideo({ userId, videoId }) {
  const [user, video] = await Promise.all([
    User.findById(userId).select('_id role'),
    Video.findById(videoId).lean(),
  ]);
  if (!user || user.role !== 'etudiant') {
    return { skipped: true, reason: 'user-not-student', createdCount: 0, skippedCount: 0 };
  }
  if (!video) {
    return { skipped: true, reason: 'video-not-found', createdCount: 0, skippedCount: 0 };
  }

  const analysis = await VideoAnalysis.findOne({ videoId, status: 'completed' }).lean();
  if (!analysis?.transcript) {
    return { skipped: true, reason: 'no-transcript', createdCount: 0, skippedCount: 0 };
  }

  // Appel Groq — réutilise generateFlashcards de courseAutoPrep
  let cards = [];
  try {
    cards = await generateFlashcards({ video, transcript: analysis.transcript });
  } catch (err) {
    console.error('[autoFlashcards] Groq generateFlashcards failed:', err.message);
    return { skipped: true, reason: 'groq-error', error: err.message, createdCount: 0, skippedCount: 0 };
  }

  if (!cards.length) {
    return { skipped: true, reason: 'no-cards-generated', createdCount: 0, skippedCount: 0 };
  }

  const deck = await getOrCreateAutoDeck({ userId, video });

  // Récupère les hashes existants pour ce deck (dédup)
  const existing = await Card.find({ deck: deck._id }).select('frontHash').lean();
  const existingHashes = new Set(existing.map((c) => c.frontHash).filter(Boolean));

  let createdCount = 0;
  let skippedCount = 0;

  for (const c of cards) {
    const hash = computeFrontHash(c.front);
    if (existingHashes.has(hash)) {
      skippedCount++;
      continue;
    }
    try {
      await Card.create({
        deck: deck._id,
        front: c.front,
        back: c.back,
        difficulty: mapDifficulty(c.difficulty),
        source: 'auto-ai',
        sourceVideo: video._id,
        frontHash: hash,
      });
      existingHashes.add(hash);
      createdCount++;
    } catch (err) {
      console.error('[autoFlashcards] Card.create failed:', err.message);
    }
  }

  if (createdCount > 0) {
    deck.cardCount = (deck.cardCount || 0) + createdCount;
    await deck.save();
  }

  return { deck, createdCount, skippedCount };
}

/**
 * Génère pour TOUTES les vidéos vues par l'étudiant (max MAX_VIDEOS_PER_RUN
 * pour limiter les appels Groq). Utilisé par l'endpoint manuel et par le
 * cron hebdo.
 *
 * @param {string} userId
 * @param {object} [opts]
 * @param {string} [opts.courseId] — limiter à un cours précis
 * @param {string[]} [opts.videoIds] — limiter à une liste de vidéos
 * @param {number} [opts.limit] — défaut MAX_VIDEOS_PER_RUN
 */
export async function generateForStudent(userId, opts = {}) {
  const { courseId, videoIds, limit = MAX_VIDEOS_PER_RUN } = opts;

  // 1. Construire la liste des vidéos cibles
  let targetVideoIds = [];

  if (Array.isArray(videoIds) && videoIds.length) {
    targetVideoIds = videoIds.slice(0, limit);
  } else {
    const progressQuery = { userId };
    if (courseId) progressQuery.courseId = courseId;
    const progresses = await Progress.find(progressQuery).select('videosCompleted lastActivity').lean();

    // Aplatit + déduplique + limite
    const all = progresses.flatMap((p) => (p.videosCompleted || []).map(String));
    targetVideoIds = [...new Set(all)].slice(0, limit);
  }

  if (targetVideoIds.length === 0) {
    return { processedVideos: 0, results: [], totalCreated: 0, totalSkipped: 0 };
  }

  // 2. Génère vidéo par vidéo (séquentiel pour ne pas saturer Groq)
  const results = [];
  let totalCreated = 0;
  let totalSkipped = 0;

  for (const vid of targetVideoIds) {
    const r = await generateForVideo({ userId, videoId: vid });
    results.push({ videoId: vid, ...r });
    totalCreated += r.createdCount || 0;
    totalSkipped += r.skippedCount || 0;
  }

  return {
    processedVideos: targetVideoIds.length,
    results,
    totalCreated,
    totalSkipped,
  };
}

/**
 * Compte les cartes "à réviser maintenant" pour un étudiant — basé sur le
 * champ SM-2 nextReview. Utilisé par le widget dashboard.
 */
export async function getDueTodayCount(userId) {
  const decks = await Deck.find({ owner: userId }).select('_id').lean();
  if (!decks.length) return { count: 0, decks: [] };
  const deckIds = decks.map((d) => d._id);
  const now = new Date();

  const [count, dueByDeck] = await Promise.all([
    Card.countDocuments({ deck: { $in: deckIds }, nextReview: { $lte: now } }),
    Card.aggregate([
      { $match: { deck: { $in: deckIds }, nextReview: { $lte: now } } },
      { $group: { _id: '$deck', count: { $sum: 1 } } },
    ]),
  ]);

  return { count, decks: dueByDeck.map((d) => ({ deckId: d._id, count: d.count })) };
}

/**
 * Statistiques globales auto-ai pour un étudiant : nb de decks auto,
 * nb total de cartes auto, due today, dernière génération.
 */
export async function getStudentAutoStatus(userId) {
  const autoDecks = await Deck.find({
    owner: userId,
    tags: AUTO_DECK_TAG,
  }).select('_id title cardCount updatedAt createdAt').lean();

  const deckIds = autoDecks.map((d) => d._id);
  const totalAutoCards = deckIds.length
    ? await Card.countDocuments({ deck: { $in: deckIds }, source: 'auto-ai' })
    : 0;

  const due = await getDueTodayCount(userId);
  const lastRegen = autoDecks
    .map((d) => d.updatedAt || d.createdAt)
    .sort((a, b) => new Date(b) - new Date(a))[0] || null;

  return {
    autoDecksCount: autoDecks.length,
    autoCardsCount: totalAutoCards,
    dueToday: due.count,
    lastRegenAt: lastRegen,
    autoDecks: autoDecks.map((d) => ({
      _id: d._id,
      title: d.title,
      cardCount: d.cardCount,
      updatedAt: d.updatedAt,
    })),
  };
}

/**
 * Cron hebdo (dimanche 9h) : pour chaque étudiant actif ayant complété au
 * moins une vidéo dans les 7 derniers jours, regénère ses decks auto.
 *
 * Volontairement séquentiel et limité (MAX_VIDEOS_PER_RUN par étudiant) pour
 * éviter de saturer Groq sur le plan gratuit. Sur Render free tier ce cron
 * peut tomber pendant la veille du serveur ; le service est conçu pour être
 * idempotent — si on rate un dimanche, le suivant rattrape.
 */
export async function regenerateAllActiveStudents() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recent = await Progress.find({ lastActivity: { $gte: sevenDaysAgo } })
    .select('userId')
    .lean();
  const studentIds = [...new Set(recent.map((p) => String(p.userId)))];

  console.log(`[autoFlashcards/cron] ${studentIds.length} étudiants actifs à traiter`);

  let totalCreated = 0;
  let totalProcessed = 0;
  for (const sid of studentIds) {
    try {
      const r = await generateForStudent(sid);
      totalCreated += r.totalCreated;
      totalProcessed += r.processedVideos;
    } catch (err) {
      console.error(`[autoFlashcards/cron] user ${sid} failed:`, err.message);
    }
  }

  console.log(
    `[autoFlashcards/cron] terminé — ${totalProcessed} vidéos traitées, ${totalCreated} cartes créées`
  );
  return { studentsProcessed: studentIds.length, videosProcessed: totalProcessed, cardsCreated: totalCreated };
}

export default {
  generateForVideo,
  generateForStudent,
  getDueTodayCount,
  getStudentAutoStatus,
  regenerateAllActiveStudents,
  computeFrontHash,
};
