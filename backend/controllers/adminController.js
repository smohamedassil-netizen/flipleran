import User    from '../models/User.js';
import Course  from '../models/Course.js';
import Video   from '../models/Video.js';
import Progress from '../models/Progress.js';

/* ═══════════════════════════════════════════════════════════════════════════
   USERS
═══════════════════════════════════════════════════════════════════════════ */

/* GET /api/admin/users  (?role=&search=) */
export const getUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    const filter = {};
    if (role)   filter.role = role;
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ nom: re }, { prenom: re }, { email: re }];
    }

    const users = await User.find(filter)
      .select('-password')
      .populate('badges', 'nom icon color')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* PUT /api/admin/users/:id/toggle  — activer / désactiver */
export const toggleUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Impossible de désactiver un admin.' });

    user.isActive = !user.isActive;
    await user.save();
    res.json({ isActive: user.isActive, message: user.isActive ? 'Compte activé.' : 'Compte désactivé.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* PUT /api/admin/users/:id  — modifier role / filiere / promotion */
export const updateUser = async (req, res) => {
  try {
    const allowed = ['role', 'filiere', 'promotion', 'nom', 'prenom'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* DELETE /api/admin/users/:id */
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Impossible de supprimer un admin.' });
    if (user._id.toString() === req.user.id) return res.status(403).json({ message: 'Impossible de se supprimer soi-même.' });

    await user.deleteOne();
    res.json({ message: 'Utilisateur supprimé.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════════════════════════
   COURSES
═══════════════════════════════════════════════════════════════════════════ */

/* GET /api/admin/courses */
export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate('professorId', 'nom prenom email')
      .sort({ createdAt: -1 });

    // Ajouter le nombre d'étudiants et de vidéos
    const enriched = await Promise.all(courses.map(async (c) => {
      const [studentCount, videoCount] = await Promise.all([
        Progress.countDocuments({ courseId: c._id }),
        Video.countDocuments({ courseId: c._id }),
      ]);
      return { ...c.toObject(), studentCount, videoCount };
    }));

    res.json(enriched);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* POST /api/admin/courses */
export const createCourse = async (req, res) => {
  try {
    const { titre, description, professorId, filiere, promotion } = req.body;
    if (!titre || !professorId || !filiere || !promotion) {
      return res.status(400).json({ message: 'titre, professorId, filiere, promotion sont requis.' });
    }
    const course = await Course.create({ titre, description, professorId, filiere, promotion });
    await course.populate('professorId', 'nom prenom email');
    res.status(201).json(course);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* PUT /api/admin/courses/:id */
export const updateCourse = async (req, res) => {
  try {
    const allowed = ['titre', 'description', 'professorId', 'filiere', 'promotion', 'isActive'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    const course = await Course.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('professorId', 'nom prenom email');
    if (!course) return res.status(404).json({ message: 'Cours introuvable.' });
    res.json(course);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* DELETE /api/admin/courses/:id */
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: 'Cours introuvable.' });
    res.json({ message: 'Cours supprimé.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════════════════════════
   STATS GLOBALES
═══════════════════════════════════════════════════════════════════════════ */
export const getStats = async (req, res) => {
  try {
    const [totalUsers, totalCourses, totalVideos, totalMessages] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Video.countDocuments(),
      (await import('../models/Message.js')).default.countDocuments(),
    ]);

    const byRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    res.json({ totalUsers, totalCourses, totalVideos, totalMessages, byRole });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* GET /api/admin/professors  — liste des profs pour le sélecteur */
export const getProfessors = async (req, res) => {
  try {
    const profs = await User.find({ role: 'professeur' }).select('nom prenom email');
    res.json(profs);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
