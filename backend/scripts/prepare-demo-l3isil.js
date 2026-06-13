/**
 * prepare-demo-l3isil.js — Met la base dans l'état PARFAIT pour la démo
 * soutenance L3 ISIL (module vedette : Génie Logiciel & UML, étudiant assil).
 *
 * État cible pour assil sur Génie Logiciel & UML (6 chap / 16 vidéos) :
 *   - CH0,1,2,3 : 100% (capsules vues + QCM ≥ 88%)
 *   - CH4 : 2/3 capsules + 2/3 QCM (le 3e item = action LIVE pendant la démo)
 *   - CH5 : verrouillé (CH4 incomplet)
 *   => 12/16 capsules + 12/16 QCM = 75% (Préparation "en cours", Application/
 *      Production VERROUILLÉES). En finissant le dernier item de CH4 EN DIRECT :
 *      13/16 = 81% → Préparation ✅ → Application se débloque, ET CH4 complété
 *      → CH5 se débloque. Double cadenas qui s'ouvre.
 *   - Corrige aussi le QCM CH0 (assil à 0% → 88%).
 *   - Garantit scope='video' sur les QCM (requis par progressService).
 *   - Ajoute assil à un cas pratique ISIL/L3 (peer activé) → démontrable.
 *
 * Idempotent. NON destructif (aucune suppression).
 *   Usage : node scripts/prepare-demo-l3isil.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const SCORE = 88;
const COURSE = 'Génie Logiciel & UML';
// Chapitres entièrement complétés + nb de vidéos (ordre) à compléter dans CH4.
const FULL_CHAPTER_ORDERS = [0, 1, 2, 3];
const PARTIAL_CHAPTER_ORDER = 4;     // CH4 : on complète 2 vidéos sur 3
const PARTIAL_KEEP = 2;              // nb de vidéos complétées dans CH4

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const c = (n) => db.collection(n);

  const assil = await c('users').findOne({ email: 'assil.isil.l3@fliplearn.dz' });
  const course = await c('courses').findOne({ titre: COURSE });
  const chapters = await c('chapters').find({ courseId: course._id }).sort({ order: 1 }).toArray();
  const uid = assil._id;

  let vDone = 0, qDone = 0;

  for (const ch of chapters) {
    const isFull = FULL_CHAPTER_ORDERS.includes(ch.order);
    const isPartial = ch.order === PARTIAL_CHAPTER_ORDER;
    if (!isFull && !isPartial) continue; // CH5 : on ne touche pas (reste verrouillé)

    const vids = await c('videos').find({ chapterId: ch._id }).sort({ order: 1 }).toArray();
    const targetVids = isFull ? vids : vids.slice(0, PARTIAL_KEEP);

    for (const v of targetVids) {
      // 1) marquer la vidéo "completed" dans watchedBy (read-modify-write)
      const wb = (v.watchedBy || []).filter((w) => String(w.userId) !== String(uid));
      wb.push({ userId: uid, completed: true, watchedAt: new Date() });
      await c('videos').updateOne({ _id: v._id }, { $set: { watchedBy: wb } });
      vDone++;

      // 2) QCM de cette vidéo : scope='video' + résultat assil ≥ 88
      const qcms = await c('qcms').find({ videoId: v._id }).toArray();
      for (const q of qcms) {
        const res = (q.resultats || []).filter((r) => String(r.userId) !== String(uid));
        res.push({ userId: uid, score: SCORE, completedAt: new Date(), answers: [] });
        await c('qcms').updateOne(
          { _id: q._id },
          { $set: { resultats: res, scope: q.scope || 'video' } }
        );
        qDone++;
      }
    }
  }

  // 3) Cas pratique ISIL/L3 démontrable avec assil dedans + peer activé
  const cp = await c('prosits').findOne({ courseId: course._id, titre: /diagrammes de séquence pour app mobile/i })
          || await c('prosits').findOne({ courseId: course._id });
  let cpMsg = 'aucun cas pratique trouvé';
  if (cp) {
    const members = (cp.groupMembers || []).filter((m) => String(m.userId) !== String(uid));
    members.push({ userId: uid, role: 'membre' });
    await c('prosits').updateOne(
      { _id: cp._id },
      { $set: {
          filiere: 'ISIL', promotion: 'L3',
          groupMembers: members,
          peerAssessmentEnabled: true,
        } }
    );
    cpMsg = `"${cp.titre}" → assil ajouté (membre), filiere ISIL/L3, peer ON`;
  }

  console.log(`Module : ${COURSE}`);
  console.log(`Capsules marquées vues : ${vDone}  | QCM scorés ${SCORE}% : ${qDone}  (cible 12/16)`);
  console.log(`Cas pratique : ${cpMsg}`);
  await mongoose.disconnect();
  console.log('\nDONE');
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
