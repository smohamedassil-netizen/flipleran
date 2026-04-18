import SupportTicket from '../models/SupportTicket.js';
import User from '../models/User.js';
import { pushNotification } from '../services/notificationService.js';

// POST /api/support — Create a new ticket
export const createTicket = async (req, res) => {
  try {
    const { nom, email, objet, message, priority = 'normal', category = 'autre' } = req.body;
    if (!objet?.trim() || !message?.trim()) {
      return res.status(400).json({ message: 'Objet et message requis' });
    }

    const ticket = await SupportTicket.create({
      userId: req.user.id,
      nom: nom?.trim() || 'Utilisateur',
      email: email?.trim() || '',
      objet: objet.trim(),
      message: message.trim(),
      priority,
      category,
    });

    // Notifier TOUS les admins
    const io = req.app.get('io');
    const admins = await User.find({ role: 'admin', isActive: { $ne: false } }).select('_id');
    const priorityBadge = priority === 'urgent' ? '🔴 URGENT — ' : priority === 'high' ? '⚡ Important — ' : '';
    for (const admin of admins) {
      await pushNotification(io, {
        userId: admin._id,
        type: 'ticket_update',
        priority: priority === 'urgent' ? 'urgent' : priority === 'high' ? 'high' : 'normal',
        title: '🎫 Nouveau ticket',
        message: `${priorityBadge}Nouveau ticket "${objet.trim()}" de ${nom || 'un utilisateur'}`,
        link: '/admin?section=support',
        relatedType: 'ticket',
        relatedId: ticket._id,
      });
    }

    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/support — List all tickets (admin only, avec filtres)
export const getTickets = async (req, res) => {
  try {
    const { status, priority, category, assigned } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assigned === 'me') filter.acceptedBy = req.user.id;
    if (assigned === 'unassigned') filter.acceptedBy = null;

    const tickets = await SupportTicket.find(filter)
      .populate('userId', 'nom prenom email role')
      .populate('acceptedBy', 'nom prenom')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/support/mine — List my tickets (user view)
export const getMyTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user.id })
      .populate('acceptedBy', 'nom prenom')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/support/:id — Detail (owner or admin)
export const getTicketById = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('userId', 'nom prenom email role')
      .populate('acceptedBy', 'nom prenom')
      .populate('conversation.authorId', 'nom prenom role');
    if (!ticket) return res.status(404).json({ message: 'Ticket introuvable' });

    const isOwner = ticket.userId._id.toString() === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/support/:id/accept — Admin prend en charge
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

    const io = req.app.get('io');
    const adminName = `${req.user.prenom || ''} ${req.user.nom || ''}`.trim() || 'un admin';

    // Notifier autres admins
    const admins = await User.find({ role: 'admin', _id: { $ne: req.user.id }, isActive: { $ne: false } }).select('_id');
    for (const admin of admins) {
      await pushNotification(io, {
        userId: admin._id,
        type: 'ticket_update',
        title: '🎫 Ticket pris en charge',
        message: `${adminName} a pris en charge : "${ticket.objet}"`,
        link: '/admin?section=support',
        relatedType: 'ticket',
        relatedId: ticket._id,
      });
    }

    // Notifier l'utilisateur
    await pushNotification(io, {
      userId: ticket.userId,
      type: 'ticket_update',
      priority: 'normal',
      title: '🎫 Ticket pris en charge',
      message: `Ta demande "${ticket.objet}" est prise en charge par un administrateur.`,
      link: '/my-tickets',
      relatedType: 'ticket',
      relatedId: ticket._id,
    });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/support/:id/resolve — Admin résout
export const resolveTicket = async (req, res) => {
  try {
    const { response } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket introuvable' });

    ticket.status = 'resolved';
    ticket.resolvedAt = new Date();
    ticket.response = response || ticket.response || '';
    if (!ticket.acceptedBy) {
      ticket.acceptedBy = req.user.id;
      ticket.acceptedAt = new Date();
    }

    if (response?.trim()) {
      ticket.conversation.push({
        from: 'admin',
        authorId: req.user.id,
        message: response.trim(),
      });
    }

    await ticket.save();

    const io = req.app.get('io');
    await pushNotification(io, {
      userId: ticket.userId,
      type: 'ticket_update',
      priority: 'high',
      title: '✅ Ticket résolu',
      message: `Ta demande "${ticket.objet}" a été résolue.`,
      link: '/my-tickets',
      relatedType: 'ticket',
      relatedId: ticket._id,
    });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/support/:id/message — Ajouter un message à la conversation
export const addTicketMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message requis' });

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket introuvable' });

    const isOwner = ticket.userId.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Accès refusé' });

    const from = isAdmin ? 'admin' : 'user';
    ticket.conversation.push({
      from,
      authorId: req.user.id,
      message: message.trim(),
    });

    // Réouvrir si user répond à un ticket résolu
    if (isOwner && ticket.status === 'resolved') {
      ticket.status = 'accepted';
      ticket.resolvedAt = null;
    }

    await ticket.save();

    const io = req.app.get('io');
    // Notifier l'autre partie
    if (from === 'user') {
      // Notifier admin assigné OU tous les admins
      if (ticket.acceptedBy) {
        await pushNotification(io, {
          userId: ticket.acceptedBy,
          type: 'ticket_update',
          title: '💬 Nouveau message ticket',
          message: `${ticket.nom} a répondu sur "${ticket.objet}"`,
          link: '/admin?section=support',
          relatedType: 'ticket',
          relatedId: ticket._id,
        });
      } else {
        const admins = await User.find({ role: 'admin', isActive: { $ne: false } }).select('_id');
        for (const a of admins) {
          await pushNotification(io, {
            userId: a._id,
            type: 'ticket_update',
            title: '💬 Nouveau message ticket',
            message: `${ticket.nom} a répondu sur "${ticket.objet}"`,
            link: '/admin?section=support',
            relatedType: 'ticket',
            relatedId: ticket._id,
          });
        }
      }
    } else {
      // Notifier user
      await pushNotification(io, {
        userId: ticket.userId,
        type: 'ticket_update',
        title: '💬 Réponse de l\'admin',
        message: `Un admin a répondu sur ton ticket "${ticket.objet}"`,
        link: '/my-tickets',
        relatedType: 'ticket',
        relatedId: ticket._id,
      });
    }

    await ticket.populate('conversation.authorId', 'nom prenom role');
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/support/:id/priority — Admin change la priorité
export const updateTicketPriority = async (req, res) => {
  try {
    const { priority, category } = req.body;
    const update = {};
    if (priority) update.priority = priority;
    if (category) update.category = category;
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!ticket) return res.status(404).json({ message: 'Ticket introuvable' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
