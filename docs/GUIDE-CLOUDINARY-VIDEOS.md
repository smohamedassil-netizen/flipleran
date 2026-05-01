# 🎬 Guide — Migrer les vidéos seedées vers Cloudinary

**Contexte** : Le seed `contentSeed.js` utilisait des URLs Google Cloud (`commondatastorage.googleapis.com/gtv-videos-bucket/sample/*.mp4`). Google a depuis révoqué l'accès public au bucket → toutes les URLs renvoient **403 Forbidden**. Le lecteur vidéo + l'analyse IA Whisper ne fonctionnent plus.

**Objectif** : héberger toi-même les vidéos sur ton compte Cloudinary (déjà configuré pour FlipLearn) et mettre à jour les URLs en DB.

---

## Étape 1 — Récupérer 2-3 vidéos pédagogiques

Tu as besoin de courtes vidéos (≤ 5 min) sur les thèmes des cours seedés :

| Cours | Vidéo souhaitée |
|---|---|
| Cybersécurité | Intro CIA triad / OWASP Top 10 / Phishing 101 |
| IA & ML | Intro réseaux de neurones / classification spam |
| Web Full-Stack | Intro REST / fetch JS / React props |

**Sources possibles** :
- YouTube CC (Creative Commons) — voir `youtube-dl` / `yt-dlp` pour télécharger en MP4
- Vidéos Khan Academy / OpenClassrooms (vérifier la licence)
- Tes propres enregistrements OBS (5 min de slides + voix off)

⚠️ **Respecter le copyright.** Pour la démo PFE, tes propres enregistrements sont la solution la plus safe.

---

## Étape 2 — Uploader sur Cloudinary

1. Va sur https://console.cloudinary.com (avec le compte qui a généré `CLOUDINARY_CLOUD_NAME` dans ton `.env`).
2. **Media Library** → **Upload** → glisse tes fichiers MP4.
3. **Important** : sélectionne le dossier `fliplearn/videos/` (à créer si nécessaire) pour tout regrouper.
4. Une fois uploadé, clique sur chaque vidéo → onglet **Details** → copie le champ **URL** (format : `https://res.cloudinary.com/<cloud>/video/upload/v<timestamp>/<folder>/<filename>.mp4`).

**Quota free tier Cloudinary** : 25 GB bandwidth/mois — largement suffisant pour une démo PFE (jury regarde 2-3 fois max).

---

## Étape 3 — Récupérer les videoId Mongo correspondants

Connecte-toi au backend et liste les vidéos seedées avec leurs URLs actuelles :

```bash
cd backend
node -e "
import('dotenv/config').then(() => import('mongoose').then(({default: m}) =>
  import('./models/Video.js').then(({default: V}) =>
    m.connect(process.env.MONGODB_URI)
      .then(() => V.find({}, '_id titre url').lean())
      .then(vs => { vs.forEach(v => console.log(v._id, '|', v.titre, '|', v.url)); m.disconnect(); })
  )
));
"
```

Ou plus simple : ouvre MongoDB Compass / Atlas UI et fais une query sur la collection `videos`.

Note les `_id` des vidéos que tu vas remplacer.

---

## Étape 4 — Éditer le mapping dans le script

Ouvre [`backend/scripts/migrate-video-urls.js`](../backend/scripts/migrate-video-urls.js) et remplis `VIDEO_URL_MAP` :

```js
const VIDEO_URL_MAP = {
  '69e3f7a78a3c5af824994886': 'https://res.cloudinary.com/dxxxxx/video/upload/v1234567/fliplearn/videos/cyber-bases.mp4',
  '69e3f7a78a3c5af824994887': 'https://res.cloudinary.com/dxxxxx/video/upload/v1234568/fliplearn/videos/cyber-phishing.mp4',
  // … autant de lignes que de vidéos à migrer
};
```

---

## Étape 5 — Tester en dry-run, puis appliquer

```bash
cd backend
node scripts/migrate-video-urls.js --dry-run    # affiche ce qui sera fait, ne touche rien
node scripts/migrate-video-urls.js              # applique les changements en DB
```

---

## Étape 6 — Vérifier

1. Démarre le backend + frontend en local (`npm run dev:backend` + `npm run dev:frontend`)
2. Login étudiant → ouvre une vidéo
3. La vidéo doit se charger et se lire ✅
4. L'analyse IA Whisper devrait aussi fonctionner (downloader la vidéo depuis Cloudinary, qui n'est pas bloqué)

---

## Si tu reseedes plus tard

`backend/services/contentSeed.js` contient toujours les anciennes URLs Google. Si tu veux qu'un futur `--reset` utilise tes URLs Cloudinary, modifie aussi ce fichier (lignes 45-57 : remplace les URLs `commondatastorage` par tes URLs Cloudinary).

---

## Alternative : YouTube embeds

Si Cloudinary te paraît trop lourd, tu peux aussi pivoter vers YouTube :
- Upload tes vidéos sur YouTube (visibilité "non répertorié")
- Modifier le model `Video` pour utiliser `provider: 'youtube'` + `youtubeId: '<id>'`
- Mettre à jour le frontend `VideoPlayer.jsx` pour rendre un `<iframe src="https://www.youtube.com/embed/...">` quand `provider === 'youtube'`

C'est plus de code mais zéro coût bandwidth.
