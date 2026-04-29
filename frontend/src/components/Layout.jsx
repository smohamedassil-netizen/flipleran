import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import Logo from './Logo.jsx';
import { capitalizeWords } from '../utils/format.js';
import {
  LayoutDashboard,
  BookOpen,
  BarChart2,
  BarChart3,
  Users,
  User,
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
  Layers,
  FolderOpen,
  FolderKanban,
  ClipboardList,
  HelpCircle,
  Award,
  Gift,
  Sparkles,
  Bot,
  Video,
  Lightbulb,
} from 'lucide-react';

/* ─── Nav config per role ───────────────────────────────────────────────────── */
const NAV = {
  etudiant: [
    {
      section: 'Apprentissage',
      items: [
        { label: 'Tableau de bord', icon: LayoutDashboard, to: '/' },
        { label: 'Mes cours',       icon: BookOpen,        to: '/courses' },
        { label: 'Ressources',      icon: FolderOpen,      to: '/resources' },
        { label: 'Mes decks',       icon: Layers,          to: '/decks' },
        { label: 'Projets',         icon: FolderKanban,    to: '/projects' },
      ],
    },
    {
      section: 'Apprentissage par Problème',
      items: [
        { label: 'Prosits',         icon: Lightbulb,       to: '/prosits' },
      ],
    },
    {
      section: 'Communauté',
      items: [
        { label: 'Classement',      icon: Trophy,          to: '/leaderboard' },
        { label: 'Quiz Battle',     icon: Swords,          to: '/quiz-battle' },
        { label: 'Récompenses',     icon: Gift,            to: '/rewards' },
        { label: 'Messages',        icon: MessageSquare,   to: '/chat' },
      ],
    },
    {
      section: 'Mon espace',
      items: [
        { label: 'Mon profil',      icon: User,            to: '/profile' },
        { label: 'Aide & Support',  icon: HelpCircle,      to: '/support' },
      ],
    },
  ],
  professeur: [
    {
      section: 'Mon enseignement',
      items: [
        { label: 'Tableau de bord', icon: LayoutDashboard, to: '/professor/dashboard' },
        { label: 'Suivi étudiants', icon: BarChart3,       to: '/professor/tracking' },
        { label: 'Mes cours',       icon: BookOpen,        to: '/courses' },
        { label: 'Ressources',      icon: FolderOpen,      to: '/resources' },
        { label: 'Projets',         icon: FolderKanban,    to: '/projects' },
      ],
    },
    {
      section: 'Apprentissage par Problème',
      items: [
        { label: 'Prosits',         icon: Lightbulb,       to: '/prosits' },
      ],
    },
    {
      section: 'Création',
      items: [
        { label: 'Gérer les QCM',         icon: ClipboardList, to: '/professor/qcm' },
        { label: 'Gérer les badges',      icon: Award,         to: '/professor/badges' },
      ],
    },
    {
      section: 'Communication',
      items: [
        { label: 'Messages',        icon: MessageSquare,   to: '/chat' },
      ],
    },
    {
      section: 'Mon espace',
      items: [
        { label: 'Mon profil',      icon: User,            to: '/profile' },
        { label: 'Aide & Support',  icon: HelpCircle,      to: '/support' },
      ],
    },
  ],
  admin: [
    {
      section: 'Administration',
      items: [
        { label: 'Tableau de bord', icon: LayoutDashboard, to: '/admin' },
        { label: 'Utilisateurs',    icon: Users,           to: '/admin?section=users' },
        { label: 'Cours',           icon: BookOpen,        to: '/admin?section=courses' },
        { label: 'Support',          icon: HelpCircle,      to: '/admin?section=support' },
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
  if (user.prenom) return `${capitalizeWords(user.prenom)} ${capitalizeWords(user.nom ?? '')}`.trim();
  return user.name ?? 'Utilisateur';
}

/* ─── Sidebar ───────────────────────────────────────────────────────────────── */
function Sidebar({ collapsed, onToggle, role, user, mobileOpen, setMobileOpen }) {
  const sections = NAV[role] ?? NAV.etudiant;
  const navigate = useNavigate();
  const { logout } = useAuth();
  const location = useLocation();
  function isNavItemActive(to) {
    const qIdx = to.indexOf('?');
    if (qIdx !== -1) {
      // Route with query params: exact match on both path AND search
      const toPath   = to.slice(0, qIdx);
      const toSearch = to.slice(qIdx);
      return location.pathname === toPath && location.search === toSearch;
    }
    // Route without query params: active only when path matches AND no search params
    return location.pathname === to && !location.search;
  }

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
        overflow: 'visible',
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
            {section.items.map(({ label, icon: Icon, to, badge, tooltip }) => (
              <NavLink
                key={`${section.section}-${label}`}
                to={to}
                end={to === '/'}
                className={() => `nav-item${isNavItemActive(to) ? ' active' : ''}`}
                title={tooltip || (collapsed ? label : undefined)}
                style={{ justifyContent: collapsed ? 'center' : undefined }}
                onClick={handleNavClick}
              >
                <Icon size={17} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flex: 1 }}>
                    {label}
                    {badge && (
                      <span style={{
                        marginLeft: 'auto', padding: '1px 6px', fontSize: 9, fontWeight: 800,
                        background: 'linear-gradient(135deg, #9333EA, #C084FC)',
                        color: 'white', borderRadius: 999, letterSpacing: 0.3,
                      }}>{badge}</span>
                    )}
                  </span>
                )}
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
          right: '-16px',
          transform: 'translateY(-50%)',
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: 'var(--color-primary)',
          border: '2px solid var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 30,
          boxShadow: '0 2px 8px rgba(27,79,114,0.35)',
        }}
        title={collapsed ? 'Agrandir la barre' : 'Réduire la barre'}
      >
        {collapsed
          ? <ChevronRight size={16} color="#fff" />
          : <ChevronLeft  size={16} color="#fff" />
        }
      </button>
    </aside>
  );
}

