import Course from '../models/Course.js';
import { BLOOM_LEVELS } from '../models/LearningOutcome.js';

export const getCourses = async (req, res) => {
  try {
    let filter;
    if (req.user.role === 'professeur') {
      filter = { professorId: req.user.id };
    } else if (req.user.role === 'admin') {
      filter = {};
    } else {
      // Étudiant : uniquement les cours de sa filière + sa promotion
      filter = {
        isActive: true,
        filiere: req.user.filiere,
        promotion: req.user.promotion,
      };
    }
    const courses = await Course.find(filter).populate('professorId', 'nom prenom avatar').sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const createCourse = async (req, res) => {
  try {
    const { titre, description, filiere, promotion } = req.body;
    const course = await Course.create({ titre, description, filiere, promotion, professorId: req.user.id });

    // Notify students by email
    try {
      const { sendNotificationEmail } = await import('../services/emailService.js');
      const User = (await import('../models/User.js')).default;
      const students = await User.find({
        role: 'etudiant',
        filiere: course.filiere,
        isActive: true
      }).select('email prenom').limit(50);

      for (const student of students) {
        if (student.email) {
          sendNotificationEmail(
            student.email,
            'Nouveau cours disponible',
            `Un nouveau cours <strong>"${course.titre}"</strong> a été ajouté à votre filière. Connectez-vous pour le consulter !`
          );
        }
      }
    } catch (emailErr) {
      console.error('Course email notification error:', emailErr.message);
    }

    res.status(201).json(course);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('professorId', 'nom prenom avatar');
    if (!course) return res.status(404).json({ message: 'Cours introuvable' });
    // Étudiant : vérifier que le cours est bien de sa filière/promotion
    if (req.user.role === 'etudiant' &&
        (course.filiere !== req.user.filiere || course.promotion !== req.user.promotion)) {
      return res.status(403).json({ message: 'Ce cours ne fait pas partie de ta filière.' });
    }
    res.json(course);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateCourse = async (req, res) => {
  try {
    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, professorId: req.user.id },
      req.body,
      { new: true }
    );
    if (!course) return res.status(404).json({ message: 'Cours introuvable' });
    res.json(course);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({ _id: req.params.id, professorId: req.user.id });
    if (!course) return res.status(404).json({ message: 'Cours introuvable' });
    res.json({ message: 'Cours supprime' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/**
 * GET /api/courses/:id/outcomes
 * Renvoie les objectifs d'apprentissage et le contrat pédagogique d'un cours.
 *
 * Accessible à tous les rôles authentifiés. Les étudiants doivent appartenir
 * à la filière/promotion du cours (cohérent avec getCourseById).
 *
 * @see Anderson & Krathwohl (2001) ; Biggs (1996) — alignement constructif.
 */
export const getCourseOutcomes = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .select('titre filiere promotion learningOutcomes pedagogicalContract');
    if (!course) return res.status(404).json({ message: 'Cours introuvable' });
    if (req.user.role === 'etudiant' &&
        (course.filiere !== req.user.filiere || course.promotion !== req.user.promotion)) {
      return res.status(403).json({ message: 'Ce cours ne fait pas partie de ta filière.' });
    }
    res.json({
      _id: course._id,
      titre: course.titre,
      learningOutcomes: course.learningOutcomes || [],
      pedagogicalContract: course.pedagogicalContract || '',
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/**
 * PUT /api/courses/:id/outcomes
 * Met à jour les objectifs d'apprentissage et le contrat pédagogique.
 * Réservé au professeur du cours (ou admin).
 *
 * Body : { learningOutcomes: [{ statement, bloomLevel, estimatedMinutes }],
 *          pedagogicalContract: 'markdown…' }
 */
export const updateCourseOutcomes = async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, professorId: req.user.id };

    const course = await Course.findOne(filter);
    if (!course) return res.status(404).json({ message: 'Cours introuvable ou accès refusé' });

    const { learningOutcomes, pedagogicalContract } = req.body;

    if (Array.isArray(learningOutcomes)) {
      // On préserve les _id existants pour ne pas casser les Video.coversOutcomes
      const sanitized = learningOutcomes
        .filter((o) => o && typeof o.statement === 'string' && o.statement.trim())
        .filter((o) => BLOOM_LEVELS.includes(o.bloomLevel))
        .map((o) => ({
          ...(o._id ? { _id: o._id } : {}),
          statement:        o.statement.trim(),
          bloomLevel:       o.bloomLevel,
          estimatedMinutes: Math.max(0, Number(o.estimatedMinutes) || 30),
        }));
      course.learningOutcomes = sanitized;
    }
    if (typeof pedagogicalContract === 'string') {
      course.pedagogicalContract = pedagogicalContract.slice(0, 2000);
    }

    await course.save();
    res.json({
      _id: course._id,
      learningOutcomes: course.learningOutcomes,
      pedagogicalContract: course.pedagogicalContract,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/**
 * PUT /api/courses/:id/ai-persona
 * Permet au prof (ou admin) de configurer l'assistant IA du module.
 */
export const updateAiPersona = async (req, res) => {
  try {
    const { nom, specialite, avatar, ton, description, couleur } = req.body;
    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, professorId: req.user.id };

    const course = await Course.findOneAndUpdate(
      filter,
      { $set: {
        'aiPersona.nom': nom,
        'aiPersona.specialite': specialite,
        'aiPersona.avatar': avatar,
        'aiPersona.ton': ton,
        'aiPersona.description': description,
        'aiPersona.couleur': couleur,
      } },
      { new: true }
    );
    if (!course) return res.status(404).json({ message: 'Cours introuvable ou accès refusé' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
