import mongoose from 'mongoose';
import Prosit, { PROSIT_ROLES } from '../models/Prosit.js';
import User from '../models/User.js';
import Course from '../models/Course.js';

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────── */

/**
 * Détermine si un utilisateur est dans un des groupes d'un Prosit.
 */
function findUserGroupIndex(prosit, userId) {
  if (!prosit?.groupes) return -1;
  return prosit.groupes.findIndex(g =>
    g.membres.some(m => m.userId?.toString() === userId.toString())
  );
}

/**
 * Visibilité : pendant aller/recherche/retour, un étudiant ne voit que SON groupe.
 * Une fois en `evalue` ou `archive`, tous les groupes sont visibles entre étudiants.
 * Le prof voit toujours tout.
 */
function filterPrositForViewer(prosit, viewer) {
  if (!viewer) return prosit;
  if (viewer.role === 'professeur' || viewer.role === 'admin') return prosit;

  const isPublicPhase = ['evalue', 'archive'].includes(prosit.status);
  if (isPublicPhase) return prosit;

  const myIdx = findUserGroupIndex(prosit, viewer.id);
  const obj = prosit.toObject ? prosit.toObject() : prosit;
  obj.groupes = myIdx >= 0 ? [obj.groupes[myIdx]] : [];
  obj.myGroupIndex = myIdx;
  return obj;
}

/**
 * Rotation obligatoire des rôles : pour chaque membre d'un groupe à former,
 * priorise les rôles qu'il n'a pas encore occupés.
 *
 * - On lit `user.prositRolesHistory` (cycle courant).
 * - On compte les rôles déjà faits dans CE cycle.
 * - Une fois tous les rôles faits, le cycle se réinitialise (incrémenté).
 *
 * Retourne un mapping userId → role pour les `members` donnés.
 */
async function assignRolesWithRotation(memberIds) {
  const users = await User.find({ _id: { $in: memberIds } }).select('prositRolesCycle prositRolesDoneInCycle');

  // Initialiser les champs si manquants (cycle 0, aucun rôle fait)
  const usersById = new Map();
  for (const u of users) {
    if (!u.prositRolesCycle) u.prositRolesCycle = 0;
    if (!Array.isArray(u.prositRolesDoneInCycle)) u.prositRolesDoneInCycle = [];
    usersById.set(u._id.toString(), u);
  }

  // Pour chaque rôle CESI dans l'ordre fixe, attribuer à un user qui ne l'a pas encore fait
  const remainingRoles = [...PROSIT_ROLES]; // ['animateur', 'secretaire', 'scribe', 'gestionnaire', 'membre']
  const assignment = {};
  const remainingUsers = memberIds.map(String);

  for (const role of remainingRoles) {
    if (remainingUsers.length === 0) break;
    // Préférer un user dont le rôle n'est pas dans son cycle courant
    let chosen = remainingUsers.find(uid => {
      const u = usersById.get(uid);
      return !(u?.prositRolesDoneInCycle || []).includes(role);
    });
    // Sinon prendre le premier disponible
    if (!chosen) chosen = remainingUsers[0];
    assignment[chosen] = role;
    remainingUsers.splice(remainingUsers.indexOf(chosen), 1);
  }

  // Les éventuels users restants (groupe > 5 membres) deviennent 'membre'
  for (const uid of remainingUsers) {
    assignment[uid] = 'membre';
  }

  return assignment;
}

/**
 * Génère des groupes aléatoires en respectant minMembres / maxMembres.
 * Les rôles sont assignés via la rotation obligatoire.
 */
async function buildRandomGroups(memberIds, { minMembres, maxMembres }) {
  const shuffled = [...memberIds].sort(() => Math.random() - 0.5);
  const groupes = [];
  let groupIdx = 1;

  while (shuffled.length > 0) {
    const remaining = shuffled.length;
    // Calcule la taille optimale pour ce groupe : on essaie de respecter
    // minMembres et maxMembres tout en équilibrant.
    let take;
    if (remaining <= maxMembres) {
      take = remaining;
    } else if (remaining < minMembres + maxMembres) {
      // Pour éviter un dernier groupe trop petit, on partage en 2 équilibrés
      take = Math.ceil(remaining / 2);
    } else {
      take = maxMembres;
    }

    const slice = shuffled.splice(0, take);
    const roleMap = await assignRolesWithRotation(slice);

    groupes.push({
      nom: `Groupe ${groupIdx++}`,
      membres: slice.map(uid => ({
        userId: uid,
        role: roleMap[uid] || 'membre',
      })),
      motsClesIdentifies: [],
      hypotheses: [],
    });
  }

  return groupes;
}

