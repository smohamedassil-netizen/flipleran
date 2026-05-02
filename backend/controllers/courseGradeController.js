import Course           from '../models/Course.js';
import QCM              from '../models/QCM.js';
import Video            from '../models/Video.js';
import Prosit           from '../models/Prosit.js';
import Project          from '../models/Project.js';
import CourseCompletion from '../models/CourseCompletion.js';
import User             from '../models/User.js';

/**
 * Calcule la note de contrôle continu (sur 20) d'un étudiant pour un cours.
 *
 * Pédagogie : en classe inversée stricte (Bergmann & Sams 2012 ; Lebrun 2007),
 * les QCM AVANT le cours sont formatifs — leur fonction est l'auto-évaluation
 * et l'aide au prof, pas la note officielle (Black & Wiliam 1998). Le prof
 * peut activer `qcmCountsInGrade` sur le cours s'il souhaite que les QCM
 * comptent quand même (cas où QCM est passé APRÈS la séance présentielle).
 *
 * Pondérations par défaut (modifiables par cours via `gradeWeights`) :
 *   - QCM        : 30 % (uniquement si qcmCountsInGrade=true ; sinon redistribué)
 *   - Prosit     : 30 %
 *   - Projet     : 30 %
 *   - Validation : 10 %
 *
 * Retourne :
 *   {
 *     finalGrade: number (sur 20, ou null si aucune source de note),
 *     breakdown: { qcm, prosit, project, validation },
 *     weights: { qcm, prosit, project, validation }, (utilisés après normalisation)
 *     details: ...
 *   }
 */
async function computeGrade(courseId, studentId) {
  const course = await Course.findById(courseId).lean();
  if (!course) return null;

  // Pondérations adaptées : si qcmCountsInGrade=false on redistribue le poids
  // QCM sur les autres composantes (proportionnellement).
  const w = course.gradeWeights || { qcm: 30, prosit: 30, project: 30, validation: 10 };
  const useQcm = course.qcmCountsInGrade === true;

  let weights = { ...w };
  if (!useQcm) {
    const total = (w.prosit || 0) + (w.project || 0) + (w.validation || 0);
    if (total > 0) {
      const factor = 100 / total;
      weights = {
        qcm: 0,
        prosit:     +(w.prosit * factor).toFixed(2),
        project:    +(w.project * factor).toFixed(2),
        validation: +(w.validation * factor).toFixed(2),
      };
    }
  }

  /* ─── 1. QCM — moyenne des scores % de l'étudiant sur ce cours ───── */
  // (on prend le meilleur score par QCM pour ne pas pénaliser les retries)
  const videos = await Video.find({ courseId }).select('_id').lean();
  const videoIds = videos.map(v => v._id);
  const quizzes = await QCM.find({ videoId: { $in: videoIds } }).select('resultats').lean();

  const qcmScores = [];
  for (const q of quizzes) {
    const myResults = (q.resultats || []).filter((r) => r.userId?.toString() === studentId.toString());
    if (myResults.length > 0) {
      const best = Math.max(...myResults.map((r) => r.score || 0));
      qcmScores.push(best);
    }
  }
  // Note QCM sur 20 (moyenne des % rapportés sur 20)
  const qcmGrade = qcmScores.length > 0
    ? +(qcmScores.reduce((a, b) => a + b, 0) / qcmScores.length / 5).toFixed(2)
    : null;

  /* ─── 2. Prosit — moyenne des notes prof (sur 20) ──────────────────── */
  const prosits = await Prosit.find({
    courseId,
    'groupes.membres.userId': studentId,
  }).select('groupes evaluation').lean();

  const prositGrades = [];
  for (const p of prosits) {
    const grade = p.evaluation?.note;
    if (typeof grade === 'number') prositGrades.push(grade);
  }
  const prositGrade = prositGrades.length > 0
    ? +(prositGrades.reduce((a, b) => a + b, 0) / prositGrades.length).toFixed(2)
    : null;

  /* ─── 3. Projet — moyenne des notes (Project.evaluations) ──────────── */
  const projects = await Project.find({
    $or: [{ courseId }, { modules: courseId }],
    'groupes.membres.userId': studentId,
  }).select('evaluations groupes').lean();

  const projectGrades = [];
  for (const p of projects) {
    const evals = p.evaluations || [];
    // Moyenne de toutes les évaluations du projet (note prof globale)
    const validNotes = evals.map((e) => e.note).filter((n) => typeof n === 'number');
    if (validNotes.length > 0) {
      projectGrades.push(validNotes.reduce((a, b) => a + b, 0) / validNotes.length);
    }
  }
  const projectGrade = projectGrades.length > 0
    ? +(projectGrades.reduce((a, b) => a + b, 0) / projectGrades.length).toFixed(2)
    : null;

  /* ─── 4. Validation module — 20/20 si validé, sinon null ──────────── */
  const completion = await CourseCompletion.findOne({ userId: studentId, courseId }).lean();
  const validationGrade = completion ? 20 : null;

  /* ─── Note finale (moyenne pondérée — uniquement les composantes notées) ── */
  const components = [
    { key: 'qcm',        grade: qcmGrade,        weight: weights.qcm,        used: useQcm },
    { key: 'prosit',     grade: prositGrade,     weight: weights.prosit,     used: true },
    { key: 'project',    grade: projectGrade,    weight: weights.project,    used: true },
    { key: 'validation', grade: validationGrade, weight: weights.validation, used: true },
  ];

  const active = components.filter(c => c.used && c.grade !== null && c.weight > 0);
  let finalGrade = null;
  if (active.length > 0) {
    const totalWeight = active.reduce((s, c) => s + c.weight, 0);
    finalGrade = +(active.reduce((s, c) => s + c.grade * c.weight, 0) / totalWeight).toFixed(2);
  }

  return {
    finalGrade,
    breakdown: {
      qcm:        qcmGrade,
      prosit:     prositGrade,
      project:    projectGrade,
      validation: validationGrade,
    },
    counts: {
      qcm:    qcmScores.length,
      prosit: prositGrades.length,
      project: projectGrades.length,
      validation: completion ? 1 : 0,
    },
    weights,
    qcmCountsInGrade: useQcm,
  };
}

