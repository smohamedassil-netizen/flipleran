# 🎓 Tutoriel complet — Tout ce que peut faire un étudiant

Guide exhaustif pour tester FlipLearn côté étudiant. Suit l'ordre de la sidebar.

---

## 0. Setup

| | |
|---|---|
| **URL local** | http://localhost:5173 (`npm run dev:backend` + `npm run dev:frontend`) |
| **URL prod** | https://fliplearn-5lsz.onrender.com (Render free → 30 s pour réveiller au 1er accès) |
| **Compte étudiant ISIL L3** | `assil.isil.l3@fliplearn.dz` / `test1234` |
| **Autres étudiants** | `karim.isil.l1@`, `amine.isil.l2@`, `leila.management.l3@`, etc. — même mot de passe `test1234` |

Au premier login, tu arrives sur `/` (Tableau de bord). La sidebar à gauche structure tout le parcours.

---

## 1. Éléments globaux (toujours visibles)

### 1.1 Sidebar (gauche)
4 sections grisées (titres en majuscules) qui regroupent les pages :
- **APPRENTISSAGE** (cours, tuteur, ressources, decks, projets)
- **APPRENTISSAGE PAR PROBLÈME** (Prosits, méthode CESI)
- **COMMUNAUTÉ** (classement, Quiz Battle, récompenses, messages)
- **MON ESPACE** (profil, aide)

Et en bas : **Paramètres** + **Déconnexion**. Bouton rond en bord externe pour réduire/agrandir la sidebar.

### 1.2 Topbar (haut)
- **Burger** (mobile) pour ouvrir/fermer la sidebar
- **Titre de la page courante**
- **Cloche notification** (avec badge rouge si non lues, ouvre dropdown 20 dernières)
- **Badge "Étudiant"** (vert)
- **Avatar avec tes initiales** (clic = menu déroulant : Mon profil / Paramètres / Déconnexion)

### 1.3 TutorBubble (bulle violette flottante en bas à droite)
Présente sur **toutes les pages**. Clic = ouvre le tuteur IA en mini-chat sans quitter la page actuelle.

### 1.4 Footer
"FlipLearn © 2026 — Plateforme de Classe Inversée — Fait par Mohamed Assil SERAY".

**🧪 Test global** : ouvre/ferme la sidebar via le bouton rond, change de page via les liens, vérifie que la cloche affiche bien le badge si tu as des notifications, puis clic dessus pour voir le dropdown.

---

## 2. APPRENTISSAGE

### 2.1 `/` — Tableau de bord

**Ce que tu vois** :
- Bandeau bleu "Bonjour, [Prénom] !" + sous-titre contextuel ("Vous avez X tâches à faire" ou "Tout est à jour 🎉")
- 4 stats cards : Points XP / Cours inscrits / Vidéos terminées / QCM complétés
- **"Mes cours"** : 5 derniers cours (clic = aller au cours)
- **"Cette semaine"** : deadlines J+0 à J+7 (vidéos à voir / QCM à faire). Si rien → "Tout est à jour ✅"
- **"Accès rapide"** : 4 boutons (Classement / Quiz Battle / Messages / Mon profil)

**Actions possibles** :
- Clic sur un cours → ouvre StudentCourse
- Clic sur "Voir tout" → `/courses`
- Clic sur un item de deadline → va à la vidéo/QCM concerné
- Clic sur un accès rapide → page correspondante

**🧪 Tests** :
1. Login pour la première fois → vérifie le message d'accueil personnalisé
2. Compte les stats : 300 XP, 3 cours, 0 vidéos, 0 QCM (compte démo)
3. Clic "Voir tout" → arrives sur `/courses`

---

### 2.2 `/courses` — Catalogue de cours

**Ce que tu vois** :
- Titre "Mes cours" + sous-titre "Retrouvez tous vos cours…"
- Barre de recherche (filtre live sur titre, description, filière, prof)
- Grille de cards (1 par cours) : icône + titre + description tronquée + badges `ISIL` `L3` + nom du prof

**Actions possibles** :
- Taper dans la barre → filtre live
- Clic sur une card → ouvre StudentCourse
- (Pas de filtre par filière/niveau séparé — les badges sont juste informatifs)

