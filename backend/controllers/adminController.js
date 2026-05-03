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

    // Pagination : protège contre les requêtes massives à grande échelle.
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const skip  = Math.max(parseInt(req.query.skip,  10) || 0, 0);

    const users = await User.find(filter)
      .select('-password')
      .populate('badges', 'nom icon color')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

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

/* GET /api/admin/courses
 * Vue admin : tous les cours enrichis avec studentCount + videoCount.
 * Distinct de courseController.getCourses qui filtre par rôle/filière/promo
 * sans enrichissement statistique. */
export const getAllCoursesWithStats = async (req, res) => {
  try {
    // Pagination optionnelle (anti-runaway sur grosses bases)
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
    const skip  = Math.max(parseInt(req.query.skip,  10) || 0, 0);

    const courses = await Course.find()
      .populate('professorId', 'nom prenom email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    if (courses.length === 0) return res.json([]);

    const courseIds = courses.map((c) => c._id);

    // Une seule agrégation pour les compteurs étudiants + une pour les vidéos.
    // Évite le N+1 (1 + 2N requêtes) → 3 requêtes au total quel que soit N.
    const [studentAgg, videoAgg] = await Promise.all([
      Progress.aggregate([
        { $match: { courseId: { $in: courseIds } } },
        { $group: { _id: '$courseId', count: { $sum: 1 } } },
      ]),
      Video.aggregate([
        { $match: { courseId: { $in: courseIds } } },
        { $group: { _id: '$courseId', count: { $sum: 1 } } },
      ]),
    ]);
    const studByCourse = Object.fromEntries(studentAgg.map((s) => [String(s._id), s.count]));
    const vidByCourse  = Object.fromEntries(videoAgg.map((v)  => [String(v._id), v.count]));

    const enriched = courses.map((c) => ({
      ...c,
      studentCount: studByCourse[String(c._id)] || 0,
      videoCount:   vidByCourse[String(c._id)]  || 0,
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
    const Message = (await import('../models/Message.js')).default;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Comptes globaux + comptes 7j courants + comptes 7j-14j (pour calcul du delta)
    const [
      totalUsers, totalCourses, totalVideos, totalMessages,
      usersCurr, usersPrev,
      coursesCurr, coursesPrev,
      videosCurr, videosPrev,
      messagesCurr, messagesPrev,
      byRole,
      regsAgg,
    ] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Video.countDocuments(),
      Message.countDocuments(),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } }),
      Course.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Course.countDocuments({ createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } }),
      Video.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Video.countDocuments({ createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } }),
      Message.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Message.countDocuments({ createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } }),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      // Inscriptions par jour sur les 7 derniers jours
      User.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Construire le tableau registrationsByDay sur 7 jours, dans l'ordre chronologique,
    // avec libellés courts FR ('Lun', 'Mar', etc.).
    const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const regMap = Object.fromEntries(regsAgg.map(r => [r._id, r.count]));
    const registrationsByDay = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      registrationsByDay.push({ label: dayLabels[d.getUTCDay()], value: regMap[key] || 0 });
    }

    res.json({
      totalUsers, totalCourses, totalVideos, totalMessages,
      byRole,
      // Deltas sur 7 jours = nouveau cette semaine - nouveau semaine précédente
      deltaUsers7d:    usersCurr - usersPrev,
      deltaCourses7d:  coursesCurr - coursesPrev,
      deltaVideos7d:   videosCurr - videosPrev,
      deltaMessages7d: messagesCurr - messagesPrev,
      registrationsByDay,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* GET /api/admin/professors  — liste des profs pour le sélecteur */
export const getProfessors = async (req, res) => {
  try {
    const profs = await User.find({ role: 'professeur' }).select('nom prenom email');
    res.json(profs);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════════════════════════
   MESSAGES (admin view)
═══════════════════════════════════════════════════════════════════════════ */

/* GET /api/admin/messages */
export const getRecentMessages = async (req, res) => {
  try {
    const Message = (await import('../models/Message.js')).default;
    const messages = await Message.find({ type: { $ne: 'bot' } })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('senderId', 'nom prenom email role')
      .populate('receiverId', 'nom prenom email role');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   ACTIVITY LOG
═══════════════════════════════════════════════════════════════════════════ */

/* GET /api/admin/activity */
export const getActivity = async (req, res) => {
  try {
    const [recentUsers, recentCourses, recentVideos] = await Promise.all([
      User.find().sort({ createdAt: -1 }).limit(10).select('nom prenom email role createdAt'),
      Course.find().sort({ createdAt: -1 }).limit(10).select('titre filiere createdAt').populate('professorId', 'nom prenom'),
      Video.find().sort({ createdAt: -1 }).limit(10).select('titre courseId createdAt').populate('courseId', 'titre'),
    ]);

    const activities = [
      ...recentUsers.map(u => ({ type: 'user', message: `${u.prenom} ${u.nom} s'est inscrit (${u.role})`, date: u.createdAt, icon: 'UserPlus' })),
      ...recentCourses.map(c => ({ type: 'course', message: `Cours "${c.titre}" créé par ${c.professorId?.prenom || ''} ${c.professorId?.nom || ''}`, date: c.createdAt, icon: 'BookOpen' })),
      ...recentVideos.map(v => ({ type: 'video', message: `Vidéo "${v.titre}" ajoutée au cours "${v.courseId?.titre || ''}"`, date: v.createdAt, icon: 'Video' })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);

    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   CREATE USER (admin)
═══════════════════════════════════════════════════════════════════════════ */

/* POST /api/admin/seed/l3-isil — déclenche le seed riche L3 ISIL (admin only).
   Crée 3 profs, 10 étudiants, 8 modules avec semestre. Idempotent. */
export const seedL3IsilEndpoint = async (req, res) => {
  try {
    const { seedL3Isil } = await import('../services/l3IsilSeed.js');
    const result = await seedL3Isil();
    res.json({
      message: 'Seed L3 ISIL terminé.',
      summary: result.summary,
      profs:    result.profs,
      students: result.students,
      courses:  result.courses,
    });
  } catch (err) {
    console.error('[seedL3Isil]', err);
    res.status(500).json({ message: err.message });
  }
};

/* POST /api/admin/users */
export const createUser = async (req, res) => {
  try {
    const { nom, prenom, email, password, role, filiere, promotion } = req.body;

    if (!nom || !prenom || !email || !password) {
      return res.status(400).json({ message: 'Nom, prénom, email et mot de passe requis.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Cet email est déjà utilisé.' });

    // Le pre-save hook du modèle User hash le mot de passe automatiquement.
    // Pas de hash manuel ici (sinon double-hash → impossible de se connecter).
    const user = await User.create({
      nom, prenom, email: email.toLowerCase(), password,
      role: role || 'etudiant', filiere: filiere || '', promotion: promotion || '',
    });

    const userObj = user.toObject();
    delete userObj.password;
    res.status(201).json(userObj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
