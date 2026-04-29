import mongoose from 'mongoose';
import Groq from 'groq-sdk';
import Prosit, { PROSIT_ROLES } from '../models/Prosit.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import { pushNotification } from '../services/notificationService.js';

let groq;
function getGroq() {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
}

/**
 * Helper : envoie une notification temps réel (Socket.io + DB) à tous les
 * membres des groupes d'un Prosit. L'instance io est récupérée depuis
 * `req.app.get('io')` (set dans server.js).
 */
async function notifyPrositMembers(req, prosit, payload) {
  const io = req.app.get('io');
  if (!io) return;
  const memberIds = new Set();
  for (const g of prosit.groupes || []) {
    for (const m of g.membres || []) {
      const id = memberUserIdString(m);
      if (id) memberIds.add(id);
    }
  }
  await Promise.all([...memberIds].map(userId =>
    pushNotification(io, { ...payload, userId, relatedType: 'prosit', relatedId: prosit._id })
      .catch(err => console.error('[prosit notify]', err.message))
  ));
}

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────── */

/**
 * Extrait l'ID utilisateur d'un membre Prosit, que la ref soit populée
 * (User document — `.userId._id`) ou non (ObjectId brut — `.userId`).
 * Retourne une chaîne, ou null si introuvable.
 */
function memberUserIdString(m) {
  const u = m?.userId;
  if (!u) return null;
  // populé ? User document a un _id
  if (u._id) return u._id.toString();
  // ObjectId brut ou string
  return u.toString();
}

/**
 * Détermine si un utilisateur est dans un des groupes d'un Prosit.
 */
