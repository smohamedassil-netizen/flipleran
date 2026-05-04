import OpenAI, { toFile } from 'openai';
import { YoutubeTranscript } from 'youtube-transcript';
import VideoAnalysis from '../models/VideoAnalysis.js';
import Video from '../models/Video.js';

/* ─── Singleton OpenAI ───────────────────────────────────────────────────── */
let openai;
function getOpenAI() {
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

/* ─── Constantes ─────────────────────────────────────────────────────────── */
const WHISPER_MAX_SIZE = 25 * 1024 * 1024; // 25 MB
const CHUNK_DURATION   = 600;               // 10 min en secondes

/* ─── 1. Télécharger l'audio depuis Cloudinary ───────────────────────────── */
/**
 * Convertit une URL vidéo Cloudinary en URL audio MP3 et télécharge.
 * Utilise la transformation Cloudinary f_mp3 pour forcer le format audio.
 *
 * URL Cloudinary typique :
 *   https://res.cloudinary.com/xxx/video/upload/v123/folder/file.mp4
 * Transformée en :
 *   https://res.cloudinary.com/xxx/video/upload/f_mp3,q_auto/v123/folder/file.mp4
 */
async function downloadAudioFromCloudinary(videoUrl) {
  // Injecter la transformation f_mp3 après /upload/
  const audioUrl = videoUrl.replace('/upload/', '/upload/f_mp3,q_auto/');

  console.log(`[VideoAnalyzer] Téléchargement audio: ${audioUrl.slice(0, 80)}...`);

  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Échec du téléchargement audio: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`[VideoAnalyzer] Audio téléchargé: ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);
  return { buffer, url: audioUrl };
}

/**
 * Télécharge un segment audio depuis Cloudinary (pour les gros fichiers).
 * Utilise les transformations start_offset/end_offset.
 */
async function downloadAudioChunk(videoUrl, startSec, endSec) {
  const chunkUrl = videoUrl.replace(
    '/upload/',
    `/upload/f_mp3,q_auto,so_${startSec},eo_${endSec}/`
  );

  const response = await fetch(chunkUrl);
  if (!response.ok) {
    throw new Error(`Échec du téléchargement chunk [${startSec}-${endSec}s]: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

/* ─── 2. Transcrire avec Whisper ─────────────────────────────────────────── */
/**
 * Transcrit un buffer audio via OpenAI Whisper.
 * Utilise toFile() de l'OpenAI SDK pour compatibilité Node.js.
 */
async function transcribeBuffer(audioBuffer, filename = 'audio.mp3') {
  const file = await toFile(audioBuffer, filename, { type: 'audio/mpeg' });

  const transcription = await getOpenAI().audio.transcriptions.create({
    model:    'whisper-1',
    file,
    language: 'fr',
  });

  return {
    text:     transcription.text,
    language: 'fr',
  };
}

/**
 * Récupère le transcript natif YouTube (sous-titres auto ou éditoriaux).
 * Évite Whisper et le téléchargement d'audio — beaucoup plus rapide et économique.
 * Essaie d'abord en français, puis fallback sur la langue par défaut.
 */
async function transcribeYouTube(youtubeId) {
  let segments;
  let detectedLang = 'fr';
  try {
    segments = await YoutubeTranscript.fetchTranscript(youtubeId, { lang: 'fr' });
  } catch (errFr) {
    try {
      segments = await YoutubeTranscript.fetchTranscript(youtubeId);
      detectedLang = 'auto';
    } catch (err) {
      throw new Error(
        `Aucun sous-titre disponible pour cette vidéo YouTube. ` +
        `Active les sous-titres sur YouTube ou choisis une autre vidéo. (${err.message})`
      );
    }
  }
  if (!segments || segments.length === 0) {
    throw new Error('Sous-titres YouTube vides pour cette vidéo.');
  }
  const text = segments.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
  console.log(`[VideoAnalyzer] Transcript YouTube récupéré (${text.length} caractères, lang=${detectedLang})`);
  return { text, language: detectedLang === 'auto' ? 'fr' : detectedLang };
}

/**
 * Gère la transcription complète selon la source de la vidéo.
 *   - YouTube : sous-titres natifs (gratuit, pas d'audio à télécharger)
 *   - Cloudinary : pipeline Whisper (avec découpage si > 25 MB)
 */
async function transcribe(video) {
  if (video.provider === 'youtube' && video.youtubeId) {
    return transcribeYouTube(video.youtubeId);
  }

  const { buffer } = await downloadAudioFromCloudinary(video.url);

  // Si le fichier est assez petit, transcription directe
  if (buffer.length <= WHISPER_MAX_SIZE) {
    return transcribeBuffer(buffer);
  }

  // Sinon, découper en chunks de 10 min via Cloudinary
  console.log(`[VideoAnalyzer] Audio trop gros (${(buffer.length / 1024 / 1024).toFixed(1)}MB), découpage en chunks...`);

  const chunks = [];
  for (let start = 0; start < video.duration; start += CHUNK_DURATION) {
    const end = Math.min(start + CHUNK_DURATION, video.duration);
    chunks.push({ start, end });
  }

  const transcriptions = [];
  for (const chunk of chunks) {
    console.log(`[VideoAnalyzer] Chunk ${chunk.start}s-${chunk.end}s...`);
    const chunkBuffer = await downloadAudioChunk(video.url, chunk.start, chunk.end);
    const result = await transcribeBuffer(chunkBuffer, `chunk_${chunk.start}.mp3`);
    transcriptions.push(result.text);
  }

  return {
    text:     transcriptions.join(' '),
    language: 'fr',
  };
}

/* ─── 3. Analyser avec GPT-4o ────────────────────────────────────────────── */
const ANALYSIS_SYSTEM_PROMPT = `Tu es un agent IA pédagogique expert pour une université algérienne.
Tu analyses des transcriptions de cours vidéo et produis des contenus structurés pour la classe inversée.
Tu réponds TOUJOURS en français. Tes analyses sont rigoureuses, précises et adaptées au niveau licence/master.`;

const ANALYSIS_USER_PROMPT = (title, transcript) => `Analyse cette transcription de cours vidéo et génère un JSON structuré.

**Titre du cours :** ${title}

**Transcription :**
${transcript.slice(0, 100000)}

---

Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans backticks) ayant cette structure exacte :

{
  "summary": "Un résumé structuré du cours en 3-5 paragraphes. Utilise des titres avec ## pour les sections principales. Mets en gras les concepts importants.",
  "mindMap": {
    "label": "Titre principal du cours",
    "children": [
      {
        "label": "Thème 1",
        "children": [
          { "label": "Sous-concept 1.1", "children": [] },
          { "label": "Sous-concept 1.2", "children": [] }
        ]
      },
      {
        "label": "Thème 2",
        "children": [
          { "label": "Sous-concept 2.1", "children": [] }
        ]
      }
    ]
  },
  "keyConcepts": [
    { "term": "Concept 1", "definition": "Définition claire et concise du concept" },
    { "term": "Concept 2", "definition": "Définition claire et concise du concept" }
  ]
}

RÈGLES :
- Le résumé doit capturer les idées ESSENTIELLES, pas paraphraser mot à mot
- La carte mentale doit avoir 3-6 branches principales, chacune avec 2-4 sous-branches
- Extrais 8-15 concepts clés avec des définitions de 1-2 phrases
- Tout en français, niveau universitaire
- JSON valide uniquement, aucun texte avant ou après`;

/**
 * Analyse la transcription via GPT-4o et retourne résumé + carte mentale + concepts.
 */
async function analyzeTranscript(transcript, videoTitle) {
  const completion = await getOpenAI().chat.completions.create({
    model:       'gpt-4o',
    messages: [
      { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
      { role: 'user',   content: ANALYSIS_USER_PROMPT(videoTitle, transcript) },
    ],
    max_tokens:  4096,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error('Réponse vide de GPT-4o');

  const parsed = JSON.parse(raw);

  if (!parsed.summary || !parsed.mindMap || !parsed.keyConcepts) {
    throw new Error('Structure de réponse incomplète');
  }

  return parsed;
}

/* ─── 4. Orchestrateur principal ─────────────────────────────────────────── */
/**
 * Lance le pipeline complet d'analyse pour une vidéo.
 * Cette fonction est asynchrone — elle met à jour le status en DB au fur et à mesure.
 */
export async function analyzeVideo(videoId, userId) {
  // Créer ou récupérer l'entrée d'analyse
  let analysis = await VideoAnalysis.findOne({ videoId });
  if (analysis && analysis.status === 'completed') {
    return analysis; // Déjà analysée
  }

  // Si erreur précédente, reset pour relancer
  if (analysis && analysis.status === 'error') {
    analysis.status = 'pending';
    analysis.error  = '';
    await analysis.save();
  }

  if (!analysis) {
    analysis = await VideoAnalysis.create({
      videoId,
      analyzedBy: userId,
      status:     'pending',
    });
  }

  const video = await Video.findById(videoId);
  if (!video) throw new Error('Vidéo introuvable');

  try {
    // Étape 1 : Transcription
    analysis.status = 'transcribing';
    analysis.error  = '';
    await analysis.save();

    console.log(`[VideoAnalyzer] Transcription de "${video.titre}" (provider=${video.provider})...`);
    const { text, language } = await transcribe(video);

    if (!text || text.trim().length < 10) {
      throw new Error('Transcription trop courte ou vide — la vidéo contient-elle de l\'audio ?');
    }

    analysis.transcript = text;
    analysis.language   = language;

    // Étape 2 : Analyse GPT-4o
    analysis.status = 'analyzing';
    await analysis.save();

    console.log(`[VideoAnalyzer] Analyse GPT-4o (${text.length} caractères)...`);
    const { summary, mindMap, keyConcepts } = await analyzeTranscript(text, video.titre);

    analysis.summary     = summary;
    analysis.mindMap     = mindMap;
    analysis.keyConcepts = keyConcepts;
    analysis.status      = 'completed';
    await analysis.save();

    console.log(`[VideoAnalyzer] Analyse terminée pour "${video.titre}"`);
    return analysis;
  } catch (err) {
    console.error(`[VideoAnalyzer] Erreur:`, err.message);
    analysis.status = 'error';
    analysis.error  = err.message;
    await analysis.save();
    throw err;
  }
}

/**
 * Récupère le transcript d'une vidéo (pour injection dans QCM/flashcards).
 */
export async function getTranscript(videoId) {
  const analysis = await VideoAnalysis.findOne({ videoId, status: 'completed' });
  return analysis?.transcript || null;
}
