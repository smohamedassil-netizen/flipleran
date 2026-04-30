import Groq from 'groq-sdk';
import Video from '../models/Video.js';
import Course from '../models/Course.js';
import VideoAnalysis from '../models/VideoAnalysis.js';
import VideoQuestion from '../models/VideoQuestion.js';
import QCM from '../models/QCM.js';
import Deck from '../models/Deck.js';
import Card from '../models/Card.js';
import AutoPrepJob from '../models/AutoPrepJob.js';
import { BLOOM_LEVELS } from '../models/LearningOutcome.js';

/**
 * courseAutoPrep — Agent IA d'auto-préparation de cours.
 *
 * Orchestre 5 appels Groq Llama-3.3-70b-versatile en parallèle
 * (Promise.allSettled, donc un échec n'arrête pas les autres) pour générer
 * automatiquement à partir du transcript Whisper :
 *   1. 5 questions in-video aux moments-clés (méthode EdPuzzle)
 *   2. 1 QCM de 10 questions Bloom-mixées
 *   3. 3-5 outcomes Bloom-aligned
 *   4. 1 suggestion de Prosit (en attente de validation prof)
 *   5. 8-12 flashcards SM-2 (Anki-style)
 *
 * Cadre théorique :
 * @see Bergmann, J. & Sams, A. (2012). *Flip Your Classroom*. ISTE.
 *      L'IA dégage du temps prof pour la conception d'activités riches.
 * @see Mazur, E. (1997). *Peer Instruction: A User's Manual*. Prentice Hall.
 *      Les ConcepTests apparaissent quand la notion vient d'être présentée.
 * @see Anderson, L. W. & Krathwohl, D. R. (2001). *A Taxonomy for Learning,
 *      Teaching, and Assessing*. Longman. Pour les outcomes Bloom-aligned.
 * @see Lebrun, M. (2007). *Théories et méthodes pédagogiques*. De Boeck.
 *      Scénarisation pédagogique : l'IA propose, le prof dispose.
 *
 * Décision de design : tous les résultats sont stockés en *brouillon* dans
 * AutoPrepJob.results et publiés en DB seulement quand le prof clique
 * « Publier les éléments validés » (cf. publishResults). On ne crée jamais
 * de QCM/Deck/etc. directement depuis l'IA sans validation humaine.
 */

const MODEL = 'llama-3.3-70b-versatile';

let groqClient;
function getGroq() {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

/* ─────────────────────────────────────────────────────────────────────────
   HELPER : appel Groq avec sortie JSON stricte
───────────────────────────────────────────────────────────────────────── */
async function callGroqJSON(systemPrompt, userPrompt, { temperature = 0.5, maxTokens = 2000 } = {}) {
  const completion = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  });
  const content = completion.choices?.[0]?.message?.content || '{}';
  return JSON.parse(content);
}

/* ─────────────────────────────────────────────────────────────────────────
   1) Questions in-video (méthode EdPuzzle / Mazur ConcepTests)
───────────────────────────────────────────────────────────────────────── */
export async function generateInVideoQuestions({ video, transcript }) {
  const sys = `Tu es un expert pédagogique appliquant la méthode EdPuzzle (Mazur, Peer Instruction).
Ta mission : à partir d'une transcription vidéo, identifier 5 moments-clés où une question favorise l'apprentissage actif.
RÈGLES STRICTES :
- Chaque question doit cibler une notion qui VIENT D'ÊTRE présentée juste avant le timestamp choisi.
- Niveau cognitif : Comprehension (Bloom révisé) — l'étudiant doit reformuler/expliquer, pas juste mémoriser.
- 4 options A/B/C/D : 1 correcte + 3 distracteurs PLAUSIBLES (pas absurdes).
- explanation : 2 phrases max, pédagogique.
- timestamp : entier en SECONDES, dans la durée de la vidéo.
- Réponds UNIQUEMENT en JSON strict, sans markdown.
- Format : { "questions": [{ "timestamp": 90, "question": "...", "options": {"A":"...", "B":"...", "C":"...", "D":"..."}, "correctAnswer": "B", "explanation": "..." }] }`;

  const usr = `Vidéo : "${video.titre}" (durée ${video.duration || 'inconnue'} secondes).
${video.description ? `Description : ${video.description}\n` : ''}
Transcription :
"""
${(transcript || '').slice(0, 8000)}
"""

Génère 5 questions in-video aux moments les plus pertinents.`;

  const data = await callGroqJSON(sys, usr, { temperature: 0.4, maxTokens: 1800 });
  const questions = Array.isArray(data?.questions) ? data.questions : [];

  // Validation + sanitisation
  const cleaned = questions
    .filter((q) => q && typeof q.question === 'string' && q.options && ['A', 'B', 'C', 'D'].includes(q.correctAnswer))
    .map((q) => ({
      timestamp: Math.max(0, Math.min(video.duration || 9999, Math.round(Number(q.timestamp) || 0))),
      question:  String(q.question).slice(0, 1000),
      options: {
        A: String(q.options.A || '').slice(0, 200),
        B: String(q.options.B || '').slice(0, 200),
        C: String(q.options.C || '').slice(0, 200),
        D: String(q.options.D || '').slice(0, 200),
      },
      correctAnswer: q.correctAnswer,
      explanation:   String(q.explanation || '').slice(0, 2000),
    }))
    .slice(0, 5);

  return cleaned;
}

