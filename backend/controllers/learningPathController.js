import mongoose from 'mongoose';
import LearningPath, { STEP_TYPES, STEP_RESOURCE_MODELS } from '../models/LearningPath.js';
import Course from '../models/Course.js';
import Video from '../models/Video.js';
import QCM from '../models/QCM.js';
import Prosit from '../models/Prosit.js';
import Resource from '../models/Resource.js';

/**
 * learningPathController — Endpoints du parcours pédagogique scénarisé.
 *
 * @description Implémente la couche métier du modèle de **scénarisation
 * pédagogique** (Lebrun, 2007) : on ne livre plus à l'étudiant un sac de
 * vidéos en vrac, mais une trajectoire structurée où chaque étape débloque
 * la suivante selon des critères mesurables (visionnage, score QCM…).
 *
 * @see Lebrun, M. (2007). *Théories et méthodes pédagogiques pour enseigner
 *      et apprendre*. De Boeck. Chapitre sur la scénarisation : la valeur
 *      pédagogique d'un dispositif numérique tient autant à l'orchestration
 *      des ressources qu'aux ressources elles-mêmes.
 */

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────── */

const RESOURCE_MODEL_MAP = {
  Video,
  QCM,
  Prosit,
  Resource,
};

/**
 * Vérifie que l'utilisateur courant possède le cours (prof) ou est admin.
 * Renvoie le course si OK, sinon `null` (le caller renvoie 403/404).
 */
async function ensureProfOwnsCourse(courseId, user) {
  const course = await Course.findById(courseId);
  if (!course) return { course: null, error: 'Cours introuvable.' };
  if (user.role === 'admin') return { course };
  if (user.role === 'professeur' && course.professorId.toString() === user.id) {
    return { course };
  }
  return { course: null, error: 'Accès refusé : vous n\'êtes pas le professeur de ce cours.' };
}

/**
 * Hydrate les steps d'un path : pour chaque step, récupère la ressource
 * cible (titre, durée, etc.) afin que le frontend puisse l'afficher sans
 * faire N requêtes supplémentaires.
 */
async function hydrateSteps(steps) {
  const byModel = {};
  for (const s of steps) {
    if (!byModel[s.resourceModel]) byModel[s.resourceModel] = [];
    byModel[s.resourceModel].push(s.resourceId);
  }

  const fetched = {};
  await Promise.all(
    Object.entries(byModel).map(async ([modelName, ids]) => {
      const Model = RESOURCE_MODEL_MAP[modelName];
      if (!Model) return;
      const docs = await Model.find({ _id: { $in: ids } }).lean();
      fetched[modelName] = new Map(docs.map((d) => [d._id.toString(), d]));
    })
  );

  return steps.map((s) => {
    const stepObj = s.toObject ? s.toObject() : s;
    const resource = fetched[s.resourceModel]?.get(s.resourceId.toString()) || null;
    return { ...stepObj, resource };
  });
}

/**
 * Calcule la progression de l'utilisateur sur chaque step.
 * Pour une vidéo : lit `watchedBy` (watchedPercent + completed).
 * Pour un QCM : lit le meilleur score dans `resultats` filtré par userId.
 * Pour un Prosit / Resource : vérifie l'appartenance / la consultation.
 *
 * Renvoie une map stepId → { status, ...details } où status ∈
 * { 'completed', 'inprogress', 'available', 'locked' }.
 *
 * Le calcul du verrou (`locked`) est séquentiel : un step est verrouillé
 * si `unlockCriteria.previousCompleted` est vrai ET que le step précédent
 * n'est pas complété.
 */
