# TUTO COMPLET — TEST FLIPLEARN L3 ISIL

> **Pour qui** : Mohamed Assil SERAY — L3 ISIL, EM Alger Business School
> **Quand** : 05 mai 2026 (test fonctionnel complet)
> **App** : https://fliplearn-5lsz.onrender.com
> **Durée totale** : ~2 heures (1h30 setup côté prof + 30 min test côté étudiant)

Ce document est ton **plan unique** pour le test. Tout y est : comptes, liens YouTube directs (24 vidéos déjà choisies), énoncés Prosit/Projet à copier-coller, scénario de test étudiant, checklist et dépannage.

> **État de la base** : 4 professeurs ISIL L3, 11 étudiants ISIL L3 (toi + 10), 8 modules (4 S5 + 4 S6) — déjà incrustés en MongoDB Atlas. Tu peux te connecter et travailler tout de suite, sans aucun bouton à cliquer en admin.

---

## SOMMAIRE

1. [Préparation (5 min)](#0-préparation-5-min)
2. [Étape 1 — Vidéos YouTube par module (45 min)](#étape-1--vidéos-youtube-par-module-45-min)
3. [Étape 2 — QCM générés par IA (15 min)](#étape-2--qcm-générés-par-ia-15-min)
4. [Étape 3 — Prosits & Projet (20 min)](#étape-3--prosits--projet-20-min)
5. [Étape 4 — Test côté étudiant (30 min)](#étape-4--test-côté-étudiant-30-min)
6. [Checklist de fin](#checklist-de-fin)
7. [Dépannage](#dépannage)

---

## 0. PRÉPARATION (5 min)

### 0.1 Réveiller l'app

Render free tier dort après 15 min d'inactivité. Première requête = 30-60 s.

1. Ouvre https://fliplearn-5lsz.onrender.com dans Chrome
2. Attends que la page de connexion s'affiche (recharge si erreur 502)
3. Reste connecté à internet (la suite consomme YouTube + Cloudinary + Groq)

### 0.2 Comptes (mot de passe `test1234` partout sauf admin)

| Rôle | Email | Mot de passe | Modules enseignés |
|---|---|---|---|
| **Admin** | `admin@fliplearn.dz` | `admin1234` | — |
| **Toi (étudiant)** | `assil.isil.l3@fliplearn.dz` | `test1234` | — |
| Prof Tarek Mansouri | `tarek.isil.l3@fliplearn.dz` | `test1234` | M1 Génie Logiciel + M2 SE |
| Prof Sami Hadj | `sami.isil.l3@fliplearn.dz` | `test1234` | M3 BDD + M5 Archi SI |
| Prof Omar Saadi | `omar.isil.l3@fliplearn.dz` | `test1234` | M4 Réseaux + M6 Web/Mobile |
| Prof Yasmine Khelifi | `yasmine.isil.l3@fliplearn.dz` | `test1234` | M7 IA + M8 Cybersécu |

**Astuce** : ouvre 3 fenêtres Chrome (1 normale + 2 incognito) pour switcher entre prof et étudiant sans te déconnecter.

### 0.3 Vue d'ensemble des 8 modules

| # | Module | Sem. | Prof |
|---|---|---|---|
| 1 | Génie Logiciel & UML | S5 | Tarek |
| 2 | Systèmes d'Exploitation Avancés | S5 | Tarek |
| 3 | Bases de Données Avancées | S5 | Sami |
| 4 | Administration et Sécurité Réseaux | S5 | Omar |
| 5 | Architecture des Systèmes d'Information | S6 | Sami |
| 6 | Développement Web et Mobile | S6 | Omar |
| 7 | Intelligence Artificielle & Data Mining | S6 | Yasmine |
| 8 | Cybersécurité & Cloud DevOps | S6 | Yasmine |

---

## ÉTAPE 1 — Vidéos YouTube par module (45 min)

24 vidéos au total, 3 par module. Toutes en français, déjà testées.

### Méthode (pour chaque vidéo)

1. Connecte-toi avec le prof du module (cf. tableau ci-dessous)
2. Sidebar → **Mes cours** → clique sur le module
3. Bouton **« Ajouter vidéo »** → onglet **« Ajouter depuis YouTube »**
4. Colle l'URL → tape le titre → bouton **« Ajouter »**

**Gain de temps** : ouvre les 3 URLs d'un module dans 3 onglets YouTube avant de switcher sur FlipLearn. Copie-colle à la chaîne.

---

### MODULE 1 — Génie Logiciel & UML (S5) — Prof Tarek

| # | Titre dans FlipLearn | URL |
|---|---|---|
| 1.1 | Introduction au langage UML | https://www.youtube.com/watch?v=fpxjv5rwXc4 |
| 1.2 | Maîtriser l'UML — guide complet | https://www.youtube.com/watch?v=1LDWVJE5Ljo |
| 1.3 | POO & Design Patterns | https://www.youtube.com/watch?v=DK6vSUVfyug |

### MODULE 2 — Systèmes d'Exploitation Avancés (S5) — Prof Tarek

| # | Titre | URL |
|---|---|---|
| 2.1 | Synchronisation de processus concurrents | https://www.youtube.com/watch?v=GzAJzGxjrI4 |
| 2.2 | Synchronisation des processus (cours SMI) | https://www.youtube.com/watch?v=Q5cqWeF9ldo |
| 2.3 | Linux — 10 astuces ligne de commande (Cocadmin) | https://www.youtube.com/watch?v=MAPbo8cNkJ8 |

### MODULE 3 — Bases de Données Avancées (S5) — Prof Sami

| # | Titre | URL |
|---|---|---|
| 3.1 | Transactions ACID en base relationnelle | https://www.youtube.com/watch?v=dKcJrVuYjig |
| 3.2 | Apprendre MongoDB en 2 heures | https://www.youtube.com/watch?v=SjBWysPZpIU |
| 3.3 | Introduction à MongoDB (NoSQL) | https://www.youtube.com/watch?v=6wGYHrPMzUE |

### MODULE 4 — Administration et Sécurité Réseaux (S5) — Prof Omar

| # | Titre | URL |
|---|---|---|
| 4.1 | Le modèle OSI et TCP/IP enfin facile | https://www.youtube.com/watch?v=darvsbHcchs |
| 4.2 | Comprendre les modèles OSI et TCP/IP | https://www.youtube.com/watch?v=26jazyc7VNk |
| 4.3 | Les VPN — comment ça marche | https://www.youtube.com/watch?v=cBBgcHU1HVM |

### MODULE 5 — Architecture des Systèmes d'Information (S6) — Prof Sami

| # | Titre | URL |
|---|---|---|
| 5.1 | Du Monolithe aux microservices (LeBonCoin) | https://www.youtube.com/watch?v=yah6zzpQu3s |
| 5.2 | Passer d'un monolithe à des microservices | https://www.youtube.com/watch?v=BPSd9MAg-6c |
| 5.3 | C'est quoi une API GraphQL ? | https://www.youtube.com/watch?v=GC8k7mAP464 |

### MODULE 6 — Développement Web et Mobile (S6) — Prof Omar

| # | Titre | URL |
|---|---|---|
| 6.1 | Apprendre React — Introduction (Grafikart) | https://www.youtube.com/watch?v=NT0s0aOHu0Q |
| 6.2 | Créer une API REST Node + Express + MongoDB | https://www.youtube.com/watch?v=TlfZUAZAadw |
| 6.3 | Flutter vs React Native — test de perfs | https://www.youtube.com/watch?v=pxalC4IZb4k |

### MODULE 7 — Intelligence Artificielle & Data Mining (S6) — Prof Yasmine

| # | Titre | URL |
|---|---|---|
| 7.1 | Le Machine Learning expliqué simplement | https://www.youtube.com/watch?v=qgImjYWY9OQ |
| 7.2 | Le Deep Learning (Science Étonnante) | https://www.youtube.com/watch?v=trWrEWfhTVg |
| 7.3 | Comment les IA comprennent notre langue (NLP) | https://www.youtube.com/watch?v=CsQNF9s78Nc |

### MODULE 8 — Cybersécurité & Cloud DevOps (S6) — Prof Yasmine

| # | Titre | URL |
|---|---|---|
| 8.1 | Docker — débuter de zéro (Cocadmin 1/3) | https://www.youtube.com/watch?v=SXB6KJ4u5vg |
| 8.2 | 10 ans de Docker en 20 min | https://www.youtube.com/watch?v=PUpgGtq0xSw |
| 8.3 | CI/CD avec GitHub Actions de A à Z | https://www.youtube.com/watch?v=VKKOuj19Tg4 |

---

## ÉTAPE 2 — QCM générés par IA (15 min)

Un QCM par module, basé sur la première vidéo (1.1, 2.1, … 8.1). 8 QCM au total. L'IA Groq (Llama 3.3) génère les questions en français à partir du transcript.

### Méthode (à répéter 8 fois)

1. Connecté en prof du module
2. Sidebar → **Gérer les QCM** → bouton **« Créer un QCM »**
3. **Vidéo source** : la 1ʳᵉ vidéo du module
4. Onglet **« Génération par IA »** → nombre de questions : **5**
5. Bouton **« Générer avec l'IA »** → attends 5-10 s
6. Relis vite, corrige une éventuelle coquille
7. Bouton **« Sauvegarder le QCM »**

### Tableau de suivi

| ☐ | Module | Vidéo source | Prof |
|---|---|---|---|
| ☐ | M1 — Génie Logiciel | Vidéo 1.1 (Intro UML) | Tarek |
| ☐ | M2 — Systèmes d'Exploitation | Vidéo 2.1 (Synchro) | Tarek |
| ☐ | M3 — Bases de Données | Vidéo 3.1 (ACID) | Sami |
| ☐ | M4 — Réseaux | Vidéo 4.1 (OSI/TCP-IP) | Omar |
| ☐ | M5 — Architecture SI | Vidéo 5.1 (Monolithe→microservices) | Sami |
| ☐ | M6 — Web & Mobile | Vidéo 6.1 (React intro) | Omar |
| ☐ | M7 — IA | Vidéo 7.1 (ML simple) | Yasmine |
| ☐ | M8 — Cybersécu/DevOps | Vidéo 8.1 (Docker 1/3) | Yasmine |

> Si la génération IA renvoie une erreur, vérifie `GROQ_API_KEY` côté Render → Settings → Environment. En secours, recopie 5 questions manuelles depuis [plan-tests-isil.md](plan-tests-isil.md) section B (5 QCM clé en main par module y sont déjà rédigés).

---

## ÉTAPE 3 — Prosits & Projet (20 min)

### 3.1 PROSIT 1 — Sécuriser une appli web bancaire (M4 Réseaux/Sécu)

**Connexion** : `omar.isil.l3@fliplearn.dz`

Sidebar → **Prosits** → **« Créer un Prosit »**

| Champ | Valeur |
|---|---|
| Titre | `Sécuriser une application web bancaire` |
| Pitch | `Une banque algérienne lance son app web : analyser les risques OWASP et proposer une stratégie de défense.` |
| Cas d'entreprise | `BNA — Banque Nationale d'Algérie` |
| Mots-clés | `OWASP, XSS, SQLi, JWT, HTTPS, MFA, audit` |
| Cours associé | `Administration et Sécurité Réseaux` |
| Filière / Promotion | ISIL / L3 |
| Date Aller | 2026-05-06 |
| Date Retour | 2026-05-13 |
| Min/Max membres | 3 / 5 |
| Mode formation | Aléatoire |

**Énoncé** (à coller intégralement) :
```
Vous êtes embauchés comme consultants cybersécurité pour la BNA (Banque Nationale d'Algérie) qui s'apprête à lancer "BNA Online", sa nouvelle application web de banque à distance. L'application permettra aux clients de consulter leurs comptes, effectuer des virements, et demander des crédits.

Le directeur informatique vous demande :
1. D'identifier les 5 risques OWASP les plus critiques pour ce type d'application.
2. De proposer une stratégie de défense en profondeur (couches : réseau, applicatif, données).
3. De définir un plan de tests d'intrusion avant la mise en production.
4. De rédiger un guide de bonnes pratiques pour les développeurs.

Livrable attendu : un rapport de 10 pages + une présentation orale de 15 min devant le comité de pilotage.
```

**Objectifs d'apprentissage** :
```
Identifier les vulnérabilités web critiques selon OWASP
Concevoir une stratégie de défense multi-couches
Maîtriser les bonnes pratiques d'authentification (JWT, MFA)
Rédiger un rapport de sécurité professionnel
```

---

### 3.2 PROSIT 2 — Architecture e-commerce scalable (M5 Archi SI)

**Connexion** : `sami.isil.l3@fliplearn.dz`

| Champ | Valeur |
|---|---|
| Titre | `Architecture d'une plateforme e-commerce scalable` |
| Pitch | `Une startup vise 1M d'utilisateurs en 1 an : monolithe ou microservices ?` |
| Cas d'entreprise | `Yassir / Jumia (e-commerce MENA)` |
| Mots-clés | `microservices, monolithe, scalabilité, Docker, Kubernetes` |
| Cours associé | `Architecture des Systèmes d'Information` |
| Filière / Promotion | ISIL / L3 |
| Date Aller | 2026-05-06 |
| Date Retour | 2026-05-13 |
| Min/Max membres | 3 / 5 |

**Énoncé** :
```
Une startup algérienne, "ShopDZ", veut lancer une marketplace e-commerce panafricaine. Elle prévoit 1 million d'utilisateurs actifs mensuels d'ici 12 mois, avec des pics de trafic pendant le Ramadan et le Black Friday.

L'équipe technique débat : faut-il partir sur un monolithe (rapide à développer mais difficile à scaler) ou sur une architecture microservices (complexe mais évolutive) ?

Votre mission :
1. Analyser les besoins fonctionnels (catalogue, panier, paiement, livraison, recommandation).
2. Comparer monolithe vs microservices pour CE contexte précis.
3. Proposer une architecture cible avec justification (diagramme UML/C4).
4. Lister les outils DevOps à mettre en place (CI/CD, monitoring, déploiement).
5. Estimer les coûts cloud (AWS/GCP) sur 1 an.

Livrable : architecture document + diagramme + estimation budgétaire.
```

---

### 3.3 PROJET — Mini-LMS sécurisé (multi-modules)

**Connexion** : n'importe quel prof L3 (par exemple Yasmine)

Sidebar → **Projets** → **« Créer un projet »**

| Champ | Valeur |
|---|---|
| Type | Multi-modules (groupe) |
| Titre | `Mini-LMS sécurisé — Gestion de cours en ligne` |
| Description | `Développer une plateforme LMS minimale (cours, vidéos, QCM) sécurisée par JWT, déployée en cloud, avec CI/CD.` |
| Modules rattachés | M1 (UML) + M4 (Réseaux/Sécu) + M5 (Archi) + M8 (DevOps) |
| Mots-clés | `LMS, JWT, Docker, CI/CD, MongoDB, React, Express, OWASP` |
| Date début | 2026-05-05 |
| Date fin | 2026-06-05 |
| Date soutenance | 2026-06-10 |

**Énoncé** :
```
En groupe de 4 étudiants, développer un mini-LMS (Learning Management System) similaire à Moodle, mais centré sur :
- Authentification sécurisée (JWT + refresh token)
- Upload de vidéos (Cloudinary ou stockage local)
- QCM avec timer
- Tableau de bord étudiant + prof
- Pipeline CI/CD GitHub Actions → Docker → Render

Stack imposé : React + Node.js + MongoDB + Docker.

Contraintes :
- Couvrir l'OWASP Top 10 (XSS, SQLi, CSRF, JWT misuse)
- Tests unitaires + intégration (≥ 60% coverage)
- Documentation API (Swagger ou Postman)
- README qui permet à un évaluateur de lancer le projet en < 5 min

Livrables : code GitHub + démo déployée + rapport 15 pages + soutenance 20 min.
```

**Phases** (laisse les 6 par défaut ou édite) :
1. Spécifications & maquettes — 5 jours
2. Setup CI/CD + auth JWT — 5 jours
3. Backend API (cours, vidéos, QCM) — 7 jours
4. Frontend React — 7 jours
5. Tests + audit sécurité — 3 jours
6. Déploiement + soutenance — 3 jours

---

## ÉTAPE 4 — Test côté étudiant (30 min)

C'est le **vrai test fonctionnel**. Tu joues l'étudiant et tu valides chaque feature.

**Connexion** : `assil.isil.l3@fliplearn.dz` / `test1234`
(ou un étudiant frais comme `yacine.boudjedra.l3@fliplearn.dz` pour avoir 0% partout — démo plus crédible)

### 4.1 Mon Parcours — affichage des modules
- Sidebar → **Mon Parcours**
- ✅ Les **8 modules ISIL L3** apparaissent (4 S5 + 4 S6)
- ✅ Indicateur "préparation classe" visible (rouge / orange / vert)

### 4.2 Vidéo + flashcards auto
- Sidebar → **Mes cours** → ouvre par exemple **Cybersécurité & Cloud DevOps**
- Lance une vidéo (la 1ʳᵉ — Docker 1/3)
- Glisse le curseur jusqu'à 90 % pour gagner du temps
- ✅ À ~80 % un toast apparaît : **« Flashcards générées »**
- Sidebar → **Mes decks** → ✅ tu vois un deck auto-généré avec 5-10 cartes

### 4.3 QCM
- Reviens sur le cours → bouton **« QCM »** sous la vidéo
- Réponds aux 5 questions (au moins 1 correcte pour gagner des points)
- ✅ Score affiché à la fin + points ajoutés

### 4.4 Tuteur IA personnel
- Sidebar → **Mon tuteur IA** (ou bulle flottante en bas à droite)
- Question test 1 : `Explique-moi ce qu'est le XSS en 3 phrases`
- ✅ Réponse Groq en français en moins de 10 s
- Question test 2 : `Quelle est la différence entre monolithe et microservices ?`
- ✅ Réponse cohérente

### 4.5 Ask-the-video (RAG sur transcript)
- Reviens sur une vidéo (idéalement Docker 1/3, longue)
- Onglet **« Pose une question sur la vidéo »**
- Question : `Comment créer une image Docker ?`
- ✅ Réponse + timestamp cliquable qui replace la vidéo au bon moment

### 4.6 Prosit
- Sidebar → **Prosits** → ouvre **« Sécuriser application bancaire »**
- ✅ Phase **Aller** active
- Remplis 2-3 mots-clés
- (optionnel) ouvre un 2ᵉ onglet incognito avec `lina.benkhelifa.l3@fliplearn.dz` pour tester la formation de groupe

### 4.7 Projet
- Sidebar → **Projets** → ouvre **Mini-LMS sécurisé**
- ✅ Timeline avec 6 phases visible
- ✅ Tu peux uploader un livrable (test : un PDF random)

### 4.8 Chat temps réel
- Sidebar → **Chat** → choisis un autre étudiant ISIL L3
- Envoie un message — reçu en temps réel sur l'autre fenêtre

### 4.9 Leaderboard + badges
- Sidebar → **Classement** → ✅ tu apparais avec les points du QCM
- Profil → **Mes badges** → ✅ premiers badges débloqués

---

## CHECKLIST DE FIN

### Préparation
- [ ] App répond (https://fliplearn-5lsz.onrender.com)
- [ ] Liste utilisateurs admin : 4 profs ISIL L3 visibles
- [ ] Liste utilisateurs admin : 11 étudiants ISIL L3 visibles
- [ ] Liste cours admin : 8 modules ISIL L3 visibles

### Étape 1 — Vidéos (24)
- [ ] M1 Génie Logiciel — 3 vidéos uploadées
- [ ] M2 Systèmes d'Exploitation — 3 vidéos
- [ ] M3 Bases de Données — 3 vidéos
- [ ] M4 Réseaux — 3 vidéos
- [ ] M5 Architecture SI — 3 vidéos
- [ ] M6 Web & Mobile — 3 vidéos
- [ ] M7 IA & Data Mining — 3 vidéos
- [ ] M8 Cybersécu & DevOps — 3 vidéos

### Étape 2 — QCM (8)
- [ ] 1 QCM IA généré et sauvegardé par module

### Étape 3 — Pédagogie
- [ ] Prosit 1 (Sécu bancaire) créé
- [ ] Prosit 2 (Archi e-commerce) créé
- [ ] Projet (Mini-LMS) créé

### Étape 4 — Test étudiant
- [ ] Mon Parcours affiche les 8 modules
- [ ] Vidéo lue jusqu'à 80 % → flashcards auto OK
- [ ] Deck auto visible
- [ ] QCM répondu, score & points OK
- [ ] Tuteur IA répond < 10 s
- [ ] Ask-the-video retourne timestamp cliquable
- [ ] Prosit phase Aller modifiable
- [ ] Projet timeline + upload OK
- [ ] Chat temps réel OK
- [ ] Leaderboard à jour
- [ ] Au moins 1 badge débloqué

---

## DÉPANNAGE

### App ne répond pas / 502 / cold start
- Free tier Render dort après 15 min → premier appel 30-60 s
- Recharge 2-3 fois si erreur 502
- Statut Render : https://dashboard.render.com

### Compte ISIL L3 manquant ou base nettoyée
Re-lance le seed CLI (idempotent — pas de doublons) :
```bash
cd "C:\Users\assil\OneDrive\Documents\projet pfe\fliplearn\backend"
node scripts/seed-l3-isil.js
```
Pour vérifier l'état actuel :
```bash
node scripts/check-l3-isil.js
```

### Vidéo YouTube ne s'affiche pas
- L'URL doit être `https://www.youtube.com/watch?v=XXXX` ou `https://youtu.be/XXXX`
- Si la vidéo refuse l'embed (anti-pub), prends une autre vidéo de la même ligne du tableau
- Test rapide : ouvre l'URL en incognito, si elle joue elle marchera dans FlipLearn

### Génération IA QCM échoue
- Vérifier `GROQ_API_KEY` dans Render → Settings → Environment
- Plan B : recopier les 5 questions manuelles de [plan-tests-isil.md](plan-tests-isil.md) section B

### Flashcards auto pas générées à 80 %
- Le transcript Whisper + GPT-4o prend ~30 s après upload — attends un peu
- Vérifier `OPENAI_API_KEY` côté Render

### Tuteur IA ne répond pas
- Idem : `GROQ_API_KEY` côté Render
- Logs Render → cherche `chatbot.js` ou `429 too many requests`

### Mon Parcours vide chez l'étudiant
- Vérifier que l'étudiant est bien `filiere=ISIL` + `promotion=L3`
- Admin → Utilisateurs → ouvrir le compte → champs Filière/Promotion

### Reset complet
```bash
cd "C:\Users\assil\OneDrive\Documents\projet pfe\fliplearn\backend"
node scripts/seed-soutenance.js --reset
node scripts/seed-l3-isil.js
```

---

## RÉCAPITULATIF FINAL

Après le test, l'app contiendra :

| Entité | Quantité |
|---|---|
| Profs ISIL L3 | 4 |
| Étudiants ISIL L3 | 11 |
| Modules ISIL L3 | 8 (4 S5 + 4 S6) |
| Vidéos YouTube | 24 |
| QCM IA | 8 |
| Prosits | 2 |
| Projets | 1 |
| **Total** | **~58 entités** |

Largement de quoi tenir 20 min de démo pour la soutenance du 15 juin 2026.

---

> **Bonne chance pour le test.** Tout est cliquable, tout est testé. Si un truc bloque : F12 → Console → screenshot → on debug.
