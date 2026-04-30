#!/usr/bin/env node
/**
 * seed-default-path.js — Crée un LearningPath par défaut pour chaque cours
 * qui n'en possède pas encore.
 *
 * Stratégie de génération :
 *   1. Pour chaque cours sans LearningPath, on liste ses vidéos triées par
 *      `order` ascendant (tie-break par `createdAt`).
 *   2. Pour chaque vidéo, on insère une étape `video`. Si un QCM y est lié,
 *      on insère immédiatement après une étape `qcm` (Vidéo → QCM est le
 *      pattern minimal de classe inversée).
 *   3. Le parcours est laissé en **brouillon** (`publishedAt = null`) afin
 *      que le prof puisse l'ajuster avant de le rendre visible aux étudiants.
 *
 * Idempotence :
 *   - L'unicité `(courseId)` est garantie par l'index Mongo.
 *   - On skip explicitement chaque cours qui a déjà un path (même brouillon).
 *   - On peut donc relancer le script à volonté sans dupliquer ni écraser.
 *
 * @description Ce script matérialise la **scénarisation pédagogique**
 * (Lebrun, 2007) : transformer un dépôt de vidéos en parcours articulé
 * Vidéo → QCM. Sans cette structuration, la classe inversée se réduit
 * à un sac de ressources et perd l'essentiel de sa valeur didactique.
 *
 * @see Lebrun, M. (2007). *Théories et méthodes pédagogiques pour
 *      enseigner et apprendre*. De Boeck.
 *
 * Usage :
 *   node backend/scripts/seed-default-path.js
 *   node backend/scripts/seed-default-path.js --dry-run        (preview, no writes)
 *   node backend/scripts/seed-default-path.js --course=<id>    (un seul cours)
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Course from '../models/Course.js';
import Video from '../models/Video.js';
import QCM from '../models/QCM.js';
import LearningPath from '../models/LearningPath.js';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const courseFilter = args.find((a) => a.startsWith('--course='))?.split('=')[1];

async function buildStepsForCourse(courseId) {
  const videos = await Video.find({ courseId })
    .sort({ order: 1, createdAt: 1 })
    .select('_id titre order duration')
    .lean();

  if (videos.length === 0) return [];

  const videoIds = videos.map((v) => v._id);
  const qcms = await QCM.find({ videoId: { $in: videoIds } })
    .select('_id videoId titre')
    .lean();
  const qcmByVideo = new Map(qcms.map((q) => [q.videoId.toString(), q]));

  const steps = [];
  let order = 0;
  for (const v of videos) {
    steps.push({
      order: order++,
      type: 'video',
      resourceId: v._id,
      resourceModel: 'Video',
      title: '',
      isRequired: true,
      unlockCriteria: { previousCompleted: true, minScore: 50, minWatchPercent: 70 },
      estimatedMinutes: v.duration ? Math.ceil(v.duration / 60) : 0,
      customMessage: '',
    });

    const qcm = qcmByVideo.get(v._id.toString());
    if (qcm) {
      steps.push({
        order: order++,
        type: 'qcm',
        resourceId: qcm._id,
        resourceModel: 'QCM',
        title: '',
        isRequired: true,
        unlockCriteria: { previousCompleted: true, minScore: 50, minWatchPercent: 70 },
        estimatedMinutes: 5,
        customMessage: '',
      });
    }
  }
  return steps;
}

async function main() {
  console.log('[seed-default-path] Connexion à la base…');
  await connectDB();

  const filter = {};
  if (courseFilter) filter._id = courseFilter;
  const courses = await Course.find(filter).select('_id titre professorId').lean();

  console.log(`[seed-default-path] ${courses.length} cours à examiner${DRY_RUN ? ' (DRY RUN)' : ''}.`);

  let created = 0;
  let skipped = 0;
  let empty = 0;

  for (const course of courses) {
    const existing = await LearningPath.exists({ courseId: course._id });
    if (existing) {
      skipped++;
      continue;
    }

    const steps = await buildStepsForCourse(course._id);
    if (steps.length === 0) {
      empty++;
      console.log(`  · ${course.titre}: aucune vidéo → skip`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  + ${course.titre}: ${steps.length} étape(s) seraient créées`);
      created++;
      continue;
    }

    await LearningPath.create({
      courseId: course._id,
      title: 'Parcours d\'apprentissage',
      description: 'Parcours par défaut généré automatiquement. Vous pouvez le réorganiser avant publication.',
      steps,
      createdBy: course.professorId,
      publishedAt: null,
    });
    created++;
    console.log(`  + ${course.titre}: parcours créé (${steps.length} étapes, brouillon)`);
  }

  console.log('\n[seed-default-path] Récapitulatif :');
  console.log(`  · Créés    : ${created}`);
  console.log(`  · Existants déjà : ${skipped} (idempotence)`);
  console.log(`  · Sans vidéo : ${empty}`);

  await mongoose.connection.close();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed-default-path] Erreur :', err);
    process.exit(1);
  });
