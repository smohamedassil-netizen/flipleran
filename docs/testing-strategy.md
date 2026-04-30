# 🧪 Stratégie de tests FlipLearn

**Ce document explique CE QUI est testé, CE QUI ne l'est pas, et POURQUOI.**

> Pour un PFE solo en 6 mois, on ne peut pas atteindre 80% de coverage. Il faut donc une **stratégie de tests ciblée** : tester ce qui casse silencieusement et défonce la prod, ne pas tester ce qui se voit immédiatement à l'œil nu en preview.

---

## Philosophie

Inspirée du **testing pyramid** (Cohn 2009) mais inversée pour la réalité d'un PFE solo :

```
              ▲           Pas de tests E2E (Playwright/Cypress)
         ┌────┴────┐      → testés manuellement en preview
         │   E2E   │
       ┌─┴─────────┴─┐
       │ Integration │    Pas de tests API supertest
     ┌─┴─────────────┴─┐  → coût setup mongodb-memory-server élevé
     │     Smoke       │  ← ICI : 52+ tests Jest sur fonctions pures
   ┌─┴─────────────────┴─┐
   │       Unit          │  Smoke remplace l'unitaire pur
   └─────────────────────┘
```

**Principe** : on teste **les fonctions pures critiques** qui ont une **logique métier non triviale**, pas le boilerplate Express/Mongoose.

---

## Ce qui est testé (52+ tests Jest)

| Fichier de test | Sujet | Nb tests | Type |
|---|---|---|---|
| `__tests__/autoFlashcards.test.js` | `computeFrontHash` (sha1 dédup) | 5 | Pure function |
| `__tests__/projectPeerReview.test.js` | `computePairings` (auto-pairing F9) | 7 | Pure function |
| `__tests__/gamification.test.js` | `getCurrentLevel`, `daysDiff`, `getWeekStart` | 13 | Pure function |
| `__tests__/projectTemplates.test.js` | Templates phases F8 (3/5/7) + rubric | 11 | Pure function |
| `__tests__/projectTemplatesSeed.test.js` | Seed 14 templates F10 (intégrité données) | 10 | Data validation |
| `__tests__/projectCoach.test.js` | `detectBlockage` Prosit/Project | 6 | Pure logic + ESM mock |
| **Total** | | **52** | |

### Pourquoi ces tests précisément ?

#### 1. Algorithmes critiques qui casseraient silencieusement
- **`computeFrontHash`** : si le hash dérive (collisions, non-déterminisme), le cron hebdo crée des doublons à chaque run. Test catché par invariant : déterminisme + normalisation espaces/casse.
- **`computePairings`** : algo critique du peer-review F9. Test a chopé un bug `String(null)` truthy en JS → fixé immédiatement.
- **SM-2 levels** : si la logique de niveau est cassée, l'étudiant ne progresse jamais. Test paliers exacts à 0 / 1000 / 2000 / 50000 XP.

#### 2. Logique de date / temps (souvent buggy)
- **`daysDiff`** : critique pour les streaks. Test gap 0 / 1 / 7 jours + null safety.
- **`getWeekStart`** : critique pour les quêtes hebdo. Test sur lundi / mercredi / dimanche.

#### 3. Intégrité des données seedées
- **14 templates de projets** : test que les phases somment à 100, que tous les types sont représentés, que les titres sont uniques.

---

## Ce qui n'est pas testé (et pourquoi c'est OK)

### 1. Routes Express (CRUD basique)
**Pourquoi pas testé** : `POST /api/courses`, `GET /api/users` etc. sont du boilerplate Mongoose. Tester ça nécessite :
- mongodb-memory-server setup (~30 min)
- supertest + maintenance des fixtures (~5h)

**Comment on le couvre quand même** :
- Validation Mongoose runtime (schémas avec types stricts).
- Tests manuels en preview à chaque modification.

### 2. Composants React
**Pourquoi pas testé** : React Testing Library demande beaucoup de mocks (Router, AuthContext, Axios). Pour 30 composants ça représente plusieurs jours.

**Comment on le couvre quand même** :
- Build Vite réussi → toutes les imports/syntax sont OK.
- Tests visuels manuels (preview navigateur).
- ESLint actif.

### 3. Appels Groq IA
**Pourquoi pas testé** : tester avec un vrai appel Groq = lent + coûteux + non-déterministe.

