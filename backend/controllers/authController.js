import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { pushNotification } from '../services/notificationService.js';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const generateAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

const generateRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh', { expiresIn: '7d' });

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/api/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const sanitize = (user) => ({
  _id:       user._id,
  nom:       user.nom,
  prenom:    user.prenom,
  email:     user.email,
  role:      user.role,
  filiere:   user.filiere,
  promotion: user.promotion,
  avatar:    user.avatar,
  points:    user.points,
  status:    user.status,
});

/* ─── POST /api/auth/register ─────────────────────────────────────────────── */
export const register = async (req, res) => {
  try {
    const { nom, prenom, email, password, role, filiere, promotion } = req.body;

    if (!nom || !prenom || !email || !password) {
      return res.status(400).json({ message: 'Tous les champs obligatoires doivent etre remplis.' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: 'Un compte avec cet email existe deja.' });
    }

    const allowedRoles = ['etudiant', 'professeur'];
    const assignedRole = allowedRoles.includes(role) ? role : 'etudiant';

    const user = await User.create({
      nom, prenom, email, password,
      role: assignedRole,
      filiere:   filiere   ?? '',
      promotion: promotion ?? '',
      status: 'pending',
    });

    // Notifier les admins qu'un nouveau compte attend validation
    let notifiedAdmins = 0;
    try {
      const io = req.app.get('io');
      const admins = await User.find({ role: 'admin', status: 'active', isActive: { $ne: false } }).select('_id email prenom');
      const filiereLabel = filiere ? ` — ${filiere}${promotion ? ` ${promotion}` : ''}` : '';
      for (const a of admins) {
        await pushNotification(io, {
          userId: a._id,
          type: 'warning',
          priority: 'high',
          title: '👤 Nouvelle inscription',
          message: `${prenom} ${nom} (${assignedRole}${filiereLabel}) demande à rejoindre FlipLearn.`,
          link: '/admin?section=pending',
          relatedType: 'auth',
          relatedId: user._id,
        });
        notifiedAdmins++;
      }
      console.log(`[register] ${prenom} ${nom} <${email}> — ${notifiedAdmins} admin(s) notifié(s)`);
    } catch (err) {
      console.error('[register] notif admins:', err.message);
    }

    // Email de confirmation à l'utilisateur (réception inscription)
    try {
      const { sendNotificationEmail } = await import('../services/emailService.js');
      sendNotificationEmail(
        user.email,
        'Inscription bien reçue',
        `Bonjour ${prenom},<br><br>Nous avons bien reçu ta demande d'inscription à <strong>FlipLearn</strong>${filiere ? ` en filière <strong>${filiere}${promotion ? ` (${promotion})` : ''}</strong>` : ''}.<br><br>Un administrateur va vérifier tes informations dans les plus brefs délais (généralement sous 24h). Tu recevras un nouvel email dès que ton compte sera activé.<br><br>À très vite sur FlipLearn !`
      );
    } catch (err) {
      console.error('[register] email confirmation:', err.message);
    }

    // PAS de token ici — l'utilisateur doit attendre la validation
    res.status(201).json({
      message: 'Compte créé avec succès. Un administrateur doit valider ton inscription avant que tu puisses te connecter.',
      status: 'pending',
      email: user.email,
    });
  } catch (err) {
    console.error('[register] error:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ─── POST /api/auth/login ────────────────────────────────────────────────── */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis.' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // Bloquer si le compte n'est pas encore validé
    if (user.status === 'pending') {
      return res.status(403).json({
        status: 'pending',
        message: "Ton compte est en attente de validation par un administrateur. Tu recevras un email dès qu'il sera activé.",
      });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({
        status: 'rejected',
        message: user.rejectionReason
          ? `Ton inscription a été refusée : ${user.rejectionReason}`
          : "Ton inscription a été refusée par un administrateur.",
      });
    }
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Compte désactivé. Contacte ton administrateur.' });
    }

    const data = sanitize(user);
    const tokenPayload = { id: user._id, role: user.role };
    const token = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ ...data, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/auth/me ────────────────────────────────────────────────────── */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('badges', 'nom icon');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── PUT /api/auth/profile ───────────────────────────────────────────────── */
export const updateProfile = async (req, res) => {
  try {
    const allowed = ['nom', 'prenom', 'filiere', 'promotion', 'avatar'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
    res.json(sanitize(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/auth/user/:id — infos publiques d'un utilisateur ──────────── */
export const getUserById = async (req, res) => {
  try {
    const u = await User.findById(req.params.id).select('nom prenom role filiere promotion');
    if (!u) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    res.json(u);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── PUT /api/auth/avatar ────────────────────────────────────────────────── */
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni.' });
    }
    const { uploadBuffer } = await import('../config/cloudinary.js');
    const result = await uploadBuffer(req.file.buffer, {
      folder: 'fliplearn/avatars',
      resource_type: 'image',
      transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }],
    });
    const user = await (await import('../models/User.js')).default.findByIdAndUpdate(
      req.user.id,
      { avatar: result.secure_url },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── PUT /api/auth/password ──────────────────────────────────────────────── */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caracteres.' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Mot de passe mis a jour.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── Endpoints admin : gestion des inscriptions ─────────────────────────── */

// GET /api/auth/pending — liste des comptes en attente (admin)
export const listPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ status: 'pending' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/auth/users/:id/approve — valider une inscription
export const approveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    if (user.status === 'active') {
      return res.status(400).json({ message: 'Ce compte est déjà actif.' });
    }
    user.status = 'active';
    user.rejectionReason = '';
    user.approvedBy = req.user.id;
    user.approvedAt = new Date();
    user.isActive = true;
    await user.save();

    // Notif en direct (si l'user est connecté ailleurs, sinon vue à sa prochaine connexion)
    const io = req.app.get('io');
    await pushNotification(io, {
      userId: user._id,
      type: 'success',
      priority: 'high',
      title: '🎉 Compte validé',
      message: `Bienvenue ${user.prenom} ! Ton compte FlipLearn est activé, tu peux te connecter.`,
      link: '/login',
    });

    // Envoi email (si configuré)
    try {
      const { sendNotificationEmail } = await import('../services/emailService.js');
      if (user.email) {
        sendNotificationEmail(
          user.email,
          'Ton compte FlipLearn est activé',
          `Bonjour ${user.prenom},<br><br>Bonne nouvelle ! Ton compte FlipLearn a été validé par un administrateur. Tu peux dès maintenant te connecter pour accéder à tes cours.<br><br><a href="${process.env.CLIENT_URL?.split(',')[0] || ''}/login">Me connecter →</a>`
        );
      }
    } catch (e) { console.error('[approveUser email]', e.message); }

    res.json(sanitize(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/auth/users/:id/reject — refuser une inscription
export const rejectUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    user.status = 'rejected';
    user.rejectionReason = reason || '';
    user.approvedBy = req.user.id;
    user.approvedAt = new Date();
    user.isActive = false;
    await user.save();

    try {
      const { sendNotificationEmail } = await import('../services/emailService.js');
      if (user.email) {
        sendNotificationEmail(
          user.email,
          'Inscription FlipLearn non validée',
          `Bonjour ${user.prenom},<br><br>Ton inscription à FlipLearn n'a pas pu être validée.${reason ? `<br><br>Raison : <em>${reason}</em>` : ''}<br><br>Pour toute question, contacte l'administration.`
        );
      }
    } catch (e) { console.error('[rejectUser email]', e.message); }

    res.json(sanitize(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/status?email=... — permet au front de voir le statut d'un compte (sans login).
// Endpoint volontairement minimal : pas d'exposition de `rejectionReason` (envoyé par email
// au moment du rejet via emailService, pas via API publique). Réponse uniforme pour limiter
// l'énumération : on renvoie `exists: false` aussi si l'email est mal formé.
export const checkStatus = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.json({ exists: false });
    }
    const user = await User.findOne({ email: email.toLowerCase() }).select('status');
    if (!user) return res.json({ exists: false });
    res.json({
      exists: true,
      status: user.status,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
