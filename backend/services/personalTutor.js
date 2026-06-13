import Groq from 'groq-sdk';
import { getLLM } from './llm.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Video from '../models/Video.js';
import VideoAnalysis from '../models/VideoAnalysis.js';
import QCM from '../models/QCM.js';
import Progress from '../models/Progress.js';
import Prosit from '../models/Prosit.js';

/**
 * personalTutor — Agent IA tuteur personnel pour chaque étudiant.
 *
 * @description Construit un contexte profond sur l'étudiant (cours en cours,
 * QCM récents, concepts faibles/forts, streaks, prosits actifs) et l'utilise
 * comme system prompt pour un chat Groq Llama-3.3-70b-versatile en méthode
 * **socratique** : le tuteur ne donne JAMAIS la réponse directe à un QCM
 * ou un exercice — il guide par questions.
 *
 * Cadre théorique :
 * @see Bandura, A. (1977). Self-efficacy: Toward a unifying theory of
 *      behavioral change. *Psychological Review*. Le sentiment d'efficacité
 *      personnelle progresse mieux quand un mentor montre que l'effort
 *      paie, plutôt que quand il fait à la place.
 * @see Vygotsky, L. S. (1978). *Mind in Society*. Harvard. Concept de
 *      Zone Proximale de Développement : le tuteur travaille à la lisière
 *      des compétences déjà acquises de l'étudiant.
 * @see Mazur, E. (1997). *Peer Instruction*. Méthode socratique : "Don't
 *      ask if students understand, make them prove it" — guide par
 *      questions plutôt que de donner la réponse.
 */

const MODEL = 'llama-3.3-70b-versatile';

let groqClient;
function getGroq() {
  if (!groqClient) groqClient = getLLM();
  return groqClient;
}

/* ─────────────────────────────────────────────────────────────────────────
   1) CONTEXTE ÉTUDIANT — buildStudentContext
───────────────────────────────────────────────────────────────────────── */

/**
 * Construit un objet structuré + un résumé textuel formaté pour LLM.
 * @returns {Promise<{ structured, summary }>}
 */
export async function buildStudentContext(userId) {
  const user = await User.findById(userId)
    .select('prenom nom filiere promotion points prositRolesCycle')
    .lean();
  if (!user) throw new Error('Utilisateur introuvable');

  // Cours en cours (filière + promotion)
  const courses = await Course.find({
    isActive: true, filiere: user.filiere, promotion: user.promotion,
  }).select('titre description').lean();

  // Progress par cours
  const courseIds = courses.map((c) => c._id);
  const progresses = await Progress.find({
    userId, courseId: { $in: courseIds },
  }).lean();

  const progByCourse = new Map(progresses.map((p) => [p.courseId.toString(), p]));

  // Vidéos par cours pour calculer % completion
  const videos = await Video.find({ courseId: { $in: courseIds } }).select('_id titre courseId').lean();
  const videosByCourse = new Map();
  for (const v of videos) {
    const cid = v.courseId.toString();
    if (!videosByCourse.has(cid)) videosByCourse.set(cid, []);
    videosByCourse.get(cid).push(v);
  }

  const courseStatus = courses.map((c) => {
    const cid = c._id.toString();
    const prog = progByCourse.get(cid);
    const vids = videosByCourse.get(cid) || [];
    const completed = (prog?.videosCompleted || []).length;
    const total = vids.length;
    return {
      courseId: cid,
      titre: c.titre,
      progress: total === 0 ? 0 : Math.round((completed / total) * 100),
      videosCompleted: completed,
      totalVideos: total,
      qcmCount: (prog?.qcmScores || []).length,
      avgQCM: prog?.qcmScores?.length
        ? Math.round(prog.qcmScores.reduce((s, x) => s + x.score, 0) / prog.qcmScores.length)
        : null,
      lastActivity: prog?.lastActivity || null,
    };
  });

  // 5 derniers QCM passés
  const allQcmIds = progresses.flatMap((p) => (p.qcmScores || []).map((s) => s.qcmId));
  const qcms = allQcmIds.length > 0
    ? await QCM.find({ _id: { $in: allQcmIds } }).select('titre videoId resultats').lean()
    : [];

  const myResults = [];
  for (const q of qcms) {
    for (const r of (q.resultats || [])) {
      if (r.userId?.toString() !== userId.toString()) continue;
      myResults.push({
        qcmTitre: q.titre,
        videoId:  q.videoId?.toString(),
        score:    r.score,
        completedAt: r.completedAt,
        // Concepts ratés : questions où correct=false
        wrongQuestions: (r.answers || []).filter((a) => !a.correct).length,
        totalQuestions: (r.answers || []).length,
      });
    }
  }
  myResults.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  const recentQCM = myResults.slice(0, 5);

  // Concepts faibles (issus des questions QCM ratées) — agrégation simpliste
  const weakConcepts = [];
  for (const q of qcms) {
    for (const r of (q.resultats || [])) {
      if (r.userId?.toString() !== userId.toString()) continue;
      for (const a of (r.answers || [])) {
        if (!a.correct) {
          const question = q.questions?.find?.((qq) => qq._id?.toString() === a.questionId?.toString());
          if (question) weakConcepts.push(question.texte.slice(0, 100));
        }
      }
    }
  }

  // Streaks (jours consécutifs d'activité) — approx via lastActivity de chaque progress
  const allActivityDates = progresses
    .map((p) => p.lastActivity)
    .filter(Boolean)
    .map((d) => new Date(d).toISOString().slice(0, 10));
  const uniqueDays = [...new Set(allActivityDates)];

  // Prosits actifs où l'étudiant est membre
  const activeProsits = await Prosit.find({
    status: { $in: ['aller', 'recherche', 'retour'] },
    'groupes.membres.userId': userId,
  }).select('titre status dateAller dateRetour').lean();

  const structured = {
    user: { prenom: user.prenom, nom: user.nom, filiere: user.filiere, promotion: user.promotion, points: user.points },
    courses: courseStatus,
    recentQCM,
    weakConcepts: weakConcepts.slice(0, 5),
    uniqueDaysActive: uniqueDays.length,
    activeProsits: activeProsits.map((p) => ({ titre: p.titre, status: p.status })),
  };

  // Résumé textuel pour LLM
  const summary = `
Étudiant : ${user.prenom} ${user.nom}, ${user.filiere} ${user.promotion}, ${user.points || 0} XP.
Cours en cours : ${courseStatus.length} (${courseStatus.map((c) => `${c.titre} ${c.progress}%`).join(' ; ')}).
Derniers QCM : ${recentQCM.length === 0 ? 'aucun' : recentQCM.map((r) => `${r.qcmTitre} (${r.score}%)`).join(' ; ')}.
Concepts faibles probables : ${weakConcepts.length === 0 ? 'pas encore identifiés' : weakConcepts.slice(0, 3).join(' / ')}.
Prosits actifs : ${activeProsits.length === 0 ? 'aucun' : activeProsits.map((p) => `"${p.titre}" en ${p.status}`).join(' ; ')}.
`.trim();

  return { structured, summary };
}