**🧪 Tests** :
1. Tape "cyber" dans la recherche → seul "Cybersécurité" reste
2. Vide la recherche → les 3 cours réapparaissent
3. Clic sur "Cybersécurité" → arrives sur la page du cours

---

### 2.3 `/courses/:id` — Détail d'un cours (StudentCourse)

**Ce que tu vois** :
- Breadcrumb : Accueil > Mes cours > [Titre cours]
- Titre cours + filière/promo (`ISIL · L3`)
- **Liste des vidéos** numérotées (1. / 2. / …) avec chacune :
  - Titre
  - Pourcentage de progression
  - Statut (Non vu / En cours / Terminé)
- **Panneau "MA PROGRESSION"** à droite :
  - Pourcentage global (cercle)
  - X/Y vidéos complétées
  - Détail par statut (Complétées / En cours / Non vues)
- **3 boutons** :
  - "Continuer le cours" → ouvre la 1re vidéo non terminée
  - "Chat du cours" → ouvre `/chat/course/:id`
  - "🤖 Assistant IA du module" → ouvre `/courses/:id/assistant`

Si un parcours pédagogique a été configuré par le prof, tu vois une **timeline** au lieu d'une liste plate.

**Actions possibles** :
- Clic sur une vidéo → ouvre WatchVideo
- Clic sur "Chat du cours" → discuter avec les autres étudiants du même cours
- Clic sur "Assistant IA du module" → IA spécialisée sur ce cours

**🧪 Tests** :
1. Ouvre un cours → vérifie que le breadcrumb te ramène à `/courses` puis à `/`
2. Clic sur "Continuer le cours" → ouvre la 1re vidéo non vue
3. Clic sur "🤖 Assistant IA du module" → arrives sur ModuleAssistant (chat IA contextuel au cours)

---

### 2.4 `/watch/:videoId` — Lecture vidéo

**Ce que tu vois** :
- Breadcrumb complet : Accueil > Mes cours > Cours > Titre vidéo
- **Lecteur vidéo** principal (HTML5 `<video>` ou YouTube embed selon le provider)
- Description courte sous le lecteur
- **Sidebar droite "Vidéos du cours"** : liste des vidéos pour naviguer
- **Section "Agent IA — Analyse de la vidéo"** sous la vidéo :
  - Bouton "Lancer l'analyse" si pas encore faite → Whisper transcrit l'audio + GPT-4o génère résumé/concepts
  - Tabs Résumé / Transcript / Concepts clés une fois l'analyse terminée
  - Quota IA en bas (X/Y analyses ce mois)
- Si vidéo regardée à ≥80%, le QCM se débloque

**Actions possibles** :
- Lecture/pause/fullscreen via les contrôles natifs
- Cliquer une autre vidéo dans la sidebar
- Lancer l'analyse IA (1 clic)
- Si quota IA épuisé : message d'erreur clair

