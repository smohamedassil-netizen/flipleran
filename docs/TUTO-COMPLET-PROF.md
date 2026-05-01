# 👨‍🏫 Tutoriel complet — Tout ce que peut faire un prof

Guide exhaustif pour tester FlipLearn côté professeur. Suit l'ordre de la sidebar prof.

---

## 0. Setup

| | |
|---|---|
| **URL local** | http://localhost:5173 (`npm run dev:backend` + `npm run dev:frontend`) |
| **URL prod** | https://fliplearn-5lsz.onrender.com (Render — 30 s pour se réveiller au 1er accès) |
| **Compte prof ISIL L3** | `omar.isil.l3@fliplearn.dz` / `test1234` |
| **Autres profs** | `karim.isil.l1@`, `amine.isil.l1@`, `leila.management.l3@`, `sami.finance.l3@`, etc. |
| **Compte admin** | `admin@fliplearn.dz` / `admin1234` |

Au premier login, tu es **automatiquement redirigé** vers `/professor/dashboard/<courseId>` du 1er cours que tu enseignes (DashboardRouter intelligent).

---

## 1. Éléments globaux côté prof

### 1.1 Sidebar (5 sections)
- **MON ENSEIGNEMENT** : Tableau de bord / Suivi étudiants / Mes cours (avec sous-menu **OBJECTIFS BLOOM** par cours) / Ressources / Projets
- **APPRENTISSAGE PAR PROBLÈME** : Prosits / Méthode Prosit
- **CRÉATION** : Gérer les QCM / Gérer les badges
- **COMMUNICATION** : Messages
- **MON ESPACE** : Mon profil / Aide & Support

### 1.2 Topbar
- Burger mobile / Titre page / Cloche notifications / Badge "Professeur" (orange) / Avatar avec initiales

### 1.3 Différences clés vs sidebar étudiant
- Pas de "Mon tuteur IA", "Mes decks", "Classement", "Quiz Battle", "Récompenses" (réservé étudiant)
- Sous-menu **Objectifs Bloom** sous "Mes cours" (auto-déployé pour le prof)
- Section **CRÉATION** dédiée (QCM + badges)

---

## 2. MON ENSEIGNEMENT

### 2.1 `/professor/dashboard/:courseId` — Tableau de bord (Synthèse de classe)

**Ce que tu vois** :
- Bouton "Retour"
- Bandeau de description : "📊 Synthèse de classe — vue d'ensemble par cours : statistiques agrégées, alertes, classement."
- Lien "Voir le suivi individuel par étudiant →"
- **Bandeau d'alertes proactives** (X alertes — cours sous 50% de complétion → "Voir le détail ▾")
- **Section "Insights IA"** (F3) : recommandations actionnables générées par Groq sur les métriques du cours
- **Header du cours** : titre + filière + promo + sélecteur si plusieurs cours
- **Boutons** : Rafraîchir / Parcours pédagogique / Ajouter une vidéo
- **4 stats cards** :
  - Étudiants inscrits (X)
  - Complétion vidéos (% moyen)
  - Réussite QCM (% moyen ou — si aucune tentative)
  - Vidéos publiées (X) + nombre de QCM associés
- **Tableau "Suivi de visionnage par vidéo"** :
  - Indicateur de préparation avant le cours en présentiel
  - 3 catégories : **Prêts (≥80%)** / **Partiel (40-80%)** / **Non prêts (<40%)**
  - Pour chaque vidéo : numéro / titre / progression (X/Y terminé) / score moyen / taux complétion / bouton "Questions"

**Actions possibles** :
- Changer de cours via le sélecteur
- Rafraîchir les stats
- Cliquer "Parcours pédagogique" → va sur `/professor/courses/:id/path-builder`
- Cliquer "Ajouter une vidéo" → va sur `/professor/courses/:id/upload`
- Cliquer "Questions" sur une vidéo → va sur `/professor/videos/:vid/questions`
- Cliquer "Voir le détail ▾" sur les alertes → liste des étudiants en difficulté
- Section Insights IA : "Rafraîchir" pour régénérer les insights

