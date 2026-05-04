#!/usr/bin/env node
/**
 * check-l3-isil.js — Vérifie que les comptes et modules ISIL L3 sont en base.
 * Usage : node backend/scripts/check-l3-isil.js (depuis backend/)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Course from '../models/Course.js';

(async () => {
  await connectDB();
  const profs    = await User.find({ role: 'professeur', filiere: 'ISIL', promotion: 'L3' }).select('email prenom nom');
  const students = await User.find({ role: 'etudiant',  filiere: 'ISIL', promotion: 'L3' }).select('email prenom nom semestre');
  const courses  = await Course.find({ filiere: 'ISIL', promotion: 'L3' }).select('titre semestre');
  console.log(`Profs ISIL L3 (${profs.length}) :`);
  profs.forEach(p => console.log(`  - ${p.prenom} ${p.nom} <${p.email}>`));
  console.log(`\nÉtudiants ISIL L3 (${students.length}) :`);
  students.forEach(s => console.log(`  - ${s.prenom} ${s.nom} <${s.email}> [${s.semestre || '?'}]`));
  console.log(`\nModules ISIL L3 (${courses.length}) :`);
  courses.forEach(c => console.log(`  - [${c.semestre || '?'}] ${c.titre}`));
  await mongoose.disconnect();
})();
