# 🧭 Décisions techniques — Architecture Decision Records (ADR)

Format inspiré de **Michael Nygard (2011)**. Chaque ADR documente une décision structurante, son **contexte**, les **alternatives écartées**, et les **conséquences** assumées.

> Un ADR n'est jamais "neutre" : c'est un trade-off explicite. Le jury doit comprendre que chaque choix a été pesé, et pas pris par défaut.

---

## ADR-001 — Stack JavaScript unifiée (React + Node)

**Statut** : ACCEPTED

**Contexte**
Pour un PFE solo en 6 mois, le coût d'apprentissage de 2 langages distincts (ex: React + Django, ou Vue + Spring) est prohibitif. Maintenir un seul langage de bout en bout réduit la friction.

**Décision**
- **Frontend** : React 18 + Vite 5 + Tailwind CSS
- **Backend** : Node.js 22 + Express 4 + Mongoose 8

**Alternatives écartées**
- *Next.js full-stack* : trop opiniâtre sur le routing serveur, courbe d'apprentissage qui ralentirait le sprint final.
- *Laravel + Vue* : excellente DX mais 2 langages, et hosting PHP plus coûteux que Render free tier.
- *Django + React* : robuste académiquement mais Python en prod sur Render free tier dort plus longtemps.

**Conséquences**
- ✅ Une seule chaîne de typage / linting (ESLint).
- ✅ Réutilisation possible de logique entre client et serveur (mais peu utilisée ici).
- ⚠️ Express demande de coder le boilerplate auth, validation, rate-limit (vs Laravel/Django où c'est livré). Mitigé par l'usage de helmet, hpp, express-mongo-sanitize.

---

## ADR-002 — MongoDB plutôt que PostgreSQL

**Statut** : ACCEPTED

**Contexte**
FlipLearn manipule des entités à structure hétérogène : un Prosit a 5 phases verrouillées et des sub-docs (groupes/membres/peer-assessments), un Course a des chapitres, des outcomes Bloom embarqués, des suggestions. Modéliser ça en SQL nécessite ~15 tables avec FK + JOINs.

**Décision**
**MongoDB Atlas** (cluster M0 free tier) avec Mongoose 8 pour le typage.

**Alternatives écartées**
- *PostgreSQL* : plus cohérent pour un projet académique stricte (norme universitaire), mais cost cognitif élevé pour modéliser les sub-docs (JSONB ou tables enfants).
- *MySQL* : pas de gestion JSON aussi élégante que Postgres.
- *Firebase Firestore* : trop opinionated, lock-in fournisseur, pas auto-hostable.

**Conséquences**
- ✅ Modélisation directe des structures imbriquées (Prosit.groupes[].membres[].peerAssessments[]) sans tables join.
- ✅ Schéma flexible : ajouter un champ ne casse pas les anciens docs.
- ✅ Atlas M0 free tier suffisant (cluster 512 MB, ~17 MB utilisés au sprint final).
- ⚠️ Pas de transactions multi-document par défaut (ACID limité à un doc). Mitigé par l'usage d'**index unique composé** pour empêcher les doublons (ex: WeeklyQuest, ProjectPeerReview).
- ⚠️ Le jury peut challenger : "et la cohérence des FK ?" → réponse : Mongoose `populate()` + validation runtime, refs explicites.

---

## ADR-003 — Sub-documents vs collections séparées

**Statut** : ACCEPTED

**Contexte**
Pour un Project, on doit modéliser les threads de forum (potentiellement 50+) et les peer-reviews (potentiellement 20+). L'embedding dans `Project` ferait gonfler le doc rapidement (limite Mongoose 16 MB).

**Décision**
- **Embedded** : phases (≤10), groupes (≤8), livrables (≤30), rubric (≤8). Petite taille, lecture toujours nécessaire avec le parent.
- **Collection séparée** : `ProjectThread`, `ProjectPeerReview`, `Notification`, `Message`. Volumétrie potentiellement élevée + pagination + index propres requis.

**Conséquences**
- ✅ Document Project reste sous 1 MB même sur projets PFE matures.
- ✅ Pagination native Mongo (`skip` + `limit`) sur les threads.
- ⚠️ Plus de queries séparées pour reconstruire la vue UI (mitigé par `populate` ou aggregate $lookup).

---

## ADR-004 — Groq Llama-3.3 plutôt que OpenAI GPT-4

**Statut** : ACCEPTED

**Contexte**
FlipLearn appelle l'IA pour 7 features distinctes (auto-prépa, plagiat, insights, tuteur, coach, flashcards, quêtes). Sur un PFE étudiant, le **coût** doit être nul ou minimal.

**Décision**
- **Groq** (`llama-3.3-70b-versatile`) pour 95% des appels IA → **gratuit dans le quota free tier** (large), latence ~2s.
- **OpenAI** uniquement pour la **transcription Whisper** (la qualité Groq Whisper-Large-v3 sur le français algérien était inférieure dans nos tests) → ~3 vidéos/mois en quota mensuel `videoAnalysis`.

**Alternatives écartées**
- *OpenAI GPT-4o partout* : ~10$/mois pour les volumes prévus, hors budget PFE.
- *Anthropic Claude* : excellent mais payant dès la 1re requête.
- *Local Llama via Ollama* : aurait nécessité un serveur GPU, infaisable sur Render.

**Conséquences**
- ✅ Coût $0 en démo et en early prod.
- ⚠️ Dépendance Groq : si l'API tombe, 7 features cassent. Mitigé par **fallback heuristique** dans `questGenerator.js`, `aiPlagiarismDetector.js`, `autoFlashcards.js`.
- ⚠️ Llama-3.3 a parfois des hallucinations. Mitigé par `response_format: json_object` + validation Mongoose + sanitisation des champs.

---

## ADR-005 — Anti-hallucination dans les prompts IA

**Statut** : ACCEPTED

**Contexte**
LLM produit régulièrement des **références bibliographiques inventées** (URL fausses, ISBN fictifs, dates incorrectes). Sur un projet pédagogique, c'est catastrophique : un étudiant cite un article qui n'existe pas.

**Décision**
Pour `suggestSources` (Coach IA F7) et `generateTemplate` (F10), **interdiction explicite des URLs** dans les prompts système :

```
RÈGLES STRICTES :
- AUCUN URL inventé : pas de http://... dans la réponse.
- Mentionne titre + auteur(s) + année + raison de pertinence (1 phrase).
```

Le LLM retourne **titre + auteur + année** seulement. À l'étudiant de chercher sur Google Scholar.

**Conséquences**
- ✅ Pas de fausses citations dans la bibliographie.
- ⚠️ Friction UX : l'étudiant doit chercher la source (mais c'est aussi pédagogique).

