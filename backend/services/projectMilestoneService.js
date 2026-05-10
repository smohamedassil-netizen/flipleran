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
import Chapter from '../models/Chapter.js';
import Prosit from '../models/Prosit.js';
import {
  isChapterCompletedByUser,
  isCasPratiqueEvaluatedForUser,
  getChapterProgressDetails,
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
 * Renvoie { unlocked, chapterChecks, casPratiqueChecks } enrichis :
 *   chapterChecks   : [{ chapterId, titre, done, videoPercent, videoTotal,
 *                        videoWatched, qcmPercent, qcmTotal, qcmPassed,
 *                        hasQcm, completionThreshold }]
 *   casPratiqueChecks : [{ casPratiqueId, titre, statut, done, noteIndividuelle }]
 *
 * Ces détails permettent à l'UI étudiant d'afficher des messages précis
 * ("il te manque 2 capsules sur Ch.2 — actuellement à 60%") sans avoir à
 * faire des appels supplémentaires côté front.
 *
 * @param {object} phase
 * @param {string} studentId
 * @returns {Promise<{ unlocked: boolean, chapterChecks: Array, casPratiqueChecks: Array, hasRules: boolean, requiresAllChapters: boolean, requiresAllCasPratiques: boolean }>}
 */
async function evaluateUnlockRules(phase, studentId) {
  const rules = phase.unlockRules || {};
  const chapterIds = (rules.chapterIds || []).map((id) => String(id));
  const casPratiqueIds = (rules.casPratiqueIds || []).map((id) => String(id));

  const requiresAllChapters = rules.requiresAllChapters !== false;        // default true
  const requiresAllCasPratiques = rules.requiresAllCasPratiques !== false; // default true

  const hasRules = chapterIds.length > 0 || casPratiqueIds.length > 0;
  if (!hasRules) {
    return {
      unlocked: true,
      chapterChecks: [],
      casPratiqueChecks: [],
      hasRules: false,
      requiresAllChapters,
      requiresAllCasPratiques,
    };
  }

  // Récupère titres des chapitres en 1 requête, puis détails par étudiant en parallèle
  const chaptersMeta = chapterIds.length === 0
    ? []
    : await Chapter.find({ _id: { $in: chapterIds } }).select('_id titre').lean();
  const chapterMetaMap = new Map(chaptersMeta.map((c) => [String(c._id), c]));

  const chapterChecks = await Promise.all(
    chapterIds.map(async (cid) => {
      const details = await getChapterProgressDetails(studentId, cid);
      return {
        chapterId: cid,
        titre: chapterMetaMap.get(cid)?.titre || '(chapitre supprimé)',
        done: details?.isComplete === true,
        videoTotal:          details?.videoTotal ?? 0,
        videoWatched:        details?.videoWatched ?? 0,
        videoPercent:        details?.videoPercent ?? 0,
        qcmTotal:            details?.qcmTotal ?? 0,
        qcmPassed:           details?.qcmPassed ?? 0,
        qcmPercent:          details?.qcmPercent ?? 0,
        hasQcm:              details?.hasQcm ?? false,
        completionThreshold: details?.completionThreshold ?? 80,
      };
    })
  );

  // Récupère titres + statut + note individuelle pour les cas pratiques en 1 requête
  const cpMeta = casPratiqueIds.length === 0
    ? []
    : await Prosit.find({ _id: { $in: casPratiqueIds } })
        .select('_id titre statut notes')
        .lean();
  const cpMetaMap = new Map(cpMeta.map((c) => [String(c._id), c]));

  const casPratiqueChecks = await Promise.all(
    casPratiqueIds.map(async (cpid) => {
      const meta = cpMetaMap.get(cpid);
      const noteEntry = (meta?.notes || []).find((n) => String(n.studentId) === String(studentId));
      return {
        casPratiqueId: cpid,
        titre: meta?.titre || '(cas pratique supprimé)',
        statut: meta?.statut || null,
        done: await isCasPratiqueEvaluatedForUser(studentId, cpid),
        noteIndividuelle: noteEntry?.noteIndividuelle ?? null,
      };
    })
  );

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
    requiresAllChapters,
    requiresAllCasPratiques,
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

    // Métadonnées de la phase (toujours envoyées — même quand verrouillée)
    const phaseMeta = {
      _id: phase._id,
      titre: phase.titre,
      description: phase.description || '',
      weight: phase.weight || 0,
      livrableSpec: phase.livrableSpec || null,
      sourceCasPratiqueId: phase.sourceCasPratiqueId || null,
      dateDebut: phase.dateDebut || null,
      dateFin: phase.dateFin || null,
    };

    // Évaluation des règles : on la fait dans tous les cas pour pouvoir
    // afficher un message d'aide même quand le statut est terminal ou unlocked
    const evalResult = await evaluateUnlockRules(phase, studentId);

    // Statuts terminaux (submitted/validated) → on ne recalcule pas
    if (existing && TERMINAL_STATUSES.has(existing.status)) {
      result.push({
        ...phaseMeta,
        status: existing.status,
        studentProgress: serializeStudentProgress(existing),
        details: {
          hasRules: evalResult.hasRules,
          chapterChecks: evalResult.chapterChecks,
          casPratiqueChecks: evalResult.casPratiqueChecks,
          requiresAllChapters: evalResult.requiresAllChapters,
          requiresAllCasPratiques: evalResult.requiresAllCasPratiques,
          terminal: true,
        },
      });
      continue;
    }

    let nextStatus;
    if (existing && existing.status === 'in-progress' && evalResult.unlocked) {
      // L'étudiant avait commencé : on conserve in-progress
      nextStatus = 'in-progress';
    } else {
      nextStatus = evalResult.unlocked ? 'unlocked' : 'locked';
    }

    let spDoc;
    if (existing) {
      existing.status = nextStatus;
      spDoc = existing;
    } else {
      phase.studentProgress.push({
        studentId,
        status: nextStatus,
        submission: '',
        fichierUrl: null,
        importedFromCasPratiqueId: null,
      });
      spDoc = phase.studentProgress[phase.studentProgress.length - 1];
    }

    result.push({
      ...phaseMeta,
      status: nextStatus,
      studentProgress: serializeStudentProgress(spDoc),
      details: {
        hasRules: evalResult.hasRules,
        chapterChecks: evalResult.chapterChecks,
        casPratiqueChecks: evalResult.casPratiqueChecks,
        requiresAllChapters: evalResult.requiresAllChapters,
        requiresAllCasPratiques: evalResult.requiresAllCasPratiques,
      },
    });
  }

  project.markModified('phases');
  await project.save();

  // Trouve le groupe + rôle de l'étudiant pour le header projet (pratique côté UI)
  const myGroup = (project.groupes || []).find((g) =>
    (g.membres || []).some((m) => String(m.userId) === String(studentId))
  );
  const myMembre = myGroup
    ? (myGroup.membres || []).find((m) => String(m.userId) === String(studentId))
    : null;

  return {
    project: {
      _id: project._id,
      titre: project.titre,
      type: project.type,
      status: project.status,
      courseId: project.courseId,
      dateDebut: project.dateDebut,
      dateFin: project.dateFin,
      dateSoutenance: project.dateSoutenance,
      modules: project.modules,
    },
    myGroup: myGroup ? {
      _id: myGroup._id,
      nom: myGroup.nom,
      // membres réduits aux IDs (le front fera le populate via API normale si besoin)
      membres: (myGroup.membres || []).map((m) => ({
        userId: m.userId,
        role: m.role,
      })),
    } : null,
    myRole: myMembre?.role || null,
    phases: result,
  };
}

/**
 * Sérialise un sous-doc studentProgress pour l'envoyer au front sans expose
 * de champs internes Mongoose (_doc, $isNew, etc.).
 */
function serializeStudentProgress(sp) {
  if (!sp) return null;
  return {
    status: sp.status,
    submission: sp.submission || '',
    fichierUrl: sp.fichierUrl || null,
    importedFromCasPratiqueId: sp.importedFromCasPratiqueId || null,
    submittedAt: sp.submittedAt || null,
    validatedAt: sp.validatedAt || null,
    feedback: sp.feedback || '',
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
