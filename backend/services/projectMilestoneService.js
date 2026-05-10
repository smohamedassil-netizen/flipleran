/**
 * projectMilestoneService.js — Déblocage progressif des phases d'un projet
 * en fonction de la progression de l'étudiant sur les chapitres et cas pratiques.
 *
 * Articulation Cycle d'Apprentissage Inversé (CAI) :
 *   Capsules + QCM (étapes 1-2) → Cas Pratique (étape 3) → Projet (étape 4)
 *
 * Une phase de projet peut déclarer des prérequis dans `phase.unlockRules` :
 *   - chapterIds[]      : chapitres à terminer (capsules ≥ threshold + QCM ≥ 80%)
 *   - casPratiqueIds[]  : cas pratiques à avoir évalués pour cet étudiant
 *
 * Le service ne fait que LIRE les chapitres/cas pratiques et CALCULER le statut
 * d'une phase pour un étudiant. La règle est portée par progressService.js.
 *
 * Conventions :
 *   - "Étudiant inscrit" = membre d'au moins un groupe du projet
 *   - Phase sans unlockRules (chapterIds vide ET casPratiqueIds vide) → 'unlocked'
 *   - Statuts terminaux ('submitted', 'validated') ne sont jamais recalculés
 */
import Project from '../models/Project.js';
import {
  isChapterCompletedByUser,
  isCasPratiqueEvaluatedForUser,
} from './progressService.js';

const TERMINAL_STATUSES = new Set(['submitted', 'validated']);

/**
 * Vérifie qu'un étudiant est membre d'au moins un groupe du projet.
 * @param {object} project - Document Mongoose ou objet lean()
 * @param {string} studentId
 * @returns {boolean}
 */
export function isStudentEnrolledInProject(project, studentId) {
  const target = String(studentId);
  return (project.groupes || []).some((g) =>
    (g.membres || []).some((m) => String(m.userId) === target)
  );
}

/**
 * Trouve l'entrée studentProgress d'une phase pour un étudiant.
 * @param {object} phase
 * @param {string} studentId
 * @returns {object|null}
 */
function findStudentProgress(phase, studentId) {
  const target = String(studentId);
  return (phase.studentProgress || []).find(
    (sp) => String(sp.studentId) === target
  ) || null;
}

/**
 * Évalue les règles de déblocage d'une phase pour un étudiant.
 * Renvoie { unlocked, chapterChecks, casPratiqueChecks } pour permettre des
 * messages UI clairs ("il te reste X chapitres et Y cas pratiques").
 *
 * @param {object} phase
 * @param {string} studentId
 * @returns {Promise<{ unlocked: boolean, chapterChecks: Array, casPratiqueChecks: Array, hasRules: boolean }>}
 */
async function evaluateUnlockRules(phase, studentId) {
  const rules = phase.unlockRules || {};
  const chapterIds = (rules.chapterIds || []).map((id) => String(id));
  const casPratiqueIds = (rules.casPratiqueIds || []).map((id) => String(id));

  const hasRules = chapterIds.length > 0 || casPratiqueIds.length > 0;
  if (!hasRules) {
    return { unlocked: true, chapterChecks: [], casPratiqueChecks: [], hasRules: false };
  }

  const chapterChecks = await Promise.all(
    chapterIds.map(async (cid) => ({
      chapterId: cid,
      done: await isChapterCompletedByUser(studentId, cid),
    }))
  );

  const casPratiqueChecks = await Promise.all(
    casPratiqueIds.map(async (cpid) => ({
      casPratiqueId: cpid,
      done: await isCasPratiqueEvaluatedForUser(studentId, cpid),
    }))
  );

  const requiresAllChapters = rules.requiresAllChapters !== false;        // default true
  const requiresAllCasPratiques = rules.requiresAllCasPratiques !== false; // default true

  const chapterOK = chapterChecks.length === 0
    ? true
    : (requiresAllChapters
      ? chapterChecks.every((c) => c.done)
      : chapterChecks.some((c) => c.done));

  const casPratiqueOK = casPratiqueChecks.length === 0
    ? true
    : (requiresAllCasPratiques
      ? casPratiqueChecks.every((c) => c.done)
      : casPratiqueChecks.some((c) => c.done));

  return {
    unlocked: chapterOK && casPratiqueOK,
    chapterChecks,
    casPratiqueChecks,
    hasRules: true,
  };
}

