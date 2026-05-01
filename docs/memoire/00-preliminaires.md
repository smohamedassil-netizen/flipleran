# 00 — Pages préliminaires

> Pages qui précèdent le corps du mémoire. À insérer dans le `.docx` final via `generate_memoire.py` (pagination en chiffres romains : I, II, III…).

---

## Page de garde

```
RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE
MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE SCIENTIFIQUE

École des Hautes Études Commerciales — EM Alger Business School
Département des Systèmes d'Information
Spécialité : Ingénierie des Systèmes d'Information et du Logiciel (ISIL)

────────────────────────────────────────────────

MÉMOIRE DE FIN D'ÉTUDES
en vue de l'obtention du diplôme de Licence en Informatique

Thème :

  ╔═══════════════════════════════════════════════════════════════╗
  ║                                                               ║
  ║   FlipLearn : Conception et réalisation d'un système          ║
  ║   d'information web pour l'apprentissage inversé              ║
  ║   avec gamification et intelligence artificielle              ║
  ║                                                               ║
  ╚═══════════════════════════════════════════════════════════════╝

Réalisé par :                              Encadré par :
M. Mohamed Assil SERAY                     Mme Sana KOUCHI

Promotion 2025 / 2026
```

---

## Dédicace

> *À mes parents, pour leur soutien indéfectible tout au long de mes études et pour avoir cru en moi quand je doutais moi-même.*
>
> *À mes frères et sœurs, pour leur présence et leur encouragement.*
>
> *À mes professeurs, en particulier mon encadrante Mme Sana KOUCHI, qui m'ont transmis non seulement des connaissances mais aussi le goût d'apprendre.*
>
> *À mes camarades de la promotion ISIL 2025-2026, dont les retours et l'amitié ont accompagné chaque étape de ce projet.*
>
> *À toutes celles et ceux qui croient qu'on peut transformer l'enseignement, même modestement, en partant de l'expérience étudiante elle-même.*
>
> Mohamed Assil SERAY

---

## Remerciements

Au terme de ce travail, je tiens à exprimer ma profonde gratitude à toutes les personnes qui ont contribué, de près ou de loin, à la réalisation de ce mémoire de fin d'études.

Je remercie tout d'abord **Mme Sana KOUCHI**, mon encadrante, pour la qualité de son accompagnement, la pertinence de ses retours méthodologiques et la confiance qu'elle m'a accordée tout au long de ce projet. Ses conseils avisés ont été déterminants pour structurer une démarche aussi ambitieuse.

Mes remerciements s'adressent également à l'ensemble du corps professoral de **l'EM Alger Business School**, et plus particulièrement au **département des Systèmes d'Information**, pour la qualité de la formation reçue durant ces trois années de Licence en Ingénierie des Systèmes d'Information et du Logiciel (ISIL).

Je remercie chaleureusement les **camarades de la promotion 2025-2026** qui ont accepté de tester FlipLearn, de remplir les questionnaires d'évaluation utilisateur, et de partager leurs retours critiques. Leurs verbatim ont nourri les itérations successives de la plateforme et donnent à ce travail son ancrage empirique.

Je tiens enfin à remercier ma **famille** pour son soutien constant, sa patience face aux longues nuits de développement, et la confiance qu'elle m'a témoignée tout au long de ce parcours.

---

## Résumé

Ce mémoire présente la conception et la réalisation de **FlipLearn**, un système d'information web destiné aux établissements d'enseignement supérieur algériens, visant à opérationnaliser le modèle pédagogique de la classe inversée (Bergmann & Sams, 2012) à grande échelle.

Le projet propose un cadre conceptuel original — le **Cycle d'Apprentissage Inversé (CAI)** — articulant en cinq étapes obligatoires l'ensemble des activités pédagogiques d'un module : *Préparation* (visionnage de vidéos courtes assorties de QCM auto-correctifs), *Rendez-vous* présentiel ciblé sur les blocages détectés, *Application* en groupe via la méthode des Prosits CESI/APP, *Production* d'un livrable original, et *Consolidation* par révision espacée (algorithme SM-2 de Wozniak, 1990) assistée d'un tuteur IA personnel.