**Comment on le couvre quand même** :
- Sanitisation systématique en sortie (longueur, types).
- Validation Mongoose en 2nde ligne (rejette si incohérent).
- Fallback hardcodé pour `questGenerator`, `aiPlagiarismDetector`, `autoFlashcards`.

### 4. WebSocket Socket.io
**Pourquoi pas testé** : tester socket.io demande socket.io-client + serveur en mémoire.

**Comment on le couvre quand même** :
- ACL `canJoinRoom` testée manuellement avec 2 navigateurs (étudiants différents).
- Le test `__tests__/sockets-acl.test.js` (legacy) couvre les cas de base.

---

## Lancer les tests

```bash
cd fliplearn/backend
npm test                                    # tous les tests
npm test -- --testPathPattern=gamification  # un fichier
npm test -- --watch                         # mode watch
npm test -- --coverage                      # rapport coverage
```

### Configuration Jest
ESM strict avec `--experimental-vm-modules`. Cf. `package.json` :
```json
"scripts": {
  "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js"
},
"jest": {
  "testEnvironment": "node",
  "transform": {}
}
```

---

## Tests manuels (compensent l'absence d'E2E)

À chaque feature livrée, le workflow est :
1. `node --check` pour valider la syntaxe backend (rapide, ~50ms par fichier).
2. `npx esbuild --jsx=automatic` pour valider la syntaxe frontend.
3. `npm run build` (frontend) → valide les imports + le bundle.
4. Test fonctionnel manuel en preview (login → naviguer → tester la nouveauté).

### Comptes de test démo
| Rôle | Email | Profil |
|---|---|---|
| Prof | `lebrun@fliplearn.dz` / `demo1234` | Mme Lebrun |
| Étudiante MVP | `sara.demo@fliplearn.dz` / `demo1234` | engagement 95% |
| Étudiante moyenne | `lina.demo@fliplearn.dz` / `demo1234` | engagement 65% |
| Étudiant en difficulté | `mehdi.demo@fliplearn.dz` / `demo1234` | engagement 25%, copie ChatGPT |

---

## Bugs détectés par les tests smoke

Liste de bugs **non triviaux** que les tests ont chopé en cours de développement :

1. **F6** — `computeFrontHash`: gestion `null/undefined` non implémentée. Test "handles empty/null/undefined gracefully" échouait. Fix : ajout `String(s || '')` au début.

2. **F9** — `computePairings`: orphan livrables non skippés. Le check `if (!targetUserId)` ne fonctionnait pas car `String(null) === 'null'` (truthy). Test "skips livrables without uploadedBy" a chopé. Fix : déplacer `if (!liv.uploadedBy)` AVANT la stringification.

3. **F10** — `TEMPLATES` : non exporté en named (juste default export). Test échouait au 1er run. Fix : ajout `export { TEMPLATES }`.

4. **F11A** — `getCurrentLevel(NaN)`: retournait `Maître` au lieu de `Débutant`. Test "handles negative or NaN gracefully" a chopé. Fix : `Math.max(0, Number(points) || 0)`.

Ces 4 bugs auraient causé des **régressions silencieuses en production**. Validation de la stratégie tests smoke ciblés.

---

## Limites assumées

| Manque | Mitigation |
|---|---|
| Pas de tests E2E Playwright | Tests manuels en preview |
| Pas de tests d'intégration supertest | Validation Mongoose + manuel |
| Pas de tests composants React | Build Vite + ESLint + preview |
| Pas de tests WebSocket | Tests manuels avec 2 navigateurs |
| Pas de tests de sécurité (pentest) | OWASP design en amont, pas de pentest formel |
| Pas de tests de performance / charge | Hors scope PFE solo |

---

## Évolution post-PFE (V2 hypothétique)

Si FlipLearn devait passer en prod réelle :
1. **Tests E2E Playwright** sur les 5 flows critiques (signup → cours → vidéo → QCM → notes).
2. **Tests d'intégration supertest + mongodb-memory-server** sur les controllers IA.
3. **Sentry / Datadog** pour le monitoring runtime (errors, latency p95).
4. **Charge testing k6** sur les endpoints lourds (auto-prep IA, leaderboard monthly).
5. **Coverage cible 70%** sur les services métier (services/*.js).

---

## Voir aussi

- [Architecture](architecture.md) — runtime testé
- [Décisions techniques](technical-decisions.md) — ADR-008 sur le choix smoke vs E2E
- [Features MVP](features-mvp.md) — features démontrées (donc à tester en priorité)
