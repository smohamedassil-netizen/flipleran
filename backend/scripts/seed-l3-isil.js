#!/usr/bin/env node
/**
 * seed-l3-isil.js — Insère en base les comptes et modules ISIL L3.
 *
 * Crée (idempotent — relançable sans risque de doublons) :
 *   - 3 professeurs ISIL L3 (Tarek, Sami, Yasmine), en plus d'Omar déjà seedé
 *   - 10 étudiants ISIL L3 (S6, cohorte courante 2025-2026)
 *   - 8 modules couvrant le programme L3 (4 en S5 + 4 en S6)
 *
 * Usage :
 *   node backend/scripts/seed-l3-isil.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import { seedL3Isil } from '../services/l3IsilSeed.js';

(async () => {
  try {
    await connectDB();
    console.log('[seed-l3-isil] connecté à MongoDB, lancement du seed…');
    const result = await seedL3Isil();
    console.log('[seed-l3-isil] terminé :');
    console.log('  Profs   :', result.summary.profsCreated, '/', result.summary.profsTotal, 'créés');
    console.log('  Étudiants :', result.summary.studentsCreated, '/', result.summary.studentsTotal, 'créés');
    console.log('  Modules :', result.summary.coursesCreated, '/', result.summary.coursesTotal, 'créés');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[seed-l3-isil] erreur :', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
})();