---

## ADR-006 — Authentification JWT + refresh cookie httpOnly

**Statut** : ACCEPTED

**Contexte**
SPA React → backend Express. L'auth doit survivre aux refresh page (sessionStorage) et permettre un logout côté serveur.

**Décision**
- **Access JWT** : signé HS256 avec `JWT_SECRET`, expire 15 min, stocké dans `sessionStorage` côté client.
- **Refresh token** : random 32 bytes, stocké en cookie `fliplearn_refresh` httpOnly + secure + SameSite=Lax, expire 15 jours.
- Endpoint `POST /api/auth/refresh` régénère un access JWT à partir du refresh cookie.

**Alternatives écartées**
- *Sessions Express avec MongoStore* : cumul du JWT + sessions = complexité inutile.
- *Auth0 / Firebase Auth* : lock-in fournisseur, surdimensionné pour un PFE.
- *Tout en localStorage* : vulnérable XSS pour le refresh.

**Conséquences**
- ✅ XSS ne vole pas le refresh (httpOnly).
- ✅ CSRF mitigé par CORS allowlist + SameSite cookie.
- ⚠️ Logout serveur = invalidation cookie côté client. Pas de blacklist JWT (acceptable car expire 15 min).

---

## ADR-007 — Rate limiting + quotas IA mensuels (FREE) vs illimité (Premium)

**Statut** : ACCEPTED

**Contexte**
Les agents IA coûtent en tokens Groq (gratuit mais quota partagé) et en temps backend. Un user malveillant pourrait spammer `/decks/generate-ai` 100×/min et faire dropper Groq.

**Décision**
2 couches de défense :
1. **Rate limit Express** (HTTP 429) :
   - `/api/*` : 300 req / 15 min
   - `/api/auth/login` + `register` : 10 / 15 min
   - `/api/chatbot/*` + `/api/qcm/generate-ai` : 30 / heure
2. **Quotas IA mensuels** (HTTP 429 avec `upgrade: true`) stockés dans `User.aiUsage[feature]`, reset 1er du mois UTC :
   - `videoAnalysis` (Whisper) : 3 / mois
   - `qcmGeneration` : 5 / mois
   - `deckGeneration` : 5 / mois
3. **Bypass Premium** : si `User.plan === 'premium'` ET `premiumUntil > now`, quota ignoré.

**Conséquences**
- ✅ Rotation Groq protégée.
- ✅ Modèle freemium démontrable (avec récompense Premium).
- ⚠️ `moduleBot` et endpoints coach IA F7 sont **illimités** : décision pédagogique (Groq gratuit → pas de raison de limiter le tutorat).

---

## ADR-008 — Tests smoke uniquement (pas E2E ni intégration complète)

**Statut** : ACCEPTED

**Contexte**
PFE solo en 6 mois → impossible d'écrire 80% de coverage. Il faut choisir où l'effort de test rapporte le plus.

**Décision**
**Tests smoke** sur les fonctions pures critiques :
- `computeFrontHash` (dédup flashcards) — 5 tests
- `computePairings` (auto-pairing peer-review) — 7 tests
- `getCurrentLevel`, `daysDiff`, `getWeekStart` (gamification) — 13 tests
- `getPhasesTemplate`, `getRubricTemplate` (templates F8) — 11 tests
- `getProjectTemplate` seed (F10) — 10 tests
- `detectBlockage` (Coach IA F7) — 6 tests

