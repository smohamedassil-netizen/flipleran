import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Dashboard from '../pages/Dashboard.jsx';

export default function DashboardRouter() {
  const { user } = useAuth();

  if (user?.role === 'professeur') return <Navigate to="/professor/dashboard" replace />;
  if (user?.role === 'admin')      return <Navigate to="/admin" replace />;

  return <Dashboard />;
}
