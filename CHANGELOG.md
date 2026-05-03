# Changelog — FlipLearn

Historique des modifications par date de session.

---

## 3 Mai 2026 — Audit complet + correctifs critiques + nettoyage structure

Session orientée qualité : audit jury PFE, corrections des défauts visibles, refactor de structure.

### Notifications pop-up stylées (`feat(toast)`)
- **`context/ToastContext.jsx`** — animation pop bouncy avec halo lumineux pulsant + effet shine en diagonale ; durées 5-10 s selon priorité ; les `urgent` sont persistants (clic obligatoire, pas de barre de progression).
- **Hover-to-pause** : la barre de progression se fige au survol du toast.
- **Mode Focus auto** sur `/qcm/`, `/quiz-battle`, `/study/`, `/watch/` : les toasts non-urgents sont mis en file d'attente avec une pill discrète « 🔔 N notifications en attente ». Dès que l'utilisateur quitte la page, la queue se déverse automatiquement.
- **Max 3 toasts visibles** simultanément (anti-saturation), son OFF par défaut (préférence localStorage).
- **`useToast` et `useNotifications` déplacés** dans des fichiers séparés des Providers pour que Vite Fast Refresh fonctionne correctement.

### Correctifs critiques (`fix(audit)`)
- **`components/ErrorBoundary.jsx`** créé, wrappé autour des routes : plus d'écran blanc en cas de crash composant. Fallback UX avec recharger / retour accueil + détails techniques en mode dev uniquement.
- **`AdminDashboard.jsx`** — suppression des fake stats hardcodées (`+12%`, `+8%`, `+15%`, `+23%` qui étaient juste des chaînes inventées) → vraies tendances 7j calculées côté backend (`controllers/adminController.getStats` enrichi avec `deltaUsers7d`, `deltaCourses7d`, etc., agrégation `$dateToString` sur 7 jours).
- **`AdminDashboard.jsx`** — suppression du « Fake bar chart for registrations » → vrai graphique des inscriptions par jour des 7 derniers jours.
- **`/api/auth/status`** sécurisé : suppression de l'exposition publique de `rejectionReason` (le motif détaillé est envoyé par email au moment du rejet via `emailService`, pas via API publique). Rate-limit dédié 30 req/15 min/IP. Réponse uniforme `{exists: false}` pour les emails malformés.
- **Tri intelligent des cours** : côté étudiant, les cours avec contenu (vidéos > 0) remontent en premier ; côté prof, le cours avec le plus d'étudiants inscrits ouvre par défaut. Évite que MyJourney/Synthèse de classe s'ouvre sur un cours vide.

### Performance (`perf(api)`, `perf(frontend)`)
- **N+1 query fix** dans `adminController.getCourses` (renommé `getAllCoursesWithStats`) : remplacement du pattern 1 + 2N requêtes par 2 agrégations groupées avec `$match $in + $group`. 3 requêtes au total quel que soit le nombre de cours.
- **Nouveau endpoint `GET /api/resources/all`** qui retourne toutes les ressources accessibles à l'utilisateur, groupées par cours, en 1 seule requête. Utilisé par `ResourcesHub.jsx` qui faisait 1 + N appels avant.
- **Pagination** sur les endpoints liste sensibles : `/api/admin/users`, `/api/admin/courses`, `/api/badges` (limit défaut, max 500, skip optionnel).
- **Lazy loading** des 46 routes via `React.lazy()` dans `App.jsx`. Chaque page devient un chunk chargé à la demande. Bundle initial fortement réduit, utile en 3G/4G algérienne.
- **`utils/logger.js`** créé : helpers `logError`/`logWarn`/`logInfo` qui n'écrivent qu'en mode dev (`import.meta.env.DEV`). 21 `console.error`/`console.warn` remplacés à travers le frontend pour éviter le bruit en prod sur Render.

### Nettoyage structure (`chore(cleanup)`)
- Déplacement des `.md` à la racine de `fliplearn/` vers `docs/` (convention standard) : `DEPLOYMENT.md`, `GUIDE_DEFENSE_PFE.md`, `PLAN_L3_ISIL_RICHE.md`, `PLAN_TEST_ISIL_L3.md`, `TUTO_TEST_COMPLET.md`. La racine ne garde que `README.md`, `CLAUDE.md`, `CHANGELOG.md`, `PROGRESS.md`.
- Suppression définitive de `backend/services/videoMigration.deprecated.js` et nettoyage des références dans `migrations/README.md`.
- Suppression de `backups/mongo-debut-session/` (déjà gitignored, ne devrait pas être versionné).

### Mémoire PFE final (`livrables/`)
- Régénération du mémoire suivant la structure du modèle Boubakir/Hamouti (3 chapitres) en l'enrichissant : 24 022 mots, 85 pages estimées, 12 tableaux, 18 références bibliographiques. Disponible en `livrables/Memoire_PFE_FlipLearn.docx`.

---

## 2 Mai 2026 — Fix flux d'inscription (cold start Render + email confirmation + check status)

Bug remonté : "j'essaie de m'inscrire, aucun message ne s'affiche, et l'admin ne reçoit pas de notification". Cause racine : timeout axios à 15s côté front, alors que le backend Render free tier dort après 15 min d'inactivité — le premier réveil prend 30-60s. La requête timeout, l'erreur n'est pas attrapée correctement, l'utilisateur ne voit rien, et la création de compte n'a même pas lieu côté serveur.

### Backend
- **`controllers/authController.js`** — `register()` :
  - Email automatique de confirmation à l'utilisateur via `sendNotificationEmail` (Brevo) : "Inscription bien reçue, validation sous 24h".
  - Notification admin enrichie : ajoute filière + promotion dans le message (`Marie Dupont (etudiant — ISIL L3) demande à rejoindre`).
  - Correction `relatedType: 'course'` → `'auth'` (typo qui rendait le lien de notif illisible).
  - Log explicite du nombre d'admins notifiés (`[register] X admin(s) notifié(s)`) pour diagnostiquer si la notif n'arrive pas.
  - Log d'erreur sur le catch global (avant : message muet).

### Frontend
- **`context/AuthContext.jsx`** — `register()` : timeout passé à **60 s** (override du timeout axios global de 15 s) pour absorber le cold start Render.
- **`pages/Register.jsx`** :
  - Bandeau **« Réveil du serveur en cours… »** affiché après 4 s d'attente (même UX que `Login.jsx`).
  - Gestion explicite du timeout / serveur injoignable (`err.code === 'ECONNABORTED' || !err.response`) → message dédié au lieu du générique "Une erreur est survenue".
  - Écran post-inscription enrichi :
    - Délai annoncé "moins de 24h" dans la liste d'infos.
    - Bouton **« Vérifier le statut de mon compte »** qui appelle `GET /auth/status?email=...` (endpoint public déjà existant côté back, mais jusqu'ici non branché).
    - Si `status: active` → écran vert "🎉 Compte activé" avec bouton "Me connecter".
    - Si `status: rejected` → écran rouge avec la raison du refus.
- **`index.css`** : ajout de l'animation `@keyframes spin` (utilisée par l'icône `RefreshCw` pendant la vérification de statut).

