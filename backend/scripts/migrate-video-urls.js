/**
 * migrate-video-urls.js
 *
 * Remplace les URLs vidéos cassées (commondatastorage.googleapis.com → 403)
 * par tes URLs Cloudinary uploadées manuellement.
 *
 * Usage :
 *   1. Édite la mapping VIDEO_URL_MAP ci-dessous (videoId → nouvelle URL Cloudinary)
 *   2. cd backend && node scripts/migrate-video-urls.js --dry-run
 *   3. Si le dry-run est OK : node scripts/migrate-video-urls.js
 *
 * Pour récupérer les videoId actuels :
 *   db.videos.find({}, { _id: 1, titre: 1, url: 1 })
 * ou via une query au backend (voir audit-videos.js dans le même dossier).
 *
 * Idempotent.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Video from '../models/Video.js';

const DRY = process.argv.includes('--dry-run');

// ─── À REMPLIR ─────────────────────────────────────────────────────────────
// Format : 'videoId Mongo' : 'https://res.cloudinary.com/<cloud>/video/upload/<file>.mp4'
// Tu peux aussi mettre une YouTube URL et provider='youtube' si tu préfères.
const VIDEO_URL_MAP = {
  // '69e3f7a78a3c5af824994886': 'https://res.cloudinary.com/<TON_CLOUD>/video/upload/v1234567/cyber-bases.mp4',
  // '69e3f7a78a3c5af824994887': 'https://res.cloudinary.com/<TON_CLOUD>/video/upload/v1234568/cyber-phishing.mp4',
};
// ───────────────────────────────────────────────────────────────────────────

async function main() {
  const entries = Object.entries(VIDEO_URL_MAP);
  if (entries.length === 0) {
    console.error('❌ VIDEO_URL_MAP est vide — édite le fichier scripts/migrate-video-urls.js et ajoute tes mappings.');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI manquant dans backend/.env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`✅ Connecté à MongoDB${DRY ? ' (dry-run)' : ''}`);

  console.log(`\n🎬 ${entries.length} vidéo(s) à migrer :`);
  let okCount = 0;
  let missingCount = 0;
  for (const [videoId, newUrl] of entries) {
    const v = await Video.findById(videoId);
    if (!v) {
      console.log(`   ⚠️  ${videoId}  NOT FOUND (peut-être supprimée)`);
      missingCount++;
      continue;
    }
    console.log(`   ${videoId}  "${v.titre}"`);
    console.log(`     ancienne : ${v.url}`);
    console.log(`     nouvelle : ${newUrl}`);
    if (!DRY) {
      v.url = newUrl;
      // Si le nouveau format est différent (ex: youtube), tu peux aussi forcer provider
      // v.provider = 'youtube'; v.youtubeId = '<id>';
      await v.save();
    }
    okCount++;
  }

  console.log(DRY
    ? `\n⚠️  Dry-run — ${okCount} migration(s) prévue(s), ${missingCount} introuvable(s). Relance sans --dry-run pour persister.`
    : `\n✅ ${okCount} vidéo(s) migrée(s), ${missingCount} introuvable(s).`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erreur :', err);
  process.exit(1);
});