/* ─────────────────────────────────────────────────────────────────────────
   2) QCM 10 questions, mix Bloom (4 Remember, 4 Understand, 2 Apply)
───────────────────────────────────────────────────────────────────────── */
export async function generateQCM({ video, transcript }) {
  const sys = `Tu es un générateur de QCM pédagogique pour université algérienne.
Format : JSON strict, sans markdown.
RÈGLES :
- 10 questions au total.
- Mix Bloom : 4 niveau "remember", 4 "understand", 2 "apply".
- Chaque question = QCU (question à choix unique).
- Options A/B/C/D : 1 correcte + 3 distracteurs plausibles.
- explanation : 2-3 phrases.
- En français.
- Format : { "titre": "...", "questions": [{ "texte": "...", "questionType": "single", "options": {"A":"","B":"","C":"","D":""}, "correctAnswer": "A"|"B"|"C"|"D", "explanation": "...", "bloomLevel": "remember"|"understand"|"apply" }] }`;

  const usr = `Vidéo : "${video.titre}".
${video.description ? `Description : ${video.description}\n` : ''}
Transcription :
"""
${(transcript || '').slice(0, 8000)}
"""

Génère 10 questions QCM Bloom-mixées.`;

  const data = await callGroqJSON(sys, usr, { temperature: 0.5, maxTokens: 3000 });

  const titre = String(data?.titre || `QCM — ${video.titre}`).slice(0, 200);
  const rawQuestions = Array.isArray(data?.questions) ? data.questions : [];

  const questions = rawQuestions
    .filter((q) => q && typeof q.texte === 'string' && q.options && ['A', 'B', 'C', 'D'].includes(q.correctAnswer))
    .map((q) => ({
      texte:        String(q.texte).slice(0, 1000),
      questionType: 'single',
      options: {
        A: String(q.options.A || '').slice(0, 200),
        B: String(q.options.B || '').slice(0, 200),
        C: String(q.options.C || '').slice(0, 200),
        D: String(q.options.D || '').slice(0, 200),
      },
      correctAnswer:  q.correctAnswer,
      correctAnswers: [q.correctAnswer],
      explanation:    String(q.explanation || '').slice(0, 2000),
      bloomLevel:     ['remember', 'understand', 'apply'].includes(q.bloomLevel) ? q.bloomLevel : 'understand',
    }))
    .slice(0, 12);    // marge de sécurité

  return { titre, questions };
}