### Diagnostic complémentaire
La query d'admins pour les notifications (`User.find({ role: 'admin', status: 'active' })`) a été vérifiée : l'admin seedé via `usersSeed.js` a bien `status: 'active'`, et la migration `migrateUserStatus()` au démarrage marque `active` les anciens comptes sans champ `status`. Donc côté DB, ce n'était pas la cause.

---

## 29 Avril 2026 — soir tardif (refonte UX post-revue encadrante)

Refonte UX en réponse à la revue de l'encadrante. 8 corrections en un commit, structurées en trois chantiers : alléger le dashboard prof, fusionner Feedback dans Messages, expliquer Prosit/Projet, durcir le prérequis QCM.

### Chantier A — Allègement et fusion
- **`pages/ProfessorDashboard.jsx`** : bloc « Cours nécessitant votre attention » désormais **replié par défaut**. Une barre compacte affiche `N alertes — cours sous 50% de complétion` avec bouton « Voir le détail ▾ ». Le détail (cartes par alerte) ne s'affiche qu'au clic.
- **`pages/ChatContacts.jsx`** : nouvel onglet **« Feedback profs »** (étudiant uniquement) au-dessus de la liste des contacts. Réutilise le composant `FeedbackCard` extrait de `MyFeedback.jsx`. Badge orange avec compteur des feedbacks non lus.
- **`components/Layout.jsx`** : retrait de l'entrée « Feedback reçu » de la sidebar étudiante (icône MessageCircle). Évite la duplication avec « Messages ».
- **`App.jsx`** : redirection `/my-feedback` → `/chat?tab=feedback` (preserve les anciens liens externes).

### Chantier B — Onboarding pédagogique Prosit / Projet
- **`pages/PrositDetail.jsx`** : nouveau composant `PhaseGuide` qui explique la phase courante (Aller / Recherche / Retour) en 4 étapes contextuelles. Placeholders dans les inputs avec exemples concrets (« Ex : OWASP, XSS, JWT… »). Bloc dépliable « Comprendre les 5 rôles CESI » détaillant Animateur / Secrétaire / Scribe / Gestionnaire / Membre.
- **`components/ProjectProgressPanel.jsx`** : icône Info à côté du titre « Progression globale » qui révèle la formule de calcul (Phases 40 % + Tâches 40 % + Livrables 20 %). Labels des sous-barres mis à jour avec leur poids.

