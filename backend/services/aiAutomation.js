/**
 * Service d'automatisation IA — orchestration en arrière-plan.
 *
 * 3 automatisations :
 *   1. autoPredictAfterQcm  — appelé après chaque QCM soumis
 *   2. scheduleAutoTraining — cron hebdomadaire (dimanche 3h)
 *   3. notifyTeacherOnRiskEscalation — alerte prof quand un étudiant change de niveau
 */

import cron from 'node-cron';
import Course from '../models/Course.js';
import Progress from '../models/Progress.js';
import User from '../models/User.js';
import { aiIsReachable, aiPredictForStudent, aiTrain } from './aiService.js';
import { pushNotification } from './notificationService.js';

/* Ordre de gravité des niveaux IA (plus grand = plus grave) */
const RISK_ORDER = { faible: 0, modéré: 1, élevé: 2, critique: 3 };

function isWorse(newLevel, oldLevel) {
  if (!newLevel) return false;
  if (!oldLevel) return RISK_ORDER[newLevel] >= RISK_ORDER['modéré'];
  return RISK_ORDER[newLevel] > RISK_ORDER[oldLevel];
}

/* ───────────────────────────────────────────────────────────────────────
 * 1. Auto-prédiction après un QCM soumis
 * ─────────────────────────────────────────────────────────────────────── */
/**
 * Appelée en fire-and-forget depuis qcmController.submitQCM.
 * - Demande au microservice Python une prédiction pour (user, course).
 * - Persiste le résultat dans Progress.
 * - Si le niveau empire, envoie une notification au professeur du cours.
 *
 * Ne throw JAMAIS — l'expérience utilisateur ne doit pas être impactée
 * si le service IA est indisponible.
 */
export async function autoPredictAfterQcm({ userId, courseId, io = null }) {
  if (!userId || !courseId) return;

  try {
    if (!(await aiIsReachable())) return;

    const prediction = await aiPredictForStudent(String(userId), String(courseId));
    if (!prediction) return;

    const progress = await Progress.findOne({ userId, courseId });
    const oldLevel = progress?.aiRiskLevel || null;
    const newLevel = prediction.dropout_risk_level;

    await Progress.findOneAndUpdate(
      { userId, courseId },
      {
        $set: {
          aiPredictedScore:     prediction.predicted_score ?? null,
          aiDropoutProbability: prediction.dropout_probability ?? null,
          aiRiskLevel:          newLevel,
          aiRiskUpdatedAt:      new Date(),
        },
      },
      { upsert: true }
    );

    // Alerte au prof seulement si le niveau se dégrade
    if (isWorse(newLevel, oldLevel)) {
      await notifyTeacherOnRiskEscalation({ userId, courseId, newLevel, oldLevel, io });
    }
  } catch (err) {
    console.warn(`[aiAutomation] autoPredictAfterQcm: ${err.message}`);
  }
}

/* ───────────────────────────────────────────────────────────────────────
 * 2. Notification au professeur quand le risque d'un étudiant augmente
 * ─────────────────────────────────────────────────────────────────────── */
export async function notifyTeacherOnRiskEscalation({ userId, courseId, newLevel, oldLevel, io }) {
  try {
    const course = await Course.findById(courseId).select('titre professorId').lean();
    if (!course?.professorId) return;

    const student = await User.findById(userId).select('nom prenom email').lean();
    const studentName = student
      ? `${student.prenom || ''} ${student.nom || ''}`.trim() || student.email
      : 'Un étudiant';

    const priorityByLevel = {
      'critique': 'urgent',
      'élevé':    'high',
      'modéré':   'normal',
    };

    await pushNotification(io, {
      userId: course.professorId,
      type: 'ai_risk_escalation',
      title: `🚨 Risque de décrochage détecté`,
      message: `${studentName} est passé(e) en risque ${newLevel} sur le cours « ${course.titre} »${oldLevel ? ` (auparavant ${oldLevel})` : ''}. L'IA recommande un suivi.`,
      link: `/professor/ai`,
      priority: priorityByLevel[newLevel] || 'normal',
      relatedType: 'course',
      relatedId: courseId,
      // Pas de dedupKey → on veut TOUJOURS notifier quand ça empire
    });
  } catch (err) {
    console.warn(`[aiAutomation] notifyTeacherOnRiskEscalation: ${err.message}`);
  }
}

/* ───────────────────────────────────────────────────────────────────────
 * 3. Ré-entraînement hebdomadaire automatique des modèles
 * ─────────────────────────────────────────────────────────────────────── */
/**
 * Crée une tâche cron qui ré-entraîne les modèles TF chaque dimanche à 03:00.
 * L'intérêt : au fil des semaines, les modèles apprennent sur de nouvelles
 * données et deviennent plus précis sans intervention humaine.
 */
export function scheduleAutoTraining() {
  // Cron expression : minute heure jour-du-mois mois jour-de-la-semaine
  // "0 3 * * 0" = tous les dimanches à 3h du matin
  cron.schedule('0 3 * * 0', async () => {
    console.log('[ai-cron] Ré-entraînement hebdomadaire des modèles IA...');
    try {
      if (!(await aiIsReachable())) {
        console.warn('[ai-cron] Service IA injoignable — skip.');
        return;
      }
      const result = await aiTrain({ rebuildDataset: true });
      console.log('[ai-cron] Entraînement terminé :', {
        mae:    result?.success_model?.mae,
        r2:     result?.success_model?.r2,
        auc:    result?.dropout_model?.roc_auc,
        f1:     result?.dropout_model?.f1,
      });
    } catch (err) {
      console.error('[ai-cron] Échec du ré-entraînement :', err.message);
    }
  });

  console.log('[Scheduler] AI auto-training scheduled (Sundays 03:00)');
}
