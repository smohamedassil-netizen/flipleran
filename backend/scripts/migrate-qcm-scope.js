#!/usr/bin/env node
/**
 * migrate-qcm-scope.js — Migration des QCM existants vers le modèle 3 scopes.
 *
 * Actions :
 *   1. Drop l'ancien index unique `videoId_1` (s'il existe) — incompatible
 *      avec le nouveau modèle qui autorise videoId=null pour scope chapter/module.
 *   2. Set scope='video' sur tous les QCM existants (rétro-compat).
 *   3. Vérifie les comptes après migration.
 *
 * Idempotent : sûr à relancer plusieurs fois.
 *
 * Usage : node backend/scripts/migrate-qcm-scope.js (depuis fliplearn/)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import QCM from '../models/QCM.js';

(async () => {
  await connectDB();
  console.log('═══════════════════════════════════════════════════════');
  console.log('Migration QCM → modèle 3 scopes (video/chapter/module)');
  console.log('═══════════════════════════════════════════════════════\n');

  // ─── 1. Drop ancien index unique videoId_1 ───────────────────────────
  try {
    const indexes = await QCM.collection.indexes();
    const oldIdx = indexes.find((i) => i.name === 'videoId_1');
    if (oldIdx) {
      console.log('[1] Drop ancien index "videoId_1" (unique=true sans partial)…');
      await QCM.collection.dropIndex('videoId_1');
      console.log('    ✅ Drop OK');
    } else {
      console.log('[1] Ancien index "videoId_1" déjà absent — OK');
    }
  } catch (err) {
    console.error('    ⚠️  Erreur drop index :', err.message);
    console.error('    Si "ns not found" ou "index not found", c\'est OK.');
  }

  // ─── 2. Set scope='video' sur tous les QCM existants ─────────────────
  const noScope = await QCM.countDocuments({ scope: { $exists: false } });
  console.log(`\n[2] ${noScope} QCM sans scope — set scope='video'…`);
  if (noScope > 0) {
    const r = await QCM.updateMany({ scope: { $exists: false } }, { $set: { scope: 'video' } });
    console.log(`    ✅ ${r.modifiedCount} QCM mis à jour`);
  } else {
    console.log('    Tous les QCM ont déjà un scope — OK');
  }

  // ─── 3. Récap par scope ───────────────────────────────────────────────
  console.log('\n[3] Récap par scope :');
  for (const scope of ['video', 'chapter', 'module']) {
    const count = await QCM.countDocuments({ scope });
    console.log(`    ${scope.padEnd(10)} : ${count}`);
  }

  // ─── 4. Recréer les indexes (Mongoose le fait au démarrage normalement) ─
  console.log('\n[4] Synchronisation des indexes…');
  await QCM.syncIndexes();
  const finalIdx = await QCM.collection.indexes();
  console.log(`    ${finalIdx.length} index(es) actifs :`);
  finalIdx.forEach((i) => {
    const partial = i.partialFilterExpression
      ? ` partial=${JSON.stringify(i.partialFilterExpression)}`
      : '';
    const unique = i.unique ? ' UNIQUE' : '';
    console.log(`      - ${i.name}${unique}${partial}`);
  });

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('Migration terminée.');
  console.log('═══════════════════════════════════════════════════════\n');
  await mongoose.disconnect();
})();
