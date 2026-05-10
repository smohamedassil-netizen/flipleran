/**
 * progressService.js — Source unique de vérité pour la progression d'un
 * étudiant (capsules + QCM d'un chapitre, évaluation d'un cas pratique).
 *
 * Avant ce service, la logique de complétion d'un chapitre était dupliquée :
 *   - server-side dans videoController (notif déblocage)
 *   - client-side dans ChaptersView (affichage)
 * Ce service centralise la règle pour qu'on l'invoque depuis :
 *   - videoController (refactor DRY)
 *   - projectMilestoneService (déblocage progressif des phases projet)
 *   - tout futur endpoint qui veut connaître l'état d'un chapitre/cas pratique
 *
 * Critère composite (validé Marcel) :
 *   capsules ≥ 80% (selon chapter.completionThreshold)
 *   ET QCM ≥ 80% des QCM réussis avec score ≥ 60 (cohérent mastery learning)
 *   Si pas de QCM rattaché aux capsules du chapitre → fallback sur capsules seules.
 *
 * Cas pratique évalué = statut === 'evalue' ET livrable de l'étudiant ET
 *                       note de l'étudiant présents.
 */
import Chapter from '../models/Chapter.js';
import Video from '../models/Video.js';
import QCM from '../models/QCM.js';
import Prosit from '../models/Prosit.js';

const QCM_PASS_SCORE = 60;        // % minimum sur un QCM pour être considéré "passé"
const QCM_RATIO_THRESHOLD = 80;   // % des QCM du chapitre devant être "passés"

/**
 * Détails de progression d'un étudiant sur un chapitre.
 * Sert à isChapterCompletedByUser ET aux messages côté UI ("X capsules sur Y").
 *
 * @param {string} userId
 * @param {string} chapterId
 * @returns {Promise<{
 *   videoTotal: number, videoWatched: number, videoPercent: number,
 *   qcmTotal: number, qcmPassed: number, qcmPercent: number, hasQcm: boolean,
 *   completionThreshold: number, isComplete: boolean,
 * } | null>} null si le chapitre n'existe pas
 */
export async function getChapterProgressDetails(userId, chapterId) {
  const chapter = await Chapter.findById(chapterId).select('_id courseId completionThreshold').lean();
  if (!chapter) return null;

  const threshold = chapter.completionThreshold ?? 80;
  const userIdStr = String(userId);

  // Capsules du chapitre + leur état pour cet étudiant
  const videos = await Video.find({ chapterId: chapter._id })
    .select('_id watchedBy')
    .lean();
  const videoTotal = videos.length;
  const videoWatched = videos.filter((v) =>
    (v.watchedBy || []).some(
      (w) => String(w.userId) === userIdStr && w.completed === true
    )
  ).length;
  const videoPercent = videoTotal === 0 ? 0 : Math.round((videoWatched / videoTotal) * 100);

  // QCM rattachés à ces capsules (scope='video')
  const videoIds = videos.map((v) => v._id);
  const qcms = await QCM.find({ scope: 'video', videoId: { $in: videoIds } })
    .select('_id resultats')
    .lean();

  const qcmTotal = qcms.length;
  const hasQcm = qcmTotal > 0;
  let qcmPassed = 0;
  if (hasQcm) {
    qcmPassed = qcms.filter((q) =>
      (q.resultats || []).some(
        (r) => String(r.userId) === userIdStr && r.score >= QCM_PASS_SCORE
      )
    ).length;
  }
  const qcmPercent = qcmTotal === 0 ? 0 : Math.round((qcmPassed / qcmTotal) * 100);

  // Critère composite
  const videosOK = videoPercent >= threshold;
  // Pas de QCM → on retombe sur les capsules seules.
  const qcmsOK = !hasQcm || qcmPercent >= QCM_RATIO_THRESHOLD;
  const isComplete = videoTotal > 0 && videosOK && qcmsOK;

  return {
    videoTotal,
    videoWatched,
    videoPercent,
    qcmTotal,
    qcmPassed,
    qcmPercent,
    hasQcm,
    completionThreshold: threshold,
    isComplete,
  };
}

/**
 * Le chapitre est-il complété par l'étudiant ?
 * Capsules ≥ threshold ET (pas de QCM OU QCM passés ≥ 80%).
 *
 * @param {string} userId
 * @param {string} chapterId
 * @returns {Promise<boolean>}
 */
export async function isChapterCompletedByUser(userId, chapterId) {
  const details = await getChapterProgressDetails(userId, chapterId);
  return details?.isComplete === true;
}

/**
 * Le cas pratique est-il évalué pour cet étudiant ?
 * Conditions cumulatives :
 *   1. Le cas pratique a statut 'evalue'
 *   2. L'étudiant a soumis un livrable individuel
 *   3. L'étudiant a reçu une note (entrée notes[] avec studentId)
 *
 * @param {string} userId
 * @param {string} casPratiqueId
 * @returns {Promise<boolean>}
 */
export async function isCasPratiqueEvaluatedForUser(userId, casPratiqueId) {
  const cp = await Prosit.findById(casPratiqueId)
    .select('statut livrables notes')
    .lean();
  if (!cp) return false;
  if (cp.statut !== 'evalue') return false;

  const userIdStr = String(userId);
  const hasLivrable = (cp.livrables || []).some((l) => String(l.studentId) === userIdStr);
  const hasNote = (cp.notes || []).some((n) => String(n.studentId) === userIdStr);

  return hasLivrable && hasNote;
}

/**
 * Constantes exposées pour les tests et les callers qui veulent les afficher.
 */
export const PROGRESS_CONSTANTS = {
  QCM_PASS_SCORE,
  QCM_RATIO_THRESHOLD,
  DEFAULT_CHAPTER_THRESHOLD: 80,
};
