import autoFlashcards from '../services/autoFlashcards.js';

/**
 * autoFlashcardsController — endpoints de génération automatique de
 * flashcards depuis les vidéos vues par l'étudiant. Voir
 * services/autoFlashcards.js pour la logique métier.
 *
 * Toutes les routes ici sont protégées par requireRole('etudiant') (cf.
 * deckRoutes.js) — un prof n'a pas besoin de regénérer SES propres révisions.
 */

/**
 * POST /api/decks/auto-generate
 *
 * Body :
 *   - { videoId } : génère les flashcards d'une seule vidéo
 *   - { courseId } : génère pour TOUTES les vidéos vues du cours (max 5)
 *   - aucun des deux : génère pour les vidéos vues toutes filières confondues
 *
 * Retourne le bilan : nb de cartes créées / skip / decks impactés.
 */
export const autoGenerate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { videoId, courseId } = req.body || {};

    if (videoId) {
      const result = await autoFlashcards.generateForVideo({ userId, videoId });
      return res.status(result.skipped ? 200 : 201).json(result);
    }

    const opts = {};
    if (courseId) opts.courseId = courseId;
    const result = await autoFlashcards.generateForStudent(userId, opts);
    return res.status(result.totalCreated > 0 ? 201 : 200).json(result);
  } catch (err) {
    console.error('[autoFlashcards/autoGenerate]', err);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/decks/auto-status
 *
 * Retourne pour l'étudiant courant : nb de decks auto, nb de cartes auto,
 * nb de cartes à réviser aujourd'hui, date de dernière régénération, et la
 * liste compacte des decks auto. Utilisé par la section "✨ Tes decks de
 * révision auto-générés" sur Decks.jsx.
 */
export const autoStatus = async (req, res) => {
  try {
    const status = await autoFlashcards.getStudentAutoStatus(req.user.id);
    res.json(status);
  } catch (err) {
    console.error('[autoFlashcards/autoStatus]', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/decks/due-today
 *
 * Compte rapide des cartes "à réviser maintenant" (nextReview <= now).
 * Utilisé par le widget Dashboard étudiant.
 */
export const dueToday = async (req, res) => {
  try {
    const result = await autoFlashcards.getDueTodayCount(req.user.id);
    res.json(result);
  } catch (err) {
    console.error('[autoFlashcards/dueToday]', err);
    res.status(500).json({ message: err.message });
  }
};

export default { autoGenerate, autoStatus, dueToday };
