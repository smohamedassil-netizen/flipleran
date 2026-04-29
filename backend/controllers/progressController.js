import Progress from '../models/Progress.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Video from '../models/Video.js';
import QCM from '../models/QCM.js';

export const getMyProgress = async (req, res) => {
  try {
    const progress = await Progress.find({ userId: req.user.id })
      .populate('courseId', 'titre filiere promotion')
      .populate('videosCompleted', 'titre');
    res.json(progress);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getCourseProgress = async (req, res) => {
  try {
    const progress = await Progress.findOne({ userId: req.user.id, courseId: req.params.courseId });
    res.json(progress ?? {});
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const markVideoCompleted = async (req, res) => {
  try {
    const { courseId, videoId } = req.body;
    const progress = await Progress.findOneAndUpdate(
      { userId: req.user.id, courseId },
      { $addToSet: { videosCompleted: videoId }, lastActivity: new Date() },
      { upsert: true, new: true }
    );
    res.json(progress);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/**
 * GET /api/progress/upcoming
 * Vidéos et QCMs avec deadline dans les 7 prochains jours, scopés à la
 * filière + promotion de l'étudiant connecté. Indique le statut "fait".
 */
export const getUpcomingDeadlines = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('filiere promotion');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Cours de l'étudiant (filière + promotion)
    const courses = await Course.find({
      isActive: { $ne: false },
      filiere: user.filiere,
      promotion: user.promotion,
    }).select('_id titre');
    const courseIds = courses.map(c => c._id);

    // Vidéos avec deadline dans les 7 jours
    const videos = await Video.find({
      courseId: { $in: courseIds },
      deadline: { $gte: now, $lte: in7days },
    }).select('_id titre deadline courseId watchedBy');

    // QCMs avec deadline dans les 7 jours, filtrés sur les vidéos des cours de l'étudiant
    const qcms = await QCM.find({
      deadline: { $gte: now, $lte: in7days },
    })
      .populate({ path: 'videoId', match: { courseId: { $in: courseIds } }, select: 'courseId titre' })
      .select('_id titre deadline resultats videoId');

    const items = [];

    for (const v of videos) {
      const done = (v.watchedBy || []).some(w => w.userId?.toString() === userId && w.completed);
      const course = courses.find(c => c._id.toString() === v.courseId?.toString());
      items.push({
        type: 'video',
        id: v._id,
        titre: v.titre,
        cours: course?.titre ?? '',
        deadline: v.deadline,
        done,
        link: `/watch/${v._id}`,
      });
    }

    for (const q of qcms) {
      if (!q.videoId) continue; // populate match a filtré → pas dans les cours de l'étudiant
      const done = (q.resultats || []).some(r => r.userId?.toString() === userId);
      items.push({
        type: 'qcm',
        id: q._id,
        titre: q.titre,
        cours: q.videoId?.titre ?? '',
        deadline: q.deadline,
        done,
        link: `/qcm/${q.videoId._id}`,
      });
    }

    items.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    res.json(items);
  } catch (err) {
    console.error('[getUpcomingDeadlines]', err);
    res.status(500).json({ message: err.message });
  }
};
