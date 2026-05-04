# TUTO COMPLET — TEST FLIPLEARN L3 ISIL (DEMAIN)

> **Pour qui** : Mohamed Assil SERAY, L3 ISIL, EM Alger Business School
> **Quand** : Test complet de l'application — 05 mai 2026
> **App déployée** : https://fliplearn-5lsz.onrender.com
> **Durée estimée** : 1h45 (setup) + 30 min (test étudiant) = **~2h15**

Ce document est ton **plan de bataille unique** pour demain. Tout est ici : liens YouTube directs (déjà testés), comptes, étapes, dépannage. Pas besoin d'aller chercher ailleurs.

---

## SOMMAIRE

1. [PRÉPARATION (5 min)](#0-préparation-5-min)
2. [ÉTAPE 1 — Seed L3 ISIL en admin (2 min)](#étape-1--seed-l3-isil-en-admin-2-min)
3. [ÉTAPE 2 — Vidéos YouTube par module (45 min)](#étape-2--vidéos-youtube-par-module-45-min)
4. [ÉTAPE 3 — QCM générés par IA (15 min)](#étape-3--qcm-générés-par-ia-15-min)
5. [ÉTAPE 4 — Créer 2 Prosits + 1 Projet (20 min)](#étape-4--créer-2-prosits--1-projet-20-min)
6. [ÉTAPE 5 — Test côté étudiant (30 min)](#étape-5--test-côté-étudiant-30-min)
7. [CHECKLIST DE FIN DE TEST](#checklist-de-fin-de-test)
8. [DÉPANNAGE](#dépannage)

---

## 0. PRÉPARATION (5 min)

### 0.1 Réveiller l'app (free tier Render dort après 15 min)

1. Ouvre https://fliplearn-5lsz.onrender.com dans Chrome
2. Attends 30-60 s : la page de connexion FlipLearn doit s'afficher
3. Si tu vois une page d'erreur, recharge — Render réveille le service

### 0.2 Comptes à mémoriser (mot de passe partout : `test1234` sauf admin)

| Rôle | Email | Mot de passe |
|---|---|---|
| **Admin** | `admin@fliplearn.dz` | `admin1234` |
| **Toi (étudiant)** | `assil.isil.l3@fliplearn.dz` | `test1234` |
| Prof Tarek | `tarek.isil.l3@fliplearn.dz` | `test1234` |
| Prof Sami | `sami.isil.l3@fliplearn.dz` | `test1234` |
| Prof Yasmine | `yasmine.isil.l3@fliplearn.dz` | `test1234` |
| Prof Omar | `omar.isil.l3@fliplearn.dz` | `test1234` |

> **Astuce** : ouvre 4 fenêtres Chrome côte à côte en mode incognito pour switcher rapidement entre admin / prof / étudiant sans te déconnecter.

### 0.3 Onglets YouTube prêts

Garde un onglet YouTube ouvert dans une fenêtre normale. Tu y copieras les URLs directement (pas besoin de chercher : tous les liens sont fournis ci-dessous).

---

## ÉTAPE 1 — Seed L3 ISIL en admin (2 min)

1. Connecte-toi : `admin@fliplearn.dz` / `admin1234`
2. Sidebar gauche → **Utilisateurs** (ou URL : `/admin?section=users`)
3. En haut à droite, clique le bouton violet **« Seed L3 ISIL (démo) »**
4. Confirme la modale → attends ~5 s
5. Bandeau vert attendu : *« Seed L3 ISIL terminé : 3 profs, 10 étudiants, 8 modules. »*

✅ **Vérification** : tu dois maintenant voir dans la liste des utilisateurs les profs Tarek/Sami/Yasmine et 10 étudiants `*.l3@fliplearn.dz`.

> Le seed est **idempotent** — si tu cliques 2 fois, pas de doublons. Skip automatique des comptes existants.

---

## ÉTAPE 2 — Vidéos YouTube par module (45 min)

### Méthode universelle (pour chaque vidéo)

1. **Déconnecte-toi de l'admin** → connecte-toi avec **le prof concerné**
2. Sidebar → **Mes cours** → clique sur le module
3. Bouton **« Ajouter vidéo »** → onglet **« Ajouter depuis YouTube »**
4. Colle l'URL fournie ci-dessous → tape le titre → **Ajouter**

> **Astuce gain de temps** : ouvre les 3 URLs de la sous-section dans 3 onglets YouTube avant de switcher sur FlipLearn. Tu copies-colles à la chaîne.

---

### MODULE 1 — Génie Logiciel & UML (S5)
**Connexion prof** : `tarek.isil.l3@fliplearn.dz` / `test1234`

| # | Titre dans FlipLearn | Lien YouTube |
|---|---|---|
| 1.1 | Introduction au langage UML | https://www.youtube.com/watch?v=fpxjv5rwXc4 |
| 1.2 | Maîtriser l'UML — guide complet | https://www.youtube.com/watch?v=1LDWVJE5Ljo |
| 1.3 | POO et Design Pattern (cours 5) | https://www.youtube.com/watch?v=DK6vSUVfyug |

---

### MODULE 2 — Systèmes d'Exploitation Avancés (S5)
**Connexion prof** : `tarek.isil.l3@fliplearn.dz` (même prof que Module 1)

| # | Titre dans FlipLearn | Lien YouTube |
|---|---|---|
| 2.1 | Synchronisation de processus concurrents | https://www.youtube.com/watch?v=GzAJzGxjrI4 |
| 2.2 | Synchronisation des processus (cours SMI) | https://www.youtube.com/watch?v=Q5cqWeF9ldo |
| 2.3 | Linux — 10 astuces ligne de commande (Cocadmin) | https://www.youtube.com/watch?v=MAPbo8cNkJ8 |

---

### MODULE 3 — Bases de Données Avancées (S5)
**Connexion prof** : `sami.isil.l3@fliplearn.dz` / `test1234`

| # | Titre dans FlipLearn | Lien YouTube |
|---|---|---|
| 3.1 | Transactions ACID en base relationnelle | https://www.youtube.com/watch?v=dKcJrVuYjig |
| 3.2 | Apprendre MongoDB en 2 heures | https://www.youtube.com/watch?v=SjBWysPZpIU |
| 3.3 | Introduction à MongoDB (NoSQL) | https://www.youtube.com/watch?v=6wGYHrPMzUE |

---

### MODULE 4 — Administration et Sécurité Réseaux (S5)
**Connexion prof** : `omar.isil.l3@fliplearn.dz` / `test1234`

| # | Titre dans FlipLearn | Lien YouTube |
|---|---|---|
| 4.1 | Le modèle OSI et TCP/IP enfin facile | https://www.youtube.com/watch?v=darvsbHcchs |
| 4.2 | Comprendre les modèles OSI et TCP/IP | https://www.youtube.com/watch?v=26jazyc7VNk |
| 4.3 | Les VPN — comment ça marche | https://www.youtube.com/watch?v=cBBgcHU1HVM |

---

### MODULE 5 — Architecture des Systèmes d'Information (S6)
**Connexion prof** : `sami.isil.l3@fliplearn.dz` (même prof que BDD)

| # | Titre dans FlipLearn | Lien YouTube |
|---|---|---|
| 5.1 | Du Monolithe aux microservices (LeBonCoin) | https://www.youtube.com/watch?v=yah6zzpQu3s |
| 5.2 | Passer d'un monolithe à des microservices | https://www.youtube.com/watch?v=BPSd9MAg-6c |
| 5.3 | C'est quoi une API GraphQL ? | https://www.youtube.com/watch?v=GC8k7mAP464 |

---

### MODULE 6 — Développement Web et Mobile (S6)
**Connexion prof** : `omar.isil.l3@fliplearn.dz` (même prof que Réseaux)

| # | Titre dans FlipLearn | Lien YouTube |
|---|---|---|
| 6.1 | Apprendre React — Introduction (Grafikart) | https://www.youtube.com/watch?v=NT0s0aOHu0Q |
| 6.2 | Créer une API REST Node + Express + MongoDB | https://www.youtube.com/watch?v=TlfZUAZAadw |
| 6.3 | Flutter vs React Native — test de perfs | https://www.youtube.com/watch?v=pxalC4IZb4k |

---

### MODULE 7 — Intelligence Artificielle & Data Mining (S6)
**Connexion prof** : `yasmine.isil.l3@fliplearn.dz` / `test1234`

| # | Titre dans FlipLearn | Lien YouTube |
|---|---|---|
| 7.1 | Le Machine Learning expliqué simplement | https://www.youtube.com/watch?v=qgImjYWY9OQ |
| 7.2 | Le Deep Learning (Science Étonnante) | https://www.youtube.com/watch?v=trWrEWfhTVg |
| 7.3 | Comment les IA comprennent notre langue (NLP) | https://www.youtube.com/watch?v=CsQNF9s78Nc |

---

### MODULE 8 — Cybersécurité & Cloud DevOps (S6)
**Connexion prof** : `yasmine.isil.l3@fliplearn.dz` (même prof que IA)

| # | Titre dans FlipLearn | Lien YouTube |
|---|---|---|
| 8.1 | Docker — débuter de zéro (Cocadmin 1/3) | https://www.youtube.com/watch?v=SXB6KJ4u5vg |
| 8.2 | 10 ans de Docker en 20 min | https://www.youtube.com/watch?v=PUpgGtq0xSw |
| 8.3 | CI/CD avec GitHub Actions de A à Z | https://www.youtube.com/watch?v=VKKOuj19Tg4 |

---

**Bilan ÉTAPE 2** : à la fin tu auras **24 vidéos** réparties sur les 8 modules ISIL L3.

---

## ÉTAPE 3 — QCM générés par IA (15 min)

Pour chaque module, on crée **1 QCM** lié à la **première vidéo** (1.1, 2.1, 3.1, etc.) — soit 8 QCM au total. L'IA Groq (Llama 3.3) lit le titre + description et génère 5 questions QCM en français.

### Méthode (à répéter 8 fois)

1. Connecté avec le prof du module
2. Sidebar → **Gérer les QCM** (ou **QCM** selon ta version)
3. Bouton **« Créer un QCM »**
4. **Vidéo source** : choisir la 1ʳᵉ vidéo du module (ex. « Introduction au langage UML »)
5. Onglet **« Génération par IA »** → nombre de questions : **5**
6. Clique **« Générer avec l'IA »** → attends 5-10 s
7. Relis rapidement les questions (corrige une coquille si besoin)
8. Bouton **« Sauvegarder le QCM »**

### Tableau récapitulatif (à cocher au fur et à mesure)

| ☐ | Module | Vidéo source | Prof |
|---|---|---|---|
| ☐ | M1 — Génie Logiciel & UML | Vidéo 1.1 | Tarek |
| ☐ | M2 — Systèmes d'Exploitation | Vidéo 2.1 | Tarek |
| ☐ | M3 — Bases de Données | Vidéo 3.1 | Sami |
| ☐ | M4 — Réseaux | Vidéo 4.1 | Omar |
| ☐ | M5 — Architecture SI | Vidéo 5.1 | Sami |
| ☐ | M6 — Web & Mobile | Vidéo 6.1 | Omar |
| ☐ | M7 — IA & Data Mining | Vidéo 7.1 | Yasmine |
| ☐ | M8 — Cybersécurité & DevOps | Vidéo 8.1 | Yasmine |

⚠️ **Si la génération IA échoue** : message « clé Groq invalide » → vérifie `GROQ_API_KEY` dans Render → Settings → Environment. Sinon, fallback : crée le QCM manuellement avec 5 questions de [plan-tests-isil.md](plan-tests-isil.md) sections B (chaque module y a déjà 5 questions clé en main).

---

## ÉTAPE 4 — Créer 2 Prosits + 1 Projet (20 min)

### 4.1 PROSIT 1 — Sécuriser une application web bancaire (Module 4 — Réseaux/Sécu)

**Connexion** : `omar.isil.l3@fliplearn.dz`

Sidebar → **Prosits** → bouton **« Créer un Prosit »**

| Champ | Valeur à coller |
|---|---|
| Titre | `Sécuriser une application web bancaire` |
| Pitch (1 phrase) | `Une banque algérienne lance son app web : analyser les risques OWASP et proposer une stratégie de défense.` |
| Cas d'entreprise | `BNA — Banque Nationale d'Algérie` |
| Mots-clés | `OWASP, XSS, SQLi, JWT, HTTPS, MFA, audit` |
| Cours associé | `Administration et Sécurité Réseaux` |
| Filière | ISIL |
| Promotion | L3 |
| Date Aller | demain (2026-05-06) |
| Date Retour | 2026-05-13 |
| Min/Max membres | 3 / 5 |
| Mode formation | Aléatoire |

**Énoncé complet** (à coller dans le champ « Énoncé ») :
```
Vous êtes embauchés comme consultants cybersécurité pour la BNA (Banque Nationale d'Algérie) qui s'apprête à lancer "BNA Online", sa nouvelle application web de banque à distance. L'application permettra aux clients de consulter leurs comptes, effectuer des virements, et demander des crédits.

Le directeur informatique vous demande :
1. D'identifier les 5 risques OWASP les plus critiques pour ce type d'application.
2. De proposer une stratégie de défense en profondeur (couches : réseau, applicatif, données).
3. De définir un plan de tests d'intrusion avant la mise en production.
4. De rédiger un guide de bonnes pratiques pour les développeurs.

Livrable attendu : un rapport de 10 pages + une présentation orale de 15 min devant le comité de pilotage.
```

**Objectifs d'apprentissage** (1 par ligne) :
```
Identifier les vulnérabilités web critiques selon OWASP
Concevoir une stratégie de défense multi-couches
Maîtriser les bonnes pratiques d'authentification (JWT, MFA)
Rédiger un rapport de sécurité professionnel
```

---

### 4.2 PROSIT 2 — Architecture e-commerce scalable (Module 5 — Archi SI)

**Connexion** : `sami.isil.l3@fliplearn.dz`

| Champ | Valeur |
|---|---|
| Titre | `Architecture d'une plateforme e-commerce scalable` |
| Pitch | `Une startup vise 1M d'utilisateurs en 1 an : monolithe ou microservices ?` |
| Cas d'entreprise | `Yassir / Jumia (e-commerce MENA)` |
| Mots-clés | `microservices, monolithe, scalabilité, Docker, Kubernetes` |
| Cours associé | `Architecture des Systèmes d'Information` |
| Filière | ISIL / Promotion | L3 |
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

### 4.3 PROJET — Mini-LMS sécurisé (multi-modules)

**Connexion** : `yasmine.isil.l3@fliplearn.dz` (ou n'importe quel prof L3)

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

**Phases** (à laisser ou éditer) :
1. Spécifications & maquettes (5 jours)
2. Setup CI/CD + auth JWT (5 jours)
3. Backend API (cours, vidéos, QCM) (7 jours)
4. Frontend React (7 jours)
5. Tests + audit sécurité (3 jours)
6. Déploiement + soutenance (3 jours)

---

## ÉTAPE 5 — Test côté étudiant (30 min)

C'est le **vrai test fonctionnel**. Tu joues l'étudiant L3 ISIL et tu valides chaque feature.

**Connexion** : `assil.isil.l3@fliplearn.dz` / `test1234`
(ou un étudiant frais comme `yacine.boudjedra.l3@fliplearn.dz` pour avoir 0% partout — démo plus crédible)

### 5.1 Mon Parcours (CAI) — vérifier l'affichage des modules
- Sidebar → **Mon Parcours**
- ✅ Tu dois voir les **8 modules ISIL L3** (4 S5 + 4 S6) avec indicateur de préparation
- ✅ Les modules S6 (Architecture, Web/Mobile, IA, DevOps) sont marqués "semestre courant"

### 5.2 Visionner une vidéo + flashcards auto
- Sidebar → **Mes cours** → ouvre **Sécurité Informatique** (ou Cybersécurité)
- Clique sur une vidéo (ex. Docker — débuter de zéro)
- Lance la lecture, **scrub à 90%** (déplace le curseur en avant pour gagner du temps)
- ✅ À 80% : un toast doit apparaître **« Flashcards générées »**
- Sidebar → **Mes decks** → ouvre le deck auto-généré
- ✅ Tu dois voir 5-10 cartes (front/back) basées sur le transcript de la vidéo

### 5.3 Faire un QCM
- Retour sur le cours → bouton **« QCM »** sous la vidéo
- Réponds aux 5 questions (au moins 1 juste pour gagner des points)
- ✅ À la fin : score affiché + points ajoutés (gamification)

### 5.4 Tuteur IA personnel
- Sidebar → **Mon tuteur IA** (ou bulle flottante en bas à droite)
- Question test : `Explique-moi ce qu'est le XSS en 3 phrases`
- ✅ Réponse Groq en français en ~5 s
- 2ᵉ test : `Quelle est la différence entre monolithe et microservices ?`
- ✅ Réponse cohérente, pas de hallucinations

### 5.5 Ask-the-video (RAG sur transcript)
- Reviens sur une vidéo (idéalement une longue genre Docker 1/3)
- Trouve l'onglet **« Pose une question sur la vidéo »**
- Question : `Comment créer une image Docker ?`
- ✅ Réponse + timestamp cliquable qui te ramène au bon moment de la vidéo

### 5.6 Prosit en groupe
- Sidebar → **Prosits** → ouvre **« Sécuriser application bancaire »**
- ✅ Tu vois la phase **Aller** active
- Remplis 2-3 mots-clés dans le champ
- Si tu veux tester la formation de groupe : ouvre un 2ᵉ onglet incognito avec `lina.benkhelifa.l3@fliplearn.dz`, demande à rejoindre

### 5.7 Projet timeline
- Sidebar → **Projets** → ouvre **Mini-LMS sécurisé**
- ✅ Timeline visible avec 6 phases
- ✅ Possibilité d'uploader un livrable (test : un PDF random)

### 5.8 Chat temps réel
- Sidebar → **Chat** → choisis un autre étudiant L3 ISIL
- Envoie un message — l'autre doit le recevoir en temps réel
- (à tester avec 2 onglets/fenêtres)

### 5.9 Leaderboard + badges
- Sidebar → **Classement**
- ✅ Tu apparais avec les points gagnés au QCM
- Sidebar → **Mes badges** ou profil → ✅ tes premiers badges débloqués

---

## CHECKLIST DE FIN DE TEST

Coche au fur et à mesure pour valider que **tout** marche :

### Setup
- [ ] App répond (https://fliplearn-5lsz.onrender.com)
- [ ] Seed L3 ISIL exécuté avec succès
- [ ] 3 nouveaux profs visibles dans la liste
- [ ] 10 nouveaux étudiants visibles
- [ ] 8 modules ISIL L3 créés

### Vidéos (24 au total)
- [ ] M1 — Génie Logiciel : 3 vidéos uploadées
- [ ] M2 — Systèmes d'Exploitation : 3 vidéos
- [ ] M3 — Bases de Données : 3 vidéos
- [ ] M4 — Réseaux : 3 vidéos
- [ ] M5 — Architecture SI : 3 vidéos
- [ ] M6 — Web & Mobile : 3 vidéos
- [ ] M7 — IA & Data Mining : 3 vidéos
- [ ] M8 — Cybersécurité & DevOps : 3 vidéos

### QCM (8 au total)
- [ ] 1 QCM par module généré par IA et sauvegardé

### Pédagogie
- [ ] 2 Prosits créés (Sécu bancaire + Archi e-commerce)
- [ ] 1 Projet créé (Mini-LMS)

### Test étudiant
- [ ] Mon Parcours affiche bien les 8 modules
- [ ] Vidéo lue jusqu'à 80% → flashcards auto-générées
- [ ] Deck auto visible dans Mes decks
- [ ] QCM répondu, score et points OK
- [ ] Tuteur IA répond en moins de 10 s
- [ ] Ask-the-video retourne timestamp cliquable
- [ ] Prosit phase Aller modifiable
- [ ] Projet timeline + upload livrable OK
- [ ] Chat temps réel fonctionnel
- [ ] Leaderboard mis à jour
- [ ] Au moins 1 badge débloqué

---

## DÉPANNAGE

### L'app ne répond pas / 502 / cold start
- Free tier Render dort après 15 min → premier appel = 30-60 s d'attente
- Recharge la page 2-3 fois si erreur 502
- Si toujours pas : vérifie le statut sur https://dashboard.render.com (côté admin Render)

### Le bouton « Seed L3 ISIL » fait rien
1. Vérifie que tu es bien admin (pas étudiant)
2. F12 → onglet **Network** → clique le bouton → regarde l'appel `POST /api/admin/seed/l3-isil`
3. Si **401/403** : reconnecte-toi en admin
4. Si **500** : regarde le message d'erreur dans le bandeau rouge ou les logs Render

### La vidéo YouTube ne s'affiche pas
- L'URL doit être au format `https://www.youtube.com/watch?v=XXXX` ou `https://youtu.be/XXXX`
- Certaines vidéos ont un blocage d'embed (anti-pub) → essaie une autre vidéo de la liste
- Tu peux aussi tester l'URL dans un onglet incognito YouTube — si ça lit, ça marchera dans FlipLearn

### Génération IA QCM échoue
- Vérifier `GROQ_API_KEY` dans Render → Settings → Environment
- Plan B : QCM manuels — recopie les 5 questions clé en main de [plan-tests-isil.md](plan-tests-isil.md) sections B

### Flashcards auto pas générées à 80%
- Vérifie que la vidéo est bien analysée (transcript généré). Sinon, attends ~30 s après upload pour que `videoAnalyzer.js` (Whisper + GPT-4o) finisse
- Vérifie `OPENAI_API_KEY` côté Render

### Tuteur IA ne répond pas
- Idem : `GROQ_API_KEY` côté Render
- Logs Render → cherche `chatbot.js` ou `429 too many requests`

### Mon Parcours vide chez l'étudiant
- Vérifier que l'étudiant est bien `filiere=ISIL` + `promotion=L3` dans la base
- Admin → Utilisateurs → ouvrir le compte → vérifier les champs

### Reset complet si besoin
```bash
# Sur ton PC, dans le dossier fliplearn/
node backend/scripts/seed-soutenance.js --reset
```
Puis re-clique le bouton « Seed L3 ISIL » côté admin.

---

## RÉCAPITULATIF FINAL

| Entité | Quantité après le test |
|---|---|
| Profs ISIL L3 | 4 (Tarek, Sami, Yasmine, Omar) |
| Étudiants ISIL L3 | 11 (toi + 10 seedés) |
| Modules ISIL L3 | 8 (4 S5 + 4 S6) |
| Vidéos YouTube | **24** |
| QCM générés par IA | **8** |
| Prosits | 2 |
| Projets | 1 |
| **Volume total créé** | **~50 entités** |

**Démo soutenance prête.** Avec ce setup + ton mémoire en cours, tu auras de quoi tenir 20 min de démo facilement le 15 juin.

---

> **Bonne chance pour le test demain, Assil. Tout est cliquable, tout est testé. Si un truc bloque, F12 → Console → screenshot → on debug.**
