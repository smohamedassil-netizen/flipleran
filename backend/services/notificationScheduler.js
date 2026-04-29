import cron from 'node-cron';
import QCM from '../models/QCM.js';
import Video from '../models/Video.js';
import Project from '../models/Project.js';
import Prosit from '../models/Prosit.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Progress from '../models/Progress.js';
import { pushNotification } from './notificationService.js';
import { sendNotificationEmail } from './emailService.js';

/**
 * Envoie un email de rappel uniquement les jours critiques (J-1 et J-0).
 * Les rappels J-7 et J-3 restent in-app uniquement pour ne pas spammer.
 */
async function sendDeadlineEmail(userId, subject, body, days) {
  if (days > 1) return; // Email seulement pour J-0 et J-1
  try {
    const user = await User.findById(userId).select('email prenom');
    if (user?.email) {
      await sendNotificationEmail(user.email, subject, body);
    }
  } catch (err) {
    console.error('[email deadline]', err.message);
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dateKey(d = new Date()) {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function daysUntil(date) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / DAY_MS);
}

/**
 * Récupère les étudiants d'un cours (même filière/promotion OU ayant une progression sur ce cours).
 */
async function getStudentsForCourse(courseId) {
  const course = await Course.findById(courseId).select('filiere promotion');
  if (!course) return [];
  const students = await User.find({
    role: 'etudiant',
    isActive: { $ne: false },
    filiere: course.filiere,
    promotion: course.promotion,
  }).select('_id');
  return students.map(s => s._id.toString());
}

/* ─── Rappels QCM ──────────────────────────────────────────────────────── */
export async function checkQCMDeadlines(io) {
  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * DAY_MS);

  const qcms = await QCM.find({
    deadline: { $gte: now, $lte: horizon },
  }).populate({ path: 'videoId', select: 'titre courseId' });

  for (const qcm of qcms) {
    if (!qcm.videoId) continue;
    const days = daysUntil(qcm.deadline);
    if (days === null || days < 0) continue;
    // Rappels à J-7, J-3, J-1, J-0
    if (![0, 1, 3, 7].includes(days)) continue;

    const studentIds = await getStudentsForCourse(qcm.videoId.courseId);
    const completedIds = new Set(qcm.resultats.map(r => r.userId.toString()));
    const pendingIds = studentIds.filter(id => !completedIds.has(id));

    for (const userId of pendingIds) {
      const dk = `qcm_${qcm._id}_${userId}_d${days}`;
      const urgency = days <= 1 ? 'urgent' : days <= 3 ? 'high' : 'normal';
      const when = days === 0 ? "aujourd'hui" : days === 1 ? 'demain' : `dans ${days} jours`;
      await pushNotification(io, {
        userId,
        type: 'reminder_qcm',
        priority: urgency,
        title: '📝 QCM à faire',
        message: `Le QCM "${qcm.titre}" expire ${when}. Fais-le avant la deadline !`,
        link: `/qcm/${qcm.videoId._id}`,
        relatedType: 'qcm',
        relatedId: qcm._id,
        dedupKey: dk,
      });
      await sendDeadlineEmail(
        userId,
        `QCM "${qcm.titre}" — à faire ${when}`,
        `Le QCM <strong>"${qcm.titre}"</strong> du cours <strong>${qcm.videoId.titre}</strong> expire ${when}. Connecte-toi à FlipLearn pour le faire avant la deadline.`,
        days,
      );
    }
  }
}

/* ─── Rappels vidéos ───────────────────────────────────────────────────── */
export async function checkVideoDeadlines(io) {
  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * DAY_MS);

  const videos = await Video.find({
    deadline: { $gte: now, $lte: horizon },
  }).select('titre courseId deadline watchedBy');

  for (const video of videos) {
    const days = daysUntil(video.deadline);
    if (days === null || days < 0) continue;
    if (![0, 1, 3, 7].includes(days)) continue;

    const studentIds = await getStudentsForCourse(video.courseId);
    const watchedIds = new Set(
      video.watchedBy.filter(w => w.completed).map(w => w.userId.toString())
    );
    const pendingIds = studentIds.filter(id => !watchedIds.has(id));

    for (const userId of pendingIds) {
      const dk = `video_${video._id}_${userId}_d${days}`;
      const urgency = days <= 1 ? 'urgent' : days <= 3 ? 'high' : 'normal';
      const when = days === 0 ? "aujourd'hui" : days === 1 ? 'demain' : `dans ${days} jours`;
      await pushNotification(io, {
        userId,
        type: 'reminder_video',
        priority: urgency,
        title: '🎥 Vidéo à regarder',
        message: `La vidéo "${video.titre}" doit être vue ${when}.`,
        link: `/watch/${video._id}`,
        relatedType: 'video',
        relatedId: video._id,
        dedupKey: dk,
      });
      await sendDeadlineEmail(
        userId,
        `Vidéo "${video.titre}" — à regarder ${when}`,
        `La vidéo <strong>"${video.titre}"</strong> doit être vue ${when}. Ouvre FlipLearn pour la visionner avant la deadline.`,
        days,
      );
    }
  }
}