/* ─── GET /api/courses/:id/my-grade — vue étudiant ─────────────────── */
export const getMyGrade = async (req, res) => {
  try {
    const { id: courseId } = req.params;
    const grade = await computeGrade(courseId, req.user.id);
    if (!grade) return res.status(404).json({ message: 'Cours introuvable.' });
    res.json(grade);
  } catch (err) {
    console.error('[getMyGrade]', err);
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/courses/:id/grades — vue prof : toute la promo ──────── */
export const listGrades = async (req, res) => {
  try {
    const { id: courseId } = req.params;
    const course = await Course.findById(courseId).lean();
    if (!course) return res.status(404).json({ message: 'Cours introuvable.' });

    // Étudiants de la même filière + promotion (+ semestre si renseigné)
    const studentFilter = {
      role: 'etudiant',
      filiere: course.filiere,
      promotion: course.promotion,
    };
    const students = await User.find(studentFilter).select('_id prenom nom email semestre').lean();

    const rows = await Promise.all(
      students.map(async (s) => {
        const grade = await computeGrade(courseId, s._id);
        return {
          student: s,
          ...grade,
        };
      })
    );

    // Tri par note décroissante (les sans note à la fin)
    rows.sort((a, b) => {
      if (a.finalGrade === null && b.finalGrade === null) return 0;
      if (a.finalGrade === null) return 1;
      if (b.finalGrade === null) return -1;
      return b.finalGrade - a.finalGrade;
    });

    // Statistiques globales (moyenne, médiane, …)
    const validGrades = rows.map(r => r.finalGrade).filter(g => g !== null);
    const stats = {
      students: rows.length,
      graded:   validGrades.length,
      average:  validGrades.length ? +(validGrades.reduce((a, b) => a + b, 0) / validGrades.length).toFixed(2) : null,
      min:      validGrades.length ? Math.min(...validGrades) : null,
      max:      validGrades.length ? Math.max(...validGrades) : null,
    };

    res.json({ course: { _id: course._id, titre: course.titre, qcmCountsInGrade: course.qcmCountsInGrade, gradeWeights: course.gradeWeights }, stats, rows });
  } catch (err) {
    console.error('[listGrades]', err);
    res.status(500).json({ message: err.message });
  }
};

/* ─── PUT /api/courses/:id/grade-settings — prof modifie le toggle + poids ── */
export const updateGradeSettings = async (req, res) => {
  try {
    const { id: courseId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Cours introuvable.' });
    if (req.user.role !== 'admin' && course.professorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    const { qcmCountsInGrade, gradeWeights } = req.body;
    if (typeof qcmCountsInGrade === 'boolean') course.qcmCountsInGrade = qcmCountsInGrade;
    if (gradeWeights && typeof gradeWeights === 'object') {
      const sum = (gradeWeights.qcm || 0) + (gradeWeights.prosit || 0) + (gradeWeights.project || 0) + (gradeWeights.validation || 0);
      if (sum !== 100) {
        return res.status(400).json({ message: `La somme des poids doit être exactement 100 (actuellement ${sum}).` });
      }
      course.gradeWeights = gradeWeights;
    }
    await course.save();
    res.json({ qcmCountsInGrade: course.qcmCountsInGrade, gradeWeights: course.gradeWeights });
  } catch (err) {
    console.error('[updateGradeSettings]', err);
    res.status(500).json({ message: err.message });
  }
};
