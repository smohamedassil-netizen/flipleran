# TUTO TEST COMPLET — FlipLearn

Guide pas-à-pas pour tester **toute l'application** dans les 3 rôles : **Admin**, **Professeur**, **Étudiant**.

---

## 0. Avant de commencer

### URL de l'app (prod)
- **App complète** : https://fliplearn-5lsz.onrender.com
- ⚠️ **Cold start** : si personne n'a touché l'app depuis 15 min, la 1ʳᵉ requête peut prendre **30 à 60 secondes** (Render free tier dort). Patience sur la 1ʳᵉ connexion, ne ferme pas l'onglet.

### Comptes de test
| Rôle | Email | Mot de passe |
|---|---|---|
| **Admin** | `admin@fliplearn.dz` | `admin1234` |
| **Prof ISIL L3** | `omar.isil.l3@fliplearn.dz` | `test1234` |
| **Étudiant ISIL L3** | `assil.isil.l3@fliplearn.dz` | `test1234` |

D'autres profs/étudiants existent : `karim.isil.l1@`, `amine.isil.l1@`, `leila.isil.l2@`, `nadia.management.l3@`, etc. — toujours `test1234`.

### Conseils
- Ouvre **3 onglets** (un par rôle) ou utilise navigateur normal + navigation privée pour switch rapide.
- Travaille dans cet ordre : **Prof crée → Étudiant consomme → Admin supervise**.
- Si tu fais un test E2E pour la soutenance, suis le **§4 Scénario démo** à la fin.

---

# 1. CÔTÉ ADMIN — supervision

Connexion → tu atterris sur `/admin` (Tableau de bord).

## 1.1 Tableau de bord (`/admin`)
**Ce que tu vois** :
- Stats globales : Utilisateurs / Cours / Vidéos / Messages
- Répartition par rôle (% étudiants / profs / admins)
- Graphique des inscriptions de la semaine
- Activité récente (10 derniers événements)
- Boutons rapides : Créer utilisateur / Créer cours / Voir messages

**À tester** : vérifier que les compteurs collent avec ce que tu sais (ex. après ton test étudiant, les chiffres montent).

## 1.2 Inscriptions à valider (`/admin?section=pending`)
**Le scénario qu'on vient de fixer** — c'est ICI que les notifs arrivent quand un nouvel user s'inscrit.

**Étapes** :
1. Sidebar → clique sur la cloche 🔔 ou tape directement `/admin?section=pending`
2. Tu vois la liste des comptes en attente (badge orange avec compteur)
3. Pour chaque : Prénom/Nom, Email, **Filière** (tag couleur), **Promotion**, date d'inscription
4. **Pour valider** → clique "Valider" (bouton vert) → l'user reçoit un email + peut se connecter
5. **Pour refuser** → clique "Refuser" (bouton rouge) → modale → écris une raison (optionnel) → l'user reçoit un email avec la raison

## 1.3 Gestion des utilisateurs (`/admin?section=users`)
**Étapes** :
1. Filtre par rôle : Tous / Admins / Professeurs / Étudiants
2. Recherche par nom/email
3. Clique sur une ligne → elle s'étend → tu peux **éditer en ligne** (nom, prénom, filière, promotion)
4. Menu **•••** : Modifier / Activer-Désactiver / Supprimer (sauf admin)
5. Coche plusieurs lignes → bouton **"Supprimer la sélection"**
6. Bouton **"Créer un utilisateur"** → modale avec rôle/filière/promotion

**À tester** : désactive un étudiant, essaie de te connecter avec → tu dois voir "Compte désactivé".

## 1.4 Cours (`/admin?section=courses`)
- Liste de tous les cours créés par les profs
- Tu peux supprimer un cours (action destructive — confirme bien)

## 1.5 Support (`/admin?section=support`)
**Étapes** :
1. 4 onglets : **Libres** (orange, non assignés) / **Mes tickets** / **Tous ouverts** / **Résolus**
2. Filtre par priorité (urgent/high/normal/low) et catégorie
3. Clique un ticket → modale conversation : lis les messages, écris une réponse
4. Bouton **"Accepter"** → le ticket te devient assigné
5. Bouton **"Résoudre"** → ferme le ticket

**À tester** : avant, va créer un ticket côté étudiant (§3.10) puis reviens ici pour le traiter.

