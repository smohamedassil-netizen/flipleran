# Audit fonctionnalités professeur — FlipLearn

**Date** : 2026-05-10
**Mode** : lecture seule, aucune modification de code
**Branche** : main
**Périmètre** : tout ce que peut faire un compte `role === 'professeur'`

> Légende des statuts :
> - ✅ **Active** : exposée dans la sidebar / accessible via la navigation principale prof
> - ⚠️ **Cachée** : code branché côté backend ET frontend, mais aucun chemin de navigation sidebar (accessible seulement par URL directe ou bouton enfoui)
> - ❌ **Désactivée** : code commenté, route commentée, ou composant qui retourne `null`

---

## Phase 1 — Routes API du professeur

### Convention de protection
Tous les endpoints listés ici sont protégés par `authMiddleware + requireRole('professeur', 'admin')` (ou variantes). Source : [backend/middleware/roleMiddleware.js](fliplearn/backend/middleware/roleMiddleware.js).
Quelques routes sont `requireRole('professeur')` strict (création projet) — voir colonne notes.

### 1.1 — Authentification & Profil (commun)
| Endpoint | Description | Controller | Statut |
|---|---|---|---|
| POST `/api/auth/register` | Inscription (admin doit valider) | authController.register | ✅ Active |
| POST `/api/auth/login` | Connexion | authController.login | ✅ Active |
| POST `/api/auth/refresh` | Refresh token | refreshToken middleware | ✅ Active |
| POST `/api/auth/logout` | Déconnexion | inline | ✅ Active |
| GET `/api/auth/me` | Mon profil | authController.getMe | ✅ Active |
| PUT `/api/auth/profile` | Modifier mes infos | authController.updateProfile | ✅ Active |
| PUT `/api/auth/password` | Changer mot de passe | authController.changePassword | ✅ Active |
| PUT `/api/auth/avatar` | Upload avatar | authController.uploadAvatar | ✅ Active |
| GET `/api/users/me/ai-quota` | Mon quota IA mensuel | userController.getMyAiQuota | ⚠️ Cachée (pas de page Settings/Quota visible côté prof, à vérifier) |

