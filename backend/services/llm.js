/**
 * llm.js — Routeur IA unifié (chat completions).
 *
 * Problème : Groq (api.groq.com) est INJOIGNABLE depuis les serveurs Render
 * (blocage réseau « Connection error »), alors qu'OpenAI y est accessible.
 * En local, c'est l'inverse en pratique : Groq marche très bien (et gratuit).
 *
 * Solution : un client unique, compatible avec l'interface Groq
 * (`.chat.completions.create(...)`), qui choisit automatiquement :
 *   - **OpenAI** en production (Render) si une clé OpenAI est présente,
 *   - **Groq** sinon (développement local).
 *
 * Les fichiers métier continuent d'appeler exactement comme avant :
 *   const client = getLLM();
 *   await client.chat.completions.create({ model: 'llama-3.3-70b-versatile', ... });
 * Le modèle « llama-… » est automatiquement remappé vers un modèle OpenAI
 * quand on bascule sur OpenAI — donc aucun autre changement nécessaire.
 *
 * Bascule (par ordre de priorité) :
 *   - LLM_PROVIDER=openai  → force OpenAI (si clé présente)
 *   - LLM_PROVIDER=groq    → force Groq
 *   - sinon : OpenAI en production (NODE_ENV=production) si clé présente, Groq en dev.
 */
import Groq from 'groq-sdk';
import OpenAI from 'openai';

const hasOpenAI = !!process.env.OPENAI_API_KEY;
const forced = (process.env.LLM_PROVIDER || '').toLowerCase();

export const USE_OPENAI =
  forced === 'openai' ? hasOpenAI
  : forced === 'groq' ? false
  : (hasOpenAI && process.env.NODE_ENV === 'production');

// Modèle OpenAI de remplacement (rapide + bon marché, parfait pour la démo).
const OPENAI_MODEL = process.env.LLM_OPENAI_MODEL || 'gpt-4o-mini';
const isGroqModel = (m) => !m || /llama|mixtral|gemma|qwen/i.test(m);

let _client;

/**
 * Retourne un client compatible Groq (`.chat.completions.create`).
 * OpenAI en prod (Render), Groq en local — décidé une seule fois.
 */
export function getLLM() {
  if (_client) return _client;

  if (USE_OPENAI) {
    const oa = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const create = oa.chat.completions.create.bind(oa.chat.completions);
    _client = {
      provider: 'openai',
      chat: {
        completions: {
          // Remappe tout modèle Groq (llama…) vers le modèle OpenAI.
          create: (opts = {}) =>
            create({ ...opts, model: isGroqModel(opts.model) ? OPENAI_MODEL : opts.model }),
        },
      },
    };
    console.log(`[llm] Provider = OpenAI (${OPENAI_MODEL})`);
  } else {
    _client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    try { _client.provider = 'groq'; } catch { /* lecture seule éventuelle */ }
    console.log('[llm] Provider = Groq (llama-3.3-70b)');
  }
  return _client;
}

export default { getLLM, USE_OPENAI };
