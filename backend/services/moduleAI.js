import Groq from 'groq-sdk';
import Course from '../models/Course.js';
import Video from '../models/Video.js';
import VideoAnalysis from '../models/VideoAnalysis.js';
import Resource from '../models/Resource.js';
import QCM from '../models/QCM.js';

let groq;
function getGroq() {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
}

const TONE_DIRECTIVES = {
  pedagogue: "Ton : pédagogue, bienveillant, patient. Utilise des exemples concrets et progressifs.",
  strict:    "Ton : rigoureux, exigeant, formel. Tu pousses l'étudiant à réfléchir avant de répondre.",
  fun:       "Ton : dynamique, amical, utilise quelques touches d'humour et des analogies parlantes.",
  expert:    "Ton : expert technique, précis, sans détour, niveau ingénieur.",
};

/**
 * Construit un résumé compact du contenu du module pour l'injecter comme contexte RAG.
 * On évite les transcripts complets : on utilise summary + keyConcepts qui sont déjà des extraits synthétiques.
 */
async function buildModuleContext(courseId) {
  const [videos, resources, qcms] = await Promise.all([
    Video.find({ courseId }).select('_id titre description').sort({ order: 1 }),
    Resource.find({ courseId }).select('titre description type'),
    QCM.find({}).populate({ path: 'videoId', match: { courseId }, select: 'courseId titre' })
      .select('titre questions videoId'),
  ]);

  const courseQcms = qcms.filter(q => q.videoId);
  const videoIds = videos.map(v => v._id);
  const analyses = await VideoAnalysis.find({
    videoId: { $in: videoIds },
    status: 'completed',
  }).select('videoId summary keyConcepts');

  const analysisMap = new Map(analyses.map(a => [a.videoId.toString(), a]));

  const parts = [];

  // Vidéos
  if (videos.length > 0) {
    parts.push('## Vidéos du module');
    for (const v of videos) {
      const a = analysisMap.get(v._id.toString());
      parts.push(`- ${v.titre}${v.description ? ` — ${v.description.slice(0, 150)}` : ''}`);
      if (a?.keyConcepts?.length) {
        const concepts = a.keyConcepts.slice(0, 8)
          .map(c => `${c.term}: ${c.definition}`).join(' ; ');
        parts.push(`  Concepts clés: ${concepts}`);
      }
      if (a?.summary) {
        parts.push(`  Résumé: ${a.summary.replace(/\n+/g, ' ').slice(0, 400)}`);
      }
    }
  }

  // Ressources
  if (resources.length > 0) {
    parts.push('\n## Ressources disponibles');
    resources.slice(0, 20).forEach(r => {
      parts.push(`- [${r.type}] ${r.titre}${r.description ? ` — ${r.description.slice(0, 100)}` : ''}`);
    });
  }

  // QCM
  if (courseQcms.length > 0) {
    parts.push('\n## QCM disponibles');
    courseQcms.slice(0, 10).forEach(q => {
      parts.push(`- ${q.titre} (${q.questions?.length || 0} questions)`);
    });
  }

  return parts.join('\n');
}

/**
 * Construit le prompt système spécialisé pour l'assistant du module.
 */
function buildSystemPrompt(course, moduleContext) {
  const persona = course.aiPersona || {};
  const nom = persona.nom?.trim() || `Assistant ${course.titre}`;
  const specialite = persona.specialite?.trim() || course.titre;
  const ton = TONE_DIRECTIVES[persona.ton] || TONE_DIRECTIVES.pedagogue;
  const description = persona.description?.trim() ||
    `Je suis l'assistant IA dédié au module "${course.titre}". Je connais le contenu de ce cours et je peux t'aider à comprendre les concepts, répondre à tes questions et te guider vers les bonnes ressources.`;

  return `Tu es "${nom}", l'assistant pédagogique IA spécialisé dans le module "${course.titre}" (filière ${course.filiere}, promotion ${course.promotion}).
Spécialité : ${specialite}.
${ton}

Ta mission : aider les étudiants à comprendre UNIQUEMENT les concepts de ce module. Tu as accès au contenu réel du cours :

${moduleContext || '(Aucun contenu indexé pour ce module pour le moment.)'}

RÈGLES STRICTES :
- Tu réponds TOUJOURS en français.
- Tu t'appuies EN PRIORITÉ sur le contenu du module ci-dessus. Cite explicitement les vidéos ou ressources pertinentes quand c'est utile (ex: "Regarde la vidéo X ou le chapitre Y").
- Si la question sort du périmètre du module, redirige poliment l'étudiant vers l'assistant général (/chat/bot) ou vers son professeur.
- Si tu n'as pas assez d'info dans le contenu fourni, dis-le honnêtement et propose à l'étudiant de consulter le prof.
- Réponses concises (max 4 paragraphes), structurées, pédagogiques.
- Utilise des exemples de code quand pertinent (mais uniquement s'ils sont liés au module).
- Ne génère jamais de réponse aux QCM directement — guide l'étudiant pour qu'il trouve lui-même.

Présente-toi brièvement au premier message : "${description}"`;
}

/**
 * Appelle Groq pour répondre à un message de l'étudiant dans le contexte du module.
 */
export async function askModuleBot(courseId, userMessage, history = []) {
  const course = await Course.findById(courseId);
  if (!course) throw new Error('Module introuvable');

  const moduleContext = await buildModuleContext(courseId);
  const systemPrompt = buildSystemPrompt(course, moduleContext);

  const contextMessages = history.slice(-8).map((m) => ({
    role:    m.type === 'bot' ? 'assistant' : 'user',
    content: String(m.content),
  }));

  const messages = [
    { role: 'system', content: systemPrompt },
    ...contextMessages,
    { role: 'user', content: userMessage },
  ];

  try {
    const completion = await getGroq().chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      messages,
      max_tokens:  700,
      temperature: 0.6,
      top_p:       0.9,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    return text || "Je rencontre un problème. Réessaie dans quelques instants.";
  } catch (err) {
    console.error('[moduleAI] Groq error:', err.message);
    return "L'assistant du module est momentanément indisponible. Consulte ton professeur en attendant. 🙏";
  }
}

/**
 * Récupère le persona IA du cours (avec valeurs par défaut calculées).
 */
export async function getModulePersona(courseId) {
  const course = await Course.findById(courseId).select('titre filiere aiPersona description');
  if (!course) return null;
  const persona = course.aiPersona || {};
  return {
    courseId: course._id,
    courseTitle: course.titre,
    filiere: course.filiere,
    nom: persona.nom?.trim() || `Assistant ${course.titre}`,
    specialite: persona.specialite?.trim() || course.titre,
    avatar: persona.avatar || '🤖',
    ton: persona.ton || 'pedagogue',
    description: persona.description?.trim() ||
      `Je suis l'assistant IA dédié au module "${course.titre}". Je connais le contenu de ce cours et je peux t'aider à comprendre les concepts, répondre à tes questions et te guider vers les bonnes ressources.`,
    couleur: persona.couleur || '#1B4F72',
  };
}
