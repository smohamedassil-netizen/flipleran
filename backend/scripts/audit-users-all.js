#!/usr/bin/env node
/**
 * audit-users-all.js — Audit exhaustif de tous les utilisateurs et anomalies.
 *
 * Lecture seule. Affiche :
 *   - Tous les utilisateurs groupés par filière × promotion × rôle
 *   - Les anomalies : pas de filiere, pas de promo, status != 'active', isActive false
 *   - Les comptes potentiellement orphelins (créés hors seed)
 *   - Les modules sans semestre
 *
 * Usage : node backend/scripts/audit-users-all.js (depuis fliplearn/)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Course from '../models/Course.js';

// Liste des emails seedés (référence pour détecter les orphelins)
const SEEDED_EMAILS = new Set([
  // Admin
  'admin@fliplearn.dz',
  // Profs (1 par filière × promo)
  'karim.isil.l1@fliplearn.dz',
  'leila.isil.l2@fliplearn.dz',
  'omar.isil.l3@fliplearn.dz',
  'sara.manage.l1@fliplearn.dz',
  'riad.manage.l2@fliplearn.dz',
  'fatima.manage.l3@fliplearn.dz',
  'hakim.finance.l1@fliplearn.dz',
  'sonia.finance.l2@fliplearn.dz',
  'nabil.finance.l3@fliplearn.dz',
  // 3 profs additionnels ISIL L3
  'tarek.isil.l3@fliplearn.dz',
  'sami.isil.l3@fliplearn.dz',
  'yasmine.isil.l3@fliplearn.dz',
  // Étudiants test (1 par filière × promo)
  'amine.isil.l1@fliplearn.dz',
  'ines.isil.l2@fliplearn.dz',
  'assil.isil.l3@fliplearn.dz',
  'yasmine.manage.l1@fliplearn.dz',
  'mehdi.manage.l2@fliplearn.dz',
  'nadia.manage.l3@fliplearn.dz',
  'sofiane.finance.l1@fliplearn.dz',
  'amira.finance.l2@fliplearn.dz',
  'walid.finance.l3@fliplearn.dz',
  // 10 étudiants ISIL L3
  'yacine.boudjedra.l3@fliplearn.dz',
  'lina.benkhelifa.l3@fliplearn.dz',
  'mohamed.larbi.l3@fliplearn.dz',
  'sarah.bouzid.l3@fliplearn.dz',
  'adel.bouhabel.l3@fliplearn.dz',
  'imane.rahmoun.l3@fliplearn.dz',
  'karim.saidi.l3@fliplearn.dz',
  'hanae.mokhtari.l3@fliplearn.dz',
  'anis.bouchama.l3@fliplearn.dz',
  'selma.djebbar.l3@fliplearn.dz',
]);

(async () => {
  await connectDB();

  const allUsers = await User.find({})
    .select('email prenom nom role filiere promotion semestre status isActive points createdAt')
    .sort({ role: 1, filiere: 1, promotion: 1, email: 1 })
    .lean();

  const allCourses = await Course.find({})
    .select('titre filiere promotion semestre professorId isActive')
    .sort({ filiere: 1, promotion: 1, semestre: 1, titre: 1 })
    .lean();

  console.log('═══════════════════════════════════════════════════════');
  console.log(`AUDIT COMPLET — ${allUsers.length} utilisateurs · ${allCourses.length} modules`);
  console.log('═══════════════════════════════════════════════════════\n');

  // ─── 1. Récap par rôle ────────────────────────────────────────────────
  const byRole = allUsers.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});
  console.log('[Récap par rôle]');
  Object.entries(byRole).forEach(([k, v]) => console.log(`  ${k.padEnd(15)} : ${v}`));

  // ─── 2. Récap filière × promo × rôle ──────────────────────────────────
  console.log('\n[Récap filière × promo × rôle]');
  const grid = {};
  for (const u of allUsers) {
    const f = u.filiere || '∅';
    const p = u.promotion || '∅';
    const key = `${f} / ${p}`;
    if (!grid[key]) grid[key] = { etudiant: 0, professeur: 0, admin: 0 };
    grid[key][u.role] = (grid[key][u.role] || 0) + 1;
  }
  Object.entries(grid).forEach(([key, counts]) => {
    const parts = [];
    if (counts.etudiant)   parts.push(`${counts.etudiant} étud.`);
    if (counts.professeur) parts.push(`${counts.professeur} prof`);
    if (counts.admin)      parts.push(`${counts.admin} admin`);
    console.log(`  ${key.padEnd(30)} : ${parts.join(' · ')}`);
  });

  // ─── 3. Détail ISIL L3 (focus user) ───────────────────────────────────
  console.log('\n[Détail ISIL L3]');
  const isilL3 = allUsers.filter((u) => u.filiere === 'ISIL' && u.promotion === 'L3');
  const profsL3 = isilL3.filter((u) => u.role === 'professeur');
  const studentsL3 = isilL3.filter((u) => u.role === 'etudiant');
  console.log(`  ${profsL3.length} profs / ${studentsL3.length} étudiants`);
  console.log('  Profs :');
  profsL3.forEach((p) => {
    console.log(`    - ${p.prenom} ${p.nom} <${p.email}> [status=${p.status}, isActive=${p.isActive}]`);
  });
  console.log('  Étudiants :');
  studentsL3.forEach((s) => {
    console.log(`    - ${s.prenom} ${s.nom} <${s.email}> [sem=${s.semestre || '∅'}, status=${s.status}, isActive=${s.isActive}, pts=${s.points}]`);
  });

  // ─── 4. Anomalies utilisateurs ────────────────────────────────────────
  console.log('\n[Anomalies utilisateurs]');
  const anomalies = [];
  for (const u of allUsers) {
    const issues = [];
    if (!u.role) issues.push('role manquant');
    if (u.role !== 'admin' && !u.filiere) issues.push('filière manquante');
    if (u.role !== 'admin' && !u.promotion) issues.push('promotion manquante');
    if (u.status && u.status !== 'active' && u.status !== 'pending') issues.push(`status=${u.status}`);
    if (u.isActive === false) issues.push('isActive=false');
    if (issues.length) anomalies.push({ user: u, issues });
  }
  if (anomalies.length === 0) {
    console.log('  ✅ Aucune anomalie utilisateur');
  } else {
    anomalies.forEach(({ user, issues }) => {
      console.log(`  ⚠️  ${user.email} (${user.role}): ${issues.join(', ')}`);
    });
  }

  // ─── 5. Comptes orphelins (hors seed) ─────────────────────────────────
  console.log('\n[Comptes hors seed officiel]');
  const orphans = allUsers.filter((u) => !SEEDED_EMAILS.has(u.email) && u.role !== 'admin');
  if (orphans.length === 0) {
    console.log('  ✅ Tous les comptes correspondent au seed');
  } else {
    console.log(`  ${orphans.length} compte(s) hors seed (créés via inscription publique ou ancien seed) :`);
    orphans.forEach((u) => {
      const created = u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : '?';
      console.log(`    - ${u.email} | ${u.role} | ${u.filiere}/${u.promotion} | status=${u.status} | créé ${created}`);
    });
  }

  // ─── 6. Modules sans semestre (anomalies) ─────────────────────────────
  console.log('\n[Modules sans semestre]');
  const noSemester = allCourses.filter((c) => !c.semestre);
  if (noSemester.length === 0) {
    console.log('  ✅ Tous les modules ont un semestre');
  } else {
    console.log(`  ⚠️  ${noSemester.length} module(s) sans semestre :`);
    noSemester.forEach((c) => {
      console.log(`    - ${c.titre} [${c.filiere}/${c.promotion}]`);
    });
  }

  // ─── 7. Modules ISIL L3 (focus) ───────────────────────────────────────
  console.log('\n[Modules ISIL L3]');
  const coursesL3 = allCourses.filter((c) => c.filiere === 'ISIL' && c.promotion === 'L3');
  console.log(`  ${coursesL3.length} module(s) :`);
  coursesL3.forEach((c) => {
    console.log(`    - [${c.semestre || '∅'}] ${c.titre} (prof=${c.professorId})`);
  });

  console.log('\n═══════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
})();
