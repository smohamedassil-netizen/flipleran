/**
 * FlipLearn — Script de données de démonstration
 * Usage : node backend/seed.js
 *
 * Crée :
 *   - 1 admin, 2 professeurs, 10 étudiants
 *   - 2 cours avec vidéos et QCMs fictifs
 *   - Messages de chat pré-remplis
 *   - Badges système
 */

import "dotenv/config";
import mongoose from "mongoose";
import User from "./models/User.js";
import Course from "./models/Course.js";
import Video from "./models/Video.js";
import QCM from "./models/QCM.js";
import Message from "./models/Message.js";
import Progress from "./models/Progress.js";
import { seedBadges } from "./services/points.js";

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('❌ MONGODB_URI manquant dans le .env');
  console.error('   Crée un fichier backend/.env avec MONGODB_URI=mongodb+srv://...');
  process.exit(1);
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const log = (msg) => console.log(`  ✓ ${msg}`);
const warn = (msg) => console.warn(`  ⚠ ${msg}`);

async function clearCollections() {
  await Promise.all([
    User.deleteMany({}),
    Course.deleteMany({}),
    Video.deleteMany({}),
    QCM.deleteMany({}),
    Message.deleteMany({}),
    Progress.deleteMany({}),
  ]);
  log("Collections nettoyées");
}

