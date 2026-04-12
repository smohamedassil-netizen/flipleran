# DOCUMENT 3 — BACKEND : AUTHENTIFICATION ET SECURITE

## 3.1 Le systeme JWT (JSON Web Token)

### Qu'est-ce qu'un JWT ?

Un JWT est un **token** (une chaine de caracteres) qui prouve l'identite de l'utilisateur. Il est genere par le serveur au moment du login, envoye au client (navigateur), et renvoye par le client a chaque requete pour prouver qu'il est connecte.

Un JWT ressemble a cela :
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1YTEyMyIsInJvbGUiOiJldHVkaWFudCJ9.abc123signature
```

Il contient 3 parties separees par des points :
1. **Header** : l'algorithme utilise (HS256)
2. **Payload** : les donnees (id de l'utilisateur, role)
3. **Signature** : garantit que le token n'a pas ete modifie

### Pourquoi JWT et pas les sessions ?

| Sessions (PHP classique) | JWT (notre choix) |
|---|---|
| Le serveur stocke l'etat de connexion | Le serveur ne stocke rien (stateless) |
| Cookie envoye automatiquement | Token envoye dans le header Authorization |
| Fonctionne bien pour un seul serveur | Fonctionne avec plusieurs serveurs (scalable) |
| Simple mais limité | Standard de l'industrie pour les API REST |

---

## 3.2 L'inscription (`POST /api/auth/register`)

### Fichier : `backend/controllers/authController.js`

```javascript
export const register = async (req, res) => {
    const { nom, prenom, email, password, role, filiere, promotion } = req.body;

    // 1. Validation des champs obligatoires
    if (!nom || !prenom || !email || !password) {
        return res.status(400).json({ message: 'Tous les champs obligatoires doivent etre remplis.' });
    }

    // 2. Verification que l'email n'existe pas deja
    const exists = await User.findOne({ email });
    if (exists) {
        return res.status(409).json({ message: 'Un compte avec cet email existe deja.' });
    }

    // 3. Securite : on n'autorise que 'etudiant' ou 'professeur' (pas 'admin')
    const allowedRoles = ['etudiant', 'professeur'];
    const assignedRole = allowedRoles.includes(role) ? role : 'etudiant';

    // 4. Creation de l'utilisateur (le password est hashe automatiquement par le hook pre-save)
    const user = await User.create({
        nom, prenom, email, password,
        role: assignedRole, filiere, promotion,
    });

    // 5. Generation du token JWT
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });

    // 6. Reponse avec les infos utilisateur + le token
    res.status(201).json({ _id: user._id, nom, prenom, email, role: user.role, token });
};
```

**Points de securite importants :**
- Le mot de passe n'est jamais renvoye dans la reponse (la fonction `sanitize` l'exclut)
- On ne peut pas s'inscrire en tant qu'admin (seul un admin existant peut promouvoir quelqu'un)
- Le mot de passe est hashe par le hook `pre('save')` avant d'etre stocke en BDD
- Le token expire apres 30 jours : l'utilisateur devra se reconnecter

---

## 3.3 La connexion (`POST /api/auth/login`)

```javascript
export const login = async (req, res) => {
    const { email, password } = req.body;

    // 1. Chercher l'utilisateur par email
    const user = await User.findOne({ email });

    // 2. Verifier le mot de passe avec bcrypt
    if (!user || !(await user.matchPassword(password))) {
        return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // 3. Generer le token et repondre
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ _id: user._id, nom: user.nom, prenom: user.prenom, email, role: user.role, token });
};
```

**Pourquoi le meme message d'erreur pour email et password ?**
On ne dit jamais "cet email n'existe pas" ou "mot de passe incorrect" separement. On dit toujours "Email ou mot de passe incorrect" pour empecher un attaquant de deviner quels emails sont enregistres.

---

## 3.4 Le middleware d'authentification

### Fichier : `backend/middleware/authMiddleware.js`

Ce fichier est la **porte d'entree de la securite**. Il est appele avant chaque route protegee.

```javascript
const authMiddleware = async (req, res, next) => {
    // 1. Recuperer le header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Acces refuse : aucun token fourni.' });
    }

    // 2. Extraire le token (enlever "Bearer ")
    const token = authHeader.split(' ')[1];

    try {
        // 3. Verifier et decoder le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Verifier que l'utilisateur existe toujours et est actif
        const user = await User.findById(decoded.id).select('isActive');
        if (!user) return res.status(401).json({ message: 'Utilisateur introuvable.' });
        if (user.isActive === false) return res.status(403).json({ message: 'Compte desactive.' });

        // 5. Attacher les infos utilisateur a la requete
        req.user = { id: decoded.id, role: decoded.role };
        next();  // Passer au controleur suivant
    } catch (err) {
        // 6. Gerer l'expiration du token
        const message = err.name === 'TokenExpiredError'
            ? 'Session expiree, veuillez vous reconnecter.'
            : 'Token invalide.';
        res.status(401).json({ message });
    }
};
```

**Le flux complet d'une requete protegee :**
```
1. Le navigateur envoie : GET /api/courses
   Header: Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...

