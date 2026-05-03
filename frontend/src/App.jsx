import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { GamificationProvider } from './context/GamificationContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ErrorBoundary  from './components/ErrorBoundary.jsx';

// Pages publiques + entrée d'app : eager loading (utilisées au premier rendu).
import Login                from './pages/Login.jsx';
import Register             from './pages/Register.jsx';
import LandingPage          from './pages/LandingPage.jsx';
import DashboardRouter      from './components/DashboardRouter.jsx';

// Toutes les autres pages : lazy loading via React.lazy() — chaque page devient
// un chunk indépendant chargé à la demande, ce qui réduit fortement la taille du
// bundle initial (utile en 3G/4G algérienne, cf. ENF-PERF-2 du mémoire).
const Dashboard            = lazy(() => import('./pages/Dashboard.jsx'));
const Decks                = lazy(() => import('./pages/Decks.jsx'));
const Study                = lazy(() => import('./pages/Study.jsx'));
const CoursesPage          = lazy(() => import('./pages/CoursesPage.jsx'));
const StudentCourse        = lazy(() => import('./pages/StudentCourse.jsx'));
const CourseValidate       = lazy(() => import('./pages/CourseValidate.jsx'));
const ChapterPractice      = lazy(() => import('./pages/ChapterPractice.jsx'));
const CourseGrades         = lazy(() => import('./pages/CourseGrades.jsx'));
const VideoPartsEditor     = lazy(() => import('./pages/VideoPartsEditor.jsx'));
const WatchVideo           = lazy(() => import('./pages/WatchVideo.jsx'));
const QCMPage              = lazy(() => import('./pages/QCMPage.jsx'));
const ProfessorUpload      = lazy(() => import('./pages/ProfessorUpload.jsx'));
const ProfessorCreateQCM   = lazy(() => import('./pages/ProfessorCreateQCM.jsx'));
const ProfessorVideoQuestions = lazy(() => import('./pages/ProfessorVideoQuestions.jsx'));
const ProfessorDashboard   = lazy(() => import('./pages/ProfessorDashboard.jsx'));
const Leaderboard          = lazy(() => import('./pages/Leaderboard.jsx'));
const StudentProfile       = lazy(() => import('./pages/StudentProfile.jsx'));
const ChatPage             = lazy(() => import('./pages/ChatPage.jsx'));
const ResourceLibrary      = lazy(() => import('./pages/ResourceLibrary.jsx'));
const QuizBattle           = lazy(() => import('./pages/QuizBattle.jsx'));
const AdminDashboard       = lazy(() => import('./pages/AdminDashboard.jsx'));
const ChatContacts         = lazy(() => import('./pages/ChatContacts.jsx'));
const Settings             = lazy(() => import('./pages/Settings.jsx'));
const ResourcesHub         = lazy(() => import('./pages/ResourcesHub.jsx'));
const ProfessorQCMHub      = lazy(() => import('./pages/ProfessorQCMHub.jsx'));
const BadgeManagement      = lazy(() => import('./pages/BadgeManagement.jsx'));
const Support              = lazy(() => import('./pages/Support.jsx'));
const ProjectList          = lazy(() => import('./pages/ProjectList.jsx'));
const ProjectDetail        = lazy(() => import('./pages/ProjectDetail.jsx'));
const ProjectCreate        = lazy(() => import('./pages/ProjectCreate.jsx'));
const ProjectTemplateLibrary = lazy(() => import('./pages/ProjectTemplateLibrary.jsx'));
const PrositList           = lazy(() => import('./pages/PrositList.jsx'));
const PrositCreate         = lazy(() => import('./pages/PrositCreate.jsx'));
const PrositDetail         = lazy(() => import('./pages/PrositDetail.jsx'));
const PrositPeerAssessment = lazy(() => import('./pages/PrositPeerAssessment.jsx'));
const NotificationsPage    = lazy(() => import('./pages/NotificationsPage.jsx'));
const ProfessorTracking    = lazy(() => import('./pages/ProfessorTracking.jsx'));
const ModuleAssistant      = lazy(() => import('./pages/ModuleAssistant.jsx'));
const Rewards              = lazy(() => import('./pages/Rewards.jsx'));
const LearningPathBuilder  = lazy(() => import('./pages/LearningPathBuilder.jsx'));
// CourseLearningOutcomes : page désactivée (route commentée plus bas).
// Le fichier existe encore (réactivable rapidement) mais n'est plus chargé.
// const CourseLearningOutcomes = lazy(() => import('./pages/CourseLearningOutcomes.jsx'));
const CesiMethodGuide      = lazy(() => import('./pages/CesiMethodGuide.jsx'));
const AutoPrepReview       = lazy(() => import('./pages/AutoPrepReview.jsx'));
const MyTutor              = lazy(() => import('./pages/MyTutor.jsx'));
const MyJourney            = lazy(() => import('./pages/MyJourney.jsx'));
// Le module ClassReadiness exporte 2 composants. Pour le lazy loading on importe
// l'un comme defaut et l'autre via une seconde lazy avec un alias.
const ClassReadiness       = lazy(() => import('./pages/ClassReadiness.jsx'));
const ClassReadinessHub    = lazy(() => import('./pages/ClassReadiness.jsx').then(m => ({ default: m.ClassReadinessHub })));

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