/* ─── Connexion ──────────────────────────────────────────────────────────── */
async function connect() {
  await mongoose.connect(MONGO_URI);
  log(`Connecté à MongoDB : ${MONGO_URI}`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   DONNÉES
═══════════════════════════════════════════════════════════════════════════ */

/* ── Utilisateurs ────────────────────────────────────────────────────────── */
async function createUsers() {
  const usersData = [
    /* Admin */
    {
      nom: "Administrateur",
      prenom: "Super",
      email: "admin@fliplearn.dz",
      password: "admin1234",
      role: "admin",
      filiere: "",
      promotion: "",
    },

    /* Professeurs */
    {
      nom: "Bensalem",
      prenom: "Karim",
      email: "karim.prof@fliplearn.dz",
      password: "prof1234",
      role: "professeur",
      filiere: "Informatique",
      promotion: "",
    },
    {
      nom: "Hamidi",
      prenom: "Nadia",
      email: "nadia.prof@fliplearn.dz",
      password: "prof1234",
      role: "professeur",
      filiere: "Mathématiques",
      promotion: "",
    },

    /* Étudiants */
    {
      nom: "Meziane",
      prenom: "Amine",
      email: "amine@fliplearn.dz",
      password: "etudiant123",
      role: "etudiant",
      filiere: "Informatique",
      promotion: "L3 2025/2026",
      points: 320,
    },
    {
      nom: "Boudiaf",
      prenom: "Sara",
      email: "sara@fliplearn.dz",
      password: "etudiant123",
      role: "etudiant",
      filiere: "Informatique",
      promotion: "L3 2025/2026",
      points: 290,
    },
    {
      nom: "Khelifi",
      prenom: "Yacine",
      email: "yacine@fliplearn.dz",
      password: "etudiant123",
      role: "etudiant",
      filiere: "Informatique",
      promotion: "L3 2025/2026",
      points: 260,
    },
    {
      nom: "Rahmani",
      prenom: "Lina",
      email: "lina@fliplearn.dz",
      password: "etudiant123",
      role: "etudiant",
      filiere: "Informatique",
      promotion: "L3 2025/2026",
      points: 210,
    },
    {
      nom: "Ferhat",
      prenom: "Ilyes",
      email: "ilyes@fliplearn.dz",
      password: "etudiant123",
      role: "etudiant",
      filiere: "Informatique",
      promotion: "L3 2025/2026",
      points: 180,
    },
    {
      nom: "Benali",
      prenom: "Amira",
      email: "amira@fliplearn.dz",
      password: "etudiant123",
      role: "etudiant",
      filiere: "Informatique",
      promotion: "L3 2025/2026",
      points: 150,
    },
    {
      nom: "Slimani",
      prenom: "Riad",
      email: "riad@fliplearn.dz",
      password: "etudiant123",
      role: "etudiant",
      filiere: "Informatique",
      promotion: "L3 2025/2026",
      points: 120,
    },
    {
      nom: "Touati",
      prenom: "Nesrine",
      email: "nesrine@fliplearn.dz",
      password: "etudiant123",
      role: "etudiant",
      filiere: "Informatique",
      promotion: "L3 2025/2026",
      points: 90,
    },
    {
      nom: "Dridi",
      prenom: "Wassim",
      email: "wassim@fliplearn.dz",
      password: "etudiant123",
      role: "etudiant",
      filiere: "Informatique",
      promotion: "L3 2025/2026",
      points: 60,
    },
    {
      nom: "Aissaoui",
      prenom: "Chaima",
      email: "chaima@fliplearn.dz",
      password: "etudiant123",
      role: "etudiant",
      filiere: "Informatique",
      promotion: "L3 2025/2026",
      points: 30,
    },
  ];

  // Pour le seed on utilise create() sur chaque user (pre-save hook hash le password).
  // On force status='active' car le seed ne passe pas par le workflow d'approval.
  await User.deleteMany({});
  const created = [];
  for (const u of usersData) {
    const user = new User({ ...u, status: 'active', isActive: true });
    await user.save();
    created.push(user);
  }

  log(`${created.length} utilisateurs créés`);
  return {
    admin: created[0],
    prof1: created[1],
    prof2: created[2],
    etudiants: created.slice(3),
  };
}

/* ── Cours ───────────────────────────────────────────────────────────────── */
async function createCourses(prof1, prof2) {
  const courses = await Course.insertMany([
    {
      titre: "Algorithmique et Structures de Données",
      description:
        "Introduction aux algorithmes fondamentaux, complexité et structures de données (listes, piles, arbres, graphes).",
      professorId: prof1._id,
      filiere: "Informatique",
      promotion: "L3 2025/2026",
      isActive: true,
    },
    {
      titre: "Bases de Données Relationnelles",
      description:
        "Modélisation entité-relation, SQL, normalisation et transactions. MySQL et PostgreSQL.",
      professorId: prof2._id,
      filiere: "Informatique",
      promotion: "L3 2025/2026",
      isActive: true,
    },
  ]);
  log(`${courses.length} cours créés`);
  return courses;
}

/* ── Vidéos (fictives — URLs de démo YouTube embed) ─────────────────────── */
async function createVideos(courses, prof1, prof2) {
  const DEMO_URL =
    "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4";

  const videos = await Video.insertMany([
    /* Cours 1 */
    {
      titre: "Introduction aux algorithmes",
      description: "Définition, caractéristiques et exemples simples.",
      url: DEMO_URL,
      publicId: "demo/algo_1",
      thumbnailUrl: "",
      duration: 720,
      order: 1,
      courseId: courses[0]._id,
      createdBy: prof1._id,
      watchedBy: [],
    },
    {
      titre: "Complexité algorithmique — O(n), O(log n)",
      description: "Analyse de la complexité temporelle et spatiale.",
      url: DEMO_URL,
      publicId: "demo/algo_2",
      thumbnailUrl: "",
      duration: 840,
      order: 2,
      courseId: courses[0]._id,
      createdBy: prof1._id,
      watchedBy: [],
    },
    {
      titre: "Tri par fusion et tri rapide",
      description:
        "Implémentation et comparaison des algorithmes de tri efficaces.",
      url: DEMO_URL,
      publicId: "demo/algo_3",
      thumbnailUrl: "",
      duration: 960,
      order: 3,
      courseId: courses[0]._id,
      createdBy: prof1._id,
      watchedBy: [],
    },
    /* Cours 2 */
    {
      titre: "Modèle Entité-Relation",
      description:
        "Conception d'un schéma ER, entités, attributs et associations.",
      url: DEMO_URL,
      publicId: "demo/bdd_1",
      thumbnailUrl: "",
      duration: 780,
      order: 1,
      courseId: courses[1]._id,
      createdBy: prof2._id,
      watchedBy: [],
    },
    {
      titre: "SQL — SELECT, JOIN, GROUP BY",
      description:
        "Les requêtes SQL fondamentales avec des exemples pratiques.",
      url: DEMO_URL,
      publicId: "demo/bdd_2",
      thumbnailUrl: "",
      duration: 900,
      order: 2,
      courseId: courses[1]._id,
      createdBy: prof2._id,
      watchedBy: [],
    },
  ]);
  log(`${videos.length} vidéos créées`);
  return videos;
}

/* ── QCMs ────────────────────────────────────────────────────────────────── */
async function createQCMs(videos) {
  const qcms = await QCM.insertMany([
    {
      videoId: videos[0]._id,
      titre: "QCM — Introduction aux algorithmes",
      pointsPerQuestion: 10,
      timerSeconds: 25,
      questions: [
        {
          texte: "Un algorithme est :",
          options: {
            A: "Un programme informatique",
            B: "Une suite finie d'instructions",
            C: "Un langage de programmation",
            D: "Un processeur",
          },
          correctAnswer: "B",
          explanation:
            "Un algorithme est une suite finie et non ambiguë d'instructions permettant de résoudre un problème.",
        },
        {
          texte: "Quelle propriété N'est PAS requise pour un algorithme ?",
          options: {
            A: "Finitude",
            B: "Efficacité",
            C: "Non-ambiguïté",
            D: "Rapidité absolue",
          },
          correctAnswer: "D",
          explanation:
            "Un algorithme doit être fini, non ambigu et avoir des entrées/sorties définies, mais il n'a pas besoin d'être le plus rapide possible.",
        },
        {
          texte: "La recherche dichotomique fonctionne sur :",
          options: {
            A: "N'importe quel tableau",
            B: "Un tableau trié",
            C: "Un tableau de chaînes",
            D: "Un arbre binaire",
          },
          correctAnswer: "B",
          explanation:
            "La recherche dichotomique (binaire) nécessite que le tableau soit préalablement trié.",
        },
      ],
      resultats: [],
    },
    {
      videoId: videos[1]._id,
      titre: "QCM — Complexité algorithmique",
      pointsPerQuestion: 10,
      timerSeconds: 30,
      questions: [
        {
          texte: "La complexité du tri par sélection est :",
          options: { A: "O(n)", B: "O(n log n)", C: "O(n²)", D: "O(log n)" },
          correctAnswer: "C",
          explanation:
            "Le tri par sélection effectue n*(n-1)/2 comparaisons, soit O(n²).",
        },
        {
          texte:
            "Quelle est la complexité de la recherche dans un arbre BST équilibré ?",
          options: { A: "O(1)", B: "O(log n)", C: "O(n)", D: "O(n log n)" },
          correctAnswer: "B",
          explanation:
            "Dans un arbre binaire de recherche équilibré, la hauteur est log(n), donc la recherche est O(log n).",
        },
        {
          texte: "Un algorithme en O(1) est dit :",
          options: {
            A: "Linéaire",
            B: "Quadratique",
            C: "Logarithmique",
            D: "Constant",
          },
          correctAnswer: "D",
          explanation:
            "O(1) signifie que le temps d'exécution est constant, indépendant de la taille de l'entrée.",
        },
      ],
      resultats: [],
    },
    {
      videoId: videos[3]._id,
      titre: "QCM — Modèle Entité-Relation",
      pointsPerQuestion: 10,
      timerSeconds: 25,
      questions: [
        {
          texte: "Une clé primaire doit être :",
          options: {
            A: "Numérique uniquement",
            B: "Unique et non nulle",
            C: "Automatique",
            D: "De type VARCHAR",
          },
          correctAnswer: "B",
          explanation:
            "La clé primaire identifie uniquement chaque enregistrement. Elle doit être unique et ne peut pas être NULL.",
        },
        {
          texte: "Une association Many-to-Many entre deux entités nécessite :",
          options: {
            A: "Une clé étrangère simple",
            B: "Une table de jonction",
            C: "Une vue SQL",
            D: "Un trigger",
          },
          correctAnswer: "B",
          explanation:
            "Une relation N:N est implémentée via une table de jonction (ou table d'association) contenant les clés étrangères des deux entités.",
        },
      ],
      resultats: [],
    },
  ]);
  log(`${qcms.length} QCMs créés`);
  return qcms;
}

/* ── Progressions simulées ───────────────────────────────────────────────── */
async function createProgress(etudiants, courses, videos, qcms) {
  const progresses = [];
  for (let i = 0; i < etudiants.length; i++) {
    const e = etudiants[i];
    const course = courses[i % 2];
    const vids = videos.filter(
      (v) => v.courseId.toString() === course._id.toString(),
    );
    const done = vids.slice(0, Math.ceil(vids.length * (0.3 + i * 0.07)));
    const myQcm = qcms.filter((q) =>
      done.some((v) => v._id.toString() === q.videoId.toString()),
    );

    progresses.push({
      userId: e._id,
      courseId: course._id,
      videosCompleted: done.map((v) => v._id),
      qcmScores: myQcm.map((q) => ({
        qcmId: q._id,
        score: 60 + Math.floor(Math.random() * 40),
      })),
      lastActivity: new Date(Date.now() - i * 24 * 3600 * 1000),
    });

    // Simuler watchedBy sur les vidéos
    for (const v of done) {
      await Video.findByIdAndUpdate(v._id, {
        $push: {
          watchedBy: {
            userId: e._id,
            watchedPercent: 80 + Math.floor(Math.random() * 20),
            completed: true,
            completedAt: new Date(Date.now() - i * 3600 * 1000),
            lastWatchedAt: new Date(),
          },
        },
      });
    }
  }

  await Progress.insertMany(progresses);
  log(`${progresses.length} progressions créées`);
}

/* ── Messages de chat ────────────────────────────────────────────────────── */
async function createMessages(etudiants, courses, prof1) {
  const roomId = `course_${courses[0]._id}`;
  const messages = [
    {
      senderId: prof1._id,
      roomId,
      content:
        "Bonjour tout le monde ! N'oubliez pas de regarder les vidéos avant le cours de demain 👋",
      type: "text",
    },
    {
      senderId: etudiants[0]._id,
      roomId,
      content:
        "Bonjour Professeur ! J'ai une question sur la complexité du tri fusion.",
      type: "text",
    },
    {
      senderId: prof1._id,
      roomId,
      content:
        "Bien sûr Amine ! Le tri fusion est en O(n log n). Qu'est-ce qui te pose problème exactement ?",
      type: "text",
    },
    {
      senderId: etudiants[0]._id,
      roomId,
      content: "Pourquoi c'est log n et pas n² ?",
      type: "text",
    },
    {
      senderId: prof1._id,
      roomId,
      content:
        "Parce qu'à chaque étape on divise le tableau en deux — c'est comme un arbre binaire de profondeur log(n). Chaque niveau fait n opérations, donc n × log(n) au total.",
      type: "text",
    },
    {
      senderId: etudiants[1]._id,
      roomId,
      content: "Merci Prof, très clair ! 😊",
      type: "text",
    },
    {
      senderId: etudiants[2]._id,
      roomId,
      content: "J'ai fait le QCM et eu 90% ! Super les explications !",
      type: "text",
    },
    {
      senderId: etudiants[3]._id,
      roomId,
      content: "Moi j'ai eu 70%… Je vais revoir la vidéo sur la complexité.",
      type: "text",
    },
    {
      senderId: prof1._id,
      roomId,
      content:
        "Très bien ! En regardant les stats, je vois que la question sur O(log n) pose problème à plusieurs. Je vais y revenir en cours 📊",
      type: "text",
    },
  ];

  // Décaler les timestamps
  const withTs = messages.map((m, i) => ({
    ...m,
    createdAt: new Date(Date.now() - (messages.length - i) * 5 * 60 * 1000),
    updatedAt: new Date(),
  }));

  await Message.insertMany(withTs);

  // Quelques messages bot
  const botRoom = `bot_${etudiants[0]._id}`;
  await Message.insertMany([
    {
      roomId: botRoom,
      content: "Qu'est-ce que la récursivité ?",
      type: "text",
      senderId: etudiants[0]._id,
    },
    {
      roomId: botRoom,
      content:
        "La **récursivité** est une technique de programmation où une fonction s'appelle elle-même pour résoudre un problème en le décomposant en sous-problèmes plus simples.\n\nExemple en Python :\n```python\ndef factorielle(n):\n    if n <= 1:\n        return 1\n    return n * factorielle(n - 1)\n```\nChaque appel réduit n de 1 jusqu'à atteindre le cas de base (n ≤ 1).",
      type: "bot",
      senderName: "Assistant FlipLearn",
    },
  ]);

  log(`${withTs.length + 2} messages créés`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════════════════ */
async function main() {
  console.log("\n🌱  FlipLearn — Seed de données de démonstration\n");
  console.log(`📡  Connexion à : ${MONGO_URI}\n`);

  await connect();

  console.log("🗑️   Nettoyage...");
  await clearCollections();

  console.log("\n👥  Création des utilisateurs...");
  const { admin, prof1, prof2, etudiants } = await createUsers();

  console.log("\n📚  Création des badges système...");
  await seedBadges();
  log("Badges créés/mis à jour");

  console.log("\n🎓  Création des cours...");
  const courses = await createCourses(prof1, prof2);

  console.log("\n🎬  Création des vidéos...");
  const videos = await createVideos(courses, prof1, prof2);

  console.log("\n❓  Création des QCMs...");
  const qcms = await createQCMs(videos);

  console.log("\n📊  Simulation des progressions...");
  await createProgress(etudiants, courses, videos, qcms);

  console.log("\n💬  Création des messages...");
  await createMessages(etudiants, courses, prof1);

  console.log("\n═══════════════════════════════════════════════");
  console.log("✅  Seed terminé avec succès !\n");
  console.log("📋  Comptes de démonstration :");
  console.log("─────────────────────────────────────────────");
  console.log("  Admin      : admin@fliplearn.dz       / admin1234");
  console.log("  Professeur : karim.prof@fliplearn.dz  / prof1234");
  console.log("  Professeur : nadia.prof@fliplearn.dz  / prof1234");
  console.log("  Étudiant   : amine@fliplearn.dz       / etudiant123");
  console.log("  Étudiant   : sara@fliplearn.dz        / etudiant123");
  console.log("  (+ 8 autres étudiants avec le même mot de passe)");
  console.log("═══════════════════════════════════════════════\n");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌  Erreur seed :", err.message);
  mongoose.disconnect().finally(() => process.exit(1));
});
