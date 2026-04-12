# DOCUMENT 7 — FRONTEND : ARCHITECTURE REACT

## 7.1 Pourquoi React ?

React est une **bibliotheque JavaScript** (creee par Facebook/Meta) pour construire des interfaces utilisateur. Elle est basee sur le concept de **composants reutilisables**.

**Avantages pour notre projet :**
- **SPA (Single Page Application)** : la page ne se recharge jamais, tout est fluide
- **Composants** : on ecrit un composant `<QCMPlayer />` une fois, on le reutilise partout
- **State reactif** : quand les donnees changent, l'interface se met a jour automatiquement
- **Ecosysteme** : des milliers de librairies disponibles (Router, Axios, Socket.io client...)

---

## 7.2 Le point d'entree (`App.jsx`)

Ce fichier definit TOUTES les routes de l'application :

```jsx
export default function App() {
    return (
        <ThemeProvider>           // Mode sombre/clair
        <AuthProvider>            // Login/logout/token
        <NotificationProvider>    // Notifications temps reel
        <GamificationProvider>    // Points et badges
        <ToastProvider>           // Messages flash
        <BrowserRouter>           // Systeme de routes
            <Routes>
                {/* Pages publiques */}
                <Route path="/login"    element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Pages protegees (tout utilisateur connecte) */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/"          element={<Dashboard />} />
                    <Route path="/courses"   element={<CoursesPage />} />
                    <Route path="/chat/bot"  element={<ChatPage roomType="bot" />} />
                    ...
                </Route>

                {/* Pages professeur uniquement */}
                <Route element={<ProtectedRoute roles={['professeur', 'admin']} />}>
                    <Route path="/professor/dashboard" element={<ProfessorDashboard />} />
                    ...
                </Route>

                {/* Pages admin uniquement */}
                <Route element={<ProtectedRoute roles={['admin']} />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                </Route>
            </Routes>
        </BrowserRouter>
        </ToastProvider>
        </GamificationProvider>
        </NotificationProvider>
        </AuthProvider>
        </ThemeProvider>
    );
}
```

**Les 5 Providers (Contextes React) :**

Les Providers sont des composants qui **enveloppent** toute l'application et rendent des donnees accessibles partout, sans avoir a les passer de composant en composant.

| Context | Fichier | Ce qu'il fournit |
|---|---|---|
| `ThemeProvider` | `ThemeContext.jsx` | Mode sombre/clair, couleurs personnalisees |
| `AuthProvider` | `AuthContext.jsx` | `user`, `login()`, `logout()`, `isAuthenticated` |
| `NotificationProvider` | `NotificationContext.jsx` | `notifications[]`, `unreadCount`, connexion Socket.io |
| `GamificationProvider` | `GamificationContext.jsx` | `notify({points, badges})` pour afficher les animations |
| `ToastProvider` | `ToastContext.jsx` | `showToast('message')` pour les messages flash |

---

## 7.3 Le Context d'authentification (`AuthContext.jsx`)

C'est le coeur de la gestion utilisateur :

```jsx
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);      // L'utilisateur connecte (ou null)
    const [loading, setLoading] = useState(true); // true pendant le chargement initial

    // Au chargement : restaurer la session depuis sessionStorage
    useEffect(() => {
        const stored = sessionStorage.getItem('fliplearn_user');
        if (stored) setUser(JSON.parse(stored));
        setLoading(false);
    }, []);

    // A chaque changement de user : sauvegarder dans sessionStorage
    useEffect(() => {
        if (user) sessionStorage.setItem('fliplearn_user', JSON.stringify(user));
        else sessionStorage.removeItem('fliplearn_user');
    }, [user]);

    // Login : appelle l'API, stocke le resultat
    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        setUser(data);
        return data;
    };

    // Logout : efface tout
    const logout = () => setUser(null);

    return (
        <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook pour utiliser le contexte dans n'importe quel composant
export const useAuth = () => useContext(AuthContext);
```

**Comment un composant l'utilise :**
```jsx
function Dashboard() {
    const { user, logout } = useAuth();

    return (
        <div>
            <h1>Bonjour {user.prenom} !</h1>
            <p>Role : {user.role}</p>
            <button onClick={logout}>Deconnexion</button>
        </div>
    );
}
```

---

## 7.4 Le Layout principal (`Layout.jsx`)

Le Layout est le composant qui structure TOUTES les pages protegees :

```
┌──────────────────────────────────────────────────────┐
│ Sidebar (gauche)         │ Topbar (haut)              │
│                          │ ┌────────────────────────┐ │
│ Logo FlipLearn           │ │ Titre   [Notifs] [User]│ │
│                          │ └────────────────────────┘ │
│ ─── Apprentissage ───    │                            │
│ > Tableau de bord        │ ┌────────────────────────┐ │
│   Mes cours              │ │                        │ │
│   Ressources             │ │    CONTENU DE LA PAGE  │ │
│   Mes decks              │ │    (children)          │ │
│   Projets                │ │                        │ │
│                          │ │                        │ │
│ ─── Communaute ────      │ │                        │ │
│   Classement             │ │                        │ │
│   Quiz Battle            │ │                        │ │
│   Messages               │ │                        │ │
│                          │ └────────────────────────┘ │
│ ─── Mon espace ────      │                            │
│   Mon profil             │ ┌────────────────────────┐ │
│   Aide & Support         │ │ Footer                 │ │
│                          │ └────────────────────────┘ │
│ [Parametres]             │                            │
│ [Deconnexion]            │                            │
└──────────────────────────┘                            │
```

