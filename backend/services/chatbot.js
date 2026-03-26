import Groq from 'groq-sdk';

let groq;
function getGroq() {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
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
export async function generateQuizQuestions(topic, description = '', count = 5) {
  const userPrompt = `Génère exactement ${count} questions QCM sur le sujet suivant :
Sujet : "${topic}"
${description ? `Description : "${description}"` : ''}

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

    const parsed = JSON.parse(jsonStr);
    const questions = parsed.questions ?? parsed;

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Format de réponse invalide');
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
    console.error('[QCM Generator] Error:', err.message);
    throw new Error('Impossible de générer le QCM. Veuillez réessayer.');
  }
}
