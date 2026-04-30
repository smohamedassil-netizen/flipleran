/**
 * videoQuestionController — Endpoints REST pour les questions interactives
 * déclenchées pendant le visionnage d'une vidéo (modèle EdPuzzle).
 *
 * Cadre théorique :
 *   - Bergmann & Sams (2012) — la classe inversée Type 2 transforme la
 *     vidéo passive en vidéo active grâce à des points de contrôle.
 *   - Mazur (1997) — "Don't ask if students understand, make them prove it."
 *
 * Endpoints :
 *   GET    /api/video-questions/video/:videoId      (étudiant : sanitisé / prof : complet)
 *   POST   /api/video-questions                      (prof only)
 *   PUT    /api/video-questions/:id                  (prof only)
 *   DELETE /api/video-questions/:id                  (prof only)
 *   POST   /api/video-questions/:id/answer           (étudiant : idempotent)
 *   GET    /api/video-questions/:id/stats            (prof : taux + distribution)
 */

import VideoQuestion       from '../models/VideoQuestion.js';
import VideoQuestionAnswer from '../models/VideoQuestionAnswer.js';
import Video               from '../models/Video.js';

/* ─────────────────────────────────────────────────────────────────────────
   Lecture — questions d'une vidéo
───────────────────────────────────────────────────────────────────────── */

/**
 * GET /api/video-questions/video/:videoId
 * Étudiant : retourne les questions sans correctAnswer ni explanation,
 *   enrichies de userAnswer (si déjà répondu) pour la replay logic.
 * Prof / admin : retourne tout.
 */
