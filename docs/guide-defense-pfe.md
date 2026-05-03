# GUIDE COMPLET — Comprendre, tester et défendre FlipLearn

**Pour la soutenance PFE du 15 juin 2026.**

Ce document part du **plus grand** (philosophie/concept) pour aller au **plus petit** (champs techniques, calculs, validations). Pour chaque fonctionnalité : **Pourquoi elle existe** (pédagogique) → **Comment elle marche** (technique) → **Comment la défendre** (1-2 phrases pour le jury) → **Comment la nourrir** (combien de données crédibles).

---

# NIVEAU 1 — LA VISION (le pitch en 30 secondes)

## 1.1 Le problème pédagogique
Dans l'enseignement traditionnel :
- Le prof transmet en cours magistral (passif), l'étudiant fait les exercices à la maison (sans aide).
- Beaucoup d'étudiants décrochent silencieusement.
- Le prof ne sait pas qui a compris quoi avant l'examen.

## 1.2 La solution : la classe inversée + IA
**FlipLearn** inverse ce schéma :
- L'étudiant apprend la théorie chez lui (vidéos + QCM auto-évaluatifs).
- En classe, on ne perd plus de temps en théorie — on fait des **Prosits** (problèmes en groupe) et des **Projets**.
- L'IA encadre l'étudiant en continu (tuteur Groq, auto-flashcards, prédicteurs de difficulté).

## 1.3 Le slogan qui résume tout
> **« Encadrement adaptatif personnalisé »** — une IA qui aide chaque étudiant individuellement, sans remplacer l'enseignant.

⚠️ **Important pour la défense** : le mémoire et l'app présentent l'IA comme **un encadrant adaptatif**, pas comme un **prédicteur d'échec**. C'est une posture éditoriale assumée (mémoire). L'IA aide à apprendre, elle ne juge pas.

## 1.4 Les 3 acteurs
| Rôle | Qui ? | Sa valeur |
|---|---|---|
| **Étudiant** | Au cœur du système | Apprend à son rythme, encadré 24/7 par l'IA |
| **Professeur** | Pilote le contenu et observe | Dépose vidéos, voit qui décroche, agit avant l'examen |
| **Admin** | Garant de la plateforme | Valide les comptes, supervise le support, gère les récompenses |

---

# NIVEAU 2 — LE CYCLE DE LA CLASSE INVERSÉE (le pilier pédagogique)

C'est la fonctionnalité la plus différenciante. **Mon Parcours** structure le travail de l'étudiant en **5 phases** chronologiques :

```
[1] PRÉPARATION  →  [2] RENDEZ-VOUS  →  [3] PROSIT  →  [4] PRODUCTION  →  [5] CONSOLIDATION
   (à la maison)      (en classe)        (en classe)     (en groupe)      (révisions)
```

| Phase | Activité | Outil dans l'app | Côté étudiant | Côté prof |
|---|---|---|---|---|
| 1. Préparation | Regarder les vidéos + faire les QCM | `/courses`, `/qcm` | Vidéo ≥ 80% + QCM ≥ 50% | Voit qui est prêt dans `Préparation classe` |
| 2. Rendez-vous | Cours présentiel actif (questions, débat) | (hors app) | — | — |
| 3. Prosit | Problème en groupe (méthode CESI) | `/prosits` | 3 phases : Aller / Recherche / Retour | Note au final |
| 4. Production | Projet de plus longue haleine | `/projects` | Livrables + auto-évaluation | Suit la timeline + groupes |
| 5. Consolidation | Révisions actives (flashcards) | `/decks`, `/study` | Algorithme SM-2 | (auto-généré par IA) |

## Comment défendre ce cycle face au jury
> *"Notre architecture pédagogique repose sur un cycle en 5 phases inspiré de la classe inversée de Bergmann & Sams (2012) et de la méthode APP du CESI. Chaque phase a un outil dédié dans FlipLearn, et les transitions sont gardées par des indicateurs (vidéo 80%, QCM 50%, etc.) qui empêchent l'étudiant de sauter une étape."*

---

# NIVEAU 3 — LES GRANDS MODULES FONCTIONNELS

L'app comporte **7 grands modules** indépendants mais interconnectés. Pour chacun, voici **pourquoi** il existe + **ce qui le rend défendable**.

