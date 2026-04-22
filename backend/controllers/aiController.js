import Course from '../models/Course.js';
import Progress from '../models/Progress.js';
import User from '../models/User.js';
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
