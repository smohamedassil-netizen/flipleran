# ⭐ Features MVP — démontrées à la soutenance

5 features stars qui constituent la **colonne vertébrale** du projet PFE. Chacune est :
- **Démontrable en moins de 2 minutes**
- **Adossée à un cadre théorique** publié et citable
- **Testable avec un compte démo** sur la plateforme déployée

> Ces 5 features sont à maîtriser **parfaitement** pour la soutenance. Les 7 autres modules (cf. [features-extensions.md](features-extensions.md)) sont implémentés mais **non démontrés** par souci de clarté pédagogique.

---

## 1. Auto-prépa de cours en 1 clic (F1) ⭐⭐⭐⭐⭐

### Problème pédagogique
Préparer un cours en classe inversée demande au professeur **3 à 6 heures** par vidéo : extraire les concepts, formuler des questions de vérification (Bloom), composer un QCM, scénariser un Prosit lié, créer des flashcards de révision. Cette charge décourage l'adoption du modèle inversé (Bergmann & Sams, 2012).

### Solution
À partir d'un transcript Whisper d'une vidéo, **5 appels Groq Llama-3.3 en parallèle** (`Promise.allSettled`) génèrent simultanément :
1. **5 questions in-video** avec timestamps précis (méthode EdPuzzle / Mazur ConcepTests)
2. **1 QCM de 10 questions** mix Bloom (4 Remember + 4 Understand + 2 Apply)
3. **3-5 outcomes Bloom-aligned** (Anderson & Krathwohl, 2001)
4. **1 suggestion de Prosit** (étude de cas CESI/APP)
5. **8-12 flashcards SM-2** (méthode Anki, Wozniak 1990)

Le prof valide manuellement (toggle Garder/Rejeter) puis publie. Création atomique en DB des éléments validés.

### Cadre théorique
- **Bergmann, J. & Sams, A. (2012)** — *Flip Your Classroom*. ISTE.
- **Mazur, E. (1997)** — *Peer Instruction: A User's Manual*.
- **Anderson, L. W. & Krathwohl, D. R. (2001)** — Bloom révisé.
- **Lebrun, M. (2007)** — Scénarisation pédagogique.

### Stack technique
- Backend : `services/courseAutoPrep.js` (~330 lignes), `Promise.allSettled` pour résilience.
- IA : **Groq Llama-3.3-70b-versatile** avec `response_format: json_object`.
- Coût : ~30k tokens / job · gratuit dans le quota Groq.
- Async : `AutoPrepJob` collection + polling client toutes les 3s.

### Démontrer
```
1. Login prof : lebrun@fliplearn.dz
2. Cours « Sécurité Web — L3 ISIL » → Vidéo CSRF
3. Bouton « ✨ Préparer ce cours avec l'IA »
4. Spinner ~30 secondes
5. 5 sections collapsibles avec résultats validables
6. Click « Publier les éléments validés »
```

---

## 2. Tuteur IA personnel + Demande à la vidéo (F4 + F5) ⭐⭐⭐⭐⭐

### Problème pédagogique
Un étudiant qui regarde une vidéo en autonomie n'a **personne pour répondre** à ses questions ponctuelles ("ce concept, qu'est-ce que ça veut dire ?"). Le décrochage commence là (Vygotsky ZPD : sans étayage, l'apprenant abandonne face à la difficulté).

### Solution
**Deux IA conversationnelles complémentaires** :

#### F4 — Tuteur IA personnel (`/my-tutor`)
- Connaît l'étudiant : cours en cours, % completion, QCM passés, concepts faibles/forts, streak, Prosits/Projets actifs.
- Méthode socratique stricte : refuse de donner les réponses aux QCM, guide par questions (Mazur).
- Web Speech API pour dictée vocale (fr-FR).
- Suggestions du jour générées par cron : 3 actions concrètes ~30 min chacune.
- Quota 30 messages/jour/utilisateur.

#### F5 — Demande à la vidéo (panneau `<AskVideoPanel />`)
- Bouton 💬 sous le player vidéo.
- Saisit une question + le **timestamp courant**.
- Backend fait du **RAG** sur le transcript : récupère le contexte + appelle Groq.
- Réponse avec **timestamps cliquables** (badges 🎯 mm:ss qui seekent la vidéo HTML5).
- Si confidence < 50% : alerte "hors sujet de la vidéo" + lien vers le tuteur F4.
- Quota 5/(user, vidéo, jour) avec compteur visible.

### Cadre théorique
- **Vygotsky (1978)** — Zone Proximale de Développement.
- **Bandura (1977)** — Self-efficacy theory.
- **Mazur (1997)** — Méthode socratique.

### Stack technique
- Backend : `services/personalTutor.js` (~330 lignes) avec `buildStudentContext`, `chat`, `askAboutVideo`, `generateDailySuggestions`.
- Stream SSE pour les réponses tuteur (effet "ChatGPT-like").
- LocalStorage : historique des questions par `videoId` (max 20).

