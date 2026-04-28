import Message from '../models/Message.js';
import User    from '../models/User.js';
import Course  from '../models/Course.js';

/**
 * Vérifie qu'un utilisateur a le droit d'accéder à un roomId donné.
 * Conventions de roomId :
 *   - private_<id1>_<id2> : conversation privée → le user doit être id1 ou id2
 *   - course_<courseId>   : chat de cours → le user doit être inscrit/owner du cours
 *   - bot_<userId>        : chatbot personnel → le user doit être userId
 *   - module_<courseId>_<userId> : assistant module perso → le user doit être userId
 */
async function canAccessRoom(roomId, userId, userRole) {
  if (!roomId || typeof roomId !== 'string') return false;
  if (userRole === 'admin') return true;

  const myId = String(userId);

  if (roomId.startsWith('private_')) {
    const [, id1, id2] = roomId.split('_');
    return id1 === myId || id2 === myId;
  }
  if (roomId.startsWith('bot_')) {
    return roomId === `bot_${myId}`;
  }
  if (roomId.startsWith('module_')) {
    const parts = roomId.split('_');
    // module_<courseId>_<userId>
    return parts[parts.length - 1] === myId;
  }
  if (roomId.startsWith('course_')) {
    const courseId = roomId.slice('course_'.length);
    if (!courseId) return false;
    // Le prof du cours OU les étudiants de la même filière+promotion
    const course = await Course.findById(courseId)
      .select('professorId filiere promotion').lean();
    if (!course) return false;
    if (String(course.professorId) === myId) return true;
    const me = await User.findById(myId).select('role filiere promotion').lean();
    return !!(me && me.role === 'etudiant'
      && me.filiere === course.filiere
      && me.promotion === course.promotion);
  }
  return false;
}

export const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const allowed = await canAccessRoom(roomId, req.user.id, req.user.role);
    if (!allowed) {
      return res.status(403).json({ message: 'Accès refusé à cette conversation.' });
    }
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

    // Étudiants : on limite aux étudiants de la même filière+promotion + TOUS les profs + admins
    // Profs/admins : voient tout le monde
    let userFilter;
    if (me.role === 'etudiant') {
      userFilter = {
        _id: { $ne: me._id },
        isActive: { $ne: false },
        $or: [
          { role: 'etudiant', filiere: me.filiere, promotion: me.promotion },
          { role: 'professeur' },
          { role: 'admin' },
        ],
      };
    } else {
      userFilter = { _id: { $ne: me._id }, isActive: { $ne: false } };
    }

    const contacts = await User.find(userFilter)
      .select('nom prenom email role filiere promotion avatar').limit(200);

    // For each contact, find the last private message
    const myId = req.user.id;
    const contactsWithLastMsg = await Promise.all(contacts.map(async (contact) => {
      const roomId1 = `private_${myId}_${contact._id}`;
      const roomId2 = `private_${contact._id}_${myId}`;
      const lastMsg = await Message.findOne({
        roomId: { $in: [roomId1, roomId2] },
      }).sort({ createdAt: -1 }).select('content createdAt senderId type').limit(1);

      return {
        ...contact.toObject(),
        lastMessage: lastMsg ? {
          content: lastMsg.content?.slice(0, 60) + (lastMsg.content?.length > 60 ? '…' : ''),
          createdAt: lastMsg.createdAt,
          isMe: lastMsg.senderId?.toString() === myId,
        } : null,
      };
    }));

    // Sort: contacts with recent messages first, then alphabetically
    contactsWithLastMsg.sort((a, b) => {
      if (a.lastMessage && !b.lastMessage) return -1;
      if (!a.lastMessage && b.lastMessage) return 1;
      if (a.lastMessage && b.lastMessage) {
        return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
      }
      return (a.prenom || '').localeCompare(b.prenom || '');
    });

    res.json(contactsWithLastMsg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
