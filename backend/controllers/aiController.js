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
const isAdmin   = (user) => user?.role === 'admin';

/**
 * Règle métier : un prof ne voit QUE les étudiants de ses cours.
 * Un étudiant est "dans un cours" s'il partage filière + promotion avec le cours.
 *
 * Retourne { courseIds: [], studentIds: [] } — listes vides pour un prof sans cours.
 * L'admin retourne null pour signaler "accès global".
 */
async function getTeacherScope(user) {
  if (isAdmin(user)) return null; // admin = pas de filtre

  const myCourses = await Course.find(
    { professorId: user.id, isActive: true },
    { _id: 1, filiere: 1, promotion: 1 }
  ).lean();

  if (myCourses.length === 0) {
    return { courseIds: [], studentIds: [] };
  }

  const filters = myCourses.map((c) => ({ filiere: c.filiere, promotion: c.promotion }));
  const students = await User.find(
    { role: 'etudiant', status: 'active', $or: filters },
    { _id: 1 }
  ).lean();

  return {
    courseIds: myCourses.map((c) => String(c._id)),
    studentIds: students.map((s) => String(s._id)),
  };
}

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

/* ─── GET /api/ai/my-risk/:courseId ───────────────────────────────────── */
/**
 * Version LÉGÈRE qui lit le niveau de risque depuis Progress (persisté par
 * l'automatisation après chaque QCM). Ne dépend PAS du microservice Python
 * — toujours rapide, toujours disponible.
 *
 * Utilisé par la bannière automatique sur StudentCourse.
 */
export async function myRiskForCourse(req, res) {
  const { courseId } = req.params;
  try {
    const progress = await Progress.findOne(
      { userId: req.user.id, courseId },
      { aiRiskLevel: 1, aiPredictedScore: 1, aiDropoutProbability: 1, aiRiskUpdatedAt: 1 }
    ).lean();

    res.json({
      dropout_risk_level:   progress?.aiRiskLevel || null,
      predicted_score:      progress?.aiPredictedScore ?? null,
      dropout_probability:  progress?.aiDropoutProbability ?? null,
      updated_at:           progress?.aiRiskUpdatedAt || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/* ─── GET /api/ai/at-risk (prof uniquement) ───────────────────────────── */
export async function atRiskStudents(req, res) {
  if (!isTeacher(req.user)) {
    return res.status(403).json({ message: 'Réservé aux professeurs et administrateurs.' });
  }

  const { courseId, limit } = req.query;

  try {
    // Vérifier que le prof demande bien un de SES cours (sinon 403)
    const scope = await getTeacherScope(req.user);
    if (scope && courseId && !scope.courseIds.includes(String(courseId))) {
      return res.status(403).json({ message: 'Ce cours ne vous appartient pas.' });
    }

    const data = await aiAtRiskStudents({
      courseId: courseId || null,
      limit: limit ? Number(limit) : 50,
    });

    // Filtrer les étudiants pour ne garder que ceux du prof (règle 1 prof = 1 promo/module)
    let students = data.students || [];
    if (scope) {
      const allowed = new Set(scope.studentIds);
      students = students.filter((s) => allowed.has(String(s.user_id)));
    }

    res.json({ students });
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
 * Vue agrégée pour le dashboard prof : stats de SES étudiants uniquement.
 * Respecte la règle métier "1 prof = 1 module / 1 promotion".
 * L'admin voit tout le monde.
 */
export async function classOverview(req, res) {
  if (!isTeacher(req.user)) {
    return res.status(403).json({ message: 'Réservé aux professeurs et administrateurs.' });
  }

  try {
    const scope = await getTeacherScope(req.user);
    const isAdminUser = scope === null;

    // --- Cohortes prof vs admin ---
    const studentFilter = isAdminUser
      ? { role: 'etudiant', status: 'active' }
      : { role: 'etudiant', status: 'active', _id: { $in: scope.studentIds } };

    const courseFilter = isAdminUser
      ? { isActive: true }
      : { isActive: true, _id: { $in: scope.courseIds } };

    const [totalStudents, totalCourses, myCourses] = await Promise.all([
      User.countDocuments(studentFilter),
      Course.countDocuments(courseFilter),
      Course.find(courseFilter, { titre: 1, filiere: 1, promotion: 1 }).lean(),
    ]);

    // --- At-risk depuis le service Python, puis filtrage prof ---
    let topAtRisk = [];
    try {
      const raw = await aiAtRiskStudents({ courseId: req.query.courseId || null, limit: 50 });
      let students = raw.students || [];
      if (!isAdminUser) {
        const allowed = new Set(scope.studentIds);
        students = students.filter((s) => allowed.has(String(s.user_id)));
      }
      topAtRisk = students.slice(0, 10);
    } catch {
      topAtRisk = [];
    }

    // --- Moyenne des scores QCM (uniquement sur les étudiants du prof) ---
    const progressFilter = isAdminUser
      ? {}
      : { userId: { $in: scope.studentIds } };

    const recentProgress = await Progress.find(progressFilter, { qcmScores: 1 })
      .limit(500)
      .lean();

    const allScores = recentProgress.flatMap((p) =>
      (p.qcmScores || []).map((s) => Number(s.score || 0))
    );
    const avgScore =
      allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : 0;

    res.json({
      scope: isAdminUser ? 'admin' : 'teacher',
      totalStudents,
      totalCourses,
      averageScore: avgScore,
      atRiskCount: topAtRisk.length,
      topAtRisk,
      myCourses: myCourses.map((c) => ({
        _id: String(c._id),
        titre: c.titre,
        filiere: c.filiere,
        promotion: c.promotion,
      })),
    });
  } catch (err) {
    handleAIError(res, err);
  }
}