function findUserGroupIndex(prosit, userId) {
  if (!prosit?.groupes || !userId) return -1;
  const target = userId.toString();
  return prosit.groupes.findIndex(g =>
    g.membres?.some(m => memberUserIdString(m) === target)
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

    if (!titre || !enonce || !filiere || !promotion || !dateAller || !dateRetour) {
      return res.status(400).json({ message: 'Champs obligatoires manquants' });
    }

    // courseId optionnel : si fourni, on vérifie son existence ; sinon null.
    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course) return res.status(404).json({ message: 'Cours introuvable' });
    }

    const prosit = await Prosit.create({
      titre, description, enonce, motsCles, objectifsApprentissage,
      courseId: courseId || null,
      filiere, promotion, caseEntreprise,
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
      g.membres = g.membres.filter(m => memberUserIdString(m) !== userId);
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

    // Vérifier que l'étudiant est membre du groupe (helper gère la ref populée)
    const isMember = prosit.groupes[idx].membres.some(m => memberUserIdString(m) === req.user.id);
    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non membre de ce groupe' });
    }

    // Champs éditables selon la phase :
    //   - aller   : espace collaboratif (mots-clés, problématique, hypothèses, plan)
    //   - recherche : VERROUILLÉ — la contribution individuelle passe par /contribution
    //   - retour  : solution finale uniquement
    let fields = [];
    if (prosit.status === 'aller') {
      fields = ['motsClesIdentifies', 'problematiqueReformulee', 'hypotheses', 'planAction'];
    } else if (prosit.status === 'retour') {
      fields = ['solutionTexte', 'solutionFichier'];
    } else {
      return res.status(400).json({
        message: prosit.status === 'recherche'
          ? 'Espace collaboratif verrouillé en phase recherche. Utilisez /contribution pour votre travail individuel.'
          : 'Phase verrouillée',
      });
    }

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

    const membre = prosit.groupes[idx].membres.find(m => memberUserIdString(m) === req.user.id);
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

    // Notification temps réel à tous les membres
    const phaseLabels = {
      aller:     'Phase Aller ouverte',
      recherche: 'Phase Recherche commencée',
      retour:    'Phase Retour ouverte',
      evalue:    'Évaluation publiée',
      archive:   'Prosit archivé',
    };
    if (phaseLabels[next]) {
      await notifyPrositMembers(req, prosit, {
        type: 'prosit_phase',
        priority: 'normal',
        title: `💡 ${phaseLabels[next]}`,
        message: `Le Prosit "${prosit.titre}" est passé en ${next}.`,
        link: `/prosits/${prosit._id}`,
      });
    }

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
      const userId = memberUserIdString(membre);
      if (!userId) continue;
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

    // Auto-transition retour → evalue dès que TOUS les groupes ont une note.
    // Permet de basculer la visibilité publique entre groupes sans demander
    // au prof de cliquer une transition supplémentaire.
    const allEvaluated = prosit.groupes.length > 0 &&
      prosit.groupes.every(g => g.evaluation?.noteGlobale != null);
    if (allEvaluated && prosit.status === 'retour') {
      prosit.status = 'evalue';
    }

    await prosit.save();

    // Notification temps réel aux membres du groupe évalué
    const io = req.app.get('io');
    if (io) {
      await Promise.all(groupe.membres.map(m =>
        pushNotification(io, {
          userId: memberUserIdString(m),
          type: 'prosit_evaluated',
          priority: 'high',
          title: `✅ Prosit évalué : ${noteGlobale}/20`,
          message: `Le Prosit "${prosit.titre}" a été évalué par ton tuteur. +150 XP attribués !`,
          link: `/prosits/${prosit._id}`,
          relatedType: 'prosit',
          relatedId: prosit._id,
        }).catch(err => console.error('[prosit evaluate notify]', err.message))
      ));

      // Si on vient juste de basculer en 'evalue', notifier aussi tous les
      // autres membres : ils peuvent maintenant voir les autres groupes.
      if (allEvaluated) {
        await notifyPrositMembers(req, prosit, {
          type: 'prosit_phase',
          priority: 'normal',
          title: '💡 Phase Évaluée',
          message: `Le Prosit "${prosit.titre}" est entièrement évalué. Tu peux désormais consulter les solutions des autres groupes.`,
          link: `/prosits/${prosit._id}`,
        });
      }
    }

    res.json(groupe);
  } catch (err) {
    console.error('[prosit] evaluate error:', err);
    res.status(500).json({ message: 'Erreur évaluation' });
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   PROFIL ÉTUDIANT — Rotation des rôles
───────────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────────
   AIDE IA — POST /api/prosits/:id/ai-help
   Tuteur Groq adapté au contexte Prosit (phase courante, cas entreprise,
   mots-clés, cours associé). Pas de quota appliqué (parité avec
   projectController.getAiHelp).
───────────────────────────────────────────────────────────────────────── */

const PHASE_GUIDANCE = {
  brouillon: 'Le Prosit est encore en brouillon — aide-moi à comprendre la situation à venir.',
  aller:     'Phase Aller : aide-moi à reformuler la problématique, identifier des hypothèses pertinentes et un plan d\'action.',
  recherche: 'Phase Recherche : aide-moi à structurer mon travail individuel, identifier des sources fiables et orienter mes investigations.',
  retour:    'Phase Retour : aide-moi à structurer la solution finale, anticiper les questions du jury et préparer la restitution.',
  evalue:    'Phase Évaluée : aide-moi à analyser ce qui a été bien fait et les points d\'amélioration.',
  archive:   'Le Prosit est archivé — tu peux donner un retour rétrospectif.',
};

export async function getAiHelp(req, res) {
  try {
    const prosit = await Prosit.findById(req.params.id)
      .populate('createdBy', 'filiere promotion')
      .populate('courseId', 'titre description');

    if (!prosit) return res.status(404).json({ message: 'Prosit introuvable.' });

    const phaseGuidance = PHASE_GUIDANCE[prosit.status] || PHASE_GUIDANCE.aller;
    const courseContext = prosit.courseId
      ? `Le Prosit est ancré dans le cours « ${prosit.courseId.titre} »${prosit.courseId.description ? ` (${prosit.courseId.description})` : ''}. `
      : 'Le Prosit n\'est rattaché à aucun cours spécifique (transverse). ';

    const motsCles = (prosit.motsCles ?? []).filter(Boolean).join(', ') || 'aucun mot-clé défini';
    const objectifs = (prosit.objectifsApprentissage ?? []).filter(Boolean).join(' ; ') || 'objectifs non précisés';
    const caseEntreprise = prosit.caseEntreprise?.trim() || 'aucun cas spécifique';

    // Mots-clés identifiés par le groupe de l'étudiant en phase Aller, si applicable
    let groupKeywords = '';
    if (req.user.role === 'etudiant') {
      const target = req.user.id.toString();
      const myGroup = (prosit.groupes ?? []).find(g =>
        (g.membres ?? []).some(m => {
          const u = m?.userId;
          if (!u) return false;
          return (u._id ? u._id.toString() : u.toString()) === target;
        })
      );
      if (myGroup) {
        const gk = (myGroup.motsClesIdentifies ?? []).filter(Boolean).join(', ');
        if (gk) groupKeywords = `\nMots-clés identifiés par mon groupe en phase Aller : ${gk}.`;
      }
    }

    const systemPrompt = `Tu es un tuteur pédagogique expert en méthodologie APP/CESI (Apprentissage Par Problème) pour une université algérienne.
Tu accompagnes des étudiants en ${prosit.filiere} niveau ${prosit.promotion}.
Tu réponds TOUJOURS en français.
Tes conseils sont adaptés au contexte algérien et à la phase courante du Prosit.
Tu privilégies des ressources gratuites accessibles depuis l'Algérie.`;

    const userPrompt = `Contexte du Prosit :
Titre : ${prosit.titre}
Énoncé : ${prosit.enonce}
${courseContext}
Cas d'entreprise : ${caseEntreprise}
Mots-clés du Prosit : ${motsCles}
Objectifs d'apprentissage : ${objectifs}
Phase actuelle : ${prosit.status}.${groupKeywords}

${phaseGuidance}

Donne :
1. 3 ressources en ligne gratuites adaptées à cette phase (tutoriels, docs, articles)
2. 2 conseils méthodologiques spécifiques à la phase ${prosit.status}
3. 1 piste de réflexion ou cas concret pertinent en Algérie ou région MENA

Formate ta réponse avec des sections claires.`;

    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 1200,
    });

    const response = completion.choices?.[0]?.message?.content || 'Aucune suggestion disponible.';
    res.json({ suggestions: response, phase: prosit.status });
  } catch (err) {
    console.error('[prosit] getAiHelp error:', err.message);
    res.status(500).json({ message: 'Erreur lors de la génération de suggestions IA.' });
  }
}

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