/* ─────────────────────────────────────────────────────────────────────────
   2) CHAT — non-streaming pour simplicité v1
───────────────────────────────────────────────────────────────────────── */

const SOCRATIC_RULES = `RÈGLES PÉDAGOGIQUES (méthode socratique) :
- TUTOIE l'étudiant en français.
- Style : bienveillant, encourageant, clair. Réponses concises (max 4 paragraphes).
- Ne donne JAMAIS la réponse directe à un QCM ou à un exercice noté. Guide par questions, exemples analogues, indices progressifs.
- Si l'étudiant te demande la réponse à un QCM ou à un Prosit, refuse poliment et propose une démarche socratique.
- Si la question concerne un cours spécifique, base-toi sur le contexte fourni.
- Si tu ne connais pas la réponse avec certitude, dis-le et oriente vers le professeur.
- Mets l'étudiant en zone proximale de développement (Vygotsky) : un peu au-dessus de ses acquis, jamais hors de portée.
- Renforce le sentiment d'efficacité personnelle (Bandura) : valorise les efforts, pas seulement les résultats.`;

export async function chat(userId, message, history = []) {
  const { summary } = await buildStudentContext(userId);

  const sys = `Tu es le tuteur pédagogique personnel de cet étudiant.
${SOCRATIC_RULES}

CONTEXTE ÉTUDIANT :
${summary}`;

  // Limite l'historique à 8 derniers échanges pour ne pas exploser les tokens
  const recentHistory = (history || []).slice(-8).map((m) => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: String(m.content || '').slice(0, 2000),
  }));

  const completion = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: sys },
      ...recentHistory,
      { role: 'user', content: String(message || '').slice(0, 2000) },
    ],
    temperature: 0.6,
    max_tokens: 800,
  });

  return completion.choices?.[0]?.message?.content || 'Je n\'ai pas de réponse pour le moment, réessaye dans un instant.';
}

/* ─────────────────────────────────────────────────────────────────────────
   3) RAG sur le transcript d'une vidéo
───────────────────────────────────────────────────────────────────────── */

