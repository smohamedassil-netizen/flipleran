# Déploiement du microservice IA sur Render

Ce guide explique comment mettre en ligne le service Python `ai-service/` aux côtés du backend Node.js existant.

## Option A — Via le Blueprint (recommandée, tout automatique)

Le fichier `render.yaml` à la racine décrit les 2 services. Render peut les créer en une seule étape.

### Étapes

1. **Dashboard Render** → bouton **New +** (en haut à droite) → **Blueprint**.
2. Sélectionne le repo GitHub `smohamedassil-netizen/flipleran`.
3. Render lit `render.yaml` et propose la liste des services. Valide.
4. Render créée les 2 services mais demande les secrets manquants (variables `sync: false`).

### Secrets à configurer (une seule fois)

Pour le service **fliplearn-api** :

| Clé | Où la trouver |
|-----|---------------|
| `MONGODB_URI` | MongoDB Atlas → Database → Connect |
| `CLIENT_URL` | URL Vercel du frontend, ex: `https://fliplearn.vercel.app` |
| `CLOUDINARY_*` | Cloudinary dashboard |
| `GROQ_API_KEY` | console.groq.com |
| `OPENAI_API_KEY` | platform.openai.com |
| `AI_SERVICE_TOKEN` | **Génère une chaîne aléatoire** (ex: `openssl rand -hex 32`) |

Pour le service **fliplearn-ai** :

| Clé | Valeur |
|-----|--------|
| `MONGODB_URI` | **La même** que fliplearn-api |
| `AI_SERVICE_TOKEN` | **La même** que fliplearn-api |

> ⚠️ Les 2 `AI_SERVICE_TOKEN` doivent être identiques — c'est le secret partagé qui authentifie les appels inter-services.

### Plan payant obligatoire

Le service **fliplearn-ai** est configuré en `plan: starter` (~7 $/mois) parce que :
- TensorFlow + ses dépendances = ~500 Mo (le Free tier plafonne à 512 Mo et fait crasher le build)
- Le plan Starter a 512 Mo de RAM **dédiée** et ne dort pas

Le backend **fliplearn-api** peut rester en `plan: free` si tu acceptes les cold starts de 15 min.

---

## Option B — Créer le service IA manuellement

Si tu préfères garder ton service backend actuel sans y toucher, ajoute juste le service Python.

### Étapes

1. Dashboard Render → **New +** → **Web Service**.
2. Connecte le repo `smohamedassil-netizen/flipleran`.
3. Configure :

| Champ | Valeur |
|-------|--------|
| Name | `fliplearn-ai` |
| Region | Frankfurt (ou la même que fliplearn-api) |
| Branch | `main` |
| **Root Directory** | `ai-service` |
| Runtime | Python 3 |
| Build Command | `pip install --upgrade pip && pip install -r requirements.txt` |
| Start Command | `gunicorn -w 1 -b 0.0.0.0:$PORT app:app --timeout 180` |
| Health Check Path | `/health` |
| Instance Type | **Starter** (7 $/mois) |

4. Variables d'environnement :
   - `MONGODB_URI` (même que le backend)
   - `AI_SERVICE_TOKEN` (génère une chaîne aléatoire)

5. **Create Web Service**. Render build + démarre (5-10 min).

### Mettre à jour le backend Node.js

Sur le service `fliplearn-api` → **Environment** → ajoute :

```
AI_SERVICE_URL   = https://fliplearn-ai.onrender.com
AI_SERVICE_TOKEN = <la même valeur que côté fliplearn-ai>
```

Puis **Manual Deploy → Deploy latest commit**.

---

## Première utilisation en production

Une fois les 2 services up :

1. Connecte-toi en **professeur** sur ton URL frontend.
2. Menu latéral → **IA pédagogique**.
3. Clique sur **Entraîner les modèles** (2-3 min la première fois).
4. Les métriques s'affichent : MAE, R², Accuracy, ROC-AUC.
5. Les étudiants à risque apparaissent dans le tableau.

## Vérifications rapides

```bash
# Le service IA répond
curl https://fliplearn-ai.onrender.com/health
# → { "status": "ok", "success_model_ready": true, ... }

# Le backend voit bien le service IA
curl https://fliplearn-5lsz.onrender.com/api/ai/health \
  -H "Authorization: Bearer <ton_token_prof>"
# → identique à /health ci-dessus
```

## Ré-entraînement périodique

Les modèles doivent être ré-entraînés à mesure que les données s'accumulent. Options :

**Manuel** : bouton "Ré-entraîner" dans le dashboard prof.

**Automatique (cron job)** : ajouter dans `backend/services/notificationScheduler.js` un cron hebdomadaire qui appelle `/train`. Exemple :

```js
// Tous les dimanches à 3h du matin
cron.schedule('0 3 * * 0', async () => {
  try { await aiTrain({ rebuildDataset: true }); }
  catch (err) { console.error('[ai-train] failed:', err.message); }
});
```

## Coût mensuel estimé

| Service | Plan | Coût |
|---------|------|------|
| fliplearn-api | Free (avec cold starts) | 0 $ |
| fliplearn-ai | Starter (requis pour TF) | ~7 $ |
| MongoDB Atlas | M0 Free | 0 $ |
| Groq / OpenAI | Pay-as-you-go | variable |
| **Total minimum** | | **~7 $/mois** |

Si tu veux éviter les cold starts du backend, passe `fliplearn-api` en `plan: starter` → total ~14 $/mois.

## Désactiver temporairement l'IA

Si tu veux arrêter le service Python pour économiser :
1. Dashboard Render → fliplearn-ai → **Suspend**.
2. Le dashboard prof "IA pédagogique" affichera "service indisponible" mais le reste de FlipLearn continue de marcher normalement (pas de couplage fort).