2. Express recoit la requete

3. authMiddleware intercepte :
   - Extrait le token du header
   - Verifie la signature avec JWT_SECRET
   - Decode le payload { id: "65a123", role: "etudiant" }
   - Verifie que l'utilisateur existe en BDD
   - Attache req.user = { id: "65a123", role: "etudiant" }
   - Appelle next() pour passer au controleur

4. Le controleur courseController.getAllCourses s'execute
   - Il peut utiliser req.user.id pour savoir qui fait la requete
   - Il peut utiliser req.user.role pour filtrer les donnees
```

---

## 3.5 Cote frontend : comment le token est gere

### Fichier : `frontend/src/context/AuthContext.jsx`

```javascript
// Au login, on stocke TOUT (infos user + token) dans sessionStorage
const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data);  // Declenche le useEffect qui sauvegarde dans sessionStorage
};

// A chaque changement de 'user', on sauvegarde/supprime dans sessionStorage
useEffect(() => {
    if (user) sessionStorage.setItem('fliplearn_user', JSON.stringify(user));
    else sessionStorage.removeItem('fliplearn_user');
}, [user]);

// Au chargement de la page, on rehydrate depuis sessionStorage
useEffect(() => {
    const stored = sessionStorage.getItem('fliplearn_user');
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
}, []);
```

**Pourquoi `sessionStorage` et pas `localStorage` ?**
- `sessionStorage` est efface quand on ferme l'onglet → plus securise
- `localStorage` persiste meme apres fermeture du navigateur

### Fichier : `frontend/src/utils/api.js`

```javascript
// L'intercepteur ajoute automatiquement le token a CHAQUE requete
api.interceptors.request.use((config) => {
    const user = JSON.parse(sessionStorage.getItem('fliplearn_user'));
    if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
});

// Si le serveur repond 401, on redirige vers /login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            sessionStorage.removeItem('fliplearn_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);
```

Avec cet intercepteur, on n'a **jamais** besoin d'ecrire manuellement `Authorization: Bearer ...` dans les requetes. Axios le fait automatiquement.

---

## 3.6 Les routes protegees (frontend)

### Fichier : `frontend/src/components/ProtectedRoute.jsx`

```jsx
// Usage dans App.jsx :
<Route element={<ProtectedRoute />}>           // Tout utilisateur connecte
<Route element={<ProtectedRoute roles={['professeur']} />}>  // Prof uniquement
<Route element={<ProtectedRoute roles={['admin']} />}>       // Admin uniquement
```

Si l'utilisateur n'est pas connecte → redirige vers `/login`
Si l'utilisateur n'a pas le bon role → redirige vers `/unauthorized` (page 403)

---

## 3.7 Resume de la securite

| Menace | Protection mise en place |
|---|---|
| **Mots de passe en clair** | Hashage bcrypt avec salage (10 rounds) avant stockage |
| **Token forge** | Signature JWT avec secret cote serveur |
| **Token expire** | Expiration a 30 jours, verification a chaque requete |
| **Compte desactive** | Verification `isActive` dans le middleware |
| **Escalade de privilege** | Verification du role dans les routes (`roles={['admin']}`) |
| **Inscription en tant qu'admin** | Filtrage des roles autorises a l'inscription |
| **Vol de token** | `sessionStorage` (efface a la fermeture de l'onglet) |
| **Requetes non authentifiees** | Middleware JWT sur toutes les routes `/api/*` sauf login/register |
