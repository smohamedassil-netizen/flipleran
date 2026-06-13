import Project from '../models/Project.js';
import User from '../models/User.js';
import { uploadBuffer } from '../config/cloudinary.js';
import Groq from 'groq-sdk';
import { getLLM } from '../services/llm.js';
import { pushNotification } from '../services/notificationService.js';
import { triggerAutoBadge, addPoints } from '../services/points.js';

/**
 * Ajoute une entrée d'activité + notifie les membres via Socket.io.
 */
async function logActivity(req, project, type, description, meta = {}) {
  project.activity.push({ type, authorId: req.user.id, description, meta });
  const io = req.app.get('io');
  const event = {
    projectId: project._id,
    type,
    description,
    meta,
    at: new Date().toISOString(),
    by: req.user.id,
  };
  if (io) {
    io.to(`project_${project._id}`).emit('project:activity', event);
    // Notifier les membres (hors auteur)
    const memberIds = new Set();
    project.groupes.forEach(g => g.membres.forEach(m => memberIds.add(m.userId.toString())));
    memberIds.delete(req.user.id);
    for (const uid of memberIds) {
      io.to(`user_${uid}`).emit('project:activity', event);
    }
  }
}

async function notifyMembers(req, project, notif) {
  const io = req.app.get('io');
  const memberIds = new Set();
  project.groupes.forEach(g => g.membres.forEach(m => memberIds.add(m.userId.toString())));
  memberIds.delete(req.user.id);
  for (const uid of memberIds) {
    await pushNotification(io, {
      userId: uid,
      type: 'project_status',
      ...notif,
      link: notif.link || `/projects/${project._id}`,
      relatedType: 'project',
      relatedId: project._id,
    });
  }
}

let groq;
function getGroq() {
  if (!groq) groq = getLLM();
  return groq;
}