Total : **~52 tests** Jest (`backend/__tests__/*.test.js`), tous passants.

**Alternatives écartées**
- *Tests E2E Playwright* : trop coûteux à maintenir pour un PFE solo (UI change souvent).
- *Tests d'intégration supertest* : nécessitent une DB de test (`mongodb-memory-server`), setup lourd.
- *Coverage > 80%* : irréaliste sur ce volume de code.

**Conséquences**
- ✅ Bugs subtils détectés (ex: `String(null)` truthy dans `computePairings`, fixé immédiatement).
- ✅ Confiance pour les refactors.
- ⚠️ Pas de garantie d'intégration end-to-end. Mitigé par **tests manuels** réguliers en preview.

---

## ADR-009 — Render free tier + UptimeRobot

**Statut** : ACCEPTED

**Contexte**
Render free tier endort le serveur après 15 min d'inactivité → cold start 30-60 s qui casserait la démo soutenance.

**Décision**
- Endpoint `GET /api/health` ultra-léger (no DB, no auth) : `{status, uptime, timestamp}`.
- **UptimeRobot** (free) configuré pour ping `/api/health` toutes les 5 min → serveur reste chaud H24.

**Alternatives écartées**
- *Self-ping setInterval* : risqué (Render peut détecter et bannir).
- *Upgrade Starter $7/mois* : évité pendant le PFE.
- *Migration vers Railway / Fly.io* : trop tard, coût de migration > coût UptimeRobot.

**Conséquences**
- ✅ Démo soutenance fluide (pas de cold start).
- ✅ Crons (8h, 9h dim, 18h, 6h lun) tournent fiablement.
- ⚠️ Quota MongoDB Atlas connections augmenté (chaque ping ouvre éventuellement une connexion). OK avec M0.

---

## ADR-010 — Privacy by design sur la détection plagiat IA

**Statut** : ACCEPTED

**Contexte**
F2 stocke un rapport d'analyse plagiat IA pour chaque contribution Prosit. Si ce rapport contient le texte intégral de l'étudiant, il est dupliqué (déjà dans `Prosit.groupes[].membres[].contributionTexte`) et constitue un **risque RGPD** (collecte excessive).

**Décision**
Dans `Prosit.groupes[].membres[].aiDetection`, on stocke uniquement :
- `aiProbability` (0-100)
- `flags` (labels patterns détectés)
- `reasons` (explications IA courtes)
- `textPreview` (200 caractères max)

Le **texte intégral n'est JAMAIS dupliqué dans le rapport**. Si le prof veut le voir, il consulte la contribution originale.

**Conséquences**
- ✅ Conformité RGPD : minimisation des données.
- ✅ Démontrable au jury comme "réflexe ingénieur" sur le projet.
- ⚠️ Si un audit est rejoué après suppression de la contribution, le rapport perd son contexte (acceptable).

---

## ADR-011 — Mémoire/notes en français, code et commits en anglais

**Statut** : ACCEPTED (par défaut)

**Contexte**
PFE algérien, soutenance en français. Mais l'écosystème dev utilise l'anglais (variables, commit messages, error logs).

**Décision**
- **Code et commits** : anglais (standard pro).
- **UI utilisateur** : français.
- **Documentation académique** (`docs/`, mémoire) : français.
- **Comments JSDoc** : français pour la pédagogie + références citées dans la langue d'origine.

**Conséquences**
- ✅ Repo lisible par recruteur international.
- ✅ Mémoire et soutenance accessibles au jury francophone.
- ⚠️ Mix anglais/français dans les models (ex: `User.prenom` en français car valeur en français). Cohérent et documenté.

---

## ADR-012 — Documentation auto via `doc_updater.py`

**Statut** : ACCEPTED

**Contexte**
Maintenir un journal des modifications + un tutoriel utilisateur à jour est chronophage et oublié.

**Décision**
Script `doc_updater.py` (à la racine du projet) qui prend un payload JSON décrivant une modification et :
1. Ajoute une entrée dans `Documentation_PFE.docx` (journal technique).
2. Met à jour `Tutoriel_FlipLearn.docx` (guide utilisateur) si le payload contient `tuto_update`.
3. Logue dans `historique_modifications.json`.

Appelé après chaque feature livrée. **54+ entrées** au sprint final.

**Conséquences**
- ✅ Mémoire enrichi automatiquement au fur et à mesure (chap. "Réalisation").
- ✅ Tutoriel utilisateur livrable directement.
- ⚠️ Format Word = pas de versionning Git fin → fichier opaque pour code review (acceptable, c'est un livrable de mémoire).

---

## Voir aussi

- [Architecture](architecture.md)
- [Modèle de données](data-model.md)
- [Stratégie de tests](testing-strategy.md)