**🧪 Tests** :
1. Login prof → tu arrives directement sur le dashboard du 1er cours
2. Change de cours via le sélecteur → vérifie que les stats se mettent à jour
3. Clic "Voir le suivi individuel par étudiant →" → arrives sur `/professor/tracking`
4. Clic sur une vidéo → tu vois les questions in-video

---

### 2.2 `/professor/tracking` — Suivi individuel des étudiants

**Ce que tu vois** :
- Bouton "Retour"
- Header : "👤 Suivi individuel — détail par étudiant : progression vidéo, scores QCM, rappels ciblés."
- Lien "Pour la vue d'ensemble par cours, ouvre la Synthèse de classe depuis le tableau de bord."
- Titre "Suivi individuel des étudiants"
- **Bouton "Rappel global"** (envoie un email rappel à toute la promo)
- **Liste par étudiant** : nom + cours + progression
- Pour chaque vidéo non terminée : bouton **"⏰ <titre vidéo>"** (envoie un rappel sur cette vidéo précise)
- Pour chaque QCM non fait : **"⏰ QCM — <titre>"**
- Bouton **"Rappel"** par étudiant (rappel ciblé)
- Bouton **"IA"** par étudiant → ouvre `StudentSuggestionModal` (F3) avec un mini-plan d'action personnalisé généré par IA

**Actions possibles** :
- Rappel global (email à toute la promo)
- Rappel ciblé étudiant
- Rappel précis vidéo/QCM
- Mini-plan IA par étudiant

**🧪 Tests** :
1. Clic "Rappel global" → modal de confirmation → envoie un email à tous les étudiants L3
2. Clic "Rappel" sur un étudiant → email ciblé sur cet étudiant uniquement
3. Clic "IA" → modal qui montre les forces/faiblesses de cet étudiant + 3 actions concrètes
4. Clic "⏰ <vidéo>" → notification + email "tu n'as pas encore commencé cette vidéo"

---

### 2.3 `/professor/tracking/:courseId` — Suivi filtré par cours

Même structure que `/professor/tracking` mais filtré sur un seul cours.

---

### 2.4 `/courses/:id` (vue prof) — Page d'un cours

Différente de la vue étudiant. Tu vois :
- Breadcrumb Accueil > Mes cours > [Titre]
- Boutons exclusifs prof : **Objectifs Bloom** / **Parcours pédagogique** / **Ajouter vidéo** / **Ressources**
- Si parcours non configuré : bandeau "📚 Parcours pédagogique non configuré — vous pouvez organiser les vidéos, QCM et Prosits en une séquence guidée." + bouton "Configurer le parcours →"
- Liste de tes vidéos avec bouton "Configurer" / "QCM" / "Questions" / "Modifier"

**🧪 Tests** :
1. Clic "Objectifs Bloom" → arrives sur `/professor/courses/:id/outcomes`
2. Clic "Parcours pédagogique" → arrives sur `/professor/courses/:id/path-builder`
3. Clic "Ajouter vidéo" → arrives sur `/professor/courses/:id/upload`

---

### 2.5 `/professor/courses/:id/upload` — Ajouter une vidéo

**Ce que tu vois** :
- Titre "Ajouter une vidéo"
- Sous-titre : "La vidéo sera uploadée directement vers Cloudinary."
- **2 modes** :
  - **"Upload fichier"** : drop zone "Glissez votre vidéo ici / ou cliquez pour parcourir — MP4, WebM, MOV (max 100 MB)"
  - **"Ajouter depuis YouTube"** : input URL YouTube
- Champs : Titre * / Description / Ordre dans le cours
- Bouton "Uploader la vidéo"

**Actions possibles** :
- Glisser-déposer un fichier MP4
- Coller une URL YouTube
- Configurer ordre dans le cours

