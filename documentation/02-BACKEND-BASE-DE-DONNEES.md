# DOCUMENT 2 — BACKEND : BASE DE DONNEES ET MODELES

## 2.1 Connexion a la base de donnees

### Fichier : `backend/config/db.js`

```javascript
import mongoose from "mongoose";

const connectDB = async () => {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
};

export default connectDB;
```

**Explication ligne par ligne :**
- `import mongoose` : on importe la librairie Mongoose qui fait le lien entre Node.js et MongoDB
- `process.env.MONGODB_URI` : l'URL de connexion est stockee dans un fichier `.env` (jamais dans le code source pour des raisons de securite). Exemple : `mongodb+srv://user:password@cluster0.mongodb.net/fliplearn`
- `mongoose.connect()` : etablit la connexion. C'est une fonction asynchrone (`async/await`) car la connexion reseau prend du temps
- Si la connexion echoue, `process.exit(1)` arrete le serveur (on ne peut pas fonctionner sans BDD)

**Pourquoi MongoDB et pas MySQL ?**
- MongoDB stocke les donnees en **documents JSON** (pas de lignes/colonnes)
- Permet d'imbriquer des objets (un QCM contient directement ses questions, pas besoin de table separee)
- Pas de migration necessaire quand on change la structure
- MongoDB Atlas fournit un hebergement cloud gratuit

**Pourquoi Mongoose et pas le driver MongoDB natif ?**
- Mongoose ajoute une couche de **validation** (on definit des schemas)
- Il gere les **relations** entre documents (populate, ref)
- Il offre des **hooks** (pre/post save) pour automatiser des actions

---

## 2.2 Les 12 modeles de donnees

### 2.2.1 User (Utilisateur)
**Fichier :** `backend/models/User.js`

```javascript
const userSchema = new mongoose.Schema({
    nom:       { type: String, required: true, trim: true },
    prenom:    { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true },
    password:  { type: String, required: true, minlength: 6 },
    role:      { type: String, enum: ['etudiant', 'professeur', 'admin'], default: 'etudiant' },
    filiere:   { type: String, default: '' },
    promotion: { type: String, default: '' },
    avatar:    { type: String, default: '' },
    points:    { type: Number, default: 0 },
    badges:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
    isActive:  { type: Boolean, default: true },
}, { timestamps: true });
```

**Ce que contient chaque champ :**
- `nom`, `prenom` : nom de famille et prenom de l'utilisateur. `required: true` signifie qu'ils sont obligatoires, `trim: true` supprime les espaces en debut/fin
- `email` : adresse email, `unique: true` empeche les doublons, `lowercase: true` convertit en minuscules automatiquement
- `password` : mot de passe (stocke sous forme hashee, jamais en clair)
- `role` : un des trois roles possibles. `enum` restreint les valeurs autorisees. Les roles sont en francais car l'application cible un public francophone
- `filiere`, `promotion` : informations academiques de l'etudiant
- `avatar` : URL de la photo de profil (stockee sur Cloudinary)
- `points` : score de gamification, accumule en passant des QCM et en regardant des videos
- `badges` : tableau de references vers des documents Badge (relation many-to-many)
- `isActive` : permet de desactiver un compte sans le supprimer
- `timestamps: true` : Mongoose ajoute automatiquement `createdAt` et `updatedAt`

**Le hashage automatique du mot de passe :**

```javascript
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});
```

C'est un **hook "pre-save"** : avant chaque sauvegarde d'un utilisateur, si le mot de passe a ete modifie, il est automatiquement hashe avec bcrypt (10 rounds de salage). Ainsi, le mot de passe en clair n'est **jamais** stocke en base de donnees.

**La verification du mot de passe :**

```javascript
userSchema.methods.matchPassword = async function (entered) {
    return bcrypt.compare(entered, this.password);
};
```

On ajoute une methode `matchPassword` au modele. Elle compare le mot de passe entre en clair avec le hash stocke. `bcrypt.compare` sait reconstituer le sel et verifier la correspondance.

---

### 2.2.2 Course (Cours)
**Fichier :** `backend/models/Course.js`

```javascript
const courseSchema = new mongoose.Schema({
    titre:       { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    professorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filiere:     { type: String, required: true },
    promotion:   { type: String, required: true },
    isActive:    { type: Boolean, default: true },
}, { timestamps: true });
```

- `professorId` : c'est une **reference** (foreign key) vers le modele User. `ref: 'User'` permet d'utiliser `.populate('professorId')` pour charger automatiquement les informations du professeur
- `filiere` et `promotion` : permettent de filtrer les cours par niveau

---

### 2.2.3 Video
**Fichier :** `backend/models/Video.js`

Contient : `titre`, `description`, `url` (lien Cloudinary ou YouTube), `courseId` (reference vers Course), `duration` (duree en secondes). Les videos sont uploadees par le professeur via Cloudinary.

---

### 2.2.4 QCM (Quiz) — Le modele le plus complexe
**Fichier :** `backend/models/QCM.js`

```javascript
const questionSchema = new mongoose.Schema({
    texte:          { type: String, required: true },
    options: {
        A: { type: String, required: true },
        B: { type: String, required: true },
        C: { type: String, required: true },
        D: { type: String, required: true },
    },
    questionType:   { type: String, enum: ['single', 'multiple'], default: 'single' },
    correctAnswer:  { type: String, enum: ['A', 'B', 'C', 'D'] },
    correctAnswers: { type: [String], default: [] },
    explanation:    { type: String, default: '' },
});

const resultatSchema = new mongoose.Schema({
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    score:        { type: Number, required: true },     // 0-100
    correctCount: { type: Number, required: true },
    pointsEarned: { type: Number, required: true },
    answers:      [answerEntrySchema],
    completedAt:  { type: Date, default: Date.now },
});

const qcmSchema = new mongoose.Schema({
    videoId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Video', unique: true },
    titre:            { type: String, required: true },
    questions:        [questionSchema],      // Les questions DANS le QCM
    pointsPerQuestion:{ type: Number, default: 10 },
    timerSeconds:     { type: Number, default: 30 },
    resultats:        [resultatSchema],      // Les resultats DANS le QCM
}, { timestamps: true });
```