/* ─── Rappels projets (phases + deadline finale) ──────────────────────── */
export async function checkProjectDeadlines(io) {
  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * DAY_MS);

  const projects = await Project.find({
    status: { $in: ['actif', 'brouillon'] },
    $or: [
      { dateFin: { $gte: now, $lte: horizon } },
      { 'phases.dateFin': { $gte: now, $lte: horizon } },
    ],
  });

  for (const project of projects) {
    // Membres du projet (tous groupes confondus)
    const memberIds = new Set();
    project.groupes.forEach(g => {
      g.membres.forEach(m => memberIds.add(m.userId.toString()));
    });

    // Deadline projet global
    if (project.dateFin) {
      const days = daysUntil(project.dateFin);
      if (days !== null && days >= 0 && [0, 1, 3, 7].includes(days)) {
        const when = days === 0 ? "aujourd'hui" : days === 1 ? 'demain' : `dans ${days} jours`;
        const urgency = days <= 1 ? 'urgent' : days <= 3 ? 'high' : 'normal';
        for (const userId of memberIds) {
          await pushNotification(io, {
            userId,
            type: 'reminder_project',
            priority: urgency,
            title: '📁 Projet à rendre',
            message: `Le projet "${project.titre}" doit être rendu ${when}.`,
            link: `/projects/${project._id}`,
            relatedType: 'project',
            relatedId: project._id,
            dedupKey: `project_${project._id}_final_d${days}`,
          });
          await sendDeadlineEmail(
            userId,
            `Projet "${project.titre}" — à rendre ${when}`,
            `Le projet <strong>"${project.titre}"</strong> doit être rendu ${when}. Pense à déposer ton livrable et finaliser les phases.`,
            days,
          );
        }
      }
    }

    // Deadlines phases
    for (const phase of project.phases) {
      if (phase.statut === 'termine' || !phase.dateFin) continue;
      const days = daysUntil(phase.dateFin);
      if (days === null || days < 0) continue;
      if (![0, 1, 3].includes(days)) continue;
      const when = days === 0 ? "aujourd'hui" : days === 1 ? 'demain' : `dans ${days} jours`;
      const urgency = days <= 1 ? 'urgent' : 'high';
      for (const userId of memberIds) {
        await pushNotification(io, {
          userId,
          type: 'reminder_project',
          priority: urgency,
          title: '⏳ Phase à compléter',
          message: `La phase "${phase.titre}" du projet "${project.titre}" expire ${when}.`,
          link: `/projects/${project._id}`,
          relatedType: 'project',
          relatedId: project._id,
          dedupKey: `project_${project._id}_phase_${phase._id}_d${days}`,
        });
      }
    }
  }
}

