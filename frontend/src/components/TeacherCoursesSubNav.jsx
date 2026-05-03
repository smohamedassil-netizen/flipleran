/**
 * TeacherCoursesSubNav — Sous-menu prof désactivé.
 *
 * Initialement, ce composant exposait pour chaque cours un lien vers la page
 * Objectifs Bloom. Cette page a été retirée de l'UI car en pratique elle
 * n'apportait pas de valeur (jargon pédagogique trop éloigné du workflow
 * réel d'un enseignant). La taxonomie de Bloom reste utilisée en interne
 * pour équilibrer les QCM générés par l'auto-prep IA.
 *
 * On laisse ce composant en place (return null) pour ne pas casser les
 * imports existants ; il pourra être réactivé si la feature reprend du sens.
 */
export default function TeacherCoursesSubNav() {
  return null;
}
