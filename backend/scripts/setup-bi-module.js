/**
 * setup-bi-module.js — Crée le module de démo « Business Intelligence » (L3 ISIL,
 * prof Tarek) : cours + 3 chapitres (prêts à recevoir 3 vidéos uploadées) +
 * 1 cas pratique + 1 projet (assil déjà membre, évaluation par les pairs activée).
 * Contenu en français impeccable, contexte algérien.
 *
 * Idempotent (upsert par titre). NON destructif.
 *   Usage : node scripts/setup-bi-module.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const COURSE_TITLE = 'Business Intelligence';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db; const c = (n) => db.collection(n);

  const assil = await c('users').findOne({ email: 'assil.isil.l3@fliplearn.dz' });
  const tarek = await c('users').findOne({ email: 'tarek.isil.l3@fliplearn.dz' });
  // 2 camarades ISIL L3 (pour un vrai groupe + pairs)
  const peers = await c('users').find({ role: 'etudiant', filiere: 'ISIL', promotion: 'L3', _id: { $ne: assil._id } }).limit(2).toArray();
  const [p1, p2] = peers;

  /* 1) COURS (clone d'un cours valide pour garder le schéma) */
  const tpl = await c('courses').findOne({ titre: 'Génie Logiciel & UML' });
  let course = await c('courses').findOne({ titre: COURSE_TITLE });
  if (!course) {
    const doc = { ...tpl }; delete doc._id;
    Object.assign(doc, {
      titre: COURSE_TITLE,
      description: "Transformer les données de l'entreprise en décisions : entrepôts de données, processus ETL, indicateurs de performance (KPI) et tableaux de bord interactifs avec Power BI.",
      professorId: tarek._id, filiere: 'ISIL', promotion: 'L3', isActive: true,
      learningOutcomes: [], createdAt: new Date(), updatedAt: new Date(),
    });
    const ins = await c('courses').insertOne(doc);
    course = { _id: ins.insertedId, ...doc };
  }

  /* 2) 3 CHAPITRES (1 vidéo à uploader par chapitre) */
  const CH = [
    { order: 0, titre: 'Introduction à la Business Intelligence', description: "Définitions, enjeux et architecture d'une solution décisionnelle." },
    { order: 1, titre: 'Entrepôts de données et processus ETL',   description: "Modélisation en étoile, puis extraction, transformation et chargement des données." },
    { order: 2, titre: 'Tableaux de bord et visualisation avec Power BI', description: "Construire des rapports interactifs et des indicateurs clairs pour la décision." },
  ];
  const chTpl = await c('chapters').findOne({ courseId: tpl._id });
  for (const ch of CH) {
    const exists = await c('chapters').findOne({ courseId: course._id, order: ch.order });
    if (!exists) {
      const doc = { ...chTpl }; delete doc._id;
      Object.assign(doc, { courseId: course._id, titre: ch.titre, description: ch.description, order: ch.order, unlockedByDefault: ch.order === 0, completionThreshold: 80, createdAt: new Date(), updatedAt: new Date() });
      await c('chapters').insertOne(doc);
    }
  }

  /* 3) CAS PRATIQUE (clone d'un valide → re-thème BI) */
  const CP_TITLE = "Concevoir le tableau de bord décisionnel d'une chaîne de supermarchés algérienne";
  let cp = await c('prosits').findOne({ titre: CP_TITLE });
  if (!cp) {
    const src = await c('prosits').findOne({ groupMembers: { $exists: true, $ne: [] } });
    const doc = { ...src }; delete doc._id;
    Object.assign(doc, {
      titre: CP_TITLE,
      description: "Étude de cas BI : piloter la performance d'une enseigne de grande distribution.",
      contexte: "Une chaîne de supermarchés algérienne (type Numidis/Ardis) veut piloter ses ventes, ses stocks et la performance de ses magasins en temps réel.",
      problematique: "Quels indicateurs clés (KPI) suivre, et comment les présenter dans un tableau de bord clair pour la direction ?",
      enonce: "La direction d'une chaîne de supermarchés vous mandate comme consultants Business Intelligence. Vous devez : 1) identifier les indicateurs clés de performance (chiffre d'affaires par magasin, panier moyen, rotation des stocks, taux de rupture) ; 2) proposer un modèle de données en étoile pour l'entrepôt ; 3) concevoir la maquette d'un tableau de bord Power BI destiné à la direction ; 4) justifier vos choix de visualisation. Livrable : un rapport de conception + une maquette de tableau de bord.",
      motsCles: ['Business Intelligence', 'KPI', 'entrepôt de données', 'ETL', 'Power BI', 'tableau de bord', 'grande distribution'],
      courseId: course._id, chapterIds: [], filiere: 'ISIL', promotion: 'L3',
      statut: 'travail_individuel', status: 'recherche',
      groupMembers: [
        { studentId: assil._id, role: 'animateur' },
        ...(p1 ? [{ studentId: p1._id, role: 'scribe' }] : []),
        ...(p2 ? [{ studentId: p2._id, role: 'membre' }] : []),
      ],
      groupes: p1 && p2 ? [{ nom: 'Groupe 1', membres: [ { userId: assil._id }, { userId: p1._id }, { userId: p2._id } ] }] : [],
      livrables: [], notes: [], bilanDocument: null, cadrageDocument: null,
      peerAssessmentEnabled: true,
      createdBy: tarek._id, createdAt: new Date(), updatedAt: new Date(),
    });
    await c('prosits').insertOne(doc);
  }

  /* 4) PROJET (clone d'un valide → re-thème BI) */
  const PJ_TITLE = "Mettre en place une solution Business Intelligence pour une entreprise algérienne";
  let pj = await c('projects').findOne({ titre: PJ_TITLE });
  if (!pj) {
    const src = await c('projects').findOne({ status: 'actif', groupes: { $exists: true, $ne: [] } });
    const doc = { ...src }; delete doc._id;
    Object.assign(doc, {
      titre: PJ_TITLE,
      description: "Concevoir et déployer une chaîne décisionnelle complète : collecte (ETL) → entrepôt de données → tableaux de bord Power BI, pour une entreprise algérienne.",
      enonce: "En groupe, mettez en place une solution Business Intelligence de bout en bout pour une entreprise algérienne de votre choix : modélisez l'entrepôt de données, construisez le flux ETL, puis livrez un tableau de bord Power BI répondant à 3 questions métier. Livrables : modèle de données, flux ETL documenté, tableau de bord interactif, et soutenance de 15 minutes.",
      motsCles: ['BI', 'ETL', 'datawarehouse', 'Power BI', 'KPI', 'décisionnel'],
      courseId: course._id, status: 'actif',
      groupes: [{ nom: 'Groupe 1', membres: [
        { userId: assil._id, role: 'chef_projet' },
        ...(p1 ? [{ userId: p1._id, role: 'analyste' }] : []),
        ...(p2 ? [{ userId: p2._id, role: 'scribe' }] : []),
      ] }],
      livrables: [], evaluations: [], activity: [], ideas: [],
      createdBy: tarek._id, createdAt: new Date(), updatedAt: new Date(),
    });
    await c('projects').insertOne(doc);
  }

  console.log('✓ Module Business Intelligence prêt');
  console.log(`  Cours    : "${COURSE_TITLE}" (prof Tarek, ISIL L3) id=${course._id}`);
  console.log(`  Chapitres: 3 (prêts pour tes 3 vidéos)`);
  console.log(`  Cas prat.: "${CP_TITLE.slice(0,50)}…" (assil animateur, pairs ON)`);
  console.log(`  Projet   : "${PJ_TITLE.slice(0,50)}…" (assil chef de projet)`);
  console.log(`  Camarades de groupe : ${p1?.prenom||'?'} , ${p2?.prenom||'?'}`);
  await mongoose.disconnect();
  console.log('\nDONE');
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
