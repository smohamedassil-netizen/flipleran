import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';
import {
  LayoutDashboard,
  BookOpen,
  BarChart2,
  Users,
  GraduationCap,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Menu,
  ShieldCheck,
  FileText,
  PlusSquare,
  Trophy,
  UserCircle,
  MessageSquare,
  Swords,
  Library,
  FolderOpen,
  ClipboardList,
} from 'lucide-react';

/* ─── Nav config per role ───────────────────────────────────────────────────── */
const NAV = {
  etudiant: [
    {
      section: 'Apprentissage',
      items: [
        { label: 'Tableau de bord', icon: LayoutDashboard, to: '/' },
        { label: 'Mes cours',       icon: BookOpen,        to: '/courses' },
        { label: 'Ressources',     icon: FolderOpen,      to: '/resources' },
        { label: 'Mes decks',       icon: Library,         to: '/decks' },
      ],
    },
    {
      section: 'Communauté',
      items: [
        { label: 'Classement',      icon: Trophy,          to: '/leaderboard' },
        { label: 'Quiz Battle',     icon: Swords,          to: '/quiz-battle' },
        { label: 'Messages',        icon: MessageSquare,   to: '/chat' },
        { label: 'Mon profil',      icon: UserCircle,      to: '/profile' },
      ],
    },
  ],
  professeur: [
    {
      section: 'Enseignement',
      items: [
        { label: 'Tableau de bord', icon: LayoutDashboard, to: '/professor/dashboard' },
        { label: 'Mes cours',       icon: BookOpen,        to: '/courses' },
        { label: 'Ressources',     icon: FolderOpen,      to: '/resources' },
        { label: 'Gérer les QCM',  icon: ClipboardList,   to: '/professor/qcm' },
      ],
    },
    {
      section: 'Communication',
      items: [
        { label: 'Messages',        icon: MessageSquare,   to: '/chat' },
        { label: 'Mon profil',      icon: UserCircle,      to: '/profile' },
      ],
    },
  ],
  admin: [
    {
      section: 'Administration',
      items: [
        { label: 'Tableau de bord', icon: LayoutDashboard, to: '/admin' },
        { label: 'Utilisateurs',    icon: Users,           to: '/admin/users' },
        { label: 'Cours',           icon: BookOpen,        to: '/admin/courses' },
      ],
    },
    {
      section: 'Communication',
      items: [
        { label: 'Messages',        icon: MessageSquare,   to: '/chat' },
      ],
    },
  ],
};

/* ─── Role badge ────────────────────────────────────────────────────────────── */
const ROLE_LABEL = {
  etudiant:   'Étudiant',
  professeur: 'Professeur',
  admin:      'Administrateur',
};
const ROLE_BADGE_CLASS = {
  etudiant:   'badge badge-primary',
  professeur: 'badge badge-accent',
  admin:      'badge badge-neutral',
};

