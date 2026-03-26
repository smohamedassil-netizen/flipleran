import Course   from '../models/Course.js';
import Video    from '../models/Video.js';
import QCM      from '../models/QCM.js';
import Progress from '../models/Progress.js';
import User     from '../models/User.js';

/**
 * GET /api/professor/dashboard/:courseId
 *
 * Retourne en une seule requête toutes les données nécessaires
 * au tableau de bord du professeur :
 *   - globalStats   : métriques agrégées du cours
 *   - videos        : suivi de visionnage par vidéo
 *   - qcmAnalysis   : performance par question pour chaque QCM
 *   - students      : liste complète des étudiants avec leur progression
 */
export const getCourseDashboard = async (req, res) => {
  try {
    const { courseId } = req.params;

    /* ── 1. Vérifier que le cours appartient au professeur ──────────────── */
    const course = await Course.findOne({
      _id:         courseId,
      professorId: req.user.id,
    });
    if (!course) {
      return res.status(404).json({ message: 'Cours introuvable ou accès refusé.' });
    }

    /* ── 2. Vidéos du cours ─────────────────────────────────────────────── */
    const videos = await Video.find({ courseId }).sort({ order: 1, createdAt: 1 });

    /* ── 3. Progress de tous les étudiants ─────────────────────────────── */
    const allProgress = await Progress.find({ courseId })
      .populate('userId', 'nom prenom email filiere promotion createdAt');

    const totalStudents = allProgress.length;

    /* ── 4. Suivi par vidéo ─────────────────────────────────────────────── */
    const videoStats = videos.map((v) => {
      const watchers     = v.watchedBy ?? [];
      const watchedCount = watchers.length;
      const completedCount = watchers.filter(
        (w) => w.completed || w.watchedPercent >= 80
      ).length;
      const avgPercent = watchedCount === 0
        ? 0
        : Math.round(watchers.reduce((s, w) => s + w.watchedPercent, 0) / watchedCount);

      // Taux de visionnage = étudiants qui ont commencé / total
      const watchRate = totalStudents === 0
        ? 0
        : Math.round((watchedCount / totalStudents) * 100);
      const completionRate = totalStudents === 0
        ? 0
        : Math.round((completedCount / totalStudents) * 100);

      return {
        _id:            v._id,
        titre:          v.titre,
        order:          v.order,
        duration:       v.duration,
        totalStudents,
        watchedCount,
        completedCount,
        avgPercent,
        watchRate,
        completionRate,
      };
    });

    /* ── 5. Analyse QCM par vidéo ───────────────────────────────────────── */
    const qcms = await QCM.find({
      videoId: { $in: videos.map((v) => v._id) },
    });

    const qcmAnalysis = qcms.map((qcm) => {
      const video         = videos.find((v) => v._id.toString() === qcm.videoId.toString());
      const totalAttempts = qcm.resultats.length;

      const questions = qcm.questions.map((q) => {
        const allAnswers = qcm.resultats.flatMap((r) => r.answers ?? []);
        const forThis    = allAnswers.filter(
          (a) => a.questionId?.toString() === q._id.toString()
        );
        const correctCount = forThis.filter((a) => a.correct).length;
        const timedOutCount = forThis.filter((a) => a.timedOut).length;
        const correctRate  = forThis.length === 0
          ? null   // null = pas encore de données
          : Math.round((correctCount / forThis.length) * 100);

        return {
          _id:          q._id,
          texte:        q.texte,
          correctAnswer:q.correctAnswer,
          correctRate,
          timedOutRate: forThis.length === 0 ? 0 : Math.round((timedOutCount / forThis.length) * 100),
          needsReview:  correctRate !== null && correctRate < 50,
          answerDist:   ['A', 'B', 'C', 'D'].reduce((acc, opt) => {
            acc[opt] = forThis.filter((a) => a.answer === opt).length;
            return acc;
          }, {}),
        };
      });

      const avgScore = totalAttempts === 0
        ? null
        : Math.round(qcm.resultats.reduce((s, r) => s + r.score, 0) / totalAttempts);

      return {
        qcmId:          qcm._id,
        videoId:        qcm.videoId,
        videoTitre:     video?.titre ?? '',
        qcmTitre:       qcm.titre,
        totalAttempts,
        avgScore,
        questions,
        hasWeakQuestions: questions.some((q) => q.needsReview),
      };
    });

    /* ── 6. Liste étudiants ─────────────────────────────────────────────── */
    const students = allProgress.map((p) => {
      const user = p.userId;

      // Vidéos complétées par cet étudiant
      const videosCompletedIds = new Set(
        (p.videosCompleted ?? []).map((id) => id.toString())
      );

      // Aussi compter via watchedBy sur les vidéos
      let videosDoneCount = videosCompletedIds.size;
      // Fallback : parcourir watchedBy de chaque vidéo
      if (videosDoneCount === 0) {
        videosDoneCount = videos.filter((v) =>
          (v.watchedBy ?? []).some(
            (w) =>
              w.userId.toString() === user._id.toString() &&
              (w.completed || w.watchedPercent >= 80)
          )
        ).length;
      }

      // Score QCM moyen
      const scores    = (p.qcmScores ?? []).map((s) => s.score);
      const avgQCM    = scores.length === 0
        ? null
        : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

      // Progression vidéo moyenne
      let totalWatched = 0;
      let watchedCount = 0;
      videos.forEach((v) => {
        const entry = (v.watchedBy ?? []).find(
          (w) => w.userId.toString() === user._id.toString()
        );
        if (entry) {
          totalWatched += entry.watchedPercent;
          watchedCount++;
        }
      });
      const avgVideoPercent = watchedCount === 0
        ? 0
        : Math.round(totalWatched / watchedCount);

      return {
        _id:              user._id,
        nom:              user.nom,
        prenom:           user.prenom,
        email:            user.email,
        filiere:          user.filiere,
        promotion:        user.promotion,
        videosDone:       videosDoneCount,
        totalVideos:      videos.length,
        avgVideoPercent,
        avgQCMScore:      avgQCM,
        qcmAttempts:      scores.length,
        lastActivity:     p.lastActivity,
      };
    });

    /* ── 7. Métriques globales ──────────────────────────────────────────── */
    const avgVideoCompletion = videoStats.length === 0
      ? 0
      : Math.round(videoStats.reduce((s, v) => s + v.completionRate, 0) / videoStats.length);

    const qcmScoresFlat = allProgress.flatMap((p) => (p.qcmScores ?? []).map((s) => s.score));
    const avgQCMScore   = qcmScoresFlat.length === 0
      ? null
      : Math.round(qcmScoresFlat.reduce((a, b) => a + b, 0) / qcmScoresFlat.length);

    res.json({
      course: {
        _id:       course._id,
        titre:     course.titre,
        filiere:   course.filiere,
        promotion: course.promotion,
      },
      globalStats: {
        totalStudents,
        avgVideoCompletion,
        avgQCMScore,
        totalVideos: videos.length,
        totalQCMs:   qcms.length,
      },
      videoStats,
      qcmAnalysis,
      students,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/professor/courses
 * Liste des cours du professeur connecté (pour le sélecteur).
 */
export const getProfessorCourses = async (req, res) => {
  try {
    const courses = await Course.find({ professorId: req.user.id }).sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
