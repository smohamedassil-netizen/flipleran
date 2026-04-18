import Message   from '../models/Message.js';
import { askBot } from '../services/chatbot.js';
import { askModuleBot, getModulePersona } from '../services/moduleAI.js';

/* ─── Objet expéditeur virtuel du bot ────────────────────────────────────── */
export const BOT_SENDER = {
  _id:    null,
  nom:    'FlipLearn',
  prenom: 'Assistant',
  isBot:  true,
};

/* ─── POST /api/chatbot/message ──────────────────────────────────────────── */
/**
 * Endpoint HTTP alternatif (le flux principal passe par Socket.io).
 * Body : { message, roomId? }
 */
export const handleChatbotMessage = async (req, res) => {
  try {
    const { message, roomId: bodyRoomId } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ message: 'Message requis.' });
    }

    const roomId = bodyRoomId ?? `bot_${req.user.id}`;

    // Historique des 8 derniers échanges pour le contexte
    const history = await Message.find({ roomId })
      .sort({ createdAt: 1 })
      .limit(10)
      .select('content type');

    // Sauvegarder le message utilisateur
    await Message.create({
      senderId: req.user.id,
      roomId,
      content:  message.trim(),
      type:     'text',
    });

    // Appel IA
    const aiResponse = await askBot(message.trim(), history);

    // Sauvegarder la réponse du bot
    const botMsg = await Message.create({
      roomId,
      content:    aiResponse,
      type:       'bot',
      senderName: 'Assistant FlipLearn',
    });

    res.json({
      response:  aiResponse,
      messageId: botMsg._id,
      sender:    BOT_SENDER,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/chatbot/module/:courseId/persona ─────────────────────────── */
/**
 * Renvoie le persona de l'assistant IA du module + l'historique de conversation
 * pour l'utilisateur courant dans ce module.
 */
export const getModuleChatbot = async (req, res) => {
  try {
    const { courseId } = req.params;
    const persona = await getModulePersona(courseId);
    if (!persona) return res.status(404).json({ message: 'Module introuvable' });

    const roomId = `module_${courseId}_${req.user.id}`;
    const history = await Message.find({ roomId })
      .sort({ createdAt: 1 })
      .limit(50)
      .select('content type createdAt');

    res.json({ persona, history, roomId });
  } catch (err) {
    console.error('[getModuleChatbot]', err);
    res.status(500).json({ message: err.message });
  }
};

/* ─── POST /api/chatbot/module/:courseId/message ────────────────────────── */
export const handleModuleMessage = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message requis.' });

    const roomId = `module_${courseId}_${req.user.id}`;

    // Historique pour le contexte
    const history = await Message.find({ roomId })
      .sort({ createdAt: 1 })
      .limit(12)
      .select('content type');

    // Sauvegarder le message utilisateur
    await Message.create({
      senderId: req.user.id,
      roomId,
      content: message.trim(),
      type: 'text',
    });

    // Appel IA spécialisée
    const aiResponse = await askModuleBot(courseId, message.trim(), history);

    // Sauvegarder la réponse du bot
    const botMsg = await Message.create({
      roomId,
      content: aiResponse,
      type: 'bot',
      senderName: 'Assistant Module',
    });

    res.json({
      response: aiResponse,
      messageId: botMsg._id,
      sender: BOT_SENDER,
    });
  } catch (err) {
    console.error('[handleModuleMessage]', err);
    res.status(500).json({ message: err.message });
  }
};
