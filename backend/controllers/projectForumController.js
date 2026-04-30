import ProjectThread from '../models/ProjectThread.js';
import Project from '../models/Project.js';
import { pushNotification } from '../services/notificationService.js';

/**
 * projectForumController — Gère les threads de discussion d'un projet (F9).
 *
 * Auth :
 *  - Lecture : tout membre du projet ou son créateur ou admin.
 *  - Écriture (création thread / réponse) : idem.
 *  - Annonces (type='announcement') ET pin/unpin : prof/admin uniquement.
 *  - Marquage 'isResolved' : auteur du thread OU prof/admin.
 */

/**
 * Vérifie qu'un user a le droit d'accéder au forum d'un projet.
 * Retourne { project, role: 'member'|'creator'|'admin'|null }.
 */
async function checkAccess(projectId, user) {
  const project = await Project.findById(projectId).select('createdBy groupes titre').lean();
  if (!project) return { error: 'project-not-found' };

  if (user.role === 'admin') return { project, accessRole: 'admin' };
  if (String(project.createdBy) === String(user.id)) return { project, accessRole: 'creator' };

  for (const g of project.groupes || []) {
    for (const m of g.membres || []) {
      if (String(m.userId) === String(user.id)) return { project, accessRole: 'member' };
    }
  }
  return { error: 'not-a-member' };
}

