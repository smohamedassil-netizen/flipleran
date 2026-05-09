/**
 * roleRotation.js — Suggère une répartition des rôles (animateur, scribe, membre)
 * pour un nouveau cas pratique, en équilibrant l'historique des rôles déjà tenus
 * par chaque étudiant sur les cas pratiques précédents du même cours.
 *
 * Principe : l'étudiant qui a été le moins souvent Animateur dans le passé
 * devient Animateur. Idem pour Scribe (parmi les autres). Le reste = membres.
 *
 * @see Slavin (1995) — Cooperative Learning : la rotation des rôles renforce
 *      l'apprentissage collaboratif et évite la spécialisation stérile.
 */

import Prosit from '../models/Prosit.js';

const CAS_PRATIQUE_ROLES = ['animateur', 'scribe', 'membre'];

/**
 * Compte les rôles tenus par un étudiant sur les cas pratiques passés du cours.
 *
 * Lit les groupMembers (nouveau flow) ET les groupes[].membres (legacy) pour
 * que la rotation reste équilibrée même pour les Prosits non encore migrés.
 *
 * @param {string[]} studentIds  IDs des étudiants à considérer
 * @param {string|null} courseId Cours dont on regarde l'historique (null = tous)
 * @returns {Promise<Object>}    { studentId: { animateur, scribe, membre } }
 */
async function countPastRoles(studentIds, courseId) {
  const filter = courseId ? { courseId } : {};
  const pastProsits = await Prosit.find(filter)
    .select('groupMembers groupes.membres')
    .lean();

  const counts = {};
  for (const sid of studentIds) {
    counts[String(sid)] = { animateur: 0, scribe: 0, membre: 0 };
  }

  const studentSet = new Set(studentIds.map(String));
  const legacyRoleMap = {
    animateur: 'animateur',
    scribe: 'scribe',
    secretaire: 'scribe',
    gestionnaire: 'membre',
    membre: 'membre',
  };

  for (const p of pastProsits) {
    // Nouveau flow : groupMembers
    for (const m of p.groupMembers || []) {
      const sid = String(m.studentId);
      if (studentSet.has(sid) && counts[sid][m.role] !== undefined) {
        counts[sid][m.role] += 1;
      }
    }
    // Legacy : groupes[].membres
    for (const g of p.groupes || []) {
      for (const m of g.membres || []) {
        const sid = String(m.userId);
        const mappedRole = legacyRoleMap[m.role];
        if (studentSet.has(sid) && mappedRole) {
          counts[sid][mappedRole] += 1;
        }
      }
    }
  }
  return counts;
}

/**
 * Suggère une répartition équilibrée des rôles pour un nouveau cas pratique.
 *
 * Algorithme (greedy, déterministe à count-égal) :
 *   1. Animateur = étudiant qui a été le moins Animateur (tie-break : moins Scribe)
 *   2. Scribe = étudiant qui a été le moins Scribe parmi les restants
 *      (tie-break : moins Animateur)
 *   3. Le reste = membres
 *
 * @param {string[]} studentIds  IDs des étudiants du groupe (3 à 12)
 * @param {string|null} courseId Cours pour le calcul d'historique
 * @returns {Promise<Array<{studentId: string, role: string, history: object}>>}
 */
async function suggestRoles(studentIds, courseId = null) {
  if (!Array.isArray(studentIds) || studentIds.length < 3) {
    throw new Error('Au moins 3 étudiants requis pour suggérer une rotation.');
  }
  const ids = studentIds.map(String);
  const counts = await countPastRoles(ids, courseId);

  // Tri stable pour Animateur : asc(animateur), asc(scribe), asc(membre)
  const sortedForAnimateur = ids.slice().sort((a, b) => {
    const ca = counts[a], cb = counts[b];
    return (ca.animateur - cb.animateur)
        || (ca.scribe - cb.scribe)
        || (ca.membre - cb.membre);
  });
  const animateur = sortedForAnimateur[0];

  const remaining = ids.filter((s) => s !== animateur);
  const sortedForScribe = remaining.slice().sort((a, b) => {
    const ca = counts[a], cb = counts[b];
    return (ca.scribe - cb.scribe)
        || (ca.animateur - cb.animateur)
        || (ca.membre - cb.membre);
  });
  const scribe = sortedForScribe[0];

  const membres = remaining.filter((s) => s !== scribe);

  return [
    { studentId: animateur, role: 'animateur', history: counts[animateur] },
    { studentId: scribe,    role: 'scribe',    history: counts[scribe] },
    ...membres.map((s) => ({ studentId: s, role: 'membre', history: counts[s] })),
  ];
}

export { suggestRoles, countPastRoles, CAS_PRATIQUE_ROLES };
export default { suggestRoles, countPastRoles };