/* ─── Avatar initials ───────────────────────────────────────────────────────── */
function getInitials(user) {
  if (!user) return '?';
  if (user.prenom || user.nom) {
    return `${user.prenom?.[0] ?? ''}${user.nom?.[0] ?? ''}`.toUpperCase();
  }
  return (user.name ?? '')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function getDisplayName(user) {
  if (!user) return 'Utilisateur';
  if (user.prenom) return `${user.prenom} ${user.nom ?? ''}`.trim();
  return user.name ?? 'Utilisateur';
}

/* ─── Sidebar ───────────────────────────────────────────────────────────────── */
function Sidebar({ collapsed, onToggle, role, user, mobileOpen, setMobileOpen }) {
  const sections = NAV[role] ?? NAV.etudiant;
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (mobileOpen) setMobileOpen(false);
  };

  return (
    <aside
      className={`sidebar${mobileOpen ? ' open' : ''}`}
      style={{
        width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        minWidth: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        height: '100vh',
        backgroundColor: 'var(--color-sidebar)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 200ms ease, min-width 200ms ease',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* Logo row */}
      <NavLink
        to="/"
        style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          borderBottom: '1px solid var(--color-border)',
          gap: '10px',
          flexShrink: 0,
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        <Logo variant={collapsed ? 'icon' : 'full'} size={30} />
      </NavLink>

      {/* Nav sections */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '12px 8px',
        }}
      >
        {sections.map((section) => (
          <div key={section.section}>
            {!collapsed && (
              <div className="nav-section-label">{section.section}</div>
            )}
            {section.items.map(({ label, icon: Icon, to }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                title={collapsed ? label : undefined}
                style={{ justifyContent: collapsed ? 'center' : undefined }}
                onClick={handleNavClick}
              >
                <Icon size={17} style={{ flexShrink: 0 }} />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Settings & logout */}
      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '8px',
        }}
      >
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          title={collapsed ? 'Paramètres' : undefined}
          style={{ justifyContent: collapsed ? 'center' : undefined }}
          onClick={handleNavClick}
        >
          <Settings size={17} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Paramètres</span>}
        </NavLink>
        <button
          onClick={handleLogout}
          className="nav-item"
          style={{
            width: '100%',
            border: 'none',
            background: 'none',
            justifyContent: collapsed ? 'center' : undefined,
          }}
        >
          <LogOut size={17} style={{ flexShrink: 0, color: 'var(--color-error)' }} />
          {!collapsed && (
            <span style={{ color: 'var(--color-error)' }}>Déconnexion</span>
          )}
        </button>
      </div>

      {/* Collapse toggle button */}
      <button
        className="collapse-toggle"
        onClick={onToggle}
        style={{
          position: 'absolute',
          top: '50%',
          right: '-12px',
          transform: 'translateY(-50%)',
          width: 24,
          height: 24,
          borderRadius: '50%',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 30,
          boxShadow: 'var(--shadow-sm)',
        }}
        title={collapsed ? 'Agrandir' : 'Reduire'}
      >
        {collapsed
          ? <ChevronRight size={13} color="var(--color-text-secondary)" />
          : <ChevronLeft  size={13} color="var(--color-text-secondary)" />
        }
      </button>
    </aside>
  );
}

/* ─── Topbar ────────────────────────────────────────────────────────────────── */
function Topbar({ onMenuClick, title, user, role, mobileOpen, setMobileOpen }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 var(--space-6)',
        gap: 'var(--space-4)',
        flexShrink: 0,
      }}
    >
      {/* Mobile menu toggle */}
      <button
        onClick={() => setMobileOpen((v) => !v)}
        className="btn-ghost btn btn-sm mobile-menu-btn"
        aria-label="Menu"
      >
        <Menu size={18} />
      </button>

      {/* Page title */}
      <span
        style={{
          fontWeight: 700,
          fontSize: 'var(--font-size-md)',
          color: 'var(--color-text)',
          flex: 1,
        }}
      >
        {title}
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400, marginLeft: 8 }}>
          Plateforme de classe inversée
        </span>
      </span>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {/* Notifications */}
        <button
          className="btn-ghost btn btn-sm"
          style={{ position: 'relative' }}
          aria-label="Notifications"
        >
          <Bell size={17} />
          {/* Indicator dot */}
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: 'var(--color-accent)',
              border: '1.5px solid var(--color-surface)',
            }}
          />
        </button>

        {/* Role badge */}
        <span className={ROLE_BADGE_CLASS[role] ?? 'badge badge-neutral'}>
          {ROLE_LABEL[role] ?? role}
        </span>

        {/* User avatar + name with dropdown */}
        <div
          ref={profileRef}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', position: 'relative', cursor: 'pointer' }}
          onClick={() => setProfileOpen((v) => !v)}
        >
          <div className="avatar">{getInitials(user)}</div>
          <span
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 600,
              color: 'var(--color-text)',
              maxWidth: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {getDisplayName(user)}
          </span>

          {/* Profile dropdown */}
          {profileOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                border: '1px solid #e5e7eb',
                minWidth: 240,
                zIndex: 1000,
                padding: '8px 0',
                marginTop: 8,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* User info */}
              <div style={{ padding: '12px 16px' }}>
                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{getDisplayName(user)}</div>
                <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{user?.email ?? ''}</div>
              </div>
              <div style={{ height: 1, background: '#e5e7eb' }} />

              {/* Mon profil */}
              <NavLink
                to="/profile"
                onClick={() => setProfileOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', color: '#1e293b', textDecoration: 'none',
                  fontSize: 14, transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <UserCircle size={16} color="#64748b" />
                Mon profil
              </NavLink>

              {/* Paramètres */}
              <NavLink
                to="/settings"
                onClick={() => setProfileOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', color: '#1e293b', textDecoration: 'none',
                  fontSize: 14, transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Settings size={16} color="#64748b" />
                Paramètres
              </NavLink>

              <div style={{ height: 1, background: '#e5e7eb' }} />

              {/* Déconnexion */}
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', color: '#ef4444', fontSize: 14,
                  width: '100%', border: 'none', background: 'none',
                  cursor: 'pointer', transition: 'background 0.15s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <LogOut size={16} color="#ef4444" />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ─── Layout (exported) ─────────────────────────────────────────────────────── */
export default function Layout({ children, title = 'FlipLearn' }) {
  const { user } = useAuth();
  const role = user?.role ?? 'student';
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="page-container">
      {/* Backdrop for mobile sidebar */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        role={role}
        user={user}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="main-content">
        <Topbar
          title={title}
          user={user}
          role={role}
          onMenuClick={() => setCollapsed((c) => !c)}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
        <main className="page-body">{children}</main>
      </div>
    </div>
  );
}
