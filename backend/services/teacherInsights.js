import Groq from 'groq-sdk';
import { getLLM } from './llm.js';
import Course from '../models/Course.js';
import Video from '../models/Video.js';
import QCM from '../models/QCM.js';
import Progress from '../models/Progress.js';

/**
 * teacherInsights — Agent IA "coach pédagogique" pour le prof.
 *
 * À partir des métriques brutes du cours (progression vidéos, scores QCM,
 * engagement par étudiant), génère 3-5 insights actionnables que le prof
 * peut appliquer immédiatement : étudiants à risque, top performers,
 * concepts mal maîtrisés, vidéos abandonnées, etc.
 *
 * @description Inspiré de Hattie (2009, *Visible Learning*) qui montre
 * que la *visible feedback* — la capacité du prof à voir explicitement
 * où chaque étudiant en est — est l'un des facteurs pédagogiques au plus
 * fort effet d'apprentissage (effect size ≥ 0.7). Black & Wiliam (1998)
 * dans *Inside the Black Box* établissent que l'évaluation formative,
 * quand elle est immédiatement actionnable, augmente significativement
 * les performances des étudiants en difficulté.
 *
 * @see Hattie, J. (2009). *Visible Learning: A Synthesis of Over 800
 *      Meta-Analyses Relating to Achievement*. Routledge.
 * @see Black, P., & Wiliam, D. (1998). Inside the Black Box: Raising
 *      Standards Through Classroom Assessment. *Phi Delta Kappan*, 80(2).
 *
 * Cache 1h en mémoire : les insights ne changent pas en temps réel et
 * un refresh manuel (depuis l'UI) bypass le cache.
 */

const CACHE_TTL_MS = 60 * 60 * 1000;       // 1 heure
const insightsCache = new Map();           // courseId → { generatedAt, payload }

let groqClient;
function getGroq() {
  if (!groqClient) groqClient = getLLM();
  return groqClient;
}

