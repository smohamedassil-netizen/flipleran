import mongoose from 'mongoose';

/**
 * StudyStreak — Série de jours consécutifs d'activité (F11 sprint-final).
 *
 * Cadre théorique :
 * @see Deci & Ryan (1985). *Self-Determination Theory*. Le streak active le
 *      besoin de compétence (visualiser une progression) et la motivation
 *      autodéterminée — il NE crée PAS de motivation extrinsèque toxique
 *      tant qu'on garde des "freezes" pour pardonner les jours difficiles.
 * @see Csikszentmihalyi (1990). *Flow*. Le streak comme indice de régularité
 *      favorise l'entrée en flow lors des sessions d'apprentissage.
 * @see Werbach & Hunter (2012). *For the Win — Gamification*. Les streaks
 *      sont le mécanique gamification la plus puissante quand bien dosée
 *      (avec freezes pour éviter l'angoisse).
 *
 * Décisions de design :
 *  - 1 doc par étudiant (clé unique sur userId).
 *  - savedDays (max 3) = "freezes" — laissent l'étudiant rater 1 jour sans
 *    perdre son streak. Crucial pour ne pas basculer en motivation toxique.
 *  - history limitée aux 90 derniers jours (truncation côté service).
 */

const streakDaySchema = new mongoose.Schema({
  date:            { type: String, required: true }, // 'YYYY-MM-DD' UTC
  activitiesCount: { type: Number, default: 1 },
  xpEarned:        { type: Number, default: 0 },
}, { _id: false });

const studyStreakSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  currentStreak:    { type: Number, default: 0 },
  longestStreak:    { type: Number, default: 0 },
  lastActivityDate: { type: String, default: null }, // 'YYYY-MM-DD' UTC
  // Vies/freezes accumulables (max 3) — gagnées 1 par semaine d'activité
  savedDays:        { type: Number, default: 0, max: 3 },
  freezeUsedCount:  { type: Number, default: 0 },
  history:          { type: [streakDaySchema], default: [] },
}, { timestamps: true });

const StudyStreak = mongoose.model('StudyStreak', studyStreakSchema);
export default StudyStreak;