async function computeUserProgress(steps, userId, unlockMode = 'sequential') {
  const userIdStr = userId.toString();
  const result = {};

  // 1. Statut individuel de chaque step (sans tenir compte du verrou)
  for (const s of steps) {
    let status = 'available';
    let watchedPercent = 0;
    let bestScore = null;

    if (s.resourceModel === 'Video') {
      const v = await Video.findById(s.resourceId).select('watchedBy').lean();
      const entry = v?.watchedBy?.find((w) => w.userId.toString() === userIdStr);
      watchedPercent = entry?.watchedPercent ?? 0;
      const minPct = s.unlockCriteria?.minWatchPercent ?? 70;
      if (entry?.completed || watchedPercent >= minPct) status = 'completed';
      else if (watchedPercent > 0) status = 'inprogress';
    } else if (s.resourceModel === 'QCM') {
      const q = await QCM.findById(s.resourceId).select('resultats').lean();
      const userResults = (q?.resultats ?? []).filter((r) => r.userId.toString() === userIdStr);
      if (userResults.length > 0) {
        bestScore = Math.max(...userResults.map((r) => r.score ?? 0));
        const minScore = s.unlockCriteria?.minScore ?? 50;
        if (bestScore >= minScore) status = 'completed';
        else status = 'inprogress';
      }
    } else if (s.resourceModel === 'Prosit') {
      const p = await Prosit.findById(s.resourceId).select('groupes status').lean();
      const isMember = (p?.groupes ?? []).some((g) =>
        (g.membres ?? []).some((m) => m.userId?.toString() === userIdStr)
      );
      if (isMember && ['evalue', 'archive'].includes(p?.status)) status = 'completed';
      else if (isMember) status = 'inprogress';
    } else if (s.resourceModel === 'Resource') {
      // Lecture : on ne dispose pas d'un tracking fin par défaut,
      // on considère le step comme « disponible » sans validation auto.
      status = 'available';
    }

    result[s._id.toString()] = {
      stepId: s._id.toString(),
      status,
      watchedPercent,
      bestScore,
    };
  }

  // 2. Application du verrou séquentiel
  if (unlockMode === 'sequential') {
    let previousOk = true;
    for (const s of steps) {
      const r = result[s._id.toString()];
      const requiresPrevious = s.unlockCriteria?.previousCompleted !== false;
      if (requiresPrevious && !previousOk && r.status !== 'completed') {
        r.status = 'locked';
      }
      // Le step suivant ne se débloque que si celui-ci est complété
      // (ou s'il n'est pas obligatoire).
      if (r.status === 'completed' || s.isRequired === false) {
        // previousOk reste true
      } else {
        previousOk = false;
      }
    }
  }

  return result;
}

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/learning-paths/course/:courseId
   Renvoie le path actif du cours + progression de l'utilisateur.
