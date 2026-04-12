# DOCUMENT 6 — SERVICES : EMAILS, GAMIFICATION ET STOCKAGE FICHIERS

## 6.1 Service d'emails (`services/emailService.js`)

### Architecture a 3 niveaux de fallback

```
Tentative 1 : Brevo (ex-Sendinblue)  → 300 emails/jour gratuit
    ↓ Si echoue
Tentative 2 : Resend                   → 100 emails/jour gratuit
    ↓ Si echoue
Tentative 3 : Console.log             → Juste un log, pas d'email
```

### Envoi via Brevo (methode principale)

```javascript
async function sendViaBrevo(to, subject, html) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'api-key': BREVO_API_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            sender: { name: 'FlipLearn', email: FROM_EMAIL },
            to: [{ email: to }],
            subject,
            htmlContent: html,
        }),
    });
    return res.ok;
}
```

**Comment ca marche :**
- On fait une requete HTTP POST vers l'API de Brevo
- On passe la cle API dans le header `api-key`
- Le corps contient : l'expediteur, le destinataire, le sujet et le contenu HTML
- Brevo envoie l'email pour nous (comme un facteur)

### 2 templates d'emails

**Template normal** (`sendNotificationEmail`) :
- Fond bleu avec le logo FlipLearn
- Utilise pour : nouveau message, invitation quiz battle, bienvenue

**Template urgent** (`sendUrgentEmail`) :
- Fond rouge avec "URGENT"
- Utilise pour : messages urgents du professeur

### Quand les emails sont envoyes

| Evenement | Type d'email |
|---|---|
| Message prive recu | Notification normale |
| Message urgent du prof | Email urgent (template rouge) |
| Creation de salle Quiz Battle | Invitation a tous les etudiants |
| Message dans le chat d'un cours (urgent) | Email urgent a tous les etudiants du cours |

---

## 6.2 Service de gamification (`services/points.js`)

### Les 6 badges definis

```javascript
export const BADGE_DEFS = [
    { key: 'first_video',    nom: 'Premier pas',      condition: '1 video vue',           rarity: 'common' },
    { key: 'assidu',         nom: 'Assidu',            condition: '5 videos vues',          rarity: 'rare' },
    { key: 'first_qcm',     nom: 'Lance',             condition: '1 QCM complete',         rarity: 'common' },
    { key: 'perfectionist',  nom: 'Perfectionniste',   condition: '100% a un QCM',          rarity: 'rare' },
    { key: 'expert',         nom: 'Expert',            condition: '>90% sur 3 QCM de suite', rarity: 'epic' },
    { key: 'champion',       nom: 'Champion',          condition: '1er au classement',       rarity: 'epic' },
];
```

Au demarrage du serveur, ces badges sont automatiquement crees en BDD s'ils n'existent pas (`seedBadges()`).

### Comment les points sont attribues

```javascript
export async function addPoints(userId, amount, reason) {
    const user = await User.findById(userId);
    if (user.role !== 'etudiant') return;  // Seuls les etudiants gagnent des points

    user.points += amount;

    // Verifier si de nouveaux badges sont debloques
    const videosCompleted = await countTotalVideosCompleted(userId);
    const qcmResults = await getAllQCMResults(userId);
    const newBadges = await checkBadges(user, { videosCompleted, qcmResults });

    await user.save();
    return { newPoints: user.points, newBadges };
}
```

### Comment les badges sont verifies

```javascript
async function checkBadges(user, { videosCompleted, qcmResults }) {
    const newBadges = [];

    // "Premier pas" — 1ere video regardee
    if (videosCompleted >= 1) {
        const b = await awardBadge(user, 'first_video');
        if (b) newBadges.push(b);
    }

    // "Assidu" — 5 videos regardees
    if (videosCompleted >= 5) {
        const b = await awardBadge(user, 'assidu');
        if (b) newBadges.push(b);
    }

    // "Lance" — 1er QCM complete
    if (qcmResults.length >= 1) {
        const b = await awardBadge(user, 'first_qcm');
        if (b) newBadges.push(b);
    }

    // "Perfectionniste" — 100% a un QCM
    if (qcmResults.some(r => r.score === 100)) {
        const b = await awardBadge(user, 'perfectionist');
        if (b) newBadges.push(b);
    }

    // "Expert" — >90% sur 3 QCM consecutifs
    if (qcmResults.length >= 3) {
        const last3 = qcmResults.slice(-3);
        if (last3.every(r => r.score > 90)) {
            const b = await awardBadge(user, 'expert');
            if (b) newBadges.push(b);
        }
    }

    return newBadges;
}
```

**La fonction `awardBadge` est idempotente** : si l'etudiant a deja le badge, elle ne fait rien (pas de doublon).

### Le flux complet apres un QCM

```
1. L'etudiant termine un QCM avec un score de 90%
2. Le controleur QCM appelle addPoints(userId, 40, 'qcm_completed')
3. addPoints :
   a. Ajoute 40 points au total de l'etudiant
   b. Compte combien de videos il a regardees au total
   c. Recupere tous ses resultats de QCM
   d. Verifie chaque condition de badge
   e. Si nouveau badge debloque → l'ajoute au tableau user.badges
   f. Sauvegarde l'utilisateur
4. Le controleur emet une notification de gamification via Socket.io
5. Le frontend affiche "+40 points" et eventuellement le nouveau badge
```

---

## 6.3 Stockage de fichiers (Cloudinary)

### Configuration (`config/cloudinary.js`)

```javascript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
```

Cloudinary est un service cloud de stockage de medias (images, videos, PDF). Les 3 variables d'environnement sont fournies lors de la creation d'un compte Cloudinary (gratuit).

### Upload d'un fichier

```javascript
export const uploadBuffer = (buffer, options = {}) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
        stream.end(buffer);
    });
```

**Comment ca marche :**
1. Le fichier arrive du navigateur sous forme de **buffer** (donnees brutes en memoire)
2. On cree un **stream d'upload** vers Cloudinary
3. On envoie le buffer dans le stream
4. Cloudinary stocke le fichier et renvoie un objet avec :
   - `secure_url` : l'URL HTTPS pour acceder au fichier
   - `public_id` : identifiant unique pour supprimer le fichier plus tard
   - `duration` : duree de la video (si applicable)
5. On sauvegarde `secure_url` dans MongoDB

### Suppression d'un fichier

```javascript
export const deleteAsset = (publicId, resourceType = 'video') =>
    cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
```

Quand un professeur supprime une video, on supprime aussi le fichier sur Cloudinary pour ne pas gaspiller de l'espace.

### Le flux complet d'upload d'une video

```
1. Le prof selectionne une video (max 100 Mo) dans le formulaire
2. Le navigateur envoie la video via POST /api/videos (Axios, avec timeout de 5 min)
3. Express recoit le fichier via multer (middleware de gestion d'upload)
4. Le controleur appelle uploadBuffer(req.file.buffer, { folder: 'fliplearn/videos' })
5. Le fichier est envoye a Cloudinary via un stream
6. Cloudinary stocke le fichier et renvoie l'URL
7. Le controleur cree un document Video en MongoDB avec l'URL Cloudinary
8. L'URL est renvoyee au frontend
9. L'etudiant accede a la video via cette URL (hebergee sur Cloudinary, pas sur notre serveur)
```

**Pourquoi Cloudinary et pas stocker sur notre serveur ?**
- Render.com (notre hebergeur) a un systeme de fichiers ephemere : les fichiers uploades sont supprimes au redemarrage
- Cloudinary offre 25 Go gratuits avec un CDN (Content Delivery Network) pour un chargement rapide
- Gestion automatique des formats video et transcodage
