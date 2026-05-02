# PLAN L3 ISIL — Données riches pour démo

Tout le contenu créé en **un clic admin** : 3 profs + 10 étudiants + 8 modules avec semestre. Tu n'as plus qu'à **uploader les vidéos YouTube** dans chaque module.

---

## ÉTAPE 1 — Lancer le seed (1 minute)

1. Connecte-toi en admin : `admin@fliplearn.dz` / `admin1234`
2. Va dans **Utilisateurs** (sidebar → Utilisateurs ou `/admin?section=users`)
3. Clique sur le bouton violet **« Seed L3 ISIL (démo) »** (en haut à droite, à côté de "Créer un utilisateur")
4. Confirme la modale → attends ~5 s
5. Tu verras un bandeau vert : *« Seed L3 ISIL terminé : 3 profs, 10 étudiants, 8 modules. »*

Tu peux relancer plusieurs fois sans risque (idempotent).

---

## ÉTAPE 2 — Vérifier ce qui a été créé

### Les 3 nouveaux profs (mot de passe : `test1234`)

| Email | Nom | Modules enseignés |
|---|---|---|
| `tarek.isil.l3@fliplearn.dz` | Tarek **Mansouri** | Génie Logiciel & UML (S5) + Systèmes d'Exploitation Avancés (S5) |
| `sami.isil.l3@fliplearn.dz` | Sami **Hadj** | Bases de Données Avancées (S5) + Architecture des SI (S6) |
| `yasmine.isil.l3@fliplearn.dz` | Yasmine **Khelifi** | IA & Data Mining (S6) + Cybersécurité & Cloud DevOps (S6) |

**+ Omar Saadi** (déjà seedé) garde : Administration Réseaux (S5) + Développement Web/Mobile (S6).

### Les 10 nouveaux étudiants (mot de passe : `test1234`)

#### Semestre 5 (1er semestre L3)
1. `yacine.boudjedra.l3@fliplearn.dz` — Yacine Boudjedra
2. `lina.benkhelifa.l3@fliplearn.dz` — Lina Benkhelifa
3. `mohamed.larbi.l3@fliplearn.dz` — Mohamed Larbi
4. `sarah.bouzid.l3@fliplearn.dz` — Sarah Bouzid
5. `adel.bouhabel.l3@fliplearn.dz` — Adel Bouhabel

#### Semestre 6 (2e semestre L3)
6. `imane.rahmoun.l3@fliplearn.dz` — Imane Rahmoun
7. `karim.saidi.l3@fliplearn.dz` — Karim Saidi
8. `hanae.mokhtari.l3@fliplearn.dz` — Hanae Mokhtari
9. `anis.bouchama.l3@fliplearn.dz` — Anis Bouchama
10. `selma.djebbar.l3@fliplearn.dz` — Selma Djebbar

### Les 8 modules

| # | Module | Sem. | Prof |
|---|---|---|---|
| 1 | Génie Logiciel & UML | S5 | Tarek Mansouri |
| 2 | Systèmes d'Exploitation Avancés | S5 | Tarek Mansouri |
| 3 | Bases de Données Avancées | S5 | Sami Hadj |
| 4 | Administration et Sécurité Réseaux | S5 | Omar Saadi |
| 5 | Architecture des Systèmes d'Information | S6 | Sami Hadj |
| 6 | Développement Web et Mobile | S6 | Omar Saadi |
| 7 | Intelligence Artificielle & Data Mining | S6 | Yasmine Khelifi |
| 8 | Cybersécurité & Cloud DevOps | S6 | Yasmine Khelifi |

---

## ÉTAPE 3 — Uploader les vidéos YouTube par module

Pour chaque module, voici **3 vidéos YouTube en français** à ajouter. La méthode :

1. Connecte-toi avec le **prof concerné** (cf. tableau ci-dessus)
2. Sidebar → **Mes cours** → ouvre le module
3. Bouton **« Ajouter vidéo »** → onglet **« Ajouter depuis YouTube »**
4. Pour chaque vidéo : ouvre la recherche YouTube ci-dessous → copie l'URL de la 1ʳᵉ vidéo qui apparaît → colle dans FlipLearn → renseigne le titre → **« Ajouter »**

