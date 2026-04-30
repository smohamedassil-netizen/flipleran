import Groq from 'groq-sdk';
import WeeklyQuest, { QUEST_TYPES } from '../models/WeeklyQuest.js';
import User from '../models/User.js';
import Progress from '../models/Progress.js';

/**
 * questGenerator — Génère 3 quêtes hebdomadaires personnalisées via Groq
 * (F11 sprint-final). Cron lundi 6h via notificationScheduler.
 *
 * @see Csikszentmihalyi (1990). Flow — challenges progressifs (1 facile, 1
 *      moyenne, 1 difficile) maintiennent l'apprenant dans la zone optimale.
 * @see Locke & Latham (2002). Goal-setting theory — les buts SMART
 *      (Specific, Measurable, Achievable, Relevant, Time-bound) maximisent
 *      l'engagement quand ils sont calibrés au niveau de l'apprenant.
 *
 * Robustesse : fallback hardcodé si Groq échoue (3 quêtes génériques).
 * Idempotent : `generateForUser` skip si une WeeklyQuest existe déjà pour
 * cette semaine.
 */

const MODEL = 'llama-3.3-70b-versatile';
let groqClient;
function getGroq() {
  if (!groqClient) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groqClient;
}

/**
 * Lundi 00:00 UTC de la semaine de la date fournie (par défaut now).
 */
export function getWeekStart(d = new Date()) {
  const day = d.getUTCDay(); // 0=dim, 1=lun, ..., 6=sam
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offsetToMonday));
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/**
 * Lundi 23:59:59 dimanche prochain — deadline des quêtes.
 */
function getWeekEnd(weekStart) {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + 7);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Quêtes fallback (génériques, en cas d'échec Groq).
 */
function fallbackQuests(deadline) {
  return [
    { title: 'Regarde 2 vidéos', description: 'Visionne 2 vidéos d\'un cours et complète-les à 80%.', type: 'video', difficulty: 'easy', target: 2, xpReward: 50, deadline },
    { title: 'Réussis 3 QCM', description: 'Passe 3 QCM avec un score ≥ 70%.', type: 'qcm', difficulty: 'medium', target: 3, xpReward: 100, deadline },
    { title: 'Streak de 5 jours', description: 'Connecte-toi et fais une activité 5 jours d\'affilée.', type: 'streak', difficulty: 'hard', target: 5, xpReward: 200, deadline },
  ];
}

/**
 * Construit le contexte étudiant pour le prompt Groq.
 */
async function buildUserContext(userId) {
  const [user, progresses] = await Promise.all([
    User.findById(userId).select('prenom filiere promotion points').lean(),
    Progress.find({ userId }).select('courseId videosCompleted lastActivity').lean(),
  ]);
  if (!user) return null;
  const totalCourses = progresses.length;
  const totalVideosCompleted = progresses.reduce((s, p) => s + (p.videosCompleted?.length || 0), 0);
  const lastActivity = progresses.map((p) => p.lastActivity).filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0];

  return {
    prenom:       user.prenom || '',
    filiere:      user.filiere || '?',
    promotion:    user.promotion || '?',
    points:       user.points || 0,
    totalCourses,
    totalVideosCompleted,
    lastActivity: lastActivity ? new Date(lastActivity).toISOString().slice(0, 10) : 'jamais',
  };
}

/**
 * Génère les 3 quêtes via Groq.
 */
