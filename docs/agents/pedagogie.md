# Vision pédagogique — FlipLearn

Ce document fixe les règles éditoriales du projet. Tout agent IA qui propose une feature ou refonte doit s'y conformer. Si une suggestion contredit ces principes, **les principes priment** sur la suggestion.

---

## 1. La classe inversée comme cadre

FlipLearn implémente le **Cycle d'Apprentissage Inversé** (CESI / Bergmann & Sams 2012) :

1. **Préparation** à la maison (vidéos, lectures, QCM d'auto-évaluation)
2. **Rendez-vous** présentiel ciblé (focus sur les difficultés détectées en amont)
3. **Application** en groupe (Prosits, projets PBL, exercices)
4. **Production** originale (livrables, présentations, mémoires)
5. **Consolidation** par révision espacée (decks, flashcards SM-2)

Tout ce que fait FlipLearn doit s'inscrire dans ce cycle. Une feature qui ne sert aucune des 5 étapes est probablement à challenger.

---

## 2. L'IA = encadrement adaptatif personnalisé

> **Pivot éditorial du 28/04/2026** : abandon de la prédiction TensorFlow (modèles ML, microservice Python, dashboards "risk score").

L'IA dans FlipLearn est positionnée comme un **assistant pédagogique adaptatif**, pas comme un prédicteur d'échec ou un juge.

### Trois agents IA cœur (à conserver et perfectionner)

1. **Module Assistant** (`backend/services/moduleAI.js` + `frontend/pages/ModuleAssistant.jsx`)
   Chat par cours avec persona configurable + RAG sur les ressources du cours.
2. **Analyse vidéo** (`backend/services/videoAnalyzer.js`)
   Whisper transcription → GPT-4o → transcript / summary / keyConcepts.
3. **Génération QCM** (`backend/controllers/qcmController.js` → `generateQuizQuestions`)
   Outil prof : à partir d'une vidéo, propose 5-10 QCM tirables.

### Agents IA secondaires (autour des cœurs)

- **Tuteur IA personnel** (`/my-tutor`) — coach général de l'étudiant
- **Auto-prep complet** (Groq × 5 parallèle) — bouton 1 clic pour le prof
- **Auto-flashcards** — génération automatique d'un deck SM-2 après vidéo complétée
- **Coach Prosit/Projet** — aide IA pour les groupes
- **Insights pédagogiques** — synthèse de classe pour le prof
- **Détection plagiat** — heuristiques + Groq sur les livrables

### Ce que l'IA NE fait PAS

- ❌ **Prédire qu'un étudiant va échouer** — culpabilisant, contre-productif, biaisé.
- ❌ **Remplacer le professeur** — l'IA aide, le prof décide et accompagne.
- ❌ **Noter automatiquement les humains** — la note prof + 30% pairs reste humaine.
- ❌ **Servir d'adversaire dans les features sociales** (voir section 3).

---

## 3. Pas de "vs IA" dans les features pair-à-pair

**Règle absolue.** Les features suivantes existent pour créer de l'**émulation entre étudiants** :

- **Quiz Battle** (1v1 temps réel)
- **Prosits** (rôles CESI : animateur, scribe, gestionnaire, etc.)
- **Projets PBL** (groupes assignés, livrables collectifs)
- **Peer-assessment** (note 70% prof + 30% pairs)
- **Chat de classe** (par cours, par groupe)
- **Leaderboards** (classement par cohorte)

**Ne jamais** proposer un "mode vs IA", "bot adversaire", "co-équipier IA", "auto-évaluateur IA pour pair-review" dans ces features. Cela :

- Vide la mécanique de sa valeur pédagogique (motivation par les pairs ≠ motivation contre une machine).
- Contredit la philosophie de la classe inversée (interaction humaine au cœur).
- Envoie un mauvais signal en soutenance ("gamification creuse").

**Pour les démos sans 2e joueur** : ouvrir 2 navigateurs avec 2 comptes étudiants. Le repo a des comptes de démo prêts (voir [`status.md`](status.md)).

> **Historique** : un mode "vs IA" a été ajouté au Quiz Battle le 08/05/2026 (commit `7520b56`) puis **retiré** quelques heures plus tard (commit `5c6e26d`) après retour de l'auteur. Cette règle est née de cet incident.

---

## 4. Gamification = soutien, pas substitution

Les XP, badges, streaks, leaderboards de FlipLearn s'inspirent de :
- Hamari et al. (2014) — *Does Gamification Work?*
- Werbach & Hunter (2012) — *For the Win*
- Deci & Ryan (1985) — Self-Determination Theory (autonomie / compétence / appartenance)

### Règles d'usage

- **L'XP académique** (vidéos, QCM, modules validés) doit toujours dominer l'XP ludique (Quiz Battle, quêtes).
- **Le Quiz Battle a un classement séparé** (`BattleResult`) du classement académique global (voir [`backend/models/BattleResult.js`](../../backend/models/BattleResult.js)).
- **Les streaks ne pénalisent jamais** (pas de "vous avez perdu votre série") — Duolingo a montré que la peur de la perte décourage les apprenants fragiles. Préférer les freezes / pauses gracieuses.
- **Les badges sont qualitatifs**, pas une course à la collection.

---

## 5. Pédagogie active : ZPD, Flow, Bloom

### Vygotsky — Zone Proximale de Développement
Chaque étudiant doit voir des contenus **un cran au-dessus** de son niveau actuel, pas trop bas (ennui), pas trop haut (découragement). Les recommandations IA doivent calibrer la difficulté.

### Csikszentmihalyi — Flow
État optimal d'engagement : challenge perçu = compétences perçues. Les power-ups, timers, streaks du Quiz Battle visent à maintenir cet état (mais voir règle no-AI ci-dessus).

### Bloom révisé (Anderson & Krathwohl 2001)
Les QCM générés par IA doivent couvrir un mix de niveaux cognitifs : Mémoriser (20%), Comprendre (30%), Appliquer (30%), Analyser/Évaluer/Créer (20%). Voir `backend/services/courseAutoPrep.js`.

---

## 6. Filière algérienne — adapter au contexte

- **Langue** : tout en français. Pas de fallback anglais sauf identifiants techniques (rôles DB, codes, variables).
- **Connectivité** : 3G/4G fréquents, donc lazy loading systématique côté frontend (chunks indépendants), images compressées, vidéos via Cloudinary 100MB max.
- **Free tier Render** : le backend dort après 15 min d'inactivité. Endpoint `/api/health` pour les pings de réveil. Indiquer "réveil du serveur" dans Login si la requête traîne >4s.
- **Filières référencées** : ISIL (Informatique), Management, Finance × L1/L2/L3.

---

## 7. Références scientifiques mobilisées

Voir [`docs/README.md`](../README.md) section "Cadre théorique" — 18 références cumulées dans le code et le mémoire. Citer ces références dans les commentaires de code lorsque c'est pertinent (ex : `// SM-2 (Wozniak 1990)` dans le service flashcards).
