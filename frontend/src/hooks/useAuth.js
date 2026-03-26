/**
 * useAuth — point d'entrée unique pour l'authentification dans les composants.
 *
 * Expose :
 *   user            — objet utilisateur connecté (ou null)
 *   isAuthenticated — booléen
 *   loading         — true pendant la rehydratation initiale
 *   login(email, password)  — retourne la data user
 *   register(payload)       — { nom, prenom, email, password, role, filiere, promotion }
 *   logout()
 *   refreshMe()             — synchronise user depuis /api/auth/me
 *   hasRole(...roles)       — vérifie si user.role est dans la liste
 */
export { useAuth } from '../context/AuthContext.jsx';
