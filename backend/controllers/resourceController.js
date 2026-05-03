import Resource from '../models/Resource.js';
import { uploadBuffer, deleteAsset } from '../config/cloudinary.js';

/* ─── Détecte le type à partir du mimetype ───────────────────────────────── */
function detectType(mimetype = '') {
  if (mimetype.includes('pdf'))         return 'pdf';
  if (mimetype.includes('presentation')) return 'pptx';
  if (mimetype.includes('word'))        return 'docx';
  if (mimetype.includes('zip'))         return 'zip';
  return 'autre';
}

/* ─── POST /api/resources/upload ─────────────────────────────────────────── */
export const uploadResource = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier fourni.' });

    const { titre, description, courseId } = req.body;
    if (!titre || !courseId) {
      return res.status(400).json({ message: 'titre et courseId sont requis.' });
    }

    const type = detectType(req.file.mimetype);

    // 'raw' is correct for non-media files (PDF, DOCX, PPTX, ZIP)
    const cleanName = req.file.originalname
      .replace(/\s+/g, '_')
      .replace(/\.[^.]+$/, ''); // remove extension (Cloudinary adds it)
    const result = await uploadBuffer(req.file.buffer, {
      folder:        `fliplearn/resources/${courseId}`,
      resource_type: 'raw',
      public_id:     `${Date.now()}_${cleanName}`,
    });

    const resource = await Resource.create({
      titre,
      description: description ?? '',
      courseId,
      uploadedBy:  req.user.id,
      type,
      url:         result.secure_url,
      publicId:    result.public_id,
      size:        req.file.size,
    });

    await resource.populate('uploadedBy', 'nom prenom');
    res.status(201).json(resource);
  } catch (err) {
    console.error('Resource upload error:', err.message, err.http_code || '');
    res.status(500).json({ message: `Erreur upload : ${err.message}` });
  }
};

/* ─── GET /api/resources/course/:courseId ────────────────────────────────── */
export const getResourcesByCourse = async (req, res) => {
  try {
    // Étudiant : vérifier que le cours est de sa filière/promotion
    if (req.user.role === 'etudiant') {
      const Course = (await import('../models/Course.js')).default;
      const course = await Course.findById(req.params.courseId).select('filiere promotion');
      if (!course) return res.status(404).json({ message: 'Cours introuvable.' });
      if (course.filiere !== req.user.filiere || course.promotion !== req.user.promotion) {
        return res.status(403).json({ message: 'Ce cours ne fait pas partie de ta filière.' });
      }
    }

    const resources = await Resource.find({ courseId: req.params.courseId })
      .populate('uploadedBy', 'nom prenom')
      .sort({ createdAt: -1 });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/resources/all ─────────────────────────────────────────────── */
/**
 * Retourne TOUTES les ressources accessibles à l'utilisateur courant en une
 * seule requête, groupées par cours. Évite le pattern N+1 où le frontend
 * faisait 1 appel par cours.
 *
 * Réponse : [{ course: {_id, titre, filiere, promotion}, resources: [...] }, ...]
 */
export const getAllAccessibleResources = async (req, res) => {
  try {
    const Course = (await import('../models/Course.js')).default;

    // Filtrer les cours accessibles selon le rôle
    let courseFilter = {};
    if (req.user.role === 'etudiant') {
      courseFilter = {
        isActive: true,
        filiere: req.user.filiere,
        promotion: req.user.promotion,
      };
    } else if (req.user.role === 'professeur') {
      courseFilter = { professorId: req.user.id };
    }
    // admin : pas de filtre (tous les cours)

    const courses = await Course.find(courseFilter)
      .select('_id titre filiere promotion')
      .lean();
    if (courses.length === 0) return res.json([]);

    const courseIds = courses.map((c) => c._id);
    const resources = await Resource.find({ courseId: { $in: courseIds } })
      .populate('uploadedBy', 'nom prenom')
      .sort({ createdAt: -1 })
      .lean();

    // Grouper par courseId
    const byCourse = {};
    for (const r of resources) {
      const key = String(r.courseId);
      if (!byCourse[key]) byCourse[key] = [];
      byCourse[key].push(r);
    }

    const result = courses
      .map((c) => ({
        course: c,
        resources: byCourse[String(c._id)] || [],
      }))
      .filter((entry) => entry.resources.length > 0);

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── DELETE /api/resources/:id ──────────────────────────────────────────── */
export const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Ressource introuvable.' });

    if (resource.publicId) {
      await deleteAsset(resource.publicId, 'raw').catch(() => {});
    }
    await resource.deleteOne();
    res.json({ message: 'Ressource supprimée.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
