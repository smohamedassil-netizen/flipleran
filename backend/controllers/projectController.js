import Project from '../models/Project.js';
import User from '../models/User.js';
import { uploadBuffer } from '../config/cloudinary.js';
import Groq from 'groq-sdk';
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
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
}

/* ─── POST /api/projects ──────────────────────────────────────────────────── */
export const createProject = async (req, res) => {
  try {
    if (req.user.role !== 'professeur') {
      return res.status(403).json({ message: 'Seul un professeur peut créer un projet.' });
    }

    const { titre, description, type, courseId, modules = [], enonce, motsCles, dateDebut, dateFin, dateSoutenance, phases } = req.body;
    if (!titre || !type) {
      return res.status(400).json({ message: 'titre et type sont requis.' });
    }
    if (!['mono', 'groupe'].includes(type)) {
      return res.status(400).json({ message: 'type doit être "mono" ou "groupe".' });
    }
    if (type === 'mono' && !courseId) {
      return res.status(400).json({ message: 'Un projet mono-module doit être rattaché à un cours.' });
    }
    if (type === 'groupe' && (!Array.isArray(modules) || modules.length < 2)) {
      return res.status(400).json({ message: 'Un projet groupé doit être rattaché à au moins deux modules.' });
    }

    // Phases par défaut (communes à mono et groupé)
    const defaultPhases = [
      { titre: 'Lancement' },
      { titre: 'Recherche' },
      { titre: 'Développement' },
      { titre: 'Livrable' },
      { titre: 'Soutenance' },
    ];

    const data = {
      titre,
      description: description ?? '',
      type,
      courseId: type === 'mono' ? courseId : (courseId || undefined),
      modules: type === 'groupe' ? modules : [],
      enonce: enonce ?? '',
      motsCles: motsCles ?? [],
      dateDebut,
      dateFin,
      dateSoutenance,
      phases: Array.isArray(phases) && phases.length ? phases : defaultPhases,
      createdBy: req.user.id,
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
      // Prof/Admin : projets créés ou auxquels ils participent
      filter = {
        $or: [
          { createdBy: req.user.id },
          { 'groupes.membres.userId': req.user.id },
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
      .populate('activity.authorId', 'nom prenom role');

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
        try { await addPoints(uid, 100, 'project_completed'); }
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
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    const prompt = `Suggest 5 useful resources (articles, tutorials, tools) for a student project about: ${project.titre} - ${project.description}. Respond in French with a numbered list. For each resource, give the name, a short description, and a URL if possible.`;

    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Tu es un assistant pédagogique pour une université algérienne. Réponds toujours en français.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const response = completion.choices?.[0]?.message?.content || 'Aucune suggestion disponible.';
    res.json({ suggestions: response });
  } catch (err) {
    console.error('getAiHelp error:', err.message);
    res.status(500).json({ message: 'Erreur lors de la génération de suggestions IA.' });
  }
};
