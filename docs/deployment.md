# Guide de déploiement — FlipLearn

Déploiement en production : **Render** (service unifié front + back) + **MongoDB Atlas**.

Compter **20 à 30 minutes** la première fois.

---

## Vue d'ensemble

```
┌──────────────┐       ┌──────────────────────────────────┐       ┌───────────────────┐
│  GitHub      │──────►│  Render — service unifié          │──────►│  MongoDB Atlas    │
│  (repo)      │       │  Express sert /api/* + frontend   │       │  (base prod)      │
└──────────────┘       │  buildé (frontend/dist) en static │       └───────────────────┘
                       └──────────────┬───────────────────┘
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │  Cloudinary / Groq   │
                           │  (médias / IA)       │
                           └──────────────────────┘
```

Une seule URL pour tout : **https://fliplearn-5lsz.onrender.com**

---

## Prérequis

- [ ] Un compte **GitHub** (repo fliplearn déjà créé ✓)
- [ ] Un compte **Render** ([s'inscrire](https://render.com))
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
mongodb+srv://fliplearn-prod:MotDePasseFort@cluster0.xxxxx.mongodb.net/fliplearn?retryWrites=true&w=majority
```

Garde cette URI précieusement, elle ira dans `MONGODB_URI` côté Render.

---

## Étape 2 — Préparer les secrets externes

### Cloudinary
- Dashboard → **Account Details** → note les 3 valeurs : `Cloud Name`, `API Key`, `API Secret`.

### Groq
- Console → **API Keys** → **Create API Key** → copie la clé.

### SMTP (Gmail recommandé pour la démo)
- Activer la 2FA sur ton compte Google.
- Générer un **App Password** : https://myaccount.google.com/apppasswords
- Note l'email expéditeur + le mot de passe applicatif.

---

## Étape 3 — Déployer sur Render

### 3.a — Importer le repo
1. Render Dashboard → **New +** → **Blueprint** → connecte ton repo GitHub `fliplearn`.
2. Render détecte le fichier [`backend/render.yaml`](../backend/render.yaml) et propose de créer le service `fliplearn-api`.

### 3.b — Configurer les variables d'environnement

Render te demande de remplir les variables marquées `sync: false`. Copie-colle les valeurs suivantes (utilise les tiennes) :

| Variable | Valeur |
|----------|--------|
| `MONGODB_URI` | URI Atlas de l'étape 1 |
| `CLIENT_URL` | URL publique de ton service Render (ex. `https://fliplearn-5lsz.onrender.com`) |
| `CLOUDINARY_CLOUD_NAME` | depuis le dashboard Cloudinary |
| `CLOUDINARY_API_KEY` | idem |
| `CLOUDINARY_API_SECRET` | idem |
| `GROQ_API_KEY` | depuis console.groq.com |
| `OPENAI_API_KEY` | *(vide si non utilisé)* |
| `SMTP_HOST` | ex. `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | ton email d'envoi |
| `SMTP_PASS` | App Password Gmail |
| `SMTP_FROM` | ex. `FlipLearn <no-reply@fliplearn.app>` |

Les variables `JWT_SECRET` et `PORT` sont générées automatiquement par Render.

### 3.c — Lancer le déploiement

Clique **Apply** / **Deploy**. Le premier build prend **~5 minutes** (`npm install` + build front + démarrage Express).

Une fois terminé, tu obtiens une URL du type :
```
https://fliplearn-5lsz.onrender.com
```

### 3.d — Vérifier le déploiement

Teste dans ton navigateur :
- `https://fliplearn-5lsz.onrender.com/` → doit afficher la page d'accueil FlipLearn (le frontend buildé, servi en static par Express).
- `https://fliplearn-5lsz.onrender.com/api/courses` → doit renvoyer 401 (auth requise) — preuve que l'API tourne.

> ⚠️ Le plan gratuit Render **met le service en veille** au bout de 15 min d'inactivité. La 1re requête après veille prend ~30-60 s. Pour une démo de soutenance : fais une requête 1-2 min avant de présenter.

---

## Étape 4 — Tests post-déploiement

- [ ] `https://fliplearn-5lsz.onrender.com/welcome` s'ouvre sans erreur.
- [ ] Register → un compte est créé, statut `pending`.
- [ ] Login admin → dashboard admin accessible.
- [ ] Le chat fonctionne (ouvre la console : connexion Socket.io réussie sur la même origine).
- [ ] Upload d'une vidéo (compte prof) → upload Cloudinary OK.
- [ ] Module Assistant IA → réponses générées par Groq (Llama 3.3).

---

## Déploiements suivants (itérations)

Après le setup initial, tu n'as plus rien à faire manuellement. À chaque `git push` sur `main`, **Render redéploie automatiquement** (re-build du frontend + redémarrage Express).

---

## Dépannage

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| `503` Render après quelques minutes | Plan free en veille | Normal — ping `/` ou `/api/courses` pour réveiller |
| `MongoNetworkError` dans les logs Render | Network Access Atlas trop restrictif | Ajouter `0.0.0.0/0` dans Atlas |
| Build Render échoue : "Cannot find module..." | npm install incomplet | Re-déclencher manual deploy depuis le dashboard |
| Chatbot renvoie "erreur technique" | `GROQ_API_KEY` manquant ou invalide | Vérifier dans Render → Environment |
| Frontend OK mais API renvoie 404 | Routes `/api/*` non enregistrées | Vérifier `NODE_ENV=production` sur Render et que `server.js` sert `frontend/dist` |
| Login fonctionne mais Socket.io ne se connecte pas | `CLIENT_URL` mal configuré (CORS Socket.io) | Mettre l'URL Render exacte sans `/` final |

---

## Domaine personnalisé (optionnel)

Une fois les tests OK, tu peux brancher un vrai nom de domaine :

- Render → Service Settings → **Custom Domain** → Add → suivre les instructions DNS.

Certificat HTTPS (Let's Encrypt) automatique.

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