**🧪 Tests** :
1. Ouvre une vidéo → elle se lance (⚠️ aujourd'hui les URLs Google sont 403, voir [GUIDE-CLOUDINARY-VIDEOS.md](GUIDE-CLOUDINARY-VIDEOS.md))
2. Regarde la vidéo à ≥50% → reviens sur le cours, vérifie que la barre de progression a avancé
3. Reviens à 80%+ → le QCM est cliquable depuis la page cours
4. Clic "Lancer l'analyse" → attends ~30 s → résumé + concepts apparaissent

---

### 2.5 `/qcm/:videoId` — QCM associé à une vidéo

**Ce que tu vois** :
**Si moins de 50 % de la vidéo a été visionnée** :
- Message "QCM verrouillé"
- Explication du principe classe inversée
- Progression actuelle (X% / 50% requis)
- Bouton "Regarder la vidéo"

**Si débloqué** :
- 5-10 questions à choix multiples
- Timer (selon config prof)
- Une question affichée à la fois, avec options A/B/C/D
- Feedback immédiat ou en fin de quiz selon config
- Score final + correction des erreurs + bouton "Refaire"

**🧪 Tests** :
1. Va directement sur `/qcm/<videoId>` sans avoir vu la vidéo → message "verrouillé"
2. Regarde la vidéo à ≥50% → reviens, le QCM se débloque
3. Réponds aux questions → vérifie le score + les bonnes réponses
4. Refais le quiz → vérifie qu'il marche en boucle

---

### 2.6 `/courses/:id/assistant` — Assistant IA module

**Ce que tu vois** :
- Page chat dédiée à un cours précis
- L'IA a été configurée par le prof (persona, RAG sur les docs du cours)
- Bulles user/assistant (avatar Bot)
- Champ texte + bouton Envoyer

**Actions possibles** :
- Poser des questions liées au contenu du cours
- L'IA cite les sources (vidéos, sections) quand pertinent
- Quota partagé avec MyTutor

**🧪 Test** : tape "Explique-moi en 2 phrases ce qu'est la triade CIA" → vérifie que la réponse est en français et pertinente.

---

### 2.7 `/my-tutor` — Mon tuteur IA personnel

**Ce que tu vois** :
- Layout 2 colonnes (desktop) ou empilé (mobile)
- **Gauche** : Suggestions du jour (3 actions IA personnalisées : "Regarde la vidéo X", "Révise tel concept", etc.) + ton contexte (cours en cours, points faibles)
- **Droite** : Chat avec le tuteur Bot (avatar violet)
  - Message d'accueil personnalisé "Bonjour [prénom] 👋"
  - 2 quick prompts au démarrage : "📚 Quel cours faire maintenant ?" / "🛠 Aide sur mon Prosit"
  - Champ texte + bouton Envoyer
  - **Bouton micro 🎤** (Web Speech API) — dictée vocale
- Quota : 30 messages/jour affiché en haut

**Actions possibles** :
- Taper une question
- Cliquer un quick prompt
- Cliquer une suggestion (envoie le texte au chat)
- Dictée vocale (clic micro → parle → texte transcrit)
- Méthode socratique : l'IA guide par questions, ne donne JAMAIS la réponse directe à un QCM

**🧪 Tests** :
1. Pose une question concrète : "Comment je commence mon Prosit ?" → l'IA propose une approche structurée
2. Demande la réponse à un QCM directement ("Quelle est la réponse à la question 1 du QCM Cybersécurité ?") → l'IA refuse poliment et reformule en mode socratique
3. Clic micro, parle 3 secondes → vérifie que le texte est transcrit dans le champ
4. Envoie 30 messages → vérifie le message "limite quotidienne atteinte"

---

### 2.8 `/resources` — Bibliothèque de ressources

**Ce que tu vois** :
- Titre "Bibliothèque de ressources"
- Sous-texte explicatif + lien "voir mes cours →" pour les ressources d'un cours précis
- **Filtres** : Tous / PDF / PPTX / DOCX / ZIP
- Liste de fichiers uploadés par les profs

**Actions possibles** :
- Clic sur un type → filtre par extension
- Clic sur un fichier → téléchargement

**🧪 Test** : filtre "PDF" → seuls les PDFs apparaissent. Clic sur un fichier → vérifie le téléchargement.

---

### 2.9 `/courses/:id/resources` — Bibliothèque d'un cours précis

Idem que `/resources` mais filtré sur les fichiers d'un seul cours.

---

### 2.10 `/decks` — Mes flashcards

**Ce que tu vois** :
- Breadcrumb Accueil > Mes decks
- Titre + sous-titre "X decks — cartes mémoire recto/verso pour réviser"
- 2 boutons : **"Générer avec l'IA"** (violet) / **"Nouveau deck"**
- Encart pédagogique : explication des decks/flashcards
- **Si 0 deck** : empty state avec icône + 2 CTA
- **Sinon** : grille de cards (titre, catégorie, nombre de cartes, dernière révision, boutons "Réviser" / "Supprimer")

**Actions possibles** :
- **"Nouveau deck" manuel** : modal avec titre, description, catégorie (datalist suggéré : Mathématiques, Informatique, Algorithmique, etc.)
- **"Générer avec l'IA"** : modal qui demande l'URL d'une vidéo (du cours) + titre optionnel → IA génère 10 flashcards automatiquement
- **"Réviser"** sur une card → ouvre `/study/:deckId`
- **"Supprimer"** → modal de confirmation (le clic ne supprime pas direct)

**🧪 Tests** :
1. Clic "Nouveau deck" → titre = "Test", catégorie = "Informatique" → crée
2. Clic "Générer avec l'IA" → choisis une vidéo → attends ~10 s → 10 flashcards créées
3. Supprime un deck → vérifie le modal de confirmation

---

### 2.11 `/study/:deckId` — Session de révision SM-2

**Ce que tu vois** :
- Breadcrumb
- Titre du deck + nombre de cartes restantes
- **Carte centrale** (face avant = question)
- Bouton **"Retourner"** ou clic sur la carte → flip vers la face arrière (réponse)
- Une fois retournée, **3 boutons SM-2** :
  - 🔁 **"Encore"** (rouge) — j'ai raté → quality 1 → carte revient demain
  - ✅ **"Bien"** (vert) — j'ai répondu → quality 4 → intervalle × ease factor
  - ⚡ **"Facile"** (bleu) — sans hésiter → quality 5 → intervalle × ease + bonus
- Feedback éphémère : "Prochaine révision dans X j"
- En bas : barre de progression dans la session
- À la fin : écran "Session terminée 🎉" avec stats (Encore/Bien/Facile + total)
- Bouton **"Recommencer"** pour relancer la session

**Actions possibles** :
- Flip de la carte (clic ou bouton)
- Grader avec un des 3 boutons → la carte mise à jour en DB (Wozniak SM-2)
- "+" pour ajouter une carte au deck en cours de session

**🧪 Tests** :
1. Crée un deck "Test", ajoute 3 cartes, clic "Réviser"
2. Flip → "Bien" 3× → écran de fin avec 3 Bien
3. Recommence → les cartes ne réapparaissent QUE si elles sont dues (sinon "Aucune carte à réviser aujourd'hui — reviens demain ✅")

---

### 2.12 `/projects` — Mes projets

**Ce que tu vois** :
- Titre "Projets"
- Encart pédagogique sobre sur la pédagogie projet
- Filtres par statut/type (s'il y en a)
- Grille de cards de projets :
  - Icône FolderKanban + titre
  - Description tronquée
  - Badge statut (actif / archivé / etc.)
  - Badges modules attachés (max 2 visibles + "+N" si plus)
  - Footer : nombre de groupes / phases / date soutenance

**🧪 Tests** :
1. Vérifie qu'on voit bien les 4 projets seedés
2. Clic sur un → ouvre ProjectDetail

---

### 2.13 `/projects/:id` — Détail projet

**Ce que tu vois** :
- Titre projet + statut
- **Sections** :
  - **Progression globale** (barre %)
  - **Idées & suggestions** : encart où l'étudiant peut poster des idées (avec compteur "5")
  - **✅ Checklist par phase** : les items à faire (clic case = marquer comme fait)
  - **Phases du projet** : timeline horizontale ou verticale des phases (Aller, Recherche, Retour, etc.)
  - **Livrables** : fichiers uploadés par les groupes
  - **Activité du projet** : feed des actions récentes
  - **Aide IA** : bouton "Demander de l'aide à l'IA" (utilise le tuteur F4)
  - **Mon groupe** : liste des membres du groupe

**Actions possibles** :
- Cocher/décocher la checklist → progression update en live
- Uploader un livrable
- Discuter avec son groupe (chat groupe)
- Demander de l'aide IA contextuelle au projet

**🧪 Tests** :
1. Coche une case de checklist → vérifie que la progression % avance
2. Clic "Demander de l'aide à l'IA" → l'IA propose une analyse du projet
3. Si tu es dans un groupe : test l'upload de livrable

---

## 3. APPRENTISSAGE PAR PROBLÈME

### 3.1 `/prosits` — Liste des Prosits

**Ce que tu vois** :
- Titre "Prosits — Apprentissage Par Problème — méthodologie CESI adaptée à EM Alger"
- Encart pédagogique explicatif sur les 3 phases (Aller / Recherche / Retour) et les rôles CESI
- **"Ma rotation des rôles"** (zone gamification) :
  - Cycle N + nombre de prosits terminés
  - 5 rôles avec statut : Animateur / Secrétaire / Scribe / Gestionnaire / Membre
  - Chaque rôle = badge "✓ X× au total" si déjà joué, "jamais joué" sinon
  - Note explicative : tu dois passer par tous les rôles avant cycle suivant
- **Tabs** : Tous / Phase Aller / Recherche / Phase Retour / Évalués
- Cards de Prosits avec :
  - Badge statut (PHASE ALLER / RECHERCHE / PHASE RETOUR / ÉVALUÉ)
  - Titre + description
  - Dates Aller + Retour
  - Nombre de groupes / membres

**🧪 Tests** :
1. Clic chaque tab → vérifie que la liste filtrée est bonne
2. Vérifie que ta rotation des rôles montre tes Animateur déjà joués
3. Clic sur un Prosit → ouvre PrositDetail

---

### 3.2 `/prosits/:id` — Détail Prosit

**Ce que tu vois** :
- Titre Prosit
- **Modal d'onboarding "Première fois sur un Prosit ?"** au premier affichage → bouton "Lire la méthode (5 min)" / "Plus tard"
- **Sections** :
  - **Énoncé** : texte du cas à résoudre
  - **Groupe (X)** : ton groupe avec rôles attribués (Animateur, Secrétaire, etc.)
  - **Espace collaboratif** : zone de travail commune (tableau partagé)
  - **Grille d'évaluation** : critères et descripteurs (visible par tous)
- **Bouton retour** vers `/prosits`
- **Lien vers le cours associé** (📚 Cybersécurité →)

**Actions possibles selon ton rôle** :
- **Animateur** : modérer la phase Aller, distribuer la parole
- **Secrétaire** : noter les contributions du groupe
- **Scribe** : remplir le tableau partagé
- **Gestionnaire** : suivre les délais
- Tous : poster des contributions dans l'espace collaboratif

**🧪 Tests** :
1. Premier ouverture → modal "Première fois sur un Prosit ?" → clic "Lire la méthode" → arrives sur `/method-guide`
2. Reviens sur le Prosit → clic "Plus tard" → modal disparaît
3. Vérifie que les badges rôle de tes camarades sont visibles
4. Si tu es membre actif : poste une contribution dans l'espace collaboratif

---

### 3.3 `/prosits/:id/peer-assessment` — Évaluation par les pairs

**Ce que tu vois** (uniquement quand le prof a déclenché la phase d'évaluation) :
- Liste des autres membres de ton groupe
- Pour chacun : critères à noter (Contribution / Collaboration / Communication / etc.)
- Champ commentaire optionnel
- Bouton "Soumettre"

**Actions possibles** :
- Noter chaque membre sur les critères
- Ajouter un commentaire constructif
- Soumettre l'évaluation (anonymisée pour les autres, visible par le prof)

**🧪 Test** : si tu as un Prosit en phase d'évaluation, ouvre la page → note tes camarades → soumets. (Falchikov 2005 + Topping 1998 : 70 % poids prof + 30 % poids pairs)

---

### 3.4 `/method-guide` — La méthode des Prosits

**Ce que tu vois** :
Page documentaire complète avec **7 sections** :
1. **Qu'est-ce qu'un Prosit ?** — philosophie APP/CESI
2. **Les 3 phases** — Aller (analyse en groupe) / Recherche (individuel) / Retour (présentation tuteur)
3. **Les 5 rôles tournants** — Animateur / Secrétaire / Scribe / Gestionnaire / Membre + responsabilités
4. **Pièges à éviter** — erreurs typiques de débutant
5. **L'évaluation** — critères + grille
6. **Pourquoi ça marche** — théorie pédagogique (références Falchikov, Topping)

**🧪 Test** : lis chaque section. C'est ta référence pour ton mémoire et pour expliquer la méthode au jury.

---

## 4. COMMUNAUTÉ

### 4.1 `/leaderboard` — Classement

**Ce que tu vois** :
- Titre "Classement"
- **Podium top 3** (médaille or/argent/bronze, plus grand pour le 1er)
- Liste des suivants (4e à 20e) avec rang, avatar, nom, points
- Toi mis en évidence (si dans le top 20)

**Actions possibles** :
- Aucune action — c'est en lecture seule

**Note** : la version 3 onglets (Ma promotion / Top du mois / Ma progression) prévue en F11B n'est PAS livrée sur cette branche.

**🧪 Test** : vérifie ton rang. Si tu es 1er avec 300 pts, c'est normal pour le seed démo.

---

### 4.2 `/leaderboard/:courseId` — Classement par cours

Même structure que `/leaderboard` mais filtré sur les étudiants inscrits à un cours précis.

---

### 4.3 `/quiz-battle` — Duel temps réel

**Ce que tu vois** :

#### Lobby (avant de jouer)
- Titre "Quiz Battle"
- **Pré-requis** : "Avant de défier tes camarades, regarde au moins une vidéo en entier" (si 0 vidéo terminée → bouton désactivé)
- 2 onglets :
  - **🎮 Jouer** : créer une salle ou rejoindre une salle existante
  - **🏆 Classement** : top 10 + tes stats Battle (V/D, score, KO)
- Bouton **"+ Créer une salle"** ouvre un modal :
  - Choix matière (Toutes / un cours précis)
  - Confirmer → salle créée (toi en host)
- Liste des **salles disponibles** : nom du host, matière, "1/2 joueurs", bouton "Rejoindre"
- Encart règles repliable

#### Match (à 2 joueurs)
- Question affichée avec timer 15 s
- 4 choix A/B/C/D
- **3 power-ups** (1 utilisation chacun) :
  - 🎯 **50/50** (cyan) — élimine 2 mauvaises réponses
  - ❄️ **Freeze** (indigo) — +8 secondes au timer
  - ✨ **x2 Points** (orange) — double les points de cette question
- Score live + streak visible des 2 joueurs
- Animation visuelle quand l'adversaire utilise un power-up
- Feedback "+X pts" après chaque réponse
- 5 questions par match

#### Fin de match
- Tableau résultats : score final + KO (qui a gagné quoi)
- Bouton "Rejouer" ou "Retour au lobby"
- Stats persistées dans `/battle/mine`

**🧪 Tests** :
1. Si 0 vidéo terminée → vérifie que le bouton "Créer salle" est désactivé avec message
2. Avec 1 vidéo terminée → crée une salle, choisis un cours, attends un autre joueur (ou ouvre 2 onglets en mode incognito)
3. Pendant un match : utilise les 3 power-ups
4. Vérifie l'onglet Classement après plusieurs matchs

---

### 4.4 `/rewards` — Marketplace de récompenses

**Ce que tu vois** :
- Bouton retour
- Titre "Abonnement FlipLearn"
- Sous-titre : "Échange tes points contre des mois d'abonnement Premium pour profiter des fonctionnalités IA premium"
- **Encart "MES POINTS"** : compteur géant de tes XP
- Sous : "Prochain objectif : 1 mois FlipLearn Premium gratuit"
- Cards de récompenses :
  - Couronne 👑 Crown + label "Abonnement FlipLearn"
  - Titre récompense + description
  - "X mois d'accès offert"
  - Coût en points
  - Bouton "Réclamer" (désactivé si pas assez de points : "Manque X pts")
  - Badge "Top" si récompense mise en avant
- **Mes réclamations** (en bas) : statut pending/approved/delivered/rejected

**Note légale** : seule la récompense "1 mois Premium" est active (le seed désactive les autres types pour des raisons juridiques — pas de structure légale pour engager sur prestations matérielles).

**🧪 Tests** :
1. Vérifie que ton solde XP est bien affiché en grand
2. Si tu as assez de points : clic "Réclamer" → demande envoyée → status "En attente"
3. Sinon : message "Manque X pts pour débloquer"

---

### 4.5 `/chat` — Liste des contacts (ChatContacts)

**Ce que tu vois** :
- Titre "Messages"
- Sous-texte : "Discutez avec vos camarades et professeurs. Pour une aide IA spécifique à un cours, ouvrez le cours et utilisez son Assistant Module."
- **Onglets** : Contacts / **Feedback profs (X)** (compteur retours profs non lus)
- **Sous-filtres** Contacts : Tous / Professeurs (15) / Étudiants
- Cards contacts : avatar coloré (vert étudiant / orange prof / rouge admin) + nom + filière + bouton "Discuter"

**Actions possibles** :
- Recherche live par nom
- Filtre par rôle
- Clic sur "Feedback profs" → liste des retours pédagogiques personnalisés du prof
- Clic sur un contact → ouvre `/chat/private/:userId`

---

### 4.6 `/chat/private/:userId` — Conversation 1-1

**Ce que tu vois** :
- Header avec nom du contact
- Bulles de messages chronologiques
- Champ texte + bouton Envoyer
- Indicateur "X est en train d'écrire…"
- Socket.io temps réel — les messages arrivent live

**🧪 Test** : ouvre une conversation, envoie un message, ouvre un 2e onglet en autre user, vérifie l'arrivée temps réel.

---

### 4.7 `/chat/course/:courseId` — Chat de cours (groupe)

**Ce que tu vois** :
- Salon de chat collectif pour tous les inscrits au cours
- Bulles avec avatar + nom de chaque message
- Champ texte + Envoyer
- Le prof peut épingler des messages

**🧪 Test** : poste un message → vérifie que les autres étudiants du même cours le voient (Socket.io).

---

## 5. MON ESPACE

### 5.1 `/profile` — Mon profil

**Ce que tu vois** :
- Bouton **"Télécharger mon récap"** (PDF avec stats)
- **Header profil** : avatar XXL avec initiales + nom complet + email + filière + promo
- **Stats** :
  - Points totaux (300)
  - Vidéos complétées
  - QCM complétés
  - Score moyen QCM
  - Badges gagnés (1)
- **Section "Mes récompenses"** : liste des récompenses réclamées et leur statut
- **Section "Badges à débloquer"** (si tu as des badges locked) : grille avec icônes + condition de déblocage
- **Section "Modifier mon profil"** : formulaire édition (nom, email, photo, etc.)

**Actions possibles** :
- Téléchargement récap PDF
- Modifier ses infos
- Changer son avatar (upload)

**🧪 Tests** :
1. Téléchargement récap → vérifie le PDF
2. Modifie ton prénom → reload → vérifie que c'est sauvegardé
3. Si badges locked : survole pour voir la condition

---

### 5.2 `/support` — Aide & Support

**Ce que tu vois** :
- Titre "Aide & Support"
- Sous-texte : "Trouve des réponses aux questions courantes, ou crée un ticket pour discuter avec l'équipe."
- **Section "Questions fréquentes"** (FAQ) :
  - Comment accéder à mes cours ?
  - Comment passer un QCM ?
  - Comment créer un deck ?
  - … (clic = expand/collapse)
- **Section "Mes tickets"** :
  - Liste de tes tickets (open / pending / closed)
  - Bouton "Nouveau ticket" → modal (objet, message, priorité)

**🧪 Tests** :
1. Clic sur 2-3 questions FAQ → vérifie l'expand
2. Crée un ticket "Test" → vérifie qu'il apparaît dans Mes tickets

---

## 6. NOTIFICATIONS (cloche topbar + page dédiée)

### 6.1 Dropdown notifications (cloche topbar)
Dropdown de 320×400 px qui apparaît au clic sur la cloche :
- Titre "Notifications"
- Boutons "Marquer tout lu" / "Effacer"
- Liste des **20 dernières notifs** :
  - Bullet point coloré (rouge urgent / vert success / orange warning / bleu info)
  - Texte de la notif
  - Date relative
  - Clic → marque comme lue + navigue (si la notif a un lien)

### 6.2 `/notifications` — Page complète
- Titre "Notifications"
- Boutons "Tout marquer lu" / "Tout supprimer"
- Compteur "X notifications non lues"
- **3 filtres** (boutons pill) : Toutes (X) / Non lues (X) / Rappels (X)
- Liste paginée avec :
  - Icône colorée selon type (vidéo, QCM, projet, ticket, message, urgent, etc.)
  - Titre + corps de la notif
  - Date relative ("il y a 2 h")
  - Bouton "Marquer lue" / "Supprimer"

**🧪 Tests** :
1. Vérifie le badge rouge sur la cloche topbar (16 non lues sur le seed démo)
2. Clic cloche → dropdown → clic une notif → tu vas vers la page liée + le badge décroît
3. Va sur `/notifications` → filtre par "Rappels" → vérifie le contenu
4. "Tout marquer lu" → badge passe à 0

---

## 7. PARAMÈTRES (`/settings`)

**Ce que tu vois** :
- Titre "Paramètres"
- **Section "Apparence"** :
  - Toggle Thème : Clair / Sombre
- **Section "Notifications"** :
  - Toggle "Notifications par email" — recevoir des emails pour nouveaux cours, vidéos, QCM, messages, rappels deadlines
  - (Selon implémentation) sous-options par type
- Lien "Retour"

**🧪 Tests** :
1. Bascule en thème sombre → vérifie que toute l'app passe en sombre
2. Désactive les emails → vérifie qu'on ne reçoit plus
3. Reload → vérifie que les préférences persistent

---

## 8. Scénarios complets ("golden paths")

### 🟢 Parcours étudiant typique d'une session de 30 min
1. Login → Dashboard → vois "Vous avez 2 tâches cette semaine"
2. Clic sur la 1re deadline (vidéo) → regarde à 80%+
3. QCM se débloque → fais le QCM → 7/10 ✅
4. Clic "Mon tuteur IA" → "Pourquoi je me suis trompé sur la question 3 ?" → l'IA t'explique
5. Va dans "Mes decks" → "Générer avec l'IA" depuis cette vidéo → 10 flashcards créées
6. Lance révision → "Bien" / "Encore" / "Facile"
7. Clic Notifications → marque les rappels comme lus
8. Vérifie tes nouveaux XP dans le profil

### 🟢 Parcours Prosit complet (sur 2 semaines)
1. Va dans "Prosits" → ouvre un Prosit en "Phase Aller"
2. Lis le modal méthode si 1re fois → clic "Lire la méthode (5 min)"
3. Reviens sur le Prosit → identifie ton rôle CESI
4. Phase Aller : participe à l'analyse en groupe (chat groupe)
5. Phase Recherche : fais le travail individuel
6. Phase Retour : présente au tuteur (le prof évalue)
7. Phase Évaluation : évalue tes camarades via `/prosits/:id/peer-assessment`
8. Reviens dans `/prosits` → vérifie que ton cycle de rôles a avancé

### 🟢 Parcours gamification
1. Joue un Quiz Battle → gagne → +50 XP + badge éventuel
2. Vérifie ton classement
3. Va dans "Récompenses" → vois si tu peux débloquer "1 mois Premium"
4. Vérifie ton profil : nouveaux badges + récap PDF mis à jour

---

## 9. Bugs/limites connus à la date du 1er mai 2026

| Sujet | Statut |
|---|---|
| Vidéos seedées ne se lisent pas (URLs Google révoquées → 403) | ⏸️ Action user requise — voir [GUIDE-CLOUDINARY-VIDEOS.md](GUIDE-CLOUDINARY-VIDEOS.md) |
| Leaderboard 3 onglets (F11B) | Non livré sur cette branche — décision : non prioritaire pour PFE L3 |
| F2 plagiat / F3 insights / F5 ask-video / F6 auto-flashcards / F7 coach Prosit | Désactivés volontairement (perspective d'évolution) — voir [FEATURES-DISABLED.md](FEATURES-DISABLED.md) |
| Render free tier sleep | Premier accès = 30 s de réveil (normal, pas un bug) |

---

## 10. Pour le mémoire / soutenance

Ce tutoriel peut servir de **base directe** pour :
- Le chapitre **"Manuel utilisateur"** du mémoire (copier/coller adapté)
- Les **slides de démo** (1 slide par fonctionnalité majeure)
- Le **script de soutenance** (parcours fil rouge : login → cours → vidéo → QCM → tuteur → Prosit → projet)

Et pour les **tests utilisateur** avec tes 3-5 camarades L3 ISIL : utilise [PROTOCOLE-TESTS-UTILISATEUR-ETUDIANT.md](PROTOCOLE-TESTS-UTILISATEUR-ETUDIANT.md) qui résume les 8 tâches clés en 30 min.