> 💡 **Astuce** : pour aller vite, ouvre 3 onglets YouTube en parallèle, copie les 3 URLs, et colle-les rapidement dans FlipLearn.

---

### MODULE 1 — Génie Logiciel & UML
**Connecte-toi en :** `tarek.isil.l3@fliplearn.dz`

| # | Titre dans FlipLearn | Recherche YouTube |
|---|---|---|
| 1.1 | Introduction au Génie Logiciel | `génie logiciel cours français` |
| 1.2 | Diagrammes UML expliqués | `UML diagramme classe français` |
| 1.3 | Patrons de conception (Design Patterns) | `design patterns français Grafikart` |

---

### MODULE 2 — Systèmes d'Exploitation Avancés
**Connecte-toi en :** `tarek.isil.l3@fliplearn.dz` (même prof)

| # | Titre | Recherche YouTube |
|---|---|---|
| 2.1 | Concurrence et synchronisation | `processus thread français cours` |
| 2.2 | Gestion mémoire (pagination) | `pagination mémoire système français` |
| 2.3 | Linux pour les développeurs | `Linux tutoriel français Cocadmin` |

---

### MODULE 3 — Bases de Données Avancées
**Connecte-toi en :** `sami.isil.l3@fliplearn.dz`

| # | Titre | Recherche YouTube |
|---|---|---|
| 3.1 | Optimisation SQL et indexation | `index SQL optimisation français` |
| 3.2 | Transactions ACID | `transaction ACID base de données français` |
| 3.3 | Introduction à MongoDB (NoSQL) | `MongoDB tutoriel français débutant` |

---

### MODULE 4 — Administration et Sécurité Réseaux
**Connecte-toi en :** `omar.isil.l3@fliplearn.dz`

| # | Titre | Recherche YouTube |
|---|---|---|
| 4.1 | TCP/IP en profondeur | `TCP IP modèle expliqué français` |
| 4.2 | Firewall et iptables | `iptables tutoriel français` |
| 4.3 | VPN et chiffrement réseau | `VPN explication français Cookie connecté` |

---

### MODULE 5 — Architecture des Systèmes d'Information
**Connecte-toi en :** `sami.isil.l3@fliplearn.dz` (même prof que BDD)

| # | Titre | Recherche YouTube |
|---|---|---|
| 5.1 | Monolithe vs Microservices | `monolithe microservices français Cocadmin` |
| 5.2 | API REST et GraphQL | `REST GraphQL différence français` |
| 5.3 | Message brokers (RabbitMQ, Kafka) | `Kafka RabbitMQ français explication` |

---

### MODULE 6 — Développement Web et Mobile
**Connecte-toi en :** `omar.isil.l3@fliplearn.dz` (même prof que Réseaux)

| # | Titre | Recherche YouTube |
|---|---|---|
| 6.1 | React Hooks expliqués | `React Hooks tutoriel français Grafikart` |
| 6.2 | Node.js & Express API REST | `Node Express API REST français` |
| 6.3 | React Native vs Flutter | `React Native Flutter comparaison français` |

---

### MODULE 7 — Intelligence Artificielle & Data Mining
**Connecte-toi en :** `yasmine.isil.l3@fliplearn.dz`

| # | Titre | Recherche YouTube |
|---|---|---|
| 7.1 | Qu'est-ce que le Machine Learning ? | `machine learning expliqué français` |
| 7.2 | Réseaux de neurones (Deep Learning) | `réseau neurones expliqué simple français` |
| 7.3 | Transformers et NLP | `transformers NLP français explication` |

---

### MODULE 8 — Cybersécurité & Cloud DevOps
**Connecte-toi en :** `yasmine.isil.l3@fliplearn.dz` (même prof que IA)

| # | Titre | Recherche YouTube |
|---|---|---|
| 8.1 | OWASP Top 10 | `OWASP Top 10 français` |
| 8.2 | Docker en pratique | `Docker tutoriel français Cocadmin` |
| 8.3 | CI/CD avec GitHub Actions | `GitHub Actions tutoriel français` |

