# 🧩 Features extensions — modules complémentaires

7 modules **implémentés et testés** mais **non démontrés** à la soutenance pour rester focus sur les 5 [features MVP](features-mvp.md). Ils prouvent que **l'architecture est extensible** et que le projet a une **vision produit complète**, sans surcharger la démo.

> Chaque extension est documentée ici pour la revue du jury (mémoire, GitHub) sans nécessiter d'être démontrée en direct.

---

## E1. Insights pédagogiques IA pour le prof (F3)

### Pitch
Un dashboard prof intelligent qui ne montre pas des stats brutes mais des **conseils actionables** générés par Groq.

### Mécanisme
- Service `teacherInsights.js` calcule des métriques brutes : taux de décrochage par vidéo, questions in-video avec >70% d'erreurs, étudiants à risque (engagement <30%).
- Prompt Groq : "Tu es coach pédagogique, voici les métriques [json]. Génère 3-5 insights actionnables `{type, title, description chiffrée, action concrète}`".
- Cache 1h (les insights ne changent pas en temps réel).

### Citations
- Hattie, J. (2009). *Visible Learning*.
- Black & Wiliam (1998). *Inside the Black Box*.

### Pour défendre
Comparable à Khan Academy "Teacher dashboard" mais avec interprétation IA — différenciation majeure.

---

## E2. Auto-flashcards SM-2 (F6)

### Pitch
À chaque vidéo complétée à 80%+, **8-12 flashcards de révision se créent automatiquement**, avec algorithme de répétition espacée SM-2.

### Mécanisme
- Hook fire-and-forget dans `videoController.saveProgress` à la 1re complétion.
- `services/autoFlashcards.js` réutilise `generateFlashcards` de F1 (parité prof/étudiant).
- Dédup par `frontHash` (sha1 normalisé) → idempotent.
- Cron dimanche 9h : `regenerateAllActiveStudents` pour rafraîchir les decks.
- Widget dashboard "🃏 X cartes à réviser aujourd'hui" basé sur `nextReview <= now` SM-2.
- Notification socket `flashcards_ready` avec lien direct vers le deck quand prêt.

### Citations
- Ebbinghaus, H. (1885) — Courbe de l'oubli.
- Wozniak, P. (1990) — Algorithme SuperMemo / SM-2.

### Pour défendre
Différenciation vs Anki classique : **pas besoin de créer manuellement les cartes**. La courbe d'oubli devient combat sans friction.

---

## E3. Forum projet + Peer-Review (F9)

### Pitch
Un mini-forum asynchrone par projet (questions / annonces / partages) + un système de peer-review structurée entre étudiants sur les livrables avec auto-pairing.

### Mécanisme
- 2 collections séparées (évitent le bloat de Project) :
  - `ProjectThread` : threads avec replies, types, pin par prof, marquage résolu, isFromProf marker.
  - `ProjectPeerReview` : reviewers/target par livrable, 4 critères standardisés (clarté/rigueur/originalité/utilité) score 1-5, anonyme par défaut.
- Algorithme `computePairings` (Fisher-Yates shuffle) : 2 reviewers/livrable, préférence cross-group, évite auto-review, dédup par index unique composé.
- Push notifs Socket.io aux membres lors de création thread + reply (avec marker isFromProf surligné en bleu).

### Citations
- Garrison, Anderson, Archer (2000) — Community of Inquiry.
- Topping (1998) — Peer assessment.
- Falchikov (2005) — Improving Assessment.
- Boud & Falchikov (2007) — Rethinking Assessment.

### Pour défendre
Conforme à la pédagogie collaborative cohorte / cohorte + métacognition (apprendre en jugeant).

---

## E4. Projets PFE + Templates de phases + Rubric (F8)

### Pitch
Le modèle `Project` a été étendu pour supporter le type **PFE** (en plus de mono / multi-modules), avec **auto-load de templates de phases** par type (3 / 5 / 7 phases) et **rubric d'évaluation transparente**.

### Mécanisme
- `services/projectTemplates.js` : 3 templates de phases standard (mono 3 / multi 5 / pfe 7 canon algérien).
- `Project.phases[]` enrichi avec `weight` (% note finale) + `livrableSpec` (type de livrable attendu).
- Nouveau champ `Project.rubric[]` : critères avec descripteurs par niveau 1-5 (Helle, Tynjälä, Olkinuora 2006).
- Endpoint `POST /:id/livrables/:lid/feedback` : feedback prof structuré (texte + 1-5 stars) avec push socket en temps réel à l'étudiant (F8 hotfix).
- `LivrableFeedbackBlock` composant inline : card bleue lecture seule si feedback existe, formulaire jaune 5 stars pour le prof.
- ProjectDetail : section dépliable "Grille d'évaluation détaillée" pour transparence étudiants.
- Validation `updateProject` : rejette tout changement de `type` après création (immutabilité conceptuelle, F8 hotfix).

