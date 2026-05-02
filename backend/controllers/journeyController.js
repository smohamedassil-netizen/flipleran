import Course from '../models/Course.js';
import Video from '../models/Video.js';
import QCM from '../models/QCM.js';
import Prosit from '../models/Prosit.js';
import Project from '../models/Project.js';
import Deck from '../models/Deck.js';
import Card from '../models/Card.js';

/**
 * GET /api/journey/me/:courseId
 *
 * Agrège l'état des 5 étapes du Cycle d'Apprentissage Inversé (CAI) pour
 * l'étudiant authentifié sur un cours donné. Aucune nouvelle collection :
 * tout est dérivé des modèles existants.
 *
 * Étapes :
 *   1. PRÉPARATION   — vidéos vues + QCM réussis
 *   2. RENDEZ-VOUS   — placeholder (pas de champ nextClassDate dans Course)
 *   3. APPLICATION   — Prosits où l'étudiant est dans un groupe
 *   4. PRODUCTION    — Projects où l'étudiant est dans un groupe
 *   5. CONSOLIDATION — Cards à réviser (SM-2)
 *
 * Locks (chaîne pédagogique : on ne saute pas une étape) :
 *   - APPLICATION  locked si PRÉPARATION != 'completed'
 *   - PRODUCTION   locked si PRÉPARATION != 'completed' OU aucun prosit complété
 *   - CONSOLIDATION locked si PRÉPARATION == 'not-started'
 */
export const getMyJourney = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;

    const course = await Course.findById(courseId).select('_id titre filiere promotion').lean();
    if (!course) return res.status(404).json({ message: 'Cours introuvable' });

    /* ─── 1. PRÉPARATION ─────────────────────────────────────────────── */
    const videos = await Video.find({ courseId }).select('_id watchedBy').lean();
    const videosTotal = videos.length;
    const videosWatched = videos.filter((v) =>
      (v.watchedBy || []).some(
        (w) => w.userId?.toString() === studentId && w.completed === true
      )
    ).length;

    const videoIds = videos.map((v) => v._id);
    const quizzes = await QCM.find({ videoId: { $in: videoIds } }).select('_id resultats').lean();
    const quizzesTotal = quizzes.length;
    const quizzesPassed = quizzes.filter((q) => {
      const r = (q.resultats || []).find((x) => x.userId?.toString() === studentId);
      return r && typeof r.score === 'number' && r.score >= 60;
    }).length;

    const videoRatio = videosTotal > 0 ? videosWatched / videosTotal : 0;
    const quizRatio = quizzesTotal > 0 ? quizzesPassed / quizzesTotal : 0;

    let preparationStatus;
    if (videoRatio >= 0.8 && (quizzesTotal === 0 || quizRatio >= 0.8)) {
      preparationStatus = 'completed';
    } else if (videosWatched > 0 || quizzesPassed > 0) {
      preparationStatus = 'in-progress';
    } else {
      preparationStatus = 'not-started';
    }

    /* ─── 2. RENDEZ-VOUS ─────────────────────────────────────────────── */
    // Pas de champ nextClassDate dans Course (cf. P0 audit).
    // À renseigner dans une future itération si on ajoute un calendrier de séances.
    const rendezvousStatus = 'unknown';
    const nextClassDate = null;

    /* ─── 3. APPLICATION (Prosits) ───────────────────────────────────── */
    const prosits = await Prosit.find({
      courseId,
      'groupes.membres.userId': studentId,
    }).select('_id status').lean();

    const prositsTotal = prosits.length;
    const prositsCompleted = prosits.filter((p) => ['evalue', 'archive'].includes(p.status)).length;
    const prositsInProgress = prosits.filter((p) => ['aller', 'recherche', 'retour'].includes(p.status)).length;

    let applicationStatus;
    if (preparationStatus !== 'completed') {
      applicationStatus = 'locked';
    } else if (prositsCompleted >= 1) {
      applicationStatus = 'completed';
    } else if (prositsInProgress >= 1) {
      applicationStatus = 'in-progress';
    } else {
      // Préparation faite mais aucun Prosit assigné encore : on garde 'in-progress' générique
      applicationStatus = 'in-progress';
    }

    /* ─── 4. PRODUCTION (Projects) ───────────────────────────────────── */
    const projects = await Project.find({
      $or: [{ courseId }, { modules: courseId }],
      'groupes.membres.userId': studentId,
    }).select('_id status').lean();

    const projectsTotal = projects.length;
    const projectsSubmitted = projects.filter((p) => p.status === 'termine').length;
    const projectsInProgress = projects.filter((p) => p.status === 'actif').length;

    // Lock si la préparation n'est pas finie OU si aucun prosit n'est complété.
    // On ne saute pas la phase APPLICATION : sans Prosit terminé, pas de Production.
    let productionStatus;
    if (preparationStatus !== 'completed' || prositsCompleted < 1) {
      productionStatus = 'locked';
    } else if (projectsSubmitted >= 1) {
      productionStatus = 'completed';
    } else if (projectsInProgress >= 1) {
      productionStatus = 'in-progress';
    } else {
      productionStatus = 'in-progress';
    }

    /* ─── 5. CONSOLIDATION (Flashcards SM-2) ─────────────────────────── */
    // Cards de l'étudiant via ses Decks (owner). Pas de filtre courseId
    // direct sur Card — Card.sourceVideo existe mais n'est pas peuplée pour
    // les decks manuels. On agrège tous les decks de l'étudiant.
    const myDecks = await Deck.find({ owner: studentId }).select('_id').lean();
    const myDeckIds = myDecks.map((d) => d._id);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [cardsDue, cardsReviewed7d] = await Promise.all([
      Card.countDocuments({ deck: { $in: myDeckIds }, nextReview: { $lte: now } }),
      // Proxy "révisée dans les 7 derniers jours" : updatedAt récent ET au moins
      // 1 répétition (sinon = card juste créée, pas révisée).
      Card.countDocuments({
        deck: { $in: myDeckIds },
        updatedAt: { $gte: sevenDaysAgo },
        repetitions: { $gt: 0 },
      }),
    ]);

    const consolidationStatus = preparationStatus === 'not-started' ? 'locked' : 'active';

    /* ─── CYCLE PROGRESS (multiple de 20, naïf) ──────────────────────── */
    const completedFlags = [
      preparationStatus === 'completed',
      false, // rendez-vous : pas de mesure tant que nextClassDate n'existe pas
      applicationStatus === 'completed',
      productionStatus === 'completed',
      consolidationStatus === 'active' && cardsDue === 0 && cardsReviewed7d > 0,
    ];
    const cycleProgress = completedFlags.filter(Boolean).length * 20;

    res.json({
      course: {
        _id: course._id,
        titre: course.titre,
        filiere: course.filiere,
        promotion: course.promotion,
      },
      steps: {
        preparation: {
          status: preparationStatus,
          details: { videosTotal, videosWatched, quizzesTotal, quizzesPassed },
        },
        rendezvous: {
          status: rendezvousStatus,
          nextClassDate,
        },
        application: {
          status: applicationStatus,
          details: { prositsTotal, prositsCompleted, prositsInProgress },
        },
        production: {
          status: productionStatus,
          details: { projectsTotal, projectsSubmitted, projectsInProgress },
        },
        consolidation: {
          status: consolidationStatus,
          details: { cardsDue, cardsReviewed7d },
        },
      },
      cycleProgress,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
