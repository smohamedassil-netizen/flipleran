import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { GamificationProvider } from './context/GamificationContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Login                from './pages/Login.jsx';
import Register             from './pages/Register.jsx';
import Dashboard            from './pages/Dashboard.jsx';
import Decks                from './pages/Decks.jsx';
import Study                from './pages/Study.jsx';
import CoursesPage          from './pages/CoursesPage.jsx';
import StudentCourse        from './pages/StudentCourse.jsx';
import WatchVideo           from './pages/WatchVideo.jsx';
import QCMPage              from './pages/QCMPage.jsx';
import ProfessorUpload      from './pages/ProfessorUpload.jsx';
import ProfessorCreateQCM   from './pages/ProfessorCreateQCM.jsx';
import ProfessorDashboard   from './pages/ProfessorDashboard.jsx';
import Leaderboard          from './pages/Leaderboard.jsx';
import StudentProfile       from './pages/StudentProfile.jsx';
import ChatPage             from './pages/ChatPage.jsx';
import ResourceLibrary      from './pages/ResourceLibrary.jsx';
import QuizBattle           from './pages/QuizBattle.jsx';
import AdminDashboard       from './pages/AdminDashboard.jsx';
import ChatContacts         from './pages/ChatContacts.jsx';
import Settings             from './pages/Settings.jsx';
import ResourcesHub         from './pages/ResourcesHub.jsx';
import ProfessorQCMHub      from './pages/ProfessorQCMHub.jsx';
import BadgeManagement      from './pages/BadgeManagement.jsx';
import Support              from './pages/Support.jsx';

/* ── Pages d'erreur ────────────────────────────────────────────────────────── */
function ErrorPage({ code, title, description }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', backgroundColor: 'var(--color-bg)', gap: 8, padding: 24, textAlign: 'center',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'linear-gradient(135deg, #1B4F72, #2874A6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
      }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{code}</span>
      </div>
      <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text)' }}>{title}</p>
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', maxWidth: 400 }}>{description}</p>
      <Link to="/" style={{
        color: '#fff', fontSize: 'var(--font-size-sm)', fontWeight: 600,
        textDecoration: 'none', marginTop: 16,
        padding: '10px 24px', borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-primary)',
      }}>
        Retour à l'accueil
      </Link>
    </div>
  );
}

function Unauthorized() {
  return <ErrorPage code="403" title="Accès refusé" description="Vous n'avez pas les droits nécessaires pour accéder à cette page." />;
}

function NotFound() {
  return <ErrorPage code="404" title="Page introuvable" description="La page que vous cherchez n'existe pas ou a été déplacée." />;
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <NotificationProvider>
      <GamificationProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"        element={<Login />} />
          <Route path="/register"     element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* All authenticated users */}
          <Route element={<ProtectedRoute />}>
            <Route path="/"                        element={<Dashboard />} />
            <Route path="/courses"                 element={<CoursesPage />} />
            <Route path="/decks"                   element={<Decks />} />
            <Route path="/study/:deckId"           element={<Study />} />
            <Route path="/courses/:courseId"        element={<StudentCourse />} />
            <Route path="/watch/:videoId"          element={<WatchVideo />} />
            <Route path="/qcm/:videoId"            element={<QCMPage />} />
            <Route path="/profile"                 element={<StudentProfile />} />
            <Route path="/leaderboard"             element={<Leaderboard />} />
            <Route path="/leaderboard/:courseId"   element={<Leaderboard />} />
            <Route path="/chat"                            element={<ChatContacts />} />
            <Route path="/chat/course/:courseId"        element={<ChatPage roomType="course" />} />
            <Route path="/chat/private/:userId"         element={<ChatPage roomType="private" />} />
            <Route path="/chat/bot"                     element={<ChatPage roomType="bot" />} />
            <Route path="/courses/:courseId/resources"  element={<ResourceLibrary />} />
            <Route path="/quiz-battle"                  element={<QuizBattle />} />
            <Route path="/settings"                    element={<Settings />} />
            <Route path="/resources"                   element={<ResourcesHub />} />
            <Route path="/support"                    element={<Support />} />
          </Route>

          {/* Professeur + Admin only */}
          <Route element={<ProtectedRoute roles={['professeur', 'admin']} />}>
            <Route path="/professor/dashboard/:courseId"         element={<ProfessorDashboard />} />
            <Route path="/professor/dashboard"                   element={<ProfessorDashboard />} />
            <Route path="/professor/courses/:courseId/upload"    element={<ProfessorUpload />} />
            <Route path="/professor/videos/:videoId/qcm"        element={<ProfessorCreateQCM />} />
            <Route path="/professor/qcm"                       element={<ProfessorQCMHub />} />
            <Route path="/professor/badges"                    element={<BadgeManagement />} />
          </Route>

          {/* Admin only */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin"          element={<AdminDashboard />} />
            <Route path="/admin/users"    element={<AdminDashboard />} />
            <Route path="/admin/courses"  element={<AdminDashboard />} />
            <Route path="/admin/settings" element={<AdminDashboard />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
      </GamificationProvider>
      </NotificationProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
