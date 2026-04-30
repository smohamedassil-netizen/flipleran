import ProjectPeerReview, { PEER_REVIEW_CRITERIA } from '../models/ProjectPeerReview.js';
import Project from '../models/Project.js';
import { pushNotification } from '../services/notificationService.js';

/**
 * projectPeerReviewController — Gère le cycle complet de peer-review (F9).
 *
 * Workflow type :
 *   1. Le prof active la peer-review pour 1 livrable (ou tous les livrables d'une phase)
 *      → POST /api/projects/:id/peer-reviews/assign
 *      → l'algo `assignReviewers` répartit 2 reviewers / livrable
 *   2. Les reviewers reçoivent une notif "Tu dois reviewer le livrable de X"
 *   3. Chaque reviewer ouvre son tableau et soumet sa review (4 critères + commentaire)
 *      → POST /api/projects/:id/peer-reviews/:reviewId/submit
 *   4. Le prof consulte la summary par livrable (moyenne, comments anonymes)
 *      → GET /api/projects/:id/peer-reviews/summary
 */

const REVIEWS_PER_LIVRABLE = 2;

/**
 * Mélange Fisher-Yates pour avoir un ordre aléatoire reproductible-non.
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Auto-pairing : pour chaque livrable, assigne REVIEWS_PER_LIVRABLE reviewers
 * parmi les étudiants membres du projet, en évitant :
 *  - l'auto-review (un étudiant ne review pas son propre livrable)
 *  - dans la mesure du possible, les reviewers du même groupe que la cible
 *
 * On renvoie un tableau de paires { livrableId, targetUserId, reviewerId, phaseId? }
 * sans toucher la DB. Le caller est responsable de l'insert (ProjectPeerReview.insertMany).
 *
 * @see Boud & Falchikov (2007) — la peer-review formative diversifie les
 *      regards et oblige le reviewer à formaliser son jugement, ce qui est
 *      un apprentissage en soi.
 */
export function computePairings({ livrables, members }) {
  // Map memberId → groupeId pour éviter intra-groupe quand possible
  const memberGroupe = {};
  // members = [{ userId, groupeIdx }]
  for (const m of members) memberGroupe[String(m.userId)] = m.groupeIdx;

  const pairings = [];

  for (const liv of livrables) {
    const targetUserId = String(liv.uploadedBy);
    if (!targetUserId) continue;

    // Exclus le target
    let candidates = members.filter((m) => String(m.userId) !== targetUserId);
    if (candidates.length === 0) continue;

    // Priorité à ceux d'un autre groupe
    const targetGroupe = memberGroupe[targetUserId];
    const outsideGroup = candidates.filter((m) => m.groupeIdx !== targetGroupe);
    const insideGroup  = candidates.filter((m) => m.groupeIdx === targetGroupe);
    candidates = [...shuffle(outsideGroup), ...shuffle(insideGroup)];

    const picked = candidates.slice(0, REVIEWS_PER_LIVRABLE);
    for (const reviewer of picked) {
      pairings.push({
        livrableId:   liv._id,
        targetUserId,
        reviewerId:   reviewer.userId,
        phaseId:      liv.phaseId || null,
      });
    }
  }

  return pairings;
}

