#!/usr/bin/env node
/**
 * cleanup-users-isil-l3.js — Nettoyage conservateur de la base utilisateurs.
 *
 * Actions appliquées (toutes idempotentes) :
 *   1. Migrer tous les étudiants en filière 'Informatique' (toutes variantes :
 *      'Informatique/L3 2024', 'Informatique/l3 2025-2026', etc.) vers
 *      ISIL/L3 (semestre=S6). Préserve points, badges, progress.
 *   2. Fixer Assil (sans semestre) → semestre=S6.
 *   3. Pour les modules en filière 'Informatique' (anciens) → désactiver
 *      isActive=false (ne pas supprimer pour préserver l'historique).
 *   4. Pour les 3 modules ISIL/L3 sans semestre (Cybersécurité,
 *      Développement Web Full-Stack, IA & ML — doublons des modules S6)
 *      → désactiver isActive=false.
 *   5. Profs sans promotion : laisser inchangés (peuvent posséder des cours
 *      légitimes — affichés dans le rapport pour décision manuelle).
 *
 * IMPORTANT : aucun User n'est supprimé. Aucune perte de données.
 *
 * Usage : node backend/scripts/cleanup-users-isil-l3.js (depuis fliplearn/)
 *         Ajouter --dry-run pour voir les changements sans les appliquer.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Course from '../models/Course.js';

const DRY_RUN = process.argv.includes('--dry-run');

(async () => {
  await connectDB();

  console.log('═══════════════════════════════════════════════════════');
  console.log(`NETTOYAGE ISIL L3 ${DRY_RUN ? '[DRY-RUN — aucune modif]' : '[APPLIED]'}`);
  console.log('═══════════════════════════════════════════════════════\n');

  let totalChanges = 0;

  // ─── 1. Migration étudiants 'Informatique' → ISIL/L3 ──────────────────
  console.log('[1] Migration étudiants Informatique* → ISIL/L3 ...');
  const oldStudents = await User.find({
    role: 'etudiant',
    filiere: { $regex: /^informatique$/i },
  });
  for (const s of oldStudents) {
    const before = `${s.filiere}/${s.promotion}/${s.semestre || '∅'}`;
    s.filiere = 'ISIL';
    s.promotion = 'L3';
    if (!s.semestre) s.semestre = 'S6';
    s.status = 'active';
    s.isActive = true;
    if (!DRY_RUN) await s.save();
    console.log(`  ${s.email}: ${before} → ISIL/L3/S6`);
    totalChanges++;
  }
  console.log(`  → ${oldStudents.length} étudiant(s) migré(s)\n`);

  // ─── 2. Fixer étudiants ISIL/L3 sans semestre ─────────────────────────
  console.log('[2] Fixer étudiants ISIL/L3 sans semestre ...');
  const noSemester = await User.find({
    role: 'etudiant',
    filiere: 'ISIL',
    promotion: 'L3',
    $or: [{ semestre: { $exists: false } }, { semestre: '' }, { semestre: null }],
  });
  for (const s of noSemester) {
    s.semestre = 'S6';
    if (!DRY_RUN) await s.save();
    console.log(`  ${s.email}: semestre=S6`);
    totalChanges++;
  }
  console.log(`  → ${noSemester.length} étudiant(s) fixé(s)\n`);

  // ─── 3. Désactiver modules Informatique/L3 (anciens, doublons ISIL) ──
  console.log('[3] Désactiver modules en filière Informatique* ...');
  const oldCourses = await Course.find({
    filiere: { $regex: /^informatique$/i },
    isActive: { $ne: false },
  });
  for (const c of oldCourses) {
    c.isActive = false;
    if (!DRY_RUN) await c.save();
    console.log(`  ${c.titre} [${c.filiere}/${c.promotion}] → désactivé`);
    totalChanges++;
  }
  console.log(`  → ${oldCourses.length} module(s) désactivé(s)\n`);

  // ─── 4. Désactiver modules ISIL/L3 sans semestre (doublons) ──────────
  console.log('[4] Désactiver modules ISIL/L3 sans semestre (doublons) ...');
  const dupCourses = await Course.find({
    filiere: 'ISIL',
    promotion: 'L3',
    $or: [{ semestre: { $exists: false } }, { semestre: '' }, { semestre: null }],
    isActive: { $ne: false },
  });
  for (const c of dupCourses) {
    c.isActive = false;
    if (!DRY_RUN) await c.save();
    console.log(`  ${c.titre} → désactivé (doublon, version S5/S6 existe déjà)`);
    totalChanges++;
  }
  console.log(`  → ${dupCourses.length} module(s) désactivé(s)\n`);

  // ─── 5. Profs sans promotion (rapport seulement, pas d'action) ──────
  console.log('[5] Profs sans promotion (RAPPORT — pas d\'action automatique)');
  const orphanProfs = await User.find({
    role: 'professeur',
    $or: [{ promotion: { $exists: false } }, { promotion: '' }, { promotion: null }],
  });
  for (const p of orphanProfs) {
    const courseCount = await Course.countDocuments({ professorId: p._id, isActive: { $ne: false } });
    console.log(`  ${p.email} [${p.filiere}/${p.promotion || '∅'}] — ${courseCount} cours actif(s)`);
  }
  console.log(`  → ${orphanProfs.length} prof(s) sans promotion (action manuelle suggérée)\n`);

  // ─── Récapitulatif final ─────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log(`RÉSUMÉ : ${totalChanges} modification(s) ${DRY_RUN ? 'simulée(s) (dry-run)' : 'appliquée(s)'}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // ─── État final ISIL/L3 après nettoyage ──────────────────────────────
  const profsL3 = await User.find({ role: 'professeur', filiere: 'ISIL', promotion: 'L3' })
    .select('email prenom nom').sort({ email: 1 });
  const studentsL3 = await User.find({ role: 'etudiant', filiere: 'ISIL', promotion: 'L3' })
    .select('email prenom nom semestre points').sort({ email: 1 });
  const coursesL3 = await Course.find({ filiere: 'ISIL', promotion: 'L3', isActive: { $ne: false } })
    .select('titre semestre professorId').sort({ semestre: 1, titre: 1 });

  console.log(`État final ISIL/L3 (actifs) : ${profsL3.length} profs · ${studentsL3.length} étudiants · ${coursesL3.length} modules`);
  console.log('\nProfs ISIL/L3 :');
  profsL3.forEach((p) => console.log(`  - ${p.prenom} ${p.nom} <${p.email}>`));
  console.log('\nÉtudiants ISIL/L3 :');
  studentsL3.forEach((s) => {
    console.log(`  - ${s.prenom} ${s.nom} <${s.email}> [${s.semestre || '∅'}, pts=${s.points}]`);
  });
  console.log('\nModules ISIL/L3 actifs :');
  coursesL3.forEach((c) => console.log(`  - [${c.semestre}] ${c.titre}`));

  await mongoose.disconnect();
})();