L'architecture technique repose sur une stack JavaScript moderne (React 18, Node.js, MongoDB Atlas, Socket.io) et intègre sept agents d'intelligence artificielle générative basés sur le modèle Llama-3.3-70B (via Groq), Whisper (transcription audio) et GPT-4o (analyse vidéo). Ces agents automatisent la préparation des cours par les enseignants, le tutorat personnalisé des étudiants, la génération de questionnaires, la détection de plagiat IA, et la production d'insights pédagogiques.

L'approche méthodologique mobilise dix-huit références scientifiques en sciences de l'éducation, allant de l'alignement constructif (Biggs, 1996) à la théorie de l'autodétermination (Deci & Ryan, 1985), en passant par le peer assessment (Topping, 1998 ; Falchikov, 2005). L'évaluation a été conduite à la fois par des tests automatisés ciblés et par un protocole de tests utilisateurs menés auprès de cinq étudiants L3 ISIL et d'une enseignante.

FlipLearn démontre qu'il est possible, dans les contraintes d'un projet de fin d'études et avec un budget marginal nul (services gratuits Groq, Render, Cloudinary), de produire une plateforme d'apprentissage qui rivalise fonctionnellement avec les solutions commerciales tout en étant explicitement adaptée au contexte universitaire algérien : connectivité 3G/4G, classes denses (50+ étudiants), absence d'équipement numérique en présentiel, valorisation culturelle de la régularité.

**Mots-clés** : classe inversée, cycle d'apprentissage inversé, intelligence artificielle pédagogique, gamification, méthode CESI/APP, taxonomie de Bloom, Algérie, EM Alger, React, Node.js, MongoDB, Llama-3.3, Groq.

---

## Abstract

This dissertation presents the design and implementation of **FlipLearn**, a web-based information system targeting Algerian higher education institutions, aiming to operationalize the flipped classroom model (Bergmann & Sams, 2012) at scale.

