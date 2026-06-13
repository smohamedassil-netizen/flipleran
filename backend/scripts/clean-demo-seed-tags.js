/**
 * clean-demo-seed-tags.js — Retire les étiquettes « [DEMO_SEED] » des contenus
 * visibles (titres de QCM, vidéos, chapitres, cours, decks, prosits) laissées
 * par les seeds de démonstration.
 *
 * Idempotent et NON destructif : ne supprime aucun document, retire seulement
 * le token « [DEMO_SEED] » du texte et nettoie les espaces résiduels.
 *
 * Usage :  node scripts/clean-demo-seed-tags.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const TAG = /\s*\[DEMO_SEED\]\s*/g;
const clean = (s) => (typeof s === 'string' && s.includes('[DEMO_SEED]'))
  ? s.replace(TAG, ' ').replace(/\s{2,}/g, ' ').trim()
  : null; // null = pas de changement

const TARGETS = {
  qcms:     ['titre'],
  videos:   ['titre', 'description'],
  chapters: ['titre', 'description'],
  courses:  ['titre', 'description'],
  decks:    ['title', 'description'],
  prosits:  ['titre', 'enonce'],
  projects: ['titre', 'description'],
};

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  let totalDocs = 0;

  for (const [col, fields] of Object.entries(TARGETS)) {
    const collection = db.collection(col);
    const docs = await collection.find({
      $or: fields.map((f) => ({ [f]: /\[DEMO_SEED\]/ })),
    }).toArray();

    let changed = 0;
    for (const doc of docs) {
      const set = {};
      for (const f of fields) {
        const c = clean(doc[f]);
        if (c !== null && c !== doc[f]) set[f] = c;
      }
      if (Object.keys(set).length) {
        await collection.updateOne({ _id: doc._id }, { $set: set });
        changed++;
      }
    }
    console.log(`${col.padEnd(10)} : ${changed} document(s) nettoyé(s)`);
    totalDocs += changed;
  }

  console.log(`\nTOTAL : ${totalDocs} document(s) nettoyé(s).`);
  await mongoose.disconnect();
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
