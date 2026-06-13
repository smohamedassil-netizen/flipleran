/**
 * seed-demo-transcripts.js — Sème des transcriptions VideoAnalysis "completed"
 * sur les vidéos clés de démo L3 ISIL, pour débloquer (via Groq, sans OpenAI) :
 *   - l'AutoPrep IA prof (génère QCM/objectifs/flashcards/questions in-vidéo)
 *   - "Pose une question sur la vidéo" (RAG sur transcript) côté étudiant
 *
 * Idempotent : met à jour la VideoAnalysis de la vidéo cible (upsert),
 * ne touche à rien d'autre. NON destructif.
 *
 * Usage :  node scripts/seed-demo-transcripts.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';

// Transcription réaliste (cours UML) pour le module vedette Génie Logiciel & UML.
const UML_TRANSCRIPT = `
Bienvenue dans ce cours d'introduction au langage UML, le Unified Modeling Language.
UML est un langage de modélisation graphique normalisé par l'OMG. Il ne s'agit pas
d'un langage de programmation, mais d'une notation visuelle qui permet de représenter
la structure et le comportement d'un système logiciel, indépendamment du langage
d'implémentation. UML est utilisé dans la phase de conception du génie logiciel.

On distingue deux grandes familles de diagrammes : les diagrammes structurels et les
diagrammes comportementaux. Parmi les diagrammes structurels, le plus important est le
diagramme de classes. Une classe représente un concept du domaine : elle possède un nom,
des attributs et des méthodes. Les classes sont reliées par des associations, des
agrégations, des compositions et des relations d'héritage. La multiplicité, notée par
exemple 1, 0..1 ou 1..*, précise combien d'instances participent à une association.

Parmi les diagrammes comportementaux, le diagramme de cas d'utilisation décrit les
fonctionnalités offertes par le système du point de vue des acteurs. Un acteur est un
rôle joué par un utilisateur ou un système externe. Les cas d'utilisation peuvent être
liés par des relations include et extend. Le diagramme de séquence, lui, montre les
interactions entre objets au cours du temps : les messages échangés sont représentés
par des flèches, et la ligne de vie de chaque objet descend verticalement.

Le diagramme d'activité modélise un flux de travail ou un algorithme, avec des nœuds
de décision et des barres de synchronisation pour le parallélisme. Enfin, le diagramme
d'état-transition décrit le cycle de vie d'un objet à travers ses différents états.

En résumé, UML fournit une boîte à outils complète pour analyser, concevoir et
documenter un système avant de le coder. Bien utilisé, il améliore la communication
au sein de l'équipe et réduit les erreurs de conception. Dans les prochains chapitres,
nous détaillerons chaque diagramme avec des exemples concrets issus de projets réels.
`.trim().replace(/\s+/g, ' ');

const UML_ANALYSIS = {
  summary: `## Qu'est-ce qu'UML ?
UML (Unified Modeling Language) est un **langage de modélisation graphique** normalisé par l'OMG, utilisé dans la **phase de conception** du génie logiciel. Ce n'est pas un langage de programmation mais une **notation visuelle** indépendante du langage d'implémentation.

## Les familles de diagrammes
On distingue les **diagrammes structurels** (dont le **diagramme de classes** : attributs, méthodes, associations, héritage, multiplicité) et les **diagrammes comportementaux** (cas d'utilisation, séquence, activité, état-transition).

## Intérêt
Bien utilisé, UML **améliore la communication** dans l'équipe et **réduit les erreurs de conception** en modélisant le système avant de le coder.`,
  mindMap: {
    label: 'UML',
    children: [
      { label: 'Diagrammes structurels', children: [
        { label: 'Diagramme de classes', children: [] },
        { label: 'Associations & multiplicité', children: [] },
        { label: 'Héritage', children: [] },
      ]},
      { label: 'Diagrammes comportementaux', children: [
        { label: 'Cas d\'utilisation (acteurs, include/extend)', children: [] },
        { label: 'Séquence (messages, lignes de vie)', children: [] },
        { label: 'Activité & état-transition', children: [] },
      ]},
      { label: 'Rôle dans le génie logiciel', children: [
        { label: 'Phase de conception', children: [] },
        { label: 'Communication d\'équipe', children: [] },
      ]},
    ],
  },
  keyConcepts: [
    { term: 'UML', definition: 'Langage de modélisation graphique normalisé par l\'OMG pour concevoir des systèmes logiciels.' },
    { term: 'Diagramme de classes', definition: 'Diagramme structurel décrivant les classes, leurs attributs, méthodes et relations.' },
    { term: 'Cas d\'utilisation', definition: 'Diagramme comportemental décrivant les fonctionnalités du système vues par les acteurs.' },
    { term: 'Acteur', definition: 'Rôle joué par un utilisateur ou un système externe interagissant avec le système.' },
    { term: 'Diagramme de séquence', definition: 'Diagramme montrant les interactions entre objets et l\'ordre des messages dans le temps.' },
    { term: 'Multiplicité', definition: 'Notation (1, 0..1, 1..*) précisant le nombre d\'instances dans une association.' },
  ],
};

// Cible : module vedette = Génie Logiciel & UML, vidéo d'intro.
const TARGETS = [
  { courseTitre: 'Génie Logiciel & UML', videoTitreRegex: /introduction au langage uml|uml/i, transcript: UML_TRANSCRIPT, analysis: UML_ANALYSIS },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  for (const t of TARGETS) {
    const course = await db.collection('courses').findOne({ titre: t.courseTitre });
    if (!course) { console.log(`✗ Cours introuvable: ${t.courseTitre}`); continue; }

    const video = await db.collection('videos').findOne({ courseId: course._id, titre: t.videoTitreRegex })
      || await db.collection('videos').findOne({ courseId: course._id });
    if (!video) { console.log(`✗ Aucune vidéo dans: ${t.courseTitre}`); continue; }

    const now = new Date();
    const res = await db.collection('videoanalyses').updateOne(
      { videoId: video._id },
      { $set: {
          videoId: video._id,
          status: 'completed',
          transcript: t.transcript,
          language: 'fr',
          summary: t.analysis.summary,
          mindMap: t.analysis.mindMap,
          keyConcepts: t.analysis.keyConcepts,
          error: '',
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now } },
      { upsert: true }
    );
    console.log(`✓ Transcript "${video.titre}" (cours ${t.courseTitre}) — ${res.upsertedCount ? 'créé' : 'mis à jour'} (${t.transcript.length} car.)`);
  }

  await mongoose.disconnect();
  console.log('\nDONE');
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