The project introduces an original conceptual framework — the **Inverted Learning Cycle (ILC)** — articulating in five mandatory steps the full set of pedagogical activities of a course module: *Preparation* (short videos with auto-corrected MCQs), targeted *Rendezvous* in classroom focused on detected blockers, *Application* in groups via the CESI/PBL Prosit method, *Production* of an original deliverable, and *Consolidation* through spaced repetition (Wozniak's SM-2 algorithm, 1990) assisted by a personal AI tutor.

The technical architecture relies on a modern JavaScript stack (React 18, Node.js, MongoDB Atlas, Socket.io) and integrates seven generative AI agents based on the Llama-3.3-70B model (via Groq), Whisper (audio transcription), and GPT-4o (video analysis). These agents automate course preparation for teachers, personalized tutoring for students, quiz generation, AI plagiarism detection, and pedagogical insights generation.

The methodological approach mobilizes eighteen scientific references in educational sciences, ranging from constructive alignment (Biggs, 1996) to self-determination theory (Deci & Ryan, 1985), through peer assessment (Topping, 1998; Falchikov, 2005). Evaluation was conducted through both targeted automated tests and a user-testing protocol with five L3 ISIL students and one teacher.

FlipLearn demonstrates that it is possible, within the constraints of a graduation project and with effectively zero marginal cost (free Groq, Render, Cloudinary tiers), to deliver a learning platform that functionally rivals commercial solutions while being explicitly adapted to the Algerian university context: 3G/4G connectivity, dense classrooms (50+ students), absence of digital equipment in classroom, cultural valuation of regularity.

**Keywords**: flipped classroom, inverted learning cycle, educational AI, gamification, CESI/PBL method, Bloom's taxonomy, Algeria, EM Algiers, React, Node.js, MongoDB, Llama-3.3, Groq.

---

## Table des matières

```
Dédicace ...................................................... I
Remerciements ................................................. II
Résumé ........................................................ III
Abstract ...................................................... IV
Table des matières ............................................ V
Liste des figures ............................................. VIII
Liste des tableaux ............................................ IX
Liste des abréviations ........................................ X

INTRODUCTION GÉNÉRALE ......................................... 1

CHAPITRE 1 — INTRODUCTION ..................................... 4
  1.1 Contexte ............................................... 4
  1.2 Revue de la littérature ................................ 6
    1.2.1 La classe inversée (Bergmann & Sams, 2012) ........ 6
    1.2.2 Alignement constructif (Biggs, 1996) .............. 7
    1.2.3 Apprentissage par problème (Barrows, méthode CESI)  8
    1.2.4 Évaluation par les pairs (Topping ; Falchikov) .... 9
    1.2.5 Mémorisation et révision espacée (Wozniak, 1990) .. 10
    1.2.6 Apports de l'IA générative en éducation (2024-2026) 11
    1.2.7 Plateformes existantes et limites ................. 12
  1.3 Problématique ......................................... 13
  1.4 Objectifs et orientation de la recherche ............... 14
  1.5 Approche méthodologique ................................ 15
  1.6 Structure du mémoire ................................... 16

CHAPITRE 2 — TECHNOLOGIES APPLIQUÉES .......................... 18
  2.1 Outils de développement ................................ 18
  2.2 Front-end (React 18, Vite, Tailwind CSS) ............... 20
  2.3 Back-end (Node.js, Express, Socket.io) ................. 22
  2.4 Base de données (MongoDB Atlas, Mongoose) .............. 24
  2.5 Agents d'intelligence artificielle ..................... 26
  2.6 Hébergement et déploiement (Cloudinary, Render, Vercel)  30
  2.7 Synthèse de la stack technique ......................... 32

CHAPITRE 3 — ANALYSE DU SYSTÈME ............................... 33
  3.1 Acteurs du système ..................................... 33
  3.2 Exigences fonctionnelles ............................... 35
  3.3 Exigences non fonctionnelles ........................... 38
  3.4 Cas d'utilisation principaux (UML) ..................... 40

CHAPITRE 4 — CONCEPTION DU SYSTÈME ............................ 43
  4.1 Architecture globale (trois couches) ................... 43
  4.2 Modèle de données (25 collections MongoDB) ............. 46
  4.3 Schéma pédagogique : le Cycle d'Apprentissage Inversé .. 50
  4.4 Diagrammes UML (séquence, classes, déploiement) ........ 53
  4.5 Design des interfaces utilisateur ...................... 56

CHAPITRE 5 — RÉSULTATS ........................................ 58
  5.1 Interface étudiant ..................................... 58
  5.2 Interface professeur ................................... 62
  5.3 Interface administrateur ............................... 65
  5.4 Workflow démontré : parcours type complet .............. 67
  5.5 Métriques d'usage observées ............................ 69

CHAPITRE 6 — TESTS SYSTÈME .................................... 70
  6.1 Stratégie de tests ..................................... 70
  6.2 Tests automatisés (smoke tests) ........................ 72
  6.3 Tests utilisateurs (protocole + résultats) ............. 74
  6.4 Métriques de qualité ................................... 76

CHAPITRE 7 — CONCLUSION ....................................... 77
  7.1 Bilan du travail ....................................... 77
  7.2 Limites identifiées .................................... 79
  7.3 Perspectives d'évolution ............................... 80

RÉFÉRENCES BIBLIOGRAPHIQUES ................................... 82
ANNEXES ....................................................... 84
```

---

## Liste des figures (à compléter au fil de la rédaction)

```
Figure 1.1  Le triangle pédagogique de Houssaye .................. 6
Figure 1.2  La taxonomie de Bloom révisée (Anderson & Krathwohl)  8
Figure 1.3  Comparatif Moodle / Coursera / FlipLearn ............ 13
Figure 2.1  Stack technique FlipLearn — vue d'ensemble .......... 19
Figure 2.2  Flux des appels Groq dans le service Auto-prep ...... 28
Figure 4.1  Architecture trois couches ......................... 44
Figure 4.2  ERD des 25 collections MongoDB .................... 47
Figure 4.3  Le Cycle d'Apprentissage Inversé (5 étapes) ....... 51
Figure 4.4  Diagramme de séquence — Pulse Préparation ......... 54
Figure 5.1  Page « Mon Parcours » côté étudiant ............... 59
Figure 5.2  Page « Préparation classe » côté professeur ........ 63
Figure 5.3  Dashboard administrateur — vue d'ensemble .......... 66
Figure 6.1  Pyramide de tests inversée pour un PFE solo ........ 71
```

---

## Liste des tableaux

```
Tableau 1.1  Plateformes e-learning concurrentes — comparatif ... 12
Tableau 2.1  Stack technique complète — résumé ................. 32
Tableau 3.1  Acteurs et permissions du système ................. 34
Tableau 3.2  Exigences fonctionnelles principales .............. 36
Tableau 4.1  Les 25 collections MongoDB regroupées par domaine  48
Tableau 4.2  Pondération des étapes du Cycle d'Apprentissage ... 52
Tableau 6.1  Résultats des tests utilisateurs (5 étudiants) ... 75
Tableau 7.1  Synthèse des contributions du projet .............. 78
```

---

## Liste des abréviations

| Sigle | Signification |
|---|---|
| **API** | Application Programming Interface |
| **APP** | Apprentissage Par Problème |
| **CAI** | Cycle d'Apprentissage Inversé |
| **CESI** | École d'Ingénieurs (méthodologie pédagogique de référence pour l'APP) |
| **CRUD** | Create, Read, Update, Delete |
| **CSS** | Cascading Style Sheets |
| **EM Alger** | École des Hautes Études Commerciales — Alger Business School |
| **ERD** | Entity Relationship Diagram |
| **HTML** | HyperText Markup Language |
| **HTTP / HTTPS** | HyperText Transfer Protocol (Secure) |
| **IA** | Intelligence Artificielle |
| **ISIL** | Ingénierie des Systèmes d'Information et du Logiciel |
| **JSON** | JavaScript Object Notation |
| **JWT** | JSON Web Token |
| **LLM** | Large Language Model |
| **MCQ / QCM** | Multiple Choice Question / Questionnaire à Choix Multiples |
| **MVP** | Minimum Viable Product |
| **NoSQL** | Not Only SQL |
| **PFE** | Projet de Fin d'Études |
| **RAG** | Retrieval-Augmented Generation |
| **REST** | Representational State Transfer |
| **SM-2** | SuperMemo 2 (algorithme de révision espacée — Wozniak, 1990) |
| **SPA** | Single Page Application |
| **UI / UX** | User Interface / User Experience |
| **UML** | Unified Modeling Language |
| **URL** | Uniform Resource Locator |

