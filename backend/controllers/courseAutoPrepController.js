import mongoose from 'mongoose';
import AutoPrepJob from '../models/AutoPrepJob.js';
import Video from '../models/Video.js';
import Course from '../models/Course.js';
import VideoAnalysis from '../models/VideoAnalysis.js';
import courseAutoPrep from '../services/courseAutoPrep.js';

/**
 * courseAutoPrepController — Endpoints d'auto-préparation IA d'un cours.
 *
 * @description Le prof clique « ✨ Préparer ce cours avec l'IA » sur une
 * vidéo dont la transcription est disponible. On crée un AutoPrepJob,
 * on lance le pipeline 5-en-parallèle en arrière-plan (Promise.allSettled),
 * et le frontend poll GET /:jobId pour récupérer les résultats.
 *
 * Pédagogie : conformément à Lebrun (2007) et au principe de scénarisation
 * pédagogique, l'IA propose et le prof DISPOSE — rien n'est créé en DB
 * sans validation humaine via le formulaire AutoPrepReview.
 */

const DAILY_LIMIT_PER_USER = 5;

/**
 * Compte les auto-preps lancés par cet utilisateur dans les dernières 24h.
 */
async function countTodayJobs(userId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return AutoPrepJob.countDocuments({ userId, createdAt: { $gte: since } });
}

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/courses/:courseId/videos/:videoId/auto-prep
   Lance un job (asynchrone). Retourne le jobId immédiatement.
───────────────────────────────────────────────────────────────────────── */
export async function startAutoPrep(req, res) {
  try {
    const { courseId, videoId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ message: 'IDs invalides.' });
    }

    // Authz : prof propriétaire du cours OU admin
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Cours introuvable.' });
    if (req.user.role !== 'admin' && course.professorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ message: 'Vidéo introuvable.' });
    if (video.courseId.toString() !== courseId) {
      return res.status(400).json({ message: 'Cette vidéo n\'appartient pas à ce cours.' });
    }

    // Précondition : transcription disponible
    const analysis = await VideoAnalysis.findOne({ videoId });
    if (!analysis || analysis.status !== 'completed' || !analysis.transcript) {
      return res.status(412).json({
        message: 'Transcription non disponible. Lance d\'abord l\'analyse IA de la vidéo et attends la fin.',
        analysisStatus: analysis?.status || 'missing',
      });
    }

    // Quota journalier
    const todayCount = await countTodayJobs(req.user.id);
    if (todayCount >= DAILY_LIMIT_PER_USER) {
      return res.status(429).json({
        message: `Limite quotidienne atteinte (${DAILY_LIMIT_PER_USER} auto-preps/jour). Réessaye demain.`,
        used: todayCount,
        limit: DAILY_LIMIT_PER_USER,
      });
    }

    // Création du job en statut pending
    const job = await AutoPrepJob.create({
      videoId, courseId, userId: req.user.id, status: 'pending',
    });

    // Lance le pipeline en arrière-plan (fire-and-forget, non-bloquant)
    setImmediate(() => {
      courseAutoPrep.run({ jobId: job._id }).catch((err) => {
        console.error(`[autoPrep] Job ${job._id} crashed:`, err);
      });
    });

    res.status(202).json({
      jobId: job._id,
      status: 'pending',
      message: 'Auto-préparation lancée. Poll GET /api/courses/auto-prep-jobs/:jobId pour le suivi.',
    });
  } catch (err) {
    console.error('[autoPrepController] startAutoPrep:', err);
    res.status(500).json({ message: err.message });
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/courses/auto-prep-jobs/:jobId
   Statut + résultats (le frontend poll toutes les 3s pendant ~30-120s).
───────────────────────────────────────────────────────────────────────── */
export async function getAutoPrepJob(req, res) {
  try {
    const { jobId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: 'jobId invalide.' });
    }
    const job = await AutoPrepJob.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job introuvable.' });

    if (req.user.role !== 'admin' && job.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    res.json({
      _id:        job._id,
      videoId:    job.videoId,
      courseId:   job.courseId,
      status:     job.status,
      results:    job.results,
      errors:     job.errors,
      tokensUsedEstimate: job.tokensUsedEstimate,
      durationMs: job.durationMs,
      startedAt:  job.startedAt,
      completedAt:job.completedAt,
      createdAt:  job.createdAt,
    });
  } catch (err) {
    console.error('[autoPrepController] getAutoPrepJob:', err);
    res.status(500).json({ message: err.message });
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/courses/:courseId/videos/:videoId/auto-prep/latest
   Renvoie le dernier job pour cette vidéo (utile pour afficher
   « Préparation déjà effectuée le X » sur les boutons).
───────────────────────────────────────────────────────────────────────── */
export async function getLatestForVideo(req, res) {
  try {
    const { courseId, videoId } = req.params;
    const job = await AutoPrepJob.findOne({ videoId, courseId })
      .sort({ createdAt: -1 })
      .lean();
    if (!job) return res.json({ exists: false });

    if (req.user.role !== 'admin' && job.userId.toString() !== req.user.id) {
      // Pas le sien : on dit juste qu'il y en a un, sans détails
      return res.json({ exists: true, byOther: true });
    }

    res.json({
      exists: true,
      _id: job._id,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  } catch (err) {
    console.error('[autoPrepController] getLatestForVideo:', err);
    res.status(500).json({ message: err.message });
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/courses/auto-prep-jobs/:jobId/publish
   Body: { selections: { inVideoQuestions: [bool, ...], qcm: bool, outcomes: [bool, ...], prositSuggestion: bool, flashcards: [bool, ...] } }
   Crée en DB les éléments validés par le prof.
───────────────────────────────────────────────────────────────────────── */
export async function publishAutoPrep(req, res) {
  try {
    const { jobId } = req.params;
    const job = await AutoPrepJob.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job introuvable.' });
    if (req.user.role !== 'admin' && job.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }
    if (job.status !== 'completed') {
      return res.status(400).json({ message: 'Job non terminé, impossible de publier.' });
    }

    const { selections } = req.body || {};
    if (!selections || typeof selections !== 'object') {
      return res.status(400).json({ message: 'selections requis.' });
    }

    const result = await courseAutoPrep.publishResults(job, selections, req.user.id);

    // Pour le prosit, on retourne le payload pour redirection vers /prosits/new pré-rempli
    const prositSuggestionPayload = result.created.prositDraft
      ? job.results.find((r) => r.task === 'prositSuggestion')?.data || null
      : null;

    res.json({
      created: result.created,
      prositSuggestionPayload,
    });
  } catch (err) {
    console.error('[autoPrepController] publishAutoPrep:', err);
    res.status(500).json({ message: err.message });
  }
}
