import QCM      from '../models/QCM.js';
import User     from '../models/User.js';
import Progress from '../models/Progress.js';
import { addPoints, checkChampionBadge } from '../services/points.js';
import { generateQuizQuestions } from '../services/chatbot.js';
import { autoPredictAfterQcm } from '../services/aiAutomation.js';

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/qcm/create
   Crée un QCM lié à une vidéo (professeur / admin).
═══════════════════════════════════════════════════════════════════════════ */
export const createQCM = async (req, res) => {
  try {
    const { videoId, titre, questions, pointsPerQuestion, timerSeconds } = req.body;

    if (!videoId || !titre || !questions?.length) {
      return res.status(400).json({ message: 'videoId, titre et questions sont requis.' });
    }

    // Un seul QCM par vidéo — mettre à jour s'il existe déjà
    const existing = await QCM.findOne({ videoId });
    if (existing) {
      existing.titre             = titre;
      existing.questions         = questions;
      existing.pointsPerQuestion = pointsPerQuestion ?? existing.pointsPerQuestion;
      existing.timerSeconds      = timerSeconds      ?? existing.timerSeconds;
      await existing.save();
      return res.json(existing);
    }

    const qcm = await QCM.create({
      videoId,
      titre,
      questions,
      pointsPerQuestion: pointsPerQuestion ?? 10,
      timerSeconds:      timerSeconds      ?? 30,
    });

    // Notify students by email about new QCM
    try {
      const { sendNotificationEmail } = await import('../services/emailService.js');
      const Course = (await import('../models/Course.js')).default;
      const Video = (await import('../models/Video.js')).default;

      const video = await Video.findById(qcm.videoId);
      if (video) {
        const course = await Course.findById(video.courseId);
        if (course) {
          const students = await User.find({
            role: 'etudiant',
            filiere: course.filiere,
            isActive: true
          }).select('email prenom').limit(50);

          for (const student of students) {
            if (student.email) {
              sendNotificationEmail(
                student.email,
                'Nouveau QCM disponible',
                `Un nouveau QCM <strong>"${qcm.titre}"</strong> est disponible pour le cours <strong>"${course.titre}"</strong>. Testez vos connaissances !`
              );
            }
          }
        }
      }
    } catch (emailErr) {
      console.error('QCM email notification error:', emailErr.message);
    }

    res.status(201).json(qcm);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/qcm/video/:videoId
   Retourne le QCM d'une vidéo.
   - Étudiants : masque correctAnswer/correctAnswers et explanations
   - Professeurs / admin : données complètes
═══════════════════════════════════════════════════════════════════════════ */
export const getQCMByVideo = async (req, res) => {
  try {
    const qcm = await QCM.findOne({ videoId: req.params.videoId })
      .select('-resultats');

    if (!qcm) return res.status(404).json({ message: 'Aucun QCM pour cette vidéo.' });

    const isStudent = req.user.role === 'etudiant';
    if (isStudent) {
      const sanitized = {
        _id:              qcm._id,
        videoId:          qcm.videoId,
        titre:            qcm.titre,
        pointsPerQuestion:qcm.pointsPerQuestion,
        timerSeconds:     qcm.timerSeconds,
        questions: qcm.questions.map((q) => ({
          _id:          q._id,
          texte:        q.texte,
          options:      q.options,
          questionType: q.questionType ?? 'single',
        })),
      };
      return res.json(sanitized);
    }

    res.json(qcm);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   Grading helper — compare answers for single or multiple choice
═══════════════════════════════════════════════════════════════════════════ */
function isAnswerCorrect(question, submittedAnswer, submittedAnswers) {
  const type = question.questionType ?? 'single';

  if (type === 'multiple') {
    const correct = new Set(question.correctAnswers ?? []);
    const given   = new Set(submittedAnswers ?? []);
    if (correct.size !== given.size) return false;
    for (const a of correct) {
      if (!given.has(a)) return false;
    }
    return true;
  }

  // single
  return !!question && question.correctAnswer === submittedAnswer;
}

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/qcm/submit
   Étudiant soumet ses réponses.
   Body : { qcmId, answers: [{ questionId, answer, answers, timedOut }] }
═══════════════════════════════════════════════════════════════════════════ */
export const submitQCM = async (req, res) => {
  try {
    const { qcmId, answers } = req.body;

    if (!qcmId || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'qcmId et answers sont requis.' });
    }

    const qcm = await QCM.findById(qcmId);
    if (!qcm) return res.status(404).json({ message: 'QCM introuvable.' });

    // Calcul du score
    let correctCount = 0;
    const gradedAnswers = answers.map(({ questionId, answer, answers: multiAnswers, timedOut }) => {
      const question = qcm.questions.id(questionId);
      const correct  = !timedOut && isAnswerCorrect(question, answer, multiAnswers);
      if (correct) correctCount++;
      return {
        questionId,
        answer:   answer ?? null,
        answers:  multiAnswers ?? [],
        correct,
        timedOut: !!timedOut,
      };
    });

    const total        = qcm.questions.length;
    const score        = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const pointsEarned = correctCount * qcm.pointsPerQuestion;

    // Sauvegarder le résultat
    qcm.resultats.push({
      userId:       req.user.id,
      score,
      correctCount,
      pointsEarned,
      answers:      gradedAnswers,
      completedAt:  new Date(),
    });
    await qcm.save();

    // Créditer les points via le service gamification
    const Video = (await import('../models/Video.js')).default;
    const video = await Video.findById(qcm.videoId).select('courseId');

    let pointsResult = null;
    try {
      await User.findByIdAndUpdate(req.user.id, { $inc: { points: pointsEarned } });
      const baseResult = await addPoints(req.user.id, 10, 'qcm_completed');
      if (score > 80) {
        pointsResult = await addPoints(req.user.id, 20, 'qcm_bonus');
        pointsResult.earned = 10 + 20 + pointsEarned;
      } else {
        pointsResult = baseResult;
        pointsResult.earned = 10 + pointsEarned;
      }
      if (video) {
        await checkChampionBadge(video.courseId).catch(() => {});
      }
    } catch (_) { /* non-blocking */ }

    // Mettre à jour Progress
    if (video) {
      await Progress.findOneAndUpdate(
        { userId: req.user.id, courseId: video.courseId },
        {
          $push:        { qcmScores: { qcmId: qcm._id, score } },
          lastActivity: new Date(),
        },
        { upsert: true }
      );

      // Auto-prédiction IA en arrière-plan (fire-and-forget) :
      // recalcule le niveau de risque et alerte le prof si ça s'aggrave.
      autoPredictAfterQcm({
        userId: req.user.id,
        courseId: video.courseId,
        io: req.app.get('io'),
      }).catch(() => { /* déjà loggé dans le service */ });
    }

    // Réponse enrichie avec les bonnes réponses et explications
    const review = qcm.questions.map((q) => {
      const submitted = gradedAnswers.find(
        (a) => a.questionId.toString() === q._id.toString()
      );
      return {
        _id:            q._id,
        texte:          q.texte,
        options:        q.options,
        questionType:   q.questionType ?? 'single',
        correctAnswer:  q.correctAnswer,
        correctAnswers: q.correctAnswers ?? [q.correctAnswer],
        explanation:    q.explanation,
        givenAnswer:    submitted?.answer   ?? null,
        givenAnswers:   submitted?.answers  ?? [],
        correct:        submitted?.correct  ?? false,
        timedOut:       submitted?.timedOut ?? false,
      };
    });

    res.json({
      score,
      correctCount,
      total,
      pointsEarned,
      review,
      points: pointsResult
        ? { earned: pointsResult.earned, total: pointsResult.newPoints, newBadges: pointsResult.newBadges }
        : undefined,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/qcm/generate-ai
   Génère des questions QCM par IA (professeur / admin).
   Body : { videoId, numberOfQuestions }
═══════════════════════════════════════════════════════════════════════════ */
export const generateQCMWithAI = async (req, res) => {
  try {
    const { videoId, numberOfQuestions = 5 } = req.body;

    if (!videoId) {
      return res.status(400).json({ message: 'videoId est requis.' });
    }

    // Récupérer le contexte de la vidéo et du cours
    const Video  = (await import('../models/Video.js')).default;
    const Course = (await import('../models/Course.js')).default;

    const video = await Video.findById(videoId).select('titre description courseId');
    if (!video) return res.status(404).json({ message: 'Vidéo introuvable.' });

    let courseTitle = '';
    if (video.courseId) {
      const course = await Course.findById(video.courseId).select('titre description');
      if (course) courseTitle = course.titre;
    }

    const topic = courseTitle
      ? `${courseTitle} — ${video.titre}`
      : video.titre;

    // Récupérer le transcript IA si disponible (analyse vidéo)
    let transcript = '';
    try {
      const { getTranscript } = await import('../services/videoAnalyzer.js');
      transcript = await getTranscript(videoId) || '';
    } catch { /* pas grave si pas dispo */ }

    const questions = await generateQuizQuestions(
      topic,
      video.description || '',
      Math.min(Number(numberOfQuestions), 15),
      transcript
    );

    res.json({
      suggestedTitle: `QCM — ${video.titre}`,
      questions,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/qcm/:id/stats  (professeur / admin)
═══════════════════════════════════════════════════════════════════════════ */
export const getQCMStats = async (req, res) => {
  try {
    const qcm = await QCM.findById(req.params.id)
      .populate('resultats.userId', 'nom prenom email filiere promotion');
    if (!qcm) return res.status(404).json({ message: 'QCM introuvable.' });

    const attempts = qcm.resultats.length;
    const avgScore = attempts === 0
      ? 0
      : Math.round(qcm.resultats.reduce((s, r) => s + r.score, 0) / attempts);

    const questionStats = qcm.questions.map((q) => {
      const all         = qcm.resultats.flatMap((r) => r.answers);
      const forQ        = all.filter((a) => a.questionId.toString() === q._id.toString());
      const correctRate = forQ.length === 0
        ? 0
        : Math.round((forQ.filter((a) => a.correct).length / forQ.length) * 100);
      const timedOutRate = forQ.length === 0
        ? 0
        : Math.round((forQ.filter((a) => a.timedOut).length / forQ.length) * 100);

      return {
        questionId:    q._id,
        texte:         q.texte,
        questionType:  q.questionType ?? 'single',
        correctAnswer: q.correctAnswer,
        correctAnswers:q.correctAnswers ?? [q.correctAnswer],
        correctRate,
        timedOutRate,
        answerDistribution: ['A', 'B', 'C', 'D'].reduce((acc, opt) => {
          acc[opt] = forQ.filter((a) => a.answer === opt || (a.answers ?? []).includes(opt)).length;
          return acc;
        }, {}),
      };
    });

    res.json({
      qcmId:    qcm._id,
      titre:    qcm.titre,
      attempts,
      avgScore,
      questionStats,
      results: qcm.resultats.map((r) => ({
        user:         r.userId,
        score:        r.score,
        correctCount: r.correctCount,
        pointsEarned: r.pointsEarned,
        completedAt:  r.completedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   PUT /api/qcm/:id  (professeur / admin)
═══════════════════════════════════════════════════════════════════════════ */
export const updateQCM = async (req, res) => {
  try {
    const allowed = ['titre', 'questions', 'pointsPerQuestion', 'timerSeconds'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
    const qcm = await QCM.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!qcm) return res.status(404).json({ message: 'QCM introuvable.' });
    res.json(qcm);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   DELETE /api/qcm/:id  (professeur / admin)
═══════════════════════════════════════════════════════════════════════════ */
export const deleteQCM = async (req, res) => {
  try {
    await QCM.findByIdAndDelete(req.params.id);
    res.json({ message: 'QCM supprimé.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
