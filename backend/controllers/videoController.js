import Video from '../models/Video.js';
import Progress from '../models/Progress.js';
import { uploadBuffer, deleteAsset } from '../config/cloudinary.js';
import { addPoints, checkChampionBadge } from '../services/points.js';

const COMPLETION_THRESHOLD = 80; // %

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const getUserEntry = (video, userId) =>
  video.watchedBy.find((w) => w.userId.toString() === userId.toString());

/* ─── POST /api/videos/upload ─────────────────────────────────────────────── */
export const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni.' });
    }

    const { titre, description, courseId, order } = req.body;
    if (!titre || !courseId) {
      return res.status(400).json({ message: 'Titre et courseId requis.' });
    }

    // Upload vers Cloudinary (resource_type video)
    const result = await uploadBuffer(req.file.buffer, {
      folder:        `fliplearn/courses/${courseId}`,
      resource_type: 'video',
      eager:         [{ format: 'jpg', transformation: [{ start_offset: '1' }] }],
      eager_async:   true,
    });

    const video = await Video.create({
      titre,
      description: description ?? '',
      url:         result.secure_url,
      publicId:    result.public_id,
      thumbnailUrl: result.eager?.[0]?.secure_url ?? '',
      duration:    Math.round(result.duration ?? 0),
      order:       Number(order ?? 0),
      courseId,
      createdBy:   req.user.id,
    });

    // Notify students about new video
    try {
      const { sendNotificationEmail } = await import('../services/emailService.js');
      const Course = (await import('../models/Course.js')).default;
      const User = (await import('../models/User.js')).default;
      const course = await Course.findById(courseId);
      if (course) {
        const students = await User.find({
          role: 'etudiant',
          filiere: course.filiere,
          isActive: { $ne: false },
        }).select('email prenom').limit(50);

        for (const student of students) {
          if (student.email) {
            sendNotificationEmail(
              student.email,
              'Nouvelle vidéo disponible',
              `Une nouvelle vidéo <strong>"${titre}"</strong> a été ajoutée au cours <strong>"${course.titre}"</strong>. Regardez-la pour progresser !`
            );
          }
        }
      }

      // Also emit socket notification
      const io = req.app.get('io');
      if (io && course) {
        io.emit('notification', {
          type: 'video',
          message: `Nouvelle vidéo "${titre}" dans le cours "${course.titre}"`,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (notifErr) {
      console.error('Video notification error:', notifErr.message);
    }

    res.status(201).json(video);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Extrait l'ID d'une URL YouTube (plusieurs formats supportés).
 */
function parseYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

/* ─── POST /api/videos/youtube — créer une vidéo depuis URL YouTube ──────── */
export const createYouTubeVideo = async (req, res) => {
  try {
    const { titre, description, courseId, youtubeUrl, duration, order, chapters, deadline } = req.body;
    if (!titre || !courseId || !youtubeUrl) {
      return res.status(400).json({ message: 'titre, courseId et youtubeUrl requis.' });
    }

    const ytId = parseYouTubeId(youtubeUrl);
    if (!ytId) {
      return res.status(400).json({ message: "URL YouTube invalide. Formats acceptés : youtube.com/watch?v=..., youtu.be/..., ou l'ID 11 caractères directement." });
    }

    const thumb = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;

    const video = await Video.create({
      titre,
      description: description ?? '',
      provider:    'youtube',
      url:         `https://www.youtube.com/embed/${ytId}`,
      youtubeId:   ytId,
      thumbnailUrl: thumb,
      duration:    Number(duration ?? 0),
      order:       Number(order ?? 0),
      chapters:    Array.isArray(chapters) ? chapters.filter(c => c.title && c.timestamp >= 0).sort((a, b) => a.timestamp - b.timestamp) : [],
      deadline:    deadline ? new Date(deadline) : null,
      courseId,
      createdBy:   req.user.id,
    });

    res.status(201).json(video);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/videos/course/:courseId ───────────────────────────────────── */
export const getVideosByCourse = async (req, res) => {
  try {
    const videos = await Video.find({ courseId: req.params.courseId })
      .sort({ order: 1, createdAt: 1 })
      .select('-watchedBy');          // on n'envoie pas tout le tableau côté liste

    // Ajouter la progression de l'utilisateur courant sur chaque vidéo
    const videosWithProgress = await Promise.all(
      videos.map(async (v) => {
        const fullVideo = await Video.findById(v._id).select('watchedBy');
        const entry = getUserEntry(fullVideo, req.user.id);
        return {
          ...v.toObject(),
          myProgress: entry
            ? { watchedPercent: entry.watchedPercent, completed: entry.completed }
            : { watchedPercent: 0, completed: false },
        };
      })
    );

    res.json(videosWithProgress);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/videos/:id ────────────────────────────────────────────────── */
export const getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('courseId', 'titre')
      .populate('createdBy', 'nom prenom');
    if (!video) return res.status(404).json({ message: 'Video introuvable.' });

    const entry = getUserEntry(video, req.user.id);
    res.json({
      ...video.toObject(),
      myProgress: entry
        ? { watchedPercent: entry.watchedPercent, completed: entry.completed }
        : { watchedPercent: 0, completed: false },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── POST /api/videos/:id/progress ─────────────────────────────────────── */
export const saveProgress = async (req, res) => {
  try {
    const { watchedPercent } = req.body;
    if (typeof watchedPercent !== 'number' || watchedPercent < 0 || watchedPercent > 100) {
      return res.status(400).json({ message: 'watchedPercent invalide (0-100).' });
    }

    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video introuvable.' });

    const entry = getUserEntry(video, req.user.id);
    const justCompleted = watchedPercent >= COMPLETION_THRESHOLD;

    if (entry) {
      // Ne jamais réduire la progression enregistrée
      if (watchedPercent > entry.watchedPercent) entry.watchedPercent = watchedPercent;
      if (justCompleted && !entry.completed) {
        entry.completed   = true;
        entry.completedAt = new Date();
      }
      entry.lastWatchedAt = new Date();
    } else {
      video.watchedBy.push({
        userId:         req.user.id,
        watchedPercent,
        completed:      justCompleted,
        completedAt:    justCompleted ? new Date() : undefined,
        lastWatchedAt:  new Date(),
      });
    }

    await video.save();

    // Synchroniser Progress si la vidéo vient d'être complétée
    let pointsResult = null;
    const wasAlreadyCompleted = entry?.completed ?? false;

    if (justCompleted) {
      await Progress.findOneAndUpdate(
        { userId: req.user.id, courseId: video.courseId },
        {
          $addToSet:  { videosCompleted: video._id },
          lastActivity: new Date(),
        },
        { upsert: true }
      );

      // Award points only on first completion
      if (!wasAlreadyCompleted) {
        pointsResult = await addPoints(req.user.id, 5, 'video_watched').catch(() => null);
        await checkChampionBadge(video.courseId).catch(() => {});
      }
    }

    const updatedEntry = getUserEntry(video, req.user.id);
    res.json({
      watchedPercent: updatedEntry.watchedPercent,
      completed:      updatedEntry.completed,
      points:         pointsResult ? { earned: 5, total: pointsResult.newPoints, newBadges: pointsResult.newBadges } : undefined,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/videos/:id/stats (professeur) ─────────────────────────────── */
export const getVideoStats = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('watchedBy.userId', 'nom prenom email filiere promotion');
    if (!video) return res.status(404).json({ message: 'Video introuvable.' });

    const totalWatchers  = video.watchedBy.length;
    const completedCount = video.watchedBy.filter((w) => w.completed).length;
    const avgPercent     = totalWatchers === 0
      ? 0
      : Math.round(video.watchedBy.reduce((s, w) => s + w.watchedPercent, 0) / totalWatchers);

    // Distribution en tranches de 20 %
    const distribution = [0, 20, 40, 60, 80].map((min) => ({
      range:  `${min}-${min + 20}%`,
      count:  video.watchedBy.filter((w) => w.watchedPercent >= min && w.watchedPercent < min + 20).length,
    }));

    res.json({
      videoId:         video._id,
      titre:           video.titre,
      duration:        video.duration,
      totalWatchers,
      completedCount,
      completionRate:  totalWatchers === 0 ? 0 : Math.round((completedCount / totalWatchers) * 100),
      avgWatchedPercent: avgPercent,
      distribution,
      viewers: video.watchedBy.map((w) => ({
        user:           w.userId,
        watchedPercent: w.watchedPercent,
        completed:      w.completed,
        completedAt:    w.completedAt,
        lastWatchedAt:  w.lastWatchedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── PUT /api/videos/:id ───────────────────────────────────────────────── */
export const updateVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video introuvable.' });

    const { titre, description, order, chapters } = req.body;
    if (titre !== undefined) video.titre = titre;
    if (description !== undefined) video.description = description;
    if (order !== undefined) video.order = Number(order);
    if (chapters !== undefined) {
      // Sort chapters by timestamp
      video.chapters = chapters
        .filter(c => c.title && c.timestamp >= 0)
        .sort((a, b) => a.timestamp - b.timestamp);
    }

    await video.save();
    res.json(video);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── DELETE /api/videos/:id ─────────────────────────────────────────────── */
export const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video introuvable.' });

    if (video.publicId) {
      await deleteAsset(video.publicId, 'video').catch(() => {}); // best-effort
    }
    await video.deleteOne();
    res.json({ message: 'Video supprimee.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
