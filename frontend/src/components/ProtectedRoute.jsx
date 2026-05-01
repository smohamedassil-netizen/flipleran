import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * <ProtectedRoute />
 *   Redirige vers /login si non connecté.
 *   Si `roles` est fourni, redirige vers /unauthorized si le rôle ne correspond pas.
 *
 * Usage dans App.jsx :
 *   <Route element={<ProtectedRoute />}>...</Route>
 *   <Route element={<ProtectedRoute roles={['admin']} />}>...</Route>
 */
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--color-bg)',
          fontFamily: 'var(--font-family)',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        Chargement...
      </div>
    );
  }

  if (!user) {
    // Si l'utilisateur tente d'accéder à la racine, l'envoyer sur la landing
    // page (vitrine publique). Sinon vers /login en gardant l'URL d'origine
    // pour redirection post-connexion.
    if (location.pathname === '/') {
      return <Navigate to="/welcome" replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