### Chantier C — Prérequis QCM durci + rappel inactivité
- **`controllers/qcmController.js`** : seuil `videoWatched` passe de **30 % à 50 %**, et le backend renvoie maintenant `watchedPercent` pour permettre au frontend d'afficher la progression vers le seuil.
- **`pages/QCMPage.jsx`** : bandeau bloquant si `videoBlocked` — plus de bouton « Continuer quand même ». Affiche la progression actuelle vs le seuil 50 % avec barre rouge/verte. Le QCM (header + player) est masqué tant que le seuil n'est pas atteint.
- **`services/notificationScheduler.js`** : nouvelle fonction `checkInactivityReminders` — filet de sécurité quand le prof n'a pas mis de deadline. Si une vidéo date de >7 jours et n'a jamais été commencée par un étudiant, notification in-app hebdomadaire (dédupliquée par semaine, pas d'email pour ne pas spammer).

Commit :
- `fa14095` — feat: UX overhaul — collapsible alerts, feedback in chat, prosit/project guides, hard QCM gate

---

## 29 Avril 2026 — fin de journée (nettoyage final pré-soutenance — 10 corrections)

Récapitulatif de la journée. 10 corrections appliquées en 7 commits, dans l'ordre chronologique :

1. **Alertes urgentes prof sur dashboard** — bloc en haut du `ProfessorDashboard` listant les vidéos sous 50 % de complétion, affiché sans sélection préalable d'un cours (`7c0a779`).
2. **Extension QCMs aux alertes** — même calcul de complétion appliqué aux QCMs liés à une vidéo du cours (`b9e4489`).
3. **Aide IA projet enrichie** — `getAiHelp` du `projectController` populate filière/promotion/cours, calcule la phase courante, demande 3 ressources gratuites + 2 conseils méthodo + 1 cas MENA (`d9a50db`).
4. **Compteur de quota IA** dans la génération de QCM — lecture des headers axios `x-ai-quota-*` + appel initial à `/users/me/ai-quota`, barre de progression colorée et écran 429 avec date de renouvellement + lien Premium (`151ec71`).
5. **Prérequis vidéo soft avant QCM** — backend ajoute le flag `videoWatched` à la réponse sanitisée pour les étudiants, frontend affiche un bandeau jaune dismissable (pas de blocage) (`f7db191`).
6. **Prosit courseId optionnel + agent IA dédié** — relaxation de la contrainte `required` sur `Prosit.courseId`, nouveau `POST /api/prosits/:id/ai-help` adapté à la phase courante et au cours associé (`79f1a32`).
7. **Cross-link Resources** — `ResourceLibrary` (per-course) et `ResourcesHub` (global) reliés par bandeaux explicatifs ; conservation des deux pages car complémentaires (`4815acb`).
8. **Vidéo associée affichée dans `ProfessorCreateQCM`** — fetch `/videos/:id` au montage, badge bleu « Vidéo associée : [titre] » sous le breadcrumb pour clarifier quel QCM est en cours d'édition (`4815acb`).
9. **Commentaire d'architecture Progress / Video.watchedBy** — bloc explicatif au-dessus de `saveProgress` dans `videoController.js` documentant la double source de vérité (`4815acb`).
10. **Empty states + message d'accueil contextuel** — Dashboard étudiant utilise désormais le compteur `upcoming.filter(!done)` pour afficher « X tâches cette semaine » ou « Tout est à jour ! » ; `/professor/qcm` affiche un bandeau guide quand aucun QCM n'existe (sans bloquer la création), `/prosits` et `/projects` ont des messages d'état vide alignés (`4815acb`).

Commits :
- `7c0a779`, `b9e4489`, `d9a50db`, `151ec71`, `f7db191`, `79f1a32`, `4815acb` (sept commits feat/chore)
- `3d8234c`, `92ec9c9`, `139ef6c`, `8e21213`, `e22d5ca` (commits docs intermédiaires)

---

## 29 Avril 2026 — soir (alertes urgentes prof sur dashboard + IA projet)

Bloc d'alertes immédiat sur le tableau de bord professeur, extension aux QCMs, et enrichissement du prompt IA d'aide aux projets.

### Backend — alertes
- **`controllers/trackingController.js`** : nouvelle fonction `getProfessorAlerts` — parcourt les cours du prof, calcule la complétion vidéo **et QCM** par étudiant inscrit (filière + promotion), remonte jusqu'à 10 alertes sous 50 % de complétion, triées par criticité croissante. Le champ `type` distingue 'video' et 'qcm'.
- **`routes/trackingRoutes.js`** : nouvelle route `GET /api/tracking/alerts` (héritage du `authMiddleware` + `requireRole('professeur', 'admin')` déjà appliqué globalement).

### Frontend — alertes
- **`pages/ProfessorDashboard.jsx`** : appel `GET /tracking/alerts` au montage (parallèle au chargement du cours), bloc fond jaune pâle (#FFFBEB) en haut de page avec icône AlertTriangle, titre « ⚠️ Cours nécessitant votre attention ». Chaque alerte : nom du cours, nom de la vidéo/QCM (icône 🎥 ou 📝 selon le type), badge rouge X% de complétion, bouton « Voir le suivi → ». Bloc visible aussi en états loading et error pour rester immédiat. Si aucune alerte, le bloc n'est pas affiché.

### Backend — aide IA projet
- **`controllers/projectController.js`** (`getAiHelp`) : prompt enrichi. `findById` populate `createdBy` (filiere, promotion) et `courseId` (titre, description). Calcul de la phase courante (`statut === 'en_cours'`), du contexte cours, et de la liste des livrables (depuis `project.livrables` top-level). System prompt = tuteur pédagogique algérien spécialisé filière/niveau. User prompt structuré demande : 3 ressources gratuites + 2 conseils méthodo pour la phase + 1 cas d'usage MENA. `temperature: 0.6`, `max_tokens: 1200`.

Commits :
- `7c0a779` — feat: professor urgent alerts on dashboard without course selection
- `b9e4489` — feat: include QCM completion in professor urgent alerts
- `d9a50db` — feat: enrich AI project help with filière, phase and Algerian context

### Frontend — quota IA visible
- **`pages/ProfessorCreateQCM.jsx`** : `useEffect` au montage qui interroge `GET /api/users/me/ai-quota` (endpoint déjà existant) pour hydrater l'état initial du compteur `qcmGeneration`. `handleGenerateAI` lit désormais les headers axios `x-ai-quota-used` / `-limit` / `-reset` après succès, et le body `{ used, limit, resetAt }` sur erreur 429. UI sous le bouton « Générer avec l'IA » : ligne « X / Y générations utilisées ce mois » + barre de progression (vert < 80%, orange ≥ 80%, rouge = 100%). Si quota dépassé : encart rouge avec date de renouvellement formatée fr-FR + bouton « Passer en Premium » vers `/rewards`. Bouton de génération désactivé tant que le quota est plein.

Commit :
- `151ec71` — feat: display AI quota counter in QCM generation UI

### Backend + Frontend — prérequis vidéo avant QCM
- **`controllers/qcmController.js`** (`getQCMByVideo`) : pour les étudiants uniquement, calcul du flag `videoWatched` à partir de `Video.watchedBy` (true si `watchedPercent >= 30` OU `completed === true`). Le flag est ajouté à la réponse sanitisée (sans exposer `correctAnswer`/`explanation`).
- **`pages/QCMPage.jsx`** : si `qcm.videoWatched === false`, bandeau jaune pâle (#FFFBEB) avec icône AlertTriangle, message « Vous n'avez pas encore regardé cette vidéo », bouton « Regarder la vidéo d'abord » (→ `/watch/:videoId`), bouton « Continuer quand même » et bouton X pour dismiss. **Pas de blocage** — recommandation pédagogique seulement.

Commit :
- `f7db191` — feat: soft video prerequisite check before QCM

### Backend + Frontend — Prosit courseId optionnel + agent IA dédié
- **`models/Prosit.js`** : `courseId` passe de `required: true` à `default: null` — un Prosit peut désormais être autonome (transverse, hors module).
- **`controllers/prositController.js`** :
  - `createProsit` : `courseId` retiré des champs obligatoires, vérification d'existence conditionnelle, fallback `courseId || null`.
  - Nouveau `getAiHelp` (POST `/api/prosits/:id/ai-help`) : populate `createdBy` (filiere, promotion) et `courseId` (titre, description). Détecte le groupe de l'étudiant pour injecter ses `motsClesIdentifies`. Map `PHASE_GUIDANCE` qui adapte la consigne au statut (brouillon / aller / recherche / retour / evalue / archive). System prompt = tuteur APP/CESI algérien, ressources gratuites. Demande structurée : 3 ressources + 2 conseils méthodo phase + 1 piste MENA. `temperature: 0.6`, `max_tokens: 1200`.
- **`routes/prositRoutes.js`** : route `POST /:id/ai-help` exposée (auth uniquement, accessible prof + étudiant).
- **`pages/PrositCreate.jsx`** : libellé « Cours associé (optionnel) », première option « — Aucun (Prosit autonome) — », attribut `required` retiré, validation et payload mis à jour.
- **`pages/PrositDetail.jsx`** : encart Contexte enrichi. Si `courseId` populé, bouton lien « 📚 [titre] → » qui navigate vers `/courses/:id`. Sinon, texte italique « Prosit autonome (non rattaché) ».

Commit :
- `79f1a32` — feat: optional courseId on Prosit + AI help endpoint for prosits

---

## 29 Avril 2026 — nuit (module Prosit complet — APP/CESI)

Implémentation complète du module Prosit conformément à `_briefs/02_SPECS_PROSIT.md` et à la proposition `_briefs/03_PROPOSITION_ARCHITECTURE_PROSIT.md` validée par l'utilisateur. 13 étapes livrées en 5 commits intermédiaires (sécurité de rollback).

### Backend (commit #1 — `6d16077`)
- **`models/Prosit.js`** : modèle dédié, séparé de `Project`. 5 rôles CESI (animateur, secretaire, scribe, gestionnaire, membre), 6 statuts de workflow (brouillon → aller → recherche → retour → evalue → archive), espace collaboratif structuré, contributions individuelles, grille pondérée, 3 modes de formation des groupes (random / manual / student_choice).
- **`models/User.js`** : 3 nouveaux champs pour la rotation obligatoire des rôles : `prositRolesCycle`, `prositRolesDoneInCycle`, `prositRolesHistory`.
- **`controllers/prositController.js`** (~530 lignes) : CRUD prof, listing par filière/promo, visibilité conditionnelle (étudiant ne voit que son groupe pendant les phases en cours, tous après évalué), génération auto avec rotation obligatoire des rôles, composition manuelle, mode student_choice, transitions verrouillées, évaluation avec attribution +150 XP par membre + mise à jour rotation + déclenchement badges.
- **`routes/prositRoutes.js`** + branchement `/api/prosits` dans `server.js`.
- **`services/points.js`** : 3 nouveaux badges (`prosit_completed` rare, `prosit_animator` epic après 3 Prosits comme Animateur, `prosit_perfect` epic si note ≥ 18/20).
- Bug fix : `socket.on('battle:answer', ...)` rendu async (régression du commit `5189849` non détectée par `vite build`).

### Frontend (commits #2 et #3 — `2ed8044` et `95acdde`)
- **Sidebar** (`components/Layout.jsx`) : nouvelle section **"Apprentissage par Problème"** pour étudiant et professeur, avec entrée Prosits (icône Lightbulb). Section conçue pour accueillir d'autres modules pédagogiques ultérieurement.
- **`pages/PrositList.jsx`** : liste filtrée par rôle, panneau de progression rotation des rôles CESI pour l'étudiant (rôles faits/restants dans le cycle, total par rôle), filtres par statut, encart pédagogique sobre.
- **`pages/PrositCreate.jsx`** : formulaire complet pour le prof (infos générales, contexte, calendrier, config groupes min/max + 3 modes au choix, grille d'évaluation pondérée éditable). Validation client : somme des poids = 100, dates cohérentes.
- **`pages/PrositDetail.jsx`** (~430 lignes) : vue par phase. Espace collaboratif pour mon groupe (mots-clés, problématique, hypothèses, plan d'action en Aller ; contribution individuelle en Recherche ; solution finale en Retour). Panneau d'évaluation pour le prof en phase Retour (note 0-20 + commentaire → +150 XP par membre).
- **Composants partagés** :
  - `PrositRoleBadge.jsx` : badge visuel par rôle CESI (icône, couleur, tooltip descriptif).
  - `PrositPhaseStepper.jsx` : barre de progression Aller → Recherche → Retour → Évalué.
  - `PrositGroupCard.jsx` : carte de groupe avec membres + leurs rôles + note finale si évalué.
- **Routes** ajoutées : `/prosits` (étudiant + prof), `/prosits/:id`, `/prosits/new` (prof + admin).

### Notifications (commit #4 — `dc45ba2`)
- **Rappels email J-1/J-0** : `services/notificationScheduler.js` étendu avec `checkPrositDeadlines()` qui couvre la phase Aller (séance 1) et la phase Retour (séance 2). Cron quotidien à 08:00.
- **Notifications temps réel** : à chaque transition de phase, tous les membres reçoivent une notif Socket.io + DB ("Phase Aller ouverte / Recherche commencée / Retour ouverte / Évaluation publiée"). À l'évaluation, seuls les membres du groupe évalué reçoivent une notif "Prosit évalué : X/20, +150 XP".

### Seed + mémoire (commit #5)
- **`services/prositsSeed.js`** : 3 Prosits de démo (1 par filière) en phase Aller, avec groupes auto-formés via la fonction de mélange. Cas d'entreprises algériennes : startup e-commerce (ISIL), foodtech à Alger (Management), PME familiale matériaux de construction (Finance).
- **Mémoire (`generate_memoire.py`)** : nouvelle section **4.13 Module Prosit (Apprentissage Par Problème)** avec 5 sous-sections (workflow 3 phases, rotation obligatoire des rôles CESI, 3 modes de formation des groupes, évaluation et attribution d'XP, visibilité conditionnelle entre groupes). Bilan 7.1 mis à jour. `Memoire_PFE_FlipLearn.docx` régénéré.

### Décisions structurantes (validées par l'utilisateur)
1. **XP par Prosit terminé** : 150 par membre du groupe quand le tuteur évalue.
2. **Évaluation V1** : prof seul (auto-évaluation et pairs en perspective dans le mémoire).
3. **Taille des groupes** : paramétrée par le prof (min/max).
4. **Formation des groupes** : 3 modes au choix (random / manual / student_choice).
5. **Rotation obligatoire des rôles CESI** : chaque étudiant doit passer par les 5 rôles avant que le cycle se réinitialise. Tracking dans le profil + indicateur visuel.
6. **Visibilité entre groupes** : privée pendant les phases actives, publique après évalué.
7. **Sidebar** : nouvelle section "Apprentissage par Problème" qui pourra accueillir d'autres modules.
8. **Plan d'implémentation** : 13 étapes en 5 commits intermédiaires (rollback possible à chaque étape majeure).

---

## 29 Avril 2026 — soir (audit briefs + Quiz Battle classement interne + sélection matière)

### Audit complet sur briefs `_briefs/00_CONTEXTE_PROJET.md`, `01_SPECS_QUIZ_BATTLE.md`, `02_SPECS_PROSIT.md`
- Vérifié l'architecture du Quiz Battle (1 page `QuizBattle.jsx` + handlers Socket.io dans `server.js`).
- Audité le système d'XP : barème actuel = vidéo +5, QCM +80 max (5 questions), projet 0, Battle 0. Le Battle est déjà conforme à la contrainte du brief 01 ("XP minime ou nul").
- Confirmé l'absence de traces littérales de "Projet Pro" dans le code. L'ancien enum `[prosit, projet]` du model `Project` a été remplacé par `[mono, groupe]` lors du commit `0b1ac51`.

### Cleanup des traces résiduelles
- `backend/services/demoSeed.js` : renommé `PROSIT_DEFS` → `MONO_PROJECT_DEFS`, `prositsCreated` → `monoProjectsCreated`. Commentaires et logs alignés. La structure des défs (phases Aller/Retour) est conservée car elle reflète la méthodologie APP — elle sera migrée vers le futur module Prosit dédié.
- `fliplearn/CLAUDE.md` : retiré la mention obsolète "filtres Prosits/Projets" (les filtres ont été supprimés le 28/04). Ajouté une note signalant que le module Prosit dédié sera réintroduit séparément.

### Quiz Battle — classement interne (brief 01 phase 1)
- **Nouveau modèle `models/BattleResult.js`** : persiste les résultats de chaque match (1 entrée par joueur). Champs : `userId`, `opponentId`, `courseId`, `score`, `correctCount`, `totalQuestions`, `bestStreak`, `outcome` (win/loss/draw), `matchedAt`. Indexes sur `userId+matchedAt` et `courseId`.
- **`backend/server.js`** : à la fin de chaque match (`battle:finished`), 2 entrées `BattleResult` sont insérées. **⚠️ Conformément au brief 01 (cadre éducatif vs farming) : aucune XP n'est ajoutée à `User.points`.** Le classement Battle est entièrement séparé de l'XP global FlipLearn.
- **Nouvelle route `GET /api/battle/leaderboard`** ([controllers/battleController.js](fliplearn/backend/controllers/battleController.js)) : agrégation MongoDB avec tri par `wins desc, totalScore desc, bestStreak desc`. Hydratée avec prenom/nom/filière/promotion. Limite 10 par défaut, 50 max.
- **Nouvelle route `GET /api/battle/mine`** : stats personnelles du joueur (matches, victoires, défaites, meilleur streak, 5 derniers matches).

### Quiz Battle — sélection de matière (brief 01 phase 2)
- **`backend/server.js`** : `battle:create` accepte un `courseId` optionnel ; `battle:start` filtre les QCMs par `videoId in (vidéos de courseId)`. Si pas de courseId → toutes matières mélangées (comportement précédent). Si pas assez de QCMs sur la matière, fallback sur les questions de démo (comportement existant).
- **`frontend/src/pages/QuizBattle.jsx`** :
  - Onglets "Jouer" / "Classement" en tête du lobby.
  - Onglet Classement : tableau top 10 avec rangs colorés (or/argent/bronze) + bandeau de stats personnelles.
  - Le bouton "Créer une salle" ouvre maintenant une **modale de configuration** : sélecteur de matière (cours), label "Mode actuel : 1 contre 1" (mode unique pour cette première version), boutons Annuler / Créer la salle.
  - Disclaimer dans l'onglet Classement : *"Aucune XP n'est attribuée pour gagner un Battle : la motivation se fait par le classement et les badges."*

### Brief 02 — Architecture Prosit proposée (à valider)
- Document `_briefs/03_PROPOSITION_ARCHITECTURE_PROSIT.md` rédigé : modèle Mongoose dédié `Prosit` (séparé de `Project`), schéma complet (groupes, rôles CESI, 3 phases, contributions individuelles, grille d'évaluation), endpoints REST, pages React, state machine de transitions, badges, plan d'implémentation en 13 étapes (~14h). Aucun code écrit — en attente de validation utilisateur sur 7 points clés (XP par Prosit, mode d'évaluation, taille de groupe, etc.).

---

## 29 Avril 2026 (cadre juridique récompenses + sobriété UX Quiz Battle)

### Récompenses (Rewards) — restriction du catalogue actif
- **Backend (`rewardsSeed.js`)** : seul le palier `1 mois FlipLearn Premium` (500 pts) reste seedé comme actif. Les paliers 3 mois / 6 mois / 1 an seedés dans des versions précédentes sont désormais **désactivés** automatiquement (`active: false`) au démarrage du serveur — pas de delete (l'historique des éventuels claims est préservé).
- **Frontend (`Rewards.jsx`)** : ajout d'une section **« Perspectives d'évolution »** sous le catalogue, contenant 3 cartes informatives (3, 6, 12 mois) **non réclamables** : grisées, sans bouton Réclamer, sans coût en points affiché, label « PERSPECTIVE ».
- **Disclaimer juridique explicite** : un bandeau précise que ces paliers « ne constituent pas une offre commerciale » et que leur mise en place dépendrait de partenariats avec des établissements et d'un cadre juridique à venir.
- **Pourquoi** : à ce stade du PFE, FlipLearn n'est pas adossé à une structure juridique ; promettre des prestations longue durée serait déontologiquement et légalement contestable. La section Perspectives permet de montrer la vision long terme du programme de gamification sans créer d'attente non honorée.

### Quiz Battle — sobriété de l'UI lobby
- Suppression des 3 grosses cartes colorées « Combos » (orange) / « Power-ups » (bleu) / « Invincible » (violet) qui encombraient la page d'accueil du lobby.
- Remplacées par un seul élément `<details>` repliable « Règles du jeu » — sobre, replié par défaut, chevron animé.
- Contenu équivalent (combos +5 / +10, 3 power-ups, badge Invincible) accessible en un clic, mais ne distrait plus le joueur du bouton « Créer une salle ».

### Documentation associée (hors repo `flipleran`)
- `generate_memoire.py` § 7.4.1 réécrite : précise que seul le palier 1 mois est réclamable et explicite le rôle de la rubrique « Perspectives » comme pédagogique et non commerciale.
- `Memoire_PFE_FlipLearn.docx` régénéré.

---

## 28 Avril 2026 — fin de journée (audit pré-soutenance — pivot UX)

### Sidebar prof
- Suppression des 2 fausses entrées "Outils IA" (Analyse vidéo IA, Assistant Module) qui pointaient vers `/courses` avec un simple tooltip — comportement trompeur.
- Réorganisation en 4 sections claires : **Mon enseignement** (Tableau de bord, Suivi étudiants, Mes cours, Ressources, Projets), **Création** (QCM, Générer QCM IA, Badges), **Communication**, **Mon espace**.

### Dashboard prof (`/professor/dashboard/:courseId`)
- Retrait de la grosse liste étudiants triable (chevauchait la page `/professor/tracking`).
- Suppression du composant `StudentTable` (~165 lignes) + helpers `SORT_FIELDS`, `SortIcon`, `fmt` devenus inutiles.
- Ajout d'un CTA en bas qui pousse explicitement vers le Suivi individuel.

### Module Projet — refonte UX
- **ProjectList** : suppression de l'encart explicatif déplié "Mono-module vs Groupé" et des 3 onglets de filtre par type. Remplacé par un encart pédagogique sobre "Qu'est-ce qu'un projet ?". Sur les cards : disparition des emojis et gradients différenciés (📘/🌐), badges remplacés par statut + modules rattachés.
- **ProjectCreate** : suppression des 2 gros boutons toggle Mono/Groupé en haut. Toggle compact "1 seul module / Plusieurs modules" intégré dans la section Rattachement.
- **ProjectDetail** : ajout d'un encart "À propos de ce projet" qui explique en 3 lignes le concept (travail en groupe, rôles, phases, livrables, auto-évaluation).

### Jauge progression livrables
- Avant : binaire 0% si aucun livrable, 100% dès le 1er — peu importe le nombre de groupes.
- Après : proportionnelle = `(groupes ayant déposé / total groupes) × 100`. Un projet à 5 groupes dont 1 a déposé affiche désormais 20% au lieu de 100%.
- Affichage du label : `XX% des groupes` (au lieu de juste le nombre brut de livrables).

### Vérifications faites (pas de modif)
- **QCM** : le QCMPlayer affiche déjà un corrigé détaillé après soumission (bonne réponse en vert, réponse donnée incorrecte en rouge, explication pédagogique). Pas de modif.
- **Badges** : 8 badges bien définis + page `/professor/badges` pour attribution manuelle. Pas de modif.
- **Vidéos vs Ressources** : ResourceLibrary par cours a déjà 2 onglets séparés "Fichiers" / "Vidéos". ResourcesHub global ne mélange pas les 2. Cohérent.

---

## 28 Avril 2026 (recentrage — retrait de l'IA prédictive TensorFlow)

### Décision pédagogique
- Le projet contenait trop de briques IA (ML + LLM + automatisations + dashboards) → saturation.
- Recentrage sur les **agents IA conversationnels** uniquement, qui apportent une vraie valeur en classe inversée.
- Vision retenue : **encadrement personnalisé via assistants** (par module + analyse vidéo + génération QCM), pas de "prédicteur d'échec".

### Fichiers supprimés
- `ai-service/` (microservice Python TensorFlow complet : 2 modèles MLP + Flask + datasets)
- `backend/services/aiService.js`, `backend/services/aiAutomation.js`
- `backend/controllers/aiController.js`, `backend/routes/aiRoutes.js`
- `frontend/src/pages/AIDashboard.jsx`, `frontend/src/pages/StudentAICoach.jsx`
- `frontend/src/components/PersonalizedReviewPanel.jsx`
- `DEPLOYMENT_AI.md`

### Fichiers modifiés
- `backend/server.js` : retrait import `aiRoutes` + appel `scheduleAutoTraining`
- `backend/controllers/qcmController.js` : retrait hook `autoPredictAfterQcm`
- `backend/models/Progress.js` : suppression des 4 champs IA (`aiPredictedScore`, `aiDropoutProbability`, `aiRiskLevel`, `aiRiskUpdatedAt`)
- `backend/.env.example` : retrait `AI_SERVICE_URL` + `AI_SERVICE_TOKEN`
- `frontend/src/App.jsx` : retrait routes `/professor/ai` et `/my/ai-coach/:courseId`
- `frontend/src/components/Layout.jsx` : retrait item sidebar "IA pédagogique"
- `frontend/src/pages/StudentCourse.jsx` : retrait bannière de risque + bouton "Mon coach IA"
- `render.yaml` : retrait du service `fliplearn-ai` (Python)

### Ce qui reste (agents IA cohérents)
1. **Module Assistant** (`moduleAI.js`) — chat par cours avec persona + RAG sur le contenu
2. **Analyse vidéo** (`videoAnalyzer.js`) — Whisper + GPT-4o → transcript / résumé / concepts clés
3. **Génération QCM par IA** (`generateQuizQuestions`) — outil prof, gain de temps réel

---

## 22 Avril 2026 (session IA #3 — Automatisation complete en arriere-plan)

### 3 automatisations IA invisibles pour l'utilisateur
- **Auto-entrainement hebdomadaire** : cron dimanches 03:00 re-entraine les modeles TF sur les nouvelles donnees. Plus besoin du bouton manuel "Entrainer les modeles".
- **Auto-prediction apres QCM** : hook fire-and-forget dans `qcmController.submitQCM` qui recalcule le niveau de risque et le persiste dans `Progress.aiRiskLevel`.
- **Auto-alerte au prof** : si un etudiant passe en risque `modere/eleve/critique`, notification temps reel (Socket.io) envoyee au prof du cours avec priorite escalee.

### Nouvelle banniere automatique cote etudiant
- `StudentCourse.jsx` : banniere coloree qui apparait en haut de la page si l'IA a detecte un risque >= modere (rouge/orange/jaune selon le niveau).
- Clic → ouvre le plan de rattrapage IA.
- Nouveau endpoint leger `GET /api/ai/my-risk/:courseId` qui lit `Progress` directement (ne depend pas du microservice Python).

### Architecture
- Nouveau service `backend/services/aiAutomation.js` centralisant les 3 automatisations.
- Progress etendu avec 4 champs : `aiPredictedScore`, `aiDropoutProbability`, `aiRiskLevel`, `aiRiskUpdatedAt`.
- Gestion intelligente de la degradation : notification prof UNIQUEMENT si le niveau empire (pas pour un etudiant deja faible qui reste faible).

---

## 22 Avril 2026 (session IA #2 — Combo ML+LLM + Blueprint Render)

### Plan de rattrapage IA personnalisé (feature killer combo)
- Nouvel endpoint `GET /api/ai/personalized-review/:courseId` qui orchestre 3 systèmes IA :
  1. **TensorFlow** prédit le score final + probabilité de décrochage de l'étudiant
  2. **MongoDB** identifie les 2-3 chapitres les plus faibles via l'historique QCM
  3. **Groq** génère 5 QCM ciblés sur le chapitre le plus faible (utilise les concepts de VideoAnalysis)
- Nouveau composant `PersonalizedReviewPanel.jsx` : modal avec gradient header, carte de risque colorée, chapitres à revoir, QCM interactif (navigation par onglets, vérification + explication)
- Bouton "Plan de rattrapage IA" intégré dans `StudentCourse.jsx` (étudiants uniquement)
- Graceful fallback : affichage propre même si Groq/TF sont indisponibles

### Déploiement Render automatisé
- Nouveau `render.yaml` à la racine décrivant les 2 services en mode Blueprint
- Liaison automatique `AI_SERVICE_URL` via `fromService` (plus besoin de coller manuellement l'URL)
- Plan `starter` (7$/mois) obligatoire pour `fliplearn-ai` (TF ne tient pas dans le free tier)
- Guide complet `DEPLOYMENT_AI.md` : 2 options (Blueprint vs manuel) + checklist des secrets

---

## 22 Avril 2026 (session IA — Microservice TensorFlow)

### Nouveau microservice IA (`ai-service/`)
- Architecture microservices : Python/Flask (port 5001) séparé du backend Node.js
- **Prédicteur de réussite** : modèle Keras MLP (régression) qui prédit le score final 0-100 d'un étudiant sur un cours — métriques MAE / RMSE / R²
- **Détecteur de décrochage** : modèle Keras MLP (classification binaire) avec class_weight — métriques Accuracy / Precision / Recall / F1 / ROC-AUC
- Pipeline `extract_data.py` : agrège 9 features depuis MongoDB (Progress, QCM, User, Course, Deck) + fallback synthétique réaliste si données insuffisantes
- Inférence thread-safe avec cache paresseux des modèles (`predictor.py`)
- API Flask sécurisée par token partagé `X-AI-Service-Token` : `/health`, `/train`, `/predict/features`, `/predict/student/:uid/:cid`, `/students/at-risk`

### Intégration backend Node.js
- Nouveau service `backend/services/aiService.js` (fetch natif, aucune dépendance ajoutée)
- Controller `aiController.js` + routes `/api/ai/*` avec contrôle de rôle (prof/admin pour train et at-risk)
- Variables d'environnement `AI_SERVICE_URL` + `AI_SERVICE_TOKEN` documentées dans `.env.example`

### Dashboard React IA pédagogique
- Nouvelle page `frontend/src/pages/AIDashboard.jsx` sur `/professor/ai`
- Affiche les métriques des modèles, stats globales (étudiants actifs, cours, score moyen), et tableau des étudiants à risque classés par probabilité
- Boutons "Entraîner les modèles" (déclenche l'entraînement côté Python) et "Rafraîchir"
- Entrée sidebar "IA pédagogique" (icône BrainCircuit) sous la section Gestion

### Documentation
- README complet dans `ai-service/README.md` (installation, workflow, endpoints, pitch soutenance)
- Documentation PFE mise à jour (modif #014) via `doc_updater.py`

---

## 18 Avril 2026 (session 3 — Authentification, 3 filières, YouTube, thèmes)

### Authentification avec validation admin
- Nouveau champ `User.status` (pending / active / rejected) + `rejectionReason`, `approvedBy`, `approvedAt`
- Inscription : ne connecte PAS automatiquement, crée un compte pending + notifie les admins
- Login : bloque pending et rejected avec messages dédiés (encarts colorés spécifiques)
- Nouveaux endpoints admin : GET /auth/pending, PUT /auth/users/:id/approve, PUT /auth/users/:id/reject
- Nouvelle section admin "Inscriptions" dans AdminDashboard avec avatar généré par filière
- Migration au boot : comptes existants (sans status) marqués 'active' automatiquement
- Email notification à l'étudiant lors d'approbation/refus
- Écran de confirmation post-inscription avec étapes visuelles

### Landing page refaite
- Hero avec démo animée du chatbot IA (chat pop-in)
- 3 cartes filières cliquables (ISIL, Management, Finance) avec modules types
- Section "Comment ça marche" en 4 étapes
- 6 features avec hover coloré
- 3 témoignages étudiants avec étoiles
- CTA final avec gradient et features trust (100% gratuit, validé par EM Alger, activation 24h)

### Thèmes de couleurs par filière
- `FILIERE_THEMES` : ISIL=bleu, Management=orange, Finance=vert
- Hook `useTheme` enrichi avec `filiereTheme`
- CSS variables `--filiere-primary`, `--filiere-accent`, `--filiere-gradient` appliquées sur document
- Event `fliplearn:user-changed` émis au login/logout pour sync instantanée
- Persona IA enrichie : directives domaine par filière (références, exemples, vocabulaire)

### Support vidéos YouTube
- `Video.provider` ('cloudinary' | 'youtube') + `youtubeId`
- Parser URL YouTube robuste (youtube.com/watch, youtu.be, embed, shorts, ou ID direct)
- Nouveau POST /api/videos/youtube (prof/admin)
- Composant `YouTubeEmbedPlayer` avec iframe + tracking temps d'écoute estimé + bouton "J'ai terminé"
- Onglet YouTube dans ProfessorUpload : collage d'URL + titre + durée + ordre
- Thumbnail auto depuis i.ytimg.com

### Contenu démo pré-rempli
- Nouveau service `contentSeed.js` : 27 vidéos YouTube + 9 cours (3 filières × 3 niveaux)
- Chaque cours a un `aiPersona` adapté (Algo-Bot, Py-Bot, Manage-Bot, Compta-Bot, etc.)
- Seed idempotent (ne duplique pas) + désactivable via SEED_CONTENT=false
- Seed utilise le premier prof trouvé comme propriétaire (override possible)

### UI projets — mono vs multi
- Onglets filtres enrichis : Tous / Prosits / Projets / 📘 Mono-module / 🌐 Collaboratifs
- Encart explicatif "Qu'est-ce qu'un Prosit ?" collapsible avec les 3 phases (Aller / Recherche / Retour)
- Distinction claire Prosit/Projet/Mono/Multi dans l'UI

### Documentation
- doc_updater.py entrée #010 ajoutée
- CHANGELOG.md mis à jour

---

## 18 Avril 2026 (session 2 — UX & engagement)

### Toast notifications pop animées
- Refonte `ToastContext.jsx` : toasts "pop" avec animation scale + slide depuis top-right
- Icônes typées par catégorie (reminder_qcm, ticket_update, reward, achievement, etc.)
- Urgent : animation shake + shadow rouge + durée prolongée (8s)
- Progress bar animée avant disparition + clic ouvre le lien
- `NotificationContext` connecté → chaque notif socket.io déclenche un toast

### Navigation allégée
- Retrait des entrées "Notifications" de la sidebar (accessible via cloche Topbar)
- Fusion "Aide & Support" + "Mes tickets" : la page `/support` intègre désormais FAQ + gestion tickets (création avec priorité/catégorie, conversation multi-turn)
- `/my-tickets` redirige vers `/support` (compat)
- Suppression de `MyTickets.jsx` (obsolète)

### Admin tickets restylé
- Refonte `SupportSection` (AdminDashboard) : stats en carte (libres, mes tickets, urgents, résolus)
- Onglets Libres / Mes tickets / Tous ouverts / Résolus
- Filtres priorité + catégorie + recherche
- Tri automatique par priorité (urgent en haut)
- Modal conversation multi-turn avec édition priorité/catégorie à la volée

### Quiz Battle enrichi (game feel)
- **Streak / combos** : +5 points de bonus à partir de 3 bonnes d'affilée, +10 à partir de 5
- **Power-ups (1 par match)** : 50/50 (cache 2 options), Freeze (+8s timer), x2 Points
- Notification à l'adversaire quand un power-up est utilisé
- Animations : pulse vert sur bonne réponse, shake rouge sur mauvaise, timer qui pulse en rouge si ≤5s
- Post-match : stats détaillées (précision %, best streak, bonnes réponses)
- Badge "Invincible" automatique si 4 combos ou plus
- UI redesign lobby avec cartes features (Combos, Power-ups, Invincible)

### Projets — checklist et suivi détaillé
- Nouveau `checklist[]` sur chaque phase : tâches cochables par les membres
- Nouveau `ideas[]` : le prof peut pousser des suggestions (exercice/workshop/recherche/livrable) avec difficulté + estimation
- Widget "Progression globale" : % calculé à partir des phases (40%), tâches (40%), livrables (20%)
- Composant `ProjectProgressPanel.jsx` réutilisable (ProgressWidget, PhaseChecklist, IdeasPanel)
- Endpoints : POST/PUT/DELETE checklist item, POST/DELETE ideas

### Récompenses réelles (nouveau)
- Nouveaux modèles `Reward` (catalogue) et `RewardClaim` (réclamations)
- Controller + routes complet : catalogue, claim, my-claims, admin validation/livraison
- Catalogue seedé avec **15 récompenses concrètes** : certificats cybersécurité, Full-Stack, Data Analyst ; réductions TryHackMe/Udemy/DataCamp ; FlipLearn Premium 1/3 mois ; workshop cybersécu ; bootcamp IA ; t-shirt, mug, stickers, carnet ; badge Top 10
- Page `/rewards` : catalogue filtrable, carte produit avec highlight, barre de progression vers prochain objectif, modal confirmation (débit immédiat), onglet "Mes réclamations" avec statut temps réel
- Section admin `Récompenses` : traitement des claims (approver/livrer avec code/note/refuser avec remboursement auto)

### Documentation
- Appel `doc_updater.py` — entrée #009 ajoutée
- `CHANGELOG.md` mis à jour

---

## 18 Avril 2026

### Notifications persistantes & rappels automatiques (node-cron)
- Nouveau modèle `Notification.js` avec dédoublonnage (dedupKey) et index composé
- Champ `deadline` ajouté à `QCM`, `Video` ; `Project.phases.dateFin` déjà existant
- Service `notificationService.js` : push unifié (DB + Socket.io)
- Scheduler `notificationScheduler.js` (node-cron) tournant à 08:00 quotidien
- Rappels automatiques à J-7/J-3/J-1/J-0 pour QCM non complétés, vidéos non vues, phases projets
- Nouvelles routes `/api/notifications` (list, unread-count, read, read-all, delete, clear)
- Refonte complète de `NotificationContext.jsx` : DB-backed, plus de localStorage
- Nouvelle page `/notifications` (NotificationsPage.jsx) avec filtres et actions

### Suivi étudiants pour le professeur
- Nouvelles routes `/api/tracking` (my-courses, course/:id, course/:id/remind)
- Nouvelle page `/professor/tracking` : stats globales + tableau détaillé par étudiant
- Rappels manuels ciblés (par vidéo, par QCM, ou général) envoyés comme notifications

### IA spécialisée par module (RAG léger)
- Ajout de `aiPersona` sur `Course` (nom, specialite, avatar, ton, description, couleur)
- Nouveau service `moduleAI.js` : contexte RAG à partir des summaries + keyConcepts des VideoAnalysis
- Nouvelles routes `/api/chatbot/module/:courseId` (GET persona + historique, POST message)
- Route `/api/courses/:id/ai-persona` pour que le prof configure son assistant
- Nouvelle page `/courses/:courseId/assistant` (ModuleAssistant.jsx) avec éditeur de persona
- Bouton 'Assistant IA du module' dans StudentCourse

### Tickets support enrichis
- Modèle `SupportTicket` enrichi : priority, category, conversation[], resolvedAt, status 'closed'
- Controller entièrement refait + `/api/support/mine`, `/api/support/:id`, `/api/support/:id/message`, `/api/support/:id/priority`
- Nouvelle page `/my-tickets` (MyTickets.jsx) : filtres, création avec priorité, conversation multi-turn
- Notifications persistées à chaque étape (création, prise en charge, résolution, nouveau message)

### Timeline projets temps réel
- Nouveaux champs `Project.modules: [Course]` (pour projets multi-modules collaboratifs) et `Project.activity[]`
- Helpers `logActivity` + `notifyMembers` dans projectController
- Émission Socket.io `project:activity` sur changement de phase et ajout de livrable
- `getProjects` retourne maintenant `isMultiModule` calculé
- Badges 'Mono-module' / 'Multi-modules (N)' dans ProjectList
- Nouveau composant `ProjectActivityFeed.jsx` avec indicateur '● En direct' intégré dans ProjectDetail

### Documentation
- Appel à `doc_updater.py` → Documentation_PFE.docx modification #008 + Tutoriel_FlipLearn.docx mis à jour

---

## 28 Mars 2026

### Module Classe par Projet (PBL)
- Création du modèle `Project.js` avec schémas imbriqués (groupes, membres, rôles, phases, livrables, évaluations)
- 5 rôles CESI : Chef de projet, Scribe, Animateur, Chrono, Analyste
- Controller avec 12 endpoints : CRUD projet, groupes aléatoires, upload livrables, auto-évaluation, aide IA
- 3 nouvelles pages frontend : ProjectList, ProjectDetail, ProjectCreate
- Badges de rôles stylisés (style carte de jeu / Loup-Garou) avec hover animé
- Timeline visuelle des phases du projet
- Upload de livrables (documents + vidéos) via Cloudinary
- Aide IA via Groq pour suggestions de ressources

### Notifications email (Brevo)
- Migration Gmail SMTP → Resend → Brevo (résolution problème IPv6 sur Render)
- Emails transactionnels pour messages privés et urgents
- Template HTML avec design FlipLearn

### Messages urgents
- Bouton ⚠️ pour les professeurs dans le chat
- Badge rouge "URGENT" sur les messages
- Email urgent avec template rouge

### Quiz Battle
- Notification cliquable (redirige vers /quiz-battle)
- Codes de salle lisibles (BATTLE-X7K2MF)
- Gestion timeout null answer

### Corrections diverses
- Fix `etudiantId` → `userId` dans les groupes
- Fix `statut` → `status` pour le projet principal
- Fix aide IA : `data.suggestions` au lieu de `data.response`
- Fix upload livrables : groupeIndex auto-détecté + middleware étendu (vidéos/images)
- Fix affichage livrables : populate uploadedBy + date correcte
- Fix accents français dans ProjectDetail et ProjectCreate

---

## 27 Mars 2026

### Déploiement Render.com
- Configuration du déploiement (build command, start command, env vars)
- Fix vite devDependencies pour le build sur Render
- Fix chemins relatifs `cd backend && node server.js`
- Configuration MongoDB Atlas (IP whitelist 0.0.0.0/0)
- Configuration Cloudinary (3 variables séparées)
- Configuration Groq (migration llama3-8b → llama-3.3-70b-versatile)

### Configuration email
- Gmail SMTP : fonctionne en local, échoue sur Render (IPv6 ENETUNREACH)
- Resend : fonctionne mais limité à sa propre adresse en gratuit
- Brevo : solution finale, 300 emails/jour gratuits vers tout le monde

---

## 26 Mars 2026

### Refonte UI/UX complète
- Design system CSS (classes réutilisables, variables, responsive)
- Sidebar mobile avec hamburger menu et overlay
- Breadcrumb sur les pages intérieures
- Toast notifications (succès/erreur/info)
- Modal de confirmation
- Page 404 professionnelle
- Dashboard étudiant avec skeleton loading et accès rapide
- Flashcards avec animation flip 3D et navigation clavier

### Corrections de bugs
- Fix mapping rôles etudiant/professeur dans Layout.jsx
- Création de CoursesPage.jsx (route manquante)
- Fix profil étudiant (Layout wrapper + formulaire édition)
- Fix admin sidebar (query params)
- Fix variables CSS (alias --primary vers --color-primary)
- Logo FlipLearn cliquable (retour accueil)
- Accents français dans 9 fichiers

### Nouvelles fonctionnalités
- QCM choix multiple (checkbox)
- Génération QCM par IA (Groq)
- Page Contacts chat avec filtres
- Chapitres vidéo navigables

---

## 25 Mars 2026

### Développement initial
- Stack MERN : MongoDB + Express + React + Node.js
- Authentification JWT avec bcrypt
- Socket.io pour chat temps réel
- Upload vidéos via Cloudinary
- Système de gamification (points, badges, classement)
- Script seed.js avec données de démonstration
- 10 collections MongoDB
- 24 pages React