async function callGroqForQuests(ctx, deadline) {
  const sys = `Tu es un coach pédagogique gamification (Csikszentmihalyi Flow + Locke & Latham SMART).
Tu génères 3 quêtes hebdomadaires personnalisées pour un étudiant universitaire en Algérie.

RÈGLES STRICTES :
- 3 quêtes : 1 facile (difficulty='easy', xpReward 30-60), 1 moyenne ('medium', 60-120), 1 difficile ('hard', 150-300).
- Chaque quête : title (max 80 chars, action concrète), description (1 phrase), type parmi : ${QUEST_TYPES.join(', ')}, target (nombre entier 1-15), xpReward (entier).
- Adapté au contexte : le facile est ATTEIGNABLE en 30min, le difficile demande de la régularité.
- En français.
- Pas de quête de type 'tutor' demandant >5 messages (bot quota).
- Format JSON strict : { "quests": [{title, description, type, difficulty, target, xpReward}] }`;

  const usr = `Étudiant : ${ctx.prenom}, ${ctx.filiere} ${ctx.promotion}.
Points XP cumulés : ${ctx.points}
Cours suivis : ${ctx.totalCourses}
Vidéos complétées : ${ctx.totalVideosCompleted}
Dernière activité : ${ctx.lastActivity}

Génère 3 quêtes pour cette semaine.`;

  const completion = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: sys },
      { role: 'user',   content: usr },
    ],
    temperature: 0.6,
    max_tokens: 1200,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices?.[0]?.message?.content || '{}';
  const data = JSON.parse(content);
  const raw = Array.isArray(data?.quests) ? data.quests : [];

  // Sanitisation
  return raw
    .filter((q) => q && typeof q.title === 'string' && QUEST_TYPES.includes(q.type))
    .map((q) => ({
      title:       String(q.title).trim().slice(0, 200),
      description: String(q.description || '').trim().slice(0, 500),
      type:        q.type,
      difficulty:  ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      target:      Math.max(1, Math.min(15, Math.round(Number(q.target) || 1))),
      xpReward:    Math.max(10, Math.min(500, Math.round(Number(q.xpReward) || 50))),
      current:     0,
      completed:   false,
      deadline,
    }))
    .slice(0, 3);
}

/**
 * Génère ou récupère les quêtes de la semaine pour un étudiant.
 * Idempotent : skip si déjà présent pour cette semaine.
 */
export async function generateForUser(userId) {
  const weekStart = getWeekStart();
  const existing = await WeeklyQuest.findOne({ userId, weekStart }).lean();
  if (existing) return { skipped: true, reason: 'already-exists', weekly: existing };

  const ctx = await buildUserContext(userId);
  if (!ctx) return { skipped: true, reason: 'user-not-found' };

  const deadline = getWeekEnd(weekStart);
  let quests = [];
  let source = 'ai-generated';
  try {
    quests = await callGroqForQuests(ctx, deadline);
  } catch (err) {
    console.error(`[questGenerator] Groq failed for user ${userId}:`, err.message);
    quests = [];
  }

  if (quests.length === 0) {
    quests = fallbackQuests(deadline);
    source = 'fallback';
  }

  const weekly = await WeeklyQuest.create({ userId, weekStart, quests, source });
  return { skipped: false, weekly: weekly.toObject() };
}

/**
 * Cron : tous les étudiants actifs sur les 14 derniers jours reçoivent
 * leurs quêtes de la semaine. Volontairement séquentiel pour ne pas saturer
 * Groq (free tier ~30 req/min).
 */
export async function generateForAllActiveStudents() {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const recent = await Progress.find({ lastActivity: { $gte: fourteenDaysAgo } })
    .select('userId').lean();
  const studentIds = [...new Set(recent.map((p) => String(p.userId)))];
  console.log(`[questGenerator] ${studentIds.length} étudiants actifs à traiter`);

  let created = 0;
  let skipped = 0;
  for (const sid of studentIds) {
    try {
      const r = await generateForUser(sid);
      if (r.skipped) skipped++;
      else created++;
    } catch (err) {
      console.error(`[questGenerator] user ${sid}:`, err.message);
    }
  }
  console.log(`[questGenerator] ${created} créées, ${skipped} skippées`);
  return { studentsProcessed: studentIds.length, created, skipped };
}

/**
 * Hook progress : appelé par les controllers d'activité quand un événement
 * match potentiellement une quête. Incrémente `current` et marque `completed`
 * quand target atteint, crédite l'XP.
 */
export async function recordQuestProgress(userId, type, increment = 1) {
  if (!QUEST_TYPES.includes(type)) return { matched: 0, completed: [] };

  const weekStart = getWeekStart();
  const weekly = await WeeklyQuest.findOne({ userId, weekStart });
  if (!weekly) return { matched: 0, completed: [] };

  const completed = [];
  let matched = 0;
  for (const q of weekly.quests) {
    if (q.completed || q.type !== type) continue;
    q.current = Math.min(q.target, q.current + increment);
    matched++;
    if (q.current >= q.target) {
      q.completed = true;
      q.completedAt = new Date();
      completed.push({ id: q._id, title: q.title, xpReward: q.xpReward });
    }
  }
  if (matched > 0) await weekly.save();
  return { matched, completed };
}

export default {
  generateForUser,
  generateForAllActiveStudents,
  recordQuestProgress,
  getWeekStart,
};
