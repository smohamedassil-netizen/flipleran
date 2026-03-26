import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });

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
    });

    const data = sanitize(user);
    const token = generateToken({ id: user._id, role: user.role });

    res.status(201).json({ ...data, token });
  } catch (err) {
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

    const data = sanitize(user);
    const token = generateToken({ id: user._id, role: user.role });

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
