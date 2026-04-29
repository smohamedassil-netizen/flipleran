import BattleResult from '../models/BattleResult.js';
import User from '../models/User.js';

/**
 * GET /api/battle/leaderboard
 *
 * Classement interne du Quiz Battle (séparé de l'XP global FlipLearn).
 * Retourne les top joueurs agrégés sur l'ensemble de leurs matches.
 *
 * Query params :
 *   - courseId   (optional) — restreindre aux matches joués sur ce cours
 *   - limit      (optional, default 10, max 50)
 */
export async function getLeaderboard(req, res) {
  try {
    const courseId = req.query.courseId || null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

    const match = {};
    if (courseId) match.courseId = courseId;

    const aggregated = await BattleResult.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$userId',
          wins:    { $sum: { $cond: [{ $eq: ['$outcome', 'win']  }, 1, 0] } },
          losses:  { $sum: { $cond: [{ $eq: ['$outcome', 'loss'] }, 1, 0] } },
          draws:   { $sum: { $cond: [{ $eq: ['$outcome', 'draw'] }, 1, 0] } },
          matches: { $sum: 1 },
          totalScore:    { $sum: '$score' },
          maxBestStreak: { $max: '$bestStreak' },
        },
      },
      // Tri : victoires d'abord, puis score total, puis meilleur streak
      { $sort: { wins: -1, totalScore: -1, maxBestStreak: -1 } },
      { $limit: limit },
    ]);

    // Hydrater avec les infos User (prenom, nom, avatar)
    const userIds = aggregated.map(r => r._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('prenom nom avatarUrl filiere promotion');

    const usersById = new Map(users.map(u => [u._id.toString(), u]));

    const ranked = aggregated.map((entry, idx) => {
      const u = usersById.get(entry._id.toString());
      return {
        rank: idx + 1,
        userId: entry._id,
        prenom: u?.prenom ?? 'Inconnu',
        nom: u?.nom ?? '',
        avatarUrl: u?.avatarUrl ?? null,
        filiere: u?.filiere ?? null,
        promotion: u?.promotion ?? null,
        wins: entry.wins,
        losses: entry.losses,
        draws: entry.draws,
        matches: entry.matches,
        totalScore: entry.totalScore,
        bestStreak: entry.maxBestStreak,
      };
    });

    res.json(ranked);
  } catch (err) {
    console.error('[battle] leaderboard error:', err);
    res.status(500).json({ message: 'Erreur leaderboard Quiz Battle' });
  }
}

/**
 * GET /api/battle/mine
 *
 * Retourne les statistiques personnelles du joueur connecté
 * (matches joués, victoires, défaites, meilleur streak personnel).
 */
export async function getMyBattleStats(req, res) {
  try {
    const userId = req.user.id;
    const all = await BattleResult.find({ userId }).select('outcome score bestStreak matchedAt courseId');

    const stats = {
      matches: all.length,
      wins:    all.filter(r => r.outcome === 'win').length,
      losses:  all.filter(r => r.outcome === 'loss').length,
      draws:   all.filter(r => r.outcome === 'draw').length,
      totalScore:        all.reduce((s, r) => s + (r.score || 0), 0),
      bestPersonalStreak: all.reduce((m, r) => Math.max(m, r.bestStreak || 0), 0),
      lastMatches: all
        .sort((a, b) => new Date(b.matchedAt) - new Date(a.matchedAt))
        .slice(0, 5),
    };

    res.json(stats);
  } catch (err) {
    console.error('[battle] my stats error:', err);
    res.status(500).json({ message: 'Erreur stats Quiz Battle' });
  }
}
