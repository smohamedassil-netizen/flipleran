import Course from '../models/Course.js';

export const getCourses = async (req, res) => {
  try {
    const filter = req.user.role === 'professeur'
      ? { professorId: req.user.id }
      : { isActive: true };
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
