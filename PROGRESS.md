# 📊 Progression FlipLearn — Sprint Final

> Ce fichier est mis à jour automatiquement à la fin de chaque feature.
> Lis-le AVANT toute nouvelle session pour savoir où reprendre.

## État actuel

- **Branche active** : `sprint-final`
- **Dernière feature complétée** : **F5 — Demande à la vidéo (RAG)**
- **Dernier commit** : `e9718fc` — `feat(ai): ask-the-video — contextual Q&A with RAG on transcript, seek-to-timestamp citations (sprint-final/F5)`
- **Prochaine feature à faire** : **F6 — Auto-flashcards depuis cours suivis (SM-2)**
- **Date dernière session** : 2026-04-30

## Features complétées (par ordre)

- [x] **F1** — Auto-prépa cours en 1 clic — `4210d9a` + hotfix prefill `9d654fa`
- [x] **F2** — Détection plagiat IA — `16eec0d` + composer de groupes `110b0f9`
- [x] **F3** — Insights pédagogiques IA — `f7379c3`
- [x] **F4** — Tuteur IA personnel — `cc5d128`
- [x] **F5** — Demande à la vidéo — `e9718fc`
- [ ] F6 — Auto-flashcards
- [ ] F7 — Coach IA Prosit/Projet
- [ ] F8 — Projets multi-modules
- [ ] F9 — Forum + peer review
- [ ] F10 — Bibliothèque templates
- [ ] F11 — Gamification renforcée
- [ ] F12 — Onboarding wizard
- [ ] F13 — Nav simplifiée
- [ ] F14 — Polish global
- [ ] F15 — Seed démo + script

## Notes de session

### Session 2026-04-30 — F1 → F5 (5 features, 7 commits + merges)

**Fait** :
- F1 : agent IA d'auto-préparation de cours (5 appels Groq Llama-3.3 en parallèle via `Promise.allSettled`) → questions in-video + QCM + outcomes Bloom + suggestion Prosit + flashcards. Page `/professor/courses/:courseId/videos/:videoId/auto-prep` avec 5 sections collapsibles + footer sticky « Publier ». Quota 5 jobs/jour/prof. 6/6 tests smoke.
- **Hotfix F1** : `PrositCreate.jsx` lit `?prefill=...&courseId=...` et pré-remplit le formulaire (titre, description, énoncé, motsCles) + bannière violette « Brouillon pré-rempli par l'IA ».
- F2 : détection plagiat IA en 2 étages (heuristiques 13 patterns ChatGPT + sur-structuration + variabilité phrases + ratio adverbes en `-ment`, puis confirmation Groq si ≥35/100). Privacy by design : pas le texte intégral, juste un extrait 200 chars. Onglet « 🛡️ Rapport d'intégrité IA » sur PrositDetail (vue prof). Disclaimer étudiant sous le textarea de contribution. 8/8 tests.
- **Composer de groupes Prosit** : la fonctionnalité « Composer les groupes » était un alert placeholder `'à implémenter en V1.5'`. Implémentée en mode aléatoire (1 clic) + manuel (drag-style + assign roles CESI). Endpoint `GET /api/prosits/:id/eligible-students`.
- F3 : Insights pédagogiques IA (Hattie 2009 *Visible Learning*, Black & Wiliam 1998). Service `teacherInsights.js` calcule métriques brutes → Groq génère 3-5 insights `{type, title, description chiffrée, action concrète}`. Cache 1h. Fallback heuristique. Widget `TeacherInsightsWidget` en haut de ProfessorDashboard. `StudentSuggestionModal` ouvre sur bouton « ✨ IA » par étudiant dans ProfessorTracking. 5/5 tests.
- F4 : Tuteur IA personnel (Bandura 1977, Vygotsky 1978, Mazur 1997). `personalTutor.js` (~330 lignes) avec `buildStudentContext` + `chat` + `askAboutVideo` (RAG transcript) + `generateDailySuggestions`. Méthode socratique stricte (refuse de donner les réponses aux QCM). Page `/my-tutor` 2-colonnes + composant `TutorBubble.jsx` flottant en bas-droite sur toutes pages étudiant. Web Speech API (fr-FR) pour dictée vocale. Quota 30 messages/jour. 5/5 tests.
- F5 : Ask-the-video — endpoint `askAboutVideo` existait depuis F4 mais sans UI. Ajout du quota 5/(user, vidéo, jour) en mémoire + endpoint `GET /api/tutor/ask-video/quota?videoId=`. Composant `AskVideoPanel.jsx` (~355 lignes) panneau slide-in 350px à droite avec : compteur quota, 3 suggestions contextuelles seed depuis le timestamp courant, historique localStorage par videoId (max 20), badges 🎯 mm:ss cliquables qui seek la vidéo HTML5, alerte « Hors sujet » + lien vers `/my-tutor` si confidence < 50%. Bouton 💬 sous le player dans WatchVideo (étudiant uniquement).