---

## Introduction générale

L'enseignement supérieur algérien fait face, depuis le début des années 2020, à une triple injonction qui en redessine les contours. La massification des effectifs étudiants — l'EM Alger Business School accueille plusieurs milliers d'inscrits sur ses trois filières (ISIL, Management, Finance & Comptabilité) — pousse mécaniquement les amphithéâtres et les salles de TD vers leurs limites de capacité, tandis que la généralisation progressive des outils numériques transforme les attentes des étudiants comme des enseignants. Dans le même temps, les retours d'expérience accumulés depuis la pandémie de COVID-19 ont rendu visible une vérité longtemps occultée : le cours magistral en présentiel, lorsqu'il se résume à la transmission d'informations, peut être avantageusement remplacé par un dispositif hybride combinant ressources préenregistrées et présentiel à forte valeur ajoutée. C'est précisément la promesse de la **classe inversée**, modèle pédagogique formalisé par Jonathan Bergmann et Aaron Sams dès 2012, qui propose d'inverser la logique habituelle : transmission du contenu à la maison, exploitation du temps en classe pour la pratique, le débat, la résolution de problèmes — bref, pour ce que la machine ne sait pas encore faire.

Pour autant, la classe inversée demeure largement sous-implémentée dans les universités algériennes. Les raisons en sont multiples et bien documentées : absence d'outils numériques intégrés au-delà du dépôt de fichiers (Moodle), faible engagement étudiant lorsque le visionnage des vidéos n'est ni mesuré ni récompensé, difficulté pour l'enseignant de savoir, à l'arrivée en classe, qui a réellement préparé la séance et qui ne l'a pas fait. Les solutions commerciales internationales (Coursera, Khan Academy, Edpuzzle) répondent en partie à ces enjeux, mais peinent à s'adapter au contexte local : tarifs prohibitifs pour un déploiement à grande échelle, absence de prise en compte des particularités pédagogiques nationales (méthodologies CESI/APP des écoles d'ingénieurs francophones, par exemple), interface mal optimisée pour les conditions de connectivité algériennes (3G/4G prédominantes hors Alger).

C'est dans cet écart entre l'ambition pédagogique et l'outillage disponible que s'inscrit le présent travail. **FlipLearn** se veut une réponse opérationnelle : une plateforme web complète, conçue dès l'origine pour l'enseignement supérieur algérien, intégrant non seulement les briques attendues d'un système e-learning moderne (vidéos, QCM, forums, gestion de cours) mais surtout un cadre conceptuel original — le **Cycle d'Apprentissage Inversé (CAI)** — qui articule en cinq étapes obligatoires l'ensemble du parcours pédagogique d'un module. Le tout est augmenté de sept agents d'intelligence artificielle générative — rendus économiquement viables par l'avènement, en 2024-2025, des modèles de langage open-source servis en mode rapide via l'infrastructure Groq — qui automatisent les tâches les plus chronophages pour l'enseignant (préparation de cours, génération de questionnaires, suivi des étudiants en difficulté) tout en offrant à l'étudiant un tuteur personnel disponible vingt-quatre heures sur vingt-quatre.

Ce mémoire restitue le travail accompli sur l'année universitaire 2025-2026. Le **Chapitre 1** établit le contexte du projet, en restitue les fondements théoriques par une revue de la littérature en sciences de l'éducation (de Bergmann et Sams à Deci et Ryan, en passant par Bloom révisé, Vygotsky et Mazur), formule la problématique spécifique adressée et précise les objectifs poursuivis. Le **Chapitre 2** détaille la stack technique mobilisée, des outils de développement (Git, VS Code, Claude Code) jusqu'aux services d'IA (Groq, OpenAI Whisper, GPT-4o), en passant par les choix d'architecture front-end (React 18, Vite) et back-end (Node.js, Express, MongoDB Atlas). Le **Chapitre 3** analyse le système sous l'angle des exigences fonctionnelles et non fonctionnelles, en identifiant les trois acteurs principaux (étudiant, professeur, administrateur) et leurs cas d'utilisation. Le **Chapitre 4** présente la conception détaillée du système : architecture en trois couches, modèle de données (vingt-cinq collections MongoDB regroupées en six domaines), schéma pédagogique du Cycle d'Apprentissage Inversé, diagrammes UML et design des interfaces. Le **Chapitre 5** documente les résultats obtenus, illustrés par les principales interfaces des trois rôles utilisateurs et par un workflow type démontrant la circulation de l'information à travers les cinq étapes du CAI. Le **Chapitre 6** rend compte de la stratégie de tests (mêlant tests automatisés ciblés et tests utilisateurs avec cinq étudiants et une enseignante) et présente les métriques de qualité obtenues. Enfin, le **Chapitre 7** dresse le bilan critique du travail réalisé, identifie honnêtement les limites du projet et trace plusieurs pistes d'évolution post-soutenance.

Ce document s'adresse à un triple lectorat : le **jury de soutenance** auquel revient l'évaluation académique du travail, l'**équipe pédagogique de l'EM Alger** susceptible de s'approprier la plateforme pour ses propres modules, et plus largement la **communauté éducative francophone** intéressée par les pratiques de classe inversée à l'échelle universitaire. Il vise à concilier la rigueur académique attendue d'un mémoire de Licence avec la lisibilité d'un retour d'expérience opérationnel, en assumant une posture explicite : ne pas dissimuler les compromis et limites du projet, mais au contraire en faire le matériau d'une réflexion sur ce que peut produire un étudiant seul, en quelques mois, lorsqu'il met les outils contemporains au service d'une intuition pédagogique solide.
