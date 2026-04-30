import projectCoach from '../services/projectCoach.js';
import User from '../models/User.js';

/**
 * coachController — Endpoints "Coach IA anti-blocage" pour Prosit et Projet.
 *
 * Pattern : un seul controller mais 8 handlers (4 actions × 2 types). On
 * factorise via une fonction `runCoach(action, kind)` qui retourne un
 * handler Express et délègue au service.
 *
 * Auth : tous les endpoints sont en lecture/écriture pour l'étudiant
 * concerné (membre du groupe). On vérifie ça côté service via loadContext
 * → 'not-a-member' = 403.
 */

function asyncHandler(fn) {
  return (req, res) => fn(req, res).catch((err) => {
    console.error(`[coach/${fn.name}]`, err);
    res.status(500).json({ message: err.message });
  });
}

/**
 * Mappe une réponse de service en HTTP. Les errors-soft renvoient 200 + flag
 * pour que le frontend puisse les afficher comme messages "informatifs"
 * plutôt que comme des 500.
 */
function respond(res, result) {
  if (result?.error === 'prosit-not-found' || result?.error === 'project-not-found') {
    return res.status(404).json({ message: 'Entité introuvable.', ...result });
  }
  if (result?.error === 'not-a-member') {
    return res.status(403).json({ message: 'Tu n\'es pas membre de ce groupe.', ...result });
  }
  if (result?.error === 'invalid-kind') {
    return res.status(400).json({ message: 'Type invalide.', ...result });
  }
  // 'too-short', 'review-only-for-prosit' = 200 avec flag
  return res.json(result);
}

/* ─────────────────────────────────────────────────────────────────────────
   PROSIT — 4 endpoints
───────────────────────────────────────────────────────────────────────── */

export const prositCoachStatus = asyncHandler(async function prositCoachStatus(req, res) {
  const result = await projectCoach.detectBlockage({
    kind: 'prosit', id: req.params.id, userId: req.user.id,
  });
  respond(res, result);
});

export const prositCoachSuggest = asyncHandler(async function prositCoachSuggest(req, res) {
  const user = await User.findById(req.user.id).select('prenom').lean();
  const result = await projectCoach.suggestNextStep({
    kind: 'prosit', id: req.params.id, userId: req.user.id, userPrenom: user?.prenom,
  });
  respond(res, result);
});

export const prositCoachReview = asyncHandler(async function prositCoachReview(req, res) {
  const user = await User.findById(req.user.id).select('prenom').lean();
  const result = await projectCoach.reviewContribution({
    kind: 'prosit', id: req.params.id, userId: req.user.id, userPrenom: user?.prenom,
  });
  respond(res, result);
});

export const prositCoachSources = asyncHandler(async function prositCoachSources(req, res) {
  const result = await projectCoach.suggestSources({
    kind: 'prosit', id: req.params.id, userId: req.user.id,
  });
  respond(res, result);
});

/* ─────────────────────────────────────────────────────────────────────────
   PROJECT — 4 endpoints (review désactivé côté service mais on garde l'endpoint
   pour cohérence d'API ; il retourne un 200 avec error='review-only-for-prosit')
───────────────────────────────────────────────────────────────────────── */

export const projectCoachStatus = asyncHandler(async function projectCoachStatus(req, res) {
  const result = await projectCoach.detectBlockage({
    kind: 'project', id: req.params.id, userId: req.user.id,
  });
  respond(res, result);
});

export const projectCoachSuggest = asyncHandler(async function projectCoachSuggest(req, res) {
  const user = await User.findById(req.user.id).select('prenom').lean();
  const result = await projectCoach.suggestNextStep({
    kind: 'project', id: req.params.id, userId: req.user.id, userPrenom: user?.prenom,
  });
  respond(res, result);
});

export const projectCoachReview = asyncHandler(async function projectCoachReview(req, res) {
  const user = await User.findById(req.user.id).select('prenom').lean();
  const result = await projectCoach.reviewContribution({
    kind: 'project', id: req.params.id, userId: req.user.id, userPrenom: user?.prenom,
  });
  respond(res, result);
});

export const projectCoachSources = asyncHandler(async function projectCoachSources(req, res) {
  const result = await projectCoach.suggestSources({
    kind: 'project', id: req.params.id, userId: req.user.id,
  });
  respond(res, result);
});

export default {
  prositCoachStatus, prositCoachSuggest, prositCoachReview, prositCoachSources,
  projectCoachStatus, projectCoachSuggest, projectCoachReview, projectCoachSources,
};