export async function askAboutVideo(userId, videoId, question, currentTimestamp = 0) {
  const video = await Video.findById(videoId).select('titre duration courseId').lean();
  if (!video) throw new Error('Vidéo introuvable');

  const analysis = await VideoAnalysis.findOne({ videoId, status: 'completed' }).lean();
  const transcript = analysis?.transcript || '';

  if (!transcript) {
    return {
      answer: 'La transcription de cette vidéo n\'est pas encore disponible. Demande à ton prof de lancer l\'analyse IA.',
      citedTimestamps: [],
      confidence: 0,
    };
  }

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const sys = `Tu es le tuteur de cet étudiant. Il regarde une vidéo et te pose une question dessus.
Voici la vidéo : "${video.titre}" (durée ${video.duration || '?'} sec). Position actuelle : ${formatTime(currentTimestamp)}.

${SOCRATIC_RULES}

RÈGLE SUPPLÉMENTAIRE : si la réponse est dans le transcript, cite le timestamp pertinent au format mm:ss.
Si la réponse N'EST PAS dans la vidéo, dis-le clairement et propose à l'étudiant de demander à son tuteur général.

Format JSON strict : { "answer": "réponse en français max 4 phrases", "citedTimestamps": [120, 245], "confidence": 0-100 }`;

  const usr = `Transcription :
"""
${transcript.slice(0, 8000)}
"""

Question de l'étudiant : ${question}`;

  const completion = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: sys },
      { role: 'user',   content: usr },
    ],
    temperature: 0.4,
    max_tokens: 700,
    response_format: { type: 'json_object' },
  });

  try {
    const data = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
    return {
      answer: String(data.answer || '').slice(0, 1500),
      citedTimestamps: Array.isArray(data.citedTimestamps)
        ? data.citedTimestamps.map((t) => Math.max(0, Math.min(video.duration || 99999, Math.round(Number(t) || 0)))).slice(0, 5)
        : [],
      confidence: Math.max(0, Math.min(100, Math.round(Number(data.confidence) || 0))),
    };
  } catch (err) {
    return {
      answer: completion.choices?.[0]?.message?.content || 'Réponse indisponible.',
      citedTimestamps: [],
      confidence: 0,
    };
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   4) SUGGESTIONS QUOTIDIENNES — 3 actions concrètes
───────────────────────────────────────────────────────────────────────── */

// Cache mémoire : userId → { date: 'YYYY-MM-DD', suggestions: [...] }
const dailySuggestionsCache = new Map();

export async function generateDailySuggestions(userId, { bypassCache = false } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const cached = dailySuggestionsCache.get(userId.toString());
  if (!bypassCache && cached && cached.date === today) {
    return { ...cached.payload, fromCache: true };
  }

  const { structured, summary } = await buildStudentContext(userId);

  const sys = `Tu es le tuteur de cet étudiant. À partir de son contexte, génère exactement 3 suggestions d'actions précises pour AUJOURD'HUI.
RÈGLES :
- Réponds en JSON strict : { "suggestions": [{"action": "phrase courte impérative", "link": "/route/optionnelle ou null", "estimatedMinutes": entier}] }
- Chaque action max 1 phrase, en français, tutoiement.
- Privilégie : 1 action de visionnage/QCM si nécessaire, 1 action sur Prosit/projet en cours, 1 action de révision (flashcards) ou métacognition.
- Adapte au profil : étudiant en difficulté → tâches courtes (15-30 min) ; étudiant fort → défi (45-60 min).`;

  const usr = `Contexte :
${summary}

Génère 3 suggestions pour aujourd'hui.`;

  let suggestions = [];
  let source = 'groq';
  try {
    if (!process.env.GROQ_API_KEY) throw new Error('no GROQ_API_KEY');
    const groqPromise = getGroq().chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.6,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });
    const completion = await Promise.race([
      groqPromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('groq timeout')), 6000)),
    ]);
    const data = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
    if (Array.isArray(data.suggestions)) {
      suggestions = data.suggestions
        .filter((s) => s && typeof s.action === 'string')
        .map((s) => ({
          action: String(s.action).slice(0, 200),
          link: s.link && /^\/[a-z0-9/_:-]*$/i.test(String(s.link)) ? String(s.link) : null,
          estimatedMinutes: Math.max(5, Math.min(120, Math.round(Number(s.estimatedMinutes) || 30))),
        }))
        .slice(0, 3);
    }
  } catch (err) {
    console.warn('[personalTutor] daily suggestions fallback:', err.message);
    source = 'heuristic';
  }

  // Fallback heuristique si Groq KO ou suggestions vides
  if (suggestions.length === 0) {
    suggestions = [];
    const inProgressCourse = structured.courses.find((c) => c.progress > 0 && c.progress < 100);
    if (inProgressCourse) {
      suggestions.push({
        action: `Continue le cours « ${inProgressCourse.titre} » (avancement ${inProgressCourse.progress}%).`,
        link: `/courses/${inProgressCourse.courseId}`,
        estimatedMinutes: 30,
      });
    }
    if (structured.activeProsits.length > 0) {
      const p = structured.activeProsits[0];
      suggestions.push({
        action: `Travaille sur ton Prosit « ${p.titre} » (phase ${p.status}).`,
        link: '/prosits',
        estimatedMinutes: 45,
      });
    }
    if (structured.weakConcepts.length > 0) {
      suggestions.push({
        action: `Révise les concepts ratés en QCM via tes flashcards.`,
        link: '/decks',
        estimatedMinutes: 15,
      });
    }
    if (suggestions.length === 0) {
      suggestions.push({
        action: 'Démarre ton premier cours pour voir tes suggestions personnalisées arriver.',
        link: '/courses',
        estimatedMinutes: 20,
      });
    }
  }

  const payload = {
    suggestions,
    generatedAt: new Date(),
    source,
    fromCache: false,
  };
  dailySuggestionsCache.set(userId.toString(), { date: today, payload });
  return payload;
}

export function clearDailyCache(userId) {
  if (userId) dailySuggestionsCache.delete(userId.toString());
  else dailySuggestionsCache.clear();
}

export default { buildStudentContext, chat, askAboutVideo, generateDailySuggestions, clearDailyCache };
