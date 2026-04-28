import Feedback from '../models/Feedback.js';
import User from '../models/User.js';
import { pushNotification } from '../services/notificationService.js';

/* ─── POST /api/feedback (prof seulement) ─────────────────────────────── */
export const createFeedback = async (req, res) => {
  try {
    const { studentId, courseId, videoId, qcmId, message } = req.body;
    if (!studentId || !message?.trim()) {
      return res.status(400).json({ message: 'studentId et message sont requis.' });
    }

    // Vérifier que l'étudiant existe
    const student = await User.findById(studentId).select('role');
    if (!student || student.role !== 'etudiant') {
      return res.status(404).json({ message: 'Étudiant introuvable.' });
    }

    const fb = await Feedback.create({
      profId:    req.user.id,
      studentId,
      courseId:  courseId || undefined,
      videoId:   videoId  || undefined,
      qcmId:     qcmId    || undefined,
      message:   message.trim(),
    });

    // Notification temps reel a l'etudiant
    const io = req.app.get('io');
    if (io) {
      await pushNotification(io, {
        userId:      studentId,
        type:        'feedback',
        priority:    'normal',
        title:       'Nouveau retour de votre professeur',
        message:     message.trim().slice(0, 120) + (message.length > 120 ? '…' : ''),
        link:        '/my-feedback',
        relatedType: 'feedback',
        relatedId:   fb._id,
      });
    }

    res.status(201).json(fb);
  } catch (err) {
    console.error('[createFeedback]', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/feedback/mine (etudiant) ───────────────────────────────── */
export const getMyFeedback = async (req, res) => {
  try {
    const list = await Feedback.find({ studentId: req.user.id })
      .populate('profId',   'nom prenom')
      .populate('courseId', 'titre')
      .populate('videoId',  'titre')
      .populate('qcmId',    'titre')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── PUT /api/feedback/:id/read (etudiant marque comme lu) ───────────── */
export const markFeedbackRead = async (req, res) => {
  try {
    const fb = await Feedback.findById(req.params.id);
    if (!fb) return res.status(404).json({ message: 'Feedback introuvable.' });
    if (fb.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }
    fb.read = true;
    await fb.save();
    res.json(fb);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
