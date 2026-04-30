import mongoose from 'mongoose';
import Groq from 'groq-sdk';
import Prosit, { PROSIT_ROLES } from '../models/Prosit.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import { pushNotification } from '../services/notificationService.js';
import { finalizeProsit, canTransitionToEvalue } from '../services/prositXP.js';

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

    // Détection plagiat IA en arrière-plan (fail-soft, jamais bloquant)
    // F2 sprint-final : si la contribution texte est suffisamment longue,
    // on lance l'analyse en background avec timeout 5s.
    const txt = membre.contributionTexte || '';
    if (txt.length >= 80) {
      const prositId = prosit._id;
      const userId = req.user.id;
      setImmediate(async () => {
        try {
          const { detectAIGenerated } = await import('../services/aiPlagiarismDetector.js');
          const report = await detectAIGenerated(txt, { timeoutMs: 5000 });
          // Re-fetch + update atomique pour éviter d'écraser des changements concurrents
          const fresh = await Prosit.findById(prositId);
          if (!fresh) return;
          const g = fresh.groupes[idx];
          if (!g) return;
          const m = g.membres.find((mm) => memberUserIdString(mm) === userId);
          if (!m) return;
          m.aiDetection = {
            aiProbability:  report.aiProbability,
            heuristicScore: report.heuristicScore,
            groqScore:      report.groqScore,
            flags:          report.flags,
            reasons:        report.reasons,
            checkedAt:      report.checkedAt,
            textPreview:    txt.slice(0, 200),
          };
          await fresh.save();
        } catch (err) {
          console.error('[prosit] aiDetection background error:', err.message);
        }
      });
    }

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

    // retour → evalue : bloqué tant que tous les peer assessments ne sont
    // pas faits OU que la deadline n'est pas dépassée (Falchikov 2005).
    if (prosit.status === 'retour' && next === 'evalue') {
      const allEvaluated = (prosit.groupes || []).length > 0 &&
        (prosit.groupes || []).every((g) => g.evaluation?.noteGlobale != null);
      if (!allEvaluated) {
        return res.status(400).json({
          message: 'Évaluez tous les groupes avant de passer en phase Évaluée.',
        });
      }
      const gate = canTransitionToEvalue(prosit);
      if (!gate.ok) {
        return res.status(400).json({
          message: `Évaluations par les pairs incomplètes (${gate.completed}/${gate.expected} dans "${gate.groupName}"). Attendez la deadline ou relancez les étudiants.`,
          peerAssessmentDeadline: prosit.peerAssessmentDeadline,
          ...gate,
        });
      }
      // Tout est prêt : on finalise (calcul scores + XP individualisées)
      await finalizeProsit(prosit._id);
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

    // Rotation des rôles : enregistrer le rôle joué dans le cycle courant
    // (effectif dès l'évaluation prof, indépendamment du peer assessment)
    const { triggerAutoBadge } = await import('../services/points.js');
    for (const membre of groupe.membres) {
      const userId = memberUserIdString(membre);
      if (!userId) continue;
      const user = await User.findById(userId);
      if (!user) continue;

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
      if (user.prositRolesDoneInCycle.length >= PROSIT_ROLES.length) {
        user.prositRolesCycle += 1;
        user.prositRolesDoneInCycle = [];
      }
      await user.save();

      if (membre.role === 'animateur') {
        const animatorCount = user.prositRolesHistory.filter((h) => h.role === 'animateur').length;
        if (animatorCount >= 3) {
          await triggerAutoBadge(userId, 'prosit_animator').catch(() => {});
        }
      }
    }

    // Auto-finalisation : si tous les groupes ont une note ET (peer assessments
    // complets OU deadline dépassée), on calcule les notes individuelles +
    // XP individualisées et on transitionne en 'evalue'. Sinon on attend.
    const allEvaluated = prosit.groupes.length > 0 &&
      prosit.groupes.every((g) => g.evaluation?.noteGlobale != null);

    let didFinalize = false;
    if (allEvaluated && prosit.status === 'retour') {
      const gate = canTransitionToEvalue(prosit);
      if (gate.ok) {
        await prosit.save();           // persiste l'évaluation prof avant finalize
        await finalizeProsit(prosit._id);
        const fresh = await Prosit.findById(prosit._id);
        fresh.status = 'evalue';
        await fresh.save();
        Object.assign(prosit, fresh.toObject());
        didFinalize = true;
      }
    }

    if (!didFinalize) {
      await prosit.save();
    }

    // Notification temps réel aux membres du groupe évalué
    const io = req.app.get('io');
    if (io) {
      const xpMessage = didFinalize
        ? 'Note de groupe et notes individuelles publiées (XP attribuées selon ton implication).'
        : 'Note de groupe enregistrée — les XP individualisées seront attribuées à la clôture des évaluations par les pairs.';

      await Promise.all(groupe.membres.map(m =>
        pushNotification(io, {
          userId: memberUserIdString(m),
          type: 'prosit_evaluated',
          priority: 'high',
          title: `✅ Prosit évalué : ${noteGlobale}/20`,
          message: `Le Prosit "${prosit.titre}" a été évalué par ton tuteur. ${xpMessage}`,
          link: `/prosits/${prosit._id}`,
          relatedType: 'prosit',
          relatedId: prosit._id,
        }).catch(err => console.error('[prosit evaluate notify]', err.message))
      ));

      if (didFinalize) {
        await notifyPrositMembers(req, prosit, {
          type: 'prosit_phase',
          priority: 'normal',
          title: '💡 Phase Évaluée',
          message: `Le Prosit "${prosit.titre}" est entièrement évalué. Tu peux désormais consulter les solutions des autres groupes et ta note finale.`,
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

/* ─────────────────────────────────────────────────────────────────────────
   ÉVALUATION PAR LES PAIRS (Falchikov 2005, Topping 1998)
───────────────────────────────────────────────────────────────────────── */

/**
 * Auto-évaluation d'un membre : il note son propre travail (effort, quality,
 * communication) et rédige une réflexion métacognitive ("Qu'as-tu appris ?").
 *
 * Idempotent : si l'utilisateur a déjà soumis, on remplace l'entrée existante.
 */
export async function postSelfAssessment(req, res) {
  try {
    const { id, gIdx } = req.params;
    const idx = parseInt(gIdx, 10);
    const prosit = await Prosit.findById(id);
    if (!prosit) return res.status(404).json({ message: 'Prosit introuvable' });
    if (!prosit.peerAssessmentEnabled) return res.status(400).json({ message: 'Évaluation par les pairs désactivée pour ce Prosit' });
    const groupe = prosit.groupes[idx];
    if (!groupe) return res.status(404).json({ message: 'Groupe introuvable' });

    if (!['retour', 'evalue'].includes(prosit.status)) {
      return res.status(400).json({ message: 'Auto-évaluation ouverte en phase Retour uniquement' });
    }

    const isMember = groupe.membres.some((m) => memberUserIdString(m) === req.user.id);
    if (!isMember) return res.status(403).json({ message: 'Non membre de ce groupe' });

    const deadline = prosit.peerAssessmentDeadline;
    if (deadline && new Date(deadline) < new Date()) {
      return res.status(400).json({ message: 'Deadline d\'auto-évaluation dépassée. Contacte ton prof.' });
    }

    const { criteria = {}, reflection = '' } = req.body;
    const cleanCriteria = {
      effort:        clampStar(criteria.effort),
      quality:       clampStar(criteria.quality),
      communication: clampStar(criteria.communication),
    };

    // Remplace l'entrée existante (idempotence)
    groupe.selfAssessments = (groupe.selfAssessments || []).filter(
      (s) => s.userId?.toString() !== req.user.id
    );
    groupe.selfAssessments.push({
      userId:      req.user.id,
      criteria:    cleanCriteria,
      reflection:  String(reflection || '').slice(0, 1000),
      completedAt: new Date(),
    });

    await prosit.save();
    res.json({ ok: true, selfAssessment: groupe.selfAssessments.find(s => s.userId.toString() === req.user.id) });
  } catch (err) {
    console.error('[prosit] postSelfAssessment:', err);
    res.status(500).json({ message: 'Erreur auto-évaluation' });
  }
}

/**
 * Évaluation d'un coéquipier (peer assessment).
 *
 * Anonymat par défaut (Topping, 1998) : `isAnonymous = true` cache l'identité
 * de l'évaluateur côté étudiant ; le prof voit toujours qui a noté qui pour
 * détecter les comportements problématiques.
 *
 * Idempotent : un même évaluateur ne peut noter qu'une seule fois chaque
 * cible. Une nouvelle soumission remplace l'ancienne.
 */
export async function postPeerAssessment(req, res) {
  try {
    const { id, gIdx } = req.params;
    const idx = parseInt(gIdx, 10);
    const prosit = await Prosit.findById(id);
    if (!prosit) return res.status(404).json({ message: 'Prosit introuvable' });
    if (!prosit.peerAssessmentEnabled) return res.status(400).json({ message: 'Évaluation par les pairs désactivée pour ce Prosit' });
    const groupe = prosit.groupes[idx];
    if (!groupe) return res.status(404).json({ message: 'Groupe introuvable' });

    if (!['retour', 'evalue'].includes(prosit.status)) {
      return res.status(400).json({ message: 'Évaluation par les pairs ouverte en phase Retour uniquement' });
    }

    const isMember = groupe.membres.some((m) => memberUserIdString(m) === req.user.id);
    if (!isMember) return res.status(403).json({ message: 'Non membre de ce groupe' });

    const deadline = prosit.peerAssessmentDeadline;
    if (deadline && new Date(deadline) < new Date()) {
      return res.status(400).json({ message: 'Deadline d\'évaluation par les pairs dépassée.' });
    }

    const { targetId, criteria = {}, comment = '', isAnonymous = true } = req.body;
    if (!targetId) return res.status(400).json({ message: 'targetId requis' });
    if (targetId === req.user.id) return res.status(400).json({ message: 'Utilisez l\'auto-évaluation pour vous noter vous-même' });

    const targetIsMember = groupe.membres.some((m) => memberUserIdString(m) === targetId);
    if (!targetIsMember) return res.status(400).json({ message: 'La cible n\'appartient pas à ton groupe' });

    const cleanCriteria = {
      participation:   clampStar(criteria.participation),
      contribution:    clampStar(criteria.contribution),
      teamSpirit:      clampStar(criteria.teamSpirit),
      deadlineRespect: clampStar(criteria.deadlineRespect),
      listening:       clampStar(criteria.listening),
    };

    // Remplace l'évaluation existante (evaluator → target)
    groupe.peerAssessments = (groupe.peerAssessments || []).filter(
      (p) => !(p.evaluatorId?.toString() === req.user.id && p.targetId?.toString() === targetId)
    );
    groupe.peerAssessments.push({
      evaluatorId: req.user.id,
      targetId,
      criteria:    cleanCriteria,
      comment:     String(comment || '').slice(0, 500),
      isAnonymous: isAnonymous !== false,
      completedAt: new Date(),
    });

    await prosit.save();
    res.json({ ok: true, count: groupe.peerAssessments.filter((p) => p.evaluatorId.toString() === req.user.id).length });
  } catch (err) {
    console.error('[prosit] postPeerAssessment:', err);
    res.status(500).json({ message: 'Erreur évaluation par les pairs' });
  }
}

/**
 * Récapitule pour l'étudiant authentifié :
 *   - le statut de son auto-évaluation
 *   - la liste de ses coéquipiers + statut d'évaluation pour chacun
 *   - la deadline et si elle est passée
 *
 * Endpoint clé pour piloter l'UI de la page peer-assessment.
 */
export async function getMyAssessmentsStatus(req, res) {
  try {
    const prosit = await Prosit.findById(req.params.id)
      .populate('groupes.membres.userId', 'prenom nom');
    if (!prosit) return res.status(404).json({ message: 'Prosit introuvable' });
    if (!prosit.peerAssessmentEnabled) {
      return res.json({ enabled: false, message: 'Évaluation par les pairs désactivée' });
    }

    const myGroupIdx = findUserGroupIndex(prosit, req.user.id);
    if (myGroupIdx < 0) {
      return res.json({ enabled: true, inGroup: false });
    }
    const groupe = prosit.groupes[myGroupIdx];

    const teammates = (groupe.membres || [])
      .filter((m) => memberUserIdString(m) !== req.user.id)
      .map((m) => {
        const uid = memberUserIdString(m);
        const u = m.userId && typeof m.userId === 'object' ? m.userId : null;
        const evaluated = (groupe.peerAssessments || []).some(
          (p) => p.evaluatorId?.toString() === req.user.id && p.targetId?.toString() === uid
        );
        return {
          userId: uid,
          prenom: u?.prenom || '',
          nom:    u?.nom    || '',
          role:   m.role,
          evaluated,
        };
      });

    const selfDone = (groupe.selfAssessments || []).some(
      (s) => s.userId?.toString() === req.user.id
    );

    const deadline = prosit.peerAssessmentDeadline;
    const deadlinePassed = deadline ? new Date(deadline) < new Date() : false;

    res.json({
      enabled:         true,
      inGroup:         true,
      groupIndex:      myGroupIdx,
      selfDone,
      teammates,
      totalTeammates:  teammates.length,
      evaluatedCount:  teammates.filter((t) => t.evaluated).length,
      deadline,
      deadlinePassed,
      phase:           prosit.status,
      canSubmit:       !deadlinePassed && ['retour', 'evalue'].includes(prosit.status),
    });
  } catch (err) {
    console.error('[prosit] getMyAssessmentsStatus:', err);
    res.status(500).json({ message: 'Erreur statut évaluations' });
  }
}

/**
 * Vue prof : compteur d'évaluations par les pairs effectuées vs attendues
 * pour chaque groupe. Permet de relancer ou d'étendre la deadline.
 */
export async function getPeerAssessmentSummary(req, res) {
  try {
    const prosit = await Prosit.findById(req.params.id);
    if (!prosit) return res.status(404).json({ message: 'Prosit introuvable' });
    if (prosit.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    const summary = (prosit.groupes || []).map((g, i) => {
      const memberIds = (g.membres || []).map((m) => memberUserIdString(m)).filter(Boolean);
      const expected  = memberIds.length >= 2 ? memberIds.length * (memberIds.length - 1) : 0;
      const completed = (g.peerAssessments || []).filter(
        (p) => memberIds.includes(p.evaluatorId?.toString()) &&
               memberIds.includes(p.targetId?.toString())
      ).length;
      const selfDone  = (g.selfAssessments || []).length;
      return {
        groupIndex: i,
        nom:        g.nom,
        memberCount: memberIds.length,
        expected,
        completed,
        selfDone,
        selfExpected: memberIds.length,
      };
    });

    res.json({
      enabled:  prosit.peerAssessmentEnabled,
      deadline: prosit.peerAssessmentDeadline,
      summary,
    });
  } catch (err) {
    console.error('[prosit] getPeerAssessmentSummary:', err);
    res.status(500).json({ message: 'Erreur résumé peer assessment' });
  }
}

/**
 * Le prof étend (ou raccourcit) la deadline d'évaluation par les pairs.
 * Body : { deadline: ISO date string }
 */
export async function extendPeerAssessmentDeadline(req, res) {
  try {
    const prosit = await Prosit.findById(req.params.id);
    if (!prosit) return res.status(404).json({ message: 'Prosit introuvable' });
    if (prosit.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé' });
    }
    const { deadline } = req.body;
    if (!deadline) return res.status(400).json({ message: 'deadline requise (ISO)' });
    const d = new Date(deadline);
    if (isNaN(d.getTime())) return res.status(400).json({ message: 'deadline invalide' });
    prosit.peerAssessmentDeadline = d;
    await prosit.save();
    res.json({ ok: true, peerAssessmentDeadline: prosit.peerAssessmentDeadline });
  } catch (err) {
    console.error('[prosit] extendPeerAssessmentDeadline:', err);
    res.status(500).json({ message: 'Erreur prolongation deadline' });
  }
}

/**
 * GET /api/prosits/:id/eligible-students
 * Liste les étudiants éligibles à ce Prosit (même filière + même promotion).
 * Réservé au prof propriétaire / admin pour la composition manuelle des groupes.
 */
export async function getEligibleStudents(req, res) {
  try {
    const prosit = await Prosit.findById(req.params.id);
    if (!prosit) return res.status(404).json({ message: 'Prosit introuvable' });
    if (prosit.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    const students = await User.find({
      role: 'etudiant',
      isActive: { $ne: false },
      status: { $ne: 'rejected' },
      filiere: prosit.filiere,
      promotion: prosit.promotion,
    })
      .select('prenom nom email')
      .sort({ nom: 1, prenom: 1 })
      .lean();

    // Marqueur : est déjà dans un groupe de CE prosit ?
    const alreadyAssigned = new Set();
    for (const g of prosit.groupes || []) {
      for (const m of g.membres || []) {
        const id = (m.userId?._id || m.userId)?.toString?.();
        if (id) alreadyAssigned.add(id);
      }
    }

    res.json({
      filiere: prosit.filiere,
      promotion: prosit.promotion,
      students: students.map((s) => ({
        _id: s._id,
        prenom: s.prenom,
        nom: s.nom,
        email: s.email,
        alreadyAssigned: alreadyAssigned.has(s._id.toString()),
      })),
    });
  } catch (err) {
    console.error('[prosit] getEligibleStudents:', err);
    res.status(500).json({ message: 'Erreur liste étudiants éligibles' });
  }
}

/**
 * GET /api/prosits/:id/ai-report
 * Rapport d'intégrité IA pour un prof : pour chaque groupe et chaque membre,
 * renvoie le score aiProbability + flags + extrait tronqué (200 chars).
 *
 * Privacy : on NE renvoie JAMAIS le texte intégral, seulement le textPreview
 * stocké au moment de la détection. Cohérent avec Mitchell et al. (2023) :
 * le rapport est un signal au prof, pas une preuve auto-incriminante.
 *
 * Tri : par aiProbability décroissant pour mettre les cas suspects en haut.
 */
export async function getAiReport(req, res) {
  try {
    const prosit = await Prosit.findById(req.params.id)
      .populate('groupes.membres.userId', 'prenom nom email');
    if (!prosit) return res.status(404).json({ message: 'Prosit introuvable' });
    if (prosit.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    const groupReports = (prosit.groupes || []).map((g, gIdx) => {
      const members = (g.membres || [])
        .map((m) => {
          const u = m.userId && typeof m.userId === 'object' ? m.userId : null;
          const det = m.aiDetection;
          return {
            userId:        u?._id?.toString?.() || (typeof m.userId === 'object' ? null : m.userId?.toString()),
            prenom:        u?.prenom || '',
            nom:           u?.nom    || '',
            role:          m.role,
            hasContribution: !!(m.contributionTexte && m.contributionTexte.trim().length >= 80),
            aiProbability: det?.aiProbability ?? null,
            heuristicScore:det?.heuristicScore ?? null,
            groqScore:     det?.groqScore ?? null,
            flags:         det?.flags || [],
            reasons:       det?.reasons || [],
            textPreview:   det?.textPreview || '',
            checkedAt:     det?.checkedAt || null,
          };
        })
        .sort((a, b) => (b.aiProbability ?? -1) - (a.aiProbability ?? -1));

      return {
        groupIndex: gIdx,
        nom:        g.nom,
        members,
        suspectsCount: members.filter((m) => (m.aiProbability ?? 0) >= 70).length,
      };
    });

    res.json({
      prositId: prosit._id,
      titre: prosit.titre,
      groups: groupReports,
      generatedAt: new Date(),
    });
  } catch (err) {
    console.error('[prosit] getAiReport:', err);
    res.status(500).json({ message: 'Erreur rapport intégrité IA' });
  }
}

/* Helpers locaux */
function clampStar(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(1, Math.min(5, Math.round(n)));
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