## 1.6 Récompenses (`/admin?section=rewards`)
**Étapes** :
1. Filtre par statut : En attente / Approuvés / Livrés / Refusés
2. Sur un claim → **"Approuver"** → modale demande **code de livraison** + note → claim passe à "Approuvé"
3. Bouton **"Livrer"** → claim passe à "Livré" (et points déjà débités)
4. Bouton **"Rejeter"** → claim refusé (points NON remboursés selon la logique)

**À tester** : crée un claim côté étudiant (§3.11), reviens ici pour le valider.

---

# 2. CÔTÉ PROFESSEUR — création de contenu

Connexion (`omar.isil.l3@fliplearn.dz`) → tu atterris sur `/professor/dashboard`.

## 2.1 Créer un cours
**Page** : `/courses` (sidebar → "Mes cours")

**Étapes** :
1. Bouton bleu **"Créer un nouveau cours"** (en haut à droite)
2. Modale : remplis
   - **Titre** (requis) : ex. "Sécurité informatique"
   - Description (optionnel)
   - Filière : ISIL / Management / Finance & Comptabilité
   - Promotion : L1 / L2 / L3
3. Clique **"Créer le cours"** → tu es redirigé sur la fiche du cours

## 2.2 Uploader une vidéo
**Page** : `/professor/courses/{courseId}/upload` (depuis la fiche cours → bouton "Ajouter vidéo")

**2 modes** :

### Mode A — Fichier local (Cloudinary)
1. Choisis l'onglet **"Upload fichier"**
2. Glisse une vidéo OU clique "Choisir un fichier"
   - Formats : **MP4, WebM, MOV**
   - Taille max : **100 MB**
3. Remplis :
   - **Titre** (requis)
   - Description (optionnel)
   - Ordre dans le cours (optionnel)
4. Clique **"Uploader la vidéo"** → barre de progression → upload Cloudinary

### Mode B — YouTube
1. Onglet **"Ajouter depuis YouTube"**
2. Colle l'**URL YouTube** (ex. `https://youtu.be/xxx`)
3. Remplis Titre + Description + Durée (en secondes)
4. Clique **"Ajouter la vidéo YouTube"**

**Tip pour la démo** : utilise YouTube (instantané, pas de gros upload).

