#!/usr/bin/env node
/**
 * migrate.js — Runner de migrations versionnées.
 *
 * Scanne backend/migrations/ et exécute en ordre alphabétique tous les
 * fichiers `NNN-*.js` qui n'ont pas encore été appliqués sur l'environnement
 * cible (collection `_migrations` en base).
 *
 * Convention attendue dans chaque fichier :
 *   export const id          = 'NNN-description';
 *   export const description = '…';
 *   export async function up()   { … }   // obligatoire
 *   export async function down() { … }   // optionnel
 *
 * Usage :
 *   npm run migrate                # applique toutes les migrations en attente
 *   npm run migrate -- --dry-run    # liste sans toucher la base
 *
 * Idempotence : une migration déjà enregistrée dans la collection
 * `_migrations` n'est jamais rejouée. Le runner s'arrête à la première
 * erreur (les migrations suivantes ne sont pas tentées).
 */

import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'migrations');

const dryRun = process.argv.includes('--dry-run');

const migrationSchema = new mongoose.Schema({
  id:        { type: String, required: true, unique: true },
  appliedAt: { type: Date,   default: Date.now },
}, { collection: '_migrations' });

const MigrationRecord = mongoose.models.MigrationRecord
  || mongoose.model('MigrationRecord', migrationSchema);

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => /^\d{3}-.+\.js$/.test(f))
    .sort();
}

async function main() {
  await connectDB();

  const files = listMigrationFiles();
  if (files.length === 0) {
    console.log('[migrate] Aucun fichier de migration trouvé dans backend/migrations/.');
    return;
  }

  const applied = new Set(
    (await MigrationRecord.find({}).select('id').lean()).map(m => m.id)
  );

  const pending = [];
  for (const file of files) {
    const url    = pathToFileURL(path.join(MIGRATIONS_DIR, file)).href;
    const module = await import(url);
    const id = module.id || file.replace(/\.js$/, '');
    if (applied.has(id)) continue;
    pending.push({ file, id, module });
  }

  if (pending.length === 0) {
    console.log(`[migrate] Toutes les migrations sont à jour (${files.length} fichier(s) déjà appliqué(s)).`);
    return;
  }

  console.log(`[migrate] ${pending.length} migration(s) en attente :`);
  for (const p of pending) {
    console.log(`  - ${p.id}${p.module.description ? ' — ' + p.module.description : ''}`);
  }

  if (dryRun) {
    console.log('[migrate] --dry-run : aucune modification appliquée.');
    return;
  }

  for (const p of pending) {
    if (typeof p.module.up !== 'function') {
      throw new Error(`Migration ${p.id} : fonction up() manquante.`);
    }
    console.log(`[migrate] ▶ ${p.id}…`);
    await p.module.up();
    await MigrationRecord.create({ id: p.id });
    console.log(`[migrate] ✓ ${p.id} appliquée et enregistrée.`);
  }

  console.log(`[migrate] Terminé : ${pending.length} migration(s) appliquée(s).`);
}

main()
  .then(() => mongoose.connection.close())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('[migrate] ✗ Erreur :', err.message);
    try { await mongoose.connection.close(); } catch { /* ignore */ }
    process.exit(1);
  });
