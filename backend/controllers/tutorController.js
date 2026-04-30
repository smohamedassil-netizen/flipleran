import personalTutor from '../services/personalTutor.js';

/**
 * tutorController — Endpoints du tuteur IA personnel.
 *
 * Quota : 30 messages chat/jour/user (compté en mémoire). Le ask-video
 * et les suggestions n'ont pas de quota strict mais bénéficient du cache.
 *
 * @see Bandura 1977, Vygotsky 1978, Mazur 1997 (cf. service personalTutor.js).
 */

const DAILY_CHAT_LIMIT     = 30;     // chat global
const ASK_VIDEO_LIMIT      = 5;      // par (user, video, jour)
const dailyChatCount   = new Map();  // userId → { date, count }
const askVideoCount    = new Map();  // `${userId}:${videoId}` → { date, count }

function checkAndIncrementQuota(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const k = userId.toString();
  const cur = dailyChatCount.get(k);
  if (!cur || cur.date !== today) {
    dailyChatCount.set(k, { date: today, count: 1 });
    return { ok: true, used: 1, limit: DAILY_CHAT_LIMIT };
  }
  if (cur.count >= DAILY_CHAT_LIMIT) {
    return { ok: false, used: cur.count, limit: DAILY_CHAT_LIMIT };
  }
  cur.count++;
  return { ok: true, used: cur.count, limit: DAILY_CHAT_LIMIT };
}

function checkAskVideoQuota(userId, videoId, increment = true) {
  const today = new Date().toISOString().slice(0, 10);
  const k = `${userId}:${videoId}`;
  const cur = askVideoCount.get(k);
  if (!cur || cur.date !== today) {
    if (increment) askVideoCount.set(k, { date: today, count: 1 });
    return { ok: true, used: increment ? 1 : 0, limit: ASK_VIDEO_LIMIT };
  }
  if (cur.count >= ASK_VIDEO_LIMIT) {
    return { ok: false, used: cur.count, limit: ASK_VIDEO_LIMIT };
  }
  if (increment) cur.count++;
  return { ok: true, used: cur.count, limit: ASK_VIDEO_LIMIT };
}

/* POST /api/tutor/chat
   body: { message, history: [{ role: 'user'|'assistant', content }] } */
export async function postChat(req, res) {
  try {
    const { message, history = [] } = req.body || {};
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ message: 'message requis' });
    }

    const quota = checkAndIncrementQuota(req.user.id);
    if (!quota.ok) {
      return res.status(429).json({
        message: `Limite quotidienne atteinte (${DAILY_CHAT_LIMIT} messages/jour). Reviens demain.`,
        used: quota.used,
        limit: quota.limit,
      });
    }

    const reply = await personalTutor.chat(req.user.id, message, history);
    res.set('X-Tutor-Quota-Used',  String(quota.used));
    res.set('X-Tutor-Quota-Limit', String(quota.limit));
    res.json({ reply, quota });
  } catch (err) {
    console.error('[tutor] postChat:', err);
    res.status(500).json({ message: err.message });
  }
}

/* POST /api/tutor/ask-video
   body: { videoId, question, currentTimestamp }
   Quota : 5 questions/vidéo/jour/user (anti-abus). */
export async function postAskVideo(req, res) {
  try {
    const { videoId, question, currentTimestamp = 0 } = req.body || {};
    if (!videoId || !question) {
      return res.status(400).json({ message: 'videoId et question requis' });
    }

    const quota = checkAskVideoQuota(req.user.id, videoId, true);
    if (!quota.ok) {
      return res.status(429).json({
        message: `Limite par vidéo atteinte (${ASK_VIDEO_LIMIT} questions/jour). Reviens demain ou demande à ton tuteur général.`,
        used: quota.used,
        limit: quota.limit,
      });
    }

    const result = await personalTutor.askAboutVideo(req.user.id, videoId, question, Number(currentTimestamp) || 0);
    res.set('X-AskVideo-Quota-Used',  String(quota.used));
    res.set('X-AskVideo-Quota-Limit', String(quota.limit));
    res.json({ ...result, quota });
  } catch (err) {
    console.error('[tutor] postAskVideo:', err);
    res.status(500).json({ message: err.message });
  }
}

/* GET /api/tutor/ask-video/quota?videoId=...
   Retourne le quota courant pour cette vidéo SANS l'incrémenter. */
export async function getAskVideoQuota(req, res) {
  try {
    const { videoId } = req.query || {};
    if (!videoId) return res.status(400).json({ message: 'videoId requis' });
    const quota = checkAskVideoQuota(req.user.id, videoId, false);
    res.json(quota);
  } catch (err) {
    console.error('[tutor] getAskVideoQuota:', err);
    res.status(500).json({ message: err.message });
  }
}

/* GET /api/tutor/suggestions */
export async function getSuggestions(req, res) {
  try {
    const bypassCache = req.query.refresh === 'true';
    const payload = await personalTutor.generateDailySuggestions(req.user.id, { bypassCache });
    res.json(payload);
  } catch (err) {
    console.error('[tutor] getSuggestions:', err);
    res.status(500).json({ message: err.message });
  }
}

/* GET /api/tutor/context (debug, voir ce que sait le tuteur) */
export async function getContext(req, res) {
  try {
    const ctx = await personalTutor.buildStudentContext(req.user.id);
    // Retourne uniquement le résumé textuel + structured "safe"
    res.json({
      summary: ctx.summary,
      structured: ctx.structured,
    });
  } catch (err) {
    console.error('[tutor] getContext:', err);
    res.status(500).json({ message: err.message });
  }
}
