import Message   from '../models/Message.js';
import { askBot } from '../services/chatbot.js';

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
