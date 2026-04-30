import Prosit from '../models/Prosit.js';
import { addPoints, triggerAutoBadge } from './points.js';

/**
 * prositXP — Calcul individualisé des notes finales et des XP attribuées
 * à l'issue d'un Prosit, en combinant note de groupe (prof), évaluations
 * par les pairs et auto-évaluation.
 *
 * @description Implémente la pondération recommandée par Falchikov (2005)
 * pour neutraliser le biais de la note de groupe (qui invisibilise les
 * free-riders) tout en préservant la validité de l'évaluation magistrale :
 *   - 70 % note du prof (validité experte)
 *   - 30 % moyenne des évaluations par les pairs (visibilité du
 *     comportement intra-groupe que le prof ne peut pas observer)
 *
 * Topping (1998) montre que cette pondération double augmente la fiabilité
 * de l'évaluation collaborative et réduit significativement le free-riding,
 * surtout quand les XP sont elles aussi individualisées (pas de "même note
 * pour tout le monde").
 *
 * @see Falchikov, N. (2005). *Improving Assessment through Student
 *      Involvement: Practical Solutions for Aiding Learning in Higher and
 *      Further Education*. RoutledgeFalmer, p. 108–134.
 * @see Topping, K. (1998). Peer Assessment Between Students in Colleges
 *      and Universities. *Review of Educational Research*, 68(3), 249–276.
 */

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────── */

/**
 * Convertit un objet `criteria` (1-5 par champ) en moyenne 0-1.
 * Renvoie null si aucun critère renseigné.
 */
function criteriaAverage1to5(criteriaObj) {
  if (!criteriaObj) return null;
  const values = Object.values(criteriaObj).filter(
    (v) => typeof v === 'number' && v >= 1 && v <= 5
  );
  if (values.length === 0) return null;
  const sum = values.reduce((s, v) => s + v, 0);
  return sum / values.length / 5; // normalise sur 0-1
}

/**
 * Moyenne des évaluations par les pairs reçues par un user (sur 0-1).
 * Renvoie null s'il n'a reçu aucune évaluation.
 */
function peerAverageReceived(peerAssessments, userId) {
  const received = peerAssessments.filter(
    (p) => p.targetId?.toString() === userId.toString()
  );
  if (received.length === 0) return null;
  const perAssessment = received
    .map((p) => criteriaAverage1to5(p.criteria))
    .filter((v) => v !== null);
  if (perAssessment.length === 0) return null;
  return perAssessment.reduce((s, v) => s + v, 0) / perAssessment.length;
}

function hasContribution(membre) {
  if (!membre) return false;
  if (typeof membre.contributionTexte === 'string' && membre.contributionTexte.trim().length > 0) return true;
  if (membre.contributionFichier?.url) return true;
  return false;
}

function hasSelfAssessment(selfAssessments, userId) {
  return selfAssessments.some((s) => s.userId?.toString() === userId.toString());
}

function memberUserIdString(m) {
  const u = m?.userId;
  if (!u) return null;
  if (u._id) return u._id.toString();
  return u.toString();
}

/* ─────────────────────────────────────────────────────────────────────────
   COMPUTE FINAL SCORES (un groupe à la fois)
───────────────────────────────────────────────────────────────────────── */

/**
 * Calcule les notes finales individualisées pour tous les membres d'un
 * groupe. Ne touche pas à la base : remplit `groupe.finalIndividualScores`.
 *
 * @param {object} groupe — sub-document Mongoose ou objet hydraté
 * @param {object} options
 * @param {number} options.profGroupScore  — note du prof pour le groupe (0-20)
 * @returns {Array} liste de finalIndividualScores
 */
