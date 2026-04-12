import OpenAI from 'openai';
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
 * Cloudinary permet de changer le format en modifiant l'extension.
 */
async function downloadAudioFromCloudinary(videoUrl) {
  // Transformer l'URL vidéo en audio MP3 via Cloudinary
  // Ex: .../video/upload/v123/folder/file.mp4 → .../video/upload/q_auto/v123/folder/file.mp3
  const audioUrl = videoUrl
    .replace(/\.(mp4|mov|avi|webm|mkv)$/i, '.mp3')
    .replace('/upload/', '/upload/q_auto/');

  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Échec du téléchargement audio: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, url: audioUrl };
}

/**
 * Télécharge un segment audio depuis Cloudinary (pour les gros fichiers).
 * Utilise les transformations start_offset/end_offset.
 */
async function downloadAudioChunk(videoUrl, startSec, endSec) {
  const chunkUrl = videoUrl
    .replace(/\.(mp4|mov|avi|webm|mkv)$/i, '.mp3')
    .replace('/upload/', `/upload/so_${startSec},eo_${endSec},q_auto/`);

  const response = await fetch(chunkUrl);
  if (!response.ok) {
    throw new Error(`Échec du téléchargement chunk [${startSec}-${endSec}s]: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

/* ─── 2. Transcrire avec Whisper ─────────────────────────────────────────── */
/**
 * Transcrit un buffer audio via OpenAI Whisper.
 * @returns {string} texte transcrit
 */
async function transcribeBuffer(audioBuffer, filename = 'audio.mp3') {
  const file = new File([audioBuffer], filename, { type: 'audio/mpeg' });

  const transcription = await getOpenAI().audio.transcriptions.create({
    model:           'whisper-1',
    file,
    language:        'fr',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });

  return {
    text:     transcription.text,
    language: transcription.language || 'fr',
    segments: transcription.segments || [],
  };
}

/**
 * Gère la transcription complète, avec découpage si nécessaire.
 */
async function transcribe(videoUrl, videoDuration) {
  const { buffer } = await downloadAudioFromCloudinary(videoUrl);

  // Si le fichier est assez petit, transcription directe
  if (buffer.length <= WHISPER_MAX_SIZE) {
    return transcribeBuffer(buffer);
  }

  // Sinon, découper en chunks de 10 min via Cloudinary
  console.log(`[VideoAnalyzer] Audio trop gros (${(buffer.length / 1024 / 1024).toFixed(1)}MB), découpage en chunks...`);

  const chunks = [];
  for (let start = 0; start < videoDuration; start += CHUNK_DURATION) {
    const end = Math.min(start + CHUNK_DURATION, videoDuration);
    chunks.push({ start, end });
  }

  const transcriptions = [];
  for (const chunk of chunks) {
    const chunkBuffer = await downloadAudioChunk(videoUrl, chunk.start, chunk.end);
    const result = await transcribeBuffer(chunkBuffer, `chunk_${chunk.start}.mp3`);
    transcriptions.push(result.text);
  }

  return {
    text:     transcriptions.join(' '),
    language: 'fr',
    segments: [],
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

    console.log(`[VideoAnalyzer] Transcription de "${video.titre}"...`);
    const { text, language } = await transcribe(video.url, video.duration);

    if (!text || text.trim().length < 50) {
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