export const listByVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const questions = await VideoQuestion
      .find({ videoId })
      .sort({ timestamp: 1 })
      .lean();

    if (req.user.role === 'etudiant') {
      // Annoter chaque question avec la réponse précédente de l'étudiant (si elle existe).
      const questionIds = questions.map(q => q._id);
      const previousAnswers = await VideoQuestionAnswer
        .find({ questionId: { $in: questionIds }, userId: req.user.id })
        .lean();
      const answerMap = new Map(previousAnswers.map(a => [a.questionId.toString(), a]));

      const sanitized = questions.map(q => {
        const prev = answerMap.get(q._id.toString());
        return {
          _id:          q._id,
          videoId:      q.videoId,
          timestamp:    q.timestamp,
          texte:        q.texte,
          options:      q.options,
          pauseVideo:   q.pauseVideo,
          // Si déjà répondu, on expose la réponse de l'étudiant + correction
          // (correctAnswer + explanation) pour permettre l'affichage du résultat.
          // Sinon, ces champs restent cachés.
          previousAnswer: prev
            ? { answer: prev.answer, isCorrect: prev.isCorrect, createdAt: prev.createdAt,
                correctAnswer: q.correctAnswer, explanation: q.explanation }
            : null,
        };
      });
      return res.json(sanitized);
    }

    // Prof / admin : tout
    res.json(questions);
  } catch (err) {
    console.error('[videoQuestion.listByVideo]', err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   CRUD prof — création / mise à jour / suppression
───────────────────────────────────────────────────────────────────────── */

export const create = async (req, res) => {
  try {
    const { videoId, timestamp, texte, options, correctAnswer, explanation, pauseVideo } = req.body;

    if (!videoId || timestamp == null || !texte || !options || !correctAnswer) {
      return res.status(400).json({ message: 'Champs obligatoires manquants : videoId, timestamp, texte, options, correctAnswer.' });
    }
    if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
      return res.status(400).json({ message: 'correctAnswer doit être A, B, C ou D.' });
    }
    if (!options.A?.trim() || !options.B?.trim() || !options.C?.trim() || !options.D?.trim()) {
      return res.status(400).json({ message: 'Les 4 options A/B/C/D doivent toutes être renseignées.' });
    }

    const video = await Video.findById(videoId).select('_id duration');
    if (!video) return res.status(404).json({ message: 'Vidéo introuvable.' });
    if (video.duration && timestamp > video.duration) {
      return res.status(400).json({ message: `Le timestamp dépasse la durée de la vidéo (${video.duration}s).` });
    }

    const question = await VideoQuestion.create({
      videoId,
      timestamp: Number(timestamp),
      texte: texte.trim(),
      options: {
        A: options.A.trim(),
        B: options.B.trim(),
        C: options.C.trim(),
        D: options.D.trim(),
      },
      correctAnswer,
      explanation: explanation?.trim() || '',
      pauseVideo: pauseVideo !== undefined ? !!pauseVideo : true,
      createdBy: req.user.id,
    });

    res.status(201).json(question);
  } catch (err) {
    console.error('[videoQuestion.create]', err);
    res.status(500).json({ message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await VideoQuestion.findById(id);
    if (!question) return res.status(404).json({ message: 'Question introuvable.' });

    const allowedFields = ['timestamp', 'texte', 'options', 'correctAnswer', 'explanation', 'pauseVideo'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'options' && req.body.options) {
          // Trim chacune des 4 options sans permettre l'ajout d'autres clés.
          const o = req.body.options;
          question.options = {
            A: (o.A ?? question.options.A).toString().trim(),
            B: (o.B ?? question.options.B).toString().trim(),
            C: (o.C ?? question.options.C).toString().trim(),
            D: (o.D ?? question.options.D).toString().trim(),
          };
        } else if (field === 'correctAnswer') {
          if (!['A', 'B', 'C', 'D'].includes(req.body.correctAnswer)) {
            return res.status(400).json({ message: 'correctAnswer doit être A, B, C ou D.' });
          }
          question.correctAnswer = req.body.correctAnswer;
        } else if (field === 'timestamp') {
          question.timestamp = Number(req.body.timestamp);
        } else {
          question[field] = req.body[field];
        }
      }
    }

    await question.save();
    res.json(question);
  } catch (err) {
    console.error('[videoQuestion.update]', err);
    res.status(500).json({ message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await VideoQuestion.findByIdAndDelete(id);
    if (!question) return res.status(404).json({ message: 'Question introuvable.' });

    // Cleanup : supprime les réponses associées pour éviter les orphelins.
    await VideoQuestionAnswer.deleteMany({ questionId: id });

    res.json({ ok: true });
  } catch (err) {
    console.error('[videoQuestion.remove]', err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   Soumission étudiant — idempotente
───────────────────────────────────────────────────────────────────────── */

/**
 * POST /api/video-questions/:id/answer
 * Body : { answer: 'A'|'B'|'C'|'D', timeTaken?: number }
 *
 * Idempotent : si l'étudiant a déjà répondu, retourne sa réponse précédente
 * (pas de re-soumission). Empêche le farming de bonnes réponses par tâtonnement.
 */
export const submitAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const { answer, timeTaken } = req.body;

    if (!['A', 'B', 'C', 'D'].includes(answer)) {
      return res.status(400).json({ message: 'answer doit être A, B, C ou D.' });
    }

    // Idempotence : on cherche une réponse existante pour ce couple (question, user).
    const existing = await VideoQuestionAnswer.findOne({
      questionId: id, userId: req.user.id,
    });
    if (existing) {
      const question = await VideoQuestion.findById(id).lean();
      if (!question) return res.status(404).json({ message: 'Question introuvable.' });
      return res.json({
        alreadyAnswered: true,
        answer:        existing.answer,
        isCorrect:     existing.isCorrect,
        correctAnswer: question.correctAnswer,
        explanation:   question.explanation,
      });
    }

    const question = await VideoQuestion.findById(id);
    if (!question) return res.status(404).json({ message: 'Question introuvable.' });

    const isCorrect = (answer === question.correctAnswer);

    await VideoQuestionAnswer.create({
      questionId: id,
      userId:     req.user.id,
      videoId:    question.videoId,
      answer,
      isCorrect,
      timeTaken:  Math.max(0, Number(timeTaken) || 0),
    });

    res.json({
      alreadyAnswered: false,
      answer,
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation:   question.explanation,
    });
  } catch (err) {
    // Race condition possible sur l'index unique : on retombe sur le cas "déjà répondu".
    if (err.code === 11000) {
      const existing = await VideoQuestionAnswer.findOne({
        questionId: req.params.id, userId: req.user.id,
      });
      const question = await VideoQuestion.findById(req.params.id).lean();
      if (existing && question) {
        return res.json({
          alreadyAnswered: true,
          answer:        existing.answer,
          isCorrect:     existing.isCorrect,
          correctAnswer: question.correctAnswer,
          explanation:   question.explanation,
        });
      }
    }
    console.error('[videoQuestion.submitAnswer]', err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   Statistiques (prof) — taux de réussite + distribution des réponses
───────────────────────────────────────────────────────────────────────── */

export const stats = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await VideoQuestion.findById(id).lean();
    if (!question) return res.status(404).json({ message: 'Question introuvable.' });

    const answers = await VideoQuestionAnswer
      .find({ questionId: id })
      .select('answer isCorrect timeTaken')
      .lean();

    const total = answers.length;
    const correctCount = answers.filter(a => a.isCorrect).length;
    const successRate = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    // Distribution A/B/C/D
    const distribution = { A: 0, B: 0, C: 0, D: 0 };
    for (const a of answers) {
      if (distribution[a.answer] !== undefined) distribution[a.answer]++;
    }

    // Temps moyen de réponse (ms)
    const avgTimeMs = total > 0
      ? Math.round(answers.reduce((s, a) => s + (a.timeTaken || 0), 0) / total)
      : 0;

    res.json({
      questionId:    question._id,
      texte:         question.texte,
      timestamp:     question.timestamp,
      correctAnswer: question.correctAnswer,
      total,
      correctCount,
      successRate,        // %
      distribution,       // { A, B, C, D }
      avgTimeMs,
    });
  } catch (err) {
    console.error('[videoQuestion.stats]', err);
    res.status(500).json({ message: err.message });
  }
};
