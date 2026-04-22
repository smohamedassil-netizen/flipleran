import Course from '../models/Course.js';
import Progress from '../models/Progress.js';
import QCM from '../models/QCM.js';
import User from '../models/User.js';
import Video from '../models/Video.js';
import VideoAnalysis from '../models/VideoAnalysis.js';
import { generateQuizQuestions } from '../services/chatbot.js';
import {
  aiAtRiskStudents,
  aiHealth,
  aiPredictForStudent,
  aiPredictFromFeatures,
  aiTrain,
} from '../services/aiService.js';

/* ─── Helpers ─────────────────────────────────────────────────────────── */
const isTeacher = (user) => user?.role === 'professeur' || user?.role === 'admin';
const isStudent = (user) => user?.role === 'etudiant';

function handleAIError(res, err, defaultStatus = 502) {
  const status = err.status || defaultStatus;
  const message =
    status === 503
      ? 'Les modèles IA ne sont pas encore entraînés. Lancez POST /api/ai/train d\'abord.'
      : err.message || 'Service IA indisponible.';
  return res.status(status).json({ message });
}

/* ─── GET /api/ai/health ──────────────────────────────────────────────── */
export async function getHealth(req, res) {
  try {
    const data = await aiHealth();
    res.json(data);
  } catch (err) {
    handleAIError(res, err);
  }
}

/* ─── POST /api/ai/train (admin/prof) ─────────────────────────────────── */
export async function trainModels(req, res) {
  if (!isTeacher(req.user)) {
    return res.status(403).json({ message: 'Réservé aux professeurs et administrateurs.' });
  }

  try {
    const data = await aiTrain({
      rebuildDataset: req.body?.rebuildDataset !== false,
    });
    res.json({
      message: 'Modèles entraînés avec succès.',
      ...data,
    });
  } catch (err) {
    handleAIError(res, err);
  }
}

/* ─── POST /api/ai/predict ────────────────────────────────────────────── */
/**
 * Body : soit { features: {...} } soit { userId, courseId }.
 * - Étudiants : ne peuvent prédire que pour eux-mêmes.
 * - Profs/Admin : peuvent prédire pour n'importe quel étudiant.
 */