export function computeFinalScores(groupe, { profGroupScore }) {
  if (!groupe || !Array.isArray(groupe.membres)) return [];

  const peer = groupe.peerAssessments || [];
  const self = groupe.selfAssessments || [];

  // Identifier le MVC (Most Valuable Contributor) : meilleure moyenne pairs ≥ 4/5
  let mvcUserId = null;
  let bestAvg = -1;
  for (const m of groupe.membres) {
    const uid = memberUserIdString(m);
    if (!uid) continue;
    const avg01 = peerAverageReceived(peer, uid);
    if (avg01 !== null && avg01 >= 0.8 && avg01 > bestAvg) {
      bestAvg = avg01;
      mvcUserId = uid;
    }
  }

  return groupe.membres
    .map((m) => {
      const uid = memberUserIdString(m);
      if (!uid) return null;

      const peerAvg01    = peerAverageReceived(peer, uid);                  // 0-1 ou null
      const peerScore0_20 = peerAvg01 === null ? null : Math.round(peerAvg01 * 20 * 10) / 10;

      let finalScore;
      if (peerScore0_20 === null) {
        // Aucune évaluation par les pairs : on retombe sur la note du prof.
        // Falchikov (2005) recommande ce fallback plutôt que de pénaliser
        // un membre qui n'a pas pu être noté par ses pairs.
        finalScore = profGroupScore;
      } else {
        finalScore = 0.7 * profGroupScore + 0.3 * peerScore0_20;
      }
      finalScore = Math.round(finalScore * 10) / 10;

      // Détection free-rider : 0 contribution + 0 self-eval + peer < 2/5
      const noContrib = !hasContribution(m);
      const noSelf    = !hasSelfAssessment(self, uid);
      const lowPeer   = peerAvg01 !== null && peerAvg01 < 0.4;
      const isFreeRider = noContrib && noSelf && lowPeer;

      const isMvc = uid === mvcUserId;

      return {
        userId: uid,
        profGroupScore,
        peerAverageScore: peerScore0_20,
        finalScore,
        xpAwarded: 0,           // rempli par awardPrositXP
        isFreeRider,
        isMvc,
        computedAt: new Date(),
      };
    })
    .filter(Boolean);
}

/* ─────────────────────────────────────────────────────────────────────────
   COMPUTE INDIVIDUAL XP COEFFICIENT
───────────────────────────────────────────────────────────────────────── */

/**
 * Coefficient individuel d'engagement (0-1+) pour calculer l'XP.
 *
 *   - 0.4  si l'étudiant a soumis sa contribution écrite en phase recherche
 *   - 0-0.3 selon la moyenne des évaluations par les pairs reçues (linéaire)
 *   - 0.1  si l'étudiant a fait son auto-évaluation
 *   - 0-0.2 selon la note du prof normalisée (linéaire 0-20 → 0-0.2)
 *
 * Maximum théorique : 1.0 (toutes cases cochées + notes parfaites).
 */
export function computeIndividualCoefficient({
  hasContribution: hasContribFlag,
  hasSelfAssessment: hasSelfFlag,
  peerAverage01,         // 0-1 ou null
  profGroupScore0_20,
}) {
  let coef = 0;
  if (hasContribFlag) coef += 0.4;
  if (peerAverage01 !== null) coef += 0.3 * peerAverage01;
  if (hasSelfFlag) coef += 0.1;
  if (typeof profGroupScore0_20 === 'number') coef += 0.2 * (profGroupScore0_20 / 20);
  return coef;
}

/* ─────────────────────────────────────────────────────────────────────────
   AWARD XP — version individualisée
───────────────────────────────────────────────────────────────────────── */

/**
 * Attribue les XP individualisées à chaque membre du groupe d'un Prosit.
 *
 * Règles :
 *   - XP de base = 150 × coefficient, plancher 30, plafond 200
 *   - Bonus +20 XP au "Most Valuable Contributor" (mieux noté par les pairs,
 *     si moyenne ≥ 4/5)
 *   - Free-rider (aucune contribution + aucune auto-éval + peer < 2/5) : 0 XP
 *
 * Le `groupe.finalIndividualScores` doit déjà contenir les flags `isFreeRider`
 * et `isMvc` calculés par `computeFinalScores`. Cette fonction enrichit chaque
 * entrée avec `xpAwarded`.
 *
 * @param {object} prosit  — document Prosit Mongoose
 * @param {object} groupe  — sub-document groupe (déjà avec finalIndividualScores)
 * @returns {Promise<Array<{userId, xpAwarded}>>}
 */
