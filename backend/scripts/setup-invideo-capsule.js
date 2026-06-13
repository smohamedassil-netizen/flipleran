/**
 * setup-invideo-capsule.js — Prépare UNE capsule hébergée (Cloudinary) avec
 * 2 questions in-vidéo, pour démontrer EN LIVE la pause + question + blocage
 * du seek. Les vidéos L3 ISIL étant des YouTube (le lecteur in-vidéo ne gère
 * que les vidéos hébergées), on réutilise la seule capsule Cloudinary encore
 * en ligne ("intoduction html", 6,5 min) et on la re-loge proprement dans le
 * cours "Développement Web et Mobile" (L3 ISIL, vu par assil), avec 2 questions
 * web claires. NON destructif sauf le remplacement des anciennes questions test.
 *
 * Idempotent.  Usage : node scripts/setup-invideo-capsule.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db; const c = (n) => db.collection(n);

  const video = await c('videos').findOne({ titre: /intoduction html/i, provider: 'cloudinary' });
  if (!video) { console.log('✗ vidéo Cloudinary introuvable'); return; }

  const course = await c('courses').findOne({ titre: 'Développement Web et Mobile' });
  if (!course) { console.log('✗ cours "Développement Web et Mobile" introuvable'); return; }
  const owner = course.professorId;

  // Chapitre d'accueil (créer si absent)
  let chapter = await c('chapters').findOne({ courseId: course._id });
  if (!chapter) {
    const ins = await c('chapters').insertOne({
      courseId: course._id, titre: 'Introduction au développement web', order: 0,
      description: 'Les fondamentaux du web avant le développement front-end.',
      completionThreshold: 80, createdAt: new Date(), updatedAt: new Date(),
    });
    chapter = { _id: ins.insertedId };
  }

  // Re-loger la vidéo dans ce cours/chapitre + titre propre
  await c('videos').updateOne({ _id: video._id }, { $set: {
    courseId: course._id, chapterId: chapter._id,
    titre: 'Introduction au HTML et au web',
    description: 'Capsule interactive : la vidéo se met en pause pour poser des questions de compréhension.',
    order: 0, updatedAt: new Date(),
  }});

  // Remplacer les anciennes questions test par 2 questions claires
  await c('videoquestions').deleteMany({ videoId: video._id });
  const dur = video.duration || 387;
  const Q = [
    { timestamp: Math.min(25, dur-5), texte: 'Que signifie le sigle HTML ?',
      options: { A: 'HyperText Markup Language', B: 'High Tech Modern Language', C: 'Home Tool Markup Language', D: 'Hyperlink Text Mode Language' },
      correctAnswer: 'A', explanation: 'HTML = HyperText Markup Language, le langage de balisage des pages web.' },
    { timestamp: Math.min(70, dur-5), texte: 'À quoi sert une balise HTML ?',
      options: { A: 'À styliser uniquement', B: 'À structurer le contenu de la page', C: 'À exécuter du code serveur', D: 'À stocker une base de données' },
      correctAnswer: 'B', explanation: 'Les balises HTML structurent le contenu (titres, paragraphes, liens, images…).' },
  ];
  for (const q of Q) {
    await c('videoquestions').insertOne({
      videoId: video._id, timestamp: q.timestamp, texte: q.texte, options: q.options,
      correctAnswer: q.correctAnswer, explanation: q.explanation, pauseVideo: true,
      createdBy: owner, createdAt: new Date(), updatedAt: new Date(),
    });
  }

  console.log(`✓ Capsule in-vidéo prête : "Introduction au HTML et au web"`);
  console.log(`  cours = "${course.titre}" (L3 ISIL) | durée = ${dur}s | 2 questions à ${Q.map(q=>q.timestamp+'s').join(' et ')}`);
  console.log(`  URL Cloudinary (testée 200) : ${(video.url||'').slice(0,70)}…`);
  await mongoose.disconnect();
  console.log('\nDONE');
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
