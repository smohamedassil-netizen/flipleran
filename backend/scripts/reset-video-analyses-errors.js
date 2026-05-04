#!/usr/bin/env node
/**
 * reset-video-analyses-errors.js
 * Reset les VideoAnalysis en status='error' pour qu'elles soient relancées
 * la prochaine fois qu'on appelle analyzeVideo (la fonction skip déjà les
 * 'completed' mais doit relancer les 'error' — on les remet à 'pending').
 *
 * À lancer après un fix de pipeline (ex: ajout du support YouTube).
 *
 * Usage : depuis backend/ → node scripts/reset-video-analyses-errors.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import VideoAnalysis from '../models/VideoAnalysis.js';

(async () => {
  await connectDB();
  const errored = await VideoAnalysis.find({ status: 'error' }).select('videoId error');
  console.log(`${errored.length} analyses en erreur trouvées :`);
  errored.forEach((a) => console.log(`  - ${a.videoId} : ${a.error?.slice(0, 80) || '(no msg)'}`));
  if (errored.length > 0) {
    const r = await VideoAnalysis.updateMany(
      { status: 'error' },
      { $set: { status: 'pending', error: '' } }
    );
    console.log(`\n${r.modifiedCount} analyses remises à 'pending'.`);
    console.log("Prochaine ouverture de la vidéo côté prof → relance auto.");
  }
  await mongoose.disconnect();
})();