/* ─────────────────────────────────────────────────────────────────────────
   1) CALCUL DES MÉTRIQUES BRUTES
───────────────────────────────────────────────────────────────────────── */
export async function computeMetrics(courseId) {
  const course = await Course.findById(courseId).lean();
  if (!course) throw new Error('Cours introuvable');

  const videos = await Video.find({ courseId }).sort({ order: 1 }).lean();
  const videoIds = videos.map((v) => v._id);
  const qcms = await QCM.find({ videoId: { $in: videoIds } }).lean();
  const allProgress = await Progress.find({ courseId })
    .populate('userId', 'nom prenom email')
    .lean();

  const totalStudents = allProgress.length;

  /* ── Vidéos : taux de décrochage par vidéo ────────────────────────── */
  const videoMetrics = videos.map((v) => {
    const watchers = v.watchedBy || [];
    const completed = watchers.filter((w) => w.completed || w.watchedPercent >= 80).length;
    const avgPercent = watchers.length === 0
      ? 0
      : Math.round(watchers.reduce((s, w) => s + (w.watchedPercent || 0), 0) / watchers.length);

    // Estimation du timestamp d'abandon : (avgPercent / 100) * duration
    const dropoffSec = v.duration ? Math.round((avgPercent / 100) * v.duration) : null;

    return {
      videoId:        v._id.toString(),
      titre:          v.titre,
      duration:       v.duration || 0,
      watchedCount:   watchers.length,
      completedCount: completed,
      completionRate: totalStudents === 0 ? 0 : Math.round((completed / totalStudents) * 100),
      avgWatchPercent:avgPercent,
      dropoffSecEstimate: dropoffSec,
    };
  });

  const lowCompletionVideos = videoMetrics.filter((v) => v.completionRate < 40);

  /* ── QCM : questions à faible taux de réussite ─────────────────────── */
  const weakQuestions = [];
  for (const qcm of qcms) {
    const video = videos.find((v) => v._id.toString() === qcm.videoId.toString());
    const allAnswers = (qcm.resultats || []).flatMap((r) => r.answers || []);
    for (const q of qcm.questions || []) {
      const forThis = allAnswers.filter((a) => a.questionId?.toString() === q._id.toString());
      if (forThis.length < 2) continue; // pas assez de données
      const correctCount = forThis.filter((a) => a.correct).length;
      const correctRate = Math.round((correctCount / forThis.length) * 100);
      if (correctRate < 50) {
        weakQuestions.push({
          qcmTitre: qcm.titre,
          videoTitre: video?.titre || '',
          questionTexte: q.texte,
          correctRate,
          attempts: forThis.length,
        });
      }
    }
  }

  /* ── Étudiants : engagement, top, à risque ────────────────────────── */
  const studentEngagement = allProgress.map((p) => {
    const u = p.userId;
    if (!u) return null;

    // Engagement = moyenne (visionnage% sur toutes vidéos) + (avgQCM% si dispo)
    let totalWatched = 0;
    let watchedCount = 0;
    for (const v of videos) {
      const entry = (v.watchedBy || []).find((w) => w.userId.toString() === u._id.toString());
      if (entry) { totalWatched += entry.watchedPercent; watchedCount++; }
    }
    const avgVideoPercent = videos.length === 0 ? 0 : totalWatched / videos.length;

    const scores = (p.qcmScores || []).map((s) => s.score);
    const avgQCM = scores.length === 0 ? null : scores.reduce((a, b) => a + b, 0) / scores.length;

    // Score d'engagement (0-100) : moyenne pondérée
    const engagement = avgQCM !== null
      ? Math.round(0.6 * avgVideoPercent + 0.4 * avgQCM)
      : Math.round(avgVideoPercent);

    return {
      userId:       u._id.toString(),
      prenom:       u.prenom,
      nom:          u.nom,
      email:        u.email,
      avgVideoPercent: Math.round(avgVideoPercent),
      avgQCMScore:  avgQCM === null ? null : Math.round(avgQCM),
      qcmAttempts:  scores.length,
      engagement,
    };
  }).filter(Boolean);

  const atRiskStudents = studentEngagement.filter((s) => s.engagement < 30);
  const topPerformers  = studentEngagement.filter((s) => s.engagement >= 80);

  /* ── Stats globales ──────────────────────────────────────────────── */
  const overallEngagement = studentEngagement.length === 0
    ? 0
    : Math.round(studentEngagement.reduce((s, e) => s + e.engagement, 0) / studentEngagement.length);

  return {
    course: { _id: course._id.toString(), titre: course.titre, filiere: course.filiere, promotion: course.promotion },
    totalStudents,
    overallEngagement,
    videoMetrics,
    lowCompletionVideos,
    weakQuestions,
    studentEngagement,
    atRiskStudents,
    topPerformers,
    generatedAt: new Date(),
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   2) GÉNÉRATION DES INSIGHTS via Groq (avec fallback heuristique)
───────────────────────────────────────────────────────────────────────── */
async function buildPromptPayload(metrics) {
  return {
    cours: metrics.course.titre,
    filiere_promotion: `${metrics.course.filiere} ${metrics.course.promotion}`,
    totalEtudiants: metrics.totalStudents,
    engagementGlobal: metrics.overallEngagement,
    videosFaibleCompletion: metrics.lowCompletionVideos.slice(0, 5).map((v) => ({
      titre: v.titre,
      completion: v.completionRate,
      avgVisionnage: v.avgWatchPercent,
      decrochageEstimeSec: v.dropoffSecEstimate,
    })),
    questionsFaibles: metrics.weakQuestions.slice(0, 5).map((q) => ({
      question: q.questionTexte.slice(0, 200),
      tauxReussite: q.correctRate,
      tentatives: q.attempts,
      qcm: q.qcmTitre,
    })),
    etudiantsARisque: metrics.atRiskStudents.slice(0, 5).map((s) => ({
      nom: `${s.prenom} ${s.nom}`,
      engagement: s.engagement,
      videoPercent: s.avgVideoPercent,
      qcmScore: s.avgQCMScore,
    })),
    topPerformers: metrics.topPerformers.slice(0, 5).map((s) => ({
      nom: `${s.prenom} ${s.nom}`,
      engagement: s.engagement,
    })),
  };
}

async function generateViaGroq(metrics, { timeoutMs = 8000 } = {}) {
  const payload = await buildPromptPayload(metrics);

  const sys = `Tu es un coach pédagogique expérimenté qui aide les profs universitaires à interpréter les données de leur cours.
À partir de métriques brutes, tu génères 3 à 5 insights ACTIONNABLES : ce que le prof peut faire CETTE SEMAINE pour améliorer la situation.

RÈGLES STRICTES :
- En français.
- Réponds UNIQUEMENT en JSON strict, sans markdown.
- Format : { "insights": [{ "type": "attention" | "success" | "suggestion", "title": "court < 80 chars", "description": "2 phrases max, contexte chiffré", "action": "1 phrase impérative concrète" }] }
- type "attention" (rouge) : situation problématique qui demande une intervention.
- type "success" (vert) : opportunité positive (top performer à valoriser, classe globalement engagée).
- type "suggestion" (jaune) : ajustement pédagogique à envisager.
- description doit citer les CHIFFRES précis (% complétion, score QCM, engagement, nom d'étudiant).
- action doit être une phrase d'instruction concrète (ex : "Reprendre le concept X en présentiel à la prochaine séance").
- Privilégie 1-2 insights "attention" sur les vraies urgences, le reste équilibré.`;

  const usr = `Voici les métriques d'un cours :\n${JSON.stringify(payload, null, 2)}\n\nGénère 3-5 insights.`;

  const groqPromise = getGroq().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: sys },
      { role: 'user',   content: usr },
    ],
    temperature: 0.6,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  });

  const completion = await Promise.race([
    groqPromise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('groq timeout')), timeoutMs)),
  ]);

  const data = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
  const items = Array.isArray(data?.insights) ? data.insights : [];

  return items
    .filter((i) => i && typeof i.title === 'string' && typeof i.description === 'string')
    .map((i) => ({
      type:        ['attention', 'success', 'suggestion'].includes(i.type) ? i.type : 'suggestion',
      title:       String(i.title).slice(0, 200),
      description: String(i.description).slice(0, 600),
      action:      String(i.action || '').slice(0, 300),
    }))
    .slice(0, 5);
}