## 3.1 Module COURS & VIDÉOS
**Pourquoi** : poser les bases théoriques en mode asynchrone.

**Ce qui le rend défendable** :
- Stockage **Cloudinary** (CDN mondial, gratuit jusqu'à 25 GB) ou intégration **YouTube** (zéro coût, facile à scaler).
- Tracking précis (% vu, last_position) pour reprise au timestamp exact.
- Hook 80% → déclenche les **auto-flashcards IA** (OpenAI Whisper transcrit, GPT-4o découpe en flashcards).

## 3.2 Module QCM
**Pourquoi** : auto-évaluation immédiate pour valider l'acquis.

**Ce qui le rend défendable** :
- 2 modes : manuel (prof saisit) OU **génération IA Groq** (l'IA Llama 3.3 lit la vidéo, propose 5-15 questions).
- Gating à 50% de la vidéo : on n'autorise pas à passer le QCM tant qu'on n'a pas vu le minimum (rationale : pas de triche, pédagogie).
- Quotas IA (free vs premium) montrent qu'on a anticipé un modèle économique.

## 3.3 Module PROSIT (méthode CESI / APP)
**Pourquoi** : transposer dans le digital la méthode d'**Apprentissage Par Problème** que le CESI utilise depuis les années 80.

**Ce qui le rend défendable** :
- 3 phases formalisées : **Aller** (mots-clés/hypothèses/plan) → **Recherche** (individuelle) → **Retour** (solution finale).
- 5 rôles **CESI** tournants : Animateur, Secrétaire, Scribe, Gestionnaire, Membre.
- Le système force la **rotation des rôles** : un étudiant doit avoir tenu chaque rôle avant que le cycle se réinitialise. Évite que les "leaders" monopolisent.
- Détection IA dans la phase Recherche (anti-triche ChatGPT).

## 3.4 Module PROJET (PBL — Project-Based Learning)
**Pourquoi** : apprendre en construisant. Plus long qu'un Prosit, livrable concret.

**Ce qui le rend défendable** :
- 3 types : **Mono** (1 module), **Groupe** (multi-modules), **PFE** (7 phases pré-remplies).
- Phases personnalisables, livrables uploadable, auto-évaluation + évaluation prof.
- Aide IA contextualisée (Groq) qui propose 3 ressources gratuites + 2 conseils méthodo + 1 cas MENA → **ancrage régional pertinent** (mon école est en Algérie).

## 3.5 Module GAMIFICATION
**Pourquoi** : motivation intrinsèque ne suffit pas pour les profils fragiles. Points/badges/streaks créent un engagement quotidien.

**Ce qui le rend défendable** :
- Système **3-couches** : Points (XP) + Badges (objectifs) + Streaks (régularité).
- **Quiz Battle** multijoueur (Socket.io en temps réel) — feature démo très visuelle pour le jury.
- **Récompenses** : l'étudiant convertit ses points en avantages (premium, goodies) → boucle d'engagement complète.

## 3.6 Module IA D'ENCADREMENT
**Pourquoi** : c'est LA contribution originale du mémoire.

**Ce qui le rend défendable** :
4 IA différentes pour 4 usages distincts :

| IA | Modèle | Usage | Quotas |
|---|---|---|---|
| Tuteur conversationnel | Groq Llama 3.3 70B | Chat socratique | 30 msg/jour |
| Génération QCM | Groq Llama 3.3 70B | Crée des QCM à partir d'une vidéo | Quota mensuel |
| Auto-flashcards | OpenAI Whisper + GPT-4o | Transcrit + extrait flashcards | À 80% de la vidéo |
| Aide projet/prosit | Groq Llama 3.3 70B | Conseils contextualisés MENA | Illimité |

> *"Nous avons choisi Groq pour sa latence < 1s qui maintient l'illusion d'une conversation fluide, et OpenAI pour la qualité de Whisper en français."*

## 3.7 Module COMMUNICATION & SUPPORT
**Pourquoi** : un LMS sans communication, c'est un site web statique.

**Ce qui le rend défendable** :
- Chat Socket.io 1-to-1 (étudiant ↔ prof, étudiant ↔ étudiant).
- Onglet **Feedback profs** pour les retours pédagogiques (séparé du chat normal).
- **Tickets support** avec workflow (libre → assigné → résolu) — preuve qu'on a pensé à l'opérationnel.

---

# NIVEAU 4 — TESTER CHAQUE FONCTIONNALITÉ EN DÉTAIL

Ici on descend dans le concret. Pour chaque écran : **Quoi tester** + **Comment le nourrir** + **Question piège du jury possible**.

## ZONE A — INSCRIPTION ET AUTHENTIFICATION

### A.1 Page `/register`
**Quoi tester** :
- Formulaire en 2 étapes (identifiants → profil).
- Validation côté front (email, password ≥ 6 car., confirmation).
- État "Réveil du serveur" si Render dort.
- Email Brevo reçu après inscription.
- Bouton "Vérifier le statut" qui appelle `/auth/status`.

**Comment le nourrir** :
- Inscris **2-3 nouveaux comptes** étudiants avant la démo. Garde-en 1 en `pending` pour montrer la validation admin en live.

**Question piège** :
> *"Pourquoi ne pas auto-valider les inscriptions ?"*
**Réponse** : pour empêcher les faux comptes / spam, et permettre à l'admin de vérifier que l'étudiant existe vraiment dans la promotion (cohérence pédagogique).

### A.2 Page `/login`
**Quoi tester** :
- Cas nominal : login → redirect selon rôle (`/`, `/professor/dashboard`, `/admin`).
- Cas `pending` : message orange "compte en attente".
- Cas `rejected` : message rouge avec raison.
- Cas serveur lent : bandeau "Réveil du serveur".

**Question piège** :
> *"Comment gérez-vous les sessions ?"*
**Réponse** : JWT access token (24h) + refresh token httpOnly (7j). L'access est dans `sessionStorage` (perdu à la fermeture), le refresh est dans un cookie sécurisé. Renouvellement transparent via interceptor axios.

---

## ZONE B — CÔTÉ PROFESSEUR (Omar Saadi, ISIL L3)

### B.1 Tableau de bord prof (`/professor/dashboard`)
**Quoi tester** :
- Compteurs : N cours, M vidéos, K étudiants suivis.
- Bloc "Cours nécessitant votre attention" (replié par défaut depuis le 29/04) — à déplier.
- Boutons rapides : Créer un cours, Créer un QCM.

**Nourrissage** : 5 cours minimum (cf. PLAN_TEST_ISIL_L3.md), 10+ vidéos.

### B.2 Préparation classe (`/professor/class-readiness`) — **LA FEATURE STAR**
**Pourquoi c'est crucial pour la défense** :
- C'est la matérialisation visuelle du concept "encadrement adaptatif".
- Chaque étudiant est classé : **prêt / à risque / en retard**, calculé en fonction de (% vidéos vues, % QCM passés).
- Le prof peut **agir avant le cours** : envoyer un message à un étudiant en retard, signaler une vidéo trop difficile.

**Question piège** :
> *"Comment calculez-vous le score de préparation ?"*
**Réponse** : moyenne pondérée (60% vidéos × 40% QCM). Seuils : ≥ 80% = vert, 50-80% = orange, < 50% = rouge.

### B.3 Suivi étudiants (`/professor/tracking`)
**Quoi tester** : tableau filtrable par filière/promotion, export possible.

### B.4 Création de cours (`/courses` → bouton "Créer")
**Champs détaillés** :
- Titre (requis, ≥ 3 car.)
- Description (optionnel)
- Filière (dropdown : ISIL / Management / Finance & Comptabilité)
- Promotion (dropdown : L1 / L2 / L3)

**Côté backend** : crée un document MongoDB `Course` avec `createdBy: prof._id`. Auto-isolé par filière+promotion.

### B.5 Upload vidéo (`/professor/courses/{id}/upload`)
**2 modes en détail** :

#### Mode Cloudinary (fichier local)
- Le fichier est **streamé** vers le backend (multer memory storage).
- Backend l'upload chez Cloudinary via SDK.
- Cloudinary fournit l'URL CDN + thumbnails auto.
- Limite : 100 MB côté front, 500 MB côté Cloudinary free.

#### Mode YouTube
- L'URL est validée via regex.
- Stockée tel quel dans `Video.youtubeUrl`.
- Le player React utilise iframe YouTube standard.

**Question piège** :
> *"Pourquoi 2 modes ?"*
**Réponse** : YouTube = zéro coût, parfait pour les cours déjà publics. Cloudinary = cours privés, contrôle total. On laisse le prof choisir.

### B.6 Création QCM (`/professor/qcm/create`)
**Détails sur la génération IA** :
- Prompt envoyé à Groq : `"Tu es un professeur. Crée N questions QCM à partir de cette vidéo intitulée X..."`.
- Modèle Llama 3.3 70B (versatile).
- Réponse JSON parsée côté serveur.
- Quota incrémenté dans `User.aiUsage.qcmGeneration`.

**Question piège** :
> *"L'IA peut-elle générer des QCM faux ?"*
**Réponse** : oui, mais le prof **valide chaque question** avant de sauvegarder. L'IA accélère, l'humain garde le contrôle final. C'est conforme au principe européen "human in the loop" pour l'IA en éducation.

### B.7 Création Prosit (`/prosits/create`)
**Le concept à expliquer au jury** :
- Méthode **APP** (Apprentissage Par Problème) inventée par McMaster (Canada, années 60), reprise par CESI.
- Phase **Aller** : on découvre un problème en groupe, on liste ce qu'on sait / ce qu'il faut chercher.
- Phase **Recherche** : individuelle, chacun ramène sa contribution.
- Phase **Retour** : on synthétise ensemble, on présente.

**Champs subtils** :
- Grille d'évaluation : somme des poids = **100 obligatoirement** (validé front + back).
- Mode formation des groupes : aléatoire / manuel / choix étudiants.

### B.8 Création Projet (`/projects/create`)
**Différence avec Prosit** :
| | Prosit | Projet |
|---|---|---|
| Durée | 1-2 semaines | 1-3 mois |
| Phases | 3 (fixes) | Personnalisables |
| Livrable | 1 synthèse | Plusieurs (code, rapport, démo) |
| Méthode | APP / CESI | PBL / Agile |

### B.9 Gérer les badges (`/professor/badges`)
- CRUD de badges custom.
- Critère = formule (ex: `qcm_passed >= 5 AND avg_score >= 80`).
- Backend a un job qui scan les users et attribue les badges automatiquement.

---

## ZONE C — CÔTÉ ÉTUDIANT (Assil Seray, ISIL L3)

### C.1 Mon Parcours (`/my-journey`) — **LA PAGE D'ACCUEIL**
**Pourquoi c'est important** :
- C'est l'incarnation visuelle du cycle CAI (5 phases).
- Chaque carte affiche un % de progression calculé en backend.
- Bouton "Continuer" emmène directement au prochain truc à faire.

**Question piège** :
> *"Comment décidez-vous où l'étudiant doit aller en priorité ?"*
**Réponse** : on calcule le **prochain bloqueur** : la 1ʳᵉ vidéo non vue, ou le 1er QCM non passé, ou le Prosit avec deadline imminente. C'est ce qu'on appelle l'**adaptive next-action**.

### C.2 Cours et vidéo
**Détails du tracking de progression** :
- Côté front : event `timeupdate` du `<video>` toutes les 2s envoie un POST `/progress`.
- Côté back : `Progress` model + `Video.watchedBy` (double source de vérité documentée dans le code).
- À 80% : `Video.watchedBy[userId].watched = true` → notif → trigger auto-flashcards.

### C.3 QCM avec gating à 50%
**Comment c'est implémenté** :
- Backend renvoie `videoBlocked: true` si l'étudiant n'a pas atteint 50%.
- Frontend masque le QCM, affiche barre de progression rouge → verte.
- **Hard gate** depuis le 29/04 (avant c'était soft, l'étudiant pouvait passer outre).

### C.4 Decks de flashcards et SM-2
**Détails techniques** :
- Algorithme **SM-2** (SuperMemo 2) — celui d'Anki.
- Chaque carte stocke : `interval` (jours), `ease_factor` (≥ 1.3), `repetitions`.
- À chaque révision, l'étudiant clique "À revoir / Bien / Parfait".
- L'algo recalcule la prochaine date.

**Question piège** :
> *"Pourquoi pas un algo plus moderne (FSRS) ?"*
**Réponse** : SM-2 est prouvé depuis 30 ans, simple à implémenter, et donne 90% des résultats de FSRS pour un projet académique. FSRS est sur la roadmap.

### C.5 Quiz Battle (`/quiz-battle`)
**Architecture temps réel** :
- Socket.io rooms (`battle_<roomId>`).
- Un host crée la room, un autre joueur rejoint.
- 5 questions × 15s, synchronisé via emit `battle:next-question`.
- Power-ups (50/50, Freeze, x2 Points) gérés en mémoire serveur.
- Score final écrit en DB.

**Question piège** :
> *"Que se passe-t-il si un joueur perd la connexion ?"*
**Réponse** : le serveur a un timeout de 20s par question. Si le joueur ne répond pas, on compte 0 points. La partie continue, c'est pas bloquant.

### C.6 Tuteur IA (`/my-tutor`)
**Le prompt système** :
> *"Tu es un tuteur pédagogique pour un étudiant en {filière} {promotion}. Réponds de manière socratique : guide l'étudiant vers la réponse, ne donne pas la solution toute crue. Limite : 200 mots par réponse."*

**Question piège** :
> *"Le tuteur IA peut-il remplacer le prof ?"*
**Réponse** : non, et c'est volontaire. Le prompt est socratique : il **guide** vers la solution, ne la donne pas. Le rôle est complémentaire — disponible 24/7 quand le prof n'est pas là.

### C.7 Récompenses
**Workflow complet** :
1. Étudiant clique "Réclamer" → points débités, claim créé en `pending`.
2. Admin voit le claim, clique "Approuver" + saisit code de livraison.
3. Admin clique "Livrer" → claim passe à `delivered`.
4. Étudiant voit le statut + le code dans son historique.

**Cas spécial** : claim "Abonnement FlipLearn Premium" → si approuvé, met à jour `User.plan = 'premium'` automatiquement → l'étudiant débloque les quotas illimités.

---

## ZONE D — CÔTÉ ADMIN

### D.1 Dashboard admin (`/admin`)
**Stats à montrer au jury** :
- N utilisateurs (total + par rôle).
- M cours, K vidéos.
- Nombre de QCM passés ce mois.
- Top 5 étudiants par points.

### D.2 Gestion des inscriptions (LE workflow démo)
**À faire en live pendant la soutenance** :
1. Quelqu'un dans le jury s'inscrit avec un email bidon.
2. Tu reçois la notif côté admin (cloche + section pending).
3. Tu valides → email envoyé, l'inscrit peut se connecter.

**C'est exactement ce qu'on a fixé le 02/05/2026.**

### D.3 Support (workflow ticket)
- Étudiant crée un ticket (`/support`).
- Admin voit dans "Libres" → clique "Accepter" → assigné.
- Admin échange en chat → "Résoudre" → fermé.

### D.4 Modération
- Désactiver un user (couper l'accès sans supprimer les données).
- Supprimer un cours obsolète.

---

# NIVEAU 5 — LES DÉTAILS QUI FONT LA DIFFÉRENCE

## 5.1 Sécurité
- **JWT** dans `Authorization: Bearer ...` + refresh token httpOnly.
- **bcrypt** (rounds=10) pour les mots de passe.
- **Helmet** + **express-mongo-sanitize** + **hpp** activés.
- **Rate-limiting** : 10 tentatives login/15min, 30 IA/h.
- **CORS** strict en prod (whitelist via env `CLIENT_URL`).

## 5.2 Performance
- Vidéos servies via CDN Cloudinary ou YouTube.
- Pagination sur les listes (cours, étudiants).
- Indexes MongoDB sur `email`, `filiere+promotion`, `userId+createdAt`.

## 5.3 Observabilité
- Endpoint `/api/health` pour ping externe (UptimeRobot).
- Logs structurés pour les actions sensibles (`[register]`, `[approveUser]`).
- Notif scheduler qui détecte les inactivités (> 7 jours sans login).

## 5.4 Choix techniques majeurs (à connaître par cœur)
| Choix | Pourquoi |
|---|---|
| **MERN stack** | Maîtrise déjà acquise, écosystème riche, gratuit |
| **Vite** (pas CRA) | Build 10× plus rapide, HMR instant |
| **MongoDB Atlas** | Free tier 512 MB, indexes performants, JSON natif |
| **Socket.io** | Battle-tested, fallback long-polling, simple |
| **Render** (pas AWS) | Free tier sans CB, déploiement Git push, suffisant pour démo |
| **Groq** (pas OpenAI partout) | Latence < 1s critique pour le tuteur conversationnel |
| **Brevo** (pas Sendgrid) | 300 mails/j gratuits sans CB, suffisant pour démo |

---

# NIVEAU 6 — NOURRIR L'APP (combien de données pour avoir l'air pro)

## Volume cible avant la soutenance
| Entité | Quantité minimum | Quantité idéale |
|---|---|---|
| Utilisateurs étudiants | 5 | 15 |
| Utilisateurs profs | 3 (déjà seedés) | 5 |
| Cours | 5 | 10 |
| Vidéos par cours | 2 | 5 |
| QCM par vidéo | 1 | 2 |
| Prosits actifs | 2 | 4 |
| Projets actifs | 1 | 2 |
| Inscriptions en attente | 1 (à créer en live) | 1 |
| Tickets support | 1 résolu + 1 ouvert | 3 |
| Récompenses claim | 1 | 3 |

## Comment générer ce volume vite
1. Suis [PLAN_TEST_ISIL_L3.md](PLAN_TEST_ISIL_L3.md) pour la création prof.
2. Côté étudiant : connecte 3 comptes différents (Assil, Inès, Amine) → crée des activités sur chacun (vidéos vues, QCM passés).
3. Lance 1-2 Quiz Battle pour avoir des badges visibles.
4. Réclame 1 récompense pour avoir un workflow complet.

---

# NIVEAU 7 — FAQ JURY (questions probables et réponses)

### Q1. Pourquoi pas Moodle qui existe déjà ?
**R** : Moodle est un LMS générique des années 2000. FlipLearn est pensé natif **classe inversée + IA**. Moodle ne sait pas générer des QCM par IA, ne propose pas de Prosits méthode CESI, n'a pas de tuteur conversationnel. Notre niche est plus étroite mais plus profonde.

### Q2. Comment vous garantissez que l'IA ne triche pas / ne hallucine pas ?
**R** : 3 garde-fous :
1. **Human in the loop** : prof valide les QCM IA avant publication.
2. **Détection IA** dans les phases Recherche du Prosit (anti-ChatGPT).
3. **Prompts socratiques** : le tuteur ne donne pas la réponse, il guide.

### Q3. Que se passe-t-il quand un étudiant abandonne ?
**R** : le système le détecte (> 7 jours sans login) → notif au prof + email de relance auto. Visible dans `Préparation classe` en rouge.

### Q4. Pourquoi avoir intégré Quiz Battle ? C'est gadget.
**R** : non, c'est un mécanisme de **gamification pure** étayé par la littérature (Hamari, 2014). Les rivalités amicales augmentent la rétention de 30% en moyenne. Les badges Quiz Battle sont des **trophées sociaux**, pas juste cosmétiques.

### Q5. Sécurité : que faites-vous contre les fuites de données ?
**R** : passwords bcrypt, JWT signés, refresh httpOnly secure SameSite=strict, CORS whitelist, rate-limiting, helmet, mongo-sanitize. Audit OWASP Top 10 fait dans le mémoire chapitre 6 (Tests).

### Q6. Scalabilité : et si demain 10 000 étudiants utilisent FlipLearn ?
**R** : MongoDB Atlas se met à l'échelle horizontalement. Render passe à un plan payant (les services sont stateless sauf Socket.io). Cloudinary scale tout seul. Le seul vrai bottleneck serait Groq (rate limits) → on bascule sur self-hosted Llama via Ollama si besoin.

### Q7. Algorithmie : votre système prédit-il les abandons ?
**R** : pas de modèle ML supervisé entraîné (volontairement). On utilise des **heuristiques transparentes** : % vidéos × poids + % QCM × poids + jours d'inactivité. C'est explicable au prof et à l'étudiant. Un modèle ML opaque serait moins défendable éthiquement.

### Q8. Pourquoi en français et pas en anglais ?
**R** : public cible = étudiants algériens et francophones MENA. Le marché EdTech francophone est sous-servi (les leaders sont US ou anglais). Choix volontaire de niche.

### Q9. Combien de lignes de code ? Combien de temps pour le développer ?
**R** : ~30 000 lignes (back ~10k + front ~20k), ~150 commits, étalé sur ~6 mois (octobre 2025 → mai 2026), en parallèle des cours.

### Q10. Si on vous donnait 6 mois de plus, vous feriez quoi ?
**R** :
1. App mobile React Native (iOS + Android).
2. Mode hors-ligne (PWA + IndexedDB) pour les zones à connexion faible.
3. Module Prosit dédié séparé du module Project actuel (déjà specifié dans `_briefs/`).
4. Modèle ML léger pour suggérer le prochain cours/vidéo (recommandation collaborative).
5. Multi-établissements (multi-tenant).

---

# NIVEAU 8 — SCRIPT MINUTE PAR MINUTE DE LA SOUTENANCE

**Hypothèse** : 20 minutes de présentation + 10 min de questions.

| Min | Section | Action |
|---|---|---|
| 0:00 | Intro | Pitch en 30s + photo de classe inversée |
| 0:30 | Problème | Stats décrochage scolaire MENA |
| 1:30 | Solution | "FlipLearn = classe inversée + IA" |
| 2:30 | Architecture | Diagramme MERN + IA (Groq + OpenAI) |
| 4:00 | DÉMO commence | Connexion étudiant → Mon Parcours |
| 5:30 | DÉMO | Regarder vidéo (skip à 90%) → flashcards auto |
| 7:00 | DÉMO | Faire un QCM |
| 8:30 | DÉMO | Tuteur IA — pose 1 question |
| 10:00 | DÉMO | Bascule prof → Préparation classe (montre l'analytique) |
| 11:30 | DÉMO | Bascule admin → valide une inscription en live |
| 13:00 | DÉMO | Quiz Battle entre 2 onglets (visuel fort) |
| 15:00 | Tech | Sécurité (JWT, bcrypt, OWASP) |
| 16:30 | Tech | IA — détailler les 4 IA et leurs usages |
| 18:00 | Limites & roadmap | "Ce qu'on n'a pas fait" + "Ce qu'on ferait" |
| 19:30 | Conclusion | Citation Bergmann + remerciements |
| 20:00 | Q&A commence | — |

**Tip clé** : avant la démo (min 4:00), **ouvre l'app 5 min avant** dans un onglet pour réveiller Render (cold start évité).

---

# NIVEAU 9 — ANNEXE TECHNIQUE (à connaître si on demande)

## Stack précise
- **Backend** : Node.js 20 + Express 4 + Mongoose 8 + Socket.io 4
- **Frontend** : React 18 + Vite 5 + Tailwind 3 + Lucide icons
- **DB** : MongoDB Atlas (cluster M0 free)
- **CDN** : Cloudinary
- **Email** : Brevo HTTP API (fallback Resend)
- **IA** : Groq SDK + OpenAI SDK
- **Hébergement** : Render free tier
- **CI/CD** : Render auto-deploy on push to main

## Endpoints majeurs
- `POST /api/auth/register` (public)
- `POST /api/auth/login` (public)
- `GET /api/courses` (auth, filtré par filière/promotion)
- `POST /api/videos/upload` (prof only)
- `POST /api/qcm/generate-ai` (prof, rate-limited)
- `GET /api/auth/pending` (admin only)
- `WS battle:join` (étudiant only, Socket.io)

## Variables d'environnement
- `MONGODB_URI` — connexion MongoDB Atlas
- `JWT_SECRET` — signature des tokens
- `CLOUDINARY_*` (3 vars) — pour upload vidéo
- `GROQ_API_KEY` — pour Llama 3.3
- `OPENAI_API_KEY` — pour Whisper + GPT-4o
- `BREVO_API_KEY` — pour emails
- `CLIENT_URL` — whitelist CORS

## Fichiers les plus importants
| Fichier | Pourquoi |
|---|---|
| `backend/server.js` | Entry point, Socket.io, rate-limits |
| `backend/controllers/authController.js` | Register/login/JWT |
| `backend/services/notificationService.js` | Push notifs Socket.io + DB |
| `backend/services/contentSeed.js` | Seed les données de démo |
| `frontend/src/App.jsx` | Toutes les routes + ProtectedRoute |
| `frontend/src/components/Layout.jsx` | Sidebar + Topbar (3 menus selon rôle) |
| `frontend/src/pages/MyJourney.jsx` | Cycle CAI à 5 phases |
| `frontend/src/pages/AdminDashboard.jsx` | Console admin (~2200 lignes !) |

---

**Tu peux maintenant défendre TOUTES les couches : philosophie, pédagogie, fonctionnalités, code. Imprime-toi ce document, surligne ce qui te parle le moins, et révise. Bonne chance !**