**🧪 Tests** :
1. Glisse une petite vidéo MP4 (≤10 MB pour test rapide)
2. Vérifie l'upload Cloudinary (barre de progression)
3. Vérifie que la vidéo apparaît dans le cours après upload
4. Réessaye avec une URL YouTube → vérifie l'embed

---

### 2.6 `/professor/courses/:id/videos/:vid/auto-prep` — Auto-préparation IA (F1) ⭐

Ta **feature star** pour la démo PFE.

**Ce que tu vois** :
**Si l'analyse IA de la vidéo a déjà été faite** :
- Sections générées par IA en 1 clic :
  - Résumé pédagogique
  - Concepts clés
  - 5 idées de QCM (basées sur le transcript)
  - 3 idées de questions in-video (avec timestamps)
  - 2 idées de Prosit (cas d'application)
- Bouton "Publier" pour appliquer en 1 clic les éléments cochés

**Si l'analyse n'est pas faite** :
- Erreur : "Transcription non disponible. Lance d'abord l'analyse IA de la vidéo et reviens dans 1-2 minutes."
- Bouton "Retour"

**Pour faire fonctionner** :
1. Aller sur `/watch/:vid` en mode prof
2. Cliquer "Lancer l'analyse" (Whisper + GPT-4o, ~30s-2min)
3. Une fois terminé, revenir sur `/auto-prep`
4. ⚠️ **Si vidéo cassée (URL Google 403)** → l'analyse échoue → auto-prep impossible. Cf. [`GUIDE-CLOUDINARY-VIDEOS.md`](GUIDE-CLOUDINARY-VIDEOS.md) pour fixer.

**🧪 Tests** :
1. Va sur `/watch/<videoId>` → "Lancer l'analyse" → attends ~1 min
2. Va sur `/auto-prep` → 5 appels Groq parallèle pour générer (résumé/QCM/questions/prosit)
3. Coche les éléments à publier → "Publier" → vérifie que QCM créés + questions in-video posées + prosit drafté

---

### 2.7 `/professor/courses/:id/path-builder` — Parcours pédagogique

**Ce que tu vois** :
- Breadcrumb Accueil > Mes cours > [Cours] > Parcours pédagogique
- Header : "Parcours pédagogique — Brouillon" (ou Publié)
- Sous-titre : "Cybersécurité · Organise les vidéos, QCM et Prosits en une séquence guidée."
- Boutons : **Aperçu étudiant** / **Enregistrer** / **Publier**
- Champs : Titre du parcours / Description / Intro pédagogique
- Liste des **étapes** : drag-and-drop, chaque étape = vidéo OU QCM OU Prosit OU lien externe
- Bouton "Ajouter une étape"

**Actions possibles** :
- Réorganiser les étapes (drag-and-drop)
- Ajouter une vidéo / QCM / Prosit / lien externe
- Configurer pré-requis (étape X bloque étape Y)
- Aperçu étudiant (preview de comment ça se présentera)
- Publier (visible aux étudiants) ou rester en brouillon

**🧪 Tests** :
1. Crée un parcours "Module 1 — Bases" avec 3 étapes (vidéo + QCM + Prosit)
2. Aperçu étudiant → vérifie le rendu
3. Publier → reviens sur `/courses/:id` étudiant → vérifie la timeline structurée

---

### 2.8 `/professor/courses/:id/outcomes` — Objectifs d'apprentissage (Bloom) ⭐

Le cœur de l'**alignement constructif** (Biggs 1996, Anderson & Krathwohl 2001).

**Ce que tu vois** :
- Breadcrumb
- Titre "Objectifs d'apprentissage"
- Sous-titre : "Cybersécurité · Taxonomie de Bloom révisée + contrat pédagogique"
- Boutons : Retour / **Enregistrer**
- Section "Comprendre la taxonomie de Bloom révisée" (encart explicatif)
- Liste des objectifs : "0 objectifs — Aucun objectif défini"
- Bouton "Ajouter un objectif"
- Pour chaque objectif :
  - Verbe d'action (Définir / Expliquer / Appliquer / Analyser / Évaluer / Créer — selon les 6 niveaux de Bloom)
  - Énoncé de l'objectif
  - Niveau Bloom (1-6)
  - Vidéos qui couvrent cet objectif (multi-select)
- Section **Contrat pédagogique** : éditeur Markdown (Biggs 1996) — règles + engagement réciproque

**Actions possibles** :
- Ajouter / éditer / supprimer des objectifs
- Lier les objectifs à des vidéos (champ `coversOutcomes` du modèle Video)
- Rédiger le contrat pédagogique en Markdown

**🧪 Tests** :
1. Ajoute 3 objectifs de niveaux différents (Connaissance / Application / Analyse)
2. Lie chacun à une vidéo
3. Sauvegarde → reviens sur `/courses/:id` étudiant → vérifie que les objectifs sont visibles

---

### 2.9 `/professor/videos/:vid/qcm` — Éditeur QCM (1 par vidéo)

**Ce que tu vois** :
- Titre "Créer un QCM"
- Compteur "5 questions" (si le QCM existe)
- Header "VIDÉO ASSOCIÉE" + titre de la vidéo
- Pour chaque question :
  - Numéro
  - Énoncé *
  - Type : Choix unique / Choix multiple
  - Réponses A/B/C/D
  - Note : "Cliquez sur la lettre pour définir la bonne réponse."
  - Explication (affichée après soumission)
- Boutons : Ajouter une question / Générer avec l'IA / Sauvegarder le QCM / Aperçu étudiant

**Actions possibles** :
- Créer manuellement les questions
- **Générer avec l'IA** : Groq génère 5-10 questions à partir du transcript de la vidéo (nécessite que l'analyse IA soit faite avant)
- Aperçu étudiant : preview du QCM tel que l'étudiant le verra

