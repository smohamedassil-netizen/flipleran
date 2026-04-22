/**
 * Client HTTP vers le microservice Python IA (ai-service/).
 * Utilise fetch natif (Node 18+), aucun package supplémentaire requis.
 *
 * Variables d'environnement :
 *   AI_SERVICE_URL   — ex: http://localhost:5001
 *   AI_SERVICE_TOKEN — doit matcher celui du service Python
 */

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL?.replace(/\/$/, '') || 'http://localhost:5001';
const AI_SERVICE_TOKEN = process.env.AI_SERVICE_TOKEN || 'change-me';
const DEFAULT_TIMEOUT_MS = 15000;

/* ─── Helper interne ───────────────────────────────────────────────────── */
async function call(path, { method = 'GET', body = null, timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${AI_SERVICE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-AI-Service-Token': AI_SERVICE_TOKEN,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const contentType = res.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await res.json()
      : await res.text();

    if (!res.ok) {
      const err = new Error(typeof payload === 'string' ? payload : payload.error || 'AI service error');
      err.status = res.status;
      err.payload = payload;
      throw err;
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

/* ─── API publique ─────────────────────────────────────────────────────── */
export async function aiHealth() {
  return call('/health');
}

export async function aiTrain({ rebuildDataset = true } = {}) {
  // L'entraînement peut prendre 30s à 2min — on augmente le timeout.
  return call('/train', {
    method: 'POST',
    body: { rebuild_dataset: rebuildDataset },
    timeout: 300_000,
  });
}

export async function aiPredictFromFeatures(features) {
  return call('/predict/features', { method: 'POST', body: features });
}

export async function aiPredictForStudent(userId, courseId) {
  return call(`/predict/student/${encodeURIComponent(userId)}/${encodeURIComponent(courseId)}`);
}

export async function aiAtRiskStudents({ courseId = null, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (courseId) params.set('courseId', courseId);
  params.set('limit', String(limit));
  return call(`/students/at-risk?${params.toString()}`);
}

/** Vérifie rapidement que le service est joignable. Log mais ne throw pas. */
export async function aiIsReachable() {
  try {
    await call('/health', { timeout: 3000 });
    return true;
  } catch (err) {
    console.warn(`[aiService] Service IA injoignable : ${err.message}`);
    return false;
  }
}