───────────────────────────────────────────────────────────────────────── */
export const getPathByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'courseId invalide.' });
    }

    const path = await LearningPath.findOne({ courseId });
    if (!path) {
      return res.status(404).json({ message: 'Aucun parcours configuré pour ce cours.', notConfigured: true });
    }

    // Étudiant : on ne lui montre que les parcours publiés
    const isPrivileged = req.user.role === 'professeur' || req.user.role === 'admin';
    if (!path.publishedAt && !isPrivileged) {
      return res.status(404).json({ message: 'Parcours non encore publié.', notPublished: true });
    }

    const sortedSteps = [...path.steps].sort((a, b) => a.order - b.order);
    const hydrated = await hydrateSteps(sortedSteps);

    // Mode « vue libre » : le prof bypass le verrou pour pouvoir prévisualiser
    const freeMode = isPrivileged && req.query.free === 'true';
    const progress = await computeUserProgress(
      sortedSteps,
      req.user.id,
      freeMode ? 'free' : 'sequential'
    );

    res.json({
      _id: path._id,
      courseId: path.courseId,
      title: path.title,
      description: path.description,
      publishedAt: path.publishedAt,
      isDraft: !path.publishedAt,
      createdBy: path.createdBy,
      steps: hydrated,
      progress,
      unlockMode: freeMode ? 'free' : 'sequential',
    });
  } catch (err) {
    console.error('[learningPath] getPathByCourse:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/learning-paths   (prof / admin)
   Body : { courseId, title?, description?, steps? }
───────────────────────────────────────────────────────────────────────── */
export const createPath = async (req, res) => {
  try {
    const { courseId, title, description, steps } = req.body;
    if (!courseId) return res.status(400).json({ message: 'courseId est requis.' });

    const { course, error } = await ensureProfOwnsCourse(courseId, req.user);
    if (!course) return res.status(403).json({ message: error });

    const existing = await LearningPath.findOne({ courseId });
    if (existing) {
      return res.status(409).json({ message: 'Un parcours existe déjà pour ce cours.', pathId: existing._id });
    }

    const path = await LearningPath.create({
      courseId,
      title:       title || 'Parcours d\'apprentissage',
      description: description || '',
      steps:       Array.isArray(steps) ? sanitizeSteps(steps) : [],
      createdBy:   req.user.id,
      publishedAt: null,
    });

    res.status(201).json(path);
  } catch (err) {
    console.error('[learningPath] createPath:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   PUT /api/learning-paths/:id   (prof / admin)
───────────────────────────────────────────────────────────────────────── */
export const updatePath = async (req, res) => {
  try {
    const path = await LearningPath.findById(req.params.id);
    if (!path) return res.status(404).json({ message: 'Parcours introuvable.' });

    const { course, error } = await ensureProfOwnsCourse(path.courseId, req.user);
    if (!course) return res.status(403).json({ message: error });

    const { title, description, steps } = req.body;
    if (title !== undefined) path.title = title;
    if (description !== undefined) path.description = description;
    if (Array.isArray(steps)) path.steps = sanitizeSteps(steps);

    await path.save();
    res.json(path);
  } catch (err) {
    console.error('[learningPath] updatePath:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   DELETE /api/learning-paths/:id   (prof / admin)
───────────────────────────────────────────────────────────────────────── */
export const deletePath = async (req, res) => {
  try {
    const path = await LearningPath.findById(req.params.id);
    if (!path) return res.status(404).json({ message: 'Parcours introuvable.' });

    const { course, error } = await ensureProfOwnsCourse(path.courseId, req.user);
    if (!course) return res.status(403).json({ message: error });

    await path.deleteOne();
    res.json({ message: 'Parcours supprimé.' });
  } catch (err) {
    console.error('[learningPath] deletePath:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/learning-paths/:id/publish   (prof / admin)
───────────────────────────────────────────────────────────────────────── */
export const publishPath = async (req, res) => {
  try {
    const path = await LearningPath.findById(req.params.id);
    if (!path) return res.status(404).json({ message: 'Parcours introuvable.' });

    const { course, error } = await ensureProfOwnsCourse(path.courseId, req.user);
    if (!course) return res.status(403).json({ message: error });

    if (!path.steps?.length) {
      return res.status(400).json({ message: 'Impossible de publier un parcours vide.' });
    }

    path.publishedAt = new Date();
    await path.save();
    res.json({ message: 'Parcours publié.', publishedAt: path.publishedAt, path });
  } catch (err) {
    console.error('[learningPath] publishPath:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS — sanitization des steps reçus du frontend
───────────────────────────────────────────────────────────────────────── */
function sanitizeSteps(rawSteps) {
  return rawSteps
    .filter((s) => s && s.type && s.resourceId && s.resourceModel)
    .filter((s) => STEP_TYPES.includes(s.type))
    .filter((s) => STEP_RESOURCE_MODELS.includes(s.resourceModel))
    .map((s, idx) => ({
      order:       Number.isFinite(s.order) ? s.order : idx,
      type:        s.type,
      resourceId:  s.resourceId,
      resourceModel: s.resourceModel,
      title:       s.title || '',
      isRequired:  s.isRequired !== false,
      unlockCriteria: {
        previousCompleted: s.unlockCriteria?.previousCompleted !== false,
        minScore:          s.unlockCriteria?.minScore ?? 50,
        minWatchPercent:   s.unlockCriteria?.minWatchPercent ?? 70,
      },
      estimatedMinutes: s.estimatedMinutes ?? 0,
      customMessage:    (s.customMessage || '').slice(0, 500),
    }));
}