**🧪 Tests** :
1. Crée 3 questions manuellement
2. Clic "Générer avec l'IA" → 5 nouvelles questions ajoutées (basées sur la vidéo)
3. Aperçu étudiant → vérifie le rendu (timer, A/B/C/D, soumission)
4. Sauvegarde → vérifie que les étudiants peuvent passer le QCM

---

### 2.10 `/professor/videos/:vid/questions` — Questions interactives in-video ⭐

**Ce que tu vois** :
- Header : "Questions interactives — [titre vidéo]"
- Citation pédagogique : *« Don't ask if students understand, make them prove it. » — Eric Mazur, Peer Instruction: A User's Manual (1997)*
- Sous-titre : "Place des points de contrôle pédagogiques sur la timeline. Chaque clic sur la timeline crée une question qui s'affichera à ce timestamp pendant la lecture."
- Compteur "Questions (X)"
- Bouton "Ajouter une question au temps actuel"
- Pour chaque question : timestamp + énoncé + 3-4 réponses + bonne réponse + explication

**Actions possibles** :
- Ajouter des points de contrôle à différents timestamps de la vidéo
- Pendant le visionnage étudiant, la vidéo se met en pause au timestamp et affiche la question

**🧪 Tests** :
1. Lance la vidéo, ouvre le panneau questions in-video
2. Pause à 0:30 → "Ajouter une question" → "Quelle est la définition de XYZ ?"
3. Reviens en mode étudiant → regarde la vidéo → vérifie qu'à 0:30 la question s'affiche

---

### 2.11 `/professor/qcm` — Hub QCM (vue globale)

**Ce que tu vois** :
- Bouton "Retour"
- Titre "Gérer les QCM"
- Bouton "Générer avec IA" (top right)
- Sous-titre : "Créez et modifiez les questionnaires associés à vos vidéos"
- Liste de tes cours avec compteur "X vidéo(s)" pour chacun
- Clic sur un cours → expand la liste des QCM par vidéo

**🧪 Test** : Vérifie que tes 3 cours apparaissent avec les bons compteurs.

---

### 2.12 `/professor/qcm/create` — Créer un QCM standalone

