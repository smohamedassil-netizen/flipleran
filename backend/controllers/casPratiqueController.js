/**
 * casPratiqueController.js — Endpoints pour le nouveau flow "Cas pratique"
 * (refonte 2026-05-09 du système Prosit).
 *
 * Opère exclusivement sur les nouveaux champs du modèle Prosit :
 *   statut, groupMembers, cadrageDocument, livrables, bilanDocument, notes,
 *   resources, contexte, problematique, chapterIds, phaseCadrageDate, phaseBilanDate.
 *
 * Le pre-save hook du modèle garde le legacy `status` en cohérence pour
 * l'ancien controller (rétrocompat — non utilisé après Phase 4/5).
 *
 * URL : /api/cas-pratiques/*
 */
import mongoose from 'mongoose';
import Prosit from '../models/Prosit.js';
import User from '../models/User.js';
import { suggestRoles } from '../services/roleRotation.js';
import { pushNotification } from '../services/notificationService.js';

const STATUTS = ['planifie', 'cadrage_en_cours', 'travail_individuel', 'bilan_en_cours', 'evalue'];
const ROLES = ['animateur', 'scribe', 'membre'];

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────── */

function isOwnerOrAdmin(prosit, user) {
  return prosit.createdBy.toString() === user.id || user.role === 'admin';
}

function findGroupMember(prosit, userId) {
  const target = userId.toString();
  return (prosit.groupMembers || []).find((m) => m.studentId.toString() === target) || null;
}