/**
 * Recalcule le statut de chaque phase du projet pour un étudiant donné, met à
 * jour les sous-docs studentProgress et persiste le projet.
 *
 * Renvoie le tableau enrichi [{ phaseId, status, details }] pour la couche UI.
 *
 * @param {string} projectId
 * @param {string} studentId
 * @returns {Promise<{ project: object, phases: Array<{ _id, titre, status, details }> }>}
 * @throws si le projet n'existe pas, ou si l'étudiant n'est pas inscrit
 */
export async function computePhaseStatus(projectId, studentId) {
  const project = await Project.findById(projectId);
  if (!project) {
    const err = new Error('Projet introuvable.');
    err.status = 404;
    throw err;
  }

  if (!isStudentEnrolledInProject(project, studentId)) {
    const err = new Error("Étudiant non inscrit dans un groupe de ce projet.");
    err.status = 403;
    throw err;
  }

  const result = [];

  for (const phase of project.phases || []) {
    const existing = findStudentProgress(phase, studentId);

    // Statuts terminaux (submitted/validated) → on ne recalcule pas
    if (existing && TERMINAL_STATUSES.has(existing.status)) {
      result.push({
        _id: phase._id,
        titre: phase.titre,
        status: existing.status,
        details: { hasRules: !!(phase.unlockRules && (
          (phase.unlockRules.chapterIds?.length || 0) +
          (phase.unlockRules.casPratiqueIds?.length || 0)
        )), terminal: true },
      });
      continue;
    }

    const evalResult = await evaluateUnlockRules(phase, studentId);
    let nextStatus;
    if (existing && existing.status === 'in-progress' && evalResult.unlocked) {
      // L'étudiant avait commencé : on conserve in-progress
      nextStatus = 'in-progress';
    } else {
      nextStatus = evalResult.unlocked ? 'unlocked' : 'locked';
    }

    if (existing) {
      existing.status = nextStatus;
    } else {
      phase.studentProgress.push({
        studentId,
        status: nextStatus,
        submission: '',
        fichierUrl: null,
        importedFromCasPratiqueId: null,
      });
    }

    result.push({
      _id: phase._id,
      titre: phase.titre,
      status: nextStatus,
      details: {
        hasRules: evalResult.hasRules,
        chapterChecks: evalResult.chapterChecks,
        casPratiqueChecks: evalResult.casPratiqueChecks,
      },
    });
  }

  project.markModified('phases');
  await project.save();

  return {
    project: {
      _id: project._id,
      titre: project.titre,
      type: project.type,
      status: project.status,
      courseId: project.courseId,
    },
    phases: result,
  };
}

/**
 * Recalcule les phases pour un étudiant, sur tous les projets actifs d'un cours.
 * Utilisé en trigger après évaluation de cas pratique (et à terme après
 * déblocage de chapitre). Idempotent et tolérant aux erreurs : un projet
 * en échec n'arrête pas les autres.
 *
 * @param {string} studentId
 * @param {string} courseId
 * @returns {Promise<{ updated: number, errors: number }>}
 */
export async function recomputePhasesForStudentOnCourse(studentId, courseId) {
  if (!studentId || !courseId) return { updated: 0, errors: 0 };

  // Cours principal (mono) OU cours dans modules[] (groupe/pfe)
  const projects = await Project.find({
    status: { $ne: 'termine' },
    $or: [
      { courseId },
      { modules: courseId },
    ],
  }).select('_id groupes phases status');

  let updated = 0;
  let errors = 0;
  for (const proj of projects) {
    if (!isStudentEnrolledInProject(proj, studentId)) continue;
    try {
      await computePhaseStatus(proj._id, studentId);
      updated += 1;
    } catch (err) {
      errors += 1;
      console.warn(
        `[milestones] recompute failed for project ${proj._id} student ${studentId}:`,
        err.message
      );
    }
  }

  return { updated, errors };
}