Même éditeur que `/professor/videos/:vid/qcm` mais sans vidéo associée à l'avance. Tu choisis la vidéo dans les paramètres.

---

### 2.13 `/professor/badges` — Gestion des badges

**Ce que tu vois** :
- Bouton "Retour"
- Titre "Gestion des badges"
- Sous-titre : "Créez et attribuez des badges à vos étudiants"
- Bouton "Créer un badge"
- **Section "Badges existants"** (seedés) :
  - Animateur né (Épique) — Avoir endossé le rôle d'Animateur dans 3 Prosits
  - Assidu (Rare) — Regarder 5 vidéos en entier
  - … plus
- **Section "Attribuer un badge"** : sélecteur étudiant + badge + bouton "Attribuer"

**Actions possibles** :
- Créer un nouveau badge custom (titre + description + condition + rareté)
- Attribuer un badge manuellement
- Modifier / supprimer un badge existant

**🧪 Tests** :
1. Attribue un badge à Assil → vérifie qu'il le voit dans son profil
2. Crée un badge custom "Champion OWASP" rare → vérifie qu'il apparaît dans la liste

---

### 2.14 `/resources` — Bibliothèque de ressources (vue prof)

Idem qu'étudiant + bouton "Ajouter une ressource" (upload PDF/PPTX/DOCX/ZIP).

### 2.15 `/courses/:id/resources` — Ressources d'un cours

Liste filtrée + upload prof.

### 2.16 `/projects` — Mes projets (vue prof)

**Ce que tu vois** :
- Titre "Projets"
- **Bouton "+ Créer un projet"** → va sur `/professor/projects/create`
- Liste : projets que tu as créés OU projets de tes cours (créés par étudiants)
- Bouton "Évaluer" sur chaque projet → grille notation

**🧪 Tests** :
1. Vérifie que tu vois bien les projets de tes cours (pas seulement ceux que tu as créés)
2. Clic "Évaluer" → ouvre la grille rubric

---

### 2.17 `/professor/projects/create` — Créer un projet

**Ce que tu vois** :
- Titre "Créer un nouveau projet"
- **Bouton "Partir d'un template"** (F10 — bibliothèque de 14 templates officiels)
- Sections :
  - **Informations générales** : titre / description / rattachement (Module unique / Multi-modules / PFE)
  - **Phases** : si Module unique → 3 phases pré-remplies / si Multi-modules → 5 phases / si PFE → 7 phases canon Algérien
  - **Rubric d'évaluation** : critères + descripteurs niveau 1-5
  - **Outcomes attendus** (alignés Bloom)

**Actions possibles** :
- Créer from scratch
- Partir d'un template officiel (5 ISIL + 3 Management + 3 Finance + 3 PFE)
- Configurer phases personnalisées
- Définir rubric custom

**🧪 Tests** :
1. Crée un projet "Test" Module unique sur le cours Cybersécurité → 3 phases pré-remplies
2. Modifie la rubric (ajoute 1 critère custom)
3. "Créer le projet" → vérifie qu'il apparaît dans `/projects`
4. Clic "Partir d'un template" → choisis "OWASP webapp" → vérifie le pré-remplissage

---

### 2.18 `/projects/:id` (vue prof) — Détail projet

