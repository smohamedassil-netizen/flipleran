import mongoose from 'mongoose';

/**
 * WeeklyQuest — Quêtes hebdomadaires personnalisées (F11 sprint-final).
 *
 * @see Werbach & Hunter (2012). For the Win — gamification design.
 * @see Csikszentmihalyi (1990). Flow — challenges adaptés au niveau.
 *
 * Génération : cron lundi 6h pour chaque étudiant actif (questGenerator.js).
 * Génère 3 quêtes/semaine (1 facile + 1 moyenne + 1 difficile) personnalisées
 * via Groq selon le contexte (cours en cours, points faibles, streak).
 *
 * Mise à jour automatique : hooks dans les controllers d'activité incrémentent
 * `current` quand un événement match (type+target).
 */

const QUEST_TYPES = ['video', 'qcm', 'prosit', 'project', 'flashcards', 'tutor', 'streak'];

const questItemSchema = new mongoose.Schema({
  title:        { type: String, required: true, maxlength: 200 },
  description:  { type: String, default: '', maxlength: 500 },
  type:         { type: String, enum: QUEST_TYPES, required: true },
  difficulty:   { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  target:       { type: Number, required: true, min: 1 },
  current:      { type: Number, default: 0 },
  xpReward:     { type: Number, required: true, min: 0 },
  completed:    { type: Boolean, default: false },
  completedAt:  { type: Date, default: null },
  deadline:     { type: Date, required: true },
}, { _id: true });

const weeklyQuestSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Lundi 00:00 UTC de la semaine concernée — clé d'unicité avec userId
  weekStart: { type: Date, required: true },
  quests:    { type: [questItemSchema], default: [] },
  // Source : 'ai-generated' (Groq) ou 'fallback' (templates hardcodés si Groq down)
  source:    { type: String, enum: ['ai-generated', 'fallback'], default: 'ai-generated' },
}, { timestamps: true });

weeklyQuestSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

const WeeklyQuest = mongoose.model('WeeklyQuest', weeklyQuestSchema);
export default WeeklyQuest;
export { QUEST_TYPES };
