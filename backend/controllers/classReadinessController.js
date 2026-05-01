import Course from '../models/Course.js';
import Video from '../models/Video.js';
import QCM from '../models/QCM.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

/**
 * GET /api/class-readiness/:courseId
 *
 * Renvoie pour chaque vidéo du cours du prof, le décompte des étudiants :
 *   - ready    : ont vu la vidéo (completed) ET passé le QCM associé (≥60)
 *   - partial  : ont fait l'un OU l'autre, mais pas les deux
 *   - missing  : n'ont fait ni l'un ni l'autre
 *
 * Réservé au professeur du cours (403 sinon).
 * Sert la page prof "Préparation classe" pour répondre à :
 * « Pour mon prochain cours, qui a vu la vidéo et fait le QCM ? »
 */
export const getClassReadiness = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId).select('_id titre filiere promotion professorId').lean();
    if (!course) return res.status(404).json({ message: 'Cours introuvable' });

    // Permission : prof du cours OU admin
    if (req.user.role !== 'admin' && course.professorId?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Vous ne pouvez consulter que les cours que vous enseignez.' });
    }

    // Étudiants de la promo/filière du cours
    const students = await User.find({
      role: 'etudiant',
      filiere: course.filiere,
      promotion: course.promotion,
      isActive: true,
    }).select('_id prenom nom email').lean();

    const totalStudents = students.length;
    const studentIdSet = new Set(students.map((s) => s._id.toString()));

    // Vidéos + QCM associés (1 QCM par vidéo via videoId unique)
    const videos = await Video.find({ courseId }).select('_id titre order watchedBy').sort({ order: 1 }).lean();
    const videoIds = videos.map((v) => v._id);
    const quizzes = await QCM.find({ videoId: { $in: videoIds } }).select('_id videoId titre resultats').lean();

    // Index par videoId
    const quizByVideo = new Map();
    for (const q of quizzes) {
      quizByVideo.set(q.videoId.toString(), q);
    }

    const resources = videos.map((v) => {
      const quiz = quizByVideo.get(v._id.toString());

      // Étudiants ayant complété la vidéo
      const watchedSet = new Set(
        (v.watchedBy || [])
          .filter((w) => w.completed === true && w.userId)
          .map((w) => w.userId.toString())
          .filter((id) => studentIdSet.has(id))
      );

      // Étudiants ayant passé le QCM avec score ≥ 60
      const quizPassedSet = new Set(
        quiz
          ? (quiz.resultats || [])
              .filter((r) => typeof r.score === 'number' && r.score >= 60 && r.userId)
              .map((r) => r.userId.toString())
              .filter((id) => studentIdSet.has(id))
          : []
      );

      // Buckets ready / partial / missing
      const missingStudents = [];
      let ready = 0;
      let partial = 0;
      let missing = 0;

      for (const s of students) {
        const id = s._id.toString();
        const w = watchedSet.has(id);
        const q = quiz ? quizPassedSet.has(id) : true; // si pas de QCM, on considère cette dimension comme "validée par défaut"

        if (w && q) ready++;
        else if (w || q) partial++;
        else {
          missing++;
          missingStudents.push({ _id: s._id, prenom: s.prenom, nom: s.nom, email: s.email });
        }
      }

      return {
        type: 'video',
        _id: v._id,
        titre: v.titre,
        order: v.order,
        hasQuiz: !!quiz,
        quizId: quiz?._id || null,
        ready,
        partial,
        missing,
        missingStudents: missingStudents.slice(0, 50),
      };
    });

    res.json({
      course: { _id: course._id, titre: course.titre, filiere: course.filiere, promotion: course.promotion },
      totalStudents,
      resources,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/class-readiness/:courseId/remind
 * Body: { studentIds: [ObjectId], message: String, videoId?: ObjectId }
 *
 * Crée une notification in-app pour chaque étudiant ciblé. Pas d'envoi email
 * (pour la démo). Dédoublonnage souple via dedupKey horaire.
 */
export const remindStudents = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentIds = [], message = '', videoId = null } = req.body || {};

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'Liste studentIds vide.' });
    }
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'Message requis.' });
    }

    const course = await Course.findById(courseId).select('_id titre professorId').lean();
    if (!course) return res.status(404).json({ message: 'Cours introuvable' });
    if (req.user.role !== 'admin' && course.professorId?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Permission refusée.' });
    }

    // Garde-fou : limite 50 destinataires par appel
    const targetIds = studentIds.slice(0, 50);

    // dedupKey horaire pour éviter le spam si le prof reclique : 1 rappel/heure max
    const hourKey = new Date().toISOString().slice(0, 13).replace(/[-:T]/g, ''); // YYYYMMDDHH
    const link = videoId ? `/watch/${videoId}` : `/courses/${courseId}`;

    const docs = targetIds.map((sid) => ({
      userId: sid,
      type: videoId ? 'reminder_video' : 'reminder_qcm',
      title: 'Rappel pédagogique',
      message,
      link,
      priority: 'normal',
      relatedType: videoId ? 'video' : 'course',
      relatedId: videoId || course._id,
      dedupKey: `readiness_${courseId}_${videoId || 'all'}_${sid}_${hourKey}`,
    }));

    // insertMany ordered:false pour ne pas faire échouer toute la batch si un dédoublonnage saute
    let inserted = 0;
    try {
      const r = await Notification.insertMany(docs, { ordered: false });
      inserted = r.length;
    } catch (bulkErr) {
      // Mongo renvoie une bulkWriteError contenant le nombre de docs réellement insérés
      inserted = bulkErr?.result?.insertedCount ?? bulkErr?.insertedDocs?.length ?? 0;
    }

    res.json({
      sent: inserted,
      duplicates: targetIds.length - inserted,
      total: targetIds.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
