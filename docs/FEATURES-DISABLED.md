# 🔌 Features désactivées sur la branche `mvp-soutenance`

**Branche** : `mvp-soutenance` (créée depuis le commit `8468492` post-F7).
**Objectif** : MVP défendable pour soutenance PFE L3 ISIL — 5 features stars + un socle classe inversée propre.

> **Aucun fichier n'a été supprimé.** Tout le code reste comme code mort, prêt à réactivation post-PFE. Les imports, lignes JSX/UI et routes Express sont **commentées** avec le marqueur `// DÉSACTIVÉ pour PFE L3 — perspective d'évolution`.
>
> Les **services backend restent intacts** (`aiPlagiarismDetector.js`, `teacherInsights.js`, `autoFlashcards.js`, `projectCoach.js`) — ils servent de **matériau de mémoire** pour démontrer l'extensibilité de l'architecture.

---

## Vue d'ensemble

| Feature | Statut | Pourquoi désactivée |
|---|---|---|
| F2 — Détection plagiat IA | ❌ désactivée | Sujet sensible juridiquement, risque de faux positifs sans validation empirique |
| F3 — Insights pédagogiques IA | ❌ désactivée | Demande des données réelles d'usage pour être pertinent — non disponibles à l'échelle PFE |
| F5 — Demande à la vidéo (RAG) | ❌ désactivée | Le tuteur IA personnel (F4) couvre déjà le besoin de Q&A étudiant |
| F6 — Auto-flashcards SM-2 | ❌ désactivée | Système Decks classique (création manuelle) suffit pour la démo MVP |
| F7 — Coach IA Prosit/Projet | ❌ désactivée | Le tuteur IA personnel (F4) reste la voie d'aide unique, plus simple à défendre |

### Features GARDÉES (MVP)

- ✅ **F1** — Auto-prépa cours en 1 clic (auto-prep IA prof)
- ✅ **F4** — Tuteur IA personnel + assistant module
- ✅ **Classe inversée socle** — Cours / Vidéos / QCM / Progress
- ✅ **Prosit & Project** — méthodologies pédagogiques (sans coach IA)
- ✅ **Decks/Cards classiques** — révision manuelle SM-2
- ✅ **Gamification basique** — XP, badges, leaderboard, Quiz Battle
- ✅ **Chat & notifications** — Socket.io, emails

---

## F2 — Détection plagiat IA

### Pourquoi désactivée
Pour un PFE L3 sans validation empirique formelle (corpus étudiant test), les heuristiques de détection IA peuvent produire des **faux positifs** susceptibles d'accuser injustement un étudiant. Le risque pédagogique et juridique excède la valeur démontrable à la soutenance.

### Comment réactiver
| Fichier | Ligne(s) | Action |
|---|---|---|
| `frontend/src/pages/PrositDetail.jsx` | ~12 | Décommenter `import PrositAiReport from '../components/PrositAiReport.jsx';` |
| `frontend/src/pages/PrositDetail.jsx` | ~299-308 | Décommenter le bloc JSX `<details>` "Intégrité IA" |
| `backend/controllers/prositController.js` | ~505-535 | Décommenter le `setImmediate(async () => { detectAIGenerated... })` |
| `backend/routes/prositRoutes.js` | ~60 | Décommenter `router.get('/:id/ai-report', requireRole('professeur', 'admin'), getAiReport);` |

### Code de référence préservé
- `backend/services/aiPlagiarismDetector.js` (heuristiques + appel Groq)
- `frontend/src/components/PrositAiReport.jsx` (UI rapport)

---

## F3 — Insights pédagogiques IA

### Pourquoi désactivée
Le widget génère des "insights actionables" via Groq à partir des métriques de cours (taux de décrochage, QCM ratés, étudiants à risque). Sans **données réelles d'usage à l'échelle de la cohorte**, les insights produits sur le seed de démo sont peu crédibles. Le prof voit toujours les alertes simples (étudiants en risque) basées sur les Progress.

### Comment réactiver
| Fichier | Ligne(s) | Action |
|---|---|---|
| `frontend/src/pages/ProfessorDashboard.jsx` | ~5 | Décommenter `import TeacherInsightsWidget from '../components/TeacherInsightsWidget.jsx';` |
| `frontend/src/pages/ProfessorDashboard.jsx` | ~371-372 | Décommenter `<TeacherInsightsWidget courseId={courseId} />` |
| `backend/routes/courseRoutes.js` | ~26-28 | Décommenter `router.get('/:id/insights'...)` et `router.get('/:id/insights/student/:userId'...)` |

### Code de référence préservé
- `backend/services/teacherInsights.js` (calcul métriques + prompt Groq)
- `backend/controllers/courseController.js` → `getCourseInsights`, `getStudentSuggestion`
- `frontend/src/components/TeacherInsightsWidget.jsx`
- `frontend/src/components/StudentSuggestionModal.jsx`

---

## F5 — Demande à la vidéo (RAG sur transcript)

### Pourquoi désactivée
Le tuteur IA personnel F4 (page `/my-tutor`) couvre déjà le besoin de questions/réponses contextualisées. F5 ajoutait un panneau RAG dédié à chaque vidéo avec citation timestamp, mais cela complique le scénario démo et duplique la valeur ajoutée. Réactivable post-PFE quand l'expérience UX a été validée auprès des utilisateurs.

### Comment réactiver
| Fichier | Ligne(s) | Action |
|---|---|---|
| `frontend/src/pages/WatchVideo.jsx` | ~9 | Décommenter `import AskVideoPanel from '../components/AskVideoPanel.jsx';` |
| `frontend/src/pages/WatchVideo.jsx` | ~42 | **Re-créer la state** : `const [askOpen, setAskOpen] = useState(false);` (supprimée au cleanup audit étudiant) |
| `frontend/src/pages/WatchVideo.jsx` | ~126-145 | Décommenter le bloc bouton "💬 Demande à la vidéo" |
| `frontend/src/pages/WatchVideo.jsx` | ~287-295 | Décommenter le `<AskVideoPanel />` |
| `backend/routes/tutorRoutes.js` | ~20-21 | Décommenter `router.post('/ask-video', postAskVideo);` et `router.get('/ask-video/quota', getAskVideoQuota);` |

### Code de référence préservé
- `backend/controllers/tutorController.js` → `postAskVideo`, `getAskVideoQuota`
- `backend/services/personalTutor.js` → `askAboutVideo` (RAG transcript)
- `frontend/src/components/AskVideoPanel.jsx`

---

## F6 — Auto-flashcards depuis vidéos vues (SM-2)

### Pourquoi désactivée
Le système Decks classique (création manuelle de flashcards par l'étudiant) est plus simple à présenter et à défendre. La génération automatique post-vidéo introduit une dépendance quota Groq supplémentaire et un cron hebdomadaire qui complique la démo. Le concept SM-2 (Wozniak 1990) reste démontrable via le système Decks manuel.

### Comment réactiver
| Fichier | Ligne(s) | Action |
|---|---|---|
| `frontend/src/pages/Decks.jsx` | ~138-143 | Décommenter `useEffect(() => { fetchAutoStatus(); }, []);` (et retirer le no-op) |
| `frontend/src/pages/Decks.jsx` | ~218-318 | Décommenter le bloc JSX "Tes decks de révision auto-générés" |
| `frontend/src/pages/Decks.jsx` | ~360-362 | Restaurer `const auto = isAutoDeck(deck);` (au lieu de `const auto = false;`) |
| `frontend/src/pages/Dashboard.jsx` | ~12 | **Restaurer l'import** : ajouter `Layers` dans la liste `lucide-react` (supprimé au cleanup audit étudiant) |
| `frontend/src/pages/Dashboard.jsx` | ~211 | **Re-créer la state** : `const [dueCards, setDueCards] = useState(null);` (supprimée au cleanup audit étudiant) |
| `frontend/src/pages/Dashboard.jsx` | ~226-232 | **Re-créer le `useEffect`** qui fetch `/decks/due-today` (supprimé au cleanup audit étudiant — voir historique git) |
| `frontend/src/pages/Dashboard.jsx` | ~381-424 | Décommenter le widget "🃏 cards due today" |
| `backend/routes/deckRoutes.js` | ~32-35 | Décommenter les 3 routes `/auto-generate`, `/auto-status`, `/due-today` |
| `backend/services/notificationScheduler.js` | ~420-424 | Décommenter le cron `'0 9 * * 0'` runWeeklyAutoFlashcardsRegen |
| `backend/controllers/videoController.js` | ~284-310 | Décommenter le hook fire-and-forget `generateForVideo` post-completion |

### Code de référence préservé
- `backend/services/autoFlashcards.js` (génération + dédup hash + cron helper)
- `backend/controllers/autoFlashcardsController.js` (3 endpoints)
- Toute l'extension `Card.js` (champs `source`, `sourceVideo`, `frontHash`) reste en DB sans impact

---

## F7 — Coach IA anti-blocage Prosit/Projet

### Pourquoi désactivée
Le tuteur IA personnel F4 reste l'unique voie d'aide IA pour l'étudiant. F7 ajoutait un encart contextuel sur PrositDetail/ProjectDetail avec 4 actions IA + un cron 18h proactif. Cela complique le scénario démo et duplique la valeur ajoutée du tuteur. La méthodologie pédagogique (CESI/APP, PBL) reste intacte.

### Comment réactiver
| Fichier | Ligne(s) | Action |
|---|---|---|
| `frontend/src/pages/PrositDetail.jsx` | ~14 | Décommenter `import CoachAIPanel from '../components/CoachAIPanel.jsx';` |
| `frontend/src/pages/PrositDetail.jsx` | ~388-391 | Décommenter le bloc `<CoachAIPanel kind="prosit" .../>` |
| `frontend/src/pages/ProjectDetail.jsx` | ~7 | Décommenter `import CoachAIPanel from '../components/CoachAIPanel.jsx';` |
| `frontend/src/pages/ProjectDetail.jsx` | ~623-626 | Décommenter le bloc `<CoachAIPanel kind="project" .../>` |
| `backend/routes/prositRoutes.js` | ~66-72 | Décommenter les 4 routes `/:id/coach/*` Prosit |
| `backend/routes/projectRoutes.js` | ~64-69 | Décommenter les 4 routes `/:id/coach/*` Project |
| `backend/services/notificationScheduler.js` | ~426-429 | Décommenter le cron `'0 18 * * *'` runDailyCoachProactiveNotifications |

### Code de référence préservé
- `backend/services/projectCoach.js` (~490 lignes — détection blockage + 4 actions IA)
- `backend/controllers/coachController.js` (8 handlers)
- `frontend/src/components/CoachAIPanel.jsx` (~390 lignes — UI complète)

---

## Pour le mémoire

Ce fichier est la **preuve écrite** que le projet a une architecture extensible. Le chapitre "Perspectives d'évolution" peut s'appuyer dessus pour démontrer :

1. **L'architecture sait isoler les features** : on peut désactiver 5 features en commentant ~30 endroits, sans casser le reste.
2. **Les services métier sont découplés** : 4 services (`aiPlagiarismDetector`, `teacherInsights`, `autoFlashcards`, `projectCoach`) restent en place comme code mort prêt à réactivation.
3. **La décision MVP est justifiée et tracée** : chaque désactivation a une raison technique ou pédagogique documentée.

---

## Branches Git

| Branche | État features | Usage |
|---|---|---|
| `main` | Toutes (15/15 si on inclut F8-F11) | Référence complète, dossier mémoire |
| `sprint-final` | Toutes | Branche de développement active |
| `mvp-soutenance` | **MVP réduit** (F2, F3, F5, F6, F7 désactivées) | **Démo soutenance** |
| `backup-30-avril-complete` | Snapshot avant désactivation | Restauration si besoin |

---

## Voir aussi

- [`features-mvp.md`](features-mvp.md) — Les 5 features stars du MVP
- [`features-extensions.md`](features-extensions.md) — Description complète des extensions (sur main)
- [`technical-decisions.md`](technical-decisions.md) — ADR justifiant l'architecture