/* ─────────────────────────────────────────────────────────────────────────
   CRUD — PROF
───────────────────────────────────────────────────────────────────────── */

export async function createProsit(req, res) {
  try {
    const {
      titre, description, enonce, motsCles = [], objectifsApprentissage = [],
      courseId, filiere, promotion, caseEntreprise,
      dateAller, dateRetour, dureeRechercheJours,
      groupesConfig, ressources = [], grilleEvaluation = [],
    } = req.body;

    if (!titre || !enonce || !courseId || !filiere || !promotion || !dateAller || !dateRetour) {
      return res.status(400).json({ message: 'Champs obligatoires manquants' });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Cours introuvable' });

    const prosit = await Prosit.create({
      titre, description, enonce, motsCles, objectifsApprentissage,
      courseId, filiere, promotion, caseEntreprise,
      dateAller, dateRetour,
      dureeRechercheJours: dureeRechercheJours || 7,
      createdBy: req.user.id,
      status: 'brouillon',
      groupesConfig: groupesConfig || { minMembres: 4, maxMembres: 8, formationMode: 'random' },
      ressources,
      grilleEvaluation: grilleEvaluation.length ? grilleEvaluation : [
        { critere: 'Pertinence des hypothèses', poids: 25, description: 'Qualité et plausibilité des hypothèses formulées en phase Aller' },
        { critere: 'Profondeur de la recherche', poids: 25, description: 'Sources, rigueur, citations' },
        { critere: 'Qualité de la solution',     poids: 30, description: 'Exhaustivité, faisabilité, créativité' },
        { critere: 'Présentation orale',         poids: 20, description: 'Clarté, structure, gestion du temps' },
      ],
    });

    res.status(201).json(prosit);
  } catch (err) {
    console.error('[prosit] create error:', err);
    res.status(500).json({ message: 'Erreur création Prosit' });
  }
}

export async function updateProsit(req, res) {
  try {
    const prosit = await Prosit.findById(req.params.id);
    if (!prosit) return res.status(404).json({ message: 'Prosit introuvable' });
    if (prosit.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé' });
    }
    if (!['brouillon', 'aller'].includes(prosit.status)) {
      return res.status(400).json({ message: 'Modification impossible : phase verrouillée' });
    }

    const allowedFields = [
      'titre', 'description', 'enonce', 'motsCles', 'objectifsApprentissage',
      'caseEntreprise', 'dateAller', 'dateRetour', 'dureeRechercheJours',
      'groupesConfig', 'ressources', 'grilleEvaluation',
    ];
    for (const f of allowedFields) {
      if (req.body[f] !== undefined) prosit[f] = req.body[f];
    }
    await prosit.save();
    res.json(prosit);
  } catch (err) {
    console.error('[prosit] update error:', err);
    res.status(500).json({ message: 'Erreur mise à jour Prosit' });
  }
}

export async function deleteProsit(req, res) {
  try {
    const prosit = await Prosit.findById(req.params.id);
    if (!prosit) return res.status(404).json({ message: 'Prosit introuvable' });
    if (prosit.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé' });
    }
    if (prosit.status !== 'brouillon') {
      return res.status(400).json({ message: 'Suppression possible uniquement en brouillon' });
    }
    await prosit.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    console.error('[prosit] delete error:', err);
    res.status(500).json({ message: 'Erreur suppression Prosit' });
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   LECTURE
───────────────────────────────────────────────────────────────────────── */

export async function listProsits(req, res) {
  try {
    const filter = {};
    if (req.user.role === 'etudiant') {
      const me = await User.findById(req.user.id).select('filiere promotion');
      if (me?.filiere) filter.filiere = me.filiere;
      if (me?.promotion) filter.promotion = me.promotion;
      // Étudiant : pas les brouillons
      filter.status = { $ne: 'brouillon' };
    } else if (req.user.role === 'professeur') {
      filter.createdBy = req.user.id;
    }

    const prosits = await Prosit.find(filter)
      .populate('courseId', 'titre filiere')
      .populate('createdBy', 'prenom nom')
      .sort({ dateAller: -1 })
      .lean();

    res.json(prosits);
  } catch (err) {
    console.error('[prosit] list error:', err);
    res.status(500).json({ message: 'Erreur liste Prosits' });
  }
}

export async function getProsit(req, res) {
  try {
    const prosit = await Prosit.findById(req.params.id)
      .populate('courseId', 'titre filiere')
      .populate('createdBy', 'prenom nom')
      .populate('groupes.membres.userId', 'prenom nom avatarUrl');

    if (!prosit) return res.status(404).json({ message: 'Prosit introuvable' });

    const filtered = filterPrositForViewer(prosit, req.user);
    res.json(filtered);
  } catch (err) {
    console.error('[prosit] get error:', err);
    res.status(500).json({ message: 'Erreur récupération Prosit' });
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   GROUPES
───────────────────────────────────────────────────────────────────────── */

/**
 * Génération automatique de groupes (mode 'random').
 * Body : { studentIds: [userId, ...] }
 */
export async function generateGroupesAuto(req, res) {
  try {
    const prosit = await Prosit.findById(req.params.id);
    if (!prosit) return res.status(404).json({ message: 'Prosit introuvable' });
    if (prosit.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé' });
    }
    if (prosit.status !== 'brouillon') {
      return res.status(400).json({ message: 'Génération possible uniquement en brouillon' });
    }

    const studentIds = Array.isArray(req.body.studentIds) ? req.body.studentIds : [];
    if (studentIds.length < prosit.groupesConfig.minMembres) {
      return res.status(400).json({ message: `Au moins ${prosit.groupesConfig.minMembres} étudiants requis` });
    }

    prosit.groupes = await buildRandomGroups(studentIds, prosit.groupesConfig);
    prosit.groupesConfig.formationMode = 'random';
    await prosit.save();

    res.json(prosit);
  } catch (err) {
    console.error('[prosit] generate groupes error:', err);
    res.status(500).json({ message: 'Erreur génération groupes' });
  }
}

/**
 * Composition manuelle des groupes par le prof.
 * Body : { groupes: [{ nom, membres: [{ userId, role }] }] }
 */
export async function setGroupesManual(req, res) {
  try {
    const prosit = await Prosit.findById(req.params.id);
    if (!prosit) return res.status(404).json({ message: 'Prosit introuvable' });
    if (prosit.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé' });
    }
    if (prosit.status !== 'brouillon') {
      return res.status(400).json({ message: 'Composition possible uniquement en brouillon' });
    }

    const groupes = Array.isArray(req.body.groupes) ? req.body.groupes : [];
    prosit.groupes = groupes.map((g, i) => ({
      nom: g.nom || `Groupe ${i + 1}`,
      membres: (g.membres || []).map(m => ({
        userId: m.userId,
        role: PROSIT_ROLES.includes(m.role) ? m.role : 'membre',
      })),
      motsClesIdentifies: [],
      hypotheses: [],
    }));
    prosit.groupesConfig.formationMode = 'manual';
    await prosit.save();

    res.json(prosit);
  } catch (err) {
    console.error('[prosit] set groupes manual error:', err);
    res.status(500).json({ message: 'Erreur composition groupes' });
  }
}

/**
 * Étudiant rejoint un groupe (mode 'student_choice').
 * Body : { groupeIndex } — si groupeIndex absent, l'étudiant crée un nouveau groupe.
 */
export async function joinGroupe(req, res) {
  try {
    const prosit = await Prosit.findById(req.params.id);
    if (!prosit) return res.status(404).json({ message: 'Prosit introuvable' });
    if (prosit.groupesConfig.formationMode !== 'student_choice') {
      return res.status(400).json({ message: 'Mode student_choice requis' });
    }
    if (prosit.status !== 'brouillon' && prosit.status !== 'aller') {
      return res.status(400).json({ message: 'Phase non autorisée' });
    }

    const userId = req.user.id;
    // Retirer l'étudiant de tout autre groupe d'abord
    prosit.groupes.forEach(g => {
      g.membres = g.membres.filter(m => m.userId.toString() !== userId);
    });

    let groupe;
    if (typeof req.body.groupeIndex === 'number' && prosit.groupes[req.body.groupeIndex]) {
      groupe = prosit.groupes[req.body.groupeIndex];
      if (groupe.membres.length >= prosit.groupesConfig.maxMembres) {
        return res.status(400).json({ message: 'Groupe plein' });
      }
    } else {
      // Créer un nouveau groupe
      const newIdx = prosit.groupes.length;
      prosit.groupes.push({
        nom: `Groupe ${newIdx + 1}`,
        membres: [],
        motsClesIdentifies: [],
        hypotheses: [],
      });
      groupe = prosit.groupes[newIdx];
    }

    // Attribution de rôle avec rotation
    const roleMap = await assignRolesWithRotation([userId]);
    groupe.membres.push({ userId, role: roleMap[userId] || 'membre' });

    await prosit.save();
    res.json(prosit);
  } catch (err) {
    console.error('[prosit] join groupe error:', err);
    res.status(500).json({ message: 'Erreur rejoindre groupe' });
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   ESPACE COLLABORATIF (étudiant)
───────────────────────────────────────────────────────────────────────── */

export async function updateGroupeWorkspace(req, res) {
  try {
    const { id, gIdx } = req.params;
    const idx = parseInt(gIdx, 10);
    const prosit = await Prosit.findById(id);
    if (!prosit) return res.status(404).json({ message: 'Prosit introuvable' });
    if (!prosit.groupes[idx]) return res.status(404).json({ message: 'Groupe introuvable' });

    // Vérifier que l'étudiant est membre du groupe
    const isMember = prosit.groupes[idx].membres.some(m => m.userId.toString() === req.user.id);
    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non membre de ce groupe' });
    }

    // Phases autorisées : aller (workspace) ou retour (solution)
    if (!['aller', 'recherche', 'retour'].includes(prosit.status)) {
      return res.status(400).json({ message: 'Phase verrouillée' });
    }

    const fields = ['motsClesIdentifies', 'problematiqueReformulee', 'hypotheses', 'planAction'];
    if (prosit.status === 'retour') fields.push('solutionTexte', 'solutionFichier');

    for (const f of fields) {
      if (req.body[f] !== undefined) prosit.groupes[idx][f] = req.body[f];
    }
    await prosit.save();
    res.json(prosit.groupes[idx]);
  } catch (err) {
    console.error('[prosit] update workspace error:', err);
    res.status(500).json({ message: 'Erreur mise à jour espace de travail' });
  }
}

/**
 * Contribution individuelle d'un membre (phase recherche).
 */
export async function postContribution(req, res) {
  try {
    const { id, gIdx } = req.params;
    const idx = parseInt(gIdx, 10);
    const prosit = await Prosit.findById(id);
    if (!prosit) return res.status(404).json({ message: 'Prosit introuvable' });
    if (!prosit.groupes[idx]) return res.status(404).json({ message: 'Groupe introuvable' });

    if (prosit.status !== 'recherche') {
      return res.status(400).json({ message: 'Contributions ouvertes uniquement en phase recherche' });
    }

    const membre = prosit.groupes[idx].membres.find(m => m.userId.toString() === req.user.id);
    if (!membre) return res.status(403).json({ message: 'Non membre de ce groupe' });

    if (req.body.contributionTexte !== undefined)   membre.contributionTexte   = req.body.contributionTexte;
    if (req.body.contributionFichier !== undefined) membre.contributionFichier = req.body.contributionFichier;
    membre.contributionAt = new Date();

    await prosit.save();
    res.json(membre);
  } catch (err) {
    console.error('[prosit] contribution error:', err);
    res.status(500).json({ message: 'Erreur contribution' });
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   TRANSITIONS DE PHASE (prof)
───────────────────────────────────────────────────────────────────────── */

const TRANSITIONS = {
  brouillon: 'aller',
  aller:     'recherche',
  recherche: 'retour',
  retour:    'evalue',
  evalue:    'archive',
};

export async function transitionPhase(req, res) {
  try {
    const prosit = await Prosit.findById(req.params.id);
    if (!prosit) return res.status(404).json({ message: 'Prosit introuvable' });
    if (prosit.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    const next = TRANSITIONS[prosit.status];
    if (!next) return res.status(400).json({ message: 'Aucune transition possible' });

    // Verrous métier
    if (prosit.status === 'brouillon' && (!prosit.groupes || prosit.groupes.length === 0)) {
      return res.status(400).json({ message: 'Au moins un groupe requis avant publication' });
    }

    prosit.status = next;
    await prosit.save();
    res.json(prosit);
  } catch (err) {
    console.error('[prosit] transition error:', err);
    res.status(500).json({ message: 'Erreur transition de phase' });
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   ÉVALUATION (prof) → trigger XP +150 + rotation des rôles
───────────────────────────────────────────────────────────────────────── */

export async function evaluateGroupe(req, res) {
  try {
    const { id, gIdx } = req.params;
    const idx = parseInt(gIdx, 10);
    const prosit = await Prosit.findById(id);
    if (!prosit) return res.status(404).json({ message: 'Prosit introuvable' });
    if (prosit.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé' });
    }
    if (prosit.status !== 'retour') {
      return res.status(400).json({ message: 'Évaluation possible uniquement en phase retour' });
    }
    const groupe = prosit.groupes[idx];
    if (!groupe) return res.status(404).json({ message: 'Groupe introuvable' });

    const { noteGlobale, criteres = [], commentaire = '' } = req.body;
    if (typeof noteGlobale !== 'number' || noteGlobale < 0 || noteGlobale > 20) {
      return res.status(400).json({ message: 'Note globale 0-20 requise' });
    }

    groupe.evaluation = {
      noteGlobale,
      criteres,
      commentaire,
      evaluePar: req.user.id,
      evalueAt: new Date(),
    };

    // Trigger XP +150 + mise à jour de l'historique des rôles (rotation)
    const { addPoints, triggerAutoBadge } = await import('../services/points.js');

    for (const membre of groupe.membres) {
      const userId = membre.userId.toString();
      // XP +150
      await addPoints(userId, 150, 'prosit_completed').catch(err => {
        console.error(`[prosit] addPoints failed for ${userId}:`, err.message);
      });

      // Rotation des rôles : enregistrer le rôle joué dans le cycle courant
      const user = await User.findById(userId);
      if (user) {
        if (!Array.isArray(user.prositRolesDoneInCycle)) user.prositRolesDoneInCycle = [];
        if (typeof user.prositRolesCycle !== 'number')   user.prositRolesCycle = 0;
        if (!Array.isArray(user.prositRolesHistory))     user.prositRolesHistory = [];

        user.prositRolesHistory.push({
          role: membre.role,
          prositId: prosit._id,
          completedAt: new Date(),
        });

        if (!user.prositRolesDoneInCycle.includes(membre.role)) {
          user.prositRolesDoneInCycle.push(membre.role);
        }

        // Cycle complet : tous les rôles CESI faits → reset + incrément
        if (user.prositRolesDoneInCycle.length >= PROSIT_ROLES.length) {
          user.prositRolesCycle += 1;
          user.prositRolesDoneInCycle = [];
        }

        await user.save();

        // Badges spécifiques Prosit
        await triggerAutoBadge(userId, 'prosit_completed').catch(() => {});
        if (membre.role === 'animateur') {
          const animatorCount = user.prositRolesHistory.filter(h => h.role === 'animateur').length;
          if (animatorCount >= 3) {
            await triggerAutoBadge(userId, 'prosit_animator').catch(() => {});
          }
        }
        if (noteGlobale >= 18) {
          await triggerAutoBadge(userId, 'prosit_perfect').catch(() => {});
        }
      }
    }

    await prosit.save();
    res.json(groupe);
  } catch (err) {
    console.error('[prosit] evaluate error:', err);
    res.status(500).json({ message: 'Erreur évaluation' });
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   PROFIL ÉTUDIANT — Rotation des rôles
───────────────────────────────────────────────────────────────────────── */

export async function getMyRolesProgress(req, res) {
  try {
    const me = await User.findById(req.user.id)
      .select('prositRolesCycle prositRolesDoneInCycle prositRolesHistory');

    const cycle  = me?.prositRolesCycle ?? 0;
    const done   = Array.isArray(me?.prositRolesDoneInCycle) ? me.prositRolesDoneInCycle : [];
    const todo   = PROSIT_ROLES.filter(r => !done.includes(r));
    const totalCounts = {};
    for (const r of PROSIT_ROLES) totalCounts[r] = 0;
    for (const h of (me?.prositRolesHistory || [])) {
      if (totalCounts[h.role] !== undefined) totalCounts[h.role]++;
    }

    res.json({
      currentCycle: cycle,
      rolesDoneInCycle: done,
      rolesRemainingInCycle: todo,
      totalByRole: totalCounts,
      totalProsits: (me?.prositRolesHistory || []).length,
    });
  } catch (err) {
    console.error('[prosit] roles progress error:', err);
    res.status(500).json({ message: 'Erreur progression des rôles' });
  }
}
