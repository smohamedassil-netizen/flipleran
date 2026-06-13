import Groq from 'groq-sdk';
import { getLLM } from './llm.js';

/**
 * aiPlagiarismDetector — Détecte si un texte étudiant a probablement été
 * généré par une IA (ChatGPT, Claude, Gemini…).
 *
 * Stratégie en deux étapes :
 *
 * **1) Heuristiques rapides (pas d'appel réseau, gratuit, ~1 ms)**
 *   - Patterns linguistiques de ChatGPT : « Il est important de noter que »,
 *     « En conclusion », « Tout d'abord », attaques en « Bien sûr ! » ou
 *     « Voici »…
 *   - Liste à puces et titres en cascade (sur-structuration).
 *   - Variabilité de la longueur des phrases (faible variance = suspect).
 *   - Ratio adverbes / verbes (une signature stylistique IA fréquente).
 *
 * **2) Confirmation par l'IA (si heuristique > seuil 35/100)**
 *   - Appel Groq Llama-3.3-70b-versatile, JSON strict, score 0-100.
 *   - Combinaison : score final = 0.6 × heuristique + 0.4 × IA.
 *
 * @description Inspirée de la littérature sur la détection de texte
 * généré : DetectGPT (Mitchell et al., 2023) montre que les sorties LLM
 * occupent des régions de courbure négative dans l'espace des
 * probabilités ; Krishna et al. (2023) « Paraphrasing evades detectors
 * of AI-generated text » documente les patterns linguistiques résiduels
 * qui résistent même au paraphrasage léger.
 *
 * @see Mitchell, E., Lee, Y., Khazatsky, A., Manning, C. D., & Finn, C.
 *      (2023). DetectGPT: Zero-Shot Machine-Generated Text Detection
 *      using Probability Curvature. *ICML*.
 * @see Krishna, K., Song, Y., Karpinska, M., Wieting, J., & Iyyer, M.
 *      (2023). Paraphrasing evades detectors of AI-generated text.
 *      *NeurIPS*.
 *
 * Décision de design : on ne stocke PAS le texte intégral dans le rapport
 * pour préserver la vie privée. Seuls le score, les flags et un extrait
 * tronqué (200 chars) sont persistés.
 */

const HEURISTIC_THRESHOLD_FOR_AI_CHECK = 35;
const MIN_TEXT_LENGTH_FOR_DETECTION    = 80;     // moins → ne vaut pas le coup
const MAX_TEXT_LENGTH_FOR_GROQ         = 4000;   // tronque pour économiser les tokens

let groqClient;
function getGroq() {
  if (!groqClient) groqClient = getLLM();
  return groqClient;
}

