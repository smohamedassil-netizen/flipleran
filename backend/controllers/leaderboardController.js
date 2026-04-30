import User      from '../models/User.js';
import Progress  from '../models/Progress.js';
import Course    from '../models/Course.js';
import StudyStreak from '../models/StudyStreak.js';

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

/* ─── F11B — Leaderboard scopé : cohort | monthly | personal ────────────
   GET /api/leaderboard?scope=cohort|monthly|personal&limit=20
   - cohort   : top de ma promotion (filière + promotion). Sur points totaux.
   - monthly  : top XP gagnés CE MOIS (basé sur StudyStreak.history). Donne sa
                chance à tout le monde, reset implicite tous les 1ers du mois.
   - personal : MA progression XP cumulée sur les 30 derniers jours, pour
                graphique recharts côté frontend. Pas de classement.
─────────────────────────────────────────────────────────────────────── */
export const getScopedLeaderboard = async (req, res) => {
  try {
    const scope = ['cohort', 'monthly', 'personal'].includes(req.query.scope)
      ? req.query.scope : 'cohort';
    const limit = Math.min(parseInt(req.query.limit ?? '20', 10), 50);

    /* ──────────────── COHORT ──────────────── */
    if (scope === 'cohort') {
      const filter = { role: 'etudiant', isActive: { $ne: false } };
      if (req.user.role === 'etudiant') {
        filter.filiere = req.user.filiere;
        filter.promotion = req.user.promotion;
      }
      const students = await User.find(filter)
        .select('nom prenom avatar points filiere promotion')
        .sort({ points: -1 })
        .limit(limit);
      const entries = students.map((u, i) => ({
        rank:    i + 1,
        userId:  u._id,
        nom:     u.nom,
        prenom:  u.prenom,
        avatar:  u.avatar,
        filiere: u.filiere,
        promotion: u.promotion,
        score:   u.points ?? 0,
        scoreLabel: 'XP totaux',
      }));

      // Mon rang
      const myEntry = entries.find((e) => e.userId.toString() === req.user.id.toString());
      let myRank = myEntry?.rank ?? null;
      if (!myRank) {
        const myPoints = (await User.findById(req.user.id).select('points'))?.points ?? 0;
        const aboveCount = await User.countDocuments({ ...filter, points: { $gt: myPoints } });
        myRank = aboveCount + 1;
      }
      return res.json({ scope, entries, myRank });
    }

    /* ──────────────── MONTHLY (XP gagnés ce mois) ──────────────── */
    if (scope === 'monthly') {
      const now = new Date();
      const monthPrefix = now.toISOString().slice(0, 7); // 'YYYY-MM'

      // Charge TOUS les streaks (volumétrie acceptable : 1 doc par étudiant)
      const filter = req.user.role === 'etudiant'
        ? { filiere: req.user.filiere, promotion: req.user.promotion, role: 'etudiant', isActive: { $ne: false } }
        : { role: 'etudiant', isActive: { $ne: false } };
      const cohortStudents = await User.find(filter).select('_id nom prenom avatar filiere promotion').lean();
      const cohortIds = cohortStudents.map((u) => u._id);

      const streaks = await StudyStreak.find({ userId: { $in: cohortIds } })
        .select('userId history').lean();

      // Aggrège XP du mois
      const xpByUser = {};
      for (const s of streaks) {
        let monthXp = 0;
        for (const h of s.history || []) {
          if (h.date && h.date.startsWith(monthPrefix)) {
            monthXp += h.xpEarned || 0;
          }
        }
        xpByUser[String(s.userId)] = monthXp;
      }

      const entries = cohortStudents
        .map((u) => ({
          userId:  u._id,
          nom:     u.nom,
          prenom:  u.prenom,
          avatar:  u.avatar,
          filiere: u.filiere,
          promotion: u.promotion,
          score:   xpByUser[String(u._id)] || 0,
          scoreLabel: 'XP ce mois',
        }))
        .filter((e) => e.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((e, i) => ({ ...e, rank: i + 1 }));

      const myEntry = entries.find((e) => e.userId.toString() === req.user.id.toString());
      let myRank = myEntry?.rank ?? null;
      if (!myRank) {
        const myXp = xpByUser[String(req.user.id)] || 0;
        // Compte combien d'étudiants ont strictement plus
        const aboveCount = Object.values(xpByUser).filter((x) => x > myXp).length;
        myRank = myXp > 0 ? aboveCount + 1 : null;
      }
      return res.json({ scope, entries, myRank, monthPrefix });
    }

    /* ──────────────── PERSONAL (graphique 30j) ──────────────── */
    // Renvoie l'évolution des XP cumulés sur les 30 derniers jours pour
    // l'utilisateur courant. Pas de classement — c'est une auto-comparaison.
    const streak = await StudyStreak.findOne({ userId: req.user.id }).select('history').lean();
    const today = new Date();
    const series = [];
    let cumulative = 0;
    const historyByDate = {};
    for (const h of streak?.history || []) {
      historyByDate[h.date] = h.xpEarned || 0;
    }
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      cumulative += historyByDate[key] || 0;
      series.push({
        date: key,
        xpEarned: historyByDate[key] || 0,
        xpCumul: cumulative,
      });
    }
    return res.json({ scope, series, totalLast30Days: cumulative });
  } catch (err) {
    console.error('getScopedLeaderboard error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ─── F11B — Honor board d'un cours (top 3 du mois) ─────────────────────
   GET /api/honor-board/:courseId
   Top 3 étudiants par XP gagnés ce mois parmi ceux qui ont une Progress
   sur ce cours. Affichable par tous les étudiants du cours.
─────────────────────────────────────────────────────────────────────── */
export const getHonorBoard = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).select('titre filiere promotion');
    if (!course) return res.status(404).json({ message: 'Cours introuvable' });

    // Étudiant : doit être de la même filière/promotion
    if (req.user.role === 'etudiant'
        && (course.filiere !== req.user.filiere || course.promotion !== req.user.promotion)) {
      return res.status(403).json({ message: 'Pas accès à ce cours.' });
    }

    const progresses = await Progress.find({ courseId })
      .populate('userId', '_id nom prenom avatar role')
      .lean();
    const studentIds = progresses
      .filter((p) => p.userId?.role === 'etudiant')
      .map((p) => p.userId._id);

    const monthPrefix = new Date().toISOString().slice(0, 7);
    const streaks = await StudyStreak.find({ userId: { $in: studentIds } })
      .select('userId history').lean();

    const xpByUser = {};
    for (const s of streaks) {
      let m = 0;
      for (const h of s.history || []) {
        if (h.date && h.date.startsWith(monthPrefix)) m += h.xpEarned || 0;
      }
      xpByUser[String(s.userId)] = m;
    }

    const top3 = progresses
      .filter((p) => p.userId?.role === 'etudiant')
      .map((p) => ({
        userId:    p.userId._id,
        nom:       p.userId.nom,
        prenom:    p.userId.prenom,
        avatar:    p.userId.avatar,
        xpThisMonth: xpByUser[String(p.userId._id)] || 0,
      }))
      .filter((e) => e.xpThisMonth > 0)
      .sort((a, b) => b.xpThisMonth - a.xpThisMonth)
      .slice(0, 3)
      .map((e, i) => ({ ...e, rank: i + 1 }));

    res.json({
      courseId,
      courseTitre: course.titre,
      monthPrefix,
      top3,
    });
  } catch (err) {
    console.error('getHonorBoard error:', err.message);
    res.status(500).json({ message: err.message });
  }
};
