import Groq from 'groq-sdk';
import { getLLM } from './llm.js';

let groq;
function getGroq() {
  if (!groq) groq = getLLM();
  return groq;
}

/* ─── Prompt système ─────────────────────────────────────────────────────── */
const SYSTEM_PROMPT = `Tu es un assistant pédagogique nommé "Assistant FlipLearn" pour une université algérienne.
Tu aides exclusivement les étudiants en informatique dans leurs apprentissages.
Règles absolues :
- Tu réponds TOUJOURS en français, même si on te parle en anglais ou en arabe.
- Tes réponses sont concises (max 4 paragraphes), structurées et pédagogiques.
- Si une question n'est pas liée aux études, décline poliment et recentre la conversation.
- Si tu ne connais pas la réponse avec certitude, dis-le et oriente vers le professeur.
- Utilise des exemples concrets et du code quand c'est pertinent.
- Ne génère jamais de contenu inapproprié.`;

/* ─── Prompt pour génération de QCM ───────────────────────────────────── */
const QCM_SYSTEM_PROMPT = `Tu es un générateur de QCM pédagogique pour une université algérienne.
Tu génères des questions à choix multiples en français pour évaluer la compréhension des étudiants.

RÈGLES STRICTES :
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après.
- Le JSON doit avoir la structure exacte : { "questions": [...] }
- Chaque question a : texte, options (A/B/C/D), correctAnswer (lettre), questionType ("single" ou "multiple"), correctAnswers (tableau de lettres pour multiple), explanation
- Les questions doivent être variées : définitions, applications, analyse, code
- Niveau licence informatique
- Tout en français`;

const FALLBACK_RESPONSES = [
  "Je rencontre un problème technique en ce moment. Veuillez réessayer dans quelques instants ou consulter votre professeur. 🙏",
  "Mon service est temporairement indisponible. N'hésitez pas à poser votre question directement à votre professeur.",
];

/* ─── Fonction principale ────────────────────────────────────────────────── */
/**
 * Appelle l'API Groq (llama-3.3-70b-versatile) et retourne la réponse de l'IA.
 * @param {string} userMessage — message de l'étudiant
 * @param {Array}  history     — messages précédents [{ content, type }]
 * @returns {Promise<string>}
 */
export async function askBot(userMessage, history = []) {
  // Construire le contexte conversationnel (max 8 échanges)
  const contextMessages = history
    .slice(-8)
    .map((m) => ({
      role:    m.type === 'bot' ? 'assistant' : 'user',
      content: String(m.content),
    }));

  const messages = [
    { role: 'system',    content: SYSTEM_PROMPT },
    ...contextMessages,
    { role: 'user',      content: userMessage },
  ];

  try {
    const completion = await getGroq().chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      messages,
      max_tokens:  600,
      temperature: 0.7,
      top_p:       0.9,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    return text || FALLBACK_RESPONSES[0];
  } catch (err) {
    console.error('[Chatbot] Groq API error:', err.message);
    return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
  }
}

/* ─── Génération de QCM par IA ────────────────────────────────────────── */
/**
 * Génère des questions QCM automatiquement via Groq.
 * @param {string} topic       — sujet / titre de la vidéo
 * @param {string} description — description du cours ou de la vidéo
 * @param {number} count       — nombre de questions à générer (défaut: 5)
 * @returns {Promise<Array>}   — tableau de questions
 */
export async function generateQuizQuestions(topic, description = '', count = 5, transcript = '') {
  const transcriptContext = transcript
    ? `\n\nTranscription complète du cours :\n"""${transcript.slice(0, 12000)}"""\n\nBase tes questions UNIQUEMENT sur le contenu de cette transcription.`
    : '';

  const userPrompt = `Génère exactement ${count} questions QCM sur le sujet suivant :
Sujet : "${topic}"
${description ? `Description : "${description}"` : ''}${transcriptContext}

Retourne UNIQUEMENT un JSON valide avec cette structure :
{
  "questions": [
    {
      "texte": "La question ici ?",
      "options": { "A": "option A", "B": "option B", "C": "option C", "D": "option D" },
      "correctAnswer": "B",
      "questionType": "single",
      "correctAnswers": ["B"],
      "explanation": "Explication de la bonne réponse"
    }
  ]
}

Inclus au moins 1 question de type "multiple" (plusieurs bonnes réponses) avec correctAnswers contenant plusieurs lettres.
Assure-toi que chaque question est pertinente, claire et de niveau licence informatique.`;

  if (!process.env.GROQ_API_KEY) {
    console.error('[QCM Generator] GROQ_API_KEY manquante dans les variables d\'environnement.');
    throw new Error("Le service IA n'est pas configuré sur le serveur (clé GROQ manquante). Contactez l'administrateur.");
  }

  try {
    const completion = await getGroq().chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: QCM_SYSTEM_PROMPT },
        { role: 'user',   content: userPrompt },
      ],
      max_tokens:  2000,
      temperature: 0.6,
      top_p:       0.9,
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) throw new Error('Réponse vide de l\'IA');

    // Extraire le JSON (peut être entouré de markdown ```json ... ```)
    let jsonStr = raw;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('[QCM Generator] JSON parse failed. Raw response:', raw.slice(0, 500));
      throw new Error("L'IA a renvoyé une réponse incorrecte. Réessayez ou réduisez le nombre de questions.");
    }
    const questions = parsed.questions ?? parsed;

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("L'IA n'a pas généré de questions exploitables. Réessayez.");
    }

    // Valider et nettoyer chaque question
    return questions.map((q) => ({
      texte:          q.texte || 'Question sans énoncé',
      options:        {
        A: q.options?.A || 'Option A',
        B: q.options?.B || 'Option B',
        C: q.options?.C || 'Option C',
        D: q.options?.D || 'Option D',
      },
      correctAnswer:  q.correctAnswer || 'A',
      questionType:   q.questionType === 'multiple' ? 'multiple' : 'single',
      correctAnswers: Array.isArray(q.correctAnswers) ? q.correctAnswers : [q.correctAnswer || 'A'],
      explanation:    q.explanation || '',
    }));
  } catch (err) {
    // Si c'est deja une erreur "metier" lisible, on la repropage telle quelle
    if (err.message && (
      err.message.includes('IA') ||
      err.message.includes('GROQ') ||
      err.message.includes('clé')
    )) {
      throw err;
    }
    // Erreur reseau / SDK / quota
    console.error('[QCM Generator] Error:', err.message);
    if (err.status === 401 || err.message?.includes('Unauthorized')) {
      throw new Error("Clé GROQ invalide ou expirée. Contactez l'administrateur.");
    }
    if (err.status === 429 || err.message?.includes('rate')) {
      throw new Error('Quota IA dépassé pour le moment. Réessayez dans quelques minutes.');
    }
    throw new Error("Service IA indisponible. Vérifiez votre connexion ou réessayez plus tard.");
  }
}
