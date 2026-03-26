import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { BookOpen, LayoutDashboard, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 text-primary-600 font-bold text-xl">
        <BookOpen size={24} />
        FlipLearn
      </Link>
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-1 text-gray-600 hover:text-primary-600 text-sm">
          <LayoutDashboard size={16} /> Dashboard
        </Link>
        <Link to="/decks" className="flex items-center gap-1 text-gray-600 hover:text-primary-600 text-sm">
          <BookOpen size={16} /> Decks
        </Link>
        <span className="text-gray-400 text-sm">{user?.name}</span>
        <button onClick={handleLogout} className="flex items-center gap-1 text-red-500 hover:text-red-700 text-sm">
          <LogOut size={16} /> Logout
        </button>
      </div>
    </nav>
  );
}