export async function awardPrositXP(prosit, groupe) {
  if (!groupe || !Array.isArray(groupe.finalIndividualScores)) return [];

  const peer = groupe.peerAssessments || [];
  const self = groupe.selfAssessments || [];
  const results = [];

  for (const score of groupe.finalIndividualScores) {
    const uid = score.userId?.toString();
    if (!uid) continue;
    const membre = groupe.membres.find((m) => memberUserIdString(m) === uid);

    let xp = 0;
    if (score.isFreeRider) {
      xp = 0;
    } else {
      const coef = computeIndividualCoefficient({
        hasContribution: hasContribution(membre),
        hasSelfAssessment: hasSelfAssessment(self, uid),
        peerAverage01: peerAverageReceived(peer, uid),
        profGroupScore0_20: score.profGroupScore,
      });
      xp = Math.round(150 * coef);
      if (score.isMvc) xp += 20;
      if (xp < 30) xp = 30;
      if (xp > 200) xp = 200;
    }

    score.xpAwarded = xp;

    if (xp > 0) {
      try {
        await addPoints(uid, xp, 'prosit_completed');
      } catch (err) {
        console.error(`[prositXP] addPoints failed for ${uid}:`, err.message);
      }
    }

    // Badges : prosit_completed (si XP attribuées), prosit_perfect (note ≥ 18)
    if (xp > 0) {
      await triggerAutoBadge(uid, 'prosit_completed').catch(() => {});
    }
    if (score.finalScore >= 18) {
      await triggerAutoBadge(uid, 'prosit_perfect').catch(() => {});
    }

    results.push({ userId: uid, xpAwarded: xp, isFreeRider: score.isFreeRider, isMvc: score.isMvc });
  }

  return results;
}

/* ─────────────────────────────────────────────────────────────────────────
   FINALIZE — orchestrateur appelé une fois quand tout est prêt
───────────────────────────────────────────────────────────────────────── */

/**
 * Finalise un Prosit : pour chaque groupe noté par le prof, calcule les
 * notes individuelles et attribue les XP. Idempotent : si un groupe a déjà
 * des `finalIndividualScores`, il est ignoré.
 *
 * @param {string} prositId
 * @returns {Promise<{groupsFinalized: number, totalXP: number}>}
 */
export async function finalizeProsit(prositId) {
  const prosit = await Prosit.findById(prositId);
  if (!prosit) throw new Error('Prosit introuvable');

  let groupsFinalized = 0;
  let totalXP = 0;

  for (const groupe of prosit.groupes || []) {
    const profGroupScore = groupe.evaluation?.noteGlobale;
    if (typeof profGroupScore !== 'number') continue;
    if (Array.isArray(groupe.finalIndividualScores) && groupe.finalIndividualScores.length > 0) {
      // Déjà finalisé, on n'y retouche pas (idempotence + pas de double XP)
      continue;
    }

    groupe.finalIndividualScores = computeFinalScores(groupe, { profGroupScore });
    const awarded = await awardPrositXP(prosit, groupe);
    totalXP += awarded.reduce((s, a) => s + (a.xpAwarded || 0), 0);
    groupsFinalized++;
  }

  await prosit.save();
  return { groupsFinalized, totalXP };
}

/* ─────────────────────────────────────────────────────────────────────────
   PEER ASSESSMENT GATING — peut-on transiter retour → evalue ?
───────────────────────────────────────────────────────────────────────── */

/**
 * Vérifie si tous les peer assessments attendus sont collectés OU si la
 * deadline est dépassée. Renvoie { ok, reason }.
 *
 * Si `peerAssessmentEnabled` est `false` au niveau Prosit, on ne bloque pas.
 */
export function canTransitionToEvalue(prosit, now = new Date()) {
  if (!prosit.peerAssessmentEnabled) return { ok: true };

  const deadline = prosit.peerAssessmentDeadline;
  if (deadline && new Date(deadline) < now) {
    return { ok: true, reason: 'deadline_passed' };
  }

  // Tous les peer assessments attendus = pour chaque groupe, chaque membre
  // doit avoir évalué chacun des autres membres.
  for (const g of prosit.groupes || []) {
    const memberIds = (g.membres || [])
      .map((m) => memberUserIdString(m))
      .filter(Boolean);
    if (memberIds.length < 2) continue;     // groupes de 1 : rien à demander

    const expected = memberIds.length * (memberIds.length - 1);
    const actual = (g.peerAssessments || []).filter(
      (p) => memberIds.includes(p.evaluatorId?.toString()) &&
             memberIds.includes(p.targetId?.toString()) &&
             p.evaluatorId?.toString() !== p.targetId?.toString()
    ).length;

    if (actual < expected) {
      return {
        ok: false,
        reason: 'pending_peer_assessments',
        groupName: g.nom,
        completed: actual,
        expected,
      };
    }
  }

  return { ok: true };
}
