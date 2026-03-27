import SupportTicket from '../models/SupportTicket.js';
import User from '../models/User.js';

// POST /api/support — Create a new ticket
export const createTicket = async (req, res) => {
  try {
    const { nom, email, objet, message } = req.body;
    if (!objet?.trim() || !message?.trim()) {
      return res.status(400).json({ message: 'Objet et message requis' });
    }

    const ticket = await SupportTicket.create({
      userId: req.user.id,
      nom: nom?.trim() || req.user.prenom + ' ' + req.user.nom,
      email: email?.trim() || req.user.email || '',
      objet: objet.trim(),
      message: message.trim(),
    });

    // Notify ALL admins via Socket.io
    const io = req.app.get('io');
    if (io) {
      const admins = await User.find({ role: 'admin', isActive: { $ne: false } }).select('_id');
      for (const admin of admins) {
        io.to(`user_${admin._id}`).emit('notification', {
          type: 'warning',
          message: `Nouveau ticket support : "${objet.trim()}" de ${nom || 'un utilisateur'}`,
          link: '/admin?section=support',
          createdAt: new Date().toISOString(),
        });
      }
    }

    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/support — List all tickets (admin only)
export const getTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate('userId', 'nom prenom email role')
      .populate('acceptedBy', 'nom prenom')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/support/:id/accept — Admin accepts a ticket
export const acceptTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket introuvable' });
    if (ticket.status !== 'pending') {
      return res.status(400).json({ message: 'Ce ticket a déjà été pris en charge' });
    }

    ticket.status = 'accepted';
    ticket.acceptedBy = req.user.id;
    ticket.acceptedAt = new Date();
    await ticket.save();
    await ticket.populate('acceptedBy', 'nom prenom');

    // Notify other admins that this ticket is taken
    const io = req.app.get('io');
    if (io) {
      const admins = await User.find({ role: 'admin', _id: { $ne: req.user.id }, isActive: { $ne: false } }).select('_id');
      const adminName = req.user.prenom + ' ' + req.user.nom;
      for (const admin of admins) {
        io.to(`user_${admin._id}`).emit('notification', {
          type: 'info',
          message: `${adminName} a pris en charge le ticket : "${ticket.objet}"`,
          link: '/admin?section=support',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Notify the user who created the ticket
    if (io) {
      io.to(`user_${ticket.userId}`).emit('notification', {
        type: 'success',
        message: `Votre demande "${ticket.objet}" a été prise en charge par un administrateur.`,
        createdAt: new Date().toISOString(),
      });
    }

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/support/:id/resolve — Admin resolves a ticket
export const resolveTicket = async (req, res) => {
  try {
    const { response } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket introuvable' });

    ticket.status = 'resolved';
    ticket.response = response || '';
    if (!ticket.acceptedBy) {
      ticket.acceptedBy = req.user.id;
      ticket.acceptedAt = new Date();
    }
    await ticket.save();

    // Notify the user
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${ticket.userId}`).emit('notification', {
        type: 'success',
        message: `Votre demande "${ticket.objet}" a été résolue.`,
        createdAt: new Date().toISOString(),
      });
    }

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
