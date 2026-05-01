/**
 * seed-enrollments.js
 *
 * Crée des Progress vides pour chaque (étudiant, cours-de-sa-filière-promotion)
 * afin que les compteurs prof "X étudiants inscrits" soient corrects.
 *
 * Sans ça, le dashboard prof affiche "0 étudiants inscrits" tant qu'aucun
 * étudiant n'a encore commencé une vidéo (la "vraie" inscription est dérivée
 * de l'existence d'un document Progress).
 *
 * Usage :
 *   cd backend && node scripts/seed-enrollments.js --dry-run
 *   cd backend && node scripts/seed-enrollments.js
 *
 * Idempotent (Progress a un index unique sur {userId, courseId}).
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Progress from '../models/Progress.js';

const DRY = process.argv.includes('--dry-run');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI manquant dans backend/.env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`✅ Connecté à MongoDB${DRY ? ' (dry-run)' : ''}`);

  const students = await User.find({ role: 'etudiant' }).select('_id prenom nom filiere promotion').lean();
  const courses = await Course.find({}).select('_id titre filiere promotion').lean();

  console.log(`\n👥 ${students.length} étudiants · 📚 ${courses.length} cours`);

  let created = 0;
  let alreadyExists = 0;

  for (const stu of students) {
    // Cours qui correspondent à la filière + promotion de l'étudiant
    const matching = courses.filter(c => c.filiere === stu.filiere && c.promotion === stu.promotion);
    for (const c of matching) {
      const existing = await Progress.findOne({ userId: stu._id, courseId: c._id }).lean();
      if (existing) {
        alreadyExists++;
        continue;
      }
      console.log(`   ➕ ${stu.prenom} ${stu.nom} (${stu.filiere}/${stu.promotion}) → ${c.titre}`);
      if (!DRY) {
        await Progress.create({
          userId: stu._id,
          courseId: c._id,
          videosCompleted: [],
          qcmScores: [],
        });
      }
      created++;
    }
  }

  console.log(DRY
    ? `\n⚠️  Dry-run — ${created} inscription(s) à créer, ${alreadyExists} déjà existante(s).`
    : `\n✅ ${created} inscription(s) créée(s), ${alreadyExists} déjà existante(s).`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erreur :', err);
  process.exit(1);
});
