import Project from '../models/Project.js';
import User from '../models/User.js';
import { uploadBuffer } from '../config/cloudinary.js';
import Groq from 'groq-sdk';

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

    const { titre, description, type, courseId, enonce, motsCles, dateDebut, dateFin, dateSoutenance } = req.body;
    if (!titre || !type) {
      return res.status(400).json({ message: 'titre et type sont requis.' });
    }

    const data = {
      titre,
      description: description ?? '',
      type,
      courseId: courseId || undefined,
      createdBy: req.user.id,
    };

    if (type === 'prosit') {
      data.enonce = enonce ?? '';
      data.motsCles = motsCles ?? [];
      data.phases = [
        { titre: 'Prosit Aller' },
        { titre: 'Recherche individuelle' },
        { titre: 'Prosit Retour' },
      ];
    } else if (type === 'projet') {
      data.dateDebut = dateDebut;
      data.dateFin = dateFin;
      data.dateSoutenance = dateSoutenance;
      data.phases = [
        { titre: 'Lancement' },
        { titre: 'Recherche' },
        { titre: 'Développement' },
        { titre: 'Préparation soutenance' },
        { titre: 'Soutenance' },
      ];
    }

    const project = await Project.create(data);
    await project.populate('createdBy', 'nom prenom');
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
    } else {
      // Retourner les projets du cours OU ceux où l'utilisateur participe
      filter = {
        $or: [
          { createdBy: req.user.id },
          { 'groupes.membres.userId': req.user.id },
        ],
      };
    }

    const projects = await Project.find(filter)
      .populate('createdBy', 'nom prenom')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/projects/:id ───────────────────────────────────────────────── */
export const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'nom prenom')
      .populate('groupes.membres.userId', 'nom prenom email filiere');

    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });
    res.json(project);
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

    Object.assign(project, req.body);
    await project.save();
    await project.populate('createdBy', 'nom prenom');
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
    if (statut) phase.statut = statut;
    if (dateDebut) phase.dateDebut = dateDebut;
    if (dateFin) phase.dateFin = dateFin;

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

    const { titre, groupeIndex, type } = req.body;
    if (!titre || groupeIndex === undefined || !type) {
      return res.status(400).json({ message: 'titre, groupeIndex et type sont requis.' });
    }

    const cleanName = req.file.originalname
      .replace(/\s+/g, '_')
      .replace(/\.[^.]+$/, '');
    const result = await uploadBuffer(req.file.buffer, {
      folder: `fliplearn/projects/${req.params.id}`,
      resource_type: 'raw',
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
