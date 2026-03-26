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

    let contacts = [];

    if (me.role === 'etudiant') {
      // Camarades (même filière + promotion) + professeurs de mes cours
      const [classmates, courses] = await Promise.all([
        User.find({
          _id: { $ne: me._id },
          role: 'etudiant',
          filiere: me.filiere,
          promotion: me.promotion,
          isActive: { $ne: false },
        }).select('nom prenom email role filiere avatar').limit(50),
        Course.find({ filiere: me.filiere, isActive: true }).select('professorId'),
      ]);

      const profIds = [...new Set(courses.map(c => c.professorId.toString()))];
      const professors = await User.find({
        _id: { $in: profIds },
        isActive: { $ne: false },
      }).select('nom prenom email role filiere avatar');

      // Ajouter les admins (support)
      const admins = await User.find({
        role: 'admin', isActive: { $ne: false },
      }).select('nom prenom email role filiere avatar');
      contacts = [...admins, ...professors, ...classmates];
    } else if (me.role === 'professeur') {
      // Étudiants de mes cours + autres professeurs
      const myCourses = await Course.find({ professorId: me._id }).select('filiere promotion');
      const filters = myCourses.map(c => ({ filiere: c.filiere, promotion: c.promotion }));

      const [students, otherProfs] = await Promise.all([
        filters.length > 0
          ? User.find({
              role: 'etudiant',
              isActive: { $ne: false },
              $or: filters,
            }).select('nom prenom email role filiere promotion avatar').limit(100)
          : Promise.resolve([]),
        User.find({
          _id: { $ne: me._id },
          role: 'professeur',
          isActive: { $ne: false },
        }).select('nom prenom email role filiere avatar'),
      ]);

      // Ajouter les admins (support)
      const admins = await User.find({
        role: 'admin', _id: { $ne: me._id }, isActive: { $ne: false },
      }).select('nom prenom email role filiere avatar');
      contacts = [...admins, ...otherProfs, ...students];
    } else {
      // Admin : tous les utilisateurs
      contacts = await User.find({
        _id: { $ne: me._id },
        isActive: { $ne: false },
      }).select('nom prenom email role filiere avatar').limit(100);
    }

    // Fallback: si aucun contact trouvé, montrer tous les utilisateurs actifs
    if (contacts.length === 0) {
      contacts = await User.find({
        _id: { $ne: me._id },
        isActive: { $ne: false },
      }).select('nom prenom email role filiere avatar').limit(50);
    }

    res.json(contacts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
