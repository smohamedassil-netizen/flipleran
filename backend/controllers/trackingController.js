import Course from '../models/Course.js';
import Video from '../models/Video.js';
import QCM from '../models/QCM.js';
import User from '../models/User.js';
import Progress from '../models/Progress.js';
import { pushNotification } from '../services/notificationService.js';

/**
 * GET /api/tracking/course/:courseId
 * Vue prof : pour chaque étudiant du cours, indique :
 *  - progression vidéos (vues / total)
 *  - progression QCM (complétés / total, moyenne)
 *  - listes des vidéos/QCM non complétés
 *  - date de dernière activité
 */
export const getCourseTracking = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).select('titre filiere promotion professorId');
    if (!course) return res.status(404).json({ message: 'Cours introuvable' });

    // Le prof doit être propriétaire, ou admin
    if (req.user.role !== 'admin' && course.professorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const [videos, qcms, students, progresses] = await Promise.all([
      Video.find({ courseId }).select('titre deadline watchedBy'),
      QCM.find({}).populate({ path: 'videoId', match: { courseId }, select: 'courseId' })
        .select('titre deadline resultats videoId'),
      User.find({
        role: 'etudiant',
        isActive: { $ne: false },
        filiere: course.filiere,
        promotion: course.promotion,
      }).select('_id nom prenom email avatar'),
      Progress.find({ courseId }).select('userId lastActivity'),
    ]);

    const courseQcms = qcms.filter(q => q.videoId); // filtre sur videoId du cours
    const progressMap = new Map(progresses.map(p => [p.userId.toString(), p]));

    const rows = students.map(student => {
      const sid = student._id.toString();

      const watchedCount = videos.filter(v =>
        v.watchedBy.some(w => w.userId.toString() === sid && w.completed)
      ).length;

      const missingVideos = videos
        .filter(v => !v.watchedBy.some(w => w.userId.toString() === sid && w.completed))
        .map(v => ({ _id: v._id, titre: v.titre, deadline: v.deadline }));

      const qcmResults = courseQcms.map(q => {
        const result = q.resultats.find(r => r.userId.toString() === sid);
        return { qcm: q, done: !!result, score: result?.score ?? null };
      });

      const qcmDoneCount = qcmResults.filter(r => r.done).length;
      const qcmScores = qcmResults.filter(r => r.done).map(r => r.score);
      const avgScore = qcmScores.length
        ? Math.round(qcmScores.reduce((a, b) => a + b, 0) / qcmScores.length)
        : null;

      const missingQcms = qcmResults
        .filter(r => !r.done)
        .map(r => ({ _id: r.qcm._id, titre: r.qcm.titre, deadline: r.qcm.deadline, videoId: r.qcm.videoId._id }));

      const lastActivity = progressMap.get(sid)?.lastActivity || null;

      return {
        student: {
          _id: student._id,
          nom: student.nom,
          prenom: student.prenom,
          email: student.email,
          avatar: student.avatar,
        },
        videos: {
          total: videos.length,
          completed: watchedCount,
          percent: videos.length ? Math.round((watchedCount / videos.length) * 100) : 0,
          missing: missingVideos,
        },
        qcm: {
          total: courseQcms.length,
          completed: qcmDoneCount,
          percent: courseQcms.length ? Math.round((qcmDoneCount / courseQcms.length) * 100) : 0,
          avgScore,
          missing: missingQcms,
        },
        lastActivity,
        inactive: !lastActivity || (Date.now() - new Date(lastActivity).getTime()) > 7 * 24 * 3600 * 1000,
      };
    });

    // Stats globales du cours
    const totalStudents = rows.length;
    const avgVideoPercent = totalStudents
      ? Math.round(rows.reduce((a, r) => a + r.videos.percent, 0) / totalStudents)
      : 0;
    const avgQcmPercent = totalStudents
      ? Math.round(rows.reduce((a, r) => a + r.qcm.percent, 0) / totalStudents)
      : 0;
    const inactiveCount = rows.filter(r => r.inactive).length;

    res.json({
      course: { _id: course._id, titre: course.titre, filiere: course.filiere, promotion: course.promotion },
      stats: {
        totalStudents,
        totalVideos: videos.length,
        totalQcms: courseQcms.length,
        avgVideoPercent,
        avgQcmPercent,
        inactiveCount,
      },
      students: rows,
    });
  } catch (err) {
    console.error('[tracking.getCourseTracking]', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/tracking/course/:courseId/remind
 * Body: { studentIds: [id], target: 'video'|'qcm', resourceId, message? }
 * Envoie un rappel manuel aux étudiants.
 */
export const sendManualReminder = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentIds = [], target, resourceId, message, link } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'Aucun étudiant sélectionné' });
    }

    const course = await Course.findById(courseId).select('titre professorId');
    if (!course) return res.status(404).json({ message: 'Cours introuvable' });
    if (req.user.role !== 'admin' && course.professorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    let title = '🔔 Rappel du professeur';
    let defaultMsg = message?.trim() || `Ton professeur te rappelle de travailler sur le cours "${course.titre}".`;
    let notifLink = link || `/courses/${courseId}`;
    let relatedType = 'course';
    let relatedId = courseId;

    if (target === 'video' && resourceId) {
      const v = await Video.findById(resourceId).select('titre');
      if (v) {
        title = '🎥 Rappel vidéo';
        defaultMsg = message?.trim() || `N'oublie pas de regarder la vidéo "${v.titre}" pour le cours "${course.titre}".`;
        notifLink = `/watch/${resourceId}`;
        relatedType = 'video';
        relatedId = resourceId;
      }
    } else if (target === 'qcm' && resourceId) {
      const q = await QCM.findById(resourceId).select('titre videoId');
      if (q) {
        title = '📝 Rappel QCM';
        defaultMsg = message?.trim() || `N'oublie pas de faire le QCM "${q.titre}".`;
        notifLink = `/qcm/${q.videoId}`;
        relatedType = 'qcm';
        relatedId = resourceId;
      }
    }

    const io = req.app.get('io');
    let sent = 0;
    for (const studentId of studentIds) {
      const notif = await pushNotification(io, {
        userId: studentId,
        type: 'reminder_manual',
        priority: 'high',
        title,
        message: defaultMsg,
        link: notifLink,
        relatedType,
        relatedId,
      });
      if (notif) sent++;
    }

    res.json({ sent, total: studentIds.length });
  } catch (err) {
    console.error('[tracking.sendManualReminder]', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/tracking/my-courses
 * Liste les cours du prof avec stats rapides (pour index dashboard).
 */
export const getMyCoursesSummary = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { professorId: req.user.id };
    const courses = await Course.find(filter).select('titre filiere promotion');

    const summaries = await Promise.all(courses.map(async (course) => {
      const [videos, qcms, students] = await Promise.all([
        Video.find({ courseId: course._id }).select('watchedBy'),
        QCM.find({}).populate({ path: 'videoId', match: { courseId: course._id }, select: 'courseId' })
          .select('resultats videoId'),
        User.countDocuments({
          role: 'etudiant', isActive: { $ne: false },
          filiere: course.filiere, promotion: course.promotion,
        }),
      ]);

      const courseQcms = qcms.filter(q => q.videoId);
      const totalWatchSlots = videos.length * students;
      let completedWatches = 0;
      for (const v of videos) {
        completedWatches += v.watchedBy.filter(w => w.completed).length;
      }
      const totalQcmSlots = courseQcms.length * students;
      let completedQcms = 0;
      for (const q of courseQcms) completedQcms += q.resultats.length;

      return {
        _id: course._id,
        titre: course.titre,
        filiere: course.filiere,
        promotion: course.promotion,
        totalStudents: students,
        totalVideos: videos.length,
        totalQcms: courseQcms.length,
        videoCompletion: totalWatchSlots ? Math.round((completedWatches / totalWatchSlots) * 100) : 0,
        qcmCompletion: totalQcmSlots ? Math.round((completedQcms / totalQcmSlots) * 100) : 0,
      };
    }));

    res.json(summaries);
  } catch (err) {
    console.error('[tracking.getMyCoursesSummary]', err);
    res.status(500).json({ message: err.message });
  }
};