async function notifyMembers(req, prosit, payload) {
  const io = req.app.get('io');
  if (!io) return;
  const ids = (prosit.groupMembers || []).map((m) => m.studentId.toString());
  await Promise.all(
    ids.map((userId) =>
      pushNotification(io, {
        ...payload,
        userId,
        relatedType: 'prosit',
        relatedId: prosit._id,
      }).catch((err) => console.error('[caspratique notify]', err.message))
    )
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   LECTURE
───────────────────────────────────────────────────────────────────────── */

/**
 * GET /api/cas-pratiques?courseId=X&statut=Y
 * Liste les cas pratiques. Étudiant voit ceux dont il est membre OU ceux du
 * cours auquel il est inscrit. Prof voit ceux qu'il a créés.
 */
export async function listCasPratiques(req, res) {
  try {
    const filter = {};
    if (req.query.courseId) filter.courseId = req.query.courseId;
    if (req.query.statut && STATUTS.includes(req.query.statut)) filter.statut = req.query.statut;

    if (req.user.role === 'professeur') {
      filter.createdBy = req.user.id;
    } else if (req.user.role === 'etudiant') {
      filter['groupMembers.studentId'] = req.user.id;
    }

    const list = await Prosit.find(filter)
      .populate('createdBy', 'prenom nom')
      .populate('courseId', 'titre')
      .sort({ phaseCadrageDate: -1, createdAt: -1 })
      .lean();

    res.json(list);
  } catch (err) {
    console.error('[caspratique] list:', err);
    res.status(500).json({ message: 'Erreur liste cas pratiques' });
  }
}

/**
 * GET /api/cas-pratiques/:id
 */
export async function getCasPratique(req, res) {
  try {
    const cp = await Prosit.findById(req.params.id)
      .populate('createdBy', 'prenom nom')
      .populate('courseId', 'titre')
      .populate('groupMembers.studentId', 'prenom nom email')
      .populate('cadrageDocument.redigePar', 'prenom nom')
      .populate('cadrageDocument.validatedBy', 'prenom nom')
      .populate('bilanDocument.redigePar', 'prenom nom')
      .populate('bilanDocument.validatedBy', 'prenom nom')
      .populate('livrables.studentId', 'prenom nom')
      .populate('notes.studentId', 'prenom nom')
      .lean();

    if (!cp) return res.status(404).json({ message: 'Cas pratique introuvable' });

    // ACL : étudiant doit être membre OU le cas est en evalue
    if (req.user.role === 'etudiant') {
      const isMember = (cp.groupMembers || []).some(
        (m) => (m.studentId?._id || m.studentId).toString() === req.user.id
      );
      if (!isMember && cp.statut !== 'evalue') {
        return res.status(403).json({ message: 'Non autorisé' });
      }
    }

    res.json(cp);
  } catch (err) {
    console.error('[caspratique] get:', err);
    res.status(500).json({ message: 'Erreur lecture cas pratique' });
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   CRUD PROF
───────────────────────────────────────────────────────────────────────── */

/**
 * POST /api/cas-pratiques
 * Création par un prof. Champs requis : titre, courseId, contexte, problematique.
 * Optionnels : description, chapterIds, resources, phaseCadrageDate, phaseBilanDate, groupMembers.
 */
export async function createCasPratique(req, res) {
  try {
    const {
      titre, description, contexte, problematique,
      courseId, chapterIds,
      resources,
      phaseCadrageDate, phaseBilanDate,
      groupMembers,
      filiere, promotion, // optionnels — récupérés du cours sinon
    } = req.body;

    if (!titre || !contexte || !problematique) {
      return res.status(400).json({ message: 'titre, contexte et problematique sont requis' });
    }
    if (!courseId) {
      return res.status(400).json({ message: 'courseId requis' });
    }

    // Validation calendrier
    if (phaseCadrageDate && phaseBilanDate) {
      const c = new Date(phaseCadrageDate), b = new Date(phaseBilanDate);
      const diffDays = (b - c) / (1000 * 60 * 60 * 24);
      if (diffDays < 5) {
        return res.status(400).json({
          message: 'La date du Bilan doit être au moins 5 jours après le Cadrage',
        });
      }
    }

    // Validation rôles : exactement 1 animateur, 1 scribe, le reste membres
    if (Array.isArray(groupMembers) && groupMembers.length > 0) {
      const counts = { animateur: 0, scribe: 0, membre: 0 };
      for (const m of groupMembers) {
        if (!ROLES.includes(m.role)) {
          return res.status(400).json({ message: `Rôle invalide : ${m.role}` });
        }
        counts[m.role]++;
      }
      if (counts.animateur !== 1 || counts.scribe !== 1) {
        return res.status(400).json({
          message: 'Le groupe doit avoir exactement 1 animateur et 1 scribe',
        });
      }
    }

    const cp = await Prosit.create({
      titre: titre.trim(),
      description: description || '',
      contexte,
      problematique,
      courseId,
      chapterIds: chapterIds || [],
      resources: (resources || []).slice(0, 5), // cap à 5 ressources
      phaseCadrageDate: phaseCadrageDate || null,
      phaseBilanDate: phaseBilanDate || null,
      groupMembers: groupMembers || [],
      createdBy: req.user.id,
      statut: 'planifie',
      // legacy fields requis par l'ancien schéma — on remplit par défaut depuis le user
      filiere: filiere || req.user.filiere || 'ISIL',
      promotion: promotion || req.user.promotion || 'L3',
      enonce: contexte, // legacy : on copie contexte dans enonce
      dateAller: phaseCadrageDate || new Date(),
      dateRetour: phaseBilanDate || new Date(Date.now() + 7 * 86400000),
    });

    res.status(201).json(cp);
  } catch (err) {
    console.error('[caspratique] create:', err);
    res.status(500).json({ message: 'Erreur création cas pratique', detail: err.message });
  }
}

/**
 * PUT /api/cas-pratiques/:id
 */
export async function updateCasPratique(req, res) {
  try {
    const cp = await Prosit.findById(req.params.id);
    if (!cp) return res.status(404).json({ message: 'Cas pratique introuvable' });
    if (!isOwnerOrAdmin(cp, req.user)) return res.status(403).json({ message: 'Non autorisé' });

    if (cp.statut !== 'planifie' && cp.statut !== 'cadrage_en_cours') {
      return res.status(400).json({
        message: 'Édition impossible une fois le travail individuel commencé',
      });
    }

    const editable = [
      'titre', 'description', 'contexte', 'problematique',
      'chapterIds', 'resources',
      'phaseCadrageDate', 'phaseBilanDate',
    ];
    for (const k of editable) {
      if (req.body[k] !== undefined) cp[k] = req.body[k];
    }
    if (Array.isArray(req.body.resources)) cp.resources = req.body.resources.slice(0, 5);

    await cp.save();
    res.json(cp);
  } catch (err) {
    console.error('[caspratique] update:', err);
    res.status(500).json({ message: 'Erreur mise à jour' });
  }
}

/**
 * DELETE /api/cas-pratiques/:id
 */
export async function deleteCasPratique(req, res) {
  try {
    const cp = await Prosit.findById(req.params.id);
    if (!cp) return res.status(404).json({ message: 'Cas pratique introuvable' });
    if (!isOwnerOrAdmin(cp, req.user)) return res.status(403).json({ message: 'Non autorisé' });
    if (cp.statut === 'evalue') {
      return res.status(400).json({ message: 'Suppression impossible une fois évalué' });
    }
    await cp.deleteOne();
    res.json({ message: 'Cas pratique supprimé' });
  } catch (err) {
    console.error('[caspratique] delete:', err);
    res.status(500).json({ message: 'Erreur suppression' });
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   COMPOSITION DU GROUPE
───────────────────────────────────────────────────────────────────────── */

/**
 * POST /api/cas-pratiques/:id/group
 * Body : { members: [{studentId, role}] } OU { studentIds: [...], autoRotate: true }
 * Compose le groupe. Si autoRotate, calcule la rotation depuis l'historique.
 */
export async function setGroup(req, res) {
  try {
    const cp = await Prosit.findById(req.params.id);
    if (!cp) return res.status(404).json({ message: 'Cas pratique introuvable' });
    if (!isOwnerOrAdmin(cp, req.user)) return res.status(403).json({ message: 'Non autorisé' });
    if (cp.statut !== 'planifie') {
      return res.status(400).json({
        message: 'Composition du groupe possible uniquement avant le Cadrage',
      });
    }

    let members;
    if (req.body.autoRotate && Array.isArray(req.body.studentIds)) {
      members = await suggestRoles(req.body.studentIds, cp.courseId);
      members = members.map(({ studentId, role }) => ({ studentId, role }));
    } else if (Array.isArray(req.body.members)) {
      members = req.body.members;
    } else {
      return res.status(400).json({
        message: 'Body : { members: [...] } ou { studentIds: [...], autoRotate: true }',
      });
    }

    // Validation : 1 animateur + 1 scribe + reste membres, taille 3-12
    if (members.length < 3 || members.length > 12) {
      return res.status(400).json({ message: 'Le groupe doit avoir entre 3 et 12 étudiants' });
    }
    const counts = { animateur: 0, scribe: 0, membre: 0 };
    for (const m of members) {
      if (!ROLES.includes(m.role)) {
        return res.status(400).json({ message: `Rôle invalide : ${m.role}` });
      }
      counts[m.role]++;
    }
    if (counts.animateur !== 1 || counts.scribe !== 1) {
      return res.status(400).json({
        message: 'Exactement 1 animateur et 1 scribe requis',
      });
    }

    cp.groupMembers = members;
    await cp.save();

    await notifyMembers(req, cp, {
      type: 'prosit_group_assigned',
      title: 'Cas pratique : groupe constitué',
      message: `Tu as été ajouté au cas pratique "${cp.titre}".`,
    });

    res.json(cp);
  } catch (err) {
    console.error('[caspratique] setGroup:', err);
    res.status(500).json({ message: 'Erreur composition groupe', detail: err.message });
  }
}

/**
 * POST /api/cas-pratiques/:id/role-rotation/suggest
 * Body : { studentIds: [...] }
 * Renvoie une suggestion sans persister.
 */
export async function suggestRotation(req, res) {
  try {
    const cp = await Prosit.findById(req.params.id);
    if (!cp) return res.status(404).json({ message: 'Cas pratique introuvable' });
    if (!isOwnerOrAdmin(cp, req.user)) return res.status(403).json({ message: 'Non autorisé' });

    const { studentIds } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length < 3) {
      return res.status(400).json({ message: 'Au moins 3 studentIds requis' });
    }

    const suggested = await suggestRoles(studentIds, cp.courseId);
    res.json({ members: suggested });
  } catch (err) {
    console.error('[caspratique] suggestRotation:', err);
    res.status(500).json({ message: err.message || 'Erreur suggestion rôles' });
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   PHASE CADRAGE
───────────────────────────────────────────────────────────────────────── */

/**
 * PUT /api/cas-pratiques/:id/cadrage
 * Le scribe rédige le document de cadrage.
 * Body : { motsCles, problematiqueReformulee, planAction, questionsOuvertes, submit }
 */
export async function updateCadrage(req, res) {
  try {
    const cp = await Prosit.findById(req.params.id);
    if (!cp) return res.status(404).json({ message: 'Cas pratique introuvable' });

    const member = findGroupMember(cp, req.user.id);
    if (!member) return res.status(403).json({ message: 'Tu ne fais pas partie du groupe' });
    if (member.role !== 'scribe') {
      return res.status(403).json({ message: 'Seul le scribe peut rédiger le document de cadrage' });
    }
    if (!['planifie', 'cadrage_en_cours'].includes(cp.statut)) {
      return res.status(400).json({ message: 'Phase Cadrage déjà terminée' });
    }

    // Auto-bascule statut planifie → cadrage_en_cours à la première édition
    if (cp.statut === 'planifie') cp.statut = 'cadrage_en_cours';

    cp.cadrageDocument = cp.cadrageDocument || {};
    const fields = ['motsCles', 'problematiqueReformulee', 'planAction', 'questionsOuvertes'];
    for (const k of fields) {
      if (req.body[k] !== undefined) cp.cadrageDocument[k] = req.body[k];
    }
    cp.cadrageDocument.redigePar = req.user.id;

    // Si submit=true, on marque comme prêt à valider (mais validation = autres membres)
    if (req.body.submit === true) {
      cp.cadrageDocument.completedAt = new Date();
    }
    cp.markModified('cadrageDocument');
    await cp.save();

    if (req.body.submit) {
      await notifyMembers(req, cp, {
        type: 'prosit_cadrage_ready',
        title: 'Cas pratique : cadrage à valider',
        message: `Le scribe a soumis le document de cadrage de "${cp.titre}". À toi de le valider.`,
      });
    }

    res.json(cp.cadrageDocument);
  } catch (err) {
    console.error('[caspratique] updateCadrage:', err);
    res.status(500).json({ message: 'Erreur mise à jour cadrage' });
  }
}

/**
 * POST /api/cas-pratiques/:id/cadrage/validate
 * Un membre du groupe valide le doc de cadrage. Quand tous (sauf le scribe)
 * ont validé → bascule statut → travail_individuel.
 */
export async function validateCadrage(req, res) {
  try {
    const cp = await Prosit.findById(req.params.id);
    if (!cp) return res.status(404).json({ message: 'Cas pratique introuvable' });

    const member = findGroupMember(cp, req.user.id);
    if (!member) return res.status(403).json({ message: 'Tu ne fais pas partie du groupe' });
    if (member.role === 'scribe') {
      return res.status(400).json({ message: 'Le scribe ne valide pas son propre document' });
    }
    if (cp.statut !== 'cadrage_en_cours') {
      return res.status(400).json({ message: 'Cadrage déjà clôturé ou non démarré' });
    }
    if (!cp.cadrageDocument?.completedAt) {
      return res.status(400).json({ message: 'Le scribe n\'a pas encore soumis le cadrage' });
    }

    cp.cadrageDocument.validatedBy = cp.cadrageDocument.validatedBy || [];
    const alreadyValidated = cp.cadrageDocument.validatedBy.some(
      (id) => id.toString() === req.user.id
    );
    if (!alreadyValidated) {
      cp.cadrageDocument.validatedBy.push(req.user.id);
    }

    // Bascule auto si tous les non-scribes ont validé
    const nonScribeCount = cp.groupMembers.filter((m) => m.role !== 'scribe').length;
    if (cp.cadrageDocument.validatedBy.length >= nonScribeCount) {
      cp.cadrageDocument.valideParGroupe = true;
      cp.statut = 'travail_individuel';
      await notifyMembers(req, cp, {
        type: 'prosit_phase_individuel',
        title: 'Cas pratique : phase Travail individuel',
        message: `Le cadrage de "${cp.titre}" est validé. À toi de soumettre ton livrable.`,
      });
    }

    cp.markModified('cadrageDocument');
    await cp.save();
    res.json({
      validatedCount: cp.cadrageDocument.validatedBy.length,
      requiredCount: nonScribeCount,
      statut: cp.statut,
    });
  } catch (err) {
    console.error('[caspratique] validateCadrage:', err);
    res.status(500).json({ message: 'Erreur validation cadrage' });
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   PHASE TRAVAIL INDIVIDUEL — LIVRABLES
───────────────────────────────────────────────────────────────────────── */

/**
 * POST /api/cas-pratiques/:id/livrable
 * Un étudiant soumet (ou met à jour) son livrable individuel.
 * Body : { contenu, fichierUrl, fichierPublicId }
 */
export async function submitLivrable(req, res) {
  try {
    const cp = await Prosit.findById(req.params.id);
    if (!cp) return res.status(404).json({ message: 'Cas pratique introuvable' });

    const member = findGroupMember(cp, req.user.id);
    if (!member) return res.status(403).json({ message: 'Tu ne fais pas partie du groupe' });
    if (cp.statut !== 'travail_individuel') {
      return res.status(400).json({ message: 'Soumission possible uniquement en phase Travail individuel' });
    }

    const { contenu, fichierUrl, fichierPublicId } = req.body;
    if (!contenu && !fichierUrl) {
      return res.status(400).json({ message: 'Au moins un texte ou un fichier requis' });
    }

    cp.livrables = cp.livrables || [];
    const existing = cp.livrables.find((l) => l.studentId.toString() === req.user.id);
    if (existing) {
      existing.contenu = contenu || existing.contenu;
      existing.fichierUrl = fichierUrl || existing.fichierUrl;
      existing.fichierPublicId = fichierPublicId || existing.fichierPublicId;
      existing.submittedAt = new Date();
    } else {
      cp.livrables.push({
        studentId: req.user.id,
        contenu: contenu || '',
        fichierUrl: fichierUrl || '',
        fichierPublicId: fichierPublicId || '',
        submittedAt: new Date(),
      });
    }
    cp.markModified('livrables');
    await cp.save();

    res.json({ message: 'Livrable soumis', livrablesCount: cp.livrables.length });
  } catch (err) {
    console.error('[caspratique] submitLivrable:', err);
    res.status(500).json({ message: 'Erreur soumission livrable' });
  }
}

/**
 * GET /api/cas-pratiques/:id/livrables
 * Réservé prof : voit tous les livrables.
 */
export async function listLivrables(req, res) {
  try {
    const cp = await Prosit.findById(req.params.id)
      .populate('livrables.studentId', 'prenom nom email')
      .lean();
    if (!cp) return res.status(404).json({ message: 'Cas pratique introuvable' });
    if (cp.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé' });
    }
    res.json({ livrables: cp.livrables || [], statut: cp.statut, total: cp.groupMembers.length });
  } catch (err) {
    console.error('[caspratique] listLivrables:', err);
    res.status(500).json({ message: 'Erreur liste livrables' });
  }
}

/**
 * POST /api/cas-pratiques/:id/phase-bilan
 * Le prof bascule manuellement vers la phase Bilan (quand tous les livrables
 * sont arrivés ou que la deadline est atteinte).
 */
export async function startPhaseBilan(req, res) {
  try {
    const cp = await Prosit.findById(req.params.id);
    if (!cp) return res.status(404).json({ message: 'Cas pratique introuvable' });
    if (!isOwnerOrAdmin(cp, req.user)) return res.status(403).json({ message: 'Non autorisé' });
    if (cp.statut !== 'travail_individuel') {
      return res.status(400).json({ message: 'Bascule possible uniquement depuis Travail individuel' });
    }
    cp.statut = 'bilan_en_cours';
    await cp.save();
    await notifyMembers(req, cp, {
      type: 'prosit_phase_bilan',
      title: 'Cas pratique : phase Bilan',
      message: `Le scribe doit maintenant rédiger le document de bilan de "${cp.titre}".`,
    });
    res.json({ statut: cp.statut });
  } catch (err) {
    console.error('[caspratique] startPhaseBilan:', err);
    res.status(500).json({ message: 'Erreur bascule phase Bilan' });
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   PHASE BILAN
───────────────────────────────────────────────────────────────────────── */

/**
 * PUT /api/cas-pratiques/:id/bilan
 * Le scribe rédige le document de bilan.
 * Body : { syntheseSolutions, pointsAccomplis, pointsNonAccomplis, apprentissages, submit }
 */
export async function updateBilan(req, res) {
  try {
    const cp = await Prosit.findById(req.params.id);
    if (!cp) return res.status(404).json({ message: 'Cas pratique introuvable' });

    const member = findGroupMember(cp, req.user.id);
    if (!member) return res.status(403).json({ message: 'Tu ne fais pas partie du groupe' });
    if (member.role !== 'scribe') {
      return res.status(403).json({ message: 'Seul le scribe peut rédiger le bilan' });
    }
    if (cp.statut !== 'bilan_en_cours') {
      return res.status(400).json({ message: 'Phase Bilan non active' });
    }

    cp.bilanDocument = cp.bilanDocument || {};
    const fields = ['syntheseSolutions', 'pointsAccomplis', 'pointsNonAccomplis', 'apprentissages'];
    for (const k of fields) {
      if (req.body[k] !== undefined) cp.bilanDocument[k] = req.body[k];
    }
    cp.bilanDocument.redigePar = req.user.id;
    if (req.body.submit === true) {
      cp.bilanDocument.completedAt = new Date();
      await notifyMembers(req, cp, {
        type: 'prosit_bilan_submitted',
        title: 'Cas pratique : bilan soumis',
        message: `Le scribe a soumis le bilan de "${cp.titre}". En attente d'évaluation par le prof.`,
      });
    }
    cp.markModified('bilanDocument');
    await cp.save();
    res.json(cp.bilanDocument);
  } catch (err) {
    console.error('[caspratique] updateBilan:', err);
    res.status(500).json({ message: 'Erreur mise à jour bilan' });
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   ÉVALUATION (PROF)
───────────────────────────────────────────────────────────────────────── */

/**
 * POST /api/cas-pratiques/:id/evaluate
 * Le prof note chaque étudiant.
 * Body : { noteCollective, evaluations: [{ studentId, noteIndividuelle, feedback }] }
 */
export async function evaluate(req, res) {
  try {
    const cp = await Prosit.findById(req.params.id);
    if (!cp) return res.status(404).json({ message: 'Cas pratique introuvable' });
    if (!isOwnerOrAdmin(cp, req.user)) return res.status(403).json({ message: 'Non autorisé' });
    if (cp.statut !== 'bilan_en_cours' && cp.statut !== 'evalue') {
      return res.status(400).json({ message: 'Évaluation possible uniquement après le bilan' });
    }

    const { noteCollective, evaluations } = req.body;
    if (typeof noteCollective !== 'number' || noteCollective < 0 || noteCollective > 20) {
      return res.status(400).json({ message: 'noteCollective doit être entre 0 et 20' });
    }
    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      return res.status(400).json({ message: 'evaluations[] requis' });
    }

    // Construire les notes : une par membre du groupe
    const notes = [];
    for (const m of cp.groupMembers) {
      const evalEntry = evaluations.find(
        (e) => String(e.studentId) === String(m.studentId)
      );
      if (!evalEntry) {
        return res.status(400).json({
          message: `Note manquante pour l'étudiant ${m.studentId}`,
        });
      }
      const noteInd = Number(evalEntry.noteIndividuelle);
      if (!Number.isFinite(noteInd) || noteInd < 0 || noteInd > 20) {
        return res.status(400).json({
          message: `noteIndividuelle invalide pour ${m.studentId}`,
        });
      }
      notes.push({
        studentId: m.studentId,
        noteIndividuelle: noteInd,
        noteCollective,
        feedback: evalEntry.feedback || '',
        notedAt: new Date(),
      });
    }

    cp.notes = notes;
    cp.statut = 'evalue';
    cp.markModified('notes');
    await cp.save();

    await notifyMembers(req, cp, {
      type: 'prosit_evaluated',
      title: 'Cas pratique évalué',
      message: `Ton cas pratique "${cp.titre}" a été noté.`,
    });

    // Trigger articulation CAI : recalcule les phases projet déblocables pour
    // chaque étudiant noté. Fire-and-forget : un échec ici NE DOIT PAS faire
    // échouer l'évaluation (la note est déjà sauvegardée).
    if (cp.courseId) {
      (async () => {
        try {
          const { recomputePhasesForStudentOnCourse } = await import('../services/projectMilestoneService.js');
          for (const note of notes) {
            await recomputePhasesForStudentOnCourse(note.studentId, cp.courseId)
              .catch((err) => console.warn(
                `[caspratique evaluate→milestones] student ${note.studentId}:`,
                err.message
              ));
          }
        } catch (err) {
          console.warn('[caspratique evaluate→milestones] import failed:', err.message);
        }
      })();
    }

    res.json({ statut: cp.statut, notes: cp.notes });
  } catch (err) {
    console.error('[caspratique] evaluate:', err);
    res.status(500).json({ message: 'Erreur évaluation' });
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   ÉLIGIBILITÉ ÉTUDIANTS
───────────────────────────────────────────────────────────────────────── */

/**
 * GET /api/cas-pratiques/:id/eligible-students
 * Étudiants du même cours (ou même filière+promo en fallback).
 */
export async function getEligibleStudents(req, res) {
  try {
    const cp = await Prosit.findById(req.params.id).populate('courseId').lean();
    if (!cp) return res.status(404).json({ message: 'Cas pratique introuvable' });
    if (cp.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    const filter = {
      role: 'etudiant',
      isActive: { $ne: false },
      status: { $ne: 'rejected' },
    };
    if (cp.filiere) filter.filiere = cp.filiere;
    if (cp.promotion) filter.promotion = cp.promotion;

    const students = await User.find(filter)
      .select('prenom nom email filiere promotion')
      .sort({ nom: 1, prenom: 1 })
      .lean();

    const assigned = new Set((cp.groupMembers || []).map((m) => m.studentId.toString()));
    res.json({
      filiere: cp.filiere,
      promotion: cp.promotion,
      students: students.map((s) => ({
        ...s,
        alreadyAssigned: assigned.has(s._id.toString()),
      })),
    });
  } catch (err) {
    console.error('[caspratique] eligibleStudents:', err);
    res.status(500).json({ message: 'Erreur étudiants éligibles' });
  }
}