/* ─────────────────────────────────────────────────────────────────────────
   3) Outcomes Bloom-aligned (Anderson & Krathwohl, 2001)
───────────────────────────────────────────────────────────────────────── */
export async function generateBloomOutcomes({ video, transcript, existingOutcomes }) {
  const existingStatements = (existingOutcomes || []).map((o) => o.statement).filter(Boolean);

  const sys = `Tu es un concepteur pédagogique expert de la taxonomie de Bloom révisée (Anderson & Krathwohl, 2001).
Ta mission : générer 3 à 5 objectifs d'apprentissage observables pour cette vidéo.
RÈGLES :
- Chaque objectif commence par un VERBE D'ACTION OBSERVABLE conjugué à l'infinitif.
- bloomLevel parmi : remember, understand, apply, analyze, evaluate, create.
- estimatedMinutes : temps réaliste pour atteindre l'objectif (10-90).
- En français.
- NE DUPLIQUE PAS les objectifs existants ${existingStatements.length ? `(à éviter : ${existingStatements.slice(0, 5).join(' / ')})` : ''}.
- Format JSON strict : { "outcomes": [{ "statement": "...", "bloomLevel": "...", "estimatedMinutes": 30 }] }`;

  const usr = `Vidéo : "${video.titre}".
${video.description ? `Description : ${video.description}\n` : ''}
Transcription :
"""
${(transcript || '').slice(0, 6000)}
"""

Génère 3-5 outcomes Bloom-aligned.`;

  const data = await callGroqJSON(sys, usr, { temperature: 0.5, maxTokens: 1200 });
  const raw = Array.isArray(data?.outcomes) ? data.outcomes : [];

  return raw
    .filter((o) => o && typeof o.statement === 'string' && BLOOM_LEVELS.includes(o.bloomLevel))
    .filter((o) => !existingStatements.includes(o.statement.trim()))
    .map((o) => ({
      statement:        String(o.statement).trim().slice(0, 500),
      bloomLevel:       o.bloomLevel,
      estimatedMinutes: Math.max(5, Math.min(180, Math.round(Number(o.estimatedMinutes) || 30))),
    }))
    .slice(0, 5);
}