/* ─── POST /api/projects/:id/peer-reviews/assign (prof) ─────────────────── */
export const assignPeerReviewers = async (req, res) => {
  try {
    if (!['professeur', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Seul un prof peut activer la peer-review.' });
    }
    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    const { phaseId, livrableIds, isAnonymous = true, deadline } = req.body || {};

    // Sélection des livrables ciblés
    let livrables = project.livrables || [];
    if (Array.isArray(livrableIds) && livrableIds.length) {
      livrables = livrables.filter((l) => livrableIds.map(String).includes(String(l._id)));
    } else if (phaseId) {
      livrables = livrables.filter((l) => String(l.phaseId) === String(phaseId));
    }
    if (!livrables.length) {
      return res.status(400).json({ message: 'Aucun livrable trouvé pour la peer-review.' });
    }

    // Construction de la liste des membres
    const members = [];
    (project.groupes || []).forEach((g, gIdx) => {
      (g.membres || []).forEach((m) => members.push({ userId: m.userId, groupeIdx: gIdx }));
    });
    if (members.length < 2) {
      return res.status(400).json({ message: 'Il faut au moins 2 membres pour une peer-review.' });
    }

    const pairings = computePairings({ livrables, members });

    // Insertion en DB (skip duplicatas grâce à l'index unique)
    const docs = pairings.map((p) => ({
      projectId:    project._id,
      livrableId:   p.livrableId,
      phaseId:      p.phaseId,
      reviewerId:   p.reviewerId,
      targetUserId: p.targetUserId,
      isAnonymous,
      deadline:     deadline ? new Date(deadline) : (project.dateFin || null),
      status:       'assigned',
    }));

    let createdCount = 0;
    for (const d of docs) {
      try {
        await ProjectPeerReview.create(d);
        createdCount++;
      } catch (err) {
        // Index unique violé = paire déjà existante, on skip silencieusement
        if (err.code !== 11000) console.error('[peerReview/assign]', err.message);
      }
    }

    // Notif aux reviewers
    try {
      const io = req.app.get('io');
      if (io) {
        const reviewersToNotify = [...new Set(docs.map((d) => String(d.reviewerId)))];
        for (const userId of reviewersToNotify) {
          await pushNotification(io, {
            userId,
            type:        'project_status',
            priority:    'normal',
            title:       '👥 Tu as une peer-review à faire',
            message:     `Le prof t'a assigné des reviews sur le projet "${project.titre}".`,
            link:        `/projects/${project._id}`,
            relatedType: 'project',
            relatedId:   project._id,
            dedupKey:    `peerreview_assigned_${project._id}_${userId}_${Date.now()}`,
          });
        }
      }
    } catch (notifErr) {
      console.error('[peerReview/assign notif]', notifErr.message);
    }

    res.status(201).json({
      assignedCount: createdCount,
      totalPairings: docs.length,
      reviewsPerLivrable: REVIEWS_PER_LIVRABLE,
    });
  } catch (err) {
    console.error('assignPeerReviewers error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/projects/:id/peer-reviews/mine (étudiant) ────────────────── */
/**
 * Renvoie les reviews assignées au user courant pour ce projet, avec les
 * détails du livrable à reviewer (titre, auteur masqué si anonyme).
 */
export const getMyAssignments = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).select('titre livrables').lean();
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    const reviews = await ProjectPeerReview.find({
      projectId:  project._id,
      reviewerId: req.user.id,
    }).sort({ status: 1, createdAt: 1 }).lean();

    // Enrichis avec le titre du livrable
    const livrablesById = Object.fromEntries((project.livrables || []).map((l) => [String(l._id), l]));
    const enriched = reviews.map((r) => {
      const liv = livrablesById[String(r.livrableId)] || {};
      return {
        ...r,
        livrableTitre: liv.titre || '— livrable supprimé —',
        livrableUrl:   liv.url || '',
        livrableType:  liv.type || '',
      };
    });

    res.json({ reviews: enriched, criteria: PEER_REVIEW_CRITERIA });
  } catch (err) {
    console.error('getMyAssignments error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ─── POST /api/projects/:id/peer-reviews/:reviewId/submit (étudiant) ──── */
export const submitPeerReview = async (req, res) => {
  try {
    const review = await ProjectPeerReview.findOne({
      _id:        req.params.reviewId,
      projectId:  req.params.id,
      reviewerId: req.user.id,
    });
    if (!review) return res.status(404).json({ message: 'Review introuvable.' });
    if (review.status === 'submitted') {
      return res.status(400).json({ message: 'Tu as déjà soumis cette review.' });
    }

    const { criteria, comment } = req.body || {};
    if (!Array.isArray(criteria) || criteria.length === 0) {
      return res.status(400).json({ message: 'criteria requis (tableau de scores).' });
    }

    review.criteria = criteria
      .filter((c) => c && PEER_REVIEW_CRITERIA.includes(c.name) && Number.isFinite(Number(c.score)))
      .map((c) => ({
        name:  c.name,
        score: Math.max(1, Math.min(5, Math.round(Number(c.score)))),
      }))
      .slice(0, PEER_REVIEW_CRITERIA.length);

    review.comment     = String(comment || '').slice(0, 2000);
    review.status      = 'submitted';
    review.submittedAt = new Date();

    await review.save();
    res.json(review);
  } catch (err) {
    console.error('submitPeerReview error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/projects/:id/peer-reviews/summary (prof) ─────────────────── */
/**
 * Résumé pour le prof : par livrable, moyenne par critère + commentaires
 * (anonymisés selon le flag de chaque review).
 */
export const getPeerReviewSummary = async (req, res) => {
  try {
    if (!['professeur', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Réservé au prof.' });
    }
    const project = await Project.findById(req.params.id).select('titre livrables').lean();
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    const reviews = await ProjectPeerReview.find({ projectId: project._id, status: 'submitted' })
      .populate('reviewerId', 'nom prenom')
      .lean();

    // Group by livrableId
    const byLivrable = {};
    for (const liv of project.livrables || []) {
      byLivrable[String(liv._id)] = {
        livrableId:    liv._id,
        livrableTitre: liv.titre,
        reviews:       [],
        averages:      {},
      };
    }

    for (const r of reviews) {
      const slot = byLivrable[String(r.livrableId)];
      if (!slot) continue;
      slot.reviews.push({
        reviewerLabel: r.isAnonymous ? 'Anonyme' : `${r.reviewerId?.prenom || ''} ${r.reviewerId?.nom || ''}`.trim(),
        criteria:      r.criteria,
        comment:       r.comment,
        submittedAt:   r.submittedAt,
      });
    }

    // Moyennes
    for (const slot of Object.values(byLivrable)) {
      const acc = {};
      slot.reviews.forEach((r) => r.criteria.forEach((c) => {
        acc[c.name] = acc[c.name] || { sum: 0, n: 0 };
        acc[c.name].sum += c.score; acc[c.name].n += 1;
      }));
      for (const [k, v] of Object.entries(acc)) {
        slot.averages[k] = v.n ? Math.round((v.sum / v.n) * 10) / 10 : null;
      }
    }

    res.json({ summary: Object.values(byLivrable), criteria: PEER_REVIEW_CRITERIA });
  } catch (err) {
    console.error('getPeerReviewSummary error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

export default {
  assignPeerReviewers,
  getMyAssignments,
  submitPeerReview,
  getPeerReviewSummary,
  computePairings,
};