### Citations
- Helle, Tynjälä, Olkinuora (2006) — Project-based learning in post-secondary education.

### Pour défendre
Trade-off documenté : pas de schéma `submissions[]` séparé (livrables[] enrichi suffit). Approche pragmatique additif rétrocompat — aucune migration nécessaire.

---

## E5. Bibliothèque de templates projets (F10)

### Pitch
14 templates de projets pré-pensés (5 ISIL + 3 Management + 3 Finance + 3 PFE) avec contexte algérien + génération IA personnalisée à la demande.

### Mécanisme
- Modèle `ProjectTemplate` : title, énoncé, motsCles, filière, type, niveau, phases custom, rubric, suggestedOutcomes, source (`official` / `community` / `ai-generated`), usageCount.
- Auto-seed paresseux au 1er accès `GET /api/project-templates` si DB vide (pas de script séparé).
- Endpoint `POST /generate` : Groq Llama-3.3 produit un template complet sur thème libre (3/5/7 phases adaptées au type, rubric 5 critères, 3 outcomes).
- Page `/professor/templates` avec filtres (filière/type/niveau/source/recherche text) + modal Generate.
- Bouton "Partir d'un template" sur ProjectCreate → sessionStorage prefill.

### Citations
- Helle, Tynjälä, Olkinuora (2006) — réutilise les phases du modèle PBL.

### Pour défendre
Réduit le **coût de scénarisation pédagogique** du prof. Différenciation forte vs concurrence (Moodle, Google Classroom). Architecture future-proof avec `community` source pour V2 (partage entre profs).

---

## E6. Leaderboard 3 onglets + HonorBoard (F11B)

### Pitch
Refonte du classement en 3 axes complémentaires de motivation + tableau d'honneur public par cours.

### Mécanisme
- Endpoint `GET /api/leaderboard?scope=`:
  - **`cohort`** : top promotion (filière+promotion) par XP totaux. Compétition long terme.
  - **`monthly`** : top XP gagnés CE MOIS via `StudyStreak.history` (filtre préfixe `YYYY-MM`). Reset implicite mensuel — fairness pour nouveaux étudiants.
  - **`personal`** : série 30j cumulative pour AreaChart Recharts (gradient violet). Auto-comparaison, pas de classement.
- Endpoint `GET /api/leaderboard/honor-board/:courseId` : top 3 du mois pour un cours.
- Composant `HonorBoard.jsx` : podium 🥇🥈🥉 sur fond gradient or, monté en haut de StudentCourse pour public recognition.

### Citations
- Werbach & Hunter (2012) — Public recognition is a powerful gamification lever.
- Deci & Ryan (1985) — Mastery visualization.

### Pour défendre
3 motivations distinctes activées simultanément (compétition / engagement régulier / maîtrise personnelle). Le mode "Top du mois" évite le décrochage des nouveaux étudiants face aux anciens dominateurs.

---

## E7. Reward marketplace étendu (architecture future-proof, F11B)

### Pitch
Le modèle `Reward` accepte désormais 7 types de récompenses (au lieu de 1) — l'architecture est prête pour l'activation post-PFE.

### Mécanisme
- Enum `Reward.type` étendu : `abonnement_fliplearn` / `tutoring` / `content` / `badge_linkedin` / `honor_board` / `project_choice` / `cosmetic`.
- Champ `metadata: Mixed` pour configs spécifiques par type.
- TYPE_META côté frontend `Rewards.jsx` étendu (icônes/couleurs propres).

### Décision juridique
**Seul `abonnement_fliplearn` est actuellement actif** dans la prod. Le seed `services/rewardsSeed.js` désactive activement les autres types pour éviter d'engager le PFE sur des prestations matérielles non garanties (pas de structure juridique côté FlipLearn). Documenté dans `chap. 7.4.1` du mémoire.

### Pour défendre
Démontre la **séparation entre l'architecture (capable) et l'activation (limitée)** — un patron d'ingénierie classique en SaaS.

---

## Pourquoi 7 extensions et pas plus / pas moins ?

| Critère | Choix |
|---|---|
| **Pas démontrer pour ne pas saturer** | démo 10 min lisible |
| **Implémenter pour preuve de l'extensibilité** | architecture modulaire validée |
| **Documenter pour le mémoire** | chapitre "modules complémentaires" |
| **Tester pour la qualité** | smoke tests présents (cf. testing-strategy.md) |

L'objectif est de **présenter un MVP cohérent** sans gâcher l'effort des extensions, et sans crouler sous une démo trop dense que le jury ne suivrait pas.

---

## Voir aussi

- [Features MVP](features-mvp.md) — 5 features stars démontrées
- [Architecture](architecture.md) — vue système globale
- [Script soutenance](script-soutenance.md) — flow de démo