**Ce que tu vois** (en plus de l'étudiant) :
- Bouton **"Modifier"**
- Section **Évaluation** (la grille rubric en mode notation)
- **Composer de groupes** (manuel ou aléatoire)
- Validation des livrables uploadés
- Modération du forum

---

## 3. APPRENTISSAGE PAR PROBLÈME

### 3.1 `/prosits/new` — Créer un Prosit ⭐

**Ce que tu vois** :
- Titre "Nouveau Prosit"
- **5 sections** :
  - **Informations générales** : Titre / Description courte / Énoncé complet / Cas d'entreprise (contexte algérien) / Mots-clés / Objectifs d'apprentissage (1 par ligne)
  - **Contexte pédagogique** : Cours associé
  - **Calendrier** : dates Aller / Recherche / Retour
  - **Configuration des groupes** : taille (4-6 membres), composition automatique ou manuelle
  - **Grille d'évaluation** : critères + bouton "Ajouter un critère"
- Boutons : Annuler / **Créer le Prosit (brouillon)**

**Actions possibles** :
- Créer un Prosit avec énoncé contextualisé (Algérie : e-commerce, FinTech, etc.)
- Configurer rotation des rôles CESI (5 rôles)
- Définir grille d'évaluation custom
- Composer manuellement les groupes ou laisser le système le faire (avec rotation prioritaire des rôles)

**🧪 Tests** :
1. Crée un Prosit "Cas RGPD pour e-commerce algérien" associé au cours Cybersécurité
2. Définis 4 critères d'évaluation
3. Sauvegarde en brouillon → vérifie qu'il apparaît dans `/prosits` côté prof
4. Phase Aller → composer groupes (auto vs manuel)
5. Vérifie que le système répartit les rôles en respectant la rotation des étudiants

---

### 3.2 `/prosits` (vue prof) — Liste

Idem étudiant mais avec :
- Bouton "+ Nouveau Prosit"
- Bouton "Modifier" / "Évaluer" / "Archiver" sur chaque

### 3.3 `/prosits/:id` (vue prof) — Détail

En plus de l'étudiant, tu vois :
- Bouton **"Modifier"**
- Section **"Suivi des évaluations par les pairs"** (qui a évalué qui)
- Section **"Rapport d'intégrité IA"** (F2 — détection plagiat IA dans les contributions)
- Boutons changer phase (Aller → Recherche → Retour → Évalué → Archivé)
- Validation finale (note prof 70% + note pairs 30%)

### 3.4 `/method-guide` — Méthode Prosit

Identique à étudiant. Référence Falchikov 2005, Topping 1998.

---

## 4. CRÉATION (déjà couvert ci-dessus)

- Gérer les QCM → cf. 2.11-2.12
- Gérer les badges → cf. 2.13

---

## 5. COMMUNICATION — `/chat`

**Ce que tu vois** :
- Tabs : Contacts / Étudiants / Professeurs
- Liste des contacts (étudiants de tes cours principalement)
- Pour chaque étudiant : bouton "Discuter" → chat 1-1
- Salons de cours (un par cours) où tu peux poster des annonces

**Bouton spécifique prof** : **"Envoyer un retour pédagogique"** (Feedback) → écrit un commentaire personnalisé qui apparaît à l'étudiant dans son onglet "Feedback profs".

**🧪 Tests** :
1. Discute avec Assil → envoie "Bon travail sur le QCM Cyber"
2. Va dans le salon de cours Cybersécurité → poste une annonce "Pas de cours vendredi"
3. Clic "Envoyer un retour" sur Assil → message structuré + notification email J-1

---

## 6. MON ESPACE

### 6.1 `/profile` — Mon profil prof
- Avatar + nom + email + filière(s) enseignée(s)
- Stats : nombre de cours, vidéos publiées, étudiants suivis
- Bouton "Modifier"

### 6.2 `/support` — Aide & Support
Idem étudiant.

---

## 7. NOTIFICATIONS

- Cloche topbar : 20 dernières (en général : "Étudiant X a complété Y", "Nouveau ticket", "Échec d'un upload")
- `/notifications` page complète : filtres + actions de masse

---

## 8. PARAMÈTRES (`/settings`)
Idem étudiant : Thème + Notifications email.

---

## 9. Scénarios complets ("golden paths" prof)

### 🟢 Préparer un nouveau module en 30 min
1. `/professor/courses/<id>/upload` → uploader 2 vidéos courtes (depuis Cloudinary)
2. Sur `/watch/<vid>` → "Lancer l'analyse IA" → attendre ~1 min
3. Sur `/auto-prep` → cocher tout ce que l'IA propose (résumé + 5 QCM + 3 questions in-video + 2 idées Prosit) → "Publier"
4. Sur `/path-builder` → ordonner les étapes (vidéo 1 → QCM 1 → vidéo 2 → QCM 2 → Prosit) → "Publier"
5. Sur `/outcomes` → ajouter 3 objectifs Bloom + lier aux vidéos
6. Vérifier en mode étudiant : tout est cohérent

### 🟢 Évaluer un Prosit en groupe (cycle complet)
1. Créer le Prosit avec énoncé + rubric
2. Phase Aller → vérifier que les groupes sont composés et que chaque étudiant a son rôle
3. Phase Recherche → suivre les contributions individuelles
4. Phase Retour → assister à la présentation
5. Évaluer chaque groupe via la grille rubric (notation 1-5 par critère)
6. Lancer la phase d'évaluation par les pairs (les étudiants se notent entre eux)
7. Note finale = 70% prof + 30% pairs

### 🟢 Suivre la classe et relancer les retardataires
1. Tableau de bord → repérer alertes "X étudiants sous 50% de complétion"
2. `/professor/tracking` → voir le détail
3. Clic "Rappel global" → mail à toute la promo
4. OU clic "Rappel" individuel sur les étudiants en difficulté
5. OU clic "IA" pour générer un mini-plan personnalisé pour un étudiant

---

## 10. Bugs/limites connus (1er mai 2026)

| Sujet | Statut |
|---|---|
| Vidéos seedées 403 → Auto-prep et analyse IA cassées | ⏸️ Action requise — voir [GUIDE-CLOUDINARY-VIDEOS.md](GUIDE-CLOUDINARY-VIDEOS.md) |
| Bug B (0 étudiants inscrits) | ✅ Fixé — `scripts/seed-enrollments.js` exécuté |
| Bug C (Omar voyait 0 projets) | ✅ Fixé — controller `getProjects` mis à jour |
| F2 plagiat / F3 insights / F5/F6/F7 | Sur **`main`** : actives ; sur **`mvp-soutenance`** : désactivées (perspective d'évolution) |
| Mongoose warnings au boot (errors reserved + duplicate index courseId) | ⚠️ Cosmétique — ne casse rien |
| Compte démo : 1 seul étudiant par (filière, promo) | Limite seed — démo possible mais stats peu spectaculaires |

---

## 11. Cohérence pédagogique — pour ton mémoire

FlipLearn implémente plusieurs ancrages théoriques bien identifiés dans le code :

| Concept | Référence | Implémentation |
|---|---|---|
| Classe inversée | Bergmann & Sams 2012 | QCM verrouillé tant que vidéo < 50%, "indicateur de préparation avant cours présentiel" sur dashboard prof |
| Alignement constructif | Biggs 1996 | `Course.pedagogicalContract` (Markdown 2000 chars max) + `Course.learningOutcomes` |
| Taxonomie Bloom révisée | Anderson & Krathwohl 2001 | `LearningOutcome.bloomLevel` (1-6) + `Video.coversOutcomes` |
| Peer Instruction | Mazur 1997 | Questions interactives in-video citées textuellement dans l'UI |
| Apprentissage Par Problème (APP/CESI) | Barrows 1996 | Prosits 3 phases (Aller / Recherche / Retour) + 5 rôles tournants |
| Évaluation par les pairs | Falchikov 2005, Topping 1998 | Note finale = 70% prof + 30% pairs ; rubric explicite |
| Curve of forgetting | Wozniak 1990 (SM-2) | Decks/Cards avec `interval` + `easeFactor` + `nextReview` (côté étudiant) |
| Motivation intrinsèque | Deci & Ryan 2000 | Pas de récompenses matérielles ; juste reconnaissance + maîtrise |
| Engagement actif | Hattie 2009 | Insights IA basés sur métriques d'engagement (F3) |

Pour ton chapitre **"Cohérence pédagogique"** du mémoire : tu peux directement réutiliser ce tableau + monter à un screenshot d'écran qui montre chaque feature liée à sa référence.
