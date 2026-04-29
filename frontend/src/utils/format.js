/**
 * Utilitaires de formatage textuel.
 */

/**
 * Met en majuscule la première lettre d'une chaîne et laisse le reste tel quel.
 * Renvoie une chaîne vide si l'entrée n'est pas une string non vide.
 *
 * @example
 *   capitalize('fares')       // 'Fares'
 *   capitalize('seray')       // 'Seray'
 *   capitalize('FARES')       // 'FARES' (déjà majuscule)
 *   capitalize('')            // ''
 *   capitalize(null)          // ''
 */
export function capitalize(str) {
  if (typeof str !== 'string' || str.length === 0) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Capitalise chaque mot d'une chaîne (utile pour les noms composés type "jean-marc").
 *
 * @example
 *   capitalizeWords('jean-marc dupont')   // 'Jean-Marc Dupont'
 *   capitalizeWords('FARES seray')        // 'FARES Seray'
 */
export function capitalizeWords(str) {
  if (typeof str !== 'string' || str.length === 0) return '';
  return str.split(/(\s|-)/).map(part => {
    if (part === ' ' || part === '-') return part;
    return capitalize(part);
  }).join('');
}

/**
 * Format complet d'un nom : prenom (capitalize) + nom (capitalize).
 * Tolère les valeurs absentes ou null.
 *
 * @example
 *   formatFullName({ prenom: 'fares', nom: 'seray' })  // 'Fares Seray'
 *   formatFullName({ prenom: 'fares' })                 // 'Fares'
 *   formatFullName(null)                                 // ''
 */
export function formatFullName(user) {
  if (!user) return '';
  const prenom = capitalizeWords(user.prenom || '');
  const nom    = capitalizeWords(user.nom || '');
  return `${prenom} ${nom}`.trim();
}