/* ─── Rappels Prosit ──────────────────────────────────────────────────── */
export async function checkPrositDeadlines(io) {
  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * DAY_MS);

  const prosits = await Prosit.find({
    status: { $in: ['aller', 'recherche', 'retour'] },
    $or: [
      { dateAller:  { $gte: now, $lte: horizon } },
      { dateRetour: { $gte: now, $lte: horizon } },
    ],
  });

  for (const prosit of prosits) {
    // Membres de tous les groupes
    const memberIds = new Set();
    prosit.groupes.forEach(g => {
      g.membres.forEach(m => memberIds.add(m.userId.toString()));
    });

    // Deadline phase Aller (séance 1)
    if (prosit.status === 'aller' || prosit.status === 'brouillon') {
      const days = daysUntil(prosit.dateAller);
      if (days !== null && days >= 0 && [0, 1, 3].includes(days)) {
        const when = days === 0 ? "aujourd'hui" : days === 1 ? 'demain' : `dans ${days} jours`;
        const urgency = days <= 1 ? 'urgent' : 'high';
        for (const userId of memberIds) {
          await pushNotification(io, {
            userId,
            type: 'reminder_prosit',
            priority: urgency,
            title: '💡 Prosit — Phase Aller',
            message: `La phase Aller du Prosit "${prosit.titre}" commence ${when}.`,
            link: `/prosits/${prosit._id}`,
            relatedType: 'prosit',
            relatedId: prosit._id,
            dedupKey: `prosit_${prosit._id}_aller_d${days}`,
          });
          await sendDeadlineEmail(
            userId,
            `Prosit "${prosit.titre}" — Phase Aller ${when}`,
            `La phase Aller du Prosit <strong>"${prosit.titre}"</strong> commence ${when}. Prépare ton groupe : lecture de l'énoncé, identification des mots-clés, hypothèses initiales.`,
            days,
          );
        }
      }
    }

    // Deadline phase Retour (séance 2)
    const daysRetour = daysUntil(prosit.dateRetour);
    if (daysRetour !== null && daysRetour >= 0 && [0, 1, 3].includes(daysRetour)) {
      const when = daysRetour === 0 ? "aujourd'hui" : daysRetour === 1 ? 'demain' : `dans ${daysRetour} jours`;
      const urgency = daysRetour <= 1 ? 'urgent' : 'high';
      for (const userId of memberIds) {
        await pushNotification(io, {
          userId,
          type: 'reminder_prosit',
          priority: urgency,
          title: '💡 Prosit — Phase Retour',
          message: `La présentation du Prosit "${prosit.titre}" a lieu ${when}.`,
          link: `/prosits/${prosit._id}`,
          relatedType: 'prosit',
          relatedId: prosit._id,
          dedupKey: `prosit_${prosit._id}_retour_d${daysRetour}`,
        });
        await sendDeadlineEmail(
          userId,
          `Prosit "${prosit.titre}" — Phase Retour ${when}`,
          `La phase Retour du Prosit <strong>"${prosit.titre}"</strong> a lieu ${when}. Finalise ta contribution individuelle et prépare la présentation de groupe.`,
          daysRetour,
        );
      }
    }
  }
}

/* ─── Rappels inactivité (vidéos sans deadline non vues depuis publication) ─
 * Filet de sécurité quand le prof n'a pas mis de deadline : si une vidéo
 * date de plus de 7 jours et qu'un étudiant ne l'a jamais commencée, on
 * envoie une notification (in-app uniquement, pas d'email pour éviter le
 * spam). Dédupliqué par semaine pour ne pas envoyer le même rappel
 * plusieurs fois par mois.
 */
export async function checkInactivityReminders(io) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
  const weekKey = `w${Math.floor(now.getTime() / (7 * DAY_MS))}`;

  // Vidéos publiées il y a 7+ jours, sans deadline (sinon traitées par checkVideoDeadlines)
  const videos = await Video.find({
    deadline: { $in: [null, undefined] },
    createdAt: { $lte: sevenDaysAgo },
  }).select('titre courseId watchedBy');

  for (const video of videos) {
    const studentIds = await getStudentsForCourse(video.courseId);
    const watchedIds = new Set(
      video.watchedBy
        .filter(w => (w.watchedPercent ?? 0) > 0)
        .map(w => w.userId.toString())
    );
    const inactiveIds = studentIds.filter(id => !watchedIds.has(id));

    for (const userId of inactiveIds) {
      await pushNotification(io, {
        userId,
        type: 'reminder_inactivity',
        priority: 'normal',
        title: '🎥 Une vidéo t\'attend',
        message: `Tu n'as pas encore commencé "${video.titre}". Pense à la regarder pour préparer ton cours.`,
        link: `/watch/${video._id}`,
        relatedType: 'video',
        relatedId: video._id,
        dedupKey: `inactivity_video_${video._id}_${userId}_${weekKey}`,
      });
    }
  }
}

/* ─── Lanceur complet ────────────────────────────────────────────────── */
export async function runAllDeadlineChecks(io) {
  try {
    await checkQCMDeadlines(io);
    await checkVideoDeadlines(io);
    await checkProjectDeadlines(io);
    await checkPrositDeadlines(io);
    await checkInactivityReminders(io);
    console.log(`[Scheduler] Deadline checks completed at ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[Scheduler] error:', err.message);
  }
}

/* ─── Initialisation des tâches cron ─────────────────────────────────── */
export function startNotificationScheduler(io) {
  // Tous les jours à 08:00 (heure serveur)
  cron.schedule('0 8 * * *', () => {
    runAllDeadlineChecks(io);
  });

  // Un premier check 30s après démarrage (utile en dev)
  setTimeout(() => runAllDeadlineChecks(io), 30_000);

  console.log('[Scheduler] Notification scheduler started (daily at 08:00)');
}