/* ─────────────────────────────────────────────────────────────────────────
   FALLBACK HEURISTIQUE — si Groq down/timeout, on génère quand même
───────────────────────────────────────────────────────────────────────── */
function generateHeuristicInsights(metrics) {
  const insights = [];

  if (metrics.atRiskStudents.length > 0) {
    insights.push({
      type: 'attention',
      title: `${metrics.atRiskStudents.length} étudiant${metrics.atRiskStudents.length > 1 ? 's' : ''} à risque`,
      description: `Engagement < 30% : ${metrics.atRiskStudents.slice(0, 3).map((s) => `${s.prenom} ${s.nom}`).join(', ')}${metrics.atRiskStudents.length > 3 ? ` et ${metrics.atRiskStudents.length - 3} autres` : ''}.`,
      action: 'Contacter individuellement ces étudiants pour comprendre les blocages.',
    });
  }

  if (metrics.lowCompletionVideos.length > 0) {
    const v = metrics.lowCompletionVideos[0];
    insights.push({
      type: 'suggestion',
      title: `Vidéo faiblement consommée : « ${v.titre} »`,
      description: `Seuls ${v.completionRate}% des étudiants l'ont terminée${v.dropoffSecEstimate ? ` (décrochage estimé à ${v.dropoffSecEstimate}s)` : ''}.`,
      action: 'Reprendre le contenu en présentiel ou découper la vidéo en parties plus courtes.',
    });
  }

  if (metrics.weakQuestions.length > 0) {
    const q = metrics.weakQuestions[0];
    insights.push({
      type: 'suggestion',
      title: `Question mal réussie : ${q.correctRate}% de bonne réponse`,
      description: `« ${q.questionTexte.slice(0, 120)}${q.questionTexte.length > 120 ? '…' : ''} » sur ${q.attempts} tentatives.`,
      action: 'Ré-expliquer ce concept en classe ou ajouter une vidéo de remédiation.',
    });
  }

  if (metrics.topPerformers.length > 0) {
    const top = metrics.topPerformers[0];
    insights.push({
      type: 'success',
      title: `Top performer : ${top.prenom} ${top.nom}`,
      description: `Engagement à ${top.engagement}% — élève à valoriser comme tuteur entre pairs.`,
      action: 'Proposer un Prosit avancé ou un rôle de mentor sur le prochain projet.',
    });
  } else if (metrics.overallEngagement >= 70) {
    insights.push({
      type: 'success',
      title: 'Classe globalement engagée',
      description: `Engagement moyen ${metrics.overallEngagement}% — au-dessus du seuil de réussite.`,
      action: 'Maintenir le rythme et envisager un défi supplémentaire pour les avancés.',
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'suggestion',
      title: 'Pas encore assez de données',
      description: `${metrics.totalStudents} étudiant${metrics.totalStudents > 1 ? 's' : ''} inscrit${metrics.totalStudents > 1 ? 's' : ''}, peu de progression mesurable.`,
      action: 'Inviter les étudiants à compléter au moins une vidéo + un QCM cette semaine.',
    });
  }

  return insights.slice(0, 5);
}

/* ─────────────────────────────────────────────────────────────────────────
   API PUBLIQUE
───────────────────────────────────────────────────────────────────────── */
/**
 * generateInsights(courseId, options)
 * @param {object} options
 * @param {boolean} options.bypassCache — refresh manuel
 * @returns {Promise<{insights, metrics, generatedAt, fromCache, source}>}
 */