/* ─── POST /api/projects ──────────────────────────────────────────────────── */
export const createProject = async (req, res) => {
  try {
    if (req.user.role !== 'professeur') {
      return res.status(403).json({ message: 'Seul un professeur peut créer un projet.' });
    }

    const { titre, description, type, courseId, modules = [], enonce, motsCles, dateDebut, dateFin, dateSoutenance, phases, rubric, linkedCasPratiqueId } = req.body;
    if (!titre || !type) {
      return res.status(400).json({ message: 'titre et type sont requis.' });
    }
    if (!['mono', 'groupe', 'pfe'].includes(type)) {
      return res.status(400).json({ message: 'type doit être "mono", "groupe" ou "pfe".' });
    }
    if (type === 'mono' && !courseId) {
      return res.status(400).json({ message: 'Un projet mono-module doit être rattaché à un cours.' });
    }
    // 'groupe' et 'pfe' nécessitent ≥2 modules
    if (['groupe', 'pfe'].includes(type) && (!Array.isArray(modules) || modules.length < 2)) {
      return res.status(400).json({ message: `Un projet ${type === 'pfe' ? 'PFE' : 'multi-modules'} doit être rattaché à au moins deux modules.` });
    }

    // F8 — Auto-load templates phases + rubric selon le type, si non fournis.
    // Le service est tolérant aux types existants (mono/groupe) pour rétrocompat.
    const { getPhasesTemplate, getRubricTemplate } = await import('../services/projectTemplates.js');
    const finalPhases = (Array.isArray(phases) && phases.length) ? phases : getPhasesTemplate(type);
    const finalRubric = (Array.isArray(rubric) && rubric.length) ? rubric : getRubricTemplate();

    const data = {
      titre,
      description: description ?? '',
      type,
      courseId: type === 'mono' ? courseId : (courseId || undefined),
      modules: ['groupe', 'pfe'].includes(type) ? modules : [],
      enonce: enonce ?? '',
      motsCles: motsCles ?? [],
      dateDebut,
      dateFin,
      dateSoutenance,
      phases: finalPhases,
      rubric: finalRubric,
      createdBy: req.user.id,
      linkedCasPratiqueId: linkedCasPratiqueId || null,
    };

    const project = await Project.create(data);
    await project.populate('createdBy', 'nom prenom');
    await project.populate('modules', 'titre filiere');
    res.status(201).json(project);
  } catch (err) {
    console.error('createProject error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/projects ───────────────────────────────────────────────────── */
export const getProjects = async (req, res) => {
  try {
    const { courseId } = req.query;
    let filter = {};

    if (courseId) {
      filter.courseId = courseId;
    } else if (req.user.role === 'etudiant') {
      // Étudiant : projets dont il est membre OU projets associés à un cours de sa filière/promotion
      const Course = (await import('../models/Course.js')).default;
      const myCourses = await Course.find({
        filiere: req.user.filiere,
        promotion: req.user.promotion,
      }).select('_id');
      const myCourseIds = myCourses.map(c => c._id);

      filter = {
        $or: [
          { 'groupes.membres.userId': req.user.id },
          { courseId: { $in: myCourseIds } },
          { modules: { $in: myCourseIds } },
        ],
      };
    } else {
      // Prof : projets qu'il a créés OU projets associés à un de ses cours.
      // (Un projet créé par un étudiant et rattaché à un cours du prof doit être
      // visible par le prof pour qu'il puisse l'évaluer.)
      const Course = (await import('../models/Course.js')).default;
      const myCourses = await Course.find({ professorId: req.user.id }).select('_id');
      const myCourseIds = myCourses.map(c => c._id);

      filter = {
        $or: [
          { createdBy: req.user.id },
          { courseId: { $in: myCourseIds } },
          { modules: { $in: myCourseIds } },
        ],
      };
      if (req.user.role === 'admin') filter = {};
    }

    const projects = await Project.find(filter)
      .populate('createdBy', 'nom prenom')
      .populate('modules', 'titre filiere')
      .sort({ createdAt: -1 });

    // Annoter multi-modules
    const enriched = projects.map(p => {
      const obj = p.toObject();
      obj.isMultiModule = (obj.modules?.length || 0) > 1 ||
        (obj.modules?.length === 1 && obj.courseId && obj.modules[0]._id.toString() !== obj.courseId.toString());
      return obj;
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/projects/:id ───────────────────────────────────────────────── */
export const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'nom prenom')
      .populate('modules', 'titre filiere')
      .populate('groupes.membres.userId', 'nom prenom email filiere')
      .populate('livrables.uploadedBy', 'nom prenom')
      .populate('evaluations.evaluateur', 'nom prenom')
      .populate('evaluations.cible', 'nom prenom')
      .populate('activity.authorId', 'nom prenom role')
      .populate('linkedCasPratiqueId', 'titre statut');

    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    // Étudiant : vérifier qu'il peut voir ce projet
    if (req.user.role === 'etudiant') {
      const isMember = project.groupes?.some(g =>
        g.membres?.some(m => (m.userId?._id || m.userId)?.toString() === req.user.id)
      );
      if (!isMember) {
        const Course = (await import('../models/Course.js')).default;
        const linked = [project.courseId, ...(project.modules || [])].filter(Boolean);
        const linkedIds = linked.map(m => m._id || m);
        const inMyScope = await Course.countDocuments({
          _id: { $in: linkedIds },
          filiere: req.user.filiere,
          promotion: req.user.promotion,
        });
        if (!inMyScope) {
          return res.status(403).json({ message: 'Ce projet ne fait pas partie de ta filière.' });
        }
      }
    }

    const obj = project.toObject();
    obj.isMultiModule = (obj.modules?.length || 0) > 1 ||
      (obj.modules?.length === 1 && obj.courseId && obj.modules[0]._id.toString() !== obj.courseId.toString());
    res.json(obj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── PUT /api/projects/:id ───────────────────────────────────────────────── */
export const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    if (project.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Seul le créateur peut modifier ce projet.' });
    }

    // F8 — Le type d'un projet est conceptuellement immuable après création.
    // Changer un 'mono' en 'pfe' laisserait des phases incohérentes (3 vs 7)
    // et briserait le calcul des poids dans la rubric. Pour repartir de zéro
    // sur un type différent, le prof doit créer un nouveau projet.
    if (req.body.type && req.body.type !== project.type) {
      return res.status(400).json({
        message: `Le type d'un projet est immuable après création (actuellement "${project.type}"). Crée un nouveau projet pour repartir d'un autre template.`,
      });
    }

    const previousStatus = project.status;
    Object.assign(project, req.body);
    await project.save();
    await project.populate('createdBy', 'nom prenom');

    // Auto-attribution du badge "Projet bouclé" + XP pour chaque membre étudiant
    // lorsqu'un projet passe en statut "termine" (1ère fois). XP = +100 par
    // membre (cf. barème dans services/points.js). addPoints filtre les non-
    // étudiants (pas d'XP pour profs/admins membres d'un groupe).
    if (previousStatus !== 'termine' && project.status === 'termine') {
      const memberIds = new Set();
      project.groupes.forEach(g => g.membres.forEach(m => memberIds.add(m.userId.toString())));
      for (const uid of memberIds) {
        try {
          // dedupKey : empêche un double crédit si updateProject est appelé
          // plusieurs fois après le passage à 'termine'
          await addPoints(uid, 100, 'project_completed', {
            source: 'project',
            relatedType: 'Project',
            relatedId: project._id,
            dedupKey: `project_completed_${project._id}_${uid}`,
          });
        }
        catch (e) { console.error('[project_completed XP]', e.message); }
        try { await triggerAutoBadge(uid, 'project_completed'); }
        catch (e) { console.error('[project_completed badge]', e.message); }
      }
    }

    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── DELETE /api/projects/:id ────────────────────────────────────────────── */
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    if (req.user.role !== 'admin' && project.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    await project.deleteOne();
    res.json({ message: 'Projet supprimé.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── POST /api/projects/:id/groupes/random ───────────────────────────────── */
export const createGroupsRandom = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    if (project.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Seul le créateur peut gérer les groupes.' });
    }

    const { tailleGroupe = 5 } = req.body;

    // Récupérer les étudiants (du cours ou tous les actifs)
    const filter = { role: 'etudiant', isActive: true };
    if (project.courseId) {
      // Filtrer par filière/promotion du cours
      const Course = (await import('../models/Course.js')).default;
      const course = await Course.findById(project.courseId);
      if (course) {
        filter.filiere = course.filiere;
        filter.promotion = course.promotion;
      }
    }

    const students = await User.find(filter).select('_id');

    // Mélanger (Fisher-Yates)
    const shuffled = [...students];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const roles = ['chef_projet', 'scribe', 'animateur', 'chrono', 'analyste'];
    const groupes = [];
    let groupNum = 1;

    for (let i = 0; i < shuffled.length; i += tailleGroupe) {
      const chunk = shuffled.slice(i, i + tailleGroupe);
      const membres = chunk.map((s, idx) => ({
        userId: s._id,
        role: roles[idx % roles.length],
      }));
      groupes.push({ nom: `Groupe ${groupNum}`, membres });
      groupNum++;
    }

    project.groupes = groupes;
    await project.save();
    await project.populate('groupes.membres.userId', 'nom prenom email filiere');
    res.json(project.groupes);
  } catch (err) {
    console.error('createGroupsRandom error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ─── POST /api/projects/:id/groupes ──────────────────────────────────────── */
export const createGroupsManual = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    if (project.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Seul le créateur peut gérer les groupes.' });
    }

    const { groupes } = req.body;
    if (!groupes || !Array.isArray(groupes)) {
      return res.status(400).json({ message: 'Le champ groupes (tableau) est requis.' });
    }

    project.groupes = groupes;
    await project.save();
    await project.populate('groupes.membres.userId', 'nom prenom email filiere');
    res.json(project.groupes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── PUT /api/projects/:id/phases/:phaseId ───────────────────────────────── */
export const updatePhase = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    const phase = project.phases.id(req.params.phaseId);
    if (!phase) return res.status(404).json({ message: 'Phase introuvable.' });

    const { statut, dateDebut, dateFin } = req.body;
    const oldStatut = phase.statut;
    if (statut) phase.statut = statut;
    if (dateDebut) phase.dateDebut = dateDebut;
    if (dateFin) phase.dateFin = dateFin;

    if (statut && statut !== oldStatut) {
      await logActivity(req, project, 'phase_status',
        `Phase "${phase.titre}" : ${oldStatut} → ${statut}`,
        { phaseId: phase._id, oldStatut, newStatut: statut });
      await notifyMembers(req, project, {
        priority: statut === 'termine' ? 'high' : 'normal',
        title: statut === 'termine' ? '✅ Phase terminée' : '📁 Phase mise à jour',
        message: `La phase "${phase.titre}" du projet "${project.titre}" est passée en "${statut}".`,
      });
    }

    await project.save();
    res.json(phase);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── POST /api/projects/:id/livrables ────────────────────────────────────── */
export const addLivrable = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier fourni.' });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    const { titre, type } = req.body;
    let { groupeIndex } = req.body;
    if (!titre || !type) {
      return res.status(400).json({ message: 'titre et type sont requis.' });
    }
    // Auto-detect groupeIndex from user's group if not provided
    if (groupeIndex === undefined || groupeIndex === null || groupeIndex === '') {
      const idx = project.groupes.findIndex(g =>
        g.membres.some(m => m.userId.toString() === req.user.id)
      );
      groupeIndex = idx >= 0 ? idx : 0;
    }

    const cleanName = req.file.originalname
      .replace(/\s+/g, '_')
      .replace(/\.[^.]+$/, '');
    const isVideo = req.file.mimetype.startsWith('video/');
    const isImage = req.file.mimetype.startsWith('image/');
    const resourceType = isVideo ? 'video' : isImage ? 'image' : 'raw';
    const result = await uploadBuffer(req.file.buffer, {
      folder: `fliplearn/projects/${req.params.id}`,
      resource_type: resourceType,
      public_id: `${Date.now()}_${cleanName}`,
    });

    project.livrables.push({
      titre,
      groupeIndex: Number(groupeIndex),
      type,
      url: result.secure_url,
      publicId: result.public_id,
      uploadedBy: req.user.id,
    });

    const groupeNom = project.groupes[groupeIndex]?.nom || `Groupe ${groupeIndex + 1}`;
    await logActivity(req, project, 'livrable_added',
      `Nouveau livrable "${titre}" déposé par ${groupeNom}`,
      { groupeIndex, titre, type });
    await notifyMembers(req, project, {
      title: '📎 Livrable déposé',
      message: `Un nouveau livrable "${titre}" a été déposé sur le projet "${project.titre}".`,
    });

    await project.save();
    const updated = await Project.findById(req.params.id)
      .populate('createdBy', 'nom prenom')
      .populate('groupes.membres.userId', 'nom prenom email filiere promotion');
    res.status(201).json(updated);
  } catch (err) {
    console.error('addLivrable error:', err.message);
    res.status(500).json({ message: `Erreur upload : ${err.message}` });
  }
};

/* ─── POST /api/projects/:id/evaluations ──────────────────────────────────── */
export const addEvaluation = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    const { cible, criteres, commentaire } = req.body;
    if (!cible || !criteres || !Array.isArray(criteres)) {
      return res.status(400).json({ message: 'cible et criteres sont requis.' });
    }

    // Trouver le groupe de l'évaluateur
    let groupeIndex = -1;
    project.groupes.forEach((g, idx) => {
      if (g.membres.some(m => m.userId.toString() === req.user.id)) {
        groupeIndex = idx;
      }
    });

    project.evaluations.push({
      evaluateur: req.user.id,
      cible,
      groupeIndex: groupeIndex >= 0 ? groupeIndex : 0,
      criteres,
      commentaire: commentaire ?? '',
    });

    await project.save();
    res.status(201).json(project.evaluations[project.evaluations.length - 1]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/projects/:id/evaluations ───────────────────────────────────── */
export const getEvaluations = async (req, res) => {
  try {
    if (req.user.role !== 'professeur' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux professeurs.' });
    }

    const project = await Project.findById(req.params.id)
      .populate('evaluations.evaluateur', 'nom prenom')
      .populate('evaluations.cible', 'nom prenom');

    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });
    res.json(project.evaluations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── Checklist : CRUD items dans une phase ──────────────────────────── */
// POST /api/projects/:id/phases/:phaseId/checklist
export const addChecklistItem = async (req, res) => {
  try {
    const { texte, assignedGroupe } = req.body;
    if (!texte?.trim()) return res.status(400).json({ message: 'Texte requis.' });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    // Seul le créateur (prof) ou admin peut ajouter des items
    if (req.user.role !== 'admin' && project.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Seul le créateur peut ajouter des tâches.' });
    }

    const phase = project.phases.id(req.params.phaseId);
    if (!phase) return res.status(404).json({ message: 'Phase introuvable.' });

    phase.checklist.push({
      texte: texte.trim(),
      assignedGroupe: assignedGroupe != null ? Number(assignedGroupe) : null,
    });

    await logActivity(req, project, 'checklist_added',
      `Nouvelle tâche "${texte.trim()}" ajoutée à la phase "${phase.titre}"`,
      { phaseId: phase._id, texte });

    await project.save();
    res.status(201).json(phase.checklist[phase.checklist.length - 1]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/projects/:id/phases/:phaseId/checklist/:itemId — toggle done
export const toggleChecklistItem = async (req, res) => {
  try {
    const { done } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    const phase = project.phases.id(req.params.phaseId);
    if (!phase) return res.status(404).json({ message: 'Phase introuvable.' });

    const item = phase.checklist.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Tâche introuvable.' });

    // Vérifier que l'utilisateur est membre du projet (ou prof/admin)
    const isMember = project.groupes.some(g =>
      g.membres.some(m => m.userId.toString() === req.user.id)
    );
    const canEdit = isMember || req.user.role === 'admin' || project.createdBy.toString() === req.user.id;
    if (!canEdit) return res.status(403).json({ message: 'Non autorisé.' });

    const oldDone = item.done;
    item.done = done != null ? !!done : !item.done;
    item.doneBy = item.done ? req.user.id : null;
    item.doneAt = item.done ? new Date() : null;

    if (item.done !== oldDone) {
      await logActivity(req, project,
        item.done ? 'checklist_done' : 'checklist_undone',
        item.done
          ? `Tâche complétée : "${item.texte}"`
          : `Tâche rouverte : "${item.texte}"`,
        { phaseId: phase._id, itemId: item._id });
    }

    await project.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/projects/:id/phases/:phaseId/checklist/:itemId
export const deleteChecklistItem = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    if (req.user.role !== 'admin' && project.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Seul le créateur peut supprimer.' });
    }

    const phase = project.phases.id(req.params.phaseId);
    if (!phase) return res.status(404).json({ message: 'Phase introuvable.' });

    const item = phase.checklist.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Tâche introuvable.' });

    item.deleteOne();
    await project.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── Idées / templates : CRUD ───────────────────────────────────────── */
// POST /api/projects/:id/ideas
export const addIdea = async (req, res) => {
  try {
    const { titre, description, type, difficulte, estime } = req.body;
    if (!titre?.trim()) return res.status(400).json({ message: 'Titre requis.' });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    if (req.user.role !== 'admin' && project.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Seul le créateur peut ajouter des idées.' });
    }

    project.ideas.push({
      titre: titre.trim(),
      description: description || '',
      type: type || 'autre',
      difficulte: difficulte || 'moyen',
      estime: estime || '',
      addedBy: req.user.id,
    });

    await project.save();
    res.status(201).json(project.ideas[project.ideas.length - 1]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/projects/:id/ideas/:ideaId
export const deleteIdea = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    if (req.user.role !== 'admin' && project.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Non autorisé.' });
    }

    const idea = project.ideas.id(req.params.ideaId);
    if (!idea) return res.status(404).json({ message: 'Idée introuvable.' });

    idea.deleteOne();
    await project.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── POST /api/projects/:id/ai-help ──────────────────────────────────────── */
export const getAiHelp = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'filiere promotion')
      .populate('courseId', 'titre description');

    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    const filiere = project.createdBy?.filiere ?? 'Informatique';
    const promotion = project.createdBy?.promotion ?? 'L3';
    const currentPhase = project.phases?.find(p => p.statut === 'en_cours')?.titre ?? 'Phase courante';
    const courseContext = project.courseId
      ? `Le projet est lié au cours : "${project.courseId.titre}". `
      : '';
    const livrables = (project.livrables ?? [])
      .map(l => l.titre)
      .filter(Boolean)
      .join(', ') || 'livrables non définis';

    const systemPrompt = `Tu es un tuteur pédagogique expert pour une université algérienne.
Tu aides des étudiants en ${filiere} niveau ${promotion}.
Tu réponds TOUJOURS en français.
Tes suggestions doivent être adaptées au contexte algérien, aux ressources disponibles
en ligne (pas de ressources payantes inaccessibles), et au niveau universitaire licence.`;

    const userPrompt = `Un étudiant en ${filiere} ${promotion} travaille sur le projet :
Titre : ${project.titre}
Description : ${project.description}
${courseContext}
Phase actuelle : ${currentPhase}
Livrables attendus : ${livrables}

Donne lui :
1. 3 ressources en ligne gratuites et accessibles (tutoriels, docs officielles, articles)
2. 2 conseils méthodologiques pour cette phase du projet
3. 1 exemple concret ou cas d'usage similaire en Algérie ou dans la région MENA

Formate ta réponse avec des sections claires.`;

    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 1200,
    });

    const response = completion.choices?.[0]?.message?.content || 'Aucune suggestion disponible.';
    res.json({ suggestions: response });
  } catch (err) {
    console.error('getAiHelp error:', err.message);
    res.status(500).json({ message: 'Erreur lors de la génération de suggestions IA.' });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   F8 — Feedback structuré sur livrable + progress + rubric CRUD
───────────────────────────────────────────────────────────────────────── */

/**
 * POST /api/projects/:id/livrables/:livrableId/feedback
 * Le prof (ou admin) donne un feedback structuré sur un livrable étudiant :
 * texte coaching + note 1-5 étoiles. Distinct des `evaluations[]` (peer-review).
 */
export const addLivrableFeedback = async (req, res) => {
  try {
    if (!['professeur', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Seul un professeur peut donner un feedback.' });
    }
    const { id, livrableId } = req.params;
    const { text, rating } = req.body;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    const livrable = project.livrables.id(livrableId);
    if (!livrable) return res.status(404).json({ message: 'Livrable introuvable.' });

    livrable.feedback = {
      from:      req.user.id,
      text:      String(text || '').slice(0, 2000),
      rating:    Number.isFinite(Number(rating)) ? Math.max(1, Math.min(5, Math.round(Number(rating)))) : null,
      createdAt: new Date(),
    };

    project.activity.push({
      type:        'livrable_feedback',
      authorId:    req.user.id,
      description: `Feedback ajouté sur le livrable "${livrable.titre}" (note ${livrable.feedback.rating ?? '—'}/5).`,
      meta:        { livrableId: livrable._id },
    });

    await project.save();
    await project.populate('livrables.feedback.from', 'nom prenom');

    // F8 hotfix — Notification temps réel à l'étudiant qui a déposé le livrable.
    // Le toast violet (type 'project_status') le prévient pour qu'il n'ait pas
    // à recharger la page projet pour découvrir son feedback.
    try {
      const io = req.app.get('io');
      if (io && livrable.uploadedBy) {
        const ratingStars = livrable.feedback.rating
          ? `${livrable.feedback.rating}/5 ★`
          : '';
        const { pushNotification } = await import('../services/notificationService.js');
        await pushNotification(io, {
          userId:      livrable.uploadedBy,
          type:        'project_status',
          priority:    livrable.feedback.rating && livrable.feedback.rating <= 2 ? 'high' : 'normal',
          title:       '📝 Nouveau feedback prof',
          message:     `Ton livrable "${livrable.titre}" a reçu un feedback ${ratingStars}`,
          link:        `/projects/${project._id}`,
          relatedType: 'project',
          relatedId:   project._id,
          dedupKey:    `livrable_feedback_${livrable._id}_${Date.now()}`,
        });
      }
    } catch (notifErr) {
      console.error('[livrableFeedback notif]', notifErr.message);
      // Non-bloquant : le feedback est sauvé même si la notif échoue
    }

    res.json({ feedback: livrable.feedback, livrableId: livrable._id });
  } catch (err) {
    console.error('addLivrableFeedback error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/projects/:id/progress
 * Calcule pour chaque membre du projet :
 *   - phasesCompleted (statut === 'termine' parmi celles concernant son groupe)
 *   - phasesTotal
 *   - livrablesUploaded (par lui-même)
 *   - livrablesWithFeedback
 *   - completionPercent (basé sur phases termine / phases total)
 */
export const getProjectProgress = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('groupes.membres.userId', 'nom prenom')
      .lean();
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    const phasesTotal = (project.phases || []).length;
    const phasesTermine = (project.phases || []).filter((p) => p.statut === 'termine').length;
    const projectCompletion = phasesTotal > 0 ? Math.round((phasesTermine / phasesTotal) * 100) : 0;

    const memberStats = [];
    for (const groupe of project.groupes || []) {
      for (const membre of groupe.membres || []) {
        const userId = membre.userId?._id ?? membre.userId;
        if (!userId) continue;
        const myLivrables = (project.livrables || []).filter((l) => String(l.uploadedBy) === String(userId));
        const myFeedbacks = myLivrables.filter((l) => l.feedback);
        memberStats.push({
          userId,
          user: membre.userId,
          role: membre.role,
          groupeNom: groupe.nom,
          livrablesUploaded: myLivrables.length,
          livrablesWithFeedback: myFeedbacks.length,
        });
      }
    }

    res.json({
      phasesTotal,
      phasesTermine,
      projectCompletionPercent: projectCompletion,
      groupesCount: (project.groupes || []).length,
      livrablesTotal: (project.livrables || []).length,
      livrablesWithFeedback: (project.livrables || []).filter((l) => l.feedback).length,
      members: memberStats,
    });
  } catch (err) {
    console.error('getProjectProgress error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/projects/:id/rubric
 * Le prof remplace la rubric complète. On valide la forme (criterion + maxPoints + descriptors).
 */
export const setProjectRubric = async (req, res) => {
  try {
    if (!['professeur', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Seul un professeur peut modifier la rubric.' });
    }
    const { rubric } = req.body;
    if (!Array.isArray(rubric)) {
      return res.status(400).json({ message: 'rubric doit être un tableau.' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    project.rubric = rubric.map((c) => ({
      criterion:   String(c.criterion || '').slice(0, 200),
      maxPoints:   Math.max(0, Math.min(100, Number(c.maxPoints) || 20)),
      descriptors: Array.isArray(c.descriptors)
        ? c.descriptors
            .filter((d) => d && Number.isFinite(Number(d.level)))
            .map((d) => ({
              level: Math.max(1, Math.min(5, Math.round(Number(d.level)))),
              text:  String(d.text || '').slice(0, 500),
            }))
        : [],
    })).filter((c) => c.criterion);

    project.activity.push({
      type:        'rubric_updated',
      authorId:    req.user.id,
      description: `Rubric mise à jour (${project.rubric.length} critères).`,
    });

    await project.save();
    res.json({ rubric: project.rubric });
  } catch (err) {
    console.error('setProjectRubric error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/projects/:id/rubric — renvoie la rubric (publique aux membres et au prof).
 */
export const getProjectRubric = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).select('rubric titre').lean();
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });
    res.json({ rubric: project.rubric || [], titre: project.titre });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/projects/templates/:type
 * Renvoie le template phases + rubric pour un type donné — utilisé par
 * ProjectCreate.jsx pour pré-remplir le formulaire à la sélection du type.
 */
export const getProjectTemplate = async (req, res) => {
  try {
    const { type } = req.params;
    if (!['mono', 'groupe', 'pfe'].includes(type)) {
      return res.status(400).json({ message: 'type invalide.' });
    }
    const { getPhasesTemplate, getRubricTemplate } = await import('../services/projectTemplates.js');
    res.json({
      type,
      phases: getPhasesTemplate(type),
      rubric: getRubricTemplate(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════
   MILESTONES — Déblocage progressif (refonte 2026-05, articulation CAI)
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * GET /api/projects/:projectId/my-phases
 * Renvoie les phases du projet avec leur statut de déblocage pour l'étudiant
 * connecté + détails (chapitres/cas pratiques requis et leur état).
 *
 * Auth : étudiant inscrit dans un groupe du projet.
 * Côté prof/admin : on tolère l'accès à des fins de démo (pas d'inscription
 * requise) et on renvoie une vue lecture sans recalculer studentProgress.
 */
export const getMyPhases = async (req, res) => {
  try {
    const { computePhaseStatus, isStudentEnrolledInProject } = await import('../services/projectMilestoneService.js');
    // Route registered as /:id (cohérent avec le reste du fichier)
    const projectId = req.params.id;

    if (req.user.role === 'professeur' || req.user.role === 'admin') {
      // Vue prof : retourne le projet + phases brut (sans recalcul individuel)
      const project = await Project.findById(projectId).lean();
      if (!project) return res.status(404).json({ message: 'Projet introuvable.' });
      return res.json({
        project: {
          _id: project._id, titre: project.titre, type: project.type,
          status: project.status, courseId: project.courseId,
        },
        phases: (project.phases || []).map((p) => ({
          _id: p._id,
          titre: p.titre,
          status: 'unlocked',
          details: { hasRules: !!(p.unlockRules && (
            (p.unlockRules.chapterIds?.length || 0) +
            (p.unlockRules.casPratiqueIds?.length || 0)
          )) },
        })),
      });
    }

    const result = await computePhaseStatus(projectId, req.user.id);
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('[getMyPhases]', err);
    return res.status(500).json({ message: err.message || 'Erreur serveur.' });
  }
};

/**
 * POST /api/projects/:projectId/phases/:phaseId/import-livrable
 * Réutilise le livrable de l'étudiant pour le cas pratique source de la phase.
 * Conditions :
 *   - phase.sourceCasPratiqueId renseigné
 *   - studentProgress.status ∈ {unlocked, in-progress}
 *   - cas pratique évalué pour cet étudiant (livrable + note présents)
 */
export const importPhaseLivrable = async (req, res) => {
  try {
    const { isCasPratiqueEvaluatedForUser } = await import('../services/progressService.js');
    const Prosit = (await import('../models/Prosit.js')).default;
    // Route registered as /:id/phases/:phaseId
    const projectId = req.params.id;
    const { phaseId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    const phase = project.phases.id(phaseId);
    if (!phase) return res.status(404).json({ message: 'Phase introuvable.' });

    if (!phase.sourceCasPratiqueId) {
      return res.status(400).json({
        message: 'Aucun cas pratique source défini pour cette phase.',
      });
    }

    // Étudiant inscrit ?
    const userId = req.user.id;
    const enrolled = (project.groupes || []).some((g) =>
      (g.membres || []).some((m) => String(m.userId) === String(userId))
    );
    if (!enrolled) {
      return res.status(403).json({ message: "Vous n'êtes pas inscrit dans un groupe de ce projet." });
    }

    // Cas pratique évalué pour cet étudiant ?
    const evaluated = await isCasPratiqueEvaluatedForUser(userId, phase.sourceCasPratiqueId);
    if (!evaluated) {
      return res.status(400).json({
        message: "Ce cas pratique n'est pas encore évalué pour vous (livrable ou note manquant).",
      });
    }

    // Récupère le livrable
    const cp = await Prosit.findById(phase.sourceCasPratiqueId).select('titre livrables').lean();
    const livrable = (cp?.livrables || []).find((l) => String(l.studentId) === String(userId));
    if (!livrable) {
      return res.status(404).json({ message: 'Aucun livrable trouvé pour vous sur ce cas pratique.' });
    }

    // Vérifie / crée le studentProgress, contrôle le statut
    let sp = phase.studentProgress.find((s) => String(s.studentId) === String(userId));
    if (!sp) {
      phase.studentProgress.push({ studentId: userId, status: 'unlocked' });
      sp = phase.studentProgress[phase.studentProgress.length - 1];
    }
    if (!['unlocked', 'in-progress'].includes(sp.status)) {
      return res.status(400).json({
        message: `Phase verrouillée ou déjà soumise (statut: ${sp.status}).`,
      });
    }

    // Copie du contenu : on tente le contenu texte d'abord, puis le fichier
    sp.submission = livrable.contenu || sp.submission || '';
    if (livrable.fichierUrl) sp.fichierUrl = livrable.fichierUrl;
    sp.importedFromCasPratiqueId = phase.sourceCasPratiqueId;
    sp.status = 'in-progress';

    project.markModified('phases');
    await project.save();

    return res.json({
      _id: phase._id,
      titre: phase.titre,
      status: sp.status,
      submission: sp.submission,
      fichierUrl: sp.fichierUrl,
      importedFromCasPratiqueId: sp.importedFromCasPratiqueId,
      casPratiqueTitre: cp?.titre,
    });
  } catch (err) {
    console.error('[importPhaseLivrable]', err);
    return res.status(500).json({ message: err.message || 'Erreur serveur.' });
  }
};

/**
 * POST /api/projects/:projectId/phases/:phaseId/submit
 * Soumet la version finale de la phase pour l'étudiant.
 * Body : { submission: String, fichierUrl?: String }
 * Conditions : status ∈ {unlocked, in-progress}.
 */
export const submitPhaseLivrable = async (req, res) => {
  try {
    // Route registered as /:id/phases/:phaseId
    const projectId = req.params.id;
    const { phaseId } = req.params;
    const { submission, fichierUrl } = req.body || {};

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    const phase = project.phases.id(phaseId);
    if (!phase) return res.status(404).json({ message: 'Phase introuvable.' });

    const userId = req.user.id;
    const enrolled = (project.groupes || []).some((g) =>
      (g.membres || []).some((m) => String(m.userId) === String(userId))
    );
    if (!enrolled) {
      return res.status(403).json({ message: "Vous n'êtes pas inscrit dans un groupe de ce projet." });
    }

    if (typeof submission !== 'string' || submission.trim().length === 0) {
      return res.status(400).json({ message: 'submission (texte) est requis.' });
    }

    let sp = phase.studentProgress.find((s) => String(s.studentId) === String(userId));
    if (!sp) {
      phase.studentProgress.push({ studentId: userId, status: 'unlocked' });
      sp = phase.studentProgress[phase.studentProgress.length - 1];
    }
    if (!['unlocked', 'in-progress'].includes(sp.status)) {
      return res.status(400).json({
        message: `Phase verrouillée ou déjà soumise (statut: ${sp.status}).`,
      });
    }

    sp.submission = submission.trim();
    if (typeof fichierUrl === 'string') sp.fichierUrl = fichierUrl || null;
    sp.status = 'submitted';
    sp.submittedAt = new Date();

    project.markModified('phases');
    await project.save();

    return res.json({
      _id: phase._id,
      titre: phase.titre,
      status: sp.status,
      submission: sp.submission,
      fichierUrl: sp.fichierUrl,
      submittedAt: sp.submittedAt,
    });
  } catch (err) {
    console.error('[submitPhaseLivrable]', err);
    return res.status(500).json({ message: err.message || 'Erreur serveur.' });
  }
};
