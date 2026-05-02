import CourseCompletion from '../models/CourseCompletion.js';
import Course           from '../models/Course.js';
import Video            from '../models/Video.js';
import QCM              from '../models/QCM.js';
import Prosit           from '../models/Prosit.js';
import User             from '../models/User.js';
import { triggerAutoBadge, addPoints } from '../services/points.js';
import { pushNotification } from '../services/notificationService.js';

/**
 * Recalcule l'état pédagogique d'un cours pour un étudiant — réutilise la
 * même logique que journeyController mais on duplique ici pour éviter une
 * dépendance circulaire et garder le calcul simple.
 *
 * Renvoie l'objet utilisé comme snapshot à la validation et pour
 * vérifier l'éligibilité.
 */
async function computePhaseState(courseId, studentId) {
  const videos = await Video.find({ courseId }).select('_id watchedBy').lean();
  const videosTotal = videos.length;
  const videosWatched = videos.filter((v) =>
    (v.watchedBy || []).some(
      (w) => w.userId?.toString() === studentId && w.completed === true
    )
  ).length;

  const videoIds = videos.map((v) => v._id);
  const quizzes = await QCM.find({ videoId: { $in: videoIds } }).select('_id resultats').lean();
  const quizzesTotal = quizzes.length;
  const quizzesPassed = quizzes.filter((q) => {
    const r = (q.resultats || []).find((x) => x.userId?.toString() === studentId);
    return r && typeof r.score === 'number' && r.score >= 60;
  }).length;

  const prosits = await Prosit.find({
    courseId,
    'groupes.membres.userId': studentId,
  }).select('_id status').lean();
  const prositsCompleted = prosits.filter((p) => ['evalue', 'archive'].includes(p.status)).length;

  // 80% des vidéos + 80% des QCM (ou pas de QCM) = préparation completed
  const videoRatio = videosTotal > 0 ? videosWatched / videosTotal : 0;
  const quizRatio  = quizzesTotal > 0 ? quizzesPassed / quizzesTotal : 0;
  const preparationCompleted =
    videoRatio >= 0.8 && (quizzesTotal === 0 || quizRatio >= 0.8);

  return {
    videosTotal, videosWatched, quizzesTotal, quizzesPassed, prositsCompleted,
    preparationCompleted,
    eligibleForValidation: preparationCompleted && prositsCompleted >= 1,
  };
}

/* ─── GET /api/courses/:id/my-completion ─────────────────────────────────
   Renvoie l'état de validation du cours pour l'étudiant courant. */
export const getMyCompletion = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { id: courseId } = req.params;

    const completion = await CourseCompletion.findOne({
      userId: studentId, courseId,
    }).lean();

    if (completion) {
      return res.json({
        validated: true,
        validatedAt: completion.validatedAt,
        selfAssessment: completion.selfAssessment,
        snapshot: completion.snapshot,
        pointsAwarded: completion.pointsAwarded,
      });
    }

    // Pas encore validé : renvoie l'éligibilité pour que le front sache si on peut afficher le bouton
    const state = await computePhaseState(courseId, studentId);
    res.json({
      validated: false,
      eligibleForValidation: state.eligibleForValidation,
      snapshot: state,
    });
  } catch (err) {
    console.error('[getMyCompletion]', err);
    res.status(500).json({ message: err.message });
  }
};

/* ─── POST /api/courses/:id/validate ─────────────────────────────────────
   Valide le module pour l'étudiant courant. Body : { confidence, retained, unclear } */
export const submitCompletion = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { id: courseId } = req.params;
    const { confidence, retained, unclear } = req.body;

    // Validation des entrées
    if (!confidence || confidence < 1 || confidence > 5) {
      return res.status(400).json({ message: 'Le niveau de confiance doit être entre 1 et 5.' });
    }
    if (!retained || retained.trim().length < 10) {
      return res.status(400).json({ message: 'Décris en quelques phrases ce que tu retiens (minimum 10 caractères).' });
    }

    // Vérifier le cours et l'éligibilité
    const course = await Course.findById(courseId).lean();
    if (!course) return res.status(404).json({ message: 'Cours introuvable.' });

    const state = await computePhaseState(courseId, studentId);
    if (!state.eligibleForValidation) {
      return res.status(403).json({
        message: 'Tu n\'es pas encore éligible à la validation. Termine la préparation (vidéos + QCM) et au moins 1 Prosit.',
        snapshot: state,
      });
    }

    // Vérifier qu'il n'y a pas déjà une validation
    const existing = await CourseCompletion.findOne({ userId: studentId, courseId });
    if (existing) {
      return res.status(409).json({ message: 'Tu as déjà validé ce module.', completion: existing });
    }

    const POINTS_AWARDED = 50;

    // Crée le document
    const completion = await CourseCompletion.create({
      userId: studentId,
      courseId,
      selfAssessment: {
        confidence,
        retained: retained.trim(),
        unclear:  (unclear || '').trim(),
      },
      snapshot: {
        videosWatched:    state.videosWatched,
        videosTotal:      state.videosTotal,
        quizzesPassed:    state.quizzesPassed,
        quizzesTotal:     state.quizzesTotal,
        prositsCompleted: state.prositsCompleted,
        projectsSubmitted: 0,
      },
      pointsAwarded: POINTS_AWARDED,
    });

    // Récompenses : points + badge (si 1ère fois)
    await addPoints(studentId, POINTS_AWARDED, `Module validé : ${course.titre}`);
    const { badge: newBadge } = await triggerAutoBadge(studentId, 'module_validated');

    // Notification socket pour le retour visuel immédiat
    try {
      const io = req.app.get('io');
      await pushNotification(io, {
        userId: studentId,
        type: 'success',
        priority: 'high',
        title: '🏆 Module validé !',
        message: `Tu as validé le module "${course.titre}". +${POINTS_AWARDED} points${newBadge ? ` et un nouveau badge : ${newBadge.nom}` : ''}.`,
        link: `/courses/${courseId}`,
        relatedType: 'course',
        relatedId: courseId,
      });
      // Notif au prof aussi : un de ses étudiants vient de valider
      if (course.professorId) {
        const student = await User.findById(studentId).select('prenom nom');
        await pushNotification(io, {
          userId: course.professorId,
          type: 'info',
          priority: 'normal',
          title: 'Module validé par un étudiant',
          message: `${student?.prenom || ''} ${student?.nom || ''} vient de valider le module "${course.titre}".`,
          link: `/professor/tracking?courseId=${courseId}`,
          relatedType: 'course',
          relatedId: courseId,
        });
      }
    } catch (e) {
      console.error('[submitCompletion notif]', e.message);
    }

    res.status(201).json({
      validated: true,
      validatedAt: completion.validatedAt,
      selfAssessment: completion.selfAssessment,
      snapshot: completion.snapshot,
      pointsAwarded: POINTS_AWARDED,
      newBadge: newBadge ? { nom: newBadge.nom, icon: newBadge.icon } : null,
    });
  } catch (err) {
    console.error('[submitCompletion]', err);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Tu as déjà validé ce module.' });
    }
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/courses/:id/completions (prof/admin only) ─────────────────
   Liste les étudiants ayant validé le cours — utile pour le suivi prof. */
export const listCompletions = async (req, res) => {
  try {
    const { id: courseId } = req.params;
    const completions = await CourseCompletion.find({ courseId })
      .populate('userId', 'prenom nom email filiere promotion semestre')
      .sort({ validatedAt: -1 })
      .lean();
    res.json(completions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
