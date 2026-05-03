# Guide de déploiement — FlipLearn

Déploiement en production : **backend sur Render** + **frontend sur Vercel** + **base MongoDB Atlas**.

Compter **30 à 45 minutes** la première fois.

---

## Vue d'ensemble

```
┌──────────────┐       ┌──────────────────┐       ┌───────────────────┐
│  GitHub      │──────►│  Render (back)   │──────►│  MongoDB Atlas    │
│  (repo)      │       │  Node + Express  │       │  (base prod)      │
└──────┬───────┘       └────────┬─────────┘       └───────────────────┘
       │                        │
       │                        │ CORS autorisé
       │                        ▼
       └──────────────►┌──────────────────┐
                       │  Vercel (front)  │
                       │  React + Vite    │
                       └──────────────────┘
```

---

## Prérequis

- [ ] Un compte **GitHub** (repo fliplearn déjà créé ✓)
- [ ] Un compte **Render** (✓)
- [ ] Un compte **Vercel** — [s'inscrire gratuitement](https://vercel.com/signup)
- [ ] Un cluster **MongoDB Atlas** (free tier suffit) — [s'inscrire](https://www.mongodb.com/cloud/atlas/register)
- [ ] Un compte **Cloudinary** — [s'inscrire](https://cloudinary.com/users/register/free)
- [ ] Une clé API **Groq** — [s'inscrire](https://console.groq.com)

---

## Étape 1 — Préparer la base de données (MongoDB Atlas)

> **Important** : utilise une base **séparée** de celle de dev. Les credentials dev n'ont rien à faire en production.

1. Connecte-toi à [cloud.mongodb.com](https://cloud.mongodb.com).
2. Crée un nouveau **cluster** (plan **M0 gratuit**).
3. Dans **Database Access** : crée un nouvel utilisateur dédié à la production (`fliplearn-prod`), avec un mot de passe fort **différent** du dev.
4. Dans **Network Access** : ajoute `0.0.0.0/0` (pour autoriser Render à se connecter) — ou mieux : les plages d'IP de Render si tu veux restreindre.
5. Récupère l'**URI de connexion** (bouton **Connect** → **Drivers** → copie la chaîne `mongodb+srv://...`).
6. Remplace `<password>` et ajoute `/fliplearn` comme nom de base.

Tu obtiens quelque chose comme :
```
mongodb+srv://fliplearn-prod:MOT_DE_PASSE@cluster0.xxxxx.mongodb.net/fliplearn?retryWrites=true&w=majority
```

Garde-la de côté — on en a besoin à l'étape 3.

---

## Étape 2 — Pousser le code sur GitHub

Depuis le dossier `fliplearn/` :

```bash
# Si c'est la 1re fois et qu'il n'y a pas encore de .git :
git init
git branch -M main
git remote add origin https://github.com/<ton-user>/fliplearn.git

# Ajouter + committer les fichiers de configuration et de documentation
git add .
git commit -m "chore: add README and deployment config"

# Puis push
git push -u origin main
```

Si le repo existe déjà ailleurs, copie simplement les fichiers modifiés / créés dans cette session dans le dossier du repo :

- `README.md`
- `DEPLOYMENT.md`
- `backend/.env.example`
- `backend/package.json`
- `backend/server.js`
- `frontend/.env.example`

Puis `git add` + `commit` + `push`.

> **⚠️ Vérifie avant le push** : `git status` ne doit pas montrer `backend/.env` ni `frontend/.env`. Le `.gitignore` les exclut — mais vérifie quand même.

---

## Étape 3 — Déployer le backend sur Render

### 3.a — Créer le service

1. Va sur [dashboard.render.com](https://dashboard.render.com).
2. **New** → **Blueprint** (car `render.yaml` est déjà dans le repo).
3. Connecte ton GitHub (si pas déjà fait) et sélectionne le repo **fliplearn**.
4. Render détecte automatiquement `backend/render.yaml`.
5. **Root Directory** : `backend` *(important : pour que `npm install` soit lancé dans le bon dossier)*.

### 3.b — Configurer les variables d'environnement

Render te demande de remplir les variables marquées `sync: false`. Copie-colle les valeurs suivantes (utilise les tiennes, pas celles-ci) :

| Variable | Valeur |
|----------|--------|
| `MONGODB_URI` | URI Atlas de l'étape 1 |
| `CLIENT_URL` | (laisse vide pour l'instant, on remplira après étape 4) |
| `CLOUDINARY_CLOUD_NAME` | depuis le dashboard Cloudinary |
| `CLOUDINARY_API_KEY` | idem |
| `CLOUDINARY_API_SECRET` | idem |
| `GROQ_API_KEY` | depuis console.groq.com |
| `OPENAI_API_KEY` | *(vide si non utilisé)* |
| `SMTP_HOST` | ex. `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | ton email d'envoi |
| `SMTP_PASS` | App Password Gmail ([générer](https://myaccount.google.com/apppasswords)) |
| `SMTP_FROM` | ex. `FlipLearn <no-reply@fliplearn.app>` |

Les variables `JWT_SECRET` et `PORT` sont générées automatiquement par Render.

### 3.c — Lancer le déploiement

Clique **Apply** / **Deploy**. Le premier build prend **~5 minutes**.

Une fois terminé, tu obtiens une URL du type :
```
https://fliplearn-api.onrender.com
```

### 3.d — Vérifier le backend

Teste dans ton navigateur :
- `https://fliplearn-5lsz.onrender.com/` → doit afficher la page de connexion FlipLearn (le frontend buildé)
- `https://fliplearn-5lsz.onrender.com/api/courses` → doit renvoyer 401 (auth requise) — preuve que l'API tourne

> ⚠️ Le plan gratuit Render **met le service en veille** au bout de 15 min d'inactivité. La 1re requête après veille prend ~30 s. Pour une démo de soutenance : fais une requête 1 min avant de présenter.

---

## Étape 4 — Déployer le frontend sur Vercel

### 4.a — Importer le projet

1. Va sur [vercel.com/new](https://vercel.com/new).
2. Connecte ton GitHub et sélectionne le repo **fliplearn**.
3. Dans **Configure Project** :
   - **Root Directory** : `frontend`
   - **Framework Preset** : Vite (détecté automatiquement)
   - **Build Command** : `npm run build` *(par défaut)*
   - **Output Directory** : `dist` *(par défaut)*

### 4.b — Variables d'environnement

Dans la section **Environment Variables**, ajoute :

| Variable | Valeur |
|----------|--------|
| `VITE_SOCKET_URL` | URL Render de l'étape 3 (ex. `https://fliplearn-api.onrender.com`) |
| `VITE_API_URL` | *(idem — utile si l'app lit cette variable)* |

### 4.c — Déployer

Clique **Deploy**. Vercel buil­de en **~2 minutes**.

URL finale :
```
https://fliplearn.vercel.app
(ou https://fliplearn-<ton-username>.vercel.app)
```

---

## Étape 5 — Boucler la configuration CORS

Retour sur **Render** :

1. Ouvre le service `fliplearn-api` → **Environment**.
2. Édite `CLIENT_URL` → colle l'URL Vercel (ex. `https://fliplearn.vercel.app`).
3. **Save changes** → Render redéploie automatiquement.

Sans cette étape, le frontend ne pourra pas appeler l'API (CORS bloque).

---

## Étape 6 — Tests post-déploiement

- [ ] `https://fliplearn-5lsz.onrender.com/welcome` s'ouvre sans erreur.
- [ ] Register → un compte est créé, statut `pending`.
- [ ] Login admin → dashboard admin accessible.
- [ ] Le chat fonctionne (ouvre la console : connexion Socket.io réussie).
- [ ] Upload d'une vidéo (compte prof) → upload Cloudinary OK.
- [ ] Module Assistant IA → réponses générées par Groq (Llama 3.3).

---

## Déploiements suivants (itérations)

Après le setup initial, tu n'as plus rien à faire manuellement. À chaque `git push` sur `main` :

- **Render** redéploie le backend automatiquement.
- **Vercel** redéploie le frontend automatiquement.

---

## Dépannage

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| `CORS error` dans la console navigateur | `CLIENT_URL` mal configuré sur Render | Vérifier l'URL exacte (sans `/` final), redéployer |
| `503` Render après quelques minutes | Plan free en veille | Normal — ping `/api/health` pour réveiller |
| `MongoNetworkError` dans les logs Render | Network Access Atlas trop restrictif | Ajouter `0.0.0.0/0` dans Atlas |
| Build Vercel échoue : "Missing script build" | `Root Directory` pas défini | Vercel settings → Root = `frontend` |
| Chatbot renvoie "erreur technique" | `GROQ_API_KEY` manquant ou invalide | Vérifier dans Render → Environment |
| Login fonctionne mais rien ne se passe ensuite | `VITE_SOCKET_URL` pas configuré | Ajouter la variable sur Vercel, redéployer |

---

## Domaine personnalisé (optionnel)

Une fois les tests OK, tu peux brancher un vrai nom de domaine :

- **Vercel** : Project Settings → **Domains** → Add → suis les instructions DNS.
- **Render** : Service Settings → **Custom Domain** → Add → suis les instructions DNS.

Certificats HTTPS (Let's Encrypt) automatiques sur les deux plateformes.

---

## Rotation des secrets

Si tu as committé `.env` par erreur à un moment (y compris en historique Git), les credentials sont potentiellement fuités. À faire **immédiatement** :

1. MongoDB Atlas → Database Access → **Edit** l'utilisateur → régénérer le mot de passe.
2. Cloudinary → Settings → Security → **Regenerate API Secret**.
3. Groq → Console → **Revoke** la clé et en créer une nouvelle.
4. Render → Environment → mettre à jour les 3 valeurs → redéploie auto.
5. Nettoyer l'historique Git (optionnel mais recommandé) avec `git filter-repo` ou BFG Repo-Cleaner.

---

**Prêt pour la soutenance 🚀**