/* ─── Topbar ────────────────────────────────────────────────────────────────── */
function Topbar({ onMenuClick, title, user, role, mobileOpen, setMobileOpen }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { notifications, markAllRead, clearAll, unreadCount, hasNew } = useNotifications();

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
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
        <span className="hide-mobile" style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400, marginLeft: 8 }}>
          Plateforme de classe inversée
        </span>
      </span>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="btn-ghost btn btn-sm"
            style={{ position: 'relative' }}
            aria-label="Notifications"
            onClick={() => setNotifOpen((v) => !v)}
          >
            <Bell size={17} style={hasNew ? { animation: 'bell-ring 0.5s ease-in-out 3' } : {}} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  border: '1.5px solid var(--color-surface)',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {notifOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                border: '1px solid #e5e7eb',
                width: 320,
                maxHeight: 400,
                zIndex: 1000,
                marginTop: 8,
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>Notifications</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {unreadCount > 0 && (
                    <button onClick={() => markAllRead()} style={{ background: 'none', border: 'none', color: '#1B4F72', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                      Marquer tout lu
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button onClick={() => clearAll()} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                      Effacer
                    </button>
                  )}
                </div>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 340 }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    Aucune notification
                  </div>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <div
                      key={n.id}
                      title={n.link ? 'Cliquer pour ouvrir' : undefined}
                      onClick={() => {
                        if (n.link) { navigate(n.link); setNotifOpen(false); }
                        if (!n.read) markAllRead();
                      }}
                      style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: n.read ? 'transparent' : '#f0f9ff',
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                        cursor: n.link ? 'pointer' : 'default',
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: n.read ? 'transparent' : (n.type === 'urgent' || n.priority === 'urgent') ? '#DC2626' : (n.type === 'success' ? '#22c55e' : n.type === 'warning' ? '#f59e0b' : '#3b82f6'),
                          flexShrink: 0,
                          marginTop: 5,
                          width: (n.type === 'urgent' || n.priority === 'urgent') ? 10 : 8,
                          height: (n.type === 'urgent' || n.priority === 'urgent') ? 10 : 8,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 13,
                          color: (n.type === 'urgent' || n.priority === 'urgent') ? '#DC2626' : '#1e293b',
                          lineHeight: 1.4,
                          fontWeight: (n.type === 'urgent' || n.priority === 'urgent') ? 700 : 400,
                        }}>{n.message}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          {new Date(n.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Role badge — caché sur mobile */}
        <span className={`hide-mobile ${ROLE_BADGE_CLASS[role] ?? 'badge badge-neutral'}`}>
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
            className="hide-mobile"
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

      <div className="main-content" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Topbar
          title={title}
          user={user}
          role={role}
          onMenuClick={() => setCollapsed((c) => !c)}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
        <main className="page-body" style={{ flex: 1 }}>{children}</main>

        {/* Footer */}
        <footer style={{
          marginTop: 'auto',
          padding: '16px 0',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: 12,
          lineHeight: 1.6,
        }}>
          <div>FlipLearn &copy; 2026 &mdash; Plateforme de Classe Invers&eacute;e</div>
          <div style={{ marginTop: 2 }}>Fait par Mohamed Assil SERAY</div>
        </footer>
      </div>
    </div>
  );
}