---

## ÉTAPE 4 — Créer 1 QCM IA par module (8 minutes au total)

Pour chaque module qu'un prof vient d'enrichir avec des vidéos :

1. Sidebar → **Gérer les QCM** → bouton **« Créer un QCM »**
2. Choisis la **vidéo** liée (ex. la vidéo 1.1 pour Module 1)
3. Onglet **« Génération par IA »** → entre **5 questions** → clique **« Générer avec l'IA »**
4. L'IA Groq génère 5 questions QCM basées sur la vidéo → tu peux éditer si besoin
5. Bouton **« Sauvegarder le QCM »**

**Tu auras 8 QCM en moins de 10 min.** Idéal pour la démo.

---

## ÉTAPE 5 — Créer 2-3 Prosits + 1 Projet (15 min)

Cf. **[PLAN_TEST_ISIL_L3.md](PLAN_TEST_ISIL_L3.md)** sections C et D pour :
- 2 Prosits clé en main (Sécuriser app bancaire + Architecture e-commerce)
- 1 Projet PFE (Mini-LMS sécurisé)

Connecte-toi en prof selon le module ciblé pour les créer.

---

## ÉTAPE 6 — Tester côté étudiant (variés)

Maintenant tu as **11 étudiants ISIL L3** disponibles (Assil + 10 nouveaux). Pour une démo crédible :

1. **Connecte-toi avec un étudiant frais** (ex: `yacine.boudjedra.l3@fliplearn.dz`) — il aura 0% partout, c'est plus crédible que Assil qui a des résidus.
2. Va sur **Mon Parcours** → tu vois les **8 modules ISIL L3** apparaître (filtrés par filière+promotion).
3. Choisis un module (ex: Cybersécurité S6) → regarde une vidéo → fais le QCM → teste le tuteur IA.
4. Pour tester un Prosit en groupe ou un Quiz Battle, utilise 2 onglets avec 2 étudiants différents (ex: Yacine + Lina).

---

## RÉCAPITULATIF — VOLUMES FINAUX

Après avoir suivi ce plan, ton app aura :

| Entité | Quantité |
|---|---|
| Profs ISIL (toutes promos) | 3 (seed initial) + 3 (nouveau seed L3) = 6 |
| Étudiants ISIL L3 | 1 (Assil) + 10 (nouveau seed) = **11** |
| Modules ISIL L3 | **8** (4 S5 + 4 S6) |
| Vidéos | 8 modules × 3 = **24 vidéos** |
| QCM | 8 modules × 1 = **8 QCM** |
| Prosits | 2 |
| Projets | 1 |

**Total temps estimé** : 1h30 si tu suis tout. Démo soutenance = très crédible.

---

## DÉPANNAGE

### Le bouton « Seed L3 ISIL » fait rien
- Vérifie que tu es bien connecté **en admin** (pas étudiant ni prof).
- Ouvre la console F12 → onglet Network → clique le bouton → regarde si l'appel `POST /api/admin/seed/l3-isil` retourne 200.
- Si 401/403 : reconnecte-toi en admin.
- Si 500 : regarde le message d'erreur dans le bandeau rouge.

### J'ai cliqué le bouton 2 fois, est-ce que j'ai des doublons ?
**Non**. Le seed est idempotent : il **skip** les comptes/cours existants. Tu peux le relancer sans souci.

### Comment supprimer les comptes seedés si je veux recommencer ?
- Va dans `/admin?section=users` → filtre **Étudiants** → recherche `l3` → coche les comptes à supprimer → bouton « Supprimer la sélection ».
- Pour les cours : `/admin?section=courses` → suppression individuelle.

### La vidéo YouTube ne s'affiche pas
- Vérifie que l'URL est valide (doit ressembler à `https://www.youtube.com/watch?v=XXXX` ou `https://youtu.be/XXXX`).
- Certaines vidéos ont un blocage d'embed → essaie une autre vidéo.

---

**Tu es prêt. Va sur l'admin et clique le bouton violet `Seed L3 ISIL (démo)`. Ensuite, suis l'étape 3 module par module.**
