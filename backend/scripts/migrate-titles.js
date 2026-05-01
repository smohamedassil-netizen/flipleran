/**
 * migrate-titles.js
 *
 * Script ad-hoc pour nettoyer les titres parasites dans la DB sans wiper :
 *   - Retire le préfixe "[COLLABORATIF] " des projets (le type 'groupe' + les
 *     modules attachés suffisent à signaler la nature collaborative).
 *   - Retire le préfixe "TEST E2E — " des prosits laissés par d'anciens runs
 *     de tests automatisés.
 *
 * Usage :
 *   cd backend && node scripts/migrate-titles.js
 *   cd backend && node scripts/migrate-titles.js --dry-run   # ne modifie rien, montre ce qui serait fait
 *
 * Idempotent — relance possible sans effet si déjà migré.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Project from '../models/Project.js';
import Prosit from '../models/Prosit.js';

const DRY = process.argv.includes('--dry-run');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI manquant dans backend/.env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`✅ Connecté à MongoDB${DRY ? ' (dry-run)' : ''}`);

  // 1) Projets avec préfixe "[COLLABORATIF] "
  // Note : on utilise updateOne() (pas .save()) pour éviter la validation full
  // du document — certains projets seedés ont des champs legacy qui ne valident
  // plus contre le schéma actuel (ex: type: 'projet' obsolète). On ne touche
  // QUE le champ titre, c'est safe.
  const collabProjects = await Project.find({ titre: /^\[COLLABORATIF\]\s*/ }).select('_id titre').lean();
  console.log(`\n📁 Projets [COLLABORATIF] trouvés : ${collabProjects.length}`);
  for (const p of collabProjects) {
    const newTitre = p.titre.replace(/^\[COLLABORATIF\]\s*/, '');
    console.log(`   ${p._id}  "${p.titre}"  →  "${newTitre}"`);
    if (!DRY) {
      await Project.updateOne({ _id: p._id }, { $set: { titre: newTitre } });
    }
  }

  // 2) Prosits avec préfixe "TEST E2E — " (ou variantes)
  const testProsits = await Prosit.find({ titre: /^TEST E2E\s*[—\-]\s*/ }).select('_id titre').lean();
  console.log(`\n📝 Prosits "TEST E2E" trouvés : ${testProsits.length}`);
  for (const p of testProsits) {
    const newTitre = p.titre.replace(/^TEST E2E\s*[—\-]\s*/, '');
    console.log(`   ${p._id}  "${p.titre}"  →  "${newTitre}"`);
    if (!DRY) {
      await Prosit.updateOne({ _id: p._id }, { $set: { titre: newTitre } });
    }
  }

  console.log(DRY
    ? '\n⚠️  Dry-run — aucune modification appliquée. Relance sans --dry-run pour persister.'
    : '\n✅ Migration terminée.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erreur :', err);
  process.exit(1);
});