export async function predict(req, res) {
  const { features, userId, courseId } = req.body || {};

  try {
    if (features && typeof features === 'object') {
      const result = await aiPredictFromFeatures(features);
      return res.json(result);
    }

    if (!userId || !courseId) {
      return res.status(400).json({
        message: 'Fournir soit "features" (objet), soit "userId" + "courseId".',
      });
    }

    if (isStudent(req.user) && String(userId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Vous ne pouvez prédire que votre propre profil.' });
    }

    const result = await aiPredictForStudent(userId, courseId);
    res.json(result);
  } catch (err) {
    handleAIError(res, err);
  }
}

/* ─── GET /api/ai/me/:courseId ────────────────────────────────────────── */
export async function predictForMe(req, res) {
  const { courseId } = req.params;
  if (!courseId) {
    return res.status(400).json({ message: 'courseId requis.' });
  }
  try {
    const result = await aiPredictForStudent(req.user.id, courseId);
    res.json(result);
  } catch (err) {
    handleAIError(res, err);
  }
}

/* ─── GET /api/ai/at-risk (prof uniquement) ───────────────────────────── */
export async function atRiskStudents(req, res) {
  if (!isTeacher(req.user)) {
    return res.status(403).json({ message: 'Réservé aux professeurs et administrateurs.' });
  }

  const { courseId, limit } = req.query;

  try {
    const data = await aiAtRiskStudents({
      courseId: courseId || null,
      limit: limit ? Number(limit) : 50,
    });
    res.json(data);
  } catch (err) {
    handleAIError(res, err);
  }
}

/* ─── GET /api/ai/personalized-review/:courseId (étudiant) ─────────────── */
/**
 * Plan de rattrapage personnalisé combinant ML (TensorFlow) + LLM (Groq).
 *
 * Workflow :
 *   1. Modèles TF → prédiction du score + probabilité de décrochage
 *   2. MongoDB → identification des vidéos/QCM où l'étudiant est le plus faible
 *   3. Groq → génération de QCM ciblés sur ces points faibles
 *
 * Retourne un plan d'action complet que le frontend peut afficher.
 */
export async function personalizedReview(req, res) {
  const { courseId } = req.params;
  const userId = req.user.id;

  try {
    const course = await Course.findById(courseId).lean();
    if (!course) return res.status(404).json({ message: 'Cours introuvable.' });

    // 1. Prédiction ML via le microservice Python (peut échouer si modèles pas entraînés)
    let prediction = null;
    try {
      prediction = await aiPredictForStudent(userId, courseId);
    } catch {
      // On continue sans prédiction — le plan reste utile via l'analyse des QCM passés
    }

    // 2. Identifier les vidéos faibles via l'historique QCM de l'étudiant
    const videos = await Video.find({ courseId }, { titre: 1, description: 1 }).lean();
    const videoIds = videos.map((v) => v._id);

    const qcmsWithResults = await QCM.find(
      { videoId: { $in: videoIds } },
      { videoId: 1, titre: 1, resultats: 1 }
    ).lean();

    const videoById = new Map(videos.map((v) => [String(v._id), v]));

    const scoresByVideo = qcmsWithResults
      .map((qcm) => {
        const userResults = (qcm.resultats || []).filter(
          (r) => String(r.userId) === String(userId)
        );
        if (userResults.length === 0) return null;
        const avg = userResults.reduce((sum, r) => sum + Number(r.score || 0), 0) / userResults.length;
        const video = videoById.get(String(qcm.videoId));
        return video
          ? {
              videoId: String(qcm.videoId),
              title: video.titre,
              description: video.description || '',
              avgScore: Math.round(avg),
              attempts: userResults.length,
            }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.avgScore - b.avgScore);

    // Les 3 pires (ou ce qu'on a)
    const weakVideos = scoresByVideo.slice(0, 3);

    // Si aucun QCM passé, on prend les premières vidéos du cours en fallback
    const targetVideos = weakVideos.length > 0
      ? weakVideos
      : videos.slice(0, 2).map((v) => ({
          videoId: String(v._id),
          title: v.titre,
          description: v.description || '',
          avgScore: null,
          attempts: 0,
        }));

    // 3. Récupérer les concepts clés depuis les VideoAnalysis (si disponibles)
    const analyses = await VideoAnalysis.find(
      { videoId: { $in: targetVideos.map((v) => v.videoId) }, status: 'completed' },
      { videoId: 1, keyConcepts: 1, summary: 1 }
    ).lean();

    const analysisByVideo = new Map(analyses.map((a) => [String(a.videoId), a]));

    // 4. Générer des QCM personnalisés via Groq, ciblés sur la vidéo la plus faible
    let generatedQcm = [];
    const topWeak = targetVideos[0];
    if (topWeak) {
      const analysis = analysisByVideo.get(topWeak.videoId);
      const conceptsContext = analysis?.keyConcepts?.length
        ? `Concepts clés à maîtriser : ${analysis.keyConcepts.map((c) => c.term).join(', ')}.`
        : '';
      const weakContext = topWeak.avgScore != null
        ? `L'étudiant a obtenu ${topWeak.avgScore}/100 sur ce sujet en ${topWeak.attempts} tentative(s).`
        : 'L\'étudiant n\'a pas encore tenté ce chapitre.';

      const description = [
        course.description,
        weakContext,
        conceptsContext,
        'Propose des questions de révision progressives adaptées à un étudiant en difficulté.',
      ].filter(Boolean).join(' ');

      try {
        generatedQcm = await generateQuizQuestions(topWeak.title, description, 5);
      } catch (err) {
        console.warn('[personalizedReview] Groq QCM generation failed:', err.message);
        generatedQcm = [];
      }
    }

    // 5. Message motivationnel basé sur le niveau de risque prédit
    const riskLevel = prediction?.dropout_risk_level || 'inconnu';
    const motivationByRisk = {
      'critique': 'Il est urgent de reprendre contact avec les bases. Concentre-toi sur ces exercices — un suivi rapproché avec ton professeur est recommandé.',
      'élevé':    'Tu as pris du retard mais c\'est rattrapable. Consacre 30 minutes par jour à ces révisions ciblées.',
      'modéré':   'Tu es sur la bonne voie, quelques points à consolider. Ces exercices vont t\'aider à progresser.',
      'faible':   'Très bon profil — continue comme ça. Ces exercices te permettront d\'aller encore plus loin.',
      'inconnu':  'Voici un plan de révision ciblé sur tes points à améliorer.',
    };

    res.json({
      course: { _id: String(course._id), titre: course.titre },
      prediction,
      weakVideos: targetVideos,
      generatedQcm,
      motivation: motivationByRisk[riskLevel],
    });
  } catch (err) {
    console.error('[personalizedReview] Error:', err.message);
    res.status(500).json({ message: 'Impossible de générer le plan de rattrapage.', error: err.message });
  }
}

/* ─── GET /api/ai/overview (prof uniquement) ──────────────────────────── */
/**
 * Vue agrégée pour le dashboard prof : stats globales + top étudiants à risque.
 * Combine les prédictions IA avec des stats MongoDB classiques.
 */
export async function classOverview(req, res) {
  if (!isTeacher(req.user)) {
    return res.status(403).json({ message: 'Réservé aux professeurs et administrateurs.' });
  }

  try {
    const [totalStudents, totalCourses, atRisk] = await Promise.all([
      User.countDocuments({ role: 'etudiant', status: 'active' }),
      Course.countDocuments({ isActive: true }),
      aiAtRiskStudents({ courseId: req.query.courseId || null, limit: 10 }).catch(() => ({ students: [] })),
    ]);

    // Moyenne générale des scores QCM récents
    const recentProgress = await Progress.find({}, { qcmScores: 1 }).limit(500).lean();
    const allScores = recentProgress.flatMap((p) =>
      (p.qcmScores || []).map((s) => Number(s.score || 0))
    );
    const avgScore =
      allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : 0;

    res.json({
      totalStudents,
      totalCourses,
      averageScore: avgScore,
      atRiskCount: atRisk.students?.length || 0,
      topAtRisk: atRisk.students || [],
    });
  } catch (err) {
    handleAIError(res, err);
  }
}
