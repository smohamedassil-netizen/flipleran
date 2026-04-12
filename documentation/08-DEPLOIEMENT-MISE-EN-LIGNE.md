# DOCUMENT 8 — DEPLOIEMENT ET MISE EN LIGNE

## 8.1 L'hebergeur : Render.com

Render.com est un service d'hebergement cloud (Platform as a Service) qui deploie automatiquement des applications web. Nous l'utilisons car :
- Plan gratuit disponible (Free Tier)
- Deploiement automatique a chaque push sur GitHub
- Support natif de Node.js
- Variables d'environnement configurables via l'interface web

**Limitation du plan gratuit :** le serveur se met en veille apres 15 minutes d'inactivite. Le premier visiteur apres une periode d'inactivite attend ~30 secondes le temps que le serveur redemarre.

---

## 8.2 Le processus de deploiement

### Etape 1 : Le code est pousse sur GitHub

```bash
git push origin main
```

### Etape 2 : Render detecte le push

Render.com est connecte au depot GitHub `smohamedassil-netizen/flipleran`. A chaque push sur la branche `main`, il declenche automatiquement un nouveau deploiement.

### Etape 3 : Render execute le build

Le fichier `render.yaml` ou la configuration Render specifie la commande de build :

```bash
npm run render:build
```

Cette commande fait :
1. `cd backend && npm install` → installe les dependances backend (Express, Mongoose, etc.)
2. `cd frontend && npm install` → installe les dependances frontend (React, Vite, etc.)
3. `cd frontend && npm run build` → compile React en fichiers statiques dans `frontend/dist/`

**Qu'est-ce que "compiler React" ?**
Vite transforme tous les fichiers JSX, les imports, le CSS en quelques fichiers optimises :
- `index.html` — la page HTML unique
- `assets/index-abc123.js` — tout le JavaScript minifie en un seul fichier
- `assets/index-def456.css` — tout le CSS minifie en un seul fichier

### Etape 4 : Render lance le serveur

```bash
npm start    →    cd backend && node server.js
```

Express demarre et :
1. Se connecte a MongoDB Atlas
2. Cree les badges par defaut
3. Configure les 16 routes API
4. Configure Socket.io
5. Sert les fichiers statiques de `frontend/dist/`

### Etape 5 : L'application est accessible

L'URL publique est : `https://fliplearn-5lsz.onrender.com`

---

## 8.3 Comment le serveur sert l'API et le frontend

En production, Express gere TOUT sur un seul port :

```javascript
if (process.env.NODE_ENV === 'production') {
    // 1. Servir les fichiers React compiles (JS, CSS, images)
    const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
    app.use(express.static(frontendDist));

    // 2. Pour toute route qui N'EST PAS /api/*, renvoyer index.html
    //    React Router gere ensuite le routing cote client
    app.get(/^(?!\/api).*/, (req, res) => {
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
}
```

**Pourquoi renvoyer toujours `index.html` ?**
React est une SPA (Single Page Application). Il n'y a qu'une seule page HTML. Quand l'utilisateur va sur `/courses` ou `/chat`, c'est React Router (cote client) qui affiche le bon composant, pas le serveur.

Si on ne fait pas ca, un acces direct a `https://fliplearn.../courses` donnerait une erreur 404 car le serveur ne connait pas cette route — c'est une route React.

---

## 8.4 Les variables d'environnement

Les variables sensibles sont configurees dans l'interface Render.com, jamais dans le code :

| Variable | Valeur | Usage |
|---|---|---|
| `NODE_ENV` | `production` | Active le mode production (sert les fichiers compiles) |
| `PORT` | `5000` | Port du serveur (attribue par Render) |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/fliplearn` | Connexion a la BDD cloud |
| `JWT_SECRET` | `une_chaine_aleatoire_tres_longue` | Cle secrete pour signer les tokens JWT |
| `GROQ_API_KEY` | `gsk_xxx...` | Cle API pour le chatbot IA (Groq/Llama) |
| `CLOUDINARY_CLOUD_NAME` | `dxxxxxxxxx` | Identifiant du compte Cloudinary |
| `CLOUDINARY_API_KEY` | `123456789` | Cle API Cloudinary |
| `CLOUDINARY_API_SECRET` | `abc123...` | Secret API Cloudinary |
| `BREVO_API_KEY` | `xkeysib-xxx...` | Cle API pour l'envoi d'emails |
| `CLIENT_URL` | `https://fliplearn-5lsz.onrender.com` | URL du frontend (pour CORS) |

**Pourquoi des variables d'environnement ?**
- Les cles API sont des **secrets** : si elles sont dans le code source sur GitHub, n'importe qui peut les utiliser
- `process.env.GROQ_API_KEY` n'existe que sur le serveur, pas dans le code
- En developpement, on utilise un fichier `.env` (jamais commit sur GitHub grace a `.gitignore`)

---

## 8.5 Le flux complet d'une requete en production

```
1. L'utilisateur ouvre https://fliplearn-5lsz.onrender.com/courses
        ↓
2. Le navigateur envoie GET /courses au serveur Render
        ↓
3. Express : /courses ne commence pas par /api → renvoie index.html
        ↓
4. Le navigateur charge index.html + les fichiers JS/CSS
        ↓
5. React demarre dans le navigateur
        ↓
6. React Router voit la route /courses → affiche <CoursesPage />
        ↓
7. CoursesPage fait : api.get('/api/courses')
        ↓
8. L'intercepteur Axios ajoute le token JWT dans le header
        ↓
9. Express recoit GET /api/courses
        ↓
10. authMiddleware verifie le JWT → OK
        ↓
11. courseController.getAllCourses interroge MongoDB Atlas
        ↓
12. MongoDB renvoie les cours
        ↓
13. Express renvoie le JSON au navigateur
        ↓
14. React affiche la liste des cours
```

---

## 8.6 Resume du deploiement

| Etape | Outil | Action |
|---|---|---|
| Code source | GitHub | Depot du code, versioning |
| Declenchement | Render.com | Detecte le push sur main |
| Build | Vite | Compile React en fichiers statiques |
| Serveur | Express.js | Sert l'API et les fichiers compiles |
| Base de donnees | MongoDB Atlas | Stocke toutes les donnees (cloud) |
| Fichiers medias | Cloudinary | Stocke les videos et images (cloud) |
| Emails | Brevo | Envoie les emails transactionnels |
| IA | Groq | Fournit le chatbot et la generation de QCM |
| Nom de domaine | Render.com | `https://fliplearn-5lsz.onrender.com` |