/* ─────────────────────────────────────────────────────────────────────────
   PATTERNS LINGUISTIQUES DE CHATGPT (français)
───────────────────────────────────────────────────────────────────────── */
const CHATGPT_PATTERNS = [
  { pattern: /\bil est important de noter\b/i,            weight: 8,  name: 'phrase d\'amorçage IA classique' },
  { pattern: /\ben conclusion\b/i,                        weight: 5,  name: 'transition mécanique' },
  { pattern: /\btout d'abord\b/i,                         weight: 4,  name: 'introduction stéréotypée' },
  { pattern: /\bd'autre part\b.*\bd'une part\b/is,        weight: 6,  name: 'structure d\'autre part / d\'une part' },
  { pattern: /\bbien sûr[ !,.]/i,                         weight: 7,  name: 'amorçage « Bien sûr »' },
  { pattern: /^voici\b/im,                                weight: 5,  name: 'amorçage « Voici »' },
  { pattern: /\bn'oublions pas\b/i,                       weight: 4,  name: 'phrase pivot IA' },
  { pattern: /\bil convient de\b/i,                       weight: 4,  name: 'tournure formelle IA' },
  { pattern: /\ben somme\b/i,                             weight: 4,  name: 'transition mécanique' },
  { pattern: /\bplusieurs aspects\b/i,                    weight: 3,  name: 'expression vague IA' },
  { pattern: /\bdans le contexte actuel\b/i,              weight: 4,  name: 'amorçage IA générique' },
  { pattern: /\bjouer un rôle (clé|crucial|essentiel|important)\b/i, weight: 4, name: 'cliché IA' },
  { pattern: /\bune approche (holistique|globale|stratégique)\b/i,   weight: 5, name: 'jargon IA' },
];

/* ─────────────────────────────────────────────────────────────────────────
   HEURISTIQUE 1 : densité de patterns ChatGPT
───────────────────────────────────────────────────────────────────────── */
function scorePatterns(text) {
  const flags = [];
  let score = 0;
  for (const { pattern, weight, name } of CHATGPT_PATTERNS) {
    if (pattern.test(text)) {
      score += weight;
      flags.push(name);
    }
  }
  return { score: Math.min(40, score), flags };
}

/* ─────────────────────────────────────────────────────────────────────────
   HEURISTIQUE 2 : sur-structuration (listes à puces, titres ##)
───────────────────────────────────────────────────────────────────────── */
function scoreOverStructure(text) {
  const lines = text.split('\n');
  const totalLines = lines.length;
  if (totalLines < 5) return { score: 0, flags: [] };

  const bulletRatio  = lines.filter((l) => /^\s*[-*•]\s/.test(l)).length / totalLines;
  const headingRatio = lines.filter((l) => /^#{1,3}\s/.test(l)).length / totalLines;
  const numberedRatio = lines.filter((l) => /^\d+[.)]\s/.test(l)).length / totalLines;

  const flags = [];
  let score = 0;

  if (bulletRatio > 0.3) {
    score += 8;
    flags.push(`liste à puces excessive (${Math.round(bulletRatio * 100)}% des lignes)`);
  }
  if (headingRatio > 0.15) {
    score += 6;
    flags.push('titres en cascade (Markdown ##)');
  }
  if (numberedRatio > 0.2) {
    score += 5;
    flags.push('numérotation excessive');
  }
  return { score: Math.min(15, score), flags };
}

/* ─────────────────────────────────────────────────────────────────────────
   HEURISTIQUE 3 : variabilité de la longueur des phrases
   Texte humain → variance haute. Texte IA → phrases régulières.
───────────────────────────────────────────────────────────────────────── */
function scoreSentenceVariance(text) {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 5);
  if (sentences.length < 4) return { score: 0, flags: [] };

  const lens = sentences.map((s) => s.split(/\s+/).length);
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  const variance = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / Math.max(mean, 1);   // coefficient of variation

  // Humain typique : cv ∈ [0.4, 0.9]. IA typique : cv ∈ [0.15, 0.35].
  if (cv < 0.25) {
    return { score: 12, flags: [`phrases trop régulières (CV = ${cv.toFixed(2)})`] };
  }
  if (cv < 0.35) {
    return { score: 6, flags: [`phrases assez régulières (CV = ${cv.toFixed(2)})`] };
  }
  return { score: 0, flags: [] };
}

/* ─────────────────────────────────────────────────────────────────────────
   HEURISTIQUE 4 : ratio adverbes / verbes (signature IA)
   Très approximatif : on compte les terminaisons -ment.
───────────────────────────────────────────────────────────────────────── */
function scoreAdverbRatio(text) {
  const words = text.match(/\b[\wÀ-ÿ]+\b/g) || [];
  if (words.length < 100) return { score: 0, flags: [] };

  const adverbs = words.filter((w) => /ment$/i.test(w) && w.length > 4).length;
  const ratio = adverbs / words.length;

  // Humain typique : ~1-2%. IA typique : 3-5%.
  if (ratio > 0.04) {
    return { score: 10, flags: [`densité adverbes en -ment élevée (${(ratio * 100).toFixed(1)}%)`] };
  }
  if (ratio > 0.025) {
    return { score: 4, flags: [`densité adverbes en -ment notable (${(ratio * 100).toFixed(1)}%)`] };
  }
  return { score: 0, flags: [] };
}

/* ─────────────────────────────────────────────────────────────────────────
   ORCHESTRATEUR : assemble les heuristiques
───────────────────────────────────────────────────────────────────────── */
function runHeuristics(text) {
  const r1 = scorePatterns(text);
  const r2 = scoreOverStructure(text);
  const r3 = scoreSentenceVariance(text);
  const r4 = scoreAdverbRatio(text);

  const score = Math.min(100, r1.score + r2.score + r3.score + r4.score);
  const flags = [...r1.flags, ...r2.flags, ...r3.flags, ...r4.flags];
  return { score, flags };
}

/* ─────────────────────────────────────────────────────────────────────────
   CONFIRMATION IA via Groq
───────────────────────────────────────────────────────────────────────── */
async function askGroq(text) {
  const sys = `Tu es un expert en détection de texte généré par IA (ChatGPT, Claude, Gemini).
Évalue le texte ci-dessous et retourne uniquement un JSON strict :
{ "score": 0-100, "reasons": ["raison1", "raison2", ...] }

GUIDE :
- 0-30 : très probablement humain
- 30-60 : ambigu / paraphrasé
- 60-100 : très probablement IA
- raisons : 2-4 indices linguistiques observables, en français.`;

  const usr = `Texte à évaluer :
"""
${text.slice(0, MAX_TEXT_LENGTH_FOR_GROQ)}
"""`;

  const completion = await getGroq().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: sys },
      { role: 'user',   content: usr },
    ],
    temperature: 0.2,
    max_tokens: 400,
    response_format: { type: 'json_object' },
  });
  const data = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
  return {
    score: Math.max(0, Math.min(100, Math.round(Number(data.score) || 0))),
    reasons: Array.isArray(data.reasons) ? data.reasons.slice(0, 4).map((r) => String(r).slice(0, 200)) : [],
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   API PUBLIQUE
───────────────────────────────────────────────────────────────────────── */
/**
 * detectAIGenerated(text, language='fr') :
 *   Retourne { aiProbability: 0-100, flags: [...], reasons: [...] } sans
 *   throw — fail-soft, jamais bloquant pour la soumission étudiant.
 *
 * @param {string} text
 * @param {object} options
 * @param {boolean} options.skipGroq — si true, ne fait que les heuristiques
 * @param {number}  options.timeoutMs — timeout sur l'appel Groq (default 5000)
 */
export async function detectAIGenerated(text, { skipGroq = false, timeoutMs = 5000 } = {}) {
  const safe = (text || '').toString().trim();
  if (safe.length < MIN_TEXT_LENGTH_FOR_DETECTION) {
    return {
      aiProbability: 0,
      flags: ['texte trop court pour détection fiable'],
      reasons: [],
      heuristicScore: 0,
      groqScore: null,
      checkedAt: new Date(),
    };
  }

  const heuristic = runHeuristics(safe);
  let groqScore = null;
  let groqReasons = [];

  if (!skipGroq && heuristic.score >= HEURISTIC_THRESHOLD_FOR_AI_CHECK && process.env.GROQ_API_KEY) {
    try {
      const groqPromise = askGroq(safe);
      const result = await Promise.race([
        groqPromise,
        new Promise((_, rej) => setTimeout(() => rej(new Error('groq timeout')), timeoutMs)),
      ]);
      groqScore = result.score;
      groqReasons = result.reasons;
    } catch (err) {
      console.warn('[aiPlagiarismDetector] Groq fallback heuristique seul :', err.message);
    }
  }

  // Combinaison : si Groq disponible, 60% heuristique + 40% Groq.
  // Sinon, heuristique seule.
  const aiProbability = groqScore !== null
    ? Math.round(0.6 * heuristic.score + 0.4 * groqScore)
    : heuristic.score;

  return {
    aiProbability: Math.max(0, Math.min(100, aiProbability)),
    flags: heuristic.flags,
    reasons: groqReasons,
    heuristicScore: heuristic.score,
    groqScore,
    checkedAt: new Date(),
  };
}

// Exports nommés des helpers pour les tests
export {
  scorePatterns,
  scoreOverStructure,
  scoreSentenceVariance,
  scoreAdverbRatio,
  runHeuristics,
};

export default { detectAIGenerated };