export async function generateInsights(courseId, { bypassCache = false } = {}) {
  if (!bypassCache) {
    const cached = insightsCache.get(courseId);
    if (cached && Date.now() - cached.generatedAt < CACHE_TTL_MS) {
      return { ...cached.payload, fromCache: true };
    }
  }

  const metrics = await computeMetrics(courseId);

  let insights;
  let source = 'groq';
  try {
    if (!process.env.GROQ_API_KEY) throw new Error('no GROQ_API_KEY');
    insights = await generateViaGroq(metrics);
    if (!insights || insights.length === 0) throw new Error('empty groq output');
  } catch (err) {
    console.warn('[teacherInsights] Groq fallback heuristique:', err.message);
    insights = generateHeuristicInsights(metrics);
    source = 'heuristic';
  }

  const payload = {
    insights,
    metrics: {
      totalStudents:      metrics.totalStudents,
      overallEngagement:  metrics.overallEngagement,
      atRiskCount:        metrics.atRiskStudents.length,
      topPerformersCount: metrics.topPerformers.length,
      lowCompletionVideosCount: metrics.lowCompletionVideos.length,
      weakQuestionsCount: metrics.weakQuestions.length,
    },
    atRiskStudents: metrics.atRiskStudents,
    topPerformers:  metrics.topPerformers,
    generatedAt:    new Date(),
    source,
    fromCache:      false,
  };

  insightsCache.set(courseId, { generatedAt: Date.now(), payload });
  return payload;
}

/**
 * generateStudentSuggestion(courseId, userId)
 * Mini-plan d'action personnalisé pour un étudiant donné.
 */
export async function generateStudentSuggestion(courseId, userId) {
  const metrics = await computeMetrics(courseId);
  const student = metrics.studentEngagement.find((s) => s.userId === userId.toString());
  if (!student) throw new Error('Étudiant non inscrit dans ce cours');

  const sys = `Tu es un coach pédagogique. Tu écris à un prof qui veut aider un étudiant spécifique.
Format JSON strict : { "summary": "1 phrase qui caractérise l'étudiant", "actions": ["action 1 concrète", "action 2", "action 3"] }
Privilégie des actions précises (max 3), réalistes en 1 semaine, en français.`;

  const usr = `Cours : ${metrics.course.titre} (${metrics.course.filiere} ${metrics.course.promotion}).
Étudiant : ${student.prenom} ${student.nom}.
Engagement : ${student.engagement}%.
Visionnage moyen : ${student.avgVideoPercent}%.
Score QCM moyen : ${student.avgQCMScore ?? 'aucun QCM passé'}.
Tentatives QCM : ${student.qcmAttempts}.
Catégorie : ${student.engagement < 30 ? 'à risque' : student.engagement >= 80 ? 'top performer' : 'moyen'}.`;

  try {
    if (!process.env.GROQ_API_KEY) throw new Error('no GROQ_API_KEY');
    const groqPromise = getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: sys },
        { role: 'user',   content: usr },
      ],
      temperature: 0.5,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });
    const completion = await Promise.race([
      groqPromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('groq timeout')), 6000)),
    ]);
    const data = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
    return {
      student,
      summary: String(data.summary || '').slice(0, 300),
      actions: Array.isArray(data.actions) ? data.actions.slice(0, 5).map((a) => String(a).slice(0, 300)) : [],
      source: 'groq',
    };
  } catch (err) {
    console.warn('[teacherInsights] suggestion fallback:', err.message);
    const isAtRisk = student.engagement < 30;
    const isTop    = student.engagement >= 80;
    return {
      student,
      summary: isAtRisk
        ? `${student.prenom} décroche (engagement ${student.engagement}%) — intervention recommandée.`
        : isTop
          ? `${student.prenom} maîtrise déjà bien le cours (engagement ${student.engagement}%).`
          : `${student.prenom} progresse à un rythme moyen (engagement ${student.engagement}%).`,
      actions: isAtRisk
        ? ['Programmer un entretien individuel cette semaine', 'Identifier les blocages avec lui (vidéo non vue ? QCM raté ?)', 'Lui proposer un binôme avec un top performer']
        : isTop
          ? ['Lui proposer un Prosit avancé sur la même thématique', 'L\'inviter à devenir tuteur entre pairs sur les questions difficiles', 'Le valoriser publiquement (Hall of Fame, badge spécial)']
          : ['Vérifier qu\'il a bien complété toutes les vidéos (≥ 80%)', 'Encourager à refaire les QCM ratés', 'Le solliciter pour un rôle actif dans le prochain Prosit'],
      source: 'heuristic',
    };
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Cache utility (utile pour les tests et bypass UI)
───────────────────────────────────────────────────────────────────────── */
export function clearCache(courseId) {
  if (courseId) insightsCache.delete(courseId);
  else insightsCache.clear();
}

export default { generateInsights, generateStudentSuggestion, computeMetrics, clearCache };
