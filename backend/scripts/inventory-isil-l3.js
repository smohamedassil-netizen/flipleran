/**
 * inventory-isil-l3.js — Lecture seule.
 *
 * Diagnostic pré-seed pour la refonte articulation Cas Pratique ↔ Projet.
 * Aucune écriture en DB. Sortie console JSON pour reporting facile.
 *
 * Usage : node backend/scripts/inventory-isil-l3.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Chapter from '../models/Chapter.js';
import Video from '../models/Video.js';
import QCM from '../models/QCM.js';
import Prosit from '../models/Prosit.js';
import Project from '../models/Project.js';

async function main() {
  await connectDB();

  /* ─── 1.1 Modules ISIL L3 ─────────────────────────────────────── */
  const courses = await Course.find({ filiere: 'ISIL', promotion: 'L3' })
    .populate('professorId', 'prenom nom email')
    .sort({ titre: 1 })
    .lean();

  const courseRows = await Promise.all(courses.map(async (c) => {
    const [chapters, videos, qcms, caspratiques, projects] = await Promise.all([
      Chapter.countDocuments({ courseId: c._id }),
      Video.countDocuments({ courseId: c._id }),
      QCM.countDocuments({ $or: [{ courseId: c._id }, { videoId: { $in: await Video.find({ courseId: c._id }).distinct('_id') } }] }),
      Prosit.countDocuments({ courseId: c._id }),
      Project.countDocuments({ $or: [{ courseId: c._id }, { modules: c._id }] }),
    ]);
    return {
      _id: String(c._id),
      titre: c.titre,
      isActive: c.isActive,
      semestre: c.semestre || '',
      professeur: c.professorId ? `${c.professorId.prenom} ${c.professorId.nom} <${c.professorId.email}>` : '(orphelin)',
      counts: { chapters, videos, qcms, caspratiques, projects },
    };
  }));

  /* ─── 1.2 Comptes utilisateurs ────────────────────────────────── */
  const assil = await User.findOne({ email: 'assil.isil.l3@fliplearn.dz' })
    .select('_id role filiere promotion prenom nom').lean();
  const omar = await User.findOne({ email: 'omar.isil.l3@fliplearn.dz' })
    .select('_id role filiere promotion prenom nom').lean();

  const studentsL3 = await User.find({ role: 'etudiant', filiere: 'ISIL', promotion: 'L3' })
    .select('_id email prenom nom').sort({ email: 1 }).limit(15).lean();

  const profsISIL = await User.find({ role: 'professeur', filiere: 'ISIL' })
    .select('_id email prenom nom').sort({ email: 1 }).lean();

  /* ─── Output ─────────────────────────────────────────────────── */
  const report = {
    courses: courseRows,
    users: {
      assil: assil ? { _id: String(assil._id), prenom: assil.prenom, nom: assil.nom, role: assil.role, filiere: assil.filiere, promotion: assil.promotion } : null,
      omar: omar ? { _id: String(omar._id), prenom: omar.prenom, nom: omar.nom, role: omar.role, filiere: omar.filiere, promotion: omar.promotion } : null,
      studentsL3: studentsL3.map((s) => ({ _id: String(s._id), email: s.email, name: `${s.prenom} ${s.nom}`.trim() })),
      profsISIL: profsISIL.map((p) => ({ _id: String(p._id), email: p.email, name: `${p.prenom} ${p.nom}`.trim() })),
    },
    summary: {
      coursesCount: courseRows.length,
      activeCount: courseRows.filter((c) => c.isActive).length,
      studentsL3Count: studentsL3.length,
      profsISILCount: profsISIL.length,
    },
  };

  console.log(JSON.stringify(report, null, 2));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[inventory] error:', err);
  process.exit(1);
});