### 1.2 — Modules (Course)
Source : [backend/routes/courseRoutes.js](fliplearn/backend/routes/courseRoutes.js)
| Endpoint | Description | Controller | Statut |
|---|---|---|---|
| POST `/api/courses` | Créer un module | courseController.createCourse | ✅ Active (modal CoursesPage) |
| GET `/api/courses` | Liste des modules | getCourses | ✅ Active |
| GET `/api/courses/:id` | Détail d'un module | getCourseById | ✅ Active |
| PUT `/api/courses/:id` | Modifier un module | updateCourse | ⚠️ Cachée (UI prof n'expose qu'un modal de création ; pas de page d'édition prof) |
| DELETE `/api/courses/:id` | Supprimer un module | deleteCourse | ⚠️ Cachée (seul AdminDashboard l'expose) |
| PUT `/api/courses/:id/ai-persona` | Configurer persona IA du module | updateAiPersona | ✅ Active (ModuleAssistant) |
| GET `/api/courses/:id/outcomes` | Lire learning outcomes Bloom | getCourseOutcomes | ✅ Active (lecture sur StudentCourse) |
| PUT `/api/courses/:id/outcomes` | Éditer learning outcomes Bloom | updateCourseOutcomes | ❌ Désactivée (page CourseLearningOutcomes commentée dans App.jsx:202) |
| GET `/api/courses/:id/insights` | Insights pédagogiques IA classe | getCourseInsights | ✅ Active (TeacherInsightsWidget) |
| GET `/api/courses/:id/insights/student/:userId` | Suggestion IA personnalisée par étudiant | getStudentSuggestion | ✅ Active (StudentSuggestionModal dans tracking) |
| GET `/api/courses/:id/completions` | Liste des étudiants ayant validé le module | listCompletions | ⚠️ Cachée (pas d'UI prof identifiée) |
| GET `/api/courses/:id/grades` | Tableau des notes CC | listGrades | ✅ Active (CourseGrades) |
| PUT `/api/courses/:id/grade-settings` | Pondérations + toggle "QCM compte dans la note" | updateGradeSettings | ✅ Active (CourseGrades) |

### 1.3 — Chapitres (Chapter)
Source : [backend/routes/chapterRoutes.js](fliplearn/backend/routes/chapterRoutes.js)
| Endpoint | Description | Controller | Statut |
|---|---|---|---|
| POST `/api/courses/:courseId/chapters` | Créer un chapitre | createChapter | ✅ Active (ChaptersView dans StudentCourse) |
| GET `/api/courses/:courseId/chapters` | Liste chapitres | listChapters | ✅ Active |
| PUT `/api/chapters/:id` | Modifier un chapitre | updateChapter | ✅ Active |
| DELETE `/api/chapters/:id` | Supprimer un chapitre | deleteChapter | ✅ Active |
| POST `/api/chapters/:id/assign-video` | Rattacher une vidéo à un chapitre | assignVideo | ✅ Active |
| GET `/api/chapters/:id/practice` | Mode entraînement chapitre | getChapterPractice | ✅ Active (étudiant) |

### 1.4 — Capsules (Video)
Source : [backend/routes/videoRoutes.js](fliplearn/backend/routes/videoRoutes.js)
| Endpoint | Description | Controller | Statut |
|---|---|---|---|
| POST `/api/videos/upload` | Upload fichier vidéo (Cloudinary) | uploadVideo | ✅ Active (ProfessorUpload, mode "file") |
| POST `/api/videos/youtube` | Lien YouTube | createYouTubeVideo | ✅ Active (ProfessorUpload, mode "youtube") |
| GET `/api/videos/course/:courseId` | Vidéos d'un cours | getVideosByCourse | ✅ Active |
| GET `/api/videos/:id` | Détail vidéo | getVideoById | ✅ Active |
| GET `/api/videos/:id/stats` | Stats vidéo | getVideoStats | ⚠️ Cachée (existe ; pas trouvé d'appel UI prof direct, sauf via dashboard agrégé) |
| PUT `/api/videos/:id` | Modifier vidéo (titre/desc/order/parts/chapters) | updateVideo | ✅ Active (StudentCourse edit + VideoPartsEditor) |
| DELETE `/api/videos/:id` | Supprimer vidéo | deleteVideo | ✅ Active (StudentCourse) |

### 1.5 — Questions interactives in-video (VideoQuestion)
Source : [backend/routes/videoQuestionRoutes.js](fliplearn/backend/routes/videoQuestionRoutes.js)
| Endpoint | Description | Controller | Statut |
|---|---|---|---|
| GET `/api/video-questions/video/:videoId` | Liste questions d'une vidéo | listByVideo | ✅ Active |
| POST `/api/video-questions` | Créer point de contrôle in-video | create | ✅ Active (ProfessorVideoQuestions) |
| PUT `/api/video-questions/:id` | Modifier | update | ✅ Active |
| DELETE `/api/video-questions/:id` | Supprimer | remove | ✅ Active |
| GET `/api/video-questions/:id/stats` | Stats question (taux de bonne réponse) | stats | ✅ Active |

### 1.6 — QCM (capsule + chapitre + module)
Source : [backend/routes/qcmRoutes.js](fliplearn/backend/routes/qcmRoutes.js)
| Endpoint | Description | Controller | Statut |
|---|---|---|---|
| POST `/api/qcm/create` | Créer un QCM (scope=video / chapter / module) | createQCM | ✅ Active (ProfessorCreateQCM, ScopedQCMCreate) |
| POST `/api/qcm/generate-ai` | Générer QCM via Groq (quota mensuel FREE=5) | generateQCMWithAI | ✅ Active (bouton "Générer avec IA") |
| GET `/api/qcm/video/:videoId` | QCM d'une capsule | getQCMByVideo | ✅ Active |
| GET `/api/qcm/chapter/:chapterId` | QCM d'un chapitre | getQCMByChapter | ✅ Active |
| GET `/api/qcm/module/:courseId` | QCM final de module | getQCMByModule | ✅ Active |
| GET `/api/qcm/:id/stats` | Analyse questions faibles | getQCMStats | ✅ Active (ProfessorDashboard) |
| PUT `/api/qcm/:id` | Modifier QCM | updateQCM | ✅ Active |
| DELETE `/api/qcm/:id` | Supprimer QCM | deleteQCM | ✅ Active (ProfessorQCMHub) |

### 1.7 — Auto-préparation IA d'une capsule (CourseAutoPrep)
Source : [backend/routes/courseAutoPrepRoutes.js](fliplearn/backend/routes/courseAutoPrepRoutes.js)
Limite : 5 jobs / prof / jour.
| Endpoint | Description | Controller | Statut |
|---|---|---|---|
| POST `/api/courses/:courseId/videos/:videoId/auto-prep` | Lancer un job d'auto-prep | startAutoPrep | ✅ Active (AutoPrepReview, bouton "✨ IA" sur StudentCourse) |
| GET `/api/courses/:courseId/videos/:videoId/auto-prep/latest` | Dernier job de cette vidéo | getLatestForVideo | [À vérifier] (pas trouvé d'appel UI clair) |
| GET `/api/auto-prep-jobs/:jobId` | Polling statut + résultats | getAutoPrepJob | ✅ Active |
| POST `/api/auto-prep-jobs/:jobId/publish` | Publier sélections (questions + outcomes + flashcards) | publishAutoPrep | ✅ Active |

### 1.8 — Analyse vidéo IA (Whisper transcript + GPT-4o)
Source : [backend/routes/videoAnalysisRoutes.js](fliplearn/backend/routes/videoAnalysisRoutes.js)
| Endpoint | Description | Controller | Statut |
|---|---|---|---|
| POST `/api/videos/:id/analyze` | Lancer analyse IA (étudiant + prof) | startAnalysis | ✅ Active |
| POST `/api/videos/:id/request-analysis` | Alias étudiant | startAnalysis | ✅ Active |
| GET `/api/videos/:id/analysis` | Récupérer analyse | getAnalysis | ✅ Active |
| GET `/api/videos/:id/analysis/status` | Polling | getAnalysisStatus | ✅ Active |
| DELETE `/api/videos/:id/analysis` | Supprimer pour relancer | deleteAnalysis | ⚠️ Cachée (pas de bouton UI prof) |

### 1.9 — Parcours pédagogique scénarisé (LearningPath)
Source : [backend/routes/learningPathRoutes.js](fliplearn/backend/routes/learningPathRoutes.js)
| Endpoint | Description | Controller | Statut |
|---|---|---|---|
| GET `/api/learning-paths/course/:courseId` | Parcours d'un cours | getPathByCourse | ✅ Active |
| POST `/api/learning-paths` | Créer parcours | createPath | ✅ Active (LearningPathBuilder) |
| PUT `/api/learning-paths/:id` | Éditer parcours | updatePath | ✅ Active |
| DELETE `/api/learning-paths/:id` | Supprimer parcours | deletePath | ✅ Active |
| POST `/api/learning-paths/:id/publish` | Publier parcours (`publishedAt`) | publishPath | ✅ Active |

### 1.10 — Ressources (PDF, PPTX, ZIP, etc.)
Source : [backend/routes/resourceRoutes.js](fliplearn/backend/routes/resourceRoutes.js)
| Endpoint | Description | Controller | Statut |
|---|---|---|---|
| POST `/api/resources/upload` | Uploader ressource | uploadResource | ✅ Active (ResourceLibrary) |
| GET `/api/resources/all` | Toutes les ressources accessibles | getAllAccessibleResources | ✅ Active (ResourcesHub) |
| GET `/api/resources/course/:courseId` | Ressources d'un cours | getResourcesByCourse | ✅ Active |
| DELETE `/api/resources/:id` | Supprimer ressource | deleteResource | ✅ Active |

### 1.11 — Tracking & Suivi étudiants
Source : [backend/routes/trackingRoutes.js](fliplearn/backend/routes/trackingRoutes.js) — `router.use(requireRole('professeur', 'admin'))` global
| Endpoint | Description | Controller | Statut |
|---|---|---|---|
| GET `/api/tracking/alerts` | Alertes globales (cours <50% complétion) | getProfessorAlerts | ✅ Active (banner ProfessorDashboard) |
| GET `/api/tracking/my-courses` | Liste cours du prof avec résumé | getMyCoursesSummary | ✅ Active (ProfessorTracking) |
| GET `/api/tracking/course/:courseId` | Suivi détaillé par étudiant pour 1 cours | getCourseTracking | ✅ Active |
| POST `/api/tracking/course/:courseId/remind` | Rappel groupé/individuel ciblé | sendManualReminder | ✅ Active |

### 1.12 — Briefings & Insights pédagogiques (Dashboard prof)
Source : [backend/routes/professorRoutes.js](fliplearn/backend/routes/professorRoutes.js)
| Endpoint | Description | Controller | Statut |
|---|---|---|---|
| GET `/api/professor/courses` | Cours enseignés | getProfessorCourses | ✅ Active |
| GET `/api/professor/dashboard/:courseId` | Données dashboard agrégé | getCourseDashboard | ✅ Active (ProfessorDashboard) |

### 1.13 — Feedback ciblé prof → étudiant
Source : [backend/routes/feedbackRoutes.js](fliplearn/backend/routes/feedbackRoutes.js)
| Endpoint | Description | Controller | Statut |
|---|---|---|---|
| POST `/api/feedback` | Envoyer feedback à un étudiant | createFeedback | ✅ Active (modale ProfessorTracking) |

### 1.14 — Badges (gamification)
Source : [backend/routes/badgeRoutes.js](fliplearn/backend/routes/badgeRoutes.js)
| Endpoint | Description | Controller | Statut |
|---|---|---|---|
| GET `/api/badges` | Catalogue badges | getBadges | ✅ Active |
| POST `/api/badges` | Créer un badge custom | createBadge | ✅ Active (BadgeManagement) |
| POST `/api/badges/award` | Attribuer badge à un étudiant | awardBadge | ⚠️ **BUG potentiel** : la page BadgeManagement charge la liste étudiants via `/admin/users` (admin-only) → côté prof, la liste reste vide silencieusement |

### 1.15 — Cas pratiques (nouveau flow refonte 2026-05)
Source : [backend/routes/casPratiqueRoutes.js](fliplearn/backend/routes/casPratiqueRoutes.js)
| Endpoint | Description | Controller | Statut |
|---|---|---|---|
| POST `/api/cas-pratiques` | Créer cas pratique | createCasPratique | ✅ Active (CasPratiqueCreate) |
| PUT `/api/cas-pratiques/:id` | Modifier | updateCasPratique | ✅ Active |
| DELETE `/api/cas-pratiques/:id` | Supprimer | deleteCasPratique | ✅ Active |
| GET `/api/cas-pratiques/:id/eligible-students` | Étudiants éligibles au groupe | getEligibleStudents | ✅ Active |
| POST `/api/cas-pratiques/:id/group` | Composer le groupe (avec rôles) | setGroup | ✅ Active |
| POST `/api/cas-pratiques/:id/role-rotation/suggest` | Suggérer rotation de rôles | suggestRotation | ⚠️ Cachée [À vérifier UI] |
| GET `/api/cas-pratiques/:id/livrables` | Liste des livrables | listLivrables | ✅ Active (CasPratiqueDetail) |
| POST `/api/cas-pratiques/:id/phase-bilan` | Démarrer phase Bilan | startPhaseBilan | ✅ Active |
| POST `/api/cas-pratiques/:id/evaluate` | Évaluer (note + commentaire) | evaluate | ✅ Active |
| GET `/api/cas-pratiques/:id/ai-report` | Rapport IA intégrité (réutilise prositController) | getAiReport (prosit) | ✅ Active |

### 1.16 — Prosits (legacy — méthode CESI Aller/Recherche/Retour)
Source : [backend/routes/prositRoutes.js](fliplearn/backend/routes/prositRoutes.js)
> Le module Prosit a été remplacé par "Cas pratique" le 2026-05-09 (CLAUDE.md). La sidebar pointe vers `/cas-pratiques`. App.jsx redirige `/prosits` → `/cas-pratiques`. Les routes legacy sont **conservées** (rétrocompat) mais la page `PrositCreate.jsx` n'est plus accessible via la nav.
| Endpoint | Description | Controller | Statut |
|---|---|---|---|
| POST `/api/prosits` | Créer Prosit legacy | createProsit | ⚠️ Cachée (PrositCreate page existe mais pas de lien) |
| PUT `/api/prosits/:id` | Modifier | updateProsit | ⚠️ Cachée |
| DELETE `/api/prosits/:id` | Supprimer | deleteProsit | ⚠️ Cachée |
| POST `/api/prosits/:id/groupes/auto` | Groupes auto | generateGroupesAuto | ⚠️ Cachée |
| POST `/api/prosits/:id/groupes/manual` | Groupes manuels | setGroupesManual | ⚠️ Cachée |
| POST `/api/prosits/:id/transition` | Changer phase | transitionPhase | ⚠️ Cachée |
| PUT `/api/prosits/:id/groupes/:gIdx/evaluation` | Évaluer groupe | evaluateGroupe | ⚠️ Cachée (PrositDetail accessible mais via /prosits/:id direct) |
| GET `/api/prosits/:id/peer-assessments/summary` | Résumé peer-assessment | getPeerAssessmentSummary | ⚠️ Cachée |
| PUT `/api/prosits/:id/peer-assessments/deadline` | Étendre deadline | extendPeerAssessmentDeadline | ⚠️ Cachée |
| GET `/api/prosits/:id/ai-report` | Rapport IA intégrité | getAiReport | ⚠️ Cachée |
| GET `/api/prosits/:id/eligible-students` | Étudiants éligibles | getEligibleStudents | ⚠️ Cachée |

### 1.17 — Projets (Project)
Source : [backend/routes/projectRoutes.js](fliplearn/backend/routes/projectRoutes.js)
> Quelques routes utilisent `requireRole('professeur')` sans `'admin'` (création/édition projet). Pour le reste, prof + admin.
| Endpoint | Description | Controller | Statut |
|---|---|---|---|
| POST `/api/projects` | Créer projet (mono / groupe / pfe) | createProject | ✅ Active (ProjectCreate) |
| PUT `/api/projects/:id` | Éditer projet | updateProject | ✅ Active |
| DELETE `/api/projects/:id` | Supprimer projet | deleteProject | ✅ Active |
| POST `/api/projects/:id/groupes/random` | Groupes tirés au sort | createGroupsRandom | ✅ Active (ProjectDetail) |
| POST `/api/projects/:id/groupes` | Groupes manuels | createGroupsManual | ✅ Active |
| POST `/api/projects/:id/phases/:phaseId/checklist` | Ajouter item checklist | addChecklistItem | ✅ Active (PhaseChecklist) |
| DELETE `/api/projects/:id/phases/:phaseId/checklist/:itemId` | Retirer item | deleteChecklistItem | ✅ Active |
| POST `/api/projects/:id/ideas` | Ajouter idée | addIdea | ✅ Active (IdeasPanel) |
| DELETE `/api/projects/:id/ideas/:ideaId` | Supprimer idée | deleteIdea | ✅ Active |
| GET `/api/projects/:id/evaluations` | Voir évaluations entre pairs | getEvaluations | ✅ Active (bouton "Évaluations") |
| POST `/api/projects/:id/livrables/:livrableId/feedback` | Feedback livrable | addLivrableFeedback | ✅ Active (LivrableFeedbackBlock) |
| GET `/api/projects/:id/rubric` | Lecture grille | getProjectRubric | ✅ Active |
| PUT `/api/projects/:id/rubric` | Définir grille d'évaluation | setProjectRubric | ⚠️ [À vérifier UI] (existe en backend, pas trouvé d'éditeur prof — la rubric arrive surtout via templates) |
| POST `/api/projects/:id/peer-reviews/assign` | Auto-pairing peer review | assignPeerReviewers | ✅ Active (ProjectPeerReviewPanel) |
| GET `/api/projects/:id/peer-reviews/summary` | Résumé peer reviews | getPeerReviewSummary | ✅ Active |

### 1.18 — Templates de projets (F10)
Source : [backend/routes/projectTemplateRoutes.js](fliplearn/backend/routes/projectTemplateRoutes.js)
| Endpoint | Description | Controller | Statut |
|---|---|---|---|
| GET `/api/project-templates` | Liste templates | listTemplates | ✅ Active (ProjectTemplateLibrary) |
| GET `/api/project-templates/:id` | Détail template | getTemplate | ✅ Active |
| POST `/api/project-templates/:id/use` | Marquer utilisation | markTemplateUsed | ✅ Active |
| POST `/api/project-templates/generate` | Générer template via Groq | generateTemplate | ✅ Active |

### 1.19 — Communication (commun aux 3 rôles)
| Endpoint | Description | Controller | Statut prof |
|---|---|---|---|
| GET `/api/messages/contacts` | Mes contacts chat | messageController.getContacts | ✅ Active |
| GET `/api/messages/:roomId` | Historique d'une room | getMessages | ✅ Active |
| POST `/api/messages` | Envoyer message | sendMessage | ✅ Active |
| DELETE `/api/messages/:id` | Supprimer message | deleteMessage | ✅ Active |
| GET/PUT/DELETE `/api/notifications/*` | Notifications perso | notificationController | ✅ Active |
| POST `/api/chatbot/module/:courseId/message` | Assistant IA module (configuré par prof, utilisé étudiant) | chatbotController | ✅ Active (ModuleAssistant) |
| POST `/api/support` (createTicket) | Créer ticket support | supportController | ✅ Active |
| GET `/api/support/mine` | Mes tickets | getMyTickets | ✅ Active |

### 1.20 — Fonctionnalités communes mais peu pertinentes pour le prof
| Endpoint | Pertinence prof |
|---|---|
| `/api/decks/*`, `/api/decks/:deckId/cards/*` (flashcards) | Pas d'API de création prof — auto-générées par auto-prep IA + côté étudiant. Le prof n'a pas de page "créer un deck". |
| `/api/tutor/*` | Réservé étudiant (`router.use(requireRole('etudiant'))` dans tutorRoutes.js:17) |
| `/api/journey/*` (CAI parcours étudiant) | Réservé étudiant |
| `/api/streak`, `/api/levels/*`, `/api/quests*` (gamification F11A) | Lecture pour tous mais sans intérêt prof |
| `/api/leaderboard`, `/api/battle/*` (Quiz Battle) | Pas pour prof |
| `/api/rewards` | Catalogue tous, claim étudiant only |

---

## Phase 2 — Pages frontend dédiées au prof

### Pages 100% prof (route protégée `roles=['professeur', 'admin']`)
Source : [frontend/src/App.jsx](fliplearn/frontend/src/App.jsx) lignes 195-218.

#### 1. ProfessorDashboard.jsx → `/professor/dashboard` et `/professor/dashboard/:courseId`
**Titre affiché** : "Synthèse de classe" (ou "Tableau de bord professeur" pendant le chargement)
**Dans sidebar** : ✅ Oui ("Tableau de bord")
**Fichier** : [frontend/src/pages/ProfessorDashboard.jsx](fliplearn/frontend/src/pages/ProfessorDashboard.jsx)
**Actions principales** :
- Voir bandeau d'alertes globales (cours <50% complétion) — banner repliable
- Voir TeacherInsightsWidget (insights IA pédagogiques)
- Sélectionner un module (dropdown)
- Stats globales : étudiants inscrits, complétion capsules moy., réussite QCM moy., capsules publiées
- Suivi par capsule : taux de complétion, watchedPercent moyen, lien vers Questions in-video
- Analyse QCM : graphes BarChart par question, détection questions faibles (<50%)
- Bouton "Parcours pédagogique" (LearningPathBuilder)
- Bouton "Ajouter une capsule" (ProfessorUpload)
- Liens vers tracking individuel

#### 2. ProfessorTracking.jsx → `/professor/tracking` et `/professor/tracking/:courseId`
**Titre affiché** : "Suivi individuel par étudiant"
**Dans sidebar** : ✅ Oui ("Suivi étudiants")
**Fichier** : [frontend/src/pages/ProfessorTracking.jsx](fliplearn/frontend/src/pages/ProfessorTracking.jsx)
**Actions principales** :
- Sélectionner un module (dropdown)
- Voir liste des étudiants avec progression vidéos + QCM
- Recherche/filtre par nom/email
- Envoyer rappel ciblé à 1 étudiant (modale, target: video/qcm/course/specific resource)
- Envoyer rappel groupé "tous les en retard" (target=course)
- Envoyer feedback texte à un étudiant (POST /api/feedback)
- Ouvrir Suggestion IA personnalisée (StudentSuggestionModal)
- Lien vers chat 1-to-1

#### 3. ProfessorUpload.jsx → `/professor/courses/:courseId/upload`
**Titre affiché** : "Ajouter une capsule"
**Dans sidebar** : ❌ (accessible via boutons "Ajouter capsule" sur StudentCourse / CoursesPage / ProfessorDashboard)
**Fichier** : [frontend/src/pages/ProfessorUpload.jsx](fliplearn/frontend/src/pages/ProfessorUpload.jsx)
**Actions** :
- Mode "Fichier" : upload vidéo (drag & drop, max 100 MB Cloudinary, progress bar)
- Mode "YouTube" : URL + métadonnées
- Champs : titre, description, order, duration

#### 4. LearningPathBuilder.jsx → `/professor/courses/:courseId/path-builder`
**Titre affiché** : Dans `<Layout>` (parcours pédagogique)
**Dans sidebar** : ❌ (boutons "Parcours pédagogique" sur Dashboard / CoursesPage / StudentCourse)
**Fichier** : [frontend/src/pages/LearningPathBuilder.jsx](fliplearn/frontend/src/pages/LearningPathBuilder.jsx)
**Actions** :
- Charger parcours existant (ou créer brouillon)
- Drag & drop natif HTML5 pour réordonner
- Ajouter étape (modale PathBuilderAddStep) — capsule, QCM, prosit, lecture
- Éditer étape, supprimer
- Sauvegarder (PUT)
- Publier (POST /publish — passage `publishedAt`)
- Toggle "free mode" (vue libre vs guidé)

#### 5. AutoPrepReview.jsx → `/professor/courses/:courseId/videos/:videoId/auto-prep`
**Titre affiché** : Page de revue IA
**Dans sidebar** : ❌ (bouton "✨ IA" sur chaque ligne capsule de StudentCourse)
**Fichier** : [frontend/src/pages/AutoPrepReview.jsx](fliplearn/frontend/src/pages/AutoPrepReview.jsx)
**Actions** :
- Lance/poll un job d'auto-prep IA (toutes les 3s, max 5min)
- 5 sections collapsibles : Questions in-video, QCM, Outcomes, Suggestion Prosit, Flashcards
- Toggle keep/reject par item
- Bouton "Publier" : crée tout ce qui est gardé en DB d'un coup

#### 6. ProfessorCreateQCM.jsx → `/professor/videos/:videoId/qcm` et `/professor/qcm/create`
**Titre affiché** : Création / édition QCM capsule
**Dans sidebar** : ❌ (sur ProfessorQCMHub + bouton "Générer avec IA")
**Fichier** : [frontend/src/pages/ProfessorCreateQCM.jsx](fliplearn/frontend/src/pages/ProfessorCreateQCM.jsx)
**Actions** :
- Créer QCM (titre, description, questions A/B/C/D)
- Question type single OR multiple
- Bouton "Générer via IA" (Groq, soumis quota)
- Édition / suppression questions
- Aperçu

#### 7. ProfessorVideoQuestions.jsx → `/professor/videos/:videoId/questions`
**Titre affiché** : Éditeur des questions in-video (style EdPuzzle)
**Dans sidebar** : ❌ (bouton "Questions" sur dashboard et StudentCourse)
**Fichier** : [frontend/src/pages/ProfessorVideoQuestions.jsx](fliplearn/frontend/src/pages/ProfessorVideoQuestions.jsx)
**Actions** :
- Player vidéo + liste des points de contrôle (timestamp)
- Créer/éditer question à un timestamp donné
- Toggle pauseVideo
- Voir stats par question

#### 8. ProfessorQCMHub.jsx → `/professor/qcm`
**Titre affiché** : "Gérer les QCM"
**Dans sidebar** : ✅ Oui ("Gérer les QCM")
**Fichier** : [frontend/src/pages/ProfessorQCMHub.jsx](fliplearn/frontend/src/pages/ProfessorQCMHub.jsx)
**Actions** :
- Hub : arborescence cours → capsules → QCM existants
- Bouton "Générer avec IA" (raccourci vers ProfessorCreateQCM)
- Créer / éditer / supprimer QCM par capsule

#### 9. BadgeManagement.jsx → `/professor/badges`
**Titre affiché** : "Gestion des badges"
**Dans sidebar** : ✅ Oui ("Gérer les badges")
**Fichier** : [frontend/src/pages/BadgeManagement.jsx](fliplearn/frontend/src/pages/BadgeManagement.jsx)
**Actions** :
- Voir catalogue badges
- Créer badge custom (nom, description, icône, couleur, rareté, condition)
- ⚠️ **Section "Attribuer un badge à un étudiant"** : appelle `/admin/users` qui est admin-only → la liste reste vide pour un prof, le bouton "Attribuer" devient inutile

#### 10. ProjectCreate.jsx → `/professor/projects/create`
**Titre affiché** : Création projet
**Dans sidebar** : ❌ (bouton "Nouveau projet" sur ProjectList)
**Fichier** : [frontend/src/pages/ProjectCreate.jsx](fliplearn/frontend/src/pages/ProjectCreate.jsx)
**Actions** :
- Toggle type (mono / groupe / pfe)
- Champs : titre, description, énoncé, mots-clés, cours rattaché(s), dates, phases pré-remplies
- Bouton "Pré-remplir depuis template" (sessionStorage depuis ProjectTemplateLibrary)
- Lien optionnel vers Cas Pratique évalué (refonte 2026-05)

#### 11. ProjectTemplateLibrary.jsx → `/professor/templates`
**Titre affiché** : Bibliothèque de templates projets
**Dans sidebar** : ❌ (accédée depuis bouton "Bibliothèque de templates" dans ProjectCreate)
**Fichier** : [frontend/src/pages/ProjectTemplateLibrary.jsx](fliplearn/frontend/src/pages/ProjectTemplateLibrary.jsx)
**Actions** :
- Liste templates (officiels + IA)
- Filtres : filière, type, niveau, source
- Modale "Générer template via IA" (Groq)
- Cloner un template → ProjectCreate pré-rempli

#### 12. CasPratiqueCreate.jsx → `/cas-pratiques/new`
**Titre affiché** : Création cas pratique
**Dans sidebar** : ❌ (bouton "+ Nouveau" sur CasPratiqueList)
**Fichier** : [frontend/src/pages/CasPratiqueCreate.jsx](fliplearn/frontend/src/pages/CasPratiqueCreate.jsx)
**Actions** :
- Champs : titre, description, contexte, problématique, cours, chapitres
- Ressources : PDF / Lien / Article
- Calendrier : phaseCadrageDate, phaseBilanDate
- Composition de groupe : sélection étudiants éligibles + rôles (animateur/scribe/membre)

#### 13. ScopedQCMCreate.jsx → `/professor/chapter/:chapterId/qcm` et `/professor/module/:courseId/qcm-final`
**Titre affiché** : Création QCM chapitre / QCM final module
**Dans sidebar** : ❌ (bouton sur StudentCourse "Créer / éditer le QCM final")
**Fichier** : [frontend/src/pages/ScopedQCMCreate.jsx](fliplearn/frontend/src/pages/ScopedQCMCreate.jsx)
**Actions** :
- Variante de ProfessorCreateQCM mais avec scope=chapter ou module (pas de génération IA actuellement)

### Pages communes utilisées par le prof avec actions spécifiques

#### 14. CoursesPage.jsx → `/courses`
**Dans sidebar** : ✅ Oui ("Mes cours")
**Fichier** : [frontend/src/pages/CoursesPage.jsx](fliplearn/frontend/src/pages/CoursesPage.jsx)
**Actions prof spécifiques** :
- Bouton "Créer un nouveau module" (modale POST /api/courses)
- Sur chaque CourseCard : Parcours, Ajouter capsule, Statistiques, Ressources

#### 15. StudentCourse.jsx → `/courses/:courseId`
**Dans sidebar** : ❌ (cliquer sur une CourseCard)
**Fichier** : [frontend/src/pages/StudentCourse.jsx](fliplearn/frontend/src/pages/StudentCourse.jsx)
**Actions prof spécifiques** :
- Boutons header : Parcours pédagogique, Ajouter capsule, Ressources, Notes CC
- Bandeau "QCM final de module" : Créer / éditer
- Sur chaque ligne capsule : ✨ IA (auto-prep), QCM, Questions, Parts (microlearning), Edit, Delete
- Bouton "Configurer le parcours" si pas de path
- Toggle "free mode" si parcours existe
- Section ChaptersView : créer/renommer chapitres, déplacer vidéos entre chapitres

#### 16. CourseGrades.jsx → `/courses/:id/grades`
**Dans sidebar** : ❌ (bouton "Notes CC" sur StudentCourse)
**Fichier** : [frontend/src/pages/CourseGrades.jsx](fliplearn/frontend/src/pages/CourseGrades.jsx)
**Actions** :
- Tableau notes par étudiant
- Toggle "QCM compte dans la note"
- Sliders pondérations (qcm/prosit/project/validation, total = 100)
- Export CSV

#### 17. VideoPartsEditor.jsx → `/professor/videos/:id/parts`
**Dans sidebar** : ❌ (bouton "Parts" sur StudentCourse)
**Fichier** : [frontend/src/pages/VideoPartsEditor.jsx](fliplearn/frontend/src/pages/VideoPartsEditor.jsx)
**Actions** :
- Découper capsule en sections (microlearning)
- Pour chaque section : titre, startTime, endTime, QCM associé, feedback texte
> ⚠️ **Anomalie** : la route `/professor/videos/:id/parts` est définie dans App.jsx au sein du bloc **commun authentifié** (ligne 154), pas dans le bloc prof+admin. Côté backend `PUT /api/videos/:id` exige bien `requireRole('professeur', 'admin')`, donc un étudiant qui clique sur l'URL accède à la page mais ne peut rien sauvegarder (réponse 403).

#### 18. ResourceLibrary.jsx → `/courses/:courseId/resources`
**Dans sidebar** : ❌ (bouton "Ressources" sur StudentCourse / CourseCard)
**Fichier** : [frontend/src/pages/ResourceLibrary.jsx](fliplearn/frontend/src/pages/ResourceLibrary.jsx)
**Actions prof** :
- Upload PDF/PPTX/DOCX/ZIP (max via Cloudinary raw)
- Supprimer ressource

#### 19. ResourcesHub.jsx → `/resources`
**Dans sidebar** : ❌ (étudiant uniquement dans la nav par défaut, mais accessible prof via URL — `commun authentifié`)
**Fichier** : [frontend/src/pages/ResourcesHub.jsx](fliplearn/frontend/src/pages/ResourcesHub.jsx) — [À vérifier l'usage prof]

#### 20. ProjectList.jsx → `/projects`
**Dans sidebar** : ✅ Oui ("Projets")
**Fichier** : [frontend/src/pages/ProjectList.jsx](fliplearn/frontend/src/pages/ProjectList.jsx)
**Actions prof spécifiques** :
- Bouton "Créer un projet" → ProjectCreate

#### 21. ProjectDetail.jsx → `/projects/:projectId`
**Dans sidebar** : ❌ (clic sur ProjectCard)
**Fichier** : [frontend/src/pages/ProjectDetail.jsx](fliplearn/frontend/src/pages/ProjectDetail.jsx)
**Actions prof spécifiques** (variable `isProfOrAdmin`) :
- Header : "Créer les groupes" (random ou manuel), "Modifier", "Évaluations", "Supprimer"
- Cliquer sur cercle phase → cycle a_faire / en_cours / termine (handlePhaseStatusChange)
- IdeasPanel : ajouter/supprimer idées
- PhaseChecklist : ajouter/supprimer items checklist
- Forum : pin/announce posts
- LivrableFeedbackBlock : feedback texte par livrable
- ProjectPeerReviewPanel : assign peer reviewers + voir summary

#### 22. CasPratiqueList.jsx → `/cas-pratiques`
**Dans sidebar** : ✅ Oui ("Cas pratiques")
**Fichier** : [frontend/src/pages/CasPratiqueList.jsx](fliplearn/frontend/src/pages/CasPratiqueList.jsx)
**Actions prof spécifiques** :
- Bouton "+ Nouveau" → CasPratiqueCreate
- Filtres par statut

#### 23. CasPratiqueDetail.jsx → `/cas-pratiques/:id`
**Dans sidebar** : ❌ (clic sur card)
**Fichier** : [frontend/src/pages/CasPratiqueDetail.jsx](fliplearn/frontend/src/pages/CasPratiqueDetail.jsx)
**Actions prof spécifiques** :
- Voir livrables des étudiants
- Démarrer phase Bilan (POST /phase-bilan)
- Évaluer le groupe
- Consulter rapport IA intégrité

#### 24. ModuleAssistant.jsx → `/courses/:courseId/assistant`
**Dans sidebar** : ❌ (bouton sur StudentCourse / dashboard)
**Fichier** : [frontend/src/pages/ModuleAssistant.jsx](fliplearn/frontend/src/pages/ModuleAssistant.jsx)
**Actions prof spécifiques** :
- Configurer persona IA (PUT /api/courses/:id/ai-persona) : nom, spécialité, avatar emoji, ton (pédagogue/strict/fun/expert), description, couleur
- Tester le bot avec ses questions

### Pages communes purement informationnelles (pas d'action prof)

#### 25-29 : Settings.jsx, StudentProfile.jsx, ChatContacts.jsx, ChatPage.jsx, NotificationsPage.jsx
- Mon profil (édition infos, changement password, avatar)
- Settings (préférences UI, dark mode)
- Chat 1-to-1 + room cours
- Notifications

#### 30-31 : Support.jsx, CesiMethodGuide.jsx, WatchVideo.jsx, ChapterPractice.jsx
- Support : créer un ticket
- Method guide : doc CAI/CESI
- WatchVideo et ChapterPractice : surtout pour les étudiants ; un prof y va pour visionner ce qu'il a publié

### Pages prof désactivées / fantômes
- **CourseLearningOutcomes.jsx** : fichier existe (page d'édition outcomes Bloom + contrat pédagogique), route commentée dans App.jsx:202, bouton retiré de CoursesPage et StudentCourse. Backend `PUT /api/courses/:id/outcomes` reste branché. → ❌ Désactivée intentionnellement.
- **TeacherCoursesSubNav.jsx** : composant retourne `null`. Plus utilisé (Layout.jsx l. 271-278 commenté). → ❌ Désactivée.
- **PrositCreate.jsx / PrositList.jsx** : fichiers existent et imports App.jsx présents, mais sidebar pointe vers `/cas-pratiques` et `/prosits/new` redirige vers `/cas-pratiques/new`. PrositList et PrositDetail restent accessibles si on tape `/prosits/:id` directement → legacy, à archiver. → ⚠️ Cachées (legacy).

---

## Phase 3 — Actions concrètes du prof, par domaine fonctionnel

### Domaine MODULES (Course)
| Action | Page | Endpoint | Statut |
|---|---|---|---|
| Lister mes modules | CoursesPage | GET /api/courses | ✅ Active |
| Créer un module (modale) | CoursesPage | POST /api/courses | ✅ Active |
| Voir détail d'un module | StudentCourse | GET /api/courses/:id | ✅ Active |
| Éditer titre/desc/filiere/promotion | — | PUT /api/courses/:id | ⚠️ Cachée (admin only via AdminDashboard) |
| Supprimer un module | — | DELETE /api/courses/:id | ⚠️ Cachée (admin only) |
| Configurer persona IA du module | ModuleAssistant | PUT /api/courses/:id/ai-persona | ✅ Active |
| Définir contrat pédagogique | — | PUT /api/courses/:id/outcomes | ❌ Désactivée (page CourseLearningOutcomes commentée) |
| Définir learning outcomes Bloom | — | PUT /api/courses/:id/outcomes | ❌ Désactivée |
| Voir insights pédagogiques classe | ProfessorDashboard | GET /api/courses/:id/insights | ✅ Active |
| Voir suggestion IA par étudiant | ProfessorTracking | GET /api/courses/:id/insights/student/:userId | ✅ Active |
| Voir étudiants ayant validé module | — | GET /api/courses/:id/completions | ⚠️ Cachée |
| Voir tableau des notes CC | CourseGrades | GET /api/courses/:id/grades | ✅ Active |
| Configurer pondérations notes | CourseGrades | PUT /api/courses/:id/grade-settings | ✅ Active |
| Toggle "QCM compte dans note" | CourseGrades | PUT /api/courses/:id/grade-settings | ✅ Active |
| Export CSV des notes | CourseGrades | (client-side) | ✅ Active |
| Définir nextClassDate | — | — | ❌ Pas implémenté (mémoire MEMORY action P0 C1 listée comme à faire) |

### Domaine CHAPITRES (Chapter)
| Action | Page | Endpoint | Statut |
|---|---|---|---|
| Lister chapitres d'un cours | StudentCourse (ChaptersView) | GET /api/courses/:courseId/chapters | ✅ Active |
| Créer un chapitre | ChaptersView (composant) | POST /api/courses/:courseId/chapters | ✅ Active |
| Renommer un chapitre | ChaptersView | PUT /api/chapters/:id | ✅ Active |
| Supprimer un chapitre | ChaptersView | DELETE /api/chapters/:id | ✅ Active |
| Rattacher une vidéo à un chapitre | ChaptersView | POST /api/chapters/:id/assign-video | ✅ Active |

### Domaine CAPSULES (Video)
| Action | Page | Endpoint | Statut |
|---|---|---|---|
| Uploader une capsule (fichier ≤100Mo) | ProfessorUpload (mode file) | POST /api/videos/upload | ✅ Active |
| Ajouter une vidéo YouTube | ProfessorUpload (mode youtube) | POST /api/videos/youtube | ✅ Active |
| Voir liste capsules d'un cours | StudentCourse | GET /api/videos/course/:courseId | ✅ Active |
| Modifier titre/desc/order/chapitres timestamps | StudentCourse (modale Edit) | PUT /api/videos/:id | ✅ Active |
| Supprimer une capsule | StudentCourse | DELETE /api/videos/:id | ✅ Active |
| Découper en parts (microlearning) | VideoPartsEditor | PUT /api/videos/:id (parts[]) | ✅ Active (route App.jsx mal placée — voir anomalie ligne 154) |
| Voir stats vidéo (viewers, avg %) | — | GET /api/videos/:id/stats | ⚠️ Cachée (existe en backend) |
| Lancer analyse IA (Whisper transcript) | WatchVideo | POST /api/videos/:id/analyze | ✅ Active |
| Supprimer analyse IA (relancer) | — | DELETE /api/videos/:id/analysis | ⚠️ Cachée |

### Domaine QCM
| Action | Page | Endpoint | Statut |
|---|---|---|---|
| Lister QCM par cours/capsule | ProfessorQCMHub | GET /api/qcm/video/:videoId | ✅ Active |
| Créer QCM de capsule (manuel) | ProfessorCreateQCM | POST /api/qcm/create (scope=video) | ✅ Active |
| Créer QCM de chapitre | ScopedQCMCreate | POST /api/qcm/create (scope=chapter) | ✅ Active |
| Créer QCM final de module | ScopedQCMCreate | POST /api/qcm/create (scope=module) | ✅ Active |
| Générer QCM capsule via IA (Groq, quota 5/mois) | ProfessorCreateQCM (bouton ✨) | POST /api/qcm/generate-ai | ✅ Active |
| Générer QCM chapitre/module via IA | — | — | ❌ Pas implémenté (générateur IA limité à scope=video) |
| Modifier QCM | ProfessorCreateQCM / ScopedQCMCreate | PUT /api/qcm/:id | ✅ Active |
| Supprimer QCM | ProfessorQCMHub | DELETE /api/qcm/:id | ✅ Active |
| Voir stats QCM (questions faibles) | ProfessorDashboard | GET /api/qcm/:id/stats | ✅ Active |
| Ajouter questions in-video (EdPuzzle-like) | ProfessorVideoQuestions | POST /api/video-questions | ✅ Active |
| Modifier question in-video | ProfessorVideoQuestions | PUT /api/video-questions/:id | ✅ Active |
| Supprimer question in-video | ProfessorVideoQuestions | DELETE /api/video-questions/:id | ✅ Active |
| Voir stats par question in-video | ProfessorVideoQuestions | GET /api/video-questions/:id/stats | ✅ Active |

### Domaine PARCOURS PÉDAGOGIQUE (LearningPath)
| Action | Page | Endpoint | Statut |
|---|---|---|---|
| Créer parcours | LearningPathBuilder | POST /api/learning-paths | ✅ Active |
| Réordonner étapes (drag & drop) | LearningPathBuilder | PUT /api/learning-paths/:id | ✅ Active |
| Ajouter capsule/QCM/Prosit/lecture | LearningPathBuilder (modal) | PUT /api/learning-paths/:id | ✅ Active |
| Supprimer parcours | LearningPathBuilder | DELETE /api/learning-paths/:id | ✅ Active |
| Publier le parcours | LearningPathBuilder | POST /api/learning-paths/:id/publish | ✅ Active |
| Toggle "free mode" (vue libre) | StudentCourse / LearningPathTimeline | (param query `?free=true`) | ✅ Active |

### Domaine AUTO-PRÉPARATION IA
| Action | Page | Endpoint | Statut |
|---|---|---|---|
| Lancer auto-prep d'une capsule | StudentCourse (bouton ✨ IA) → AutoPrepReview | POST /api/courses/:cid/videos/:vid/auto-prep | ✅ Active |
| Voir résultats du dernier job d'une capsule | — | GET /api/.../auto-prep/latest | ⚠️ Cachée |
| Polling job en cours | AutoPrepReview | GET /api/auto-prep-jobs/:jobId | ✅ Active |
| Publier sélections (questions, QCM, outcomes, prosit, flashcards) | AutoPrepReview | POST /api/auto-prep-jobs/:jobId/publish | ✅ Active |

### Domaine CAS PRATIQUES (refonte 2026-05)
| Action | Page | Endpoint | Statut |
|---|---|---|---|
| Lister cas pratiques | CasPratiqueList | GET /api/cas-pratiques | ✅ Active |
| Créer cas pratique (problématique + ressources + groupe + dates) | CasPratiqueCreate | POST /api/cas-pratiques | ✅ Active |
| Voir étudiants éligibles | CasPratiqueCreate | GET /api/cas-pratiques/:id/eligible-students | ✅ Active |
| Composer le groupe + rôles | CasPratiqueCreate | POST /api/cas-pratiques/:id/group | ✅ Active |
| Suggérer rotation des rôles | — | POST /api/cas-pratiques/:id/role-rotation/suggest | ⚠️ Cachée [À vérifier UI] |
| Modifier cas pratique | CasPratiqueDetail / CasPratiqueCreate | PUT /api/cas-pratiques/:id | ✅ Active |
| Supprimer cas pratique | CasPratiqueDetail | DELETE /api/cas-pratiques/:id | ✅ Active |
| Voir livrables étudiants | CasPratiqueDetail | GET /api/cas-pratiques/:id/livrables | ✅ Active |
| Démarrer phase Bilan | CasPratiqueDetail | POST /api/cas-pratiques/:id/phase-bilan | ✅ Active |
| Évaluer le groupe | CasPratiqueDetail | POST /api/cas-pratiques/:id/evaluate | ✅ Active |
| Voir rapport IA d'intégrité | CasPratiqueDetail | GET /api/cas-pratiques/:id/ai-report | ✅ Active |

### Domaine PROSITS (legacy CESI)
> Toutes ces actions sont **fonctionnelles côté backend** mais l'entrée principale a été redirigée vers Cas Pratiques le 2026-05-09. À considérer comme code mort à archiver (ou supprimer).
| Action | Page | Endpoint | Statut |
|---|---|---|---|
| Créer Prosit (Aller/Recherche/Retour) | PrositCreate (route absente d'App.jsx mais fichier existe) | POST /api/prosits | ⚠️ Cachée (legacy) |
| Lister Prosits | PrositList | GET /api/prosits | ⚠️ Cachée |
| Voir détail Prosit | PrositDetail | GET /api/prosits/:id | ⚠️ Cachée |
| Groupes auto / manuels | PrositDetail | POST /api/prosits/:id/groupes/auto et /manual | ⚠️ Cachée |
| Transition de phase | PrositDetail | POST /api/prosits/:id/transition | ⚠️ Cachée |
| Évaluer groupe | PrositDetail | PUT /api/prosits/:id/groupes/:gIdx/evaluation | ⚠️ Cachée |
| Voir peer-assessment summary | — | GET /api/prosits/:id/peer-assessments/summary | ⚠️ Cachée |
| Étendre deadline peer-assessment | — | PUT /api/prosits/:id/peer-assessments/deadline | ⚠️ Cachée |
| Rapport IA intégrité Prosit | — | GET /api/prosits/:id/ai-report | ⚠️ Cachée |

### Domaine PROJETS (PBL)
| Action | Page | Endpoint | Statut |
|---|---|---|---|
| Lister projets | ProjectList | GET /api/projects | ✅ Active |
| Créer projet (mono / groupe / pfe) | ProjectCreate | POST /api/projects | ✅ Active |
| Pré-remplir depuis template | ProjectCreate ← ProjectTemplateLibrary | (sessionStorage) | ✅ Active |
| Modifier projet (titre/status/desc) | ProjectDetail | PUT /api/projects/:id | ✅ Active |
| Supprimer projet | ProjectDetail | DELETE /api/projects/:id | ✅ Active |
| Créer groupes random | ProjectDetail | POST /api/projects/:id/groupes/random | ✅ Active |
| Créer groupes manuels | ProjectDetail | POST /api/projects/:id/groupes | ✅ Active |
| Changer statut d'une phase (clic cercle) | ProjectDetail (timeline) | PUT /api/projects/:id/phases/:phaseId | ✅ Active |
| Ajouter item checklist | ProjectDetail (PhaseChecklist) | POST /.../phases/:phaseId/checklist | ✅ Active |
| Supprimer item checklist | ProjectDetail | DELETE /.../checklist/:itemId | ✅ Active |
| Ajouter idée / suggestion | ProjectDetail (IdeasPanel) | POST /api/projects/:id/ideas | ✅ Active |
| Supprimer idée | ProjectDetail | DELETE /.../ideas/:ideaId | ✅ Active |
| Donner feedback sur livrable étudiant | ProjectDetail (LivrableFeedbackBlock) | POST /.../livrables/:lid/feedback | ✅ Active |
| Définir grille d'évaluation (rubric) | — | PUT /api/projects/:id/rubric | ⚠️ [À vérifier UI prof] (existe en backend ; rubric arrive surtout via templates) |
| Voir évaluations entre pairs | ProjectDetail | GET /api/projects/:id/evaluations | ✅ Active |
| Pin / annoncer un thread forum | ProjectDetail (ProjectForum) | PATCH /api/projects/:id/threads/:tid | ✅ Active |
| Auto-pairer peer-reviewers | ProjectDetail (ProjectPeerReviewPanel) | POST /.../peer-reviews/assign | ✅ Active |
| Voir summary peer-reviews | ProjectDetail | GET /.../peer-reviews/summary | ✅ Active |

### Domaine TEMPLATES PROJETS (F10)
| Action | Page | Endpoint | Statut |
|---|---|---|---|
| Bibliothèque templates | ProjectTemplateLibrary | GET /api/project-templates | ✅ Active |
| Filtrer par filière/type/niveau/source | ProjectTemplateLibrary | (client-side) | ✅ Active |
| Générer template via IA Groq | ProjectTemplateLibrary | POST /api/project-templates/generate | ✅ Active |
| Cloner / utiliser template | ProjectTemplateLibrary | POST /:id/use → ProjectCreate | ✅ Active |

### Domaine SUIVI ÉTUDIANTS
| Action | Page | Endpoint | Statut |
|---|---|---|---|
| Voir alertes globales (cours <50%) | ProfessorDashboard (banner) | GET /api/tracking/alerts | ✅ Active |
| Voir liste cours du prof avec % progression | ProfessorTracking | GET /api/tracking/my-courses | ✅ Active |
| Voir progression détaillée par étudiant | ProfessorTracking | GET /api/tracking/course/:courseId | ✅ Active |
| Voir ClassReadiness ("qui est prêt pour le cours") | ProfessorDashboard (résumé Prêts/Partiel/Non prêts par capsule) | dashboard data | ✅ Active |
| Voir Top blocages (questions <50% réussite) | ProfessorDashboard (BarChart QCM) | GET /api/qcm/:id/stats agrégé | ✅ Active |
| Envoyer un rappel ciblé à 1 étudiant | ProfessorTracking (modal) | POST /api/tracking/course/:cid/remind (1 ID) | ✅ Active |
| Envoyer un rappel groupé "tous en retard" | ProfessorTracking | POST /api/tracking/course/:cid/remind (N IDs, target=course) | ✅ Active |
| Suggestion IA personnalisée par étudiant | ProfessorTracking (StudentSuggestionModal) | GET /api/courses/:id/insights/student/:userId | ✅ Active |
| Briefings IA pré-cours / TeacherInsights | ProfessorDashboard (TeacherInsightsWidget) | GET /api/courses/:id/insights | ✅ Active |

### Domaine FEEDBACK
| Action | Page | Endpoint | Statut |
|---|---|---|---|
| Envoyer feedback ciblé prof → étudiant (texte) | ProfessorTracking (modale "Retour") | POST /api/feedback | ✅ Active |
| L'étudiant lit son feedback | (côté étudiant Dashboard) | GET /api/feedback/mine | ✅ Active |

### Domaine RESSOURCES PÉDAGOGIQUES (PDF/PPTX/...)
| Action | Page | Endpoint | Statut |
|---|---|---|---|
| Uploader ressource vers un cours | ResourceLibrary | POST /api/resources/upload | ✅ Active |
| Liste ressources d'un cours | ResourceLibrary | GET /api/resources/course/:cid | ✅ Active |
| Hub global des ressources accessibles | ResourcesHub | GET /api/resources/all | ✅ Active |
| Supprimer ressource | ResourceLibrary | DELETE /api/resources/:id | ✅ Active |

### Domaine FLASHCARDS
| Action | Page | Endpoint | Statut |
|---|---|---|---|
| Le prof peut-il créer des decks ? | — | — | ❌ Non — pas de page de création prof. Côté étudiant : Decks.jsx (génération auto par capsule). Auto-prep IA peut créer flashcards mais ce sont des cartes que les étudiants importent dans leurs decks. |
| Auto-génération flashcards via auto-prep IA | AutoPrepReview (section Flashcards) | POST /api/auto-prep-jobs/:jobId/publish | ✅ Active (publication crée des cartes liées à la vidéo) |

### Domaine COMMUNICATION
| Action | Page | Endpoint | Statut |
|---|---|---|---|
| Chat 1-to-1 avec étudiant | ChatPage roomType=private | GET/POST /api/messages | ✅ Active |
| Chat de groupe par cours | ChatPage roomType=course | GET/POST /api/messages (rooms `course-:courseId`) | ✅ Active |
| Liste contacts | ChatContacts | GET /api/messages/contacts | ✅ Active |
| Supprimer un message envoyé | ChatBox | DELETE /api/messages/:id | ✅ Active |
| Envoyer un message groupé hors-chat | — | — | ❌ Pas implémenté (contournement : rappel groupé `tracking/remind`) |
| Recevoir notifications temps réel | Topbar (Layout) | Socket.io + GET /api/notifications | ✅ Active |
| Configurer assistant IA module | ModuleAssistant | PUT /api/courses/:id/ai-persona | ✅ Active |
| Tester l'assistant IA module | ModuleAssistant | POST /api/chatbot/module/:cid/message | ✅ Active |

### Domaine GAMIFICATION
| Action | Page | Endpoint | Statut |
|---|---|---|---|
| Voir catalogue badges | BadgeManagement | GET /api/badges | ✅ Active |
| Créer badge custom | BadgeManagement | POST /api/badges | ✅ Active |
| Attribuer un badge à un étudiant | BadgeManagement (section Award) | POST /api/badges/award | ⚠️ **Bug fonctionnel** : la liste étudiants vient de `/admin/users` (admin only) → pour un prof, dropdown vide |
| Configurer système XP | — | — | ⚠️ Cachée (ServerXP/levels figés en config, pas d'éditeur prof) |
| Voir le classement | — | — | ❌ Non accessible prof (Leaderboard route est `roles=['etudiant']`) |
| Configurer/voir Quêtes hebdo | — | — | ❌ Non accessible prof |
| Voir Tableau d'honneur cours | — | HonorBoard component | ⚠️ Affiché étudiant only sur StudentCourse |

### Domaine IA (vue d'ensemble)
| Action | Page | Endpoint | Statut |
|---|---|---|---|
| Configurer aiPersona du module | ModuleAssistant | PUT /api/courses/:id/ai-persona | ✅ Active |
| Insights pédagogiques classe (IA) | ProfessorDashboard | GET /api/courses/:id/insights | ✅ Active |
| Suggestion IA par étudiant | ProfessorTracking | GET /api/courses/:id/insights/student/:userId | ✅ Active |
| Auto-préparation capsule (Whisper + GPT-4o + Groq) | AutoPrepReview | /api/courses/.../auto-prep | ✅ Active |
| Génération QCM IA capsule | ProfessorCreateQCM | POST /api/qcm/generate-ai | ✅ Active |
| Génération template projet IA | ProjectTemplateLibrary | POST /api/project-templates/generate | ✅ Active |
| Aide IA Cas Pratique / Projet | CasPratiqueDetail / ProjectDetail | POST /:id/ai-help | ✅ Active |
| Rapport IA intégrité (détection plagiat livrables) | CasPratiqueDetail / PrositDetail | GET /:id/ai-report | ✅ Active (Cas) / ⚠️ Cachée (Prosit legacy) |
| Tuteur IA personnel | — | /api/tutor/* | ❌ Étudiant only par middleware |

### Domaine SUPPORT / DIVERS
| Action | Page | Endpoint | Statut |
|---|---|---|---|
| Créer un ticket support | Support | POST /api/support | ✅ Active |
| Voir mes tickets | Support | GET /api/support/mine | ✅ Active |
| Discuter sur un ticket | Support | POST /api/support/:id/message | ✅ Active |
| Lire/personnaliser CesiMethodGuide | CesiMethodGuide | (statique) | ✅ Active |
| Préférences UI / dark mode | Settings | (front local) | ✅ Active |
| Voir XP breakdown personnel | StudentProfile | GET /api/users/me/xp-breakdown | ⚠️ Cachée pour prof (plus utile étudiant) |

---

## Phase 4 — Synthèse pour Assil

### A) Fonctionnalités prof ACTIVES (visibles dans la sidebar / UI principale)
1. **Tableau de bord** (synthèse de classe) — alertes, insights IA, stats globales, suivi capsules, analyse QCM
2. **Suivi étudiants** (tracking individuel) — progression, rappels ciblés/groupés, feedback texte, suggestion IA
3. **Mes cours** — lister + créer module, accès aux sous-actions par cours
4. **Cas pratiques** — lister + créer + composer groupe + évaluer
5. **Projets** — lister + créer (mono/groupe/pfe) + groupes + checklist + idées + feedback livrables + peer review + grille
6. **Gérer les QCM** — hub par cours/capsule + édition + génération IA
7. **Gérer les badges** — créer badge custom (attribuer = bug)
8. **Messages** — chat 1-to-1 + chat de cours
9. **Mon profil** + **Aide & Support** + **Paramètres** — communs
10. **Notifications** (Topbar)
11. *(via dashboard)* **Auto-préparation IA d'une capsule**
12. *(via StudentCourse)* Upload capsule, Path Builder, Notes CC, QCM final, Questions in-video, Découpe parts, Edit/Delete capsule, Ressources
13. *(via ModuleAssistant)* Configuration assistant IA du module
14. *(via ProjectCreate)* Bibliothèque de templates projets

### B) Fonctionnalités prof CACHÉES (existent en code mais pas dans l'UI principale)
| Feature | Chemin | Verdict |
|---|---|---|
| Lister étudiants ayant validé un module | backend GET /api/courses/:id/completions, pas d'UI | RÉACTIVER (intéressant pour une page "Validation finale" prof) ou SUPPRIMER si redondant avec tracking |
| Stats vidéo individuelles | GET /api/videos/:id/stats | RÉACTIVER (déjà côté backend, ajouter sur ligne capsule) ou SUPPRIMER |
| `getLatestForVideo` auto-prep | GET /api/.../auto-prep/latest | GARDER (utile pour ré-ouvrir un job sans relancer un nouveau coût IA) — ajouter petit lien "Reprendre dernière analyse IA" |
| Supprimer une analyse vidéo | DELETE /api/videos/:id/analysis | GARDER pour plus tard (utile pour fixer une mauvaise transcription) |
| Suggérer rotation des rôles cas pratique | POST /api/cas-pratiques/:id/role-rotation/suggest | RÉACTIVER (vraie valeur pédagogique : éviter qu'un étudiant fasse toujours "scribe") |
| Définir/éditer rubric projet | PUT /api/projects/:id/rubric | RÉACTIVER (la rubric est affichée mais on ne peut pas l'éditer sans passer par un template) |
| Configurer XP / système gamification | — | SUPPRIMER (figé en config et c'est très bien comme ça pour le PFE) |
| Édition complète du module (titre, filiere, promotion) | PUT /api/courses/:id | RÉACTIVER (un prof devrait pouvoir corriger une typo sans passer par admin) |
| Module Prosit legacy entier | PrositList, PrositDetail, PrositCreate + 11 endpoints | SUPPRIMER (refonte 2026-05 a remplacé par Cas Pratiques. Garder peut induire des bugs et de la confusion) |
| Page CourseLearningOutcomes (objectifs Bloom + contrat pédagogique) | Fichier existe, route commentée | SUPPRIMER (la décision a déjà été prise, finir le ménage : retirer le fichier + l'import lazy commenté) |
| `TeacherCoursesSubNav` qui retourne null | components/TeacherCoursesSubNav.jsx | SUPPRIMER (composant fantôme) |

### C) Fonctionnalités prof DÉSACTIVÉES (commentées intentionnellement)
| Feature | Chemin | Raison documentée |
|---|---|---|
| Route `/professor/courses/:cid/outcomes` | App.jsx:202 (commentée) | "n'apportait pas de valeur en pratique" |
| Bouton "Objectifs Bloom" sur CoursesPage et StudentCourse | CoursesPage:80, StudentCourse:375 (commentés) | Idem |
| Sous-menu Bloom dans sidebar | Layout.jsx:271-278 (commenté) | Idem |
| `TeacherCoursesSubNav` returns null | TeacherCoursesSubNav.jsx | Composant gardé pour ne pas casser les imports |

### D) Statistiques globales
- **Pages prof dédiées (route prof+admin)** : **13** (ProfessorDashboard, ProfessorTracking, ProfessorUpload, LearningPathBuilder, AutoPrepReview, ProfessorCreateQCM, ProfessorVideoQuestions, ProfessorQCMHub, BadgeManagement, ProjectCreate, ProjectTemplateLibrary, CasPratiqueCreate, ScopedQCMCreate)
- **Pages communes avec actions prof** : **12** (CoursesPage, StudentCourse, CourseGrades, VideoPartsEditor, ResourceLibrary, ResourcesHub, ProjectList, ProjectDetail, CasPratiqueList, CasPratiqueDetail, ModuleAssistant, ChatContacts, ChatPage, NotificationsPage, Settings, StudentProfile, Support…)
- **Pages désactivées** : **2** (CourseLearningOutcomes.jsx, TeacherCoursesSubNav.jsx)
- **Pages prof legacy** : **3** (PrositList, PrositDetail, PrositCreate — toujours dans App.jsx mais hors sidebar)
- **Endpoints API protégés prof+admin** : ~**80** identifiés (counts approximatif sur les 13 fichiers de routes scannés)
- **Fonctionnalités actives** : ~**45** (cf. Phase 3)
- **Fonctionnalités cachées** : ~**18** (la majorité côté Prosit legacy)
- **Fonctionnalités désactivées intentionnellement** : ~**3** (outcomes Bloom + sous-nav + composant null)

### E) Recommandations prioritaires (avis senior dev)

#### 3 fonctionnalités à SIMPLIFIER (trop complexes / peu utilisées)
1. **BadgeManagement.jsx** — la page mélange 3 sections (catalogue, création, attribution) ; la partie "Attribuer un badge" est cassée pour le prof car elle dépend de `/admin/users`. → Simplifier en réduisant à "création de badges custom". L'attribution automatique se fait déjà via les hooks (cours validé → badge "module-completed"), donc l'attribution manuelle n'a pas grand intérêt pour la démo. Ou alors fixer le bug et router vers `/professor/courses` pour récupérer la liste étudiants.
2. **ProfessorQCMHub** + **ProfessorCreateQCM** + **ScopedQCMCreate** — il y a 3 pages distinctes pour créer des QCM (capsule, chapitre, module). Elles dupliquent une grosse partie du code. → Unifier en une seule page paramétrée par scope (déjà 80% fait dans ScopedQCMCreate, finir le merge). Bonus : appliquer la génération IA au scope `chapter` et `module` aussi.
3. **AutoPrepReview** — 5 sections (questions, QCM, outcomes, prosit, flashcards) c'est beaucoup, et "outcomes" est désactivé en pratique → réduire à 4 sections (drop outcomes), ce qui rend la page plus lisible et cohérent avec la décision de désactiver les learning outcomes.

#### 3 fonctionnalités à VALORISER en démo (bien faites, à mettre en avant)
1. **ProfessorDashboard "Synthèse de classe"** — visuellement propre, banner d'alertes, BarChart questions faibles, code couleur Prêts/Partiel/Non prêts. C'est la "preuve classe inversée" la plus convaincante du projet.
2. **AutoPrepReview** (auto-préparation IA d'une capsule) — Whisper transcript + GPT-4o → questions in-video + QCM + flashcards en 1 clic. Démontre la maîtrise technique et l'apport IA. **Faire la démo en live**.
3. **ProfessorTracking + Feedback ciblé + Suggestion IA par étudiant** — flow complet : "j'identifie un étudiant en difficulté → je vois pourquoi (suggestion IA) → je lui envoie un rappel + un feedback texte". C'est exactement ce que la mémoire vise (encadrement adaptatif personnalisé, cf. project_ia_vision.md).

#### 3 fonctionnalités CACHÉES à SUPPRIMER ou RÉACTIVER
1. **SUPPRIMER tout le module Prosit legacy** — 11 endpoints + 3 pages. La refonte est faite (Cas Pratiques), l'ancien code crée juste de la confusion (deux tableaux d'évaluation, deux flows de groupes). Risque pour soutenance : un examinateur tape `/prosits/anything` et trouve une page mal câblée.
2. **SUPPRIMER CourseLearningOutcomes.jsx + TeacherCoursesSubNav.jsx + import lazy commenté** — le ménage est à moitié fait, finir.
3. **RÉACTIVER l'édition simple du module** (titre/filiere/promotion) côté prof — actuellement il faut être admin pour corriger une typo, c'est absurde. Ajouter un bouton "Modifier" dans la modale de création (qui passe en mode édition).

#### 3 fonctionnalités MANQUANTES qui auraient du sens pour la classe inversée
1. **`nextClassDate` côté prof** — déjà identifié comme P0 dans MEMORY (audit_09052026.md). Permettrait au dashboard de dire "Prochain cours dans 3 jours, 12 étudiants pas prêts". Sans ça, le suivi est statique.
2. **Vue "Préparation présentiel"** — un onglet du Dashboard qui affiche, pour la prochaine séance, les capsules concernées et la liste des étudiants pas prêts → un bouton "Rappel groupé". Ça existe à moitié dans tracking, mais c'est éclaté.
3. **Édition d'un Cas Pratique en cours** — actuellement on peut créer/supprimer/évaluer mais l'édition après création semble limitée (à confirmer en testant). Le prof devrait pouvoir ajouter des ressources ou changer la deadline du Bilan sans tout recommencer.

---

## Annexe — Anomalies détectées pendant l'audit

1. **Route `/professor/videos/:id/parts` mal placée** dans App.jsx:154 (bloc commun authentifié) au lieu du bloc prof+admin. La route répond donc 200 à un étudiant, mais le PUT échoue en 403. Cosmétique, à fixer.
2. **`BadgeManagement` charge `/admin/users`** en l. 52, qui est admin-only. Pour un prof, la dropdown étudiants reste vide. Soit on remplace l'endpoint par `/professor/courses` agrégé, soit on retire la section attribution.
3. **Route `/professor/courses/:courseId/outcomes` commentée** mais le composant lazy aussi commenté (l. 65). Cohérent. À nettoyer définitivement.
4. **Doublon Cas Pratiques / Prosits** : les deux flows coexistent en backend, et `/prosits/:id` reste accessible si on tape l'URL. La sidebar ne pointe que sur `/cas-pratiques` mais c'est une mine de bugs potentiels en démo.
5. **Pas de page `/professor/courses/:cid/edit`** — cohérent avec le fait que seul l'admin peut PUT /courses/:id, mais bizarre côté ergonomie.
6. **`/api/users/me/ai-quota`** existe mais aucune page Settings ou profil prof n'affiche le quota IA mensuel restant.

---

*Fin de l'audit. Prêt pour décisions Marcel.*