**Bugs rencontrés** :
- F2 : la composition manuelle des groupes Prosit n'était pas implémentée (placeholder alert). Bloquait le test E2E de F2. Implémentée immédiatement avant de continuer.
- F1 : redirection vers `/prosits/new?prefill=...` arrivait bien mais le formulaire ne pré-remplissait pas. Hotfix dans le même sprint.
- Test F4 difficulty IA `0 || 3` retourne `3` (0 falsy en JS) → corrigé en `Number.isFinite(rawDiff) ? Math.round(rawDiff) : 3`.

**Décisions prises** :
- **Un prompt à la fois, test, commit, merge, prompt suivant** : on respecte les règles d'or du PLAN. F1 → confirme → F2 → confirme → … Pas de rafale.
- Tous les services Groq ont un **fallback heuristique** : si `GROQ_API_KEY` absente ou timeout, on retombe sur des règles. Robuste pour la démo.
- **Privacy plagiat IA** : on ne stocke JAMAIS le texte intégral dans le rapport, juste 200 chars + score + flags.
- **Quotas en mémoire** (Map JS) plutôt qu'en DB pour les compteurs journaliers : redémarrage Render = reset, mais c'est OK pour démo.
- Toutes les features mergées sur `main` au fur et à mesure → Render auto-deploie en continu.

**TODO pour la prochaine session** :
- **F6 — Auto-flashcards** (plan ligne ~362) : `backend/services/autoFlashcards.js` + endpoint `POST /api/decks/auto-generate` + cron dimanche pour regen hebdo + section "✨ Tes decks de révision auto-générés" sur Decks.jsx + widget dashboard "X cartes à réviser aujourd'hui" + toast quand vidéo complétée à 100%.
- Modèles déjà en place utiles : `Deck.js` (owner, title, cardCount), `Card.js` (deck ref, front, back, difficulty enum easy/medium/hard, nextReview, interval, easeFactor, repetitions). Le mapping difficulty IA 1-5 → enum est déjà dans `courseAutoPrep.js#publishResults`.
- Vérifier en prod que le tuteur F4 répond bien (Render endormi → premier appel lent) et que ask-video F5 trouve le transcript.

## Comment reprendre dans une nouvelle session

1. Lis ce fichier `PROGRESS.md`
2. Lis `PLAN-FLIPLEARN-PROMPTS-CLAUDE-CODE.md` pour les prompts complets de chaque feature
3. Vérifie l'état git :
   ```bash
   cd fliplearn
   git checkout sprint-final && git pull
   git status
   git log --oneline -5
   ```
4. Reprends à la prochaine feature listée dans **« Prochaine feature à faire »** ci-dessus
5. **À la fin de chaque feature**, METS À JOUR ce fichier :
   - Coche la feature dans la checklist
   - Mets à jour « Dernière feature complétée » + « Dernier commit » + « Prochaine feature à faire »
   - Ajoute une entrée « Notes de session » avec ce qui a été fait, les bugs, les décisions, les TODO
   - Commit ce fichier ensemble avec la feature concernée

## Workflow par feature (à suivre rigoureusement)

```
1. Lire le prompt FN dans PLAN-FLIPLEARN-PROMPTS-CLAUDE-CODE.md
2. Implémenter (backend service + controller + routes, puis frontend, puis tests)
3. Vérifier syntaxe : node --check (backend) + esbuild (frontend)
4. Tester en preview navigateur (preview_start frontend)
5. Lancer les tests smoke : npm test -- --testPathPattern=...
6. Doc auto : python doc_updater.py "{...}"
7. Commit sur sprint-final avec message du plan
8. Merge no-ff sur main + push (Render auto-deploy)
9. Mettre à jour PROGRESS.md + commit
10. Attendre validation utilisateur avant FN+1
```

## Comptes démo (seed-soutenance déjà appliqué)

| Rôle | Email | Mdp |
|------|-------|-----|
| Prof | `lebrun@fliplearn.dz` | `demo1234` |
| Étudiante MVP | `sara.demo@fliplearn.dz` | `demo1234` |
| Étudiant moyen | `lina.demo@fliplearn.dz` | `demo1234` |
| Étudiant en difficulté | `mehdi.demo@fliplearn.dz` | `demo1234` |
| 5 autres étudiants | `yanis/walid/rania/samir/imane.demo@…` | `demo1234` |

Reset de la scène : `cd fliplearn/backend && npm run seed:soutenance -- --reset`

## Ressources

- **Site live** : <https://fliplearn-5lsz.onrender.com>
- **Repo GitHub** : <https://github.com/smohamedassil-netizen/flipleran>
- **Branches** : `main` (prod) ↔ `sprint-final` (dev en cours)
- **Memoire deadline** : 2026-05-20 · **Soutenance** : 2026-06-15
