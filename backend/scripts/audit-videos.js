#!/usr/bin/env node
/**
 * audit-videos.js
 *
 * Audite les vidéos potentiellement corrompues par migrateBrokenVideos().
 * Critères de détection :
 *   - URL contient "sample", "BigBuckBunny", ou "ElephantsDream" (insensible à la casse)
 *   - provider === "youtube" mais URL se termine par .mp4
 *
 * Usage :
 *   node backend/scripts/audit-videos.js            # rapport console + CSV
 *   node backend/scripts/audit-videos.js --fix       # + marque corruptedByMigration: true
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Import du modèle Video (avec le champ corruptedByMigration) ──
import Video from '../models/Video.js';

const FIX_MODE = process.argv.includes('--fix');

// ── Patterns suspects ──
const SUSPECT_PATTERNS = /sample|bigbuckbunny|elephantsdream/i;

function isSuspect(video) {
  if (SUSPECT_PATTERNS.test(video.url)) return true;
  if (video.provider === 'youtube' && video.url.endsWith('.mp4')) return true;
  return false;
}

async function main() {
  // Connexion directe à MongoDB (pas besoin de tout le serveur Express)
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI manquant. Crée un fichier .env ou exporte la variable.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(`MongoDB connecté : ${mongoose.connection.host}`);

  // ── Récupérer toutes les vidéos ──
  const allVideos = await Video.find({}).lean();
  console.log(`Total vidéos en base : ${allVideos.length}`);

  const suspects = allVideos.filter(isSuspect);
  console.log(`Vidéos suspectes détectées : ${suspects.length}`);

  if (suspects.length === 0) {
    console.log('Aucune vidéo corrompue trouvée.');
    await mongoose.disconnect();
    return;
  }

  // ── Affichage console ──
  console.log('\n── Vidéos suspectes ──');
  for (const v of suspects) {
    console.log(`  [${v._id}] "${v.titre}" | provider=${v.provider} | url=${v.url}`);
  }

  // ── Export CSV ──
  const csvHeader = '_id,titre,courseId,provider,url,createdAt,createdBy';
  const csvRows = suspects.map((v) => {
    const titre = `"${(v.titre || '').replace(/"/g, '""')}"`;
    const url = `"${(v.url || '').replace(/"/g, '""')}"`;
    return [v._id, titre, v.courseId, v.provider, url, v.createdAt?.toISOString() ?? '', v.createdBy].join(',');
  });

  const csvContent = [csvHeader, ...csvRows].join('\n');
  const csvPath = path.join(__dirname, 'audit-videos-report.csv');
  fs.writeFileSync(csvPath, csvContent, 'utf-8');
  console.log(`\nRapport CSV écrit : ${csvPath}`);

  // ── Mode --fix ──
  if (FIX_MODE) {
    console.log('\n── Mode --fix activé : marquage des vidéos corrompues ──');
    const ids = suspects.map((v) => v._id);
    const result = await Video.updateMany(
      { _id: { $in: ids } },
      { $set: { corruptedByMigration: true } }
    );
    console.log(`${result.modifiedCount} vidéo(s) marquée(s) corruptedByMigration: true`);
  } else {
    console.log('\nPour marquer ces vidéos, relancez avec : node backend/scripts/audit-videos.js --fix');
  }

  await mongoose.disconnect();
  console.log('Déconnecté de MongoDB.');
}

main().catch((err) => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