/* ─── GET /api/projects/:id/threads ─────────────────────────────────────── */
export const listThreads = async (req, res) => {
  try {
    const { project, accessRole, error } = await checkAccess(req.params.id, req.user);
    if (error === 'project-not-found') return res.status(404).json({ message: 'Projet introuvable.' });
    if (error === 'not-a-member')      return res.status(403).json({ message: 'Tu n\'as pas accès à ce projet.' });

    const { type } = req.query;
    const filter = { projectId: project._id };
    if (type && ['question', 'announcement', 'sharing'].includes(type)) filter.type = type;

    const threads = await ProjectThread.find(filter)
      .populate('authorId', 'nom prenom role')
      .populate('replies.authorId', 'nom prenom role')
      .sort({ pinnedByProf: -1, createdAt: -1 })
      .limit(100);

    res.json({ threads, accessRole });
  } catch (err) {
    console.error('listThreads error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ─── POST /api/projects/:id/threads ────────────────────────────────────── */
export const createThread = async (req, res) => {
  try {
    const { project, accessRole, error } = await checkAccess(req.params.id, req.user);
    if (error === 'project-not-found') return res.status(404).json({ message: 'Projet introuvable.' });
    if (error === 'not-a-member')      return res.status(403).json({ message: 'Tu n\'as pas accès à ce projet.' });

    const { title, content, type } = req.body || {};
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ message: 'title et content requis.' });
    }

    // Annonces : prof/admin uniquement
    if (type === 'announcement' && accessRole === 'member') {
      return res.status(403).json({ message: 'Seul le prof peut créer une annonce.' });
    }

    const thread = await ProjectThread.create({
      projectId:    project._id,
      authorId:     req.user.id,
      title:        title.trim().slice(0, 200),
      content:      content.trim().slice(0, 8000),
      type:         ['question', 'announcement', 'sharing'].includes(type) ? type : 'question',
      pinnedByProf: type === 'announcement' && accessRole !== 'member',
    });
    await thread.populate('authorId', 'nom prenom role');

    // Notif Socket.io aux autres membres du projet (auteur exclu)
    try {
      const io = req.app.get('io');
      if (io) {
        const memberIds = new Set();
        for (const g of project.groupes || []) {
          for (const m of g.membres || []) {
            if (String(m.userId) !== String(req.user.id)) memberIds.add(String(m.userId));
          }
        }
        const typeEmoji = type === 'announcement' ? '📢' : type === 'sharing' ? '✨' : '❓';
        const titlePrefix = type === 'announcement' ? 'Nouvelle annonce' : type === 'sharing' ? 'Nouveau partage' : 'Nouvelle question';
        for (const userId of memberIds) {
          await pushNotification(io, {
            userId,
            type:        type === 'announcement' ? 'urgent' : 'message',
            priority:    type === 'announcement' ? 'high' : 'normal',
            title:       `${typeEmoji} ${titlePrefix} — ${project.titre}`,
            message:     thread.title,
            link:        `/projects/${project._id}`,
            relatedType: 'project',
            relatedId:   project._id,
            dedupKey:    `thread_${thread._id}_created`,
          });
        }
      }
    } catch (notifErr) {
      console.error('[forum/createThread notif]', notifErr.message);
    }

    res.status(201).json(thread);
  } catch (err) {
    console.error('createThread error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ─── POST /api/projects/:id/threads/:threadId/replies ──────────────────── */
export const replyToThread = async (req, res) => {
  try {
    const { project, accessRole, error } = await checkAccess(req.params.id, req.user);
    if (error === 'project-not-found') return res.status(404).json({ message: 'Projet introuvable.' });
    if (error === 'not-a-member')      return res.status(403).json({ message: 'Tu n\'as pas accès à ce projet.' });

    const { content } = req.body || {};
    if (!content?.trim()) return res.status(400).json({ message: 'content requis.' });

    const thread = await ProjectThread.findOne({ _id: req.params.threadId, projectId: project._id });
    if (!thread) return res.status(404).json({ message: 'Thread introuvable.' });

    const reply = {
      authorId:   req.user.id,
      content:    content.trim().slice(0, 4000),
      isFromProf: ['creator', 'admin'].includes(accessRole) || req.user.role === 'professeur',
      createdAt:  new Date(),
    };
    thread.replies.push(reply);
    await thread.save();
    await thread.populate('replies.authorId', 'nom prenom role');

    // Notif à l'auteur du thread (si différent du répondeur)
    try {
      const io = req.app.get('io');
      if (io && String(thread.authorId) !== String(req.user.id)) {
        await pushNotification(io, {
          userId:      thread.authorId,
          type:        'message',
          priority:    reply.isFromProf ? 'high' : 'normal',
          title:       reply.isFromProf ? '💬 Le prof a répondu' : '💬 Nouvelle réponse',
          message:     `Sur "${thread.title}" — ${project.titre}`,
          link:        `/projects/${project._id}`,
          relatedType: 'project',
          relatedId:   project._id,
          dedupKey:    `thread_${thread._id}_reply_${thread.replies.length}`,
        });
      }
    } catch (notifErr) {
      console.error('[forum/reply notif]', notifErr.message);
    }

    res.json(thread);
  } catch (err) {
    console.error('replyToThread error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ─── PATCH /api/projects/:id/threads/:threadId ─────────────────────────── */
/**
 * Permet au prof de pin/unpin, et à l'auteur ou au prof de marquer comme résolu.
 * Body : { pinnedByProf?: bool, isResolved?: bool }
 */
export const updateThread = async (req, res) => {
  try {
    const { project, accessRole, error } = await checkAccess(req.params.id, req.user);
    if (error === 'project-not-found') return res.status(404).json({ message: 'Projet introuvable.' });
    if (error === 'not-a-member')      return res.status(403).json({ message: 'Tu n\'as pas accès à ce projet.' });

    const thread = await ProjectThread.findOne({ _id: req.params.threadId, projectId: project._id });
    if (!thread) return res.status(404).json({ message: 'Thread introuvable.' });

    const { pinnedByProf, isResolved } = req.body || {};

    if (pinnedByProf !== undefined) {
      if (!['creator', 'admin'].includes(accessRole)) {
        return res.status(403).json({ message: 'Seul le prof peut épingler un thread.' });
      }
      thread.pinnedByProf = !!pinnedByProf;
    }

    if (isResolved !== undefined) {
      const isAuthor = String(thread.authorId) === String(req.user.id);
      if (!isAuthor && !['creator', 'admin'].includes(accessRole)) {
        return res.status(403).json({ message: 'Seul l\'auteur ou le prof peut marquer comme résolu.' });
      }
      thread.isResolved = !!isResolved;
    }

    await thread.save();
    res.json(thread);
  } catch (err) {
    console.error('updateThread error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ─── DELETE /api/projects/:id/threads/:threadId ────────────────────────── */
export const deleteThread = async (req, res) => {
  try {
    const { project, accessRole, error } = await checkAccess(req.params.id, req.user);
    if (error === 'project-not-found') return res.status(404).json({ message: 'Projet introuvable.' });
    if (error === 'not-a-member')      return res.status(403).json({ message: 'Tu n\'as pas accès à ce projet.' });

    const thread = await ProjectThread.findOne({ _id: req.params.threadId, projectId: project._id });
    if (!thread) return res.status(404).json({ message: 'Thread introuvable.' });

    const isAuthor = String(thread.authorId) === String(req.user.id);
    if (!isAuthor && !['creator', 'admin'].includes(accessRole)) {
      return res.status(403).json({ message: 'Seul l\'auteur ou le prof peut supprimer.' });
    }

    await thread.deleteOne();
    res.json({ message: 'Thread supprimé.' });
  } catch (err) {
    console.error('deleteThread error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

export default { listThreads, createThread, replyToThread, updateThread, deleteThread };
