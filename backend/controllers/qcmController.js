import QCM      from '../models/QCM.js';
import Video    from '../models/Video.js';
import User     from '../models/User.js';
import Progress from '../models/Progress.js';
import { addPoints, checkChampionBadge } from '../services/points.js';
import { generateQuizQuestions } from '../services/chatbot.js';
import { generateFromQcmResult } from '../services/qcmWrongAnswerCards.js';

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/qcm/create
   Crée un QCM (professeur / admin).
   Body :
     - { scope: 'video',   videoId,   titre, questions, ... } [défaut historique]
     - { scope: 'chapter', chapterId, titre, questions, ... }
     - { scope: 'module',  courseId,  titre, questions, ... }
═══════════════════════════════════════════════════════════════════════════ */
export const createQCM = async (req, res) => {
  try {
    const { videoId, chapterId, courseId, titre, questions, pointsPerQuestion, timerSeconds, passingScore } = req.body;
    let { scope } = req.body;

    // Inférer scope si absent (rétro-compat avec anciens clients)
    if (!scope) {
      if (videoId)        scope = 'video';
      else if (chapterId) scope = 'chapter';
      else if (courseId)  scope = 'module';
      else scope = 'video';
    }

    if (!titre || !questions?.length) {
      return res.status(400).json({ message: 'titre et questions sont requis.' });
    }
    if (scope === 'video'   && !videoId)   return res.status(400).json({ message: 'scope=video : videoId est requis.' });
    if (scope === 'chapter' && !chapterId) return res.status(400).json({ message: 'scope=chapter : chapterId est requis.' });
    if (scope === 'module'  && !courseId)  return res.status(400).json({ message: 'scope=module : courseId est requis.' });

    // Un seul QCM par scope+ref — mettre à jour s'il existe déjà
    const filter = scope === 'video'   ? { scope: 'video',   videoId }
                 : scope === 'chapter' ? { scope: 'chapter', chapterId }
                 : { scope: 'module', courseId };

    const existing = await QCM.findOne(filter);
    if (existing) {
      existing.titre             = titre;
      existing.questions         = questions;
      existing.pointsPerQuestion = pointsPerQuestion ?? existing.pointsPerQuestion;
      existing.timerSeconds      = timerSeconds      ?? existing.timerSeconds;
      existing.passingScore      = passingScore      ?? existing.passingScore;
      await existing.save();
      return res.json(existing);
    }

    const qcm = await QCM.create({
      scope,
      videoId:   scope === 'video'   ? videoId   : null,
      chapterId: scope === 'chapter' ? chapterId : null,
      courseId:  scope === 'module'  ? courseId  : null,
      titre,
      questions,
      pointsPerQuestion: pointsPerQuestion ?? 10,
      timerSeconds:      timerSeconds      ?? 30,
      passingScore:      passingScore      ?? 60,
    });

    // Notify students by email about new QCM (resolve course from scope)
    try {
      const { sendNotificationEmail } = await import('../services/emailService.js');
      const Course = (await import('../models/Course.js')).default;
      const VideoModel = (await import('../models/Video.js')).default;
      const Chapter = (await import('../models/Chapter.js')).default;

      let course = null;
      if (qcm.scope === 'video' && qcm.videoId) {
        const video = await VideoModel.findById(qcm.videoId);
        if (video) course = await Course.findById(video.courseId);
      } else if (qcm.scope === 'chapter' && qcm.chapterId) {
        const chapter = await Chapter.findById(qcm.chapterId);
        if (chapter) course = await Course.findById(chapter.courseId);
      } else if (qcm.scope === 'module' && qcm.courseId) {
        course = await Course.findById(qcm.courseId);
      }

      if (course) {
        const students = await User.find({
          role: 'etudiant',
          filiere: course.filiere,
          isActive: true
        }).select('email prenom').limit(50);

        const scopeLabel = qcm.scope === 'video'   ? 'capsule'
                         : qcm.scope === 'chapter' ? 'chapitre'
                         : 'module';
        for (const student of students) {
          if (student.email) {
            sendNotificationEmail(
              student.email,
              'Nouveau QCM disponible',
              `Un nouveau QCM ${scopeLabel} <strong>"${qcm.titre}"</strong> est disponible pour le module <strong>"${course.titre}"</strong>. Testez vos connaissances !`
            );
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
      // Prérequis vidéo (classe inversée).
      // Seuil : 50 % visionné OU completed=true.
      // Sous 50 %, le QCM est considéré non-prêt et videoWatched=false :
      // le frontend bloque la soumission tant que ce seuil n'est pas atteint.
      const video = await Video.findById(req.params.videoId).select('watchedBy');
      let videoWatched = false;
      let watchedPercent = 0;
      if (video) {
        const entry = video.watchedBy?.find(w => w.userId.toString() === req.user.id);
        if (entry) {
          watchedPercent = entry.watchedPercent ?? 0;
          videoWatched = !!(watchedPercent >= 50 || entry.completed);
        }
      }

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
        videoWatched,
        watchedPercent,
      };
      return res.json(sanitized);
    }

    res.json(qcm);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/qcm/chapter/:chapterId
   Retourne le QCM de fin de chapitre (scope='chapter').
═══════════════════════════════════════════════════════════════════════════ */
export const getQCMByChapter = async (req, res) => {
  try {
    const qcm = await QCM.findOne({ scope: 'chapter', chapterId: req.params.chapterId })
      .select('-resultats');
    if (!qcm) return res.status(404).json({ message: 'Aucun QCM pour ce chapitre.' });

    if (req.user.role === 'etudiant') {
      // Pas de prérequis vidéo ici : c'est un QCM de chapitre, donc on
      // suppose que l'étudiant a déjà passé les capsules (gate côté frontend).
      const sanitized = {
        _id:               qcm._id,
        scope:             qcm.scope,
        chapterId:         qcm.chapterId,
        titre:             qcm.titre,
        pointsPerQuestion: qcm.pointsPerQuestion,
        timerSeconds:      qcm.timerSeconds,
        passingScore:      qcm.passingScore,
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
   GET /api/qcm/module/:courseId
   Retourne le QCM final de module (scope='module').
═══════════════════════════════════════════════════════════════════════════ */
export const getQCMByModule = async (req, res) => {
  try {
    const qcm = await QCM.findOne({ scope: 'module', courseId: req.params.courseId })
      .select('-resultats');
    if (!qcm) return res.status(404).json({ message: 'Aucun QCM final pour ce module.' });

    if (req.user.role === 'etudiant') {
      const sanitized = {
        _id:               qcm._id,
        scope:             qcm.scope,
        courseId:          qcm.courseId,
        titre:             qcm.titre,
        pointsPerQuestion: qcm.pointsPerQuestion,
        timerSeconds:      qcm.timerSeconds,
        passingScore:      qcm.passingScore,
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

    // Résoudre le courseId selon le scope du QCM (pour Progress + badges)
    let resolvedCourseId = null;
    if (qcm.scope === 'video' && qcm.videoId) {
      const VideoModel = (await import('../models/Video.js')).default;
      const video = await VideoModel.findById(qcm.videoId).select('courseId');
      if (video) resolvedCourseId = video.courseId;
    } else if (qcm.scope === 'chapter' && qcm.chapterId) {
      const Chapter = (await import('../models/Chapter.js')).default;
      const chapter = await Chapter.findById(qcm.chapterId).select('courseId');
      if (chapter) resolvedCourseId = chapter.courseId;
    } else if (qcm.scope === 'module') {
      resolvedCourseId = qcm.courseId;
    }

    // Les points sont attribués UNIQUEMENT via addPoints() :
    //   - +10 pour avoir terminé le QCM
    //   - +pointsEarned (basé sur le score) → reflète le barème
    //   - +20 bonus si score > 80
    // QCM de chapitre/module : bonus +50% (effort plus important).
    let pointsResult = null;
    try {
      const scopeMultiplier = qcm.scope === 'video' ? 1 : qcm.scope === 'chapter' ? 1.5 : 2;
      const scoredPoints    = Math.round(pointsEarned * scopeMultiplier);
      await addPoints(req.user.id, scoredPoints, `qcm_${qcm.scope}_score`);
      const baseResult = await addPoints(req.user.id, 10, `qcm_${qcm.scope}_completed`);
      if (score > 80) {
        pointsResult = await addPoints(req.user.id, 20, `qcm_${qcm.scope}_bonus`);
        pointsResult.earned = scoredPoints + 10 + 20;
      } else {
        pointsResult = baseResult;
        pointsResult.earned = scoredPoints + 10;
      }
      if (resolvedCourseId) {
        await checkChampionBadge(resolvedCourseId).catch(() => {});
      }
    } catch (_) { /* non-blocking */ }

    // Mettre à jour Progress
    if (resolvedCourseId) {
      await Progress.findOneAndUpdate(
        { userId: req.user.id, courseId: resolvedCourseId },
        {
          $push:        { qcmScores: { qcmId: qcm._id, score } },
          lastActivity: new Date(),
        },
        { upsert: true }
      );
    }

    /**
     * Auto-flashcards depuis les questions ratées (score < 80%).
     * Tient la promesse landing §4 : « Les erreurs alimentent la révision
     * espacée, elles ne sanctionnent pas. »
     * Non-bloquant : on log mais on n'interrompt pas la réponse HTTP.
     */
    generateFromQcmResult({ userId: req.user.id, qcm, gradedAnswers, score })
      .then((r) => {
        if (r?.createdCount > 0) {
          console.log(`[qcm/submit] ${r.createdCount} flashcard(s) générée(s) depuis QCM raté pour user ${req.user.id} (score ${score}%)`);
        }
      })
      .catch((err) => console.error('[qcm/submit] auto-flashcards failed:', err.message));

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