/* ─────────────────────────────────────────────────────────────────────────
   4) Suggestion de Prosit (méthode CESI/APP) — non créé en DB
───────────────────────────────────────────────────────────────────────── */
export async function generateProsiSuggestion({ video, course }) {
  const sys = `Tu es un concepteur pédagogique expert de la méthode CESI/APP (Apprentissage Par Problème).
Ta mission : suggérer un Prosit (étude de cas en groupe) pertinent pour les étudiants L3 ISIL en Algérie.
RÈGLES :
- titre : court et accrocheur (max 100 chars).
- enonce : un cas d'entreprise CRÉDIBLE, ancré dans le contexte algérien si possible (Algérie Telecom, CNAS, Sonatrach, startup locale, etc.). 200 mots max.
- motsCles : 5-8 termes-clés pour orienter la recherche des étudiants.
- problematique : 1 phrase claire qui résume le défi à relever.
- En français.
- Format JSON strict : { "titre": "...", "enonce": "...", "motsCles": [...], "problematique": "..." }`;

  const usr = `Vidéo : "${video.titre}".
Cours : "${course?.titre || ''}" (filière ${course?.filiere || 'ISIL'}, niveau ${course?.promotion || 'L3'}).
${video.description ? `Description vidéo : ${video.description}\n` : ''}

Suggère un Prosit cohérent avec le contenu de cette vidéo.`;

  const data = await callGroqJSON(sys, usr, { temperature: 0.7, maxTokens: 1200 });

  return {
    titre:         String(data?.titre || '').trim().slice(0, 200),
    enonce:        String(data?.enonce || '').trim().slice(0, 3000),
    motsCles:      Array.isArray(data?.motsCles) ? data.motsCles.map((m) => String(m).trim().slice(0, 50)).filter(Boolean).slice(0, 10) : [],
    problematique: String(data?.problematique || '').trim().slice(0, 500),
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   5) Flashcards SM-2 (Anki-style, Wozniak 1990 / Ebbinghaus 1885)
───────────────────────────────────────────────────────────────────────── */
export async function generateFlashcards({ video, transcript }) {
  const sys = `Tu es un concepteur de flashcards SM-2 (méthode Anki, Wozniak SuperMemo).
Ta mission : générer 8-12 flashcards de révision couvrant les concepts clés de la vidéo.
RÈGLES :
- front : question concise et précise (1 question = 1 concept).
- back : réponse complète mais brève (3-5 lignes max).
- difficulty : 1 (très facile) à 5 (très difficile), réparties (~3 niveaux).
- tags : 1-3 mots-clés thématiques.
- En français.
- Format JSON strict : { "flashcards": [{ "front": "...", "back": "...", "difficulty": 1-5, "tags": [...] }] }`;

  const usr = `Vidéo : "${video.titre}".
${video.description ? `Description : ${video.description}\n` : ''}
Transcription :
"""
${(transcript || '').slice(0, 6000)}
"""

Génère 8-12 flashcards.`;

  const data = await callGroqJSON(sys, usr, { temperature: 0.5, maxTokens: 1800 });
  const raw = Array.isArray(data?.flashcards) ? data.flashcards : [];

  return raw
    .filter((c) => c && typeof c.front === 'string' && typeof c.back === 'string')
    .map((c) => {
      const rawDiff = Number(c.difficulty);
      const diff = Number.isFinite(rawDiff) ? Math.round(rawDiff) : 3;
      return {
        front:      String(c.front).trim().slice(0, 500),
        back:       String(c.back).trim().slice(0, 1500),
        difficulty: Math.max(1, Math.min(5, diff)),
        tags:       Array.isArray(c.tags) ? c.tags.map((t) => String(t).trim().slice(0, 30)).filter(Boolean).slice(0, 5) : [],
      };
    })
    .slice(0, 15);
}

/* ─────────────────────────────────────────────────────────────────────────
   ORCHESTRATEUR — Promise.allSettled (résilience : 1 échec n'arrête pas les autres)
───────────────────────────────────────────────────────────────────────── */
export async function run({ jobId }) {
  const job = await AutoPrepJob.findById(jobId);
  if (!job) throw new Error('AutoPrepJob introuvable');

  const startTime = Date.now();
  job.status = 'running';
  job.startedAt = new Date();
  job.results = ['inVideoQuestions', 'qcm', 'outcomes', 'prositSuggestion', 'flashcards'].map((task) => ({
    task, status: 'pending', data: null, error: '',
  }));
  await job.save();

  const [video, course, analysis] = await Promise.all([
    Video.findById(job.videoId).lean(),
    Course.findById(job.courseId).lean(),
    VideoAnalysis.findOne({ videoId: job.videoId, status: 'completed' }).lean(),
  ]);

  if (!video || !course) {
    job.status = 'failed';
    job.errors.push('Vidéo ou cours introuvable');
    job.completedAt = new Date();
    job.durationMs = Date.now() - startTime;
    await job.save();
    return job;
  }

  const transcript = analysis?.transcript || '';
  if (!transcript) {
    job.status = 'failed';
    job.errors.push('Transcription non disponible (VideoAnalysis.status !== completed)');
    job.completedAt = new Date();
    job.durationMs = Date.now() - startTime;
    await job.save();
    return job;
  }

  // Mark each result as running before launching
  for (const r of job.results) r.status = 'running', r.startedAt = new Date();
  await job.save();

  const tasks = await Promise.allSettled([
    generateInVideoQuestions({ video, transcript }),
    generateQCM({ video, transcript }),
    generateBloomOutcomes({ video, transcript, existingOutcomes: course.learningOutcomes || [] }),
    generateProsiSuggestion({ video, course }),
    generateFlashcards({ video, transcript }),
  ]);

  const taskNames = ['inVideoQuestions', 'qcm', 'outcomes', 'prositSuggestion', 'flashcards'];
  tasks.forEach((res, i) => {
    const slot = job.results.find((r) => r.task === taskNames[i]);
    if (!slot) return;
    slot.completedAt = new Date();
    if (res.status === 'fulfilled') {
      slot.status = 'completed';
      slot.data = res.value;
    } else {
      slot.status = 'failed';
      slot.error = String(res.reason?.message || res.reason).slice(0, 1000);
    }
  });

  // Estimation grossière des tokens (entrée + sortie) — non bloquant
  job.tokensUsedEstimate = Math.round((transcript.length / 3) + 6000);
  job.durationMs = Date.now() - startTime;
  job.completedAt = new Date();

  // Statut global : completed si au moins 1 réussi, failed si tous échoués
  const successCount = job.results.filter((r) => r.status === 'completed').length;
  job.status = successCount === 0 ? 'failed' : 'completed';
  if (successCount < job.results.length) {
    job.errors.push(`${job.results.length - successCount}/${job.results.length} sous-tâches ont échoué`);
  }

  await job.save();
  return job;
}

/* ─────────────────────────────────────────────────────────────────────────
   PUBLISH — applique les sélections du prof aux modèles concernés
───────────────────────────────────────────────────────────────────────── */
/**
 * Publie les éléments validés par le prof dans les modèles cibles.
 *
 * @param {object} job — AutoPrepJob avec results.data
 * @param {object} selections — { inVideoQuestions: [bool], qcm: bool, outcomes: [bool], prositSuggestion: bool, flashcards: [bool] }
 * @returns {object} { created: { questions, qcm, outcomes, prositDraft, flashcards } }
 */
export async function publishResults(job, selections, userId) {
  const created = { questions: 0, qcm: false, outcomes: 0, prositDraft: false, flashcards: 0, deckId: null };
  const findResult = (task) => job.results.find((r) => r.task === task);

  /* In-video questions */
  const ivqResult = findResult('inVideoQuestions');
  if (ivqResult?.status === 'completed' && Array.isArray(selections?.inVideoQuestions)) {
    const items = ivqResult.data || [];
    for (let i = 0; i < items.length; i++) {
      if (!selections.inVideoQuestions[i]) continue;
      try {
        await VideoQuestion.create({
          videoId: job.videoId,
          timestamp: items[i].timestamp,
          texte: items[i].question,
          options: items[i].options,
          correctAnswer: items[i].correctAnswer,
          explanation: items[i].explanation,
          pauseVideo: true,
          createdBy: userId,
        });
        created.questions++;
      } catch (err) {
        console.error('[autoPrep] publish IVQ failed:', err.message);
      }
    }
  }

  /* QCM (1 par vidéo, on remplace s'il existe) */
  const qcmResult = findResult('qcm');
  if (qcmResult?.status === 'completed' && selections?.qcm) {
    try {
      const data = qcmResult.data;
      const existing = await QCM.findOne({ videoId: job.videoId });
      if (existing) {
        existing.titre = data.titre;
        existing.questions = data.questions.map(({ bloomLevel, ...q }) => q);
        await existing.save();
      } else {
        await QCM.create({
          videoId: job.videoId,
          titre: data.titre,
          questions: data.questions.map(({ bloomLevel, ...q }) => q),
          pointsPerQuestion: 10,
          timerSeconds: 30,
        });
      }
      created.qcm = true;
    } catch (err) {
      console.error('[autoPrep] publish QCM failed:', err.message);
    }
  }

  /* Outcomes Bloom — append au cours */
  const outcomesResult = findResult('outcomes');
  if (outcomesResult?.status === 'completed' && Array.isArray(selections?.outcomes)) {
    try {
      const items = outcomesResult.data || [];
      const course = await Course.findById(job.courseId);
      if (course) {
        const existingStatements = new Set((course.learningOutcomes || []).map((o) => o.statement));
        for (let i = 0; i < items.length; i++) {
          if (!selections.outcomes[i]) continue;
          if (existingStatements.has(items[i].statement)) continue;
          course.learningOutcomes.push(items[i]);
          created.outcomes++;
        }
        await course.save();
      }
    } catch (err) {
      console.error('[autoPrep] publish outcomes failed:', err.message);
    }
  }

  /* Prosit — on ne le crée PAS, on le marque comme suggestion à valider */
  const prositResult = findResult('prositSuggestion');
  if (prositResult?.status === 'completed' && selections?.prositSuggestion) {
    // Stockage différé : on garde la suggestion dans le job, et le frontend
    // redirige le prof vers /prosits/new avec le payload pré-rempli.
    created.prositDraft = true;
  }

  /* Flashcards → un Deck "Révision auto — [titre vidéo]" */
  const fcResult = findResult('flashcards');
  if (fcResult?.status === 'completed' && Array.isArray(selections?.flashcards)) {
    try {
      const cards = fcResult.data || [];
      const video = await Video.findById(job.videoId).lean();
      if (video) {
        const deckTitle = `Révision auto — ${video.titre}`;
        let deck = await Deck.findOne({ owner: userId, title: deckTitle });
        if (!deck) {
          deck = await Deck.create({
            owner: userId,
            title: deckTitle,
            description: 'Deck généré automatiquement à partir du transcript de la vidéo.',
            category: 'Auto-IA',
            isPublic: false,
            tags: ['auto-ai', 'révision'],
          });
        }
        for (let i = 0; i < cards.length; i++) {
          if (!selections.flashcards[i]) continue;
          // Mapping difficulty 1-5 IA → enum 'easy'|'medium'|'hard' du modèle Card
          const d = cards[i].difficulty;
          const cardDifficulty = d <= 2 ? 'easy' : d >= 4 ? 'hard' : 'medium';
          try {
            await Card.create({
              deck: deck._id,
              front: cards[i].front,
              back: cards[i].back,
              difficulty: cardDifficulty,
            });
            created.flashcards++;
          } catch (err) {
            console.error('[autoPrep] publish flashcard failed:', err.message);
          }
        }
        // Met à jour cardCount du deck
        deck.cardCount = (deck.cardCount || 0) + created.flashcards;
        await deck.save();
        created.deckId = deck._id;
      }
    } catch (err) {
      console.error('[autoPrep] publish deck failed:', err.message);
    }
  }

  return { created };
}

export default { run, publishResults };
