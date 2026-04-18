import User     from '../models/User.js';
import Progress from '../models/Progress.js';
import Course   from '../models/Course.js';

/* ─── GET /api/leaderboard/course/:courseId ─────────────────────────────────
   Classement des étudiants pour un cours donné (basé sur les points globaux
   des étudiants inscrits à ce cours — ceux qui ont une entrée Progress).
─────────────────────────────────────────────────────────────────────────── */
export const getCourseLeaderboard = async (req, res) => {
  try {
    const { courseId } = req.params;
    const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 100);

    // Vérifier que l'étudiant a bien accès à ce cours (même filière/promotion)
    if (req.user.role === 'etudiant') {
      const course = await Course.findById(courseId).select('filiere promotion');
      if (!course) return res.status(404).json({ message: 'Cours introuvable' });
      if (course.filiere !== req.user.filiere || course.promotion !== req.user.promotion) {
        return res.status(403).json({ message: 'Ce cours ne fait pas partie de ta filière.' });
      }
    }

    // Find all students enrolled in this course (have a Progress doc)
    const progresses = await Progress.find({ courseId })
      .populate('userId', 'nom prenom avatar points badges role')
      .sort({ 'userId.points': -1 });

    // Filter to etudiant role, sort by points desc
    const entries = progresses
      .filter((p) => p.userId && p.userId.role === 'etudiant')
      .map((p) => ({
        userId:          p.userId._id,
        nom:             p.userId.nom,
        prenom:          p.userId.prenom,
        avatar:          p.userId.avatar,
        points:          p.userId.points ?? 0,
        badgesCount:     p.userId.badges?.length ?? 0,
        videosCompleted: p.videosCompleted?.length ?? 0,
        qcmCount:        p.qcmScores?.length ?? 0,
        avgQcmScore:
          p.qcmScores?.length > 0
            ? Math.round(p.qcmScores.reduce((s, q) => s + q.score, 0) / p.qcmScores.length)
            : 0,
        lastActivity: p.lastActivity,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, limit)
      .map((e, i) => ({ ...e, rank: i + 1 }));

    // Find current user's rank
    const myEntry = entries.find((e) => e.userId.toString() === req.user.id.toString());
    let myRank = myEntry?.rank ?? null;
    if (!myRank) {
      // User is outside top limit — compute their rank among all
      const allSorted = progresses
        .filter((p) => p.userId && p.userId.role === 'etudiant')
        .sort((a, b) => (b.userId.points ?? 0) - (a.userId.points ?? 0));
      const idx = allSorted.findIndex((p) => p.userId._id.toString() === req.user.id.toString());
      myRank = idx >= 0 ? idx + 1 : null;
    }

    res.json({ entries, myRank, total: entries.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/leaderboard/global ──────────────────────────────────────────
   Classement global tous cours confondus (top 50 par points).
─────────────────────────────────────────────────────────────────────────── */
export const getGlobalLeaderboard = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 100);

    // Étudiant : classement limité à sa filière + promotion.
    // Prof/admin : global.
    const filter = { role: 'etudiant', isActive: { $ne: false } };
    if (req.user.role === 'etudiant') {
      filter.filiere = req.user.filiere;
      filter.promotion = req.user.promotion;
    }

    const students = await User.find(filter)
      .select('nom prenom avatar points badges filiere promotion')
      .sort({ points: -1 })
      .limit(limit);

    const entries = students.map((u, i) => ({
      rank:        i + 1,
      userId:      u._id,
      nom:         u.nom,
      prenom:      u.prenom,
      avatar:      u.avatar,
      filiere:     u.filiere,
      promotion:   u.promotion,
      points:      u.points ?? 0,
      badgesCount: u.badges?.length ?? 0,
    }));

    // Current user rank
    const myEntry = entries.find((e) => e.userId.toString() === req.user.id.toString());
    let myRank = myEntry?.rank ?? null;
    if (!myRank) {
      const myPoints = (await User.findById(req.user.id).select('points'))?.points ?? 0;
      const aboveFilter = { role: 'etudiant', points: { $gt: myPoints } };
      if (req.user.role === 'etudiant') {
        aboveFilter.filiere = req.user.filiere;
        aboveFilter.promotion = req.user.promotion;
      }
      const totalAbove = await User.countDocuments(aboveFilter);
      myRank = totalAbove + 1;
    }

    res.json({ entries, myRank });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
