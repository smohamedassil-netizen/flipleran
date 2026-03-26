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

    const result = await uploadBuffer(req.file.buffer, {
      folder:        `fliplearn/resources/${courseId}`,
      resource_type: 'raw',
      public_id:     `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`,
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
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/resources/course/:courseId ────────────────────────────────── */
export const getResourcesByCourse = async (req, res) => {
  try {
    const resources = await Resource.find({ courseId: req.params.courseId })
      .populate('uploadedBy', 'nom prenom')
      .sort({ createdAt: -1 });
    res.json(resources);
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
