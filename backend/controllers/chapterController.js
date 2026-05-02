import Chapter from '../models/Chapter.js';
import Course  from '../models/Course.js';
import Video   from '../models/Video.js';
import QCM     from '../models/QCM.js';

/**
 * Vérifie qu'un user (prof/admin) a le droit de modifier un cours.
 * Renvoie l'objet course si OK, sinon throw avec message.
 */
async function assertCourseOwnership(courseId, user) {
  const course = await Course.findById(courseId);
  if (!course) { const e = new Error('Cours introuvable.'); e.status = 404; throw e; }
  if (user.role === 'admin') return course;
  if (course.professorId.toString() !== user.id) {
    const e = new Error('Accès refusé.'); e.status = 403; throw e;
  }
  return course;
}

/* ─── GET /api/courses/:courseId/chapters ─────────────────────────────────
   Liste les chapitres d'un module avec leurs vidéos imbriquées. */
export const listChapters = async (req, res) => {
  try {
    const { courseId } = req.params;
    const chapters = await Chapter.find({ courseId }).sort({ order: 1 }).lean();

    // Attache les vidéos à chaque chapitre + liste les vidéos orphelines (sans chapter)
    const videos = await Video.find({ courseId })
      .sort({ order: 1 })
      .select('titre description chapterId order duration provider thumbnailUrl watchedBy chapters')
      .lean();

    const byChapter = new Map();
    chapters.forEach(c => byChapter.set(c._id.toString(), { ...c, videos: [] }));
    const orphans = [];
    for (const v of videos) {
      const cid = v.chapterId?.toString();
      if (cid && byChapter.has(cid)) byChapter.get(cid).videos.push(v);
      else orphans.push(v);
    }

    res.json({
      chapters: Array.from(byChapter.values()),
      orphans,  // vidéos non rattachées (rétrocompat — UI peut afficher en "hors chapitre")
    });
  } catch (err) {
    console.error('[listChapters]', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

/* ─── POST /api/courses/:courseId/chapters ────────────────────────────────
   Crée un chapitre dans un cours. Prof/admin seulement. */
export const createChapter = async (req, res) => {
  try {
    const { courseId } = req.params;
    await assertCourseOwnership(courseId, req.user);

    const { titre, description, order, unlockedByDefault, completionThreshold, practiceMode } = req.body;
    if (!titre || titre.trim().length < 2) {
      return res.status(400).json({ message: 'Titre requis (au moins 2 caractères).' });
    }

    // Auto-numéroter à la fin si pas d'ordre fourni
    let finalOrder = order;
    if (typeof finalOrder !== 'number') {
      const last = await Chapter.findOne({ courseId }).sort({ order: -1 }).select('order').lean();
      finalOrder = (last?.order ?? -1) + 1;
    }

    const chapter = await Chapter.create({
      courseId,
      titre: titre.trim(),
      description: (description || '').trim(),
      order: finalOrder,
      unlockedByDefault: !!unlockedByDefault,
      completionThreshold: completionThreshold || 80,
      practiceMode: practiceMode || { enabled: true, questionCount: 10 },
    });

    res.status(201).json(chapter);
  } catch (err) {
    console.error('[createChapter]', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

/* ─── PUT /api/chapters/:id ───────────────────────────────────────────────
   Met à jour un chapitre. */
export const updateChapter = async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) return res.status(404).json({ message: 'Chapitre introuvable.' });
    await assertCourseOwnership(chapter.courseId, req.user);

    const allowed = ['titre', 'description', 'order', 'unlockedByDefault', 'completionThreshold', 'practiceMode'];
    for (const k of allowed) {
      if (req.body[k] !== undefined) chapter[k] = req.body[k];
    }
    await chapter.save();
    res.json(chapter);
  } catch (err) {
    console.error('[updateChapter]', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

/* ─── DELETE /api/chapters/:id ────────────────────────────────────────────
   Supprime un chapitre. Les vidéos rattachées deviennent "orphelines"
   (chapterId = null) plutôt que d'être supprimées (sécurité de données). */
export const deleteChapter = async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) return res.status(404).json({ message: 'Chapitre introuvable.' });
    await assertCourseOwnership(chapter.courseId, req.user);

    // Détache les vidéos
    await Video.updateMany({ chapterId: chapter._id }, { $set: { chapterId: null } });
    await chapter.deleteOne();
    res.json({ message: 'Chapitre supprimé. Les vidéos sont conservées.' });
  } catch (err) {
    console.error('[deleteChapter]', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

/* ─── POST /api/chapters/:id/assign-video ─────────────────────────────────
   Assigne une vidéo à un chapitre. Body : { videoId } */
export const assignVideo = async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) return res.status(404).json({ message: 'Chapitre introuvable.' });
    await assertCourseOwnership(chapter.courseId, req.user);

    const { videoId } = req.body;
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ message: 'Vidéo introuvable.' });
    if (video.courseId.toString() !== chapter.courseId.toString()) {
      return res.status(400).json({ message: 'La vidéo n\'appartient pas au même cours que le chapitre.' });
    }

    video.chapterId = chapter._id;
    await video.save();
    res.json(video);
  } catch (err) {
    console.error('[assignVideo]', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

/* ─── GET /api/chapters/:id/practice ──────────────────────────────────────
   Mode entraînement (P3) : retourne N questions aléatoires des QCM du chapitre.
   Pas noté, juste pour s'auto-tester. */
export const getChapterPractice = async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id).lean();
    if (!chapter) return res.status(404).json({ message: 'Chapitre introuvable.' });
    if (!chapter.practiceMode?.enabled) {
      return res.status(403).json({ message: 'Le mode entraînement est désactivé pour ce chapitre.' });
    }

    // Récupère toutes les vidéos du chapitre + leurs QCM
    const videos = await Video.find({ chapterId: chapter._id }).select('_id titre').lean();
    const videoIds = videos.map(v => v._id);
    const quizzes = await QCM.find({ videoId: { $in: videoIds } }).select('titre questions videoId').lean();

    // Aplatit toutes les questions de tous les QCM
    const allQuestions = [];
    for (const q of quizzes) {
      const videoTitle = videos.find(v => v._id.toString() === q.videoId.toString())?.titre || '';
      for (const question of (q.questions || [])) {
        allQuestions.push({
          _id: question._id,
          texte: question.texte,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation || '',
          videoTitle,
        });
      }
    }

    // Tirage aléatoire (Fisher-Yates) — N questions max selon practiceMode.questionCount
    const N = Math.min(chapter.practiceMode.questionCount || 10, allQuestions.length);
    for (let i = allQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
    }
    const selected = allQuestions.slice(0, N);

    res.json({
      chapter: { _id: chapter._id, titre: chapter.titre },
      questions: selected,
      total: selected.length,
      pool: allQuestions.length,
    });
  } catch (err) {
    console.error('[getChapterPractice]', err);
    res.status(500).json({ message: err.message });
  }
};