/* Fallback de chargement pour Suspense (lazy routes) */
function PageLoading() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', gap: 14, color: 'var(--color-text-secondary, #64748b)',
    }}>
      <div style={{
        width: 36, height: 36,
        border: '3px solid #e2e8f0',
        borderTopColor: 'var(--color-primary, #1B4F72)',
        borderRadius: '50%',
        animation: 'spin 0.85s linear infinite',
      }} />
      <span style={{ fontSize: 13, fontWeight: 500 }}>Chargement…</span>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
      <NotificationProvider>
      <GamificationProvider>
        <ErrorBoundary>
        <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Public */}
          <Route path="/welcome"      element={<LandingPage />} />
          <Route path="/login"        element={<Login />} />
          <Route path="/register"     element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Routes communes à tous les rôles authentifiés (consultation, navigation, communication) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/"                            element={<DashboardRouter />} />
            <Route path="/courses"                     element={<CoursesPage />} />
            <Route path="/courses/:courseId"           element={<StudentCourse />} />
            <Route path="/courses/:id/validate"        element={<CourseValidate />} />
            <Route path="/chapters/:id/practice"       element={<ChapterPractice />} />
            <Route path="/courses/:id/grades"          element={<CourseGrades />} />
            <Route path="/professor/videos/:id/parts"  element={<VideoPartsEditor />} />
            <Route path="/watch/:videoId"              element={<WatchVideo />} />
            <Route path="/profile"                     element={<StudentProfile />} />
            <Route path="/chat"                        element={<ChatContacts />} />
            <Route path="/chat/course/:courseId"       element={<ChatPage roomType="course" />} />
            <Route path="/chat/private/:userId"        element={<ChatPage roomType="private" />} />
            <Route path="/courses/:courseId/resources" element={<ResourceLibrary />} />
            <Route path="/settings"                    element={<Settings />} />
            <Route path="/resources"                   element={<ResourcesHub />} />
            <Route path="/support"                     element={<Support />} />
            <Route path="/projects"                    element={<ProjectList />} />
            <Route path="/projects/:projectId"         element={<ProjectDetail />} />
            <Route path="/prosits"                     element={<PrositList />} />
            <Route path="/prosits/:id"                 element={<PrositDetail />} />
            <Route path="/prosits/:id/peer-assessment" element={<PrositPeerAssessment />} />
            <Route path="/notifications"               element={<NotificationsPage />} />
            <Route path="/my-tickets"                  element={<Navigate to="/support" replace />} />
            <Route path="/courses/:courseId/assistant" element={<ModuleAssistant />} />
            <Route path="/method-guide"                element={<CesiMethodGuide />} />
          </Route>

          {/* Étudiant uniquement — apprentissage actif & gamification */}
          <Route element={<ProtectedRoute roles={['etudiant']} />}>
            <Route path="/decks"                  element={<Decks />} />
            <Route path="/study/:deckId"          element={<Study />} />
            <Route path="/qcm/:videoId"           element={<QCMPage />} />
            <Route path="/leaderboard"            element={<Leaderboard />} />
            <Route path="/leaderboard/:courseId"  element={<Leaderboard />} />
            <Route path="/quiz-battle"            element={<QuizBattle />} />
            <Route path="/rewards"                element={<Rewards />} />
            <Route path="/my-feedback"            element={<Navigate to="/chat?tab=feedback" replace />} />
            <Route path="/my-tutor"               element={<MyTutor />} />
            <Route path="/my-journey"             element={<MyJourney />} />
          </Route>

          {/* Professeur + Admin only */}
          <Route element={<ProtectedRoute roles={['professeur', 'admin']} />}>
            <Route path="/professor/dashboard/:courseId"         element={<ProfessorDashboard />} />
            <Route path="/professor/dashboard"                   element={<ProfessorDashboard />} />
            <Route path="/professor/courses/:courseId/upload"    element={<ProfessorUpload />} />
            <Route path="/professor/courses/:courseId/path-builder" element={<LearningPathBuilder />} />
            {/* Route /outcomes désactivée : la page n'apportait pas de valeur en pratique.
                La taxonomie de Bloom reste utilisée en interne pour l'auto-prep IA (mix QCM). */}
            {/* <Route path="/professor/courses/:courseId/outcomes" element={<CourseLearningOutcomes />} /> */}
            <Route path="/professor/courses/:courseId/videos/:videoId/auto-prep" element={<AutoPrepReview />} />
            <Route path="/professor/videos/:videoId/qcm"        element={<ProfessorCreateQCM />} />
            <Route path="/professor/videos/:videoId/questions"  element={<ProfessorVideoQuestions />} />
            <Route path="/professor/qcm/create"                 element={<ProfessorCreateQCM />} />
            <Route path="/professor/qcm"                       element={<ProfessorQCMHub />} />
            <Route path="/professor/badges"                    element={<BadgeManagement />} />
            <Route path="/professor/projects/create"            element={<ProjectCreate />} />
            <Route path="/professor/templates"                  element={<ProjectTemplateLibrary />} />
            <Route path="/prosits/new"                          element={<PrositCreate />} />
            <Route path="/professor/tracking"                   element={<ProfessorTracking />} />
            <Route path="/professor/tracking/:courseId"         element={<ProfessorTracking />} />
            <Route path="/professor/class-readiness"            element={<ClassReadinessHub />} />
            <Route path="/professor/class-readiness/:courseId"  element={<ClassReadiness />} />
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
        </Suspense>
        </ErrorBoundary>
      </GamificationProvider>
      </NotificationProvider>
      </ToastProvider>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