### Démontrer
```
1. Login étudiante : lina.demo@fliplearn.dz
2. Mes cours → Vidéo CSRF → durant la lecture :
   - Click 💬 « Demande à la vidéo »
   - Question : « Quelle est la différence entre CSRF et XSS ? »
   - Réponse en 5s avec timestamp 4:32 cliquable
3. Quitter la vidéo → /my-tutor
   - Sidebar : 3 missions du jour, points forts/faibles
   - « Explique-moi le hashing bcrypt »
   - Réponse en streaming
```

---

## 3. Détection plagiat IA (F2) ⭐⭐⭐⭐

### Problème pédagogique
**60-80% des étudiants** universitaires utilisent ChatGPT pour rédiger leurs devoirs (étude HEC Paris 2024). Or les enseignants n'ont pas d'outil intégré pour détecter ce comportement, et les détecteurs externes (GPTZero, Turnitin) sont coûteux et hors de la plateforme. Le risque pédagogique : l'étudiant ne s'approprie pas le savoir, le prof note un texte qui n'est pas le sien.

### Solution
**Pipeline 2 étages** dans `services/aiPlagiarismDetector.js` :

1. **Heuristiques rapides (gratuit, instantané)** sur le texte étudiant :
   - 13 patterns ChatGPT typiques ("Il est important de noter que…", "En conclusion", "Tout d'abord…")
   - **Sur-structuration** : détection de listes à puces excessives
   - **Variabilité de la longueur des phrases** (faible variance = suspect)
   - **Ratio adverbes en `-ment`** (texte IA = beaucoup d'adverbes)

2. **Confirmation Groq (si heuristique > seuil 35/100)** :
   - Prompt qui évalue probabilité 0-100 de génération IA
   - Score combiné : 70% Groq + 30% heuristique

### Privacy by design
**Le texte intégral n'est JAMAIS stocké** dans le rapport. On garde :
- `aiProbability: 0-100`
- `flags[]` : labels des patterns détectés
- `textPreview: 200 chars max`

Le prof voit le score, pas le texte (déjà visible dans la contribution Prosit). Distinction claire entre **outil d'alerte** et **accusation automatique** : c'est le prof qui décide.

### Cadre théorique
- **Mitchell et al. (2023)** — *DetectGPT*. Stanford.
- **Krishna et al. (2023)** — Robustness of AI text detection.

### Stack technique
- Hook automatique : déclenché à `POST /prosits/:id/groupes/:idx/contribution`
- `Promise.race([detection, timeout(5s)])` : non-bloquant pour l'étudiant
- Côté étudiant : message générique "ta contribution sera analysée pour authenticité" (effet préventif sans spam)

### Démontrer
```
1. Login Karim (étudiant en difficulté qui copie ChatGPT)
2. Prosit Sécurité Web → soumettre contribution copiée de ChatGPT
3. Login prof → PrositDetail → onglet « 🛡️ Rapport d'intégrité IA »
4. Karim flagué 85% probabilité IA, raisons listées
5. Cliquer « Voir détails » → flags : sur-structuration, patterns ChatGPT, variabilité phrases
```

---

## 4. Coach IA anti-blocage Prosit/Projet (F7) ⭐⭐⭐⭐⭐

### Problème pédagogique
Pendant la **phase Recherche d'un Prosit** (entre la phase Aller et le Retour), l'étudiant est seul face à un problème ouvert. C'est le moment où il :
- Ne sait pas par où commencer (page blanche)
- Bloque sur une difficulté ponctuelle et abandonne
- Copie ChatGPT pour avancer (flagué par F2)

Aucun système ne détecte ce blocage de façon proactive.

### Solution
**Encart latéral "🤖 Coach IA"** sur PrositDetail / ProjectDetail (vue étudiant) avec :

#### Diagnostic instantané (sans IA, gratuit)
Heuristiques pures dans `services/projectCoach.detectBlockage` :
- `no-contribution` : 0 mot écrit
- `short-contribution` : <50 mots
- `fear-blank-page` : page blanche depuis 24h+
- `inactivity-48h` : pas de save dans les 48h
- `phase-deadline-near` : deadline phase <48h sans livrable

Severity : `none / low / medium / high`. Affichage badge color-coded.

#### 4 actions IA (Groq, à la demande)
1. **Que faire maintenant ?** → 3 micro-actions ~30min chacune, méthode socratique (les `hint` sont des QUESTIONS, pas des réponses).
2. **Relis ma contribution** (Prosit only, ≥50 mots) → 1 force / 1 faiblesse / 1 amélioration concrète. Pas de note, pas de jugement.
3. **Trouve-moi des sources** → 3 références fiables (livre + article + doc) avec **interdiction explicite des URLs** (anti-hallucination).
4. **Parle-moi** → deeplink `/my-tutor` avec contexte pré-rempli via sessionStorage.

#### Cron proactif quotidien
À 18:00, scan tous les Prosits actifs et Projets en cours. Pour chaque étudiant en blockage `severity='high'` : push notif douce "🤖 Ton coach a un conseil — Prosit X". Dédupliqué par jour.

### Cadre théorique
- **Vygotsky (1978)** — ZPD : intervenir au bon moment, ni trop tôt ni trop tard.
- **Bandura (1977)** — Self-efficacy : actions 30min restaurent la confiance.
- **Mazur (1997)** — Méthode socratique : guider par questions.
- **Schön (1983)** — *The Reflective Practitioner* : la review constructive.

### Stack technique
- Service `projectCoach.js` (~490 lignes) avec API agnostique `{ kind, id, userId }` qui factorise prosit/project.
- Composant frontend `CoachAIPanel.jsx` réutilisable (~390 lignes), 4 actions modales.
- Cron `0 18 * * *` dans `notificationScheduler.js`.

### Démontrer
```
1. Login étudiant : Yacine (sur un Prosit en phase Recherche, 0 contribution)
2. Ouvrir Prosit → encart violet « Coach IA » :
   - Status : « 🔴 Besoin d'aide » + symptômes listés
3. Click « Que faire maintenant ? » → modal avec 3 étapes numérotées
4. Click « Trouve-moi des sources » → 3 cards typées (Livre / Article / Doc)
5. Click « Parle-moi » → /my-tutor avec input pré-rempli
6. Login prof admin → mentionne le cron 18h qui envoie les notifs proactives
```

---

## 5. Gamification renforcée — Streaks + Niveaux + Quêtes IA (F11A) ⭐⭐⭐⭐⭐

### Problème pédagogique
Une plateforme d'apprentissage à l'autonomie souffre d'**engagement irrégulier** : l'étudiant motivé démarre fort, s'épuise, abandonne. Les XP cumulés sans contexte (gamification "cosmétique") ne créent pas de vraie motivation (Deci & Ryan : motivation extrinsèque toxique).

### Solution
**3 piliers de gamification "renforcée"** combinés :

#### Streaks (séries de jours consécutifs)
- Modèle `StudyStreak` : 1 doc par étudiant, `currentStreak`, `longestStreak`, `lastActivityDate`, `savedDays` (max 3 freezes).
- Logique `streakService.updateStreak` :
  - +1 par jour consécutif
  - **Freeze consume** si gap d'1 jour (et savedDays > 0) → conserve le streak
  - Reset si gap > 1 jour ou pas de freeze
  - Bonus +1 freeze tous les 7 streaks (max 3)
- Détection des paliers `[3, 7, 14, 30, 60, 100, 365]` jours → notif `🔥 Streak de N jours !`
- Animation flame-flicker dans le header si activeToday.

#### Niveaux (5 paliers)
| Palier | XP | Couleur |
|---|---|---|
| Débutant | 0-500 | gris |
| Apprenti | 500-2000 | bleu |
| Confirmé | 2000-5000 | vert |
| Expert | 5000-10000 | violet |
| Maître | 10000+ | ambre |

Affiché dans le header (badge compact) + Dashboard (card avec barre de progression vers le palier suivant).

#### Quêtes hebdomadaires IA (cron lundi 6h)
- Modèle `WeeklyQuest` : 3 quêtes/semaine/étudiant, calibrées via Groq.
- Format SMART (Locke & Latham 2002) : 1 facile (30-60 XP) / 1 moyenne (60-120 XP) / 1 difficile (150-300 XP).
- Personnalisation par contexte : filière/promotion, points cumulés, vidéos vues, dernière activité.
- Génération paresseuse au 1er fetch si pas encore créé.
- Fallback hardcodé si Groq down (`source='fallback'`).
- Bouton "Régénérer" manuel (utile en démo).

### Hook activity automatique
Dans `videoController.saveProgress`, à la 1re complétion ≥80% :
1. `updateStreak(userId, 'video_watched', 20)` → +1 streak
2. `recordQuestProgress(userId, 'video', 1)` → quête video
3. Si premier hit du jour : `recordQuestProgress(userId, 'streak', 1)` → quête streak
4. Pour chaque quête complétée : `addPoints(xpReward)` + notif `🎯 Quête complétée — +N XP`

### Cadre théorique
- **Deci, E. & Ryan, R. (1985)** — Self-Determination Theory (SDT) : motivation autodéterminée.
- **Csikszentmihalyi, M. (1990)** — *Flow*. Challenges progressifs.
- **Werbach, K. & Hunter, D. (2012)** — *For the Win* : streaks bien dosées avec freezes.
- **Locke, E. & Latham, G. (2002)** — Goal-setting theory : SMART.

### Démontrer
```
1. Login étudiant : Yacine (streak 45 jours, niveau Confirmé)
2. Header : 🔥 45 (orange animé) + badge Confirmé vert
3. Dashboard : 2 cards STATUS (StreakFlame + LevelBadge) + Card 3 quêtes
4. Quête « Regarde 2 vidéos » : 1/2 progression bar
5. Aller voir une vidéo, la compléter à 80%+ :
   - Toast 🔥 Streak de 46 jours
   - Quête video 2/2 → toast 🎯 Quête complétée — +50 XP
   - Niveau passe peut-être à Expert (vérifier la barre)
```

---

## Voir aussi

- [Features extensions](features-extensions.md) — 7 modules complémentaires implémentés
- [Architecture](architecture.md) — runtime, déploiement, sécurité
- [Script soutenance](script-soutenance.md) — démo minute par minute
