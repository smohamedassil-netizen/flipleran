import Message from '../models/Message.js';
import User    from '../models/User.js';
import Course  from '../models/Course.js';

export const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await Message.find({ roomId })
      .populate('senderId', 'nom prenom avatar')
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(messages);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const sendMessage = async (req, res) => {
  try {
    const { roomId, content, receiverId, type } = req.body;
    const message = await Message.create({
      senderId: req.user.id,
      receiverId,
      roomId,
      content,
      type: type ?? 'text',
    });
    await message.populate('senderId', 'nom prenom avatar');
    res.status(201).json(message);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const deleteMessage = async (req, res) => {
  try {
    await Message.findOneAndDelete({ _id: req.params.id, senderId: req.user.id });
    res.json({ message: 'Message supprimé' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/messages/contacts
   Retourne la liste des contacts avec qui l'utilisateur peut chatter.
═══════════════════════════════════════════════════════════════════════════ */
export const getContacts = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select('role filiere promotion');
    if (!me) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    // Tous les utilisateurs voient tous les autres utilisateurs actifs
    const contacts = await User.find({
      _id: { $ne: me._id },
      isActive: { $ne: false },
    }).select('nom prenom email role filiere promotion avatar').limit(200);

    res.json(contacts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
