#!/usr/bin/env node
/**
 * migrate-project-roles.js — Aligne les rôles des projets `mono` et `groupe`
 * sur les 3 rôles simplifiés du Cas pratique (refonte 2026-05-09).
 *
 * Mapping (uniquement pour type ∈ {mono, groupe}) :
 *   chef_projet → animateur
 *   scribe      → scribe
 *   animateur   → animateur
 *   chrono      → membre
 *   analyste    → membre
 *
 * ⚠ Les projets type=`pfe` ne sont PAS modifiés (gardent les 5 rôles originaux,
 * la complexité d'un PFE justifie la spécialisation).
 *
 * Idempotent : skippe les projets dont les rôles sont déjà tous dans
 * [animateur, scribe, membre].
 *
 * Usage : node backend/scripts/migrate-project-roles.js (depuis fliplearn/backend/)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Project from '../models/Project.js';

const ROLE_MAP = {
  chef_projet: 'animateur',
  scribe:      'scribe',
  animateur:   'animateur',
  chrono:      'membre',
  analyste:    'membre',
  membre:      'membre',
};

const SIMPLE_ROLES = new Set(['animateur', 'scribe', 'membre']);

(async () => {
  await connectDB();
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Migration rôles projets → 3 rôles simplifiés (mono + groupe)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const projects = await Project.find({ type: { $in: ['mono', 'groupe'] } });
  console.log(`Trouvé ${projects.length} projets mono+groupe à examiner\n`);

  const stats = { migrated: 0, skipped: 0, errors: 0, totalRolesChanged: 0 };

  for (const p of projects) {
    try {
      let changedAny = false;
      let changedCount = 0;

      for (const g of p.groupes || []) {
        for (const m of g.membres || []) {
          if (!SIMPLE_ROLES.has(m.role)) {
            const newRole = ROLE_MAP[m.role] || 'membre';
            m.role = newRole;
            changedAny = true;
            changedCount++;
          }
        }
      }

      if (!changedAny) {
        stats.skipped++;
        console.log(`  ⊘ Skip "${p.titre}" (déjà aligné)`);
        continue;
      }

      // markModified pour forcer la sauvegarde des sous-docs imbriqués
      p.markModified('groupes');
      await p.save();
      stats.migrated++;
      stats.totalRolesChanged += changedCount;
      console.log(`  ✓ "${p.titre}" → ${changedCount} rôle(s) remappé(s)`);
    } catch (err) {
      stats.errors++;
      console.error(`  ✗ Erreur sur "${p.titre || p._id}" :`, err.message);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`✓ Migration terminée :`);
  console.log(`    Migrés       : ${stats.migrated}`);
  console.log(`    Skippés      : ${stats.skipped}`);
  console.log(`    Rôles changés: ${stats.totalRolesChanged}`);
  console.log(`    Erreurs      : ${stats.errors}`);
  console.log('═══════════════════════════════════════════════════════════');

  await mongoose.disconnect();
  process.exit(stats.errors > 0 ? 1 : 0);
})().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