## 2.3 Créer un QCM
**Page** : `/professor/qcm/create` (sidebar → "Gérer les QCM" → "Nouveau QCM" depuis la liste d'une vidéo)

**2 méthodes** :

### Méthode A — Manuel
1. Remplis **Titre** : ex. "QCM Introduction"
2. Bouton **"+ Ajouter une question"**
3. Pour chaque question :
   - Type : Choix unique / Choix multiple
   - **Énoncé** (requis)
   - **4 options A, B, C, D** (toutes requises)
   - Clique la lettre pour marquer la bonne réponse
   - Explication (optionnel — affichée à l'étudiant après réponse)
4. Paramètres (panneau droit) :
   - **Temps par question** (secondes)
   - **Points par bonne réponse**
5. Bouton **"Sauvegarder le QCM"**

### Méthode B — Génération IA (Groq Llama 3.3)
1. Onglet droit **"Génération par IA"**
2. Saisis **nb questions** (entre 2 et 15)
3. Clique **"Générer avec l'IA"** → l'IA lit la vidéo associée et propose des QCM
4. Tu peux **éditer** chaque question avant de sauvegarder
5. ⚠️ **Quota mensuel** : compteur affiché en haut. Si dépassé → écran 429 + lien "Premium".

## 2.4 Créer un projet (PBL)
**Page** : `/projects/create` (sidebar → "Projets" → "Nouveau projet")

**Étapes** :
1. Choisis le **Type** :
   - **Module unique** (mono) → 1 cours rattaché
   - **Multi-modules** (groupe) → ≥ 2 cours
   - **PFE** → 7 phases pré-remplies
2. **Titre** (requis), Description (optionnel)
3. **Rattachement** (requis) :
   - Mono : dropdown 1 cours
   - Groupe/PFE : checkboxes (≥ 2)
4. Énoncé + Mots-clés (optionnels)
5. **Calendrier** (optionnel) : début, fin, soutenance
6. **Phases** : pré-remplies selon le type, éditables. Bouton "+ Ajouter une phase"
7. Clique **"Créer le projet"**

## 2.5 Créer un Prosit (méthode CESI APP)
**Page** : `/prosits/create` (sidebar → "Prosits" → "Nouveau Prosit")

**Étapes** :
1. **Infos générales** :
   - **Titre** (requis) : ex. "Sécuriser une app web"
   - Pitch 1 phrase (optionnel)
   - **Énoncé complet** (requis, textarea) — situation/contexte/livrables
   - Cas d'entreprise : ex. "Sonatrach" (optionnel)
   - Mots-clés, Objectifs d'apprentissage
2. **Contexte pédagogique** :
   - Cours associé (optionnel — depuis le sprint final c'est optionnel)
   - **Filière** + **Promotion** (requis)
3. **Calendrier** :
   - **Date Aller** (séance 1, requis)
   - **Date Retour** (séance 2, doit être > Aller)
   - Durée recherche (jours)
4. **Groupes** :
   - Min/Max membres
   - Mode formation : Aléatoire / Manuel / Choix étudiants
5. **Grille d'évaluation** :
   - Critères pré-remplis (Pertinence / Profondeur / Qualité / Présentation)
   - **Total des poids = 100 obligatoirement** (validé avant submit)
   - Tu peux ajouter/supprimer des critères
6. Clique **"Créer le Prosit (brouillon)"** — l'étudiant le verra une fois publié

## 2.6 Préparation classe (CAI — `/professor/class-readiness`)
**Pour la soutenance** : c'est LA fonctionnalité phare "encadrement adaptatif personnalisé" à montrer.

**Étapes** :
1. Sidebar → "Préparation classe"
2. Sélectionne un cours
3. Tu vois un **dashboard analytique** : qui a regardé les vidéos, qui a fait les QCM, qui est en retard, prêt à venir en classe ou pas.
4. Liste **étudiants à risque** (rouge) / OK (vert) / en attente (gris)

## 2.7 Suivi étudiants (`/professor/tracking`)
- Liste détaillée par étudiant : progression vidéo %, QCM passés, badges
- Filtre par filière/promotion

## 2.8 Gérer les badges (`/professor/badges`)
- Crée un badge custom : nom, icône (emoji), critère (ex. "Compléter 5 QCM avec 80%+")
- Le badge sera attribué automatiquement par le système

## 2.9 Ajouter une ressource (`/resources`)
- Ressources globales partagées (PDF, lien, vidéo externe)
- Différent de "Vidéo de cours" : une ressource n'est pas obligatoire

## 2.10 Discuter avec un étudiant (`/chat`)
- Sidebar → "Messages"
- Liste des contacts (étudiants de tes cours)
- Clique → chat 1-to-1 socket en temps réel

---

# 3. CÔTÉ ÉTUDIANT — apprentissage

Connexion (`assil.isil.l3@fliplearn.dz`) → tu atterris sur `/` (Mon Parcours).

## 3.1 Inscription d'un nouvel étudiant
**Page** : `/register` (depuis `/login` → "Créer un compte")

**Étapes** :
1. **Étape 1** : Nom, Prénom, Email, Mot de passe (≥ 6 car.)
2. Clique **"Continuer"**
3. **Étape 2** : Rôle (Étudiant), Filière, Promotion
4. Clique **"S'inscrire"**
5. Si Render dort → bandeau "Réveil du serveur en cours…" (jusqu'à 60s)
6. Écran de confirmation : "Compte en attente de validation, < 24h"
7. Bouton **"Vérifier le statut de mon compte"** → tu peux voir si l'admin a déjà approuvé
8. Tu reçois un **email de confirmation** ("Inscription bien reçue") via Brevo
9. Quand admin approuve (§1.2) → 2ᵉ email + tu peux te connecter

## 3.2 Mon Parcours (CAI — `/my-journey`)
**LE point d'entrée principal** étudiant — montre les 5 phases du cycle inversé.

**Étapes** :
1. 5 cartes empilées : **Préparation → Rendez-vous → Prosit → Production → Consolidation**
2. Chaque carte affiche un % de progression
3. Clique **"Continuer"** sur Préparation → t'envoie aux vidéos / QCM en retard
4. Clique **"Voir les Prosits"** sur Prosit → liste de tes Prosits actifs
5. Clique **"Réviser maintenant"** sur Consolidation → tes flashcards dues

## 3.3 Mes cours (`/courses`)
**Étapes** :
1. Liste de tes cours (filtrés par filière/promotion automatiquement)
2. Clique un cours → fiche cours avec liste des vidéos
3. Statuts : **Non vu / En cours / Vu (≥ 80%)**

## 3.4 Regarder une vidéo
**Étapes** :
1. Depuis fiche cours, clique une vidéo → `/courses/{id}/video/{vid}`
2. Player HTML5 standard : lecture, vitesse, sous-titres
3. Si chapitres définis → clique pour saute au timestamp
4. À **80% de progression** → toast "Flashcards en cours de génération" (auto-flashcards IA OpenAI)
5. Bouton **"Demande à la vidéo"** → panel RAG : tu peux poser une question sur le contenu (basé sur transcription Whisper)
6. Boutons en bas : **"Vidéo suivante"** ou **"QCM"** (si la vidéo en a un)

⚠️ **80% = vidéo marquée vue** = prérequis pour le QCM.

## 3.5 Faire un QCM
**Étapes** :
1. Depuis la vidéo, bouton **"QCM"**
2. ⚠️ Si vidéo < 50% regardée → **bloqué**, écran "Reviens regarder la vidéo d'abord"
3. Sinon → écran "Lancer le QCM" avec : N questions / 15s par question / X pts par bonne réponse
4. Pour chaque question : sélectionne A/B/C/D → feedback instantané (vert/rouge) + explication
5. Fin : récap **score + points gagnés + badges éventuels**

## 3.6 Decks de flashcards (`/decks` + `/study/{deckId}`)
**Étapes — créer manuellement** :
1. Sidebar → "Mes decks" → bouton **"Nouveau deck"**
2. Titre, description, catégorie
3. Sur le deck → bouton **"+ Ajouter une carte"** → recto/verso

**Étapes — auto-générer (IA)** :
1. Bouton **"Générer avec l'IA"** → choisis cours/vidéo
2. L'IA (Groq) génère ~10 cartes que tu peux éditer

**Étapes — réviser** :
1. Sur un deck → **"Étudier"** → page flashcard
2. Clique la carte (ou ESPACE) pour flip
3. Boutons "À revoir / Bien / Parfait" → algorithme **SM-2** (spaced repetition) calcule la prochaine date
4. Onglet **"Cartes dues aujourd'hui"** sur la home decks

## 3.7 Travailler sur un projet (`/projects/{id}`)
**Étapes** :
1. Sidebar → "Projets" → choisis un projet
2. Tu vois : Timeline (phases), Mon groupe (rôles CESI), Livrables, Auto-évaluation
3. Si projet groupé → ton groupe est formé (aléatoire ou manuel selon config prof)
4. Bouton **"Soumettre un livrable"** → upload fichier
5. Bouton **"Aide IA"** → l'IA Groq te donne 3 ressources + 2 conseils méthodo + 1 cas MENA
6. À la fin : **auto-évaluation** + le prof note

## 3.8 Faire un Prosit (`/prosits/{id}`)
**Étapes — flux à 3 phases** :
1. **Phase Aller** (séance 1, en groupe en classe) : remplir Mots-clés / Problématique / Hypothèses / Plan
2. **Phase Recherche** (entre les 2 séances, individuel) : ta contribution écrite — passé au check IA (détection de génération IA)
3. **Phase Retour** (séance 2) : solution finale en groupe
4. Phase **Évalué** : le prof note → tu gagnes **+150 XP**
5. Tes **rôles CESI tournent** : Animateur / Secrétaire / Scribe / Gestionnaire / Membre — tu dois passer par TOUS avant que le cycle se réinitialise

## 3.9 Quiz Battle (`/quiz-battle`)
**Étapes** :
1. ⚠️ Prérequis : avoir au moins 1 vidéo à 80%+
2. Bouton **"Créer une salle"** → choisis matière → tu obtiens un **code de salle**
3. Partage le code → un autre étudiant clique **"Rejoindre"**
4. Quand 2 joueurs → host clique **"Commencer"** → 5 questions × 15s
5. Power-ups disponibles : 50/50 (élimine 2 mauvaises options) / Freeze (+8s) / x2 Points
6. Combo 3+ = +5 pts bonus / 5+ = +10 pts + badge
7. Fin : classement + stats (précision %, best streak)

## 3.10 Tuteur IA (`/my-tutor`)
**Étapes** :
1. Sidebar → "Mon tuteur IA"
2. Modèle : **Groq Llama 3.3 70B**
3. Tape ta question → réponse **socratique** (te guide, ne donne pas la réponse direct)
4. Boutons rapides : "Explique un concept" / "Quel cours commencer ?" / "Aide pour mon Prosit"
5. Bouton **micro 🎙️** → dictée vocale (Chrome/Edge, français)
6. Sidebar droite : **Points forts / Points faibles** + contexte (N cours, M QCM passés)
7. ⚠️ **Quota : 30 messages / jour** (affiché en haut)

## 3.11 Récompenses (`/rewards`)
**Étapes** :
1. Sidebar → "Récompenses"
2. Tu vois tes points actuels en haut
3. Onglet **"Catalogue"** : cartes récompenses avec emoji/titre/points requis
4. Filtre **"Accessibles"** = uniquement celles que tu peux te payer
5. Sur une récompense → **"Réclamer"** → modale confirmation → points débités → claim "En attente"
6. Onglet **"Mes réclamations"** = historique des statuts (En attente / Approuvé / Livré / Refusé)
7. Quand admin valide (§1.6), tu reçois la récompense

**Note** : actuellement seul "Abonnement FlipLearn Premium" est vraiment livrable (autres = futures).

## 3.12 Classement (`/leaderboard`)
- Top étudiants par points / streaks / badges
- Filtres par filière / promotion / période

## 3.13 Messages (`/chat`)
- Liste des contacts (profs de tes cours, étudiants de tes groupes)
- **Onglet "Feedback profs"** = espace dédié aux retours pédagogiques
- Chat 1-to-1 socket en temps réel

## 3.14 Profil + Support
- **Profil** (`/profile`) : stats personnelles, badges, historique
- **Support** (`/support`) : crée un ticket → l'admin le voit dans §1.5

---

# 4. SCÉNARIO E2E POUR LA SOUTENANCE (15 min chrono)

Workflow complet de bout en bout pour démontrer la plateforme :

| # | Action | Rôle | Durée |
|---|---|---|---|
| 1 | Connexion admin → montrer dashboard + section "Inscriptions" (montrer que c'est vide) | Admin | 1 min |
| 2 | S'inscrire avec un nouveau compte étudiant (`test.isil.l3@example.com`) | Étudiant | 1 min |
| 3 | Retour admin → notif cloche → valider l'inscription | Admin | 1 min |
| 4 | Connexion prof → créer un cours "Démo Sécurité" + uploader 1 vidéo YouTube + créer 1 QCM IA (3 questions) | Prof | 4 min |
| 5 | Créer un Prosit "Sécuriser une app web" (date Aller dans 1 jour, Retour dans 7) | Prof | 2 min |
| 6 | Connexion étudiant → Mon Parcours → ouvrir le cours → regarder la vidéo (skip à 90%) | Étudiant | 2 min |
| 7 | Faire le QCM (au moins une question juste) | Étudiant | 2 min |
| 8 | Aller sur Mon tuteur IA → poser 1 question liée au cours | Étudiant | 1 min |
| 9 | Retour prof → Préparation classe → montrer l'analytique avec l'étudiant qui apparaît "prêt" | Prof | 1 min |

**Pendant la démo** : ouvre le DevTools réseau (F12) pour montrer que c'est de la vraie API en live (pas du mock).

---

# 5. TIPS & DÉPANNAGE

## Cold start Render
- **Symptôme** : 1ʳᵉ requête met 30-60s → bandeau "Réveil du serveur en cours…"
- **Solution** : attendre. Pour la démo, ouvre l'app **5 min avant** ta soutenance pour réveiller le serveur.

## Inscription : aucun message après submit
- ✅ **Fixé le 02/05/2026** (commit `03ebd8f`) : timeout passé à 60s + bandeau réveil + message d'erreur explicite si timeout.

## Email pas reçu
- Vérifie les **spams**.
- Vérifie que la variable `BREVO_API_KEY` est bien set dans Render (Dashboard → Environment).
- Quota Brevo : 300 emails / jour gratuits.

## Vidéo upload échoue
- Format non supporté → utilise MP4
- Taille > 100 MB → réduis ou utilise YouTube
- Cloudinary timeout → réessaie (free tier limité)

## QCM "Vidéo bloquante"
- L'étudiant doit avoir regardé **≥ 50%** de la vidéo. Va sur la vidéo et regarde-la (ou skip à 50%).

## Prosit "Cours requis"
- Plus le cas depuis le 30/04 — `courseId` est devenu optionnel sur Prosit.

## Quota IA atteint
- Tuteur IA : 30 msg/jour/étudiant
- QCM AI : quota mensuel (selon plan free/premium)
- Reset : début du mois suivant pour les quotas mensuels

---

**Ce tuto est ton check-list de test exhaustif. Coche au fur et à mesure pour t'assurer que TOUT marche avant la soutenance du 15 juin 2026.**