**Pourquoi cette structure imbriquee ?**

En SQL (MySQL), il faudrait 4 tables separees : `qcms`, `questions`, `qcm_results`, `student_answers` avec des jointures. En MongoDB, tout est dans **un seul document** :

```
Un document QCM =
{
    titre: "Quiz SQL",
    questions: [
        { texte: "Quelle commande...", options: {A, B, C, D}, correctAnswer: "B" },
        { texte: "Comment filtrer...", options: {A, B, C, D}, correctAnswer: "C" },
    ],
    resultats: [
        { userId: "xxx", score: 80, correctCount: 4, answers: [...] },
        { userId: "yyy", score: 60, correctCount: 3, answers: [...] },
    ]
}
```

Avantage : une seule requete pour charger un QCM avec toutes ses questions et tous les resultats. Pas de jointure.

- `questionType: 'single'` ou `'multiple'` : question a reponse unique ou multiple
- `correctAnswers` : tableau pour les questions a reponses multiples (ex: `['A', 'C']`)
- `explanation` : explication affichee apres la correction
- `timerSeconds` : temps accorde par question (en secondes)
- `pointsPerQuestion` : nombre de points gagnes par bonne reponse

---

### 2.2.5 Project (Projet collaboratif PBL)
**Fichier :** `backend/models/Project.js`

C'est le modele le plus riche avec 5 sous-schemas imbriques :

```
Project
├── titre, description, type ('prosit' | 'projet')
├── courseId → reference vers Course
├── createdBy → reference vers User (le professeur)
├── status ('brouillon' | 'actif' | 'termine')
│
├── groupes[] → chaque groupe a :
│   ├── nom : "Groupe A"
│   └── membres[] → chaque membre a :
│       ├── userId → reference vers User
│       └── role : 'chef_projet' | 'scribe' | 'animateur' | 'chrono' | 'analyste'
│
├── phases[] → chaque phase a :
│   ├── titre : "Analyse du probleme"
│   ├── dateDebut, dateFin
│   └── statut : 'a_faire' | 'en_cours' | 'termine'
│
├── livrables[] → chaque livrable a :
│   ├── groupeIndex (quel groupe l'a soumis)
│   ├── type : 'document' | 'video' | 'lien'
│   ├── titre, url (lien Cloudinary)
│   └── uploadedBy → reference vers User
│
└── evaluations[] → chaque evaluation a :
    ├── evaluateur → reference vers User (celui qui evalue)
    ├── cible → reference vers User (celui qui est evalue)
    ├── criteres[] → { nom: "Participation", note: 1-5 }
    └── commentaire
```

Les **roles CESI** (chef de projet, scribe, animateur, chronometre, analyste) sont inspires de la methode pedagogique CESI utilisee dans certaines universites pour l'apprentissage par problemes.

---

### 2.2.6 Message (Chat)
Contient : `senderId` (qui envoie), `receiverId` (qui recoit, pour les messages prives), `roomId` (identifiant de la salle de chat), `content` (le texte), `type` ('text' ou 'bot'), `priority` ('normal' ou 'urgent').

### 2.2.7 Badge (Gamification)
Contient : `key` (identifiant unique), `nom`, `description`, `icon` (nom de l'icone Lucide), `color`, `rarity` ('common', 'rare', 'epic'), `condition` (texte explicatif).

### 2.2.8 Progress (Progression)
Suit la progression d'un etudiant dans un cours : `userId`, `courseId`, `videosCompleted` (tableau d'IDs de videos regardees), `quizScores`.

### 2.2.9 Deck et Card (Flashcards)
Systeme de cartes de revision type Anki : un Deck contient plusieurs Cards, chaque Card a une question et une reponse avec un intervalle de revision.

### 2.2.10 Resource (Ressources)
Fichiers PDF, documents ou liens deposes par le professeur : `titre`, `type`, `url` (Cloudinary), `courseId`.

### 2.2.11 SupportTicket (Tickets de support)
Permet aux utilisateurs de signaler des bugs ou demander de l'aide : `subject`, `message`, `status`, `userId`.

---

## 2.3 Schema des relations entre modeles

```
User ─────────┐
  │            │
  ├──< Course  │  (un prof cree plusieurs cours)
  │     │      │
  │     ├──< Video     (un cours a plusieurs videos)
  │     │     │
  │     │     └──< QCM (chaque video a un QCM)
  │     │          ├── questions[] (integrees)
  │     │          └── resultats[] → User (qui a passe le QCM)
  │     │
  │     ├──< Resource  (un cours a plusieurs ressources)
  │     │
  │     └──< Project   (un cours peut avoir des projets)
  │           ├── groupes[] → membres[] → User
  │           ├── phases[]
  │           ├── livrables[] → User (qui a uploade)
  │           └── evaluations[] → User (evaluateur + cible)
  │
  ├──< Progress (un etudiant a une progression par cours)
  │
  ├──< Message  (un utilisateur envoie des messages)
  │
  ├──< Badge    (un etudiant debloque des badges)
  │
  ├──< Deck     (un etudiant cree des paquets de cartes)
  │     └──< Card
  │
  └──< SupportTicket (un utilisateur cree des tickets)
```