### Navigation dynamique selon le role

La sidebar affiche des liens differents selon le role :

```javascript
const NAV = {
    etudiant: [
        { section: 'Apprentissage', items: [
            { label: 'Tableau de bord', to: '/' },
            { label: 'Mes cours', to: '/courses' },
            { label: 'Projets', to: '/projects' },
        ]},
        { section: 'Communaute', items: [
            { label: 'Classement', to: '/leaderboard' },
            { label: 'Quiz Battle', to: '/quiz-battle' },
            { label: 'Messages', to: '/chat' },
        ]},
    ],
    professeur: [
        { section: 'Enseignement', items: [
            { label: 'Tableau de bord', to: '/professor/dashboard' },
            { label: 'Mes cours', to: '/courses' },
            { label: 'Gerer les QCM', to: '/professor/qcm' },
            { label: 'Gerer les badges', to: '/professor/badges' },
        ]},
    ],
    admin: [
        { section: 'Administration', items: [
            { label: 'Tableau de bord', to: '/admin' },
            { label: 'Utilisateurs', to: '/admin?section=users' },
            { label: 'Cours', to: '/admin?section=courses' },
        ]},
    ],
};
```

---

## 7.5 L'instance Axios (`utils/api.js`)

```javascript
import axios from 'axios';

const api = axios.create({
    baseURL: '/api',      // Toutes les requetes commencent par /api
    timeout: 15000,       // Timeout de 15 secondes
});

// INTERCEPTEUR DE REQUETE : ajoute le token JWT automatiquement
api.interceptors.request.use((config) => {
    const user = JSON.parse(sessionStorage.getItem('fliplearn_user'));
    if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
});

// INTERCEPTEUR DE REPONSE : gere les erreurs 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            sessionStorage.removeItem('fliplearn_user');
            window.location.href = '/login';  // Redirige vers login
        }
        return Promise.reject(error);
    }
);
```

**Pourquoi des intercepteurs ?**
- On n'a JAMAIS besoin d'ecrire `headers: { Authorization: 'Bearer ...' }` dans les requetes
- Si le token expire, l'utilisateur est automatiquement redirige vers /login
- C'est centralise : un seul endroit pour gerer l'authentification HTTP

---

## 7.6 Les 27 pages de l'application

### Pages publiques
| Page | Route | Description |
|---|---|---|
| `Login.jsx` | `/login` | Formulaire de connexion (email + mot de passe) |
| `Register.jsx` | `/register` | Formulaire d'inscription (nom, prenom, email, role, filiere) |

### Pages etudiant
| Page | Route | Description |
|---|---|---|
| `Dashboard.jsx` | `/` | Tableau de bord : points, QCM recents, cours en cours, progression |
| `CoursesPage.jsx` | `/courses` | Liste de tous les cours avec filtre par filiere |
| `StudentCourse.jsx` | `/courses/:courseId` | Detail d'un cours : videos, QCMs disponibles, progression |
| `WatchVideo.jsx` | `/watch/:videoId` | Lecteur video avec suivi de progression (80% = complete) |
| `QCMPage.jsx` | `/qcm/:videoId` | Passer un QCM : timer, questions, correction |
| `Decks.jsx` | `/decks` | Gestion des paquets de flashcards |
| `Study.jsx` | `/study/:deckId` | Revision d'un paquet de cartes |
| `Leaderboard.jsx` | `/leaderboard` | Classement par points (global ou par cours) |
| `QuizBattle.jsx` | `/quiz-battle` | Duel de quiz en temps reel |
| `ChatContacts.jsx` | `/chat` | Liste des contacts et salles de chat |
| `ChatPage.jsx` | `/chat/...` | Interface de chat (cours, prive, ou bot IA) |
| `ResourceLibrary.jsx` | `/courses/:id/resources` | Ressources d'un cours |
| `ResourcesHub.jsx` | `/resources` | Toutes les ressources |
| `StudentProfile.jsx` | `/profile` | Profil, badges, statistiques |
| `Settings.jsx` | `/settings` | Parametres (theme, preferences) |
| `Support.jsx` | `/support` | Tickets de support |
| `ProjectList.jsx` | `/projects` | Liste des projets |
| `ProjectDetail.jsx` | `/projects/:id` | Detail projet : groupes, phases, livrables |

### Pages professeur
| Page | Route | Description |
|---|---|---|
| `ProfessorDashboard.jsx` | `/professor/dashboard` | Stats des cours, progression des etudiants |
| `ProfessorUpload.jsx` | `/professor/courses/:id/upload` | Upload de videos et ressources |
| `ProfessorCreateQCM.jsx` | `/professor/videos/:id/qcm` | Creer/modifier un QCM (avec generation IA) |
| `ProfessorQCMHub.jsx` | `/professor/qcm` | Voir tous les QCM de tous les cours |
| `BadgeManagement.jsx` | `/professor/badges` | Gerer les badges |
| `ProjectCreate.jsx` | `/professor/projects/create` | Creer un projet/prosit |

### Pages admin
| Page | Route | Description |
|---|---|---|
| `AdminDashboard.jsx` | `/admin` | Statistiques, gestion des utilisateurs et cours |
